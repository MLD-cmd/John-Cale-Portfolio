// Local copy for the portfolio recording (only the request settings near
// max_tokens differ from the app's supabase/functions/coach/index.ts).
//
// HydroTracker "AI Coach" — turns the user's day-so-far into one short,
// encouraging hydration tip.
//
// The LLM API key lives ONLY here, as the GROQ_API_KEY function secret — never
// in the shipped app (a client binary can be decompiled). The app sends its
// progress, this function asks Groq, and returns a single sentence.
//
// JWT verification is on (see deploy config), so only signed-in users can call
// it. Set the key with:  supabase secrets set GROQ_API_KEY=...
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Groq is OpenAI-compatible. Model overridable via the GROQ_MODEL secret so you
// can switch without a code edit, then redeploy.
const MODEL = Deno.env.get("GROQ_MODEL") ?? "llama-3.3-70b-versatile";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Shape the app sends. Everything is optional so a partial payload still works.
interface CoachInput {
  intakeMl?: number;
  goalMl?: number;
  hour?: number; // 0–23, the user's local hour
  tempC?: number;
  tempLabel?: string; // e.g. "Hot & humid"
  place?: string; // city name
  streak?: number; // consecutive days the goal was met
  mix?: Record<string, number>; // ml logged today per drink type, e.g. {Water:800, Coffee:600}
}

function buildPrompt(d: CoachInput): string {
  const intake = d.intakeMl ?? 0;
  const goal = d.goalMl ?? 2000;
  const remaining = Math.max(0, goal - intake);
  const pct = goal > 0 ? Math.round((intake / goal) * 100) : 0;
  const parts = [
    `Time: ${d.hour ?? "?"}:00.`,
    `Drank ${intake}ml of a ${goal}ml goal (${pct}%), ${remaining}ml left.`,
  ];
  if (d.tempC != null) {
    parts.push(`Weather: ${d.tempC}°C${d.tempLabel ? ` (${d.tempLabel})` : ""}${d.place ? ` in ${d.place}` : ""}.`);
  }
  if (d.streak != null) parts.push(`Current streak: ${d.streak} day(s).`);
  if (d.mix) {
    const entries = Object.entries(d.mix)
      .filter(([, ml]) => ml > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([name, ml]) => `${name} ${ml}ml`);
    if (entries.length) parts.push(`Today's drinks: ${entries.join(", ")}.`);
  }
  return parts.join(" ");
}

const SYSTEM_PROMPT =
  "You are a warm, upbeat hydration coach inside a water-tracking app. " +
  "Given the user's progress today, reply with ONE short sentence (max 22 words) " +
  "that motivates them to keep drinking water. Be specific to their situation " +
  "(time of day, how far along they are, the weather, their streak). " +
  "Plain water, milk and coconut water hydrate best; coffee, tea, juice, soda " +
  "and alcohol hydrate less. If today's drinks lean heavily on the less-hydrating " +
  "ones over water, gently encourage more plain water. " +
  "If they have already met or exceeded their goal, congratulate them first and " +
  "tell them to maintain it — do not push them to drink more; you may add a brief, " +
  "kind note to favour water tomorrow only if the day leaned on less-hydrating drinks. " +
  "Do not restate the raw numbers verbatim. You may use at most one emoji. " +
  "No greetings, no preamble — just the tip.";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const apiKey = Deno.env.get("GROQ_API_KEY");
  if (!apiKey) {
    return json({ error: "Coach is not configured yet." }, 500);
  }

  let input: CoachInput = {};
  try {
    input = (await req.json()) as CoachInput;
  } catch (_) {
    // Empty/invalid body is fine — we'll coach from defaults.
  }

  try {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildPrompt(input) },
        ],
        // Groq retired the original model; its GPT-OSS models reason before
        // answering, so they get room for that and are asked to keep it short.
        max_tokens: MODEL.startsWith("openai/gpt-oss") ? 400 : 60,
        ...(MODEL.startsWith("openai/gpt-oss")
          ? { reasoning_effort: "low", include_reasoning: false }
          : {}),
        temperature: 0.9,
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error("Groq error", res.status, detail);
      return json({ error: "Coach is taking a break — try again." }, 502);
    }

    const data = await res.json();
    const message: string | undefined =
      data?.choices?.[0]?.message?.content?.trim();
    if (!message) {
      return json({ error: "Coach had nothing to say — try again." }, 502);
    }
    return json({ message });
  } catch (err) {
    console.error("Coach failed", err);
    return json({ error: "Couldn't reach the coach." }, 502);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
