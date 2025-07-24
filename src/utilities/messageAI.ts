type SUPPORTED_MODEL_NAMES =
  | "gemini-2.0-flash-lite"
  | "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8"
  | "microsoft/mai-ds-r1:free";

const PROVIDER: Record<
  SUPPORTED_MODEL_NAMES,
  "GEMINI" | "TOGETHER" | "OPENROUTER"
> = {
  "gemini-2.0-flash-lite": "GEMINI",
  "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8": "TOGETHER",
  "microsoft/mai-ds-r1:free": "OPENROUTER",
};

export default async function (
  model: SUPPORTED_MODEL_NAMES,
  messages: { role: "user" | "model" | "system"; content: string }[]
): Promise<string> {
  const provider = PROVIDER[model];

  //—---- GEMINI ----———————————————————————————
  if (provider === "GEMINI") {
    const systemMessages = messages
      .filter((m) => m.role === "system")
      .map((m) => ({ text: m.content }));
    const contents = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "model" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;
    const options: RequestInit = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction:
          systemMessages.length > 0 ? { parts: systemMessages } : undefined,
        contents,
        generationConfig: {
          stopSequences: ["Title"],
          temperature: 1.5,
          maxOutputTokens: 800,
          topP: 0.8,
          topK: 10,
        },
      }),
    };

    const res = await fetch(url, options);
    if (!res.ok) throw new Error(`Gemini: ${res.status} ${await res.text()}`);
    const data = await res.json();
    return data.candidates[0].content.parts[0].text as string;
  }

  //—---- TOGETHER ----———————————————————————————
  if (provider === "TOGETHER") {
    const url = "https://api.together.xyz/v1/chat/completions";
    const options: RequestInit = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.TOGETHER_API_KEY}`,
      },
      body: JSON.stringify({ model, messages }),
    };

    const res = await fetch(url, options);
    if (!res.ok) throw new Error(`Together: ${res.status} ${await res.text()}`);
    const data = await res.json();
    return data.choices[0].message.content as string;
  }

  //—---- OPENROUTER ----———————————————————————————
  if (provider === "OPENROUTER") {
    const url = "https://openrouter.ai/api/v1/chat/completions";
    const options: RequestInit = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({ model, messages }),
    };

    const res = await fetch(url, options);
    if (!res.ok)
      throw new Error(`OpenRouter: ${res.status} ${await res.text()}`);
    const data = await res.json();
    return data.choices[0].message.content as string;
  }

  // This should never be reached if PROVIDER mapping is exhaustive.
  throw new Error(`Unsupported model: ${model}`);
}
