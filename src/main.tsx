import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./common/layouts/app-shell.css";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
