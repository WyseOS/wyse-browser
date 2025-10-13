import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Updater from "./store/updater";
import { BrowserRouter } from "react-router-dom";

const container = document.querySelector("#root");
if (container) {
  const root = createRoot(container);
  const queryClient = new QueryClient();
  root.render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        <Updater />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
