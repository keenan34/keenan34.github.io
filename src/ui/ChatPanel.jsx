import { useEffect, useRef, useState } from "react";
import { Cpu, Send } from "lucide-react";
import { ai, scriptedReplies, scriptedFallback } from "../data/portfolioData.js";

const hasWebGPU = typeof navigator !== "undefined" && "gpu" in navigator;

// Scripted twin: the first entry whose keyword appears as a whole word wins.
function scripted(text) {
  const t = ` ${text.toLowerCase().replace(/[^a-z0-9é ]/g, " ")} `;
  const hit = scriptedReplies.find((r) => r.keys.some((k) => t.includes(` ${k} `)));
  return hit ? hit.reply : scriptedFallback;
}

// Model state survives the drawer closing, so a booted twin stays booted.
let engine = null;

export default function ChatPanel() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hey, I’m Keenan’s twin. Ask me about his projects, his stack, or how to reach him." },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [boot, setBoot] = useState(engine ? { state: "ready" } : { state: "off" });
  const list = useRef();

  useEffect(() => { list.current?.scrollTo({ top: list.current.scrollHeight, behavior: "smooth" }); }, [messages]);

  async function start(model) {
    setBoot({ state: "loading", progress: 0, text: "Starting…", model });
    try {
      const { bootEngine } = await import("../ai/engine.js");
      engine = await bootEngine(model.id, (r) =>
        setBoot({ state: "loading", progress: r.progress ?? 0, text: r.text, model }),
      );
      setBoot({ state: "ready" });
      setMessages((m) => [...m, { role: "assistant", content: "Model loaded. I’m now a real language model running on your GPU, so ask away." }]);
    } catch (err) {
      engine = null;
      setBoot({ state: "error", text: err?.message || String(err) });
    }
  }

  async function send(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    const history = [...messages, { role: "user", content: text }];
    setMessages(history);

    if (!engine) {
      setMessages([...history, { role: "assistant", content: scripted(text) }]);
      return;
    }
    setBusy(true);
    setMessages([...history, { role: "assistant", content: "" }]);
    try {
      const { streamReply } = await import("../ai/engine.js");
      const convo = [{ role: "system", content: ai.systemPrompt }, ...history.slice(-8)];
      let out = "";
      for await (const piece of streamReply(engine, convo)) {
        out += piece;
        setMessages([...history, { role: "assistant", content: out }]);
      }
    } catch {
      setMessages([...history, { role: "assistant", content: scripted(text) }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full min-h-[60vh] flex-col gap-4">
      <BootCard boot={boot} onStart={start} />

      <div ref={list} className="scroll-quiet flex-1 space-y-3 overflow-y-auto" aria-live="polite">
        {messages.map((m, i) => (
          <p
            key={i}
            className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm ${
              m.role === "user"
                ? "ml-auto bg-flag-blue text-slate-950"
                : "border border-sky-400/25 bg-slate-950/50 text-sky-50"
            }`}
          >
            {m.content || <span className="text-slate-400">…</span>}
          </p>
        ))}
      </div>

      <form onSubmit={send} className="flex gap-2">
        <label htmlFor="chat-input" className="sr-only">Message</label>
        <input
          id="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about projects, AI, or deep dish…"
          className="min-w-0 flex-1 rounded-full border border-sky-400/30 bg-slate-950/60 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-flag-blue focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          aria-label="Send"
          className="grid h-11 w-11 place-items-center rounded-full bg-flag-blue text-slate-950 transition hover:bg-white disabled:opacity-40"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}

function BootCard({ boot, onStart }) {
  if (boot.state === "ready") {
    return <p className="text-xs text-emerald-300">● AI twin running locally on your GPU. Nothing you type leaves this browser.</p>;
  }
  if (!hasWebGPU) {
    return (
      <p className="rounded-xl border border-sky-400/20 bg-slate-950/40 p-3 text-xs text-slate-300">
        Your browser doesn’t support WebGPU, so you’re chatting with the scripted twin. Open this page in a recent Chrome or Edge on a computer to run the real model.
      </p>
    );
  }
  if (boot.state === "loading") {
    const pct = Math.round(boot.progress * 100);
    return (
      <div className="rounded-xl border border-sky-400/20 bg-slate-950/40 p-3">
        <div className="flex justify-between text-xs text-sky-100">
          <span>Booting {boot.model.label}</span>
          <span>{pct}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-gradient-to-r from-flag-blue to-neon-orange transition-[width]" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-2 line-clamp-2 text-[11px] text-slate-400">{boot.text}</p>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-sky-400/20 bg-slate-950/40 p-3">
      <p className="text-xs text-slate-300">
        {boot.state === "error"
          ? `The model couldn’t start (${boot.text}). You’re on the scripted twin for now.`
          : "You’re chatting with the scripted twin. Boot a real language model that runs entirely on your GPU, with no server and no data leaving your browser:"}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {ai.models.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onStart(m)}
            className="inline-flex items-center gap-2 rounded-full border border-flag-blue/60 px-3 py-1.5 text-xs text-sky-100 transition hover:bg-flag-blue/20 hover:text-white"
          >
            <Cpu size={14} aria-hidden="true" /> Boot AI twin ({m.label}, {m.size}, downloads once)
          </button>
        ))}
      </div>
    </div>
  );
}
