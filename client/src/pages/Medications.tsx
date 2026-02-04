import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Pill, Plus, Pencil, Trash2, Sun, Sunset, Moon } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const TIME_OPTIONS = [
  { value: "Manhã", label: "Manhã", icon: Sun },
  { value: "Tarde", label: "Tarde", icon: Sunset },
  { value: "Noite", label: "Noite", icon: Moon },
];

export default function Medications() {
  const utils = trpc.useUtils();
  const todayStr = format(new Date(), "yyyy-MM-dd");
  
  const { data: medications = [], isLoading } = trpc.medications.list.useQuery();
  const { data: logs = [] } = trpc.medications.getLogs.useQuery({ date: todayStr });
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedMedication, setSelectedMedication] = useState<typeof medications[0] | null>(null);
  
  // Form states
  const [newName, setNewName] = useState("");
  const [newTime, setNewTime] = useState("Manhã");

  // Mutations
  const createMutation = trpc.medications.create.useMutation({
    onSuccess: () => {
      utils.medications.list.invalidate();
      setShowAddModal(false);
      setNewName("");
      toast.success("Medicamento adicionado!");
    },
  });

  const updateMutation = trpc.medications.update.useMutation({
    onSuccess: () => {
      utils.medications.list.invalidate();
      setShowEditModal(false);
      setSelectedMedication(null);
      toast.success("Medicamento atualizado!");
    },
  });

  const deleteMutation = trpc.medications.delete.useMutation({
    onSuccess: () => {
      utils.medications.list.invalidate();
      toast.success("Medicamento excluído!");
    },
  });

  const logTakenMutation = trpc.medications.logTaken.useMutation({
    onSuccess: () => {
      utils.medications.getLogs.invalidate({ date: todayStr });
    },
  });

  const undoTakenMutation = trpc.medications.undoTaken.useMutation({
    onSuccess: () => {
      utils.medications.getLogs.invalidate({ date: todayStr });
    },
  });

  // Check which medications were taken today
  const takenMedicationIds = useMemo(() => {
    return new Set(logs.map(l => l.medicationId));
  }, [logs]);

  // Calculate progress
  const progress = useMemo(() => {
    if (medications.length === 0) return 0;
    return (takenMedicationIds.size / medications.length) * 100;
  }, [medications, takenMedicationIds]);

  // Group medications by time
  const medicationsByTime = useMemo(() => {
    const groups: Record<string, typeof medications> = {
      "Manhã": [],
      "Tarde": [],
      "Noite": [],
    };
    medications.forEach(m => {
      if (groups[m.time]) {
        groups[m.time].push(m);
      } else {
        groups["Manhã"].push(m);
      }
    });
    return groups;
  }, [medications]);

  const handleCreate = () => {
    if (!newName) {
      toast.error("Digite o nome do medicamento");
      return;
    }
    createMutation.mutate({
      name: newName,
      time: newTime,
    });
  };

  const handleUpdate = () => {
    if (!selectedMedication) return;
    updateMutation.mutate({
      id: selectedMedication.id,
      name: newName || undefined,
      time: newTime || undefined,
    });
  };

  const openEditModal = (medication: typeof medications[0]) => {
    setSelectedMedication(medication);
    setNewName(medication.name);
    setNewTime(medication.time);
    setShowEditModal(true);
  };

  const handleToggleTaken = (medication: typeof medications[0]) => {
    const isTaken = takenMedicationIds.has(medication.id);
    if (isTaken) {
      undoTakenMutation.mutate({
        medicationId: medication.id,
        date: todayStr,
      });
    } else {
      logTakenMutation.mutate({
        medicationId: medication.id,
        date: todayStr,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const MedicationItem = ({ medication }: { medication: typeof medications[0] }) => {
    const isTaken = takenMedicationIds.has(medication.id);
    
    return (
      <div className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
        isTaken 
          ? "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800" 
          : "bg-card hover:bg-accent/50"
      }`}>
        <Checkbox
          checked={isTaken}
          onCheckedChange={() => handleToggleTaken(medication)}
          className="h-5 w-5"
        />
        <div className="flex-1">
          <p className={`font-medium ${isTaken ? "line-through text-muted-foreground" : ""}`}>
            {medication.name}
          </p>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => openEditModal(medication)}
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-red-500"
            onClick={() => {
              if (confirm("Tem certeza que deseja excluir este medicamento?")) {
                deleteMutation.mutate({ id: medication.id });
              }
            }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Pill className="w-6 h-6 text-primary" />
            Medicamentos
          </h1>
          <p className="text-muted-foreground">Controle diário de medicamentos</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Novo Medicamento
        </Button>
      </div>

      {/* Progress Card */}
      <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-emerald-200 dark:border-emerald-800">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-emerald-800 dark:text-emerald-200">
              Progresso de Hoje
            </h3>
            <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
              {takenMedicationIds.size}/{medications.length}
            </span>
          </div>
          <Progress value={progress} className="h-3" />
          <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-2">
            {progress === 100 
              ? "Parabéns! Todos os medicamentos foram tomados hoje!" 
              : `${medications.length - takenMedicationIds.size} medicamento(s) restante(s)`
            }
          </p>
        </CardContent>
      </Card>

      {/* Medications by Time */}
      {TIME_OPTIONS.map(({ value, label, icon: Icon }) => {
        const meds = medicationsByTime[value] || [];
        if (meds.length === 0) return null;
        
        return (
          <Card key={value}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Icon className="w-5 h-5 text-primary" />
                {label}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {meds.map(medication => (
                <MedicationItem key={medication.id} medication={medication} />
              ))}
            </CardContent>
          </Card>
        );
      })}

      {medications.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Nenhum medicamento cadastrado. Clique em "Novo Medicamento" para adicionar.
          </CardContent>
        </Card>
      )}

      {/* Add Medication Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Medicamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Nome do Medicamento</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: Vitamina D"
              />
            </div>
            <div>
              <Label>Horário</Label>
              <Select value={newTime} onValueChange={setNewTime}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Medication Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Medicamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Nome do Medicamento</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div>
              <Label>Horário</Label>
              <Select value={newTime} onValueChange={setNewTime}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
