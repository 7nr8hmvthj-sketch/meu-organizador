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
import { 
  LayoutDashboard, 
  Calendar, 
  CalendarDays, 
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
  const allNavItems = [
    { path: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["admin"] },
    { path: "/hoje", label: "Hoje", icon: SunIcon, roles: ["admin"] },
    { path: "/eventos", label: "Escala", icon: Calendar, roles: ["admin"] },
    { path: "/calendario", label: "Calendário", icon: CalendarDays, roles: ["admin"] },
    { path: "/agenda", label: "Calendário", icon: CalendarDays, roles: ["trainer"] },
    { path: "/diario", label: "Diário", icon: Book, roles: ["admin"] },
    { path: "/financeiro", label: "Financeiro", icon: DollarSign, roles: ["admin"] },
    { path: "/medicamentos", label: "Medicamentos", icon: Pill, roles: ["admin"] },
  ];

  const navItems = allNavItems.filter(item => 
    !item.roles || item.roles.includes(userRole || "")
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-card border-r h-screen fixed left-0 top-0">
        <div className="p-6 border-b">
          <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
            Meu Organizador
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
            Meu Organizador
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
  const [, setLocation] = useLocation();

  // Redirect trainers to weekly calendar page
  useEffect(() => {
    if (userRole === "trainer") {
      setLocation("/agenda");
    }
  }, [userRole, setLocation]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation userRole={userRole} username={username} />
      <main className="lg:ml-64 pt-16 lg:pt-0 pb-20 lg:pb-0">
        <div className="container py-6">
          <Switch>
            {userRole === "admin" && (
              <>
                <Route path="/" component={Dashboard} />
                <Route path="/hoje" component={Today} />
                <Route path="/eventos" component={Events} />
                <Route path="/financeiro" component={Finance} />
                <Route path="/medicamentos" component={Medications} />
                <Route path="/diario" component={DiaryPage} />
              </>
            )}
            <Route path="/calendario" component={CalendarPage} />
            <Route path="/agenda" component={WeeklyCalendarPage} />
            <Route>
              <div className="text-center py-20">
                <h1 className="text-2xl font-bold">Página não encontrada</h1>
                <Link
                  href={userRole === "trainer" ? "/agenda" : "/"}
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
