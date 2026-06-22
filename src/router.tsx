import { BrowserRouter, Route, Routes } from "react-router-dom";
import { StoreProvider } from "./lib/store";
import { UIProvider } from "./lib/ui";
import { Toaster } from "./components/Toaster";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { App } from "./App";
import { HomePage } from "./pages/HomePage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { ProjectPage } from "./pages/ProjectPage";
import { SearchPage } from "./pages/SearchPage";
import { SimpleModePage } from "./pages/SimpleModePage";

export default function Router() {
  return (
    <BrowserRouter>
      <ErrorBoundary title="App crashed">
        <StoreProvider>
          <UIProvider>
            <Routes>
              <Route element={<App />}>
                <Route index element={<ErrorBoundary title="Home page crashed"><HomePage /></ErrorBoundary>} />
                <Route path="projects" element={<ErrorBoundary title="Projects page crashed"><ProjectsPage /></ErrorBoundary>} />
                <Route path="project/:id" element={<ErrorBoundary title="Project page crashed"><ProjectPage /></ErrorBoundary>} />
                <Route path="search" element={<ErrorBoundary title="Search crashed"><SearchPage /></ErrorBoundary>} />
              </Route>
              <Route path="/simple" element={<ErrorBoundary title="Simple mode crashed" icon="target"><SimpleModePage /></ErrorBoundary>} />
            </Routes>
            <Toaster />
          </UIProvider>
        </StoreProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
