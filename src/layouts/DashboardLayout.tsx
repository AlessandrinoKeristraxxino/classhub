import { useState } from "react";
import { Menu, Shield } from "lucide-react";
import { Link, Outlet } from "react-router";
import Sidebar from "../components/Sidebar";
import { useAuth } from "../contexts/AuthContext";
import { isClassHubAdmin } from "../lib/authorization";

function DashboardLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { session } = useAuth();

  return (
    <div className="dashboard-layout">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="main-area">
        <header className="dashboard-header">
          <button
            className="sidebar-toggle"
            type="button"
            aria-label="Apri menu"
            aria-expanded={isSidebarOpen}
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu size={21} />
          </button>
          <span className="dashboard-header-title">Area studente</span>
          {isClassHubAdmin(session?.user.email) && (
            <Link className="dashboard-admin-link" to="/admin">
              <Shield size={16} aria-hidden="true" />
              Amministrazione
            </Link>
          )}
        </header>

        <main className="dashboard-content">
          <Outlet />
        </main>
        <footer className="dashboard-footer">
          <span>© {new Date().getFullYear()} ClassHub</span>
          <span>Il tuo spazio per imparare e condividere.</span>
        </footer>
      </div>
    </div>
  );
}

export default DashboardLayout;