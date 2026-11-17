import * as THREE from "three";

// Shared CTA artwork: the roundel logo, the station nameplate and the LED arrival
// board. Textures are created once and reused by the train and the station.

let logo;
export function ctaLogo() {
  if (!logo) {
    logo = new THREE.TextureLoader().load("./cta.png");
    logo.colorSpace = THREE.SRGBColorSpace;
    logo.anisotropy = 4;
  }
  return logo;
}

function canvasTexture(w, h, draw) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  const paint = () => { draw(c.getContext("2d"), w, h); t.needsUpdate = true; };
  paint();
  document.fonts?.ready.then(paint);
  t.userData.repaint = paint;
  return t;
}

const SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif";

// Black CTA station sign: name in white with the colored dots of the lines that stop there.
let nameplate;
export function ctaNameplate() {
  nameplate ??= canvasTexture(512, 80, (g, w, h) => {
    g.fillStyle = "#111111";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#ffffff";
    g.font = `700 46px ${SANS}`;
    g.textBaseline = "middle";
    g.fillText("Wellington", 22, h / 2 + 2);
    const lines = ["#62361b", "#522398"];
    lines.forEach((color, i) => {
      g.fillStyle = color;
      g.beginPath();
      g.arc(300 + i * 34, h / 2, 12, 0, Math.PI * 2);
      g.fill();
    });
  });
  return nameplate;
}

// LED arrival board, laid out like the real "Service at … platform" displays.
// Brown and Purple Line service at Wellington, in both directions.
// Each train counts down from its first ETA; once it has come and gone it is
// rescheduled one headway later, so the board keeps running like the real one.
const ARRIVALS = [
  { line: "Brown Line #412 to", dest: "Kimball", min: 2, headway: 7, color: "#62361b" },
  { line: "Purple Line #508 to", dest: "Loop", min: 4, headway: 9, color: "#522398" },
].map((a) => ({ ...a, at: Date.now() + a.min * 60000 }));

// Whole minutes left, or "Due" in the last minute, as on CTA displays.
function eta(a, now) {
  while (a.at + 30000 < now) a.at += a.headway * 60000;
  const min = Math.floor((a.at - now) / 60000);
  return min < 1 ? "Due" : `${min} min`;
}

let board;
export function ctaArrivalBoard() {
  board ??= canvasTexture(640, 260, (g, w, h) => {
    g.fillStyle = "#151515";
    g.fillRect(0, 0, w, h);
    const x0 = 22, x1 = w - 22;
    // Header bar.
    g.fillStyle = "#1f3b34";
    g.fillRect(x0, 22, x1 - x0, 34);
    g.fillStyle = "#e5e7eb";
    g.font = `600 20px ${SANS}`;
    g.textBaseline = "middle";
    g.fillText("Service at Wellington", x0 + 46, 40);
    // Rows, soonest first.
    const now = Date.now();
    const rows = ARRIVALS.map((a) => { const label = eta(a, now); return { ...a, label }; }).sort((p, q) => p.at - q.at);
    rows.forEach((a, i) => {
      const y = 60 + i * 92;
      g.fillStyle = "#1f3b34";
      g.fillRect(x0, y, 40, 88);
      g.fillStyle = "#e5e7eb";
      g.font = `600 22px ${SANS}`;
      g.fillText(String(i + 1), x0 + 13, y + 44);
      g.fillStyle = a.color;
      g.fillRect(x0 + 44, y, x1 - x0 - 44, 88);
      g.fillStyle = "#ffffff";
      g.font = `500 19px ${SANS}`;
      g.fillText(a.line, x0 + 58, y + 22);
      g.font = `700 44px ${SANS}`;
      g.fillText(a.dest, x0 + 56, y + 60);
      if (a.airport) {
        // White tile with an airplane, as on the real signs for airport trains.
        const bx = x0 + 64 + g.measureText(a.dest).width;
        g.fillStyle = "#ffffff";
        g.beginPath();
        g.roundRect(bx, y + 40, 40, 40, 6);
        g.fill();
        g.fillStyle = a.color;
        g.font = `700 30px ${SANS}`;
        g.textAlign = "center";
        g.fillText("✈", bx + 20, y + 61);
        g.textAlign = "left";
      }
      g.fillStyle = "#ffffff";
      g.textAlign = "right";
      g.font = `700 40px ${SANS}`;
      g.fillText(a.label, x1 - 48, y + 50);
      g.textAlign = "left";
      // The "tracked live" signal icon.
      g.strokeStyle = "#ffffff";
      g.lineWidth = 3;
      [8, 14, 20].forEach((r) => {
        g.beginPath();
        g.arc(x1 - 38, y + 62, r, -Math.PI / 2, 0);
        g.stroke();
      });
    });
  });
  setInterval(board.userData.repaint, 15000);
  return board;
}
