import { ArrowLeft, Pause, Play } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { DRAWER_WIDTH } from "./Drawer.jsx";
import { person } from "../data/portfolioData.js";

// Top bar (name, Chicago stars, pause), keyboard shortcuts to each landmark, and the
// bottom helper pill.
export default function Hud({ paused, onTogglePause, onOpen, section, onBack }) {
  // Center the Back pill in the open part of the screen, beside the drawer.
  const backLeft =
    section === "left" ? `calc(50% + ${DRAWER_WIDTH / 2}px)` : section === "right" ? `calc(50% - ${DRAWER_WIDTH / 2}px)` : "50%";

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

      {/* Keyboard and screen-reader access to the landmarks; shown when focused. */}
      <nav aria-label="Sections" className="absolute left-4 top-28 flex flex-col gap-2">
        {[["projects", "Projects"], ["about", "About"]].map(([key, label]) => (
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

      <p
        className={`pointer-events-none absolute inset-x-0 bottom-5 mx-auto w-fit max-w-[92%] rounded-full border border-white/10 bg-slate-950/60 px-4 py-2 text-center text-xs text-white/80 backdrop-blur-xl transition-opacity duration-500 sm:text-sm ${section ? "opacity-0" : "opacity-100"}`}
      >
        Drag to rotate · Click the ‘L’ train for projects, the Bean for about
      </p>

      <AnimatePresence>
        {section && (
          <motion.button
            type="button"
            onClick={onBack}
            className="fixed top-24 z-30 hidden -translate-x-1/2 items-center gap-2 rounded-full border border-white/15 bg-slate-950/70 px-5 py-2.5 text-sm font-medium tracking-wide text-white shadow-2xl shadow-black/50 backdrop-blur-xl transition-colors hover:border-white/30 hover:bg-slate-900/80 sm:inline-flex sm:top-auto sm:bottom-6"
            style={{ left: backLeft }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.3, delay: 0.25 }}
          >
            <ArrowLeft size={16} aria-hidden="true" /> Back to Full View
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}
