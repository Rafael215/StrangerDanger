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
    const { habitat, region } = await req.json();
    if (!habitat) {
      return new Response(JSON.stringify({ error: "No habitat provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are an expert wildlife biologist and outdoor safety educator. Given a habitat type and optional region, provide a comprehensive pre-hike safety briefing about animals commonly found there.

You MUST respond using the "habitat_briefing" tool/function provided. Do not respond with plain text.

Provide 5-8 animals that a hiker would most likely encounter in this habitat. For each animal, assess the real danger level. Include a mix of safe, cautionary, and dangerous animals. Make the briefing educational and practical.`;

    const userPrompt = region
      ? `Give me a wildlife safety briefing for hiking in ${habitat} habitat in the ${region} region.`
      : `Give me a wildlife safety briefing for hiking in ${habitat} habitat.`;

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
            { role: "user", content: userPrompt },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "habitat_briefing",
                description: "Return structured habitat briefing data",
                parameters: {
                  type: "object",
                  properties: {
                    habitatName: {
                      type: "string",
                      description: "Display name of the habitat",
                    },
                    overview: {
                      type: "string",
                      description: "2-3 sentence overview of the habitat and general safety considerations",
                    },
                    generalTips: {
                      type: "array",
                      items: { type: "string" },
                      description: "3-5 general safety tips for this habitat",
                    },
                    animals: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          name: { type: "string" },
                          scientificName: { type: "string" },
                          threatLevel: {
                            type: "string",
                            enum: ["Safe", "Caution", "Danger"],
                          },
                          likelihood: {
                            type: "string",
                            enum: ["Common", "Occasional", "Rare"],
                          },
                          description: {
                            type: "string",
                            description: "1-2 sentence description",
                          },
                          whatToDo: {
                            type: "string",
                            description: "What to do if you encounter this animal",
                          },
                          conservationStatus: { type: "string" },
                        },
                        required: [
                          "name",
                          "scientificName",
                          "threatLevel",
                          "likelihood",
                          "description",
                          "whatToDo",
                          "conservationStatus",
                        ],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["habitatName", "overview", "generalTips", "animals"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "habitat_briefing" },
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
    if (!toolCall) throw new Error("No tool call in response");

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("habitat-briefing error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
