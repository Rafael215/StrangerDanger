import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { frame, audio, mimeType } = await req.json();
    if (!frame && !audio) {
      return new Response(JSON.stringify({ error: "No video data provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    if (frame) {
      userContent.push({
        type: "image_url",
        image_url: { url: frame },
      });
    }

    if (audio) {
      userContent.push({
        type: "input_audio",
        input_audio: {
          data: audio.replace(/^data:[^;]+;base64,/, ""),
          format: mimeType?.includes("wav") ? "wav" : "mp3",
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
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (response.status === 402) {
      return new Response(
        JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("identify-video error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
