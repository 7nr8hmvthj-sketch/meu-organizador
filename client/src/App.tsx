import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch, useLocation, Link } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import { trpc } from "@/lib/trpc";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Events from "./pages/Events";
import CalendarPage from "./pages/CalendarPage";
import WeeklyCalendarPage from "./pages/WeeklyCalendarPage";
import Finance from "./pages/Finance";
import Medications from "./pages/Medications";
import Today from "./pages/Today";
import DiaryPage from "./pages/DiaryPage";
import { PrivacyPolicyPage, SupportPage } from "./pages/PublicLegalPages";

import { 
  LayoutDashboard, 
  Calendar, 
  CalendarDays,
  CalendarRange,
  DollarSign, 
  Pill, 
  Sun as SunIcon,
  Moon,
  Sun,
  LogOut,
  Menu,
  X,
  Book
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface NavigationProps {
  userRole?: string;
  username?: string;
}

// Verifica se o usuário tem acesso restrito (trainer ou Paula)
function isRestrictedUser(userRole?: string, username?: string): boolean {
  return userRole === "trainer" || username === "PAULA";
}

function Navigation({ userRole, username }: NavigationProps) {
  const [location] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const utils = trpc.useUtils();

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      window.location.reload();
    },
  });

  // Define navigation items based on user role
  // excludeUsernames: lista de usernames que NÃO devem ver este item
  const allNavItems = [
    { path: "/", label: "Mensal", icon: CalendarDays, roles: ["admin", "user"], excludeUsernames: ["PAULA"] },
    { path: "/agenda", label: "Semanal", icon: CalendarRange, roles: ["admin", "trainer", "user"] },
    { path: "/eventos", label: "Escala", icon: Calendar, roles: ["admin"], excludeUsernames: ["PAULA"] },
    { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin"], excludeUsernames: ["PAULA"] },
    { path: "/diario", label: "Diário", icon: Book, roles: ["admin"], excludeUsernames: ["PAULA"] },
    { path: "/financeiro", label: "Financeiro", icon: DollarSign, roles: ["admin"], excludeUsernames: ["PAULA"] },
    { path: "/medicamentos", label: "Medicamentos", icon: Pill, roles: ["admin"], excludeUsernames: ["PAULA"] },
  ];

  const navItems = allNavItems.filter(item => {
    // Verificar se o role do usuário está na lista de roles permitidos
    if (!item.roles.includes(userRole || "")) return false;
    // Verificar se o username está na lista de exclusão
    if (item.excludeUsernames?.includes(username || "")) return false;
    return true;
  });

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-card border-r h-screen fixed left-0 top-0">
        <div className="p-6 border-b">
          <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
            Meus Plantões
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {username ? `Olá, ${username}` : "2026"}
          </p>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t space-y-2">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3"
            onClick={toggleTheme}
          >
            {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            <span>{theme === "dark" ? "Modo Claro" : "Modo Escuro"}</span>
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
            onClick={() => logoutMutation.mutate()}
          >
            <LogOut className="w-5 h-5" />
            <span>Sair</span>
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-card border-b z-50 flex items-center justify-between px-4">
        <div>
          <h1 className="text-lg font-bold bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
            Meus Plantões
          </h1>
          {username && (
            <p className="text-[10px] text-muted-foreground">Olá, {username}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggleTheme}>
            {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 top-16 bg-background z-40">
          <nav className="p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.path;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent"
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 mt-4"
              onClick={() => logoutMutation.mutate()}
            >
              <LogOut className="w-5 h-5" />
              <span>Sair</span>
            </Button>
          </nav>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-card border-t z-50 flex items-center justify-around px-2">
        {navItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}

interface AuthenticatedAppProps {
  userRole?: string;
  username?: string;
}

function AuthenticatedApp({ userRole, username }: AuthenticatedAppProps) {
  const [location, setLocation] = useLocation();

  // Redirecionar trainers e Paula para /agenda como home
  useEffect(() => {
    if (isRestrictedUser(userRole, username)) {
      // Bloquear acesso a rotas sensíveis (exceto /)
      const restrictedPaths = ["/eventos", "/dashboard", "/financeiro", "/medicamentos", "/diario"];
      if (restrictedPaths.includes(location)) {
        setLocation("/agenda");
      }
    }
  }, [userRole, username, location, setLocation]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation userRole={userRole} username={username} />
      <main className="lg:ml-64 pt-16 lg:pt-0 pb-20 lg:pb-0">
        <div className="w-full px-4 py-4 lg:px-8 max-w-[1920px] mx-auto">
          <Switch>
            {/* Rota do calendário mensal - acessível a todos */}
            <Route path="/" component={CalendarPage} />
            {/* Rotas exclusivas para admin completo (não Paula) */}
            {userRole === "admin" && username !== "PAULA" && (
              <>
                <Route path="/eventos" component={Events} />
                <Route path="/dashboard" component={Dashboard} />
                <Route path="/financeiro" component={Finance} />
                <Route path="/medicamentos" component={Medications} />
                <Route path="/diario" component={DiaryPage} />
              </>
            )}
            {/* Rota do calendário semanal - acessível a todos */}
            <Route path="/agenda" component={WeeklyCalendarPage} />
            {/* Fallback */}
            <Route>
              <div className="text-center py-20">
                <h1 className="text-2xl font-bold">Página não encontrada</h1>
                <Link
                  href={isRestrictedUser(userRole, username) ? "/agenda" : "/"}
                  className="text-primary hover:underline mt-4 inline-block"
                >
                  Voltar ao início
                </Link>
              </div>
            </Route>
          </Switch>
        </div>
      </main>
    </div>
  );
}

function AppContent() {
  const [location] = useLocation();
  const isPublicRoute = location === "/privacy" || location === "/support";
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userInfo, setUserInfo] = useState<any>(null);
  const { data: authData, isLoading, refetch } = trpc.auth.checkSimpleAuth.useQuery();

  useEffect(() => {
    if (!isLoading && authData) {
      setIsAuthenticated(authData.isAuthenticated);
      setUserInfo(authData.user);
    }
  }, [authData, isLoading]);

  const handleLoginSuccess = async () => {
    // Refetch para obter os dados atualizados do usuário
    const result = await refetch();
    if (result.data) {
      setIsAuthenticated(result.data.isAuthenticated);
      setUserInfo(result.data.user);
    }
  };

  if (isPublicRoute) {
    return (
      <Switch>
        <Route path="/privacy" component={PrivacyPolicyPage} />
        <Route path="/support" component={SupportPage} />
      </Switch>
    );
  }

  if (isLoading || isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return <AuthenticatedApp userRole={userInfo?.role} username={userInfo?.username} />;
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable>
        <TooltipProvider>
          <Toaster />
          <AppContent />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
