/* LABELED_BY_TOOL
 * File: src/App.tsx
 * Inferred role: Frontend source (React + Vite)
 * Note: auto-generated label. Please edit the file for a more accurate description. */

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "@/context/AppContext";
import Dashboard from "./pages/Dashboard";
import Upload from "./pages/Upload";
import ReportViewer from "./pages/ReportViewer";
import Analysis from "./pages/Analysis";
import Summary from "./pages/Summary";
import Landing from "./pages/Landing";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AppProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/summary" element={<Summary />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/reports/:runId" element={<ReportViewer />} />
            <Route path="/analysis/:id" element={<Analysis />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AppProvider>
  </QueryClientProvider>
);

export default App;
