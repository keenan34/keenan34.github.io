import { lazy, Suspense, useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import Hud from "./ui/Hud.jsx";
import Drawer from "./ui/Drawer.jsx";
import ProjectsPanel from "./ui/ProjectsPanel.jsx";
import AboutPanel from "./ui/AboutPanel.jsx";
import ChatPanel from "./ui/ChatPanel.jsx";
import PlainPortfolio from "./ui/PlainPortfolio.jsx";
import { LabelLayer } from "./scene/labels.jsx";

const Scene = lazy(() => import("./scene/Scene.jsx"));

const hasWebGL = (() => {
  try { return !!document.createElement("canvas").getContext("webgl2"); } catch { return false; }
})();
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const PANELS = {
  projects: { title: "Projects", Body: ProjectsPanel },
  about: { title: "About", Body: AboutPanel },
  chat: { title: "Talk to my AI twin", Body: ChatPanel },
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

  if (!hasWebGL) return <PlainPortfolio />;

  const panel = open && PANELS[open];
  return (
    <div className="relative h-full w-full">
      <Suspense fallback={<Loading />}>
        <Scene onOpen={setOpen} paused={paused} />
      </Suspense>
      <LabelLayer />
      <Hud paused={paused} onTogglePause={() => setPaused((p) => !p)} onOpen={setOpen} />
      <AnimatePresence>
        {panel && (
          <Drawer key={open} title={panel.title} onClose={() => setOpen(null)}>
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
