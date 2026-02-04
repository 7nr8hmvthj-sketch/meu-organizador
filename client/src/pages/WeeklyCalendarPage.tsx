import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, ChevronRight, Pencil, Trash2, Plus } from "lucide-react";
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

// --- HELPERS ---

function normalizeDateKey(dateInput: string | Date): string {
  if (!dateInput) return "";
  if (typeof dateInput === 'string') {
    return dateInput.split('T')[0];
  }
  try {
    return dateInput.toISOString().split('T')[0];
  } catch {
    return format(dateInput, 'yyyy-MM-dd');
  }
}

function getEventColor(type: string, isPassed: boolean): string {
  if (isPassed) return "bg-gray-100 dark:bg-gray-800 border-gray-300 text-gray-400";
  const typeLower = (type || "").toLowerCase();
  
  if (typeLower.includes("natação") || typeLower.includes("natacao")) return "bg-blue-50 dark:bg-blue-900/30 border-blue-300 text-blue-700 dark:text-blue-300";
  if (typeLower.includes("musculação") || typeLower.includes("musculacao")) return "bg-green-50 dark:bg-green-900/30 border-green-300 text-green-700 dark:text-green-300";
  if (typeLower.includes("pilates")) return "bg-purple-50 dark:bg-purple-900/30 border-purple-300 text-purple-700 dark:text-purple-300";
  if (typeLower.includes("hc")) return "bg-red-50 dark:bg-red-900/30 border-red-300 text-red-700 dark:text-red-300";
  if (typeLower.includes("zn")) return "bg-amber-50 dark:bg-amber-900/30 border-amber-300 text-amber-700 dark:text-amber-300";
  if (typeLower.includes("noturno")) return "bg-indigo-50 dark:bg-indigo-900/30 border-indigo-300 text-indigo-700 dark:text-indigo-300";
  if (typeLower.includes("apoio")) return "bg-pink-50 dark:bg-pink-900/30 border-pink-300 text-pink-700 dark:text-pink-300";
  
  return "bg-slate-50 dark:bg-slate-900/30 border-slate-300 text-slate-700 dark:text-slate-300";
}

function getEventLabel(event: { type?: string; description?: string | null }): string {
  const type = event.type || "";
  const desc = event.description || "";
  const typeLower = type.toLowerCase();
  
  const timeMatchColon = desc.match(/(\d{1,2}:\d{2})/) || type.match(/(\d{1,2}:\d{2})/);
  const timeMatchHyphen = type.match(/(\d{1,2}-\d{1,2})/);
  let timeStr = timeMatchColon ? timeMatchColon[0] : (timeMatchHyphen ? timeMatchHyphen[0] : "");

  let label = type;
  if (typeLower.includes("natação") || typeLower.includes("natacao")) label = "Natação";
  else if (typeLower.includes("musculação") || typeLower.includes("musculacao")) label = "Musculação";
  else if (typeLower.includes("pilates")) label = "Pilates";
  else if (typeLower.includes("hc")) label = "HC";
  else if (typeLower.includes("zn") || typeLower.includes("zona norte")) label = "ZN";
  else if (typeLower.includes("noturno")) label = "Noturno";
  else if (typeLower.includes("apoio")) label = "Apoio";
  
  if (timeStr && !label.includes(timeStr)) {
    return `${label} ${timeStr}`;
  }
  
  return label;
}

function extractTimeFromDescription(desc: string): string {
  if (!desc) return "";
  const match = desc.match(/(\d{1,2}):(\d{2})/);
  return match ? match[0] : "";
}

// --- COMPONENT ---

