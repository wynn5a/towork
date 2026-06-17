import { BrowserRouter, Route, Routes } from "react-router-dom";
import { StoreProvider } from "./lib/store";
import { UIProvider } from "./lib/ui";
import { Toaster } from "./components/Toaster";
import { App } from "./App";
import { HomePage } from "./pages/HomePage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { ProjectPage } from "./pages/ProjectPage";
import { SearchPage } from "./pages/SearchPage";
import { SimpleModePage } from "./pages/SimpleModePage";

export default function Router() {
  return (
    <BrowserRouter>
      <StoreProvider>
        <UIProvider>
          <Routes>
            <Route element={<App />}>
              <Route index element={<HomePage />} />
              <Route path="projects" element={<ProjectsPage />} />
              <Route path="project/:id" element={<ProjectPage />} />
              <Route path="search" element={<SearchPage />} />
            </Route>
            <Route path="/simple" element={<SimpleModePage />} />
          </Routes>
          <Toaster />
        </UIProvider>
      </StoreProvider>
    </BrowserRouter>
  );
}
