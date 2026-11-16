// Loaded only when the visitor clicks "Boot AI twin", so WebLLM's code and the model
// weights never touch the initial page load.
import { CreateWebWorkerMLCEngine } from "@mlc-ai/web-llm";

export async function bootEngine(modelId, onProgress) {
  const worker = new Worker(new URL("./worker.js", import.meta.url), { type: "module" });
  return CreateWebWorkerMLCEngine(worker, modelId, {
    initProgressCallback: (report) => onProgress(report),
  });
}

export async function* streamReply(engine, messages) {
  const chunks = await engine.chat.completions.create({
    messages,
    stream: true,
    temperature: 0.5,
    top_p: 0.9,
    frequency_penalty: 0.6,
    max_tokens: 160,
  });
  for await (const chunk of chunks) {
    const text = chunk.choices[0]?.delta?.content;
    if (text) yield text;
  }
}
