// Floating landmark labels as plain DOM, positioned every frame from a 3D anchor.
// (drei's <Html> loses a label to a mount race under React 19, so this replaces it.)
export const anchors = new Map();   // id -> Object3D inside the scene
export const elements = new Map();  // id -> label <span> in the page

export const registerAnchor = (id) => (obj) => (obj ? anchors.set(id, obj) : anchors.delete(id));
export const setHover = (id, on) => { const el = elements.get(id); if (el) el.dataset.hover = on ? "1" : "0"; };

// Each label is a small sign plate; the marker is the 'L' line color it belongs to.
const LABELS = [
  ["projects", "Projects", "bg-line-green"],
  ["about", "About", "bg-line-blue"],
];

// Lives outside the <Canvas>, on top of it.
export function LabelLayer({ hidden, onOpen }) {
  return (
    <div aria-hidden="true" inert={hidden} className={`pointer-events-none absolute inset-0 overflow-hidden transition-opacity duration-500 ${hidden ? "opacity-0" : "opacity-100"}`}>
      {LABELS.map(([id, text, marker]) => (
        <button type="button" tabIndex={-1} onClick={() => onOpen(id)}
          key={id}
          ref={(el) => (el ? elements.set(id, el) : elements.delete(id))}
          data-hover="0"
          className="landmark-label pointer-events-auto absolute left-0 top-0 flex items-center gap-2 whitespace-nowrap rounded-[3px] bg-sign py-1 pl-2 pr-2.5 text-[0.8rem] font-semibold text-sign-ink opacity-0 shadow-lg shadow-black/40 ring-1 ring-white/10 transition-colors data-[hover=1]:bg-sign-ink data-[hover=1]:text-sign"
        >
          <span className={`h-2.5 w-2.5 rounded-[2px] ${marker}`} />
          {text}
        </button>
      ))}
    </div>
  );
}
