import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { AppProviders } from "./providers/AppProviders";
import { router } from "./routes";
import "./index.css";

createRoot(document.getElementById("root")!).render(
    <AppProviders>
        <RouterProvider router={router} />
    </AppProviders>
);
