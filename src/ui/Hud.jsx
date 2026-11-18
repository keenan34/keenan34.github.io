import { ArrowLeft, Pause, Play } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { person } from "../data/portfolioData.js";
import { DRAWER_WIDTH } from "./Drawer.jsx";

// Compact transit-sign controls sit beside the editorial title.
const plate = "bg-sign text-sign-ink rounded-[3px] ring-1 ring-white/10 shadow-lg shadow-black/40";

export default function Hud({ paused, onTogglePause, section, onBack, night }) {
  // Center the Back sign in the open part of the screen, beside the drawer.
  const backLeft =
    section === "left" ? `calc(50% + ${DRAWER_WIDTH / 2}px)` : section === "right" ? `calc(50% - ${DRAWER_WIDTH / 2}px)` : "50%";

  return (
    <>
      <header hidden={!!section} className={night < 0.3 ? "river-title river-title-day" : "river-title"}>
        <p className="river-location"><span aria-hidden="true" />{person.city}, Illinois</p>
        <h1>{person.name}</h1>
        <p className="river-role">{person.role}</p>
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

      {!section && <p className="river-hint">Drag to explore</p>}

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
