import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { CameraControls, CameraControlsImpl } from "@react-three/drei";

// Flies the camera between the overview and each section. Section views frame their
// landmarks beside the open drawer (left/right on wide screens, top half on phones)
// using a screen-space focal offset, and lock rotation until the visitor goes back.
const { ACTION } = CameraControlsImpl;
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

const VIEWS = {
  overview: { target: [0, 3.6, 0], dir: [20, 14.4, 20], zoomK: 1, shift: [0, 0], phoneShift: [0, 0] },
  // The 'L' train and Wellington station, seen low and side-on; drawer opens on the left.
  projects: { target: [-2.4, 4.4, 2.0], dir: [0.35, 0.45, 1], zoomK: 2.2, shift: [-0.2, 0], phoneShift: [0, 0.22] },
  // The Bean, the Divvy dock and the flag; drawer opens on the right.
  about: { target: [4.3, 1.1, -2.7], dir: [1, 0.55, 0.45], zoomK: 2.4, shift: [0.2, 0], phoneShift: [0, 0.3] },
};

// The block is 12 units across and the tower about 11.5 tall; fit both on screen.
function overviewZoom({ width, height }) {
  const across = width < 640 ? 14 : 25;
  return Math.max(16, Math.min(width, height * 1.2) / across);
}

export default function CameraRig({ view }) {
  const ref = useRef();
  const size = useThree((s) => s.size);
  const first = useRef(true);
  const setDpr = useThree((s) => s.setDpr);

  // Spend fewer pixels during camera motion; restore Retina detail once settled.
  useEffect(() => {
    const controls = ref.current;
    const mobile = matchMedia("(pointer: coarse)").matches || size.width < 640;
    if (!mobile) return;
    const fullDpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 3));
    const moving = () => setDpr(Math.min(fullDpr, 1.5));
    const settled = () => setDpr(fullDpr);
    controls.addEventListener("transitionstart", moving);
    controls.addEventListener("controlstart", moving);
    controls.addEventListener("rest", settled);
    controls.addEventListener("sleep", settled);
    return () => {
      controls.removeEventListener("transitionstart", moving);
      controls.removeEventListener("controlstart", moving);
      controls.removeEventListener("rest", settled);
      controls.removeEventListener("sleep", settled);
      settled();
    };
  }, [setDpr, size.width]);

  // No panning: drag rotates, wheel/pinch zooms.
  useEffect(() => {
    const c = ref.current;
    c.mouseButtons.right = ACTION.NONE;
    c.mouseButtons.middle = ACTION.NONE;
    c.touches.two = ACTION.TOUCH_ZOOM;
    c.touches.three = ACTION.NONE;
  }, []);

  useEffect(() => {
    const c = ref.current;
    const v = VIEWS[view] ?? VIEWS.overview;
    const animate = !reduced && !first.current;
    first.current = false;

    const phone = size.width < 640;
    // Phones show the section in the band above the bottom sheet, so pull back a little.
    const zoom = overviewZoom(size) * (view && phone ? v.zoomK * 0.85 : v.zoomK);
    const [tx, ty, tz] = v.target;
    const len = Math.hypot(...v.dir);
    const D = 32;
    c.smoothTime = 0.55;
    c.enabled = !view;
    c.setLookAt(tx + (v.dir[0] / len) * D, ty + (v.dir[1] / len) * D, tz + (v.dir[2] / len) * D, tx, ty, tz, animate);
    c.zoomTo(zoom, animate);
    const [fx, fy] = phone ? v.phoneShift : v.shift;
    c.setFocalOffset((fx * size.width) / zoom, (fy * size.height) / zoom, 0, animate);
  }, [view, size]);

  return (
    <CameraControls
      ref={ref}
      makeDefault
      minPolarAngle={Math.PI / 6}
      maxPolarAngle={Math.PI / 2.5}
      minAzimuthAngle={-Math.PI / 12}
      maxAzimuthAngle={Math.PI / 2 + Math.PI / 12}
      minZoom={14}
      maxZoom={160}
      draggingSmoothTime={0.12}
    />
  );
}
