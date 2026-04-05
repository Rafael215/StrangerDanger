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
    const { image } = await req.json();
    if (!image) {
      return new Response(JSON.stringify({ error: "No image provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are an expert field naturalist with AR overlay capabilities. Given an image of a natural environment, identify ALL visible elements: animals, plants, terrain features, tracks, signs of wildlife activity, water sources, potential hazards, and shelter opportunities.

Return structured labels that could be overlaid on the image as AR tags. Each label should have a position hint (top-left, top-right, center, bottom-left, bottom-right, etc.) based on where the element appears in the image.

Be thorough — identify at least 4-8 elements. Include both obvious and subtle things a trained naturalist would notice.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
              { type: "image_url", image_url: { url: image } },
              { type: "text", text: "Scan this environment and identify all notable natural elements, wildlife signs, plants, terrain features, and potential hazards." },
            ],
          },
        ],
        tools: [{
          type: "function",
          function: {
            name: "field_scan",
            description: "Return AR-style labels for the scanned environment",
            parameters: {
              type: "object",
              properties: {
                environmentType: { type: "string", description: "Type of environment (forest, meadow, etc.)" },
                overallAssessment: { type: "string", description: "1-2 sentence safety assessment" },
                labels: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string", description: "What was identified" },
                      category: { type: "string", enum: ["animal", "plant", "terrain", "water", "hazard", "track", "shelter", "sign"] },
                      detail: { type: "string", description: "Brief useful info (15-25 words)" },
                      position: { type: "string", enum: ["top-left", "top-center", "top-right", "center-left", "center", "center-right", "bottom-left", "bottom-center", "bottom-right"] },
                      threatLevel: { type: "string", enum: ["safe", "caution", "danger", "neutral"] },
                    },
                    required: ["name", "category", "detail", "position", "threatLevel"],
                  },
                },
                tips: {
                  type: "array",
                  items: { type: "string" },
                  description: "3-4 practical tips for navigating this environment",
                },
              },
              required: ["environmentType", "overallAssessment", "labels", "tips"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "field_scan" } },
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
  } catch (e) {
    console.error("field-scan error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
