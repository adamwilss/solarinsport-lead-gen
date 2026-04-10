import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import DashboardPage from "./pages/DashboardPage";
import LeadListPage from "./pages/LeadListPage";
import LeadDetailPage from "./pages/LeadDetailPage";
import OutreachQueuePage from "./pages/OutreachQueuePage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30 seconds
      refetchOnWindowFocus: false,
    },
  },
});

function Layout({ children }: { children: React.ReactNode }) {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
      isActive
        ? "bg-blue-600 text-white shadow-sm"
        : "text-gray-300 hover:bg-gray-700 hover:text-white"
    }`;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-gray-900 text-white px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-lg">
                ☀️
              </div>
              <span className="font-bold text-lg">Solar & Sport</span>
            </div>
            <div className="hidden md:flex gap-1">
              <NavLink to="/" className={linkClass}>
                Dashboard
              </NavLink>
              <NavLink to="/leads" className={linkClass}>
                Leads
              </NavLink>
              <NavLink to="/outreach" className={linkClass}>
                Outreach
              </NavLink>
            </div>
          </div>
          <div className="text-sm text-gray-400">
            Stadium Outreach Engine
          </div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <div className="md:hidden bg-gray-800 border-t border-gray-700 px-4 py-2 flex gap-2 overflow-x-auto">
        <NavLink to="/" className={linkClass}>
          Dashboard
        </NavLink>
        <NavLink to="/leads" className={linkClass}>
          Leads
        </NavLink>
        <NavLink to="/outreach" className={linkClass}>
          Outreach
        </NavLink>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6">{children}</main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12 py-6">
        <div className="max-w-7xl mx-auto px-6 text-center text-sm text-gray-500">
          Solar & Sport Stadium Outreach Engine • Built with FastAPI + React
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/leads" element={<LeadListPage />} />
            <Route path="/leads/:id" element={<LeadDetailPage />} />
            <Route path="/outreach" element={<OutreachQueuePage />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