export default function WeeklyCalendarPage() {
  // Começa na segunda-feira da semana atual
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    return startOfWeek(today, { weekStartsOn: 1 }); // 1 = Segunda-feira
  });
  
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showAddTrainingModal, setShowAddTrainingModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const [trainingType, setTrainingType] = useState<string>("");
  const [trainingTime, setTrainingTime] = useState<string>("");
  const [trainingDescription, setTrainingDescription] = useState<string>("");
  
  const [editingEvent, setEditingEvent] = useState<{ id: number; type: string; description: string | null; createdBy?: string | null } | null>(null);
  const [eventToDelete, setEventToDelete] = useState<{ id: number; type: string } | null>(null);

  const { data: events = [] } = trpc.events.list.useQuery();
  const { data: authData } = trpc.auth.checkSimpleAuth.useQuery();
  const utils = trpc.useUtils();

  const currentUsername = authData?.user?.username;

  const createEventMutation = trpc.events.create.useMutation({
    onSuccess: () => {
      toast.success("Treino adicionado!");
      utils.events.list.invalidate();
      setShowAddTrainingModal(false);
      resetForm();
    },
    onError: (error) => toast.error(`Erro: ${error.message}`),
  });

  const updateEventMutation = trpc.events.update.useMutation({
    onSuccess: () => {
      toast.success("Treino atualizado!");
      utils.events.list.invalidate();
      setShowEditModal(false);
      setEditingEvent(null);
      resetForm();
    },
    onError: (error) => toast.error(`Erro: ${error.message}`),
  });

  const deleteEventMutation = trpc.events.delete.useMutation({
    onSuccess: () => {
      toast.success("Treino excluído!");
      utils.events.list.invalidate();
      setShowDeleteConfirm(false);
      setEventToDelete(null);
    },
    onError: (error) => toast.error(`Erro: ${error.message}`),
  });

  const resetForm = () => {
    setTrainingType("");
    setTrainingTime("");
    setTrainingDescription("");
  };

  // Gera os 6 dias da semana (segunda a sábado)
  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 6; i++) { // 0=seg, 1=ter, 2=qua, 3=qui, 4=sex, 5=sáb
      days.push(addDays(currentWeekStart, i));
    }
    return days;
  }, [currentWeekStart]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, typeof events>();
    const processedIds = new Set<number>();

    if (!events) return map;

    events.forEach(e => {
      if (e.id && processedIds.has(e.id)) return;
      if (e.id) processedIds.add(e.id);

      const dateStr = normalizeDateKey(e.date);
      
      if (!map.has(dateStr)) {
        map.set(dateStr, []);
      }
      map.get(dateStr)!.push(e);
    });
    return map;
  }, [events]);

  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return [];
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return eventsByDate.get(dateStr) || [];
  }, [selectedDate, eventsByDate]);

  // Filtra apenas treinos que a treinadora pode editar/excluir
  const editableEvents = useMemo(() => {
    return selectedDateEvents.filter(e => 
      e.createdBy === currentUsername && 
      (e.type.toLowerCase().includes("musculação") || 
       e.type.toLowerCase().includes("musculacao") || 
       e.type.toLowerCase().includes("pilates"))
    );
  }, [selectedDateEvents, currentUsername]);

  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    setShowAddTrainingModal(true);
  };

  const handleAddTraining = () => {
    if (!selectedDate || !trainingType || !trainingTime) {
      toast.error("Preencha tipo e horário.");
      return;
    }
    if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(trainingTime)) {
      toast.error("Horário inválido. Use formato HH:MM.");
      return;
    }

    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const description = trainingDescription 
      ? `${trainingDescription} ${trainingTime}`
      : `${trainingType} ${trainingTime}`;

    createEventMutation.mutate({
      date: dateStr,
      type: trainingType,
      description: description,
      isShift: false,
    });
  };

  const handleEditClick = (event: typeof editableEvents[0]) => {
    setEditingEvent(event);
    setTrainingType(event.type);
    const time = extractTimeFromDescription(event.description || "");
    setTrainingTime(time);
    const desc = (event.description || "").replace(event.type, "").replace(time, "").trim();
    setTrainingDescription(desc);
    setShowAddTrainingModal(false);
    setShowEditModal(true);
  };

  const handleUpdateTraining = () => {
    if (!editingEvent || !trainingType || !trainingTime) {
      toast.error("Preencha tipo e horário.");
      return;
    }
    if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(trainingTime)) {
      toast.error("Horário inválido. Use formato HH:MM.");
      return;
    }

    const description = trainingDescription 
      ? `${trainingDescription} ${trainingTime}`
      : `${trainingType} ${trainingTime}`;

    updateEventMutation.mutate({
      id: editingEvent.id,
      type: trainingType,
      description: description,
    });
  };

  const handleDeleteClick = (event: typeof editableEvents[0]) => {
    setEventToDelete({ id: event.id, type: event.type });
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (eventToDelete) {
      deleteEventMutation.mutate({ id: eventToDelete.id });
    }
  };

  const goToToday = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  const dayNames = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

  // Formata o período da semana para exibição
  const weekPeriod = useMemo(() => {
    const endOfWeekDate = addDays(currentWeekStart, 5); // Sábado
    const startMonth = format(currentWeekStart, "MMM", { locale: ptBR });
    const endMonth = format(endOfWeekDate, "MMM", { locale: ptBR });
    
    if (startMonth === endMonth) {
      return `${format(currentWeekStart, "d")} - ${format(endOfWeekDate, "d")} ${startMonth}`;
    }
    return `${format(currentWeekStart, "d MMM", { locale: ptBR })} - ${format(endOfWeekDate, "d MMM", { locale: ptBR })}`;
  }, [currentWeekStart]);

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-primary">Agenda Semanal</h1>
          <p className="text-muted-foreground text-xs">Toque em um dia para adicionar treino</p>
        </div>
        <Button variant="outline" size="sm" onClick={goToToday}>
          Hoje
        </Button>
      </div>

      {/* Navegação da Semana */}
      <Card className="shadow-sm">
        <CardContent className="py-3 px-2">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <span className="text-sm font-semibold capitalize">{weekPeriod}</span>
            <Button variant="ghost" size="icon" onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))}>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Grid de dias da semana - 2 colunas x 3 linhas */}
      <div className="grid grid-cols-2 gap-3">
        {weekDays.map((day, index) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const dayEvents = eventsByDate.get(dateStr) || [];
          const isCurrentDay = isToday(day);
          
          return (
            <Card 
              key={dateStr}
              className={`cursor-pointer transition-all hover:shadow-md ${isCurrentDay ? "ring-2 ring-primary" : ""}`}
              onClick={() => handleDayClick(day)}
            >
              <CardContent className="p-3">
                {/* Header do dia */}
                <div className={`flex items-center justify-between mb-2 pb-2 border-b ${isCurrentDay ? "border-primary/30" : "border-border"}`}>
                  <span className={`text-xs font-bold uppercase ${isCurrentDay ? "text-primary" : "text-muted-foreground"}`}>
                    {dayNames[index]}
                  </span>
                  <span className={`text-lg font-bold ${isCurrentDay ? "bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center" : "text-foreground"}`}>
                    {format(day, "d")}
                  </span>
                </div>
                
                {/* Eventos do dia */}
                <div className="space-y-1.5 min-h-[80px]">
                  {dayEvents.length === 0 ? (
                    <p className="text-xs text-muted-foreground/50 text-center py-4">Sem eventos</p>
                  ) : (
                    dayEvents.slice(0, 4).map((e) => {
                      // Determinar cor do indicador
                      const getIndicatorColor = () => {
                        if (e.isPassed) return 'bg-gray-400';
                        const typeLower = e.type.toLowerCase();
                        if (typeLower.includes('natação') || typeLower.includes('natacao')) return 'bg-blue-500';
                        if (typeLower.includes('musculação') || typeLower.includes('musculacao')) return 'bg-green-500';
                        if (typeLower.includes('pilates')) return 'bg-purple-500';
                        if (typeLower.includes('hc')) return 'bg-red-500';
                        if (typeLower.includes('zn') || typeLower.includes('zona norte')) return 'bg-amber-500';
                        if (typeLower.includes('noturno')) return 'bg-indigo-500';
                        return 'bg-gray-400';
                      };
                      
                      return (
                        <div 
                          key={e.id} 
                          className={`text-xs px-2 py-1 rounded border-l-3 ${getEventColor(e.type, e.isPassed)} ${e.isPassed ? "line-through opacity-60" : ""}`}
                        >
                          <div className="flex items-center gap-1.5">
                            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${getIndicatorColor()}`}></div>
                            <span className="truncate font-medium">{getEventLabel(e)}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                  {dayEvents.length > 4 && (
                    <p className="text-[10px] text-muted-foreground text-center">+{dayEvents.length - 4} mais</p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Legenda compacta */}
      <Card>
        <CardContent className="py-2 px-3">
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] justify-center">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <span>Natação</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span>Musculação</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-purple-500"></div>
              <span>Pilates</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <span>HC</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-amber-500"></div>
              <span>ZN</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal para adicionar treino */}
      <Dialog open={showAddTrainingModal} onOpenChange={setShowAddTrainingModal}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              {selectedDate && format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </DialogTitle>
          </DialogHeader>
          
          {/* Mostrar eventos existentes no dia */}
          {selectedDateEvents.length > 0 && (
            <div className="bg-muted/50 rounded-md p-3 mb-2 max-h-[30vh] overflow-y-auto">
              <p className="text-xs font-medium text-muted-foreground mb-2">Eventos neste dia:</p>
              <div className="space-y-2">
                {selectedDateEvents.map(e => {
                  const isTraining = e.type.toLowerCase().includes('musculação') || 
                                     e.type.toLowerCase().includes('musculacao') || 
                                     e.type.toLowerCase().includes('pilates');
                  const time = extractTimeFromDescription(e.description || "");
                  const descWithoutTypeAndTime = (e.description || "")
                    .replace(e.type, '')
                    .replace(time, '')
                    .trim();
                  
                  // Determinar cor do indicador
                  const getIndicatorColor = () => {
                    if (e.isPassed) return 'bg-gray-400';
                    const typeLower = e.type.toLowerCase();
                    if (typeLower.includes('natação') || typeLower.includes('natacao')) return 'bg-blue-500';
                    if (typeLower.includes('musculação') || typeLower.includes('musculacao')) return 'bg-green-500';
                    if (typeLower.includes('pilates')) return 'bg-purple-500';
                    if (typeLower.includes('hc')) return 'bg-red-500';
                    if (typeLower.includes('zn') || typeLower.includes('zona norte')) return 'bg-amber-500';
                    if (typeLower.includes('noturno')) return 'bg-indigo-500';
                    return 'bg-gray-400';
                  };
                  
                  return (
                    <div key={e.id} className={`text-xs ${e.isPassed ? 'opacity-60' : ''}`}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getIndicatorColor()}`}></div>
                        <span className={`font-medium ${e.isPassed ? 'line-through text-gray-500' : ''}`}>{getEventLabel(e)}</span>
                        {isTraining && e.createdBy && (
                          <span className="text-muted-foreground">({e.createdBy})</span>
                        )}
                      </div>
                      {isTraining && descWithoutTypeAndTime && (
                        <p className="ml-4 text-muted-foreground italic">{descWithoutTypeAndTime}</p>
                      )}
                      {e.isPassed && e.passedReason && (
                        <p className="ml-4 text-xs text-yellow-600 dark:text-yellow-400 italic">Passado: {e.passedReason}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Treinos editáveis pela treinadora */}
          {editableEvents.length > 0 && (
            <div className="bg-green-50 dark:bg-green-900/20 rounded-md p-3 mb-2 border border-green-200 dark:border-green-800">
              <p className="text-xs font-medium text-green-700 dark:text-green-300 mb-2">Seus treinos:</p>
              <div className="space-y-2">
                {editableEvents.map(e => {
                  const time = extractTimeFromDescription(e.description || "");
                  const descWithoutTypeAndTime = (e.description || "")
                    .replace(e.type, '')
                    .replace(time, '')
                    .trim();
                  
                  return (
                    <div key={e.id} className="text-xs bg-white dark:bg-gray-800 rounded p-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{getEventLabel(e)}</span>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7"
                            onClick={(ev) => { ev.stopPropagation(); handleEditClick(e); }}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-red-500 hover:text-red-700"
                            onClick={(ev) => { ev.stopPropagation(); handleDeleteClick(e); }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                      {descWithoutTypeAndTime && (
                        <p className="text-muted-foreground italic mt-1">{descWithoutTypeAndTime}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Modalidade *</Label>
              <Select value={trainingType} onValueChange={setTrainingType}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Musculação">Musculação</SelectItem>
                  <SelectItem value="Pilates">Pilates</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Horário *</Label>
              <Input 
                type="time" 
                value={trainingTime} 
                onChange={(e) => setTrainingTime(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label>Observação (opcional)</Label>
              <Textarea 
                value={trainingDescription} 
                onChange={(e) => setTrainingDescription(e.target.value)}
                placeholder="Ex: Treino de pernas, foco em core..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => { setShowAddTrainingModal(false); resetForm(); }}>
              Cancelar
            </Button>
            <Button onClick={handleAddTraining} disabled={createEventMutation.isPending}>
              {createEventMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de edição */}
      <Dialog open={showEditModal} onOpenChange={(open) => { setShowEditModal(open); if (!open) { setEditingEvent(null); resetForm(); } }}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Treino</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Modalidade *</Label>
              <Select value={trainingType} onValueChange={setTrainingType}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Musculação">Musculação</SelectItem>
                  <SelectItem value="Pilates">Pilates</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Horário *</Label>
              <Input 
                type="time" 
                value={trainingTime} 
                onChange={(e) => setTrainingTime(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label>Observação (opcional)</Label>
              <Textarea 
                value={trainingDescription} 
                onChange={(e) => setTrainingDescription(e.target.value)}
                placeholder="Ex: Treino de pernas, foco em core..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => { setShowEditModal(false); setEditingEvent(null); resetForm(); }}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateTraining} disabled={updateEventMutation.isPending}>
              {updateEventMutation.isPending ? "Salvando..." : "Atualizar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmação de exclusão */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
          </DialogHeader>
          <p className="py-4">
            Tem certeza que deseja excluir o treino <strong>{eventToDelete?.type}</strong>?
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => { setShowDeleteConfirm(false); setEventToDelete(null); }}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleteEventMutation.isPending}>
              {deleteEventMutation.isPending ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
