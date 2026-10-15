// OWNER: Sky. Minimal LLM client over fetch (no SDK: server deps are frozen).
const TIMEOUT_MS = 20_000;

export function llmModel(): string {
  return process.env.LLM_MODEL || "claude-haiku-5-5";
}

/** Returns the model's raw text. Throws on missing config, non-2xx, timeout, refusal or empty output. */
export async function callLLM(system: string, user: string): Promise<string> {
  const provider = process.env.LLM_PROVIDER || "anthropic";
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) throw new Error("LLM_API_KEY not set");

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    if (provider === "openai_compatible") {
      const base = (process.env.LLM_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
      const res = await fetch(`${base}/chat/completions`, {
        method: "POST",
        signal: ctrl.signal,
        headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
        body: JSON.stringify({
          model: llmModel(),
          temperature: 0,
          response_format: { type: "json_object" },
          messages: [{ role: "system", content: system }, { role: "user", content: user }],
        }),
      });
      if (!res.ok) throw new Error(`LLM ${res.status}: ${(await res.text()).slice(0, 300)}`);
      const json: any = await res.json();
      const text = json?.choices?.[0]?.message?.content;
      if (typeof text !== "string" || !text.trim()) throw new Error("LLM returned no content");
      return text;
    }

    // anthropic. Per current docs, Claude Haiku 5.5 rejects non-default temperature (400) and thinks by
    // default, so we drop temperature:0, use effort "low" for latency, and leave max_tokens room for thinking.
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: llmModel(),
        max_tokens: 4000,
        output_config: { effort: "low" },
        system,
        messages: [{ role: "user", content: user }],
      }),
    });
    if (!res.ok) throw new Error(`LLM ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const json: any = await res.json();
    if (json?.stop_reason === "refusal") throw new Error("LLM refused");
    // Read by block type: a response can start with thinking blocks, so content[0] is not always the text.
    const text = (json?.content ?? [])
      .filter((b: any) => b?.type === "text")
      .map((b: any) => b.text)
      .join("");
    if (!text.trim()) throw new Error(`LLM returned no text (stop_reason=${json?.stop_reason})`);
    return text;
  } finally {
    clearTimeout(timer);
  }
}

/** Substring from the first "{" to the last "}" (tolerates code fences and stray prose). */
export function extractJson(text: string): string {
  const a = text.indexOf("{");
  const b = text.lastIndexOf("}");
  if (a < 0 || b <= a) throw new Error("no JSON object in LLM output");
  return text.slice(a, b + 1);
}
