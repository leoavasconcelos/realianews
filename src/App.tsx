import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "next-themes";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Admin pages
import { AdminLayout } from "./pages/admin/AdminLayout";
import { Dashboard } from "./pages/admin/Dashboard";
import { NewsManagement } from "./pages/admin/NewsManagement";
import { TopicsManagement } from "./pages/admin/TopicsManagement";
import { TopicsAudit } from "./pages/admin/TopicsAudit";
import { SourcesManagement } from "./pages/admin/SourcesManagement";
import { UsersManagement } from "./pages/admin/UsersManagement";
import { Analytics } from "./pages/admin/Analytics";
import { InstagramAutomation } from "./pages/admin/InstagramAutomation";
import { CrawlMonitor } from "./pages/admin/CrawlMonitor";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              
              {/* Admin Routes */}
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="news" element={<NewsManagement />} />
                <Route path="topics" element={<TopicsManagement />} />
                <Route path="topics/audit" element={<TopicsAudit />} />
                <Route path="sources" element={<SourcesManagement />} />
                <Route path="users" element={<UsersManagement />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="instagram" element={<InstagramAutomation />} />
                <Route path="crawl" element={<CrawlMonitor />} />
              </Route>
              
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
