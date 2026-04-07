import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  assertArray,
  assertString,
  errorResponse,
  handlePreflight,
  jsonResponse,
  parseJsonBody,
  requirePost,
  streamResponse,
  HttpError,
} from "../_shared/security.ts";

serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  try {
    requirePost(req);
    const { messages, animalContext } = await parseJsonBody<{
      messages?: Array<{ role?: string; content?: string }>;
      animalContext?: Record<string, unknown>;
    }>(req);
    const sanitizedMessages = assertArray(messages, "messages", 12).map((message) => {
      if (!message || typeof message !== "object") {
        throw new HttpError(400, "messages entries must be objects");
      }

      const role = assertString((message as { role?: string }).role, "message role", 16);
      if (!["user", "assistant", "system"].includes(role)) {
        throw new HttpError(400, "message role is invalid");
      }

      return {
        role,
        content: assertString((message as { content?: string }).content, "message content", 1200),
      };
    });
    const context = animalContext ?? {};
    const name = assertString(context.name, "animalContext.name", 120);
    const scientificName = assertString(context.scientificName, "animalContext.scientificName", 160);
    const threatLevel = assertString(context.threatLevel, "animalContext.threatLevel", 40);
    const conservationStatus = assertString(context.conservationStatus, "animalContext.conservationStatus", 120);
    const habitat = assertString(context.habitat, "animalContext.habitat", 160);
    const profile = assertString(context.profile, "animalContext.profile", 1200);
    const threatReason = assertString(context.threatReason, "animalContext.threatReason", 500);

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const systemPrompt = `You are an expert wildlife biologist having a conversation about a specific animal that was just identified. Here is the context about the animal:

Name: ${name}
Scientific Name: ${scientificName}
Threat Level: ${threatLevel}
Conservation Status: ${conservationStatus}
Habitat: ${habitat}
Profile: ${profile}
Threat Reason: ${threatReason}

Answer the user's follow-up questions about this animal. Be educational, accurate, and safety-focused. Keep answers concise (2-4 sentences) unless the user asks for more detail. If asked about something unrelated to wildlife, gently redirect back to the animal topic.`;

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
            ...sanitizedMessages,
          ],
          stream: true,
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

    return streamResponse(req, response.body);
  } catch (e) {
    return errorResponse(req, e, "animal-chat error:");
  }
});
