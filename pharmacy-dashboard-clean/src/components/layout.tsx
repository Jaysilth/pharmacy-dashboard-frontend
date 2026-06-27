import { Link, useLocation } from "wouter";
import {
  Activity, Pill, Receipt, PlusCircle, LayoutDashboard,
  LogOut, User, Users, Glasses, Stethoscope,
  Calendar, FileText, FlaskConical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { logout, currentUser, isSuperAdmin } = useAuth();

  const navigation = [
    { name: "Dashboard",   href: "/",              icon: LayoutDashboard, group: "" },
    { name: "Medicines",   href: "/medicines",     icon: Pill,            group: "Inventory" },
    { name: "Glasses",     href: "/glasses",       icon: Glasses,         group: "Inventory" },
    { name: "Surgeries",   href: "/surgeries",     icon: Stethoscope,     group: "Inventory" },
    { name: "Visits",      href: "/clinic-visits", icon: Calendar,        group: "Clinical" },
    { name: "Procedures",  href: "/procedures",    icon: FileText,        group: "Clinical" },
    { name: "Lab Tests",   href: "/lab-tests",     icon: FlaskConical,    group: "Clinical" },
    { name: "Sales",       href: "/sales",         icon: Receipt,         group: "Sales" },
    { name: "New Sale",    href: "/sales/new",     icon: PlusCircle,      group: "Sales" },
    ...(isSuperAdmin ? [{ name: "Users", href: "/users", icon: Users, group: "Admin" }] : []),
  ];

  const groups = ["", "Inventory", "Clinical", "Sales", ...(isSuperAdmin ? ["Admin"] : [])];

  const displayName = currentUser?.username ?? "Loading…";
  const displayRole = isSuperAdmin ? "Super Admin" : "Admin";

  const NavLink = ({ item }: { item: typeof navigation[0] }) => {
    const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
    return (
      <Link href={item.href}
        className={cn("flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors",
          isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent")}
        data-testid={`nav-${item.name.toLowerCase().replace(/\s/g, "-")}`}>
        <item.icon className="h-4 w-4 mr-3 flex-shrink-0" />{item.name}
      </Link>
    );
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="w-60 flex-col hidden md:flex border-r bg-sidebar overflow-y-auto">
        <div className="h-16 flex items-center px-5 border-b border-sidebar-border flex-shrink-0">
          <Activity className="h-5 w-5 text-primary mr-2 flex-shrink-0" />
          <span className="font-semibold text-sm text-sidebar-foreground leading-tight">JotessEyeSpecialist</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-4">
          {groups.map(group => {
            const items = navigation.filter(n => n.group === group);
            if (items.length === 0) return null;
            return (
              <div key={group}>
                {group && <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold px-3 mb-1">{group}</p>}
                <div className="space-y-0.5">{items.map(item => <NavLink key={item.href} item={item} />)}</div>
              </div>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-sidebar-border flex-shrink-0 space-y-2">
          <div className="flex items-center px-3 py-2 rounded-md bg-muted/50 border border-border">
            <div className="bg-primary/20 p-1.5 rounded-full mr-2.5 flex-shrink-0"><User className="h-3.5 w-3.5 text-primary" /></div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-medium text-foreground truncate">{displayName}</span>
              <span className="text-[10px] text-muted-foreground">{displayRole}</span>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent" onClick={logout} data-testid="button-logout">
            <LogOut className="h-4 w-4 mr-2" />Sign out
          </Button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b bg-background flex items-center justify-between px-4 md:hidden sticky top-0 z-40">
          <div className="flex items-center">
            <Activity className="h-5 w-5 text-primary mr-2" />
            <span className="font-semibold text-sm">JotessEyeSpecialist</span>
          </div>
          <Button variant="ghost" size="icon" onClick={logout}><LogOut className="h-4 w-4" /></Button>
        </header>
        <div className="flex-1 overflow-auto p-4 md:p-6">{children}</div>
      </main>
    </div>
  );
}