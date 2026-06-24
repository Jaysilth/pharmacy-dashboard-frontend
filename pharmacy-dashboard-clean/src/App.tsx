import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/context/AuthContext";

import Layout from "@/components/layout";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Medicines from "@/pages/medicines";
import MedicineDetail from "@/pages/medicine-detail";
import Sales from "@/pages/sales";
import NewSale from "@/pages/new-sale";
import UsersPage from "@/pages/users";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

function ProtectedRoutes() {
  const { isAuthenticated, isSuperAdmin } = useAuth();

  if (!isAuthenticated) return <Redirect to="/login" />;

  return (
    <Layout>
      <Switch>
        <Route path="/"                component={Dashboard} />
        <Route path="/medicines"       component={Medicines} />
        <Route path="/medicines/:id"   component={MedicineDetail} />
        <Route path="/sales"           component={Sales} />
        <Route path="/sales/new"       component={NewSale} />
        <Route path="/users">
          {isSuperAdmin ? <UsersPage /> : <Redirect to="/" />}
        </Route>
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function Router() {
  const { isAuthenticated } = useAuth();
  return (
    <Switch>
      <Route path="/login">
        {isAuthenticated ? <Redirect to="/" /> : <Login />}
      </Route>
      <Route>
        <ProtectedRoutes />
      </Route>
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
