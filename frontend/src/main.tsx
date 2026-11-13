import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./style.css";

const webApp = (window as any).Telegram?.WebApp;
webApp?.ready();
webApp?.expand();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode><App /></React.StrictMode>
);
