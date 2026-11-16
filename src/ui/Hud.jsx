import { Pause, Play } from "lucide-react";
import { person } from "../data/portfolioData.js";

// Top bar (name, Chicago stars, pause), keyboard shortcuts to each landmark, and the
// bottom helper pill.
export default function Hud({ paused, onTogglePause, onOpen }) {
  return (
    <>
      <header className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-4 p-4 sm:p-6">
        <div className="pointer-events-auto">
          <h1 className="font-display text-3xl font-black uppercase leading-none tracking-wide text-white drop-shadow-[0_0_12px_rgba(125,211,252,0.45)] sm:text-4xl">
            {person.name}
          </h1>
          <p className="mt-1 text-sm text-sky-100/80">
            {person.role} · {person.city}
          </p>
          <p aria-hidden="true" className="mt-1 text-lg leading-none tracking-[0.35em] text-flag-red drop-shadow-[0_0_8px_rgba(239,51,64,0.7)]">
            ✶✶✶✶
          </p>
        </div>
        <button
          type="button"
          onClick={onTogglePause}
          className="pointer-events-auto grid h-10 w-10 place-items-center rounded-full border border-sky-400/30 bg-slate-900/70 text-sky-100 backdrop-blur-md transition hover:border-flag-blue hover:text-white"
          aria-label={paused ? "Play animation" : "Pause animation"}
          title={paused ? "Play animation" : "Pause animation"}
        >
          {paused ? <Play size={18} /> : <Pause size={18} />}
        </button>
      </header>

      {/* Keyboard and screen-reader access to the three landmarks; shown when focused. */}
      <nav aria-label="Sections" className="absolute left-4 top-28 flex flex-col gap-2">
        {[["projects", "Projects"], ["about", "About"], ["chat", "Talk to AI"]].map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => onOpen(key)}
            className="sr-only rounded-full border border-flag-blue bg-slate-900/90 px-4 py-2 text-sm text-white focus:not-sr-only"
          >
            {label}
          </button>
        ))}
      </nav>

      <p className="pointer-events-none absolute inset-x-0 bottom-5 mx-auto w-fit max-w-[92%] rounded-full border border-sky-400/30 bg-slate-900/70 px-4 py-2 text-center text-xs text-sky-100/90 backdrop-blur-md sm:text-sm">
        Drag to rotate the block · Click the glowing landmarks to explore
      </p>
    </>
  );
}
