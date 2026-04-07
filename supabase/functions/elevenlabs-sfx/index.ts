import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  assertNumber,
  assertString,
  buildHeaders,
  errorResponse,
  handlePreflight,
  jsonResponse,
  parseJsonBody,
  requirePost,
} from "../_shared/security.ts";

serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  try {
    requirePost(req);
    const { prompt, duration } = await parseJsonBody<{ prompt?: string; duration?: number }>(req);
    const sanitizedPrompt = assertString(prompt, "prompt", 200);
    const sanitizedDuration = duration == null ? 5 : assertNumber(duration, "duration", { min: 1, max: 8 });

    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) {
      throw new Error("ELEVENLABS_API_KEY is not configured");
    }

    const response = await fetch("https://api.elevenlabs.io/v1/sound-generation", {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: sanitizedPrompt,
        duration_seconds: sanitizedDuration,
        prompt_influence: 0.3,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("ElevenLabs error:", response.status, errText);
      return jsonResponse(req, response.status, { error: `ElevenLabs API error: ${response.status}` });
    }

    const audioBuffer = await response.arrayBuffer();

    return new Response(audioBuffer, {
      headers: {
        ...buildHeaders(req),
        "Content-Type": "audio/mpeg",
      },
    });
  } catch (e) {
    return errorResponse(req, e, "elevenlabs-sfx error:");
  }
});
