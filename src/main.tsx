import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@aether/ui/tokens.css";
import "@aether/ui/widgets.css";
import App from "./App";
if (location.pathname.startsWith('/io/') && !new URLSearchParams(location.search).has('document') && !new URLSearchParams(location.search).has('editor')) {
  location.replace('/?home=io');
} else createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
