import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Calendar, Plus, Pencil, Trash2, UserMinus, Undo2, Filter } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

const EVENT_TYPES = [
  "HC Manhã",
  "Zona Norte (Manhã)",
  "Zona Norte (Tarde)",
  "Noturno (19-07)",
  "Apoio (19-01)",
  "Pessoal",
];

function getEventClass(type: string, isPassed: boolean, isCancelled: boolean): string {
  if (isPassed || isCancelled) return "opacity-60";
  
  const typeLower = type.toLowerCase();
  if (typeLower.includes("hc")) return "event-hc";
  if (typeLower.includes("manhã") || typeLower.includes("manha")) return "event-morning";
  if (typeLower.includes("tarde")) return "event-afternoon";
  if (typeLower.includes("noturno") || typeLower.includes("apoio")) return "event-night";
  return "event-personal";
}

export default function Events() {
  const utils = trpc.useUtils();
  const { data: events = [], isLoading } = trpc.events.list.useQuery();
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPassModal, setShowPassModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<typeof events[0] | null>(null);
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  
  // Form states
  const [newDate, setNewDate] = useState("");
  const [newType, setNewType] = useState("Zona Norte (Manhã)");
  const [newDescription, setNewDescription] = useState("");
  const [passReason, setPassReason] = useState("");

  // Mutations
  const createMutation = trpc.events.create.useMutation({
    onSuccess: () => {
      utils.events.list.invalidate();
      setShowAddModal(false);
      setNewDate("");
      setNewDescription("");
      toast.success("Evento criado com sucesso!");
    },
  });

  const updateMutation = trpc.events.update.useMutation({
    onSuccess: () => {
      utils.events.list.invalidate();
      setShowEditModal(false);
      setSelectedEvent(null);
      toast.success("Evento atualizado!");
    },
  });

  const passMutation = trpc.events.passShift.useMutation({
    onSuccess: () => {
      utils.events.list.invalidate();
      setShowPassModal(false);
      setSelectedEvent(null);
      setPassReason("");
      toast.success("Plantão marcado como passado!");
    },
  });

  const undoPassMutation = trpc.events.undoPass.useMutation({
    onSuccess: () => {
      utils.events.list.invalidate();
      toast.success("Passagem desfeita!");
    },
  });

  const cancelMutation = trpc.events.cancel.useMutation({
    onSuccess: () => {
      utils.events.list.invalidate();
      toast.success("Evento cancelado!");
    },
  });

  const undoCancelMutation = trpc.events.undoCancel.useMutation({
    onSuccess: () => {
      utils.events.list.invalidate();
      toast.success("Cancelamento desfeito!");
    },
  });

  const deleteMutation = trpc.events.delete.useMutation({
    onSuccess: () => {
      utils.events.list.invalidate();
      toast.success("Evento excluído!");
    },
  });

  // Get unique months from events
  const months = useMemo(() => {
    const monthSet = new Set<string>();
    events.forEach(e => {
      const date = typeof e.date === 'string' ? e.date : format(new Date(e.date), 'yyyy-MM-dd');
      const month = date.substring(0, 7);
      monthSet.add(month);
    });
    return Array.from(monthSet).sort();
  }, [events]);

  // Filter events
  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      const date = typeof e.date === 'string' ? e.date : format(new Date(e.date), 'yyyy-MM-dd');
      const month = date.substring(0, 7);
      
      if (filterMonth !== "all" && month !== filterMonth) return false;
      if (filterType !== "all" && e.type !== filterType) return false;
      
      return true;
    }).sort((a, b) => {
      const dateA = typeof a.date === 'string' ? a.date : format(new Date(a.date), 'yyyy-MM-dd');
      const dateB = typeof b.date === 'string' ? b.date : format(new Date(b.date), 'yyyy-MM-dd');
      return dateA.localeCompare(dateB);
    });
  }, [events, filterMonth, filterType]);

  const handleCreate = () => {
    if (!newDate) {
      toast.error("Selecione uma data");
      return;
    }
    createMutation.mutate({
      date: newDate,
      type: newType,
      description: newDescription || undefined,
      isShift: newType !== "Pessoal",
    });
  };

  const handleUpdate = () => {
    if (!selectedEvent) return;
    updateMutation.mutate({
      id: selectedEvent.id,
      date: newDate || undefined,
      type: newType || undefined,
      description: newDescription || undefined,
    });
  };

  const handlePass = () => {
    if (!selectedEvent || !passReason.trim()) {
      toast.error("Digite o motivo da passagem");
      return;
    }
    passMutation.mutate({
      id: selectedEvent.id,
      reason: passReason,
    });
  };

  const openEditModal = (event: typeof events[0]) => {
    setSelectedEvent(event);
    const eventDate = typeof event.date === 'string' ? event.date : format(new Date(event.date), 'yyyy-MM-dd');
    setNewDate(eventDate);
    setNewType(event.type);
    setNewDescription(event.description || "");
    setShowEditModal(true);
  };

  const openPassModal = (event: typeof events[0]) => {
    setSelectedEvent(event);
    setPassReason("");
    setShowPassModal(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="w-6 h-6 text-primary" />
            Escala Profissional
          </h1>
          <p className="text-muted-foreground">Gerencie seus plantões e eventos</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Novo Evento
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground mb-1 block">Filtrar por Mês</Label>
              <Select value={filterMonth} onValueChange={setFilterMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os meses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os meses</SelectItem>
                  {months.map(m => (
                    <SelectItem key={m} value={m}>
                      {format(parseISO(m + "-01"), "MMMM yyyy", { locale: ptBR })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground mb-1 block">Filtrar por Tipo</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  {EVENT_TYPES.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Events List */}
      <div className="space-y-3">
        {filteredEvents.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Nenhum evento encontrado
            </CardContent>
          </Card>
        ) : (
          filteredEvents.map((event) => {
            // Usar a data diretamente sem conversão de timezone
            const dateStr = String(event.date).split('T')[0];
            const parts = dateStr.split('-');
            const year = parseInt(parts[0] || '2026', 10);
            const month = parseInt(parts[1] || '1', 10);
            const day = parseInt(parts[2] || '1', 10);
            const eventDate = new Date(year, month - 1, day);
            const isPassed = event.isPassed;
            const isCancelled = event.isCancelled;
            
            return (
              <Card 
                key={event.id} 
                className={`border-l-4 ${getEventClass(event.type, isPassed, isCancelled)} ${
                  isPassed || isCancelled ? "opacity-60" : ""
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-muted-foreground">
                          {format(eventDate, "dd/MM/yyyy")} - {format(eventDate, "EEEE", { locale: ptBR })}
                        </span>
                        <span className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary">
                          {event.type}
                        </span>
                      </div>
                      <p className={`font-medium ${isPassed || isCancelled ? "line-through" : ""}`}>
                        {event.description || event.type}
                      </p>
                      {event.passedReason && (
                        <span className="passed-note mt-2">
                          📝 {event.passedReason}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1">
                      {isPassed || isCancelled ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => isPassed 
                            ? undoPassMutation.mutate({ id: event.id })
                            : undoCancelMutation.mutate({ id: event.id })
                          }
                          title="Desfazer"
                        >
                          <Undo2 className="w-4 h-4" />
                        </Button>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditModal(event)}
                            title="Editar"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          {event.isShift ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-amber-600"
                              onClick={() => openPassModal(event)}
                              title="Passar plantão"
                            >
                              <UserMinus className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500"
                              onClick={() => cancelMutation.mutate({ id: event.id })}
                              title="Cancelar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500"
                        onClick={() => {
                          if (confirm("Tem certeza que deseja excluir este evento?")) {
                            deleteMutation.mutate({ id: event.id });
                          }
                        }}
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Add Event Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Evento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Data</Label>
              <Input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
              />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={newType} onValueChange={setNewType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Descrição (opcional)</Label>
              <Input
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Ex: Troca com fulano"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Event Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Evento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Data</Label>
              <Input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
              />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={newType} onValueChange={setNewType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Descrição</Label>
              <Input
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Ex: Troca com fulano"
              />
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

      {/* Pass Shift Modal */}
      <Dialog open={showPassModal} onOpenChange={setShowPassModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Passar Plantão</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              O plantão ficará marcado como passado, mas continuará visível no histórico.
            </p>
            <div>
              <Label>Motivo / Observação</Label>
              <Input
                value={passReason}
                onChange={(e) => setPassReason(e.target.value)}
                placeholder="Ex: passei amanda pvd 07/12"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPassModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handlePass} disabled={passMutation.isPending}>
              Confirmar Passagem
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
