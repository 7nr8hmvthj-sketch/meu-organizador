import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, DollarSign, CheckCircle2, Circle, Trash2, Pencil, RefreshCw } from "lucide-react";
import { toast } from "sonner";

// --- HELPERS ---

const formatCurrency = (value: string | number) => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return "R$ 0,00";
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(num);
};

export default function FinancePage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form States
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDay, setDueDay] = useState("");
  const [category, setCategory] = useState<"fixed" | "variable">("fixed");

  // Data Fetching
  const { data: expenses = [], isLoading, refetch } = trpc.expenses.list.useQuery();
  const utils = trpc.useUtils();

  // Mutations
  const createMutation = trpc.expenses.create.useMutation({
    onSuccess: () => {
      toast.success("Despesa adicionada!");
      utils.expenses.list.invalidate();
      closeModal();
    },
    onError: (e) => toast.error(`Erro: ${e.message}`)
  });

  const updateMutation = trpc.expenses.update.useMutation({
    onSuccess: () => {
      toast.success("Despesa atualizada!");
      utils.expenses.list.invalidate();
      closeModal();
    },
    onError: (e) => toast.error(`Erro: ${e.message}`)
  });

  const togglePaidMutation = trpc.expenses.togglePaid.useMutation({
    onSuccess: () => utils.expenses.list.invalidate(),
  });

  const deleteMutation = trpc.expenses.delete.useMutation({
    onSuccess: () => {
      toast.success("Despesa removida.");
      utils.expenses.list.invalidate();
    },
  });

  const resetMutation = trpc.expenses.resetPaidStatus.useMutation({
    onSuccess: () => {
      toast.success("Status de pagamento reiniciado para o novo mês.");
      utils.expenses.list.invalidate();
    }
  });

  // --- CALCULATIONS ---

  const summary = useMemo(() => {
    let total = 0;
    let paid = 0;
    let pending = 0;
    let fixedTotal = 0;
    let variableTotal = 0;

    expenses.forEach(e => {
      const val = parseFloat(String(e.amount));
      total += val;
      if (e.isPaid) paid += val;
      else pending += val;

      if (e.category === 'fixed') fixedTotal += val;
      else variableTotal += val;
    });

    return { total, paid, pending, fixedTotal, variableTotal };
  }, [expenses]);

  // Ordenar por dia de vencimento
  const sortedExpenses = useMemo(() => {
    return [...expenses].sort((a, b) => a.dueDay - b.dueDay);
  }, [expenses]);

  const fixedExpenses = sortedExpenses.filter(e => e.category === 'fixed');
  const variableExpenses = sortedExpenses.filter(e => e.category === 'variable');

  // --- HANDLERS ---

  const handleSave = () => {
    if (!name || !amount || !dueDay) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const payload = {
      name,
      amount: amount.replace(',', '.'), // Aceitar vírgula
      dueDay: parseInt(dueDay),
      category
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleEdit = (expense: typeof expenses[0]) => {
    setEditingId(expense.id);
    setName(expense.name);
    setAmount(String(expense.amount));
    setDueDay(expense.dueDay.toString());
    setCategory(expense.category);
    setShowAddModal(true);
  };

  const handleTogglePaid = (id: number, currentStatus: boolean) => {
    const today = new Date();
    togglePaidMutation.mutate({
      id,
      isPaid: !currentStatus,
      month: !currentStatus ? today.getMonth() + 1 : undefined,
      year: !currentStatus ? today.getFullYear() : undefined
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir esta despesa?")) {
      deleteMutation.mutate({ id });
    }
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingId(null);
    setName("");
    setAmount("");
    setDueDay("");
    setCategory("fixed");
  };

  const handleResetMonth = () => {
    if(confirm("Isso marcará todas as contas como 'Não Pagas' para iniciar um novo mês. Continuar?")) {
      resetMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-primary">
            <DollarSign className="w-6 h-6" /> Gestão Financeira
          </h1>
          <p className="text-muted-foreground text-sm">
            Controle de despesas fixas e variáveis.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleResetMonth} title="Reiniciar pagamentos para novo mês">
            <RefreshCw className="w-4 h-4 mr-2" /> Virar Mês
          </Button>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4 mr-2" /> Nova Despesa
          </Button>
        </div>
      </div>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Previsto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.total)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Fixas: {formatCurrency(summary.fixedTotal)} | Var: {formatCurrency(summary.variableTotal)}
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pago</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(summary.paid)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary.total > 0 ? Math.round((summary.paid / summary.total) * 100) : 0}% do total
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">A Pagar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{formatCurrency(summary.pending)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Faltam {expenses.length - expenses.filter(e => e.isPaid).length} contas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Listas de Despesas */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-3 md:w-[400px]">
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="fixed">Fixas</TabsTrigger>
          <TabsTrigger value="variable">Variáveis</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <ExpenseList 
            expenses={sortedExpenses} 
            onToggle={handleTogglePaid} 
            onEdit={handleEdit} 
            onDelete={handleDelete}
          />
        </TabsContent>
        
        <TabsContent value="fixed" className="mt-4">
          <ExpenseList 
            expenses={fixedExpenses} 
            onToggle={handleTogglePaid} 
            onEdit={handleEdit} 
            onDelete={handleDelete}
          />
        </TabsContent>
        
        <TabsContent value="variable" className="mt-4">
          <ExpenseList 
            expenses={variableExpenses} 
            onToggle={handleTogglePaid} 
            onEdit={handleEdit} 
            onDelete={handleDelete}
          />
        </TabsContent>
      </Tabs>

      {/* Modal Adicionar/Editar */}
      <Dialog open={showAddModal} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Despesa" : "Nova Despesa"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome da Despesa</Label>
              <Input 
                value={name} 
                onChange={e => setName(e.target.value)} 
                placeholder="Ex: Aluguel, Academia..." 
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor (R$)</Label>
                <Input 
                  value={amount} 
                  onChange={e => setAmount(e.target.value)} 
                  type="number" 
                  step="0.01" 
                  placeholder="0.00" 
                />
              </div>
              <div className="space-y-2">
                <Label>Dia Vencimento</Label>
                <Select value={dueDay} onValueChange={setDueDay}>
                  <SelectTrigger><SelectValue placeholder="Dia" /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                      <SelectItem key={d} value={d.toString()}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={category} onValueChange={(v: "fixed" | "variable") => setCategory(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixa (Recorrente)</SelectItem>
                  <SelectItem value="variable">Variável (Cartão/Outros)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>Cancelar</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Sub-componente para renderizar a lista
function ExpenseList({ expenses, onToggle, onEdit, onDelete }: {
  expenses: any[];
  onToggle: (id: number, currentStatus: boolean) => void;
  onEdit: (expense: any) => void;
  onDelete: (id: number) => void;
}) {
  if (expenses.length === 0) {
    return (
      <Card className="bg-muted/20 border-dashed">
        <CardContent className="py-10 text-center text-muted-foreground">
          Nenhuma despesa encontrada. Adicione uma nova clicando em "+ Nova Despesa".
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {/* Cabeçalho da Tabela - Desktop */}
      <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
        <div className="col-span-1 text-center">Status</div>
        <div className="col-span-1 text-center">Dia</div>
        <div className="col-span-5">Descrição</div>
        <div className="col-span-3 text-right">Valor</div>
        <div className="col-span-2 text-right">Ações</div>
      </div>

      {expenses.map((expense) => (
        <Card key={expense.id} className={`transition-all hover:bg-accent/30 ${expense.isPaid ? 'opacity-60 bg-muted/20' : ''}`}>
          <div className="grid grid-cols-12 gap-2 md:gap-4 p-3 md:p-4 items-center">
            
            {/* Checkbox Status */}
            <div className="col-span-2 md:col-span-1 flex justify-center">
              <button 
                onClick={() => onToggle(expense.id, expense.isPaid)}
                className={`rounded-full p-1 transition-colors ${expense.isPaid ? 'text-green-500 hover:text-green-600' : 'text-gray-300 hover:text-gray-400'}`}
              >
                {expense.isPaid ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
              </button>
            </div>

            {/* Dia */}
            <div className="col-span-2 md:col-span-1 flex justify-center">
              <span className="text-sm font-bold bg-muted px-2 py-1 rounded text-muted-foreground">
                {expense.dueDay}
              </span>
            </div>

            {/* Nome e Categoria */}
            <div className="col-span-8 md:col-span-5 flex flex-col">
              <span className={`font-medium ${expense.isPaid ? 'line-through text-muted-foreground' : ''}`}>
                {expense.name}
              </span>
              <span className="text-[10px] uppercase text-muted-foreground flex items-center gap-1">
                {expense.category === 'fixed' ? 'Fixa' : 'Variável'}
              </span>
            </div>

            {/* Valor */}
            <div className="col-span-6 md:col-span-3 text-left md:text-right font-mono font-medium">
              {formatCurrency(expense.amount)}
            </div>

            {/* Ações */}
            <div className="col-span-6 md:col-span-2 flex justify-end gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(expense)}>
                <Pencil className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDelete(expense.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
