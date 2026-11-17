import { createBrowserRouter, Navigate, RouterProvider } from "react-router";
import { AuthProvider } from "./contexts/AuthContext";
import DashboardLayout from "./layouts/DashboardLayout";
import Account from "./pages/Account";
import Admin from "./pages/Admin";
import Home from "./pages/Home";
import Lessons from "./pages/Lessons";

function NotFoundPage() {
  return (
    <section className="empty-state">
      <h1 className="page-title">Pagina non trovata</h1>
      <p className="page-description">
        La pagina richiesta non esiste o è stata spostata.
      </p>
    </section>
  );
}

const router = createBrowserRouter([
  {
    path: "/",
    Component: DashboardLayout,
    children: [
      { index: true, Component: Home },
      { path: "lessons", Component: Lessons },
      { path: "add", element: <Navigate to="/lessons?new=1" replace /> },
      { path: "account", Component: Account },
      { path: "admin", Component: Admin },
      { path: "*", Component: NotFoundPage },
    ],
  },
]);

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
