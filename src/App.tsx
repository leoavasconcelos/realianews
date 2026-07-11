import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "next-themes";
import { Loader2 } from "lucide-react";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import MetroQuadradoGuide from "./pages/guides/MetroQuadradoGuide";

// Admin pages are lazy-loaded so the main bundle stays small.
const AdminLayout = lazy(() =>
  import("./pages/admin/AdminLayout").then((m) => ({ default: m.AdminLayout }))
);
const Dashboard = lazy(() =>
  import("./pages/admin/Dashboard").then((m) => ({ default: m.Dashboard }))
);
const NewsManagement = lazy(() =>
  import("./pages/admin/NewsManagement").then((m) => ({ default: m.NewsManagement }))
);
const TopicsManagement = lazy(() =>
  import("./pages/admin/TopicsManagement").then((m) => ({ default: m.TopicsManagement }))
);
const TopicsAudit = lazy(() =>
  import("./pages/admin/TopicsAudit").then((m) => ({ default: m.TopicsAudit }))
);
const SourcesManagement = lazy(() =>
  import("./pages/admin/SourcesManagement").then((m) => ({ default: m.SourcesManagement }))
);
const UsersManagement = lazy(() =>
  import("./pages/admin/UsersManagement").then((m) => ({ default: m.UsersManagement }))
);
const Analytics = lazy(() =>
  import("./pages/admin/Analytics").then((m) => ({ default: m.Analytics }))
);
const InstagramAutomation = lazy(() =>
  import("./pages/admin/InstagramAutomation").then((m) => ({ default: m.InstagramAutomation }))
);
const CrawlMonitor = lazy(() =>
  import("./pages/admin/CrawlMonitor").then((m) => ({ default: m.CrawlMonitor }))
);

const queryClient = new QueryClient();

const AdminFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

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

              {/* Public SEO guides */}
              <Route path="/guia/metro-quadrado" element={<MetroQuadradoGuide />} />
              
              {/* Admin Routes — lazy-loaded */}
              <Route
                path="/admin"
                element={
                  <Suspense fallback={<AdminFallback />}>
                    <AdminLayout />
                  </Suspense>
                }
              >
                <Route index element={<Suspense fallback={<AdminFallback />}><Dashboard /></Suspense>} />
                <Route path="news" element={<Suspense fallback={<AdminFallback />}><NewsManagement /></Suspense>} />
                <Route path="topics" element={<Suspense fallback={<AdminFallback />}><TopicsManagement /></Suspense>} />
                <Route path="topics/audit" element={<Suspense fallback={<AdminFallback />}><TopicsAudit /></Suspense>} />
                <Route path="sources" element={<Suspense fallback={<AdminFallback />}><SourcesManagement /></Suspense>} />
                <Route path="users" element={<Suspense fallback={<AdminFallback />}><UsersManagement /></Suspense>} />
                <Route path="analytics" element={<Suspense fallback={<AdminFallback />}><Analytics /></Suspense>} />
                <Route path="instagram" element={<Suspense fallback={<AdminFallback />}><InstagramAutomation /></Suspense>} />
                <Route path="crawl" element={<Suspense fallback={<AdminFallback />}><CrawlMonitor /></Suspense>} />
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
