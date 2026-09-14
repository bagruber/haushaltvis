import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./routes";
import { YearProvider } from "./lib/year";
import { NummernProvider } from "./lib/nummern";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <YearProvider>
      <NummernProvider>
        <RouterProvider router={router} />
      </NummernProvider>
    </YearProvider>
  </StrictMode>,
);
