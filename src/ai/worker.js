// Runs WebLLM off the main thread so the 3D scene keeps animating while the model
// downloads and generates.
import { WebWorkerMLCEngineHandler } from "@mlc-ai/web-llm";

const handler = new WebWorkerMLCEngineHandler();
self.onmessage = (msg) => handler.onmessage(msg);
