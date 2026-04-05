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
    const { action, habitat, difficulty } = await req.json();

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    if (action === "generate_quiz") {
      const systemPrompt = `You are a wildlife audio expert creating an animal sound identification quiz. Generate a quiz card about an animal sound that hikers might hear in the wild. Include a vivid text description of what the sound is like so users can learn to recognize it.`;

      const userPrompt = `Create an animal sound quiz for a ${difficulty || "medium"} difficulty level${habitat ? ` in a ${habitat} habitat` : ""}. The user should try to guess what animal makes this sound based on your description.`;

      const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GEMINI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          tools: [{
            type: "function",
            function: {
              name: "create_sound_quiz",
              description: "Create an animal sound identification quiz card",
              parameters: {
                type: "object",
                properties: {
                  soundDescription: { type: "string", description: "Vivid 2-3 sentence description of the sound (onomatopoeia encouraged)" },
                  audioPrompt: { type: "string", description: "A short, literal sound-effect prompt for audio generation, e.g. 'wolf howling at night in a forest' or 'owl hooting softly'. Keep under 15 words, describe only the sound." },
                  timeOfDay: { type: "string", description: "When you'd typically hear this (dawn, day, dusk, night)" },
                  habitat: { type: "string", description: "Where you'd hear this sound" },
                  hint: { type: "string", description: "A subtle clue without giving away the answer" },
                  options: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        animal: { type: "string" },
                        emoji: { type: "string" },
                      },
                      required: ["id", "animal", "emoji"],
                    },
                    description: "4 animal options, one correct",
                  },
                  correctId: { type: "string", description: "The id of the correct option" },
                  correctAnimal: { type: "string", description: "The correct animal name" },
                  funFact: { type: "string", description: "Interesting fact about this animal's vocalizations" },
                  survivalNote: { type: "string", description: "What to do if you hear this sound while hiking" },
                  difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
                },
                required: ["soundDescription", "audioPrompt", "timeOfDay", "habitat", "hint", "options", "correctId", "correctAnimal", "funFact", "survivalNote", "difficulty"],
                additionalProperties: false,
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "create_sound_quiz" } },
        }),
      });

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!response.ok) throw new Error("AI gateway error");

      const data = await response.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall) throw new Error("No tool call");

      const result = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("sound-training error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
