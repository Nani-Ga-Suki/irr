import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

function disableBrowserZoom() {
  const viewport = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
  viewport?.setAttribute(
    "content",
    "width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover",
  );

  const preventDefault = (event: Event) => event.preventDefault();
  const options: AddEventListenerOptions = { passive: false };

  document.addEventListener("gesturestart", preventDefault, options);
  document.addEventListener("gesturechange", preventDefault, options);
  document.addEventListener("gestureend", preventDefault, options);

  document.addEventListener("touchmove", (event) => {
    if (event.touches.length > 1) event.preventDefault();
  }, options);

  let lastTouchEnd = 0;
  document.addEventListener("touchend", (event) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) event.preventDefault();
    lastTouchEnd = now;
  }, options);

  document.addEventListener("wheel", (event) => {
    if (event.ctrlKey) event.preventDefault();
  }, options);
}

disableBrowserZoom();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
