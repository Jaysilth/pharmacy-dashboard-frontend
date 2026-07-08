import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Activity, LayoutDashboard, Pill, Glasses, Stethoscope,
  Calendar, FileText, FlaskConical, Receipt, PlusCircle,
  Users, LogOut, User, Menu, X, Sun, Moon,Package,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { Button } from "@/components/ui/button";

// ── Navigation definition ─────────────────────────────────────────────────────

const NAV_GROUPS = [
  {
    label: "",
    items: [
      { name: "Dashboard", href: "/",             icon: LayoutDashboard },
    ],
  },
 {
  label: "Inventory",
  items: [
    { name: "Medicines",    href: "/medicines",    icon: Pill },
    { name: "Glasses",      href: "/glasses",      icon: Glasses },
    { name: "Surgeries",    href: "/surgeries",    icon: Stethoscope },
    { name: "Consumables",  href: "/consumables",  icon: Package },
  ],
},
  {
    label: "Clinical",
    items: [
      { name: "Visits",      href: "/clinic-visits", icon: Calendar },
      { name: "Procedures",  href: "/procedures",    icon: FileText },
      { name: "Lab Tests",   href: "/lab-tests",     icon: FlaskConical },
    ],
  },
  {
    label: "Sales",
    items: [
      { name: "Sales Log",  href: "/sales",       icon: Receipt },
      { name: "New Sale",   href: "/sales/new",   icon: PlusCircle },
    ],
  },
];

const ADMIN_ITEM = { name: "Users", href: "/users", icon: Users };

// ── Nav link atom ─────────────────────────────────────────────────────────────

function NavLink({
  item,
  onClick,
}: {
  item: { name: string; href: string; icon: React.ElementType };
  onClick?: () => void;
}) {
  const [location] = useLocation();
  const isActive =
    location === item.href ||
    (item.href !== "/" && location.startsWith(item.href));
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium",
        "transition-all duration-150 select-none",
        isActive
       ? "sidebar-active font-semibold"
      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
      )}
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      {item.name}
    </Link>
  );
}

// ── Nav body (shared between sidebar and drawer) ──────────────────────────────

