import "dotenv/config";

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMResponse {
  content: string;
  model: string;
  usage?: { prompt_tokens: number; completion_tokens: number };
}

const provider = process.env.AI_PROVIDER ?? "openai";
const model = process.env.AI_MODEL ?? "gpt-4o-mini";
const apiKey = process.env.OPENAI_API_KEY ?? "";

export async function callLLM(
  prompt: string,
  systemPrompt?: string,
  temperature = 0.3
): Promise<string> {
  if (provider === "mock" || !apiKey || apiKey.startsWith("sk-mock")) {
    return mockResponse(prompt);
  }

  const messages: LLMMessage[] = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: prompt });

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, temperature, max_tokens: 1024 }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LLM API error ${res.status}: ${err}`);
  }

  const data = (await res.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  return data.choices[0]?.message?.content ?? "";
}

// Mock LLM for testing / demo without API key
function mockResponse(prompt: string): string {
  const lower = prompt.toLowerCase();

  if (lower.includes("verify") || lower.includes("deliverable")) {
    return JSON.stringify({
      result: "PASS",
      completeness: 88,
      relevance: 92,
      usefulness: 85,
      confidence: 87,
      reasoning: "The deliverable satisfies the stated intent requirements with high relevance and completeness.",
    });
  }

  if (lower.includes("match") || lower.includes("rank")) {
    return "The top candidates are ranked by capability match and reliability score. Agent AlphaResearch scores highest for market intelligence tasks.";
  }

  if (lower.includes("negotiate")) {
    return JSON.stringify({
      recommendation: "accept",
      suggested_price: 60,
      reasoning: "Midpoint between proposed and counter is within budget tolerance.",
    });
  }

  return "Task analysis complete. All requirements have been evaluated and results returned.";
}
