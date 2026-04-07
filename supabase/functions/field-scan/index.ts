import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  assertDataUrl,
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
    const { image } = await parseJsonBody<{ image?: string }>(req);
    const sanitizedImage = assertDataUrl(
      image,
      "image",
      ["data:image/jpeg", "data:image/jpg", "data:image/png", "data:image/webp"],
      8 * 1024 * 1024,
    );

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const systemPrompt = `You are an expert field naturalist with AR overlay capabilities. Given an image of a natural environment, identify ALL visible elements: animals, plants, terrain features, tracks, signs of wildlife activity, water sources, potential hazards, and shelter opportunities.

Return structured labels that could be overlaid on the image as AR tags. Each label should have a position hint (top-left, top-right, center, bottom-left, bottom-right, etc.) based on where the element appears in the image.

Be thorough — identify at least 4-8 elements. Include both obvious and subtle things a trained naturalist would notice.`;

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
            {
              role: "user",
              content: [
                { type: "image_url", image_url: { url: sanitizedImage } },
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
      return jsonResponse(req, 429, { error: "Rate limit exceeded" }, { "Retry-After": "60" });
    }
    if (response.status === 402) {
      return jsonResponse(req, 402, { error: "AI credits exhausted" });
    }
    if (!response.ok) throw new Error("AI gateway error");

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call");

    const result = JSON.parse(toolCall.function.arguments);
    return jsonResponse(req, 200, result);
  } catch (e) {
    return errorResponse(req, e, "field-scan error:");
  }
});
