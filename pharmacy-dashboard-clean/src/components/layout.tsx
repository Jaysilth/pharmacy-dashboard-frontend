import { Link, useLocation } from "wouter";
import { Activity, Pill, Receipt, PlusCircle, LayoutDashboard, LogOut, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { logout } = useAuth();

  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Medicines", href: "/medicines", icon: Pill },
    { name: "Sales", href: "/sales", icon: Receipt },
    { name: "New Sale", href: "/sales/new", icon: PlusCircle },
  ];

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="w-64 flex-col hidden md:flex border-r bg-sidebar">
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
          <Activity className="h-6 w-6 text-primary mr-3" />
          <span className="font-semibold text-lg text-sidebar-foreground">JotessEyeSpecialist</span>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1">
          {navigation.map((item) => {
            const isActive =
              location === item.href ||
              (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent",
                )}
                data-testid={`nav-${item.name.toLowerCase().replace(" ", "-")}`}
              >
                <item.icon className="h-5 w-5 mr-3" />
                {item.name}
              </Link>
            );
          })}
        </nav>
        <div className="px-4 py-4 border-t border-sidebar-border space-y-2">
          <div className="flex items-center px-3 py-2 mb-2 rounded-md bg-muted/50 border border-border">
            <div className="bg-primary/20 p-2 rounded-full mr-3">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-foreground">Active Profile</span>
              <span className="text-xs text-muted-foreground">Admin User</span>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={logout}
            data-testid="button-logout"
          >
            <LogOut className="h-5 w-5 mr-3" />
            Sign out
          </Button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="h-16 border-b bg-background flex items-center justify-between px-6 md:hidden">
          <div className="flex items-center">
            <Activity className="h-6 w-6 text-primary mr-3" />
            <span className="font-semibold text-lg">JotessEyeSpecialist</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-primary/20 p-2 rounded-full mr-1">
              <User className="h-4 w-4 text-primary" />
            </div>
            <Button variant="ghost" size="icon" onClick={logout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}