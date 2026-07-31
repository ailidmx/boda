import React from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { App } from "./App.jsx";

const container = document.querySelector("#app");
const root = createRoot(container);
root.render(<App />);
