import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Calendar, Lock, User, UserPlus, KeyRound } from "lucide-react";
import { toast } from "sonner";

interface LoginProps {
  onLoginSuccess: () => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const loginMutation = trpc.auth.simpleLogin.useMutation({
    onSuccess: async (data) => {
      if (data.success) {
        toast.success("Login realizado com sucesso!");
        await new Promise(resolve => setTimeout(resolve, 150));
        onLoginSuccess();
      } else {
        toast.error(data.error || "Credenciais inválidas");
        setIsLoading(false);
      }
    },
    onError: () => {
      toast.error("Erro ao fazer login");
      setIsLoading(false);
    },
  });

  const registerMutation = trpc.auth.registerWithCode.useMutation({
    onSuccess: async (data) => {
      if (data.success) {
        toast.success(`Conta criada com sucesso! Bem-vindo, ${data.username}`);
        await new Promise(resolve => setTimeout(resolve, 150));
        onLoginSuccess();
      }
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao registrar");
      setIsLoading(false);
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    loginMutation.mutate({ username, password });
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) {
      toast.error("Código de convite é obrigatório");
      return;
    }
    setIsLoading(true);
    registerMutation.mutate({ username, password, inviteCode: inviteCode.trim() });
  };

  const resetFields = () => {
    setUsername("");
    setPassword("");
    setInviteCode("");
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 p-4">
      <div className="w-full max-w-md">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30 mb-4">
            <Calendar className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Meus Plantões</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Organize seus plantões, agenda e rotina</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex mb-4 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
          <button
            type="button"
            onClick={() => { setMode("login"); resetFields(); }}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
              mode === "login"
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => { setMode("register"); resetFields(); }}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
              mode === "register"
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
            }`}
          >
            Registrar
          </button>
        </div>

        {/* Login Card */}
        <Card className="border-0 shadow-xl shadow-slate-200/50 dark:shadow-none dark:bg-slate-800/50 backdrop-blur">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl text-center">
              {mode === "login" ? "Entrar" : "Criar Conta"}
            </CardTitle>
            <CardDescription className="text-center">
              {mode === "login"
                ? "Digite suas credenciais para acessar"
                : "Use um código de convite para se registrar"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={mode === "login" ? handleLogin : handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium">
                  Usuário
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="Digite seu usuário"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10 h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder={mode === "login" ? "Digite sua senha" : "Crie uma senha (mín. 3 caracteres)"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                    required
                    minLength={mode === "register" ? 3 : undefined}
                  />
                </div>
              </div>

              {mode === "register" && (
                <div className="space-y-2">
                  <Label htmlFor="inviteCode" className="text-sm font-medium">
                    Código de Convite
                  </Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="inviteCode"
                      type="text"
                      placeholder="Digite o código de convite"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      className="pl-10 h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                      required
                    />
                  </div>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    Solicite um código ao administrador para criar sua conta
                  </p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-11 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium shadow-lg shadow-indigo-500/30"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {mode === "login" ? "Entrando..." : "Registrando..."}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    {mode === "login" ? (
                      <>Entrar</>
                    ) : (
                      <><UserPlus className="w-4 h-4" /> Criar Conta</>
                    )}
                  </span>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-6 space-y-2 text-center text-sm text-slate-500 dark:text-slate-400">
          <p>2026 • Meus Plantões</p>
          <div className="flex items-center justify-center gap-3 text-xs">
            <a className="hover:text-indigo-600 hover:underline dark:hover:text-indigo-300" href="/privacy">Privacidade</a>
            <span>•</span>
            <a className="hover:text-indigo-600 hover:underline dark:hover:text-indigo-300" href="/support">Suporte</a>
          </div>
        </div>
      </div>
    </div>
  );
}
