import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import DashboardPage from "./pages/DashboardPage";
import LeadListPage from "./pages/LeadListPage";
import LeadDetailPage from "./pages/LeadDetailPage";
import OutreachQueuePage from "./pages/OutreachQueuePage";

const queryClient = new QueryClient();

function Layout({ children }: { children: React.ReactNode }) {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 rounded text-sm font-medium ${isActive ? "bg-blue-700 text-white" : "text-gray-300 hover:bg-gray-700"}`;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-gray-900 text-white px-6 py-3 flex gap-2 items-center">
        <span className="font-bold text-lg mr-6">Solar & Sport</span>
        <NavLink to="/" className={linkClass}>Dashboard</NavLink>
        <NavLink to="/leads" className={linkClass}>Leads</NavLink>
        <NavLink to="/outreach" className={linkClass}>Outreach Queue</NavLink>
      </nav>
      <main className="p-6 max-w-7xl mx-auto">{children}</main>
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