function NavBody({
  isSuperAdmin,
  onItemClick,
}: {
  isSuperAdmin: boolean;
  onItemClick?: () => void;
}) {
  const groups = isSuperAdmin
    ? [...NAV_GROUPS, { label: "Admin", items: [ADMIN_ITEM] }]
    : NAV_GROUPS;

  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
      {groups.map((group) => (
        <div key={group.label}>
          {group.label && (
            <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/40">
              {group.label}
            </p>
          )}
          <div className="space-y-0.5">
            {group.items.map((item) => (
              <NavLink key={item.href} item={item} onClick={onItemClick} />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

// ── Theme toggle button ───────────────────────────────────────────────────────

function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { isDark, toggleTheme } = useTheme();

  if (compact) {
    return (
      <button
        onClick={toggleTheme}
        className="p-2 rounded-xl transition-all duration-200 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent active:scale-95"
        aria-label="Toggle theme"
      >
        {isDark ? (
          <Sun className="h-4 w-4 flex-shrink-0 text-amber-400" />
        ) : (
          <Moon className="h-4 w-4 flex-shrink-0" />
        )}
      </button>
    );
  }

  // Secondary control — deliberately styled like the profile widget, not a nav link.
  return (
    <button
      onClick={toggleTheme}
      className="flex items-center gap-2.5 w-full rounded-2xl border border-sidebar-border/70 bg-sidebar-accent/40 px-3.5 py-2.5 text-xs font-medium text-sidebar-foreground/70 transition-all duration-200 hover:bg-sidebar-accent hover:text-sidebar-foreground active:scale-[0.98]"
      aria-label="Toggle theme"
    >
      {isDark ? (
        <Sun className="h-4 w-4 flex-shrink-0 text-amber-400" />
      ) : (
        <Moon className="h-4 w-4 flex-shrink-0" />
      )}
      <span>{isDark ? "Light mode" : "Dark mode"}</span>
    </button>
  );
}

// ── Main Layout ───────────────────────────────────────────────────────────────

import { ReactNode } from "react";

export default function Layout({ children }: { children?: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { logout, currentUser, isSuperAdmin } = useAuth();
  const [location] = useLocation();

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [location]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  const displayName = currentUser?.username ?? "Loading…";
  const displayRole = isSuperAdmin ? "Super Admin" : "Admin";

  // ── Profile + logout section ──────────────────────────────────────────────

  const ProfileSection = ({ onLogout }: { onLogout: () => void }) => (
    <div className="px-3 pb-4 space-y-2.5">
      {/* Profile — its own floating widget */}
      <div className="flex items-center gap-3 rounded-2xl border border-sidebar-border/70 bg-sidebar-accent/60 px-3.5 py-3">
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center">
          <User className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0 space-y-0.5">
          <p className="text-xs font-semibold text-sidebar-foreground truncate">
            {displayName}
          </p>
          <p className="text-[10px] text-sidebar-foreground/50">{displayRole}</p>
        </div>
      </div>

      <ThemeToggle />

      <button
        type="button"
        onClick={onLogout}
        className="flex items-center gap-2 w-full px-3.5 py-2 rounded-xl text-xs font-medium
          text-sidebar-foreground/70 hover:text-destructive hover:bg-destructive/10
          transition-all duration-150"
        data-testid="button-logout"
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </button>
    </div>
  );

  return (
    <div className="h-screen overflow-hidden flex gap-0 md:gap-4 p-0 md:p-4 dashboard-bg">

      {/* ══════════════════════════════════════════
          DESKTOP SIDEBAR (hidden on mobile) — floating glass panel
      ══════════════════════════════════════════ */}
      <aside className="hidden md:flex w-[272px] flex-col flex-shrink-0 glass-panel relative overflow-hidden rounded-[28px]">

        {/* Blueprint grid overlay (decorative)
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        /> */}

        {/* Logo */}
        <div className="relative flex items-center gap-2.5 h-16 px-5 border-b border-sidebar-border/70 flex-shrink-0">
          <Activity className="h-5 w-5 text-primary flex-shrink-0" />
          <div className="leading-none">
            <span className="text-sm font-black tracking-widest uppercase text-sidebar-foreground">
              JOTESS
            </span>
            <span className="block text-[9px] font-semibold tracking-[0.25em] uppercase text-primary/70 mt-0.5">
              EYE SPECIALIST
            </span>
          </div>
        </div>

        {/* Navigation */}
        <NavBody isSuperAdmin={isSuperAdmin} />

        {/* Profile + theme toggle */}
        <div className="border-t border-sidebar-border">
          <ProfileSection onLogout={logout} />
        </div>
      </aside>

      {/* ══════════════════════════════════════════
          MOBILE SLIDE-IN DRAWER
      ══════════════════════════════════════════ */}

      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 md:hidden",
          "bg-black/60 backdrop-blur-sm",
          "transition-opacity duration-300",
          drawerOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
        onClick={() => setDrawerOpen(false)}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <aside className={cn("fixed inset-y-0 left-0 z-50 w-[280px] flex flex-col md:hidden",
          "glass-panel rounded-none",
          "transition-transform duration-300 ease-in-out",
          drawerOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-sidebar-border/70 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <Activity className="h-5 w-5 text-primary" />
            <div className="leading-none">
              <span className="text-sm font-black tracking-widest uppercase text-sidebar-foreground">
                JOTESS
              </span>
              <span className="block text-[9px] font-semibold tracking-[0.25em] uppercase text-primary/70 mt-0.5">
                EYE SPECIALIST
              </span>
            </div>
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            className="p-1.5 rounded-lg text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Drawer nav */}
        <NavBody
          isSuperAdmin={isSuperAdmin}
          onItemClick={() => setDrawerOpen(false)}
        />

        {/* Drawer profile */}
        <div className="border-t border-sidebar-border">
          <ProfileSection onLogout={() => { logout(); setDrawerOpen(false); }} />
        </div>
      </aside>

      {/* ══════════════════════════════════════════
          MAIN CONTENT AREA — floating white workspace (Layer 3)
      ══════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col min-w-0 dashboard-workspace md:rounded-[28px] md:overflow-hidden">

        {/* ── Mobile top header ── */}
        <header
          className={cn(
            "md:hidden flex items-center justify-between",
            "h-14 px-4 flex-shrink-0",
            "bg-sidebar border-b border-sidebar-border",
          )}
        >
          <button
            onClick={() => setDrawerOpen(true)}
            className="p-2 rounded-xl text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <span className="text-sm font-black tracking-widest uppercase text-sidebar-foreground">
              JOTESS
            </span>
          </div>

          <ThemeToggle compact />
        </header>

        {/* ── Page content ── */}
        <main className="flex-1 overflow-auto">
          <div className="p-4 sm:p-6 lg:p-9 max-w-[1400px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}