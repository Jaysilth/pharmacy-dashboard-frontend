import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ClinicalProvider } from "@/context/ClinicalContext";


import Layout from "@/components/layout";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Medicines from "@/pages/medicines";
import MedicineDetail from "@/pages/medicine-detail";
import GlassesPage from "@/pages/glasses";
import SurgeriesPage from "@/pages/surgeries";
import ClinicVisitsPage from "@/pages/clinic-visits";
import ProceduresPage from "@/pages/procedures";
import LabTestsPage from "@/pages/lab-tests";
import Sales from "@/pages/sales";
import NewSale from "@/pages/new-sale";
import SaleDetail from "@/pages/sale-detail";
import UsersPage from "@/pages/users";
import NotFound from "@/pages/not-found";
import ConsumablesPage from "@/pages/consumables";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function ProtectedRoutes() {
  const { isAuthenticated, isSuperAdmin } = useAuth();
  if (!isAuthenticated) return <Redirect to="/login" />;
  return (
    <Layout>
      <Switch>
        <Route path="/"               component={Dashboard} />
        <Route path="/medicines"      component={Medicines} />
        <Route path="/medicines/:id"  component={MedicineDetail} />
        <Route path="/glasses"        component={GlassesPage} />
        <Route path="/surgeries"      component={SurgeriesPage} />
        <Route path="/consumables" component={ConsumablesPage} />
        <Route path="/clinic-visits"  component={ClinicVisitsPage} />
        <Route path="/procedures"     component={ProceduresPage} />
        <Route path="/lab-tests"      component={LabTestsPage} />
        <Route path="/sales/new"      component={NewSale} />
        <Route path="/sales/:id"      component={SaleDetail} />
        <Route path="/sales"          component={Sales} />
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
      <Route><ProtectedRoutes /></Route>
    </Switch>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ClinicalProvider>
            <TooltipProvider>
              <WouterRouter>
                <Router />
              </WouterRouter>
              <Toaster />
            </TooltipProvider>
          </ClinicalProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}