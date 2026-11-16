import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";

// Frosted-glass side drawer (bottom sheet on phones). Esc and the backdrop close it,
// focus stays inside while it's open, and returns to where it was afterwards.
export default function Drawer({ title, onClose, children }) {
  const panel = useRef();
  const close = useRef(onClose);
  close.current = onClose;
  // Slides in from the right on wide screens, up from the bottom on phones.
  const wide = matchMedia("(min-width: 640px)").matches;
  const hidden = wide ? { x: "100%", y: 0 } : { x: 0, y: "100%" };

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

  return (
    <div className="fixed inset-0 z-20">
      <motion.div
        className="absolute inset-0 bg-black/40"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.section
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="absolute inset-x-0 bottom-0 flex max-h-[88%] flex-col rounded-t-2xl border border-sky-400/30 bg-slate-900/80 shadow-[0_0_40px_rgba(56,189,248,0.15)] backdrop-blur-md outline-none sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-[min(560px,100%)] sm:rounded-none sm:rounded-l-2xl"
        initial={hidden}
        animate={{ x: 0, y: 0 }}
        exit={hidden}
        transition={{ type: "spring", damping: 30, stiffness: 260 }}
      >
        <div className="flex items-center justify-between gap-4 border-b border-sky-400/20 px-5 py-4">
          <h2 className="font-display text-2xl font-black uppercase tracking-wide text-white">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-9 w-9 place-items-center rounded-full border border-sky-400/30 text-sky-100 transition hover:border-flag-blue hover:text-white"
          >
            <X size={18} />
          </button>
        </div>
        <div className="scroll-quiet min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
      </motion.section>
    </div>
  );
}
