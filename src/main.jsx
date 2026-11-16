import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  // No StrictMode: its double mount breaks drei <Html> labels under React 19.
  <App />,
);
