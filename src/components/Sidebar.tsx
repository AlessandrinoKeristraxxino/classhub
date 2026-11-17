import { useEffect, useState } from "react";
import {
  BookOpen,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Plus,
  Shield,
  UserRound,
  X,
} from "lucide-react";
import { NavLink } from "react-router";
import { isClassHubAdmin } from "../lib/authorization";
import { fetchProfile, getProfileAvatarUrl } from "../lib/profile";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import type { Profile } from "../types/profile";

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

const navigationItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Lezioni", href: "/lessons", icon: BookOpen },
  { label: "Nuova lezione", href: "/lessons?new=1", icon: Plus },
  { label: "Account", href: "/account", icon: UserRound },
];

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { session } = useAuth();
  const email = session?.user.email;
  const [profile, setProfile] = useState<Profile | null>(null);
  const initials = (profile?.display_name || email)?.slice(0, 1).toUpperCase() ?? "S";
  const items = isClassHubAdmin(email)
    ? [...navigationItems, { label: "Amministrazione", href: "/admin", icon: Shield }]
    : navigationItems;

  useEffect(() => {
    if (!session?.user.id) {
      return;
    }

    let isMounted = true;
    void fetchProfile(session.user.id)
      .then((result) => {
        if (isMounted) {
          setProfile(result);
        }
      })
      .catch((error: unknown) => {
        console.error("Impossibile caricare il profilo:", error);
      });

    return () => {
      isMounted = false;
    };
  }, [session?.user.id]);

  async function handleSignOut() {
    if (!supabase) {
      return;
    }
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
    } catch (error) {
      console.error("Impossibile uscire dall'account:", error);
    }
  }

  return (
    <>
      {isOpen && (
        <button
          className="sidebar-backdrop"
          type="button"
          aria-label="Chiudi menu"
          onClick={onClose}
        />
      )}

      <aside className={`sidebar${isOpen ? " sidebar-open" : ""}`}>
        <div className="sidebar-brand">
          <span className="sidebar-brand-icon" aria-hidden="true">
            <GraduationCap size={22} />
          </span>
          <span>ClassHub</span>
          <button
            className="sidebar-close"
            type="button"
            aria-label="Chiudi menu"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        <p className="sidebar-section-label">MENU</p>
        <nav className="sidebar-navigation" aria-label="Navigazione principale">
          {items.map(({ label, href, icon: Icon }) => {
            return (
              <NavLink
                key={href}
                to={href}
                end={href === "/"}
                className={({ isActive }) =>
                  `sidebar-link${isActive ? " sidebar-link-active" : ""}`
                }
                onClick={onClose}
              >
                <Icon size={19} strokeWidth={1.9} aria-hidden="true" />
                <span>{label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-account">
          <div className="sidebar-avatar" aria-hidden="true">
            {session && getProfileAvatarUrl(profile?.avatar_path ?? null) ? (
              <img
                src={getProfileAvatarUrl(profile?.avatar_path ?? null) ?? ""}
                alt=""
              />
            ) : (
              initials
            )}
          </div>
          <div className="sidebar-account-copy">
            <span className="sidebar-account-name">
              {profile?.display_name || email || "Studente"}
            </span>
            <span className="sidebar-account-role">
              {isClassHubAdmin(email)
                ? "Amministratore"
                : session
                  ? "Account personale"
                  : "Area personale"}
            </span>
          </div>
          {session && (
            <button
              className="sidebar-sign-out"
              type="button"
              aria-label="Esci dall'account"
              title="Esci"
              onClick={() => void handleSignOut()}
            >
              <LogOut size={17} aria-hidden="true" />
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
