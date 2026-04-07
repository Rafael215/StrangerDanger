import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  assertOptionalDataUrl,
  assertString,
  errorResponse,
  handlePreflight,
  jsonResponse,
  parseJsonBody,
  requirePost,
  HttpError,
} from "../_shared/security.ts";

serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  try {
    requirePost(req);
    const { frame, audio, mimeType } = await parseJsonBody<{
      frame?: string;
      audio?: string | null;
      mimeType?: string;
    }>(req);
    const sanitizedFrame = assertOptionalDataUrl(
      frame,
      "frame",
      ["data:image/jpeg", "data:image/jpg", "data:image/png", "data:image/webp"],
      8 * 1024 * 1024,
    );
    const sanitizedAudio = assertOptionalDataUrl(
      audio,
      "audio",
      ["data:audio/webm", "data:audio/ogg", "data:audio/wav", "data:audio/x-wav", "data:audio/mp3", "data:audio/mpeg", "data:video/mp4", "data:video/webm", "data:video/quicktime"],
      12 * 1024 * 1024,
    );
    if (!sanitizedFrame && !sanitizedAudio) {
      throw new HttpError(400, "No video data provided");
    }
    const resolvedMimeType = assertString(mimeType ?? "video/mp4", "mimeType", 64);

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const systemPrompt = `You are an expert wildlife biologist and outdoor safety advisor. You are given a video frame (image) and/or audio from a video of an animal. Use BOTH the visual and audio cues to identify the animal and provide a safety assessment.

You MUST respond using the "identify_animal" tool/function provided. Do not respond with plain text.

If you can see the animal in the image, use visual features. If you can hear the animal in the audio, use auditory cues. Combine both signals for the most accurate identification.

Be accurate with your identification. If you're unsure, give a lower confidence score. The threat level should reflect real-world danger to hikers:
- "Safe": Generally harmless, no special precautions needed
- "Caution": Can be dangerous if provoked or in certain situations
- "Danger": Actively dangerous, immediate caution required`;

    const userContent: any[] = [];

    if (sanitizedFrame) {
      userContent.push({
        type: "image_url",
        image_url: { url: sanitizedFrame },
      });
    }

    if (sanitizedAudio) {
      const formatMap: Record<string, string> = {
        "audio/webm": "mp3", "audio/webm; codecs=opus": "mp3",
        "audio/ogg": "mp3", "audio/wav": "wav", "audio/x-wav": "wav",
        "audio/mp3": "mp3", "audio/mpeg": "mp3",
      };
      const resolvedFormat = formatMap[resolvedMimeType.toLowerCase()] || "mp3";
      userContent.push({
        type: "input_audio",
        input_audio: {
          data: sanitizedAudio.replace(/^data:[^;]+;base64,/, ""),
          format: resolvedFormat,
        },
      });
    }

    userContent.push({
      type: "text",
      text: "Identify this animal from the video frame and/or audio. Assess the threat level for a hiker encountering it. Use both visual and audio cues if available.",
    });

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GEMINI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "identify_animal",
                description: "Return structured data about the identified animal",
                parameters: {
                  type: "object",
                  properties: {
                    name: { type: "string", description: "Common name of the animal" },
                    scientificName: { type: "string", description: "Scientific/Latin name" },
                    confidence: { type: "number", description: "Confidence score between 0 and 1" },
                    threatLevel: { type: "string", enum: ["Safe", "Caution", "Danger"], description: "Threat level for hikers" },
                    profile: { type: "string", description: "Brief 2-3 sentence profile of the animal" },
                    conservationStatus: { type: "string", description: "IUCN conservation status" },
                    habitat: { type: "string", description: "Primary habitat in 2-3 words" },
                    survivalTips: { type: "array", items: { type: "string" }, description: "3-5 practical survival tips" },
                    threatReason: { type: "string", description: "1-2 sentence explanation of threat level" },
                  },
                  required: ["name", "scientificName", "confidence", "threatLevel", "profile", "conservationStatus", "habitat", "survivalTips", "threatReason"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "identify_animal" } },
        }),
      }
    );

    if (response.status === 429) {
      return jsonResponse(
        req,
        429,
        { error: "Rate limit exceeded. Please try again later." },
        { "Retry-After": "60" },
      );
    }
    if (response.status === 402) {
      return jsonResponse(
        req,
        402,
        { error: "AI credits exhausted. Please add funds." },
      );
    }
    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");

    const result = JSON.parse(toolCall.function.arguments);

    return jsonResponse(req, 200, result);
  } catch (e) {
    return errorResponse(req, e, "identify-video error:");
  }
});
