import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { installBrowserBridge } from "./browserBridge";
import "./styles/app.css";

installBrowserBridge();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
