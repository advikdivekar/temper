// main.tsx
// The entry point: mounts the app and wraps it in the shared helpers
// (router, motion settings, notifications, sign in state).
//
// MotionConfig reducedMotion="user" makes every animation respect the
// visitor's "reduce motion" system setting.

import { MotionConfig } from "motion/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { AuthProvider } from "./auth/AuthContext";
import { ToastProvider } from "./ui/Toast";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/ui.css";
import "./styles/landing.css";
import "./styles/app.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </MotionConfig>
  </StrictMode>,
);
