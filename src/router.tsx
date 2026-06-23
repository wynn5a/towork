import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import type { ComponentProps } from "react";
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

/**
 * ErrorBoundary wired to reset on route change. `ErrorBoundary` is a class and
 * can't call `useLocation` itself, so this wrapper reads the current path and
 * passes it as a resetKey — navigating to a different route auto-recovers a
 * boundary that's stuck on a deterministic page error.
 */
function RouteErrorBoundary(props: ComponentProps<typeof ErrorBoundary>) {
  const location = useLocation();
  return <ErrorBoundary {...props} resetKeys={[location.pathname]} />;
}

export default function Router() {
  return (
    <BrowserRouter>
      <RouteErrorBoundary title="App crashed">
        <StoreProvider>
          <UIProvider>
            <Routes>
              <Route element={<App />}>
                <Route index element={<RouteErrorBoundary title="Home page crashed"><HomePage /></RouteErrorBoundary>} />
                <Route path="projects" element={<RouteErrorBoundary title="Projects page crashed"><ProjectsPage /></RouteErrorBoundary>} />
                <Route path="project/:id" element={<RouteErrorBoundary title="Project page crashed"><ProjectPage /></RouteErrorBoundary>} />
                <Route path="search" element={<RouteErrorBoundary title="Search crashed"><SearchPage /></RouteErrorBoundary>} />
              </Route>
              <Route path="/simple" element={<RouteErrorBoundary title="Simple mode crashed" icon="target"><SimpleModePage /></RouteErrorBoundary>} />
            </Routes>
            <Toaster />
          </UIProvider>
        </StoreProvider>
      </RouteErrorBoundary>
    </BrowserRouter>
  );
}
