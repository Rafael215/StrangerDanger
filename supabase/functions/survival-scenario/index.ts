import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  assertArray,
  assertEnum,
  assertString,
  errorResponse,
  handlePreflight,
  jsonResponse,
  parseJsonBody,
  requirePost,
  HttpError,
} from "../_shared/security.ts";

const ACTIONS = ["start", "choose"] as const;

serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  try {
    requirePost(req);
    const { action, scenario, history } = await parseJsonBody<{
      action?: string;
      scenario?: string;
      history?: Array<{ situation?: string; choice?: string }>;
    }>(req);
    const sanitizedAction = assertEnum(action, "action", ACTIONS);
    const sanitizedScenario = scenario ? assertString(scenario, "scenario", 240) : "";
    const sanitizedHistory = history
      ? assertArray(history, "history", 6).map((entry) => {
          if (!entry || typeof entry !== "object") {
            throw new HttpError(400, "history entries must be objects");
          }
          return {
            situation: assertString(entry.situation, "history.situation", 800),
            choice: assertString(entry.choice, "history.choice", 240),
          };
        })
      : [];

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    let systemPrompt: string;
    let userPrompt: string;
    const tools = [];
    let tool_choice: unknown = undefined;

    if (sanitizedAction === "start") {
      systemPrompt = `You are a wildlife survival instructor creating interactive "choose your adventure" scenarios. Generate a realistic outdoor survival scenario where the user encounters a wild animal. Make it vivid and immersive.`;
      userPrompt = sanitizedScenario
        ? `Create a survival scenario about: ${sanitizedScenario}`
        : `Create a random survival scenario involving a wild animal encounter during a hike.`;

      tools.push({
        type: "function",
        function: {
          name: "create_scenario",
          description: "Create an interactive survival scenario",
          parameters: {
            type: "object",
            properties: {
              title: { type: "string", description: "Short dramatic title" },
              animal: { type: "string", description: "The animal encountered" },
              setting: { type: "string", description: "2-3 sentence vivid description of the setting" },
              situation: { type: "string", description: "3-4 sentence description of the encounter" },
              choices: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    text: { type: "string", description: "The action choice (10-15 words)" },
                    emoji: { type: "string", description: "Single relevant emoji" },
                  },
                  required: ["id", "text", "emoji"],
                },
                description: "Exactly 3 choices for the user",
              },
            },
            required: ["title", "animal", "setting", "situation", "choices"],
            additionalProperties: false,
          },
        },
      });
      tool_choice = { type: "function", function: { name: "create_scenario" } };
    } else if (sanitizedAction === "choose") {
      systemPrompt = `You are a wildlife survival instructor. The user is in an interactive scenario and has made a choice. Describe what happens next, whether it was the right call, and provide the next set of choices OR an ending.

If the scenario should end (after 2-3 choices), provide an outcome with a survival score and lessons learned. Otherwise provide new choices.`;

      const historyText = sanitizedHistory
        .map((h: { situation: string; choice: string }) => `Situation: ${h.situation}\nChoice: ${h.choice}`)
        .join("\n\n");

      userPrompt = `Scenario history:\n${historyText}\n\nThe user's latest choice: "${sanitizedScenario}"`;

      tools.push({
        type: "function",
        function: {
          name: "scenario_response",
          description: "Continue or end the scenario",
          parameters: {
            type: "object",
            properties: {
              narrative: { type: "string", description: "3-5 sentence vivid description of what happens" },
              isEnding: { type: "boolean", description: "Whether this is the end of the scenario" },
              choices: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    text: { type: "string" },
                    emoji: { type: "string" },
                  },
                  required: ["id", "text", "emoji"],
                },
                description: "Next choices (empty if ending)",
              },
              outcome: {
                type: "object",
                properties: {
                  survived: { type: "boolean" },
                  score: { type: "number", description: "1-10 survival score" },
                  grade: { type: "string", enum: ["A+", "A", "B", "C", "D", "F"] },
                  summary: { type: "string", description: "2-3 sentence summary of performance" },
                  lessons: {
                    type: "array",
                    items: { type: "string" },
                    description: "3-4 real survival lessons learned",
                  },
                },
                required: ["survived", "score", "grade", "summary", "lessons"],
              },
            },
            required: ["narrative", "isEnding"],
            additionalProperties: false,
          },
        },
      });
      tool_choice = { type: "function", function: { name: "scenario_response" } };
    } else {
      return new Response(JSON.stringify({ error: "Invalid action" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

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
        tools,
        tool_choice,
      }),
    });

    if (response.status === 429) {
      return jsonResponse(req, 429, { error: "Rate limit exceeded" }, { "Retry-After": "60" });
    }
    if (response.status === 402) {
      return jsonResponse(req, 402, { error: "AI credits exhausted" });
    }
    if (!response.ok) {
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");

    const result = JSON.parse(toolCall.function.arguments);
    return jsonResponse(req, 200, result);
  } catch (e) {
    return errorResponse(req, e, "survival-scenario error:");
  }
});
