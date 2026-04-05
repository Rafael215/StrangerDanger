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
    const { audio, mimeType } = await req.json();
    if (!audio) {
      return new Response(JSON.stringify({ error: "No audio provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are an expert wildlife biologist and bioacoustics specialist. Given an audio recording, identify the animal based on its sound (call, song, vocalization, etc.) and provide a safety assessment.

You MUST respond using the "identify_animal" tool/function provided. Do not respond with plain text.

Be accurate with your identification. If you're unsure, give a lower confidence score. The threat level should reflect real-world danger to hikers:
- "Safe": Generally harmless, no special precautions needed
- "Caution": Can be dangerous if provoked or in certain situations
- "Danger": Actively dangerous, immediate caution required

If the audio does not contain an identifiable animal sound, still use the tool but set the name to "Unknown" with low confidence and provide general wildlife safety tips.`;

    const resolvedMime = mimeType || "audio/webm";

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: [
                {
                  type: "input_audio",
                  input_audio: {
                    data: audio.includes(",") ? audio.split(",")[1] : audio,
                    format: resolvedMime,
                  },
                },
                {
                  type: "text",
                  text: "Identify this animal from its sound and assess the threat level for a hiker encountering it.",
                },
              ],
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "identify_animal",
                description:
                  "Return structured data about the identified animal from its sound",
                parameters: {
                  type: "object",
                  properties: {
                    name: {
                      type: "string",
                      description: "Common name of the animal",
                    },
                    scientificName: {
                      type: "string",
                      description: "Scientific/Latin name",
                    },
                    confidence: {
                      type: "number",
                      description: "Confidence score between 0 and 1",
                    },
                    threatLevel: {
                      type: "string",
                      enum: ["Safe", "Caution", "Danger"],
                      description: "Threat level for hikers",
                    },
                    profile: {
                      type: "string",
                      description: "Brief 2-3 sentence profile of the animal",
                    },
                    conservationStatus: {
                      type: "string",
                      description:
                        "IUCN conservation status (e.g. Least Concern, Endangered)",
                    },
                    habitat: {
                      type: "string",
                      description: "Primary habitat in 2-3 words",
                    },
                    survivalTips: {
                      type: "array",
                      items: { type: "string" },
                      description:
                        "3-5 practical survival tips if encountered",
                    },
                    threatReason: {
                      type: "string",
                      description:
                        "1-2 sentence explanation of why this threat level was chosen",
                    },
                  },
                  required: [
                    "name",
                    "scientificName",
                    "confidence",
                    "threatLevel",
                    "profile",
                    "conservationStatus",
                    "habitat",
                    "survivalTips",
                    "threatReason",
                  ],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "identify_animal" },
          },
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

    if (!toolCall) {
      throw new Error("No tool call in response");
    }

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("identify-animal-sound error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
