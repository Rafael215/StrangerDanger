import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import Pokedex from "./pages/Pokedex.tsx";
import NearbyFeed from "./pages/NearbyFeed.tsx";
import LearnBeforeYouGo from "./pages/LearnBeforeYouGo.tsx";
import SurvivalScenario from "./pages/SurvivalScenario.tsx";
import SoundTraining from "./pages/SoundTraining.tsx";
import FieldScanner from "./pages/FieldScanner.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/field-guide" element={<Pokedex />} />
          <Route path="/nearby" element={<NearbyFeed />} />
          <Route path="/learn" element={<LearnBeforeYouGo />} />
          <Route path="/survival" element={<SurvivalScenario />} />
          <Route path="/sound-training" element={<SoundTraining />} />
          <Route path="/field-scanner" element={<FieldScanner />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
