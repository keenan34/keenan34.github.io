import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";

// Frosted-glass section drawer. On wide screens it slides in from the given side
// (the camera frames the landmark on the other side); on phones it's a bottom sheet
// and the landmark sits in the top half. There's no backdrop, so the 3D scene stays
// visible and clickable: Esc, the close button, Back, or clicking empty space close it.
// Focus stays inside while it's open and returns to where it was afterwards.
export const DRAWER_WIDTH = 520;

export default function Drawer({ title, side = "right", onClose, children }) {
  const panel = useRef();
  const close = useRef(onClose);
  close.current = onClose;
  const wide = matchMedia("(min-width: 640px)").matches;
  const hidden = wide
    ? { x: side === "left" ? -60 : 60, y: 0, opacity: 0 }
    : { x: 0, y: "100%", opacity: 1 };

  useEffect(() => {
    const before = document.activeElement;
    panel.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") close.current();
      if (e.key !== "Tab") return;
      const items = panel.current.querySelectorAll(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
      );
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
      else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
    };
    addEventListener("keydown", onKey);
    return () => { removeEventListener("keydown", onKey); before?.focus?.(); };
  }, []);

  const placement =
    side === "left"
      ? "sm:left-4 sm:right-auto"
      : "sm:right-4 sm:left-auto";

  return (
    <motion.section
      ref={panel}
      role="dialog"
      aria-label={title}
      tabIndex={-1}
      style={wide ? { width: `min(${DRAWER_WIDTH}px, calc(100% - 2rem))` } : undefined}
      className={`fixed inset-x-0 bottom-0 z-20 flex max-h-[62%] flex-col rounded-t-3xl border border-white/10 bg-slate-950/75 shadow-2xl shadow-black/60 backdrop-blur-xl outline-none sm:inset-x-auto sm:top-4 sm:bottom-4 sm:max-h-none sm:rounded-3xl ${placement}`}
      initial={hidden}
      animate={{ x: 0, y: 0, opacity: 1 }}
      exit={hidden}
      transition={{ type: "spring", damping: 32, stiffness: 280, opacity: { duration: 0.25 } }}
    >
      <div className="flex items-center justify-between gap-4 border-b border-white/10 px-6 py-5">
        <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-white/90">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-white/70 transition hover:border-white/30 hover:bg-white/5 hover:text-white"
        >
          <X size={17} />
        </button>
      </div>
      <div className="scroll-quiet min-h-0 flex-1 overflow-y-auto px-6 py-6">{children}</div>
    </motion.section>
  );
}
