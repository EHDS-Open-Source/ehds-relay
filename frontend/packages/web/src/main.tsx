import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { createRelayApp } from "./createRelayApp";
import "./index.css";

const RelayApp = createRelayApp();

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

createRoot(root).render(
  <StrictMode>
    <RelayApp />
  </StrictMode>,
);
