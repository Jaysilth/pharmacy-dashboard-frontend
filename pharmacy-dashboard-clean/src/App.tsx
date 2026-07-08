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

// ── Route-level guards ──────────────────────────────────────────────────────
// Each of these used to be passed as inline JSX `children` to <Route>, e.g.
//   <Route path="/login">{isAuthenticated ? <Redirect .../> : <Login />}</Route>
// That shape hits a stricter overload in current @types/react (children vs.
// component prop) and fails `tsc` even though it renders fine in the browser.
// Passing them via `component={...}` instead sidesteps the overload entirely
// and is the pattern wouter's own docs use for conditional routes.

function LoginRoute() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Redirect to="/" /> : <Login />;
}

function UsersRoute() {
  const { isSuperAdmin } = useAuth();
  return isSuperAdmin ? <UsersPage /> : <Redirect to="/" />;
}

function ProtectedRoutes() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Redirect to="/login" />;
  return (
    <Layout>
      <Switch>
  <>
    <Route path="/" component={Dashboard} />
    <Route path="/medicines" component={Medicines} />
    <Route path="/medicines/:id" component={MedicineDetail} />
    <Route path="/glasses" component={GlassesPage} />
    <Route path="/surgeries" component={SurgeriesPage} />
    <Route path="/consumables" component={ConsumablesPage} />
    <Route path="/clinic-visits" component={ClinicVisitsPage} />
    <Route path="/procedures" component={ProceduresPage} />
    <Route path="/lab-tests" component={LabTestsPage} />
    <Route path="/sales/new" component={NewSale} />
    <Route path="/sales/:id" component={SaleDetail} />
    <Route path="/sales" component={Sales} />
    <Route path="/users" component={UsersRoute} />
    <Route component={NotFound} />
  </>
</Switch>
    </Layout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginRoute} />
      <Route component={ProtectedRoutes} />
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
