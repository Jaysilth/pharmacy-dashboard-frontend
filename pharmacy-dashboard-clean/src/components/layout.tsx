import { Link, useLocation } from "wouter";
import {
  Activity, Pill, Receipt, PlusCircle,
  LayoutDashboard, LogOut, User, Users, Glasses, Stethoscope,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { logout, currentUser, isSuperAdmin } = useAuth();

  const baseNav = [
    { name: "Dashboard", href: "/",           icon: LayoutDashboard },
    { name: "Medicines", href: "/medicines",   icon: Pill },
    { name: "Glasses",   href: "/glasses",     icon: Glasses },
    { name: "Surgeries", href: "/surgeries",   icon: Stethoscope },
    { name: "Sales",     href: "/sales",       icon: Receipt },
    { name: "New Sale",  href: "/sales/new",   icon: PlusCircle },
  ];

  const navigation = isSuperAdmin
    ? [...baseNav, { name: "Users", href: "/users", icon: Users }]
    : baseNav;

  const displayName = currentUser?.username ?? "Loading…";
  const displayRole = isSuperAdmin ? "Super Admin" : "Admin";

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="w-64 flex-col hidden md:flex border-r bg-sidebar">
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
          <Activity className="h-6 w-6 text-primary mr-3" />
          <span className="font-semibold text-lg text-sidebar-foreground">JotessEyeSpecialist</span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.name} href={item.href}
                className={cn("flex items-center px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                  isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent")}
                data-testid={`nav-${item.name.toLowerCase().replace(/\s/g, "-")}`}>
                <item.icon className="h-5 w-5 mr-3" />{item.name}
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-4 border-t border-sidebar-border space-y-2">
          <div className="flex items-center px-3 py-2 rounded-md bg-muted/50 border border-border">
            <div className="bg-primary/20 p-2 rounded-full mr-3 flex-shrink-0">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium text-foreground truncate">{displayName}</span>
              <span className="text-xs text-muted-foreground">{displayRole}</span>
            </div>
          </div>
          <Button variant="ghost" className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent" onClick={logout} data-testid="button-logout">
            <LogOut className="h-5 w-5 mr-3" />Sign out
          </Button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b bg-background flex items-center justify-between px-4 md:hidden sticky top-0 z-40">
          <div className="flex items-center">
            <Activity className="h-5 w-5 text-primary mr-2" />
            <span className="font-semibold text-base">JotessEyeSpecialist</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="bg-primary/20 p-1.5 rounded-full"><User className="h-4 w-4 text-primary" /></div>
            <Button variant="ghost" size="icon" onClick={logout}><LogOut className="h-4 w-4" /></Button>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8 pb-24 md:pb-8">
          {children}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border md:hidden">
        <div className="flex items-center justify-around h-16 overflow-x-auto">
          {baseNav.slice(0, 6).map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.name} href={item.href}
                className={cn("flex flex-col items-center justify-center flex-1 h-full gap-0.5 text-xs font-medium transition-colors min-w-0 px-1",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
                <item.icon className="h-5 w-5 flex-shrink-0" />
                <span className="text-[9px] truncate">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
