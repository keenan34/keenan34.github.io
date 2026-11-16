import { lazy, Suspense, useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import Hud from "./ui/Hud.jsx";
import Drawer from "./ui/Drawer.jsx";
import ProjectsPanel from "./ui/ProjectsPanel.jsx";
import AboutPanel from "./ui/AboutPanel.jsx";
import PlainPortfolio from "./ui/PlainPortfolio.jsx";
import { LabelLayer } from "./scene/labels.jsx";

const Scene = lazy(() => import("./scene/Scene.jsx"));

const hasWebGL = (() => {
  try { return !!document.createElement("canvas").getContext("webgl2"); } catch { return false; }
})();
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Projects opens on the left (camera frames the station on the right), About on the right.
const PANELS = {
  projects: { title: "Projects", side: "left", Body: ProjectsPanel },
  about: { title: "About", side: "right", Body: AboutPanel },
};

export default function App() {
  const [open, setOpen] = useState(null);
  const [paused, setPaused] = useState(prefersReducedMotion);

  // Opening a link like keenan34.github.io/#projects goes straight to that panel.
  useEffect(() => {
    const fromHash = () => {
      const key = location.hash.slice(1);
      if (PANELS[key]) setOpen(key);
    };
    fromHash();
    addEventListener("hashchange", fromHash);
    return () => removeEventListener("hashchange", fromHash);
  }, []);
  useEffect(() => {
    const want = open ? `#${open}` : "";
    if (location.hash !== want) history.replaceState(null, "", want || location.pathname + location.search);
  }, [open]);

  if (!hasWebGL) return <PlainPortfolio />;

  const panel = open && PANELS[open];
  return (
    <div className="relative h-full w-full">
      <Suspense fallback={<Loading />}>
        <Scene view={open} onOpen={setOpen} onClose={() => setOpen(null)} paused={paused} />
      </Suspense>
      <LabelLayer hidden={!!open} />
      <Hud
        paused={paused}
        onTogglePause={() => setPaused((p) => !p)}
        onOpen={setOpen}
        section={panel && panel.side}
        onBack={() => setOpen(null)}
      />
      <AnimatePresence>
        {panel && (
          <Drawer key={open} title={panel.title} side={panel.side} onClose={() => setOpen(null)}>
            <panel.Body onOpen={setOpen} />
          </Drawer>
        )}
      </AnimatePresence>
    </div>
  );
}

function Loading() {
  return (
    <div className="grid h-full place-items-center font-display text-2xl tracking-wide text-flag-blue/70">
      Building the block…
    </div>
  );
}
