import { ArrowLeft, Pause, Play } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { person } from "../data/portfolioData.js";
import { DRAWER_WIDTH } from "./Drawer.jsx";

// The page's chrome is CTA signage: black plates, white grotesque lettering, and the
// 'L' line colors as markers. The name plate is a station sign.
const plate = "bg-sign text-sign-ink rounded-[3px] ring-1 ring-white/10 shadow-lg shadow-black/40";

export default function Hud({ paused, onTogglePause, onOpen, section, onBack }) {
  // Center the Back sign in the open part of the screen, beside the drawer.
  const backLeft =
    section === "left" ? `calc(50% + ${DRAWER_WIDTH / 2}px)` : section === "right" ? `calc(50% - ${DRAWER_WIDTH / 2}px)` : "50%";

  return (
    <>
      <header className={`pointer-events-auto absolute left-4 top-4 px-4 pb-3 pt-3.5 sm:left-6 sm:top-6 sm:px-5 ${plate}`}>
        <h1 className="text-[1.6rem] font-bold leading-none tracking-[-0.015em] sm:text-[1.85rem]">{person.name}</h1>
        <p className="mt-2 text-[0.8rem] text-sign-ink/65 sm:text-sm">
          {person.role} · {person.city}
        </p>
      </header>

      <button
        type="button"
        onClick={onTogglePause}
        className={`absolute right-4 top-4 grid h-10 w-10 place-items-center text-sign-ink/80 transition-colors hover:text-white sm:right-6 sm:top-6 ${plate}`}
        aria-label={paused ? "Play animation" : "Pause animation"}
        title={paused ? "Play animation" : "Pause animation"}
      >
        {paused ? <Play size={16} /> : <Pause size={16} />}
      </button>

      {/* Keyboard and screen-reader access to the landmarks; shown when focused. */}
      <nav aria-label="Sections" className="absolute left-4 top-32 flex flex-col gap-2">
        {[["projects", "Projects"], ["about", "About"]].map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => onOpen(key)}
            className={`sr-only px-4 py-2 text-sm font-semibold focus:not-sr-only ${plate}`}
          >
            {label}
          </button>
        ))}
      </nav>

      <p
        className={`pointer-events-none absolute inset-x-0 bottom-5 mx-auto w-fit max-w-[92%] px-4 py-2 text-center text-[0.8rem] text-sign-ink/80 transition-opacity duration-500 ${plate} ${section ? "opacity-0" : "opacity-100"}`}
      >
        Drag to look around. Click the train for projects, the Bean for about.
      </p>

      <AnimatePresence>
        {section && (
          <motion.button
            type="button"
            onClick={onBack}
            className={`fixed bottom-6 z-30 hidden -translate-x-1/2 items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-sign-ink hover:text-sign sm:inline-flex ${plate}`}
            style={{ left: backLeft }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.3, delay: 0.25 }}
          >
            <ArrowLeft size={16} aria-hidden="true" /> Back to full view
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}
