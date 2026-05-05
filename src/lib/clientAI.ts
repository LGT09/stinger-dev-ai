/**
 * Client-side AI runners for providers that DON'T go through our edge function.
 *  - Puter: browser script, free, no API key.
 *  - Qvac: on-device LLM via @qvac/sdk (lazy import — falls back gracefully).
 *
 * Both expose the same shape: streamReply({ messages, model, onDelta, onDone, onError })
 */

type Msg = { role: "user" | "assistant" | "system"; content: string };

declare global {
  interface Window { puter?: any }
}

function lastUser(messages: Msg[]) {
  return [...messages].reverse().find(m => m.role === "user")?.content || "";
}

/* -------------------- Puter -------------------- */
export async function streamPuter(opts: {
  messages: Msg[]; model: string;
  onDelta: (s: string) => void; onDone: () => void; onError: (e: Error) => void;
}) {
  try {
    if (!window.puter?.ai?.chat) throw new Error("Puter.js not loaded — refresh the page.");
    // Puter accepts a string OR an array of messages. Pass full history for context.
    const res = await window.puter.ai.chat(
      opts.messages.filter(m => m.role !== "system").map(m => ({ role: m.role, content: m.content })),
      { model: opts.model, stream: true }
    );
    // Streaming response is an async iterable of {text}
    if (res && typeof res[Symbol.asyncIterator] === "function") {
      for await (const chunk of res) {
        const t = chunk?.text ?? chunk?.message?.content ?? "";
        if (t) opts.onDelta(t);
      }
    } else {
      // Non-streaming fallback
      const text = typeof res === "string" ? res : (res?.message?.content ?? res?.text ?? String(res ?? ""));
      if (text) opts.onDelta(text);
    }
    opts.onDone();
  } catch (e: any) {
    opts.onError(e instanceof Error ? e : new Error(String(e)));
  }
}

/* -------------------- Qvac (on-device) -------------------- */
export async function streamQvac(opts: {
  messages: Msg[]; model: string;
  onDelta: (s: string) => void; onDone: () => void; onError: (e: Error) => void;
}) {
  try {
    // Lazy-load — package is heavy & optional.
    const sdk: any = await import(/* @vite-ignore */ "@qvac/sdk").catch(() => null);
    if (!sdk?.loadModel || !sdk?.completion) {
      throw new Error("Qvac SDK not installed in this build. Pick another model — Qvac runs fully on-device and requires the @qvac/sdk package to be bundled.");
    }
    const modelSrc = sdk[opts.model] || sdk.LLAMA_3_2_1B_INST_Q4_0;
    const modelId = await sdk.loadModel({ modelSrc, modelType: "llm" });
    const result = sdk.completion({
      modelId,
      history: opts.messages.filter(m => m.role !== "system"),
      stream: true,
    });
    for await (const token of result.tokenStream) {
      opts.onDelta(token);
    }
    await sdk.unloadModel({ modelId });
    opts.onDone();
  } catch (e: any) {
    opts.onError(e instanceof Error ? e : new Error(String(e)));
  }
}

export function isClientProvider(provider: string) {
  return provider === "puter" || provider === "qvac";
}