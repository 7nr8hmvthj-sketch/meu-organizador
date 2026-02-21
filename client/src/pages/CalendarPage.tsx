import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Pencil, Trash2, Plus, BookOpen } from "lucide-react";
import { useLocation } from "wouter";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, getDay } from "date-fns";
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
  if (isPassed) return "text-gray-400 bg-gray-50 dark:bg-gray-900/30 border-gray-200";
  const typeLower = (type || "").toLowerCase();
  
  if (typeLower.includes("natação") || typeLower.includes("natacao")) return "text-blue-700 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200";
  if (typeLower.includes("musculação") || typeLower.includes("musculacao")) return "text-green-700 bg-green-50 dark:bg-green-900/30 dark:text-green-300 border-green-200";
  if (typeLower.includes("pilates")) return "text-purple-700 bg-purple-50 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200";
  if (typeLower.includes("hc")) return "text-red-700 bg-red-50 dark:bg-red-900/30 dark:text-red-300 border-red-200";
  if (typeLower.includes("zn")) return "text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200";
  if (typeLower.includes("apoio")) return "text-pink-700 bg-pink-50 dark:bg-pink-900/30 dark:text-pink-300 border-pink-200";
  if (typeLower.includes("noturno")) return "text-indigo-700 bg-indigo-50 dark:bg-indigo-900/30 dark:text-indigo-300 border-indigo-200";
  
  return "text-slate-700 bg-slate-50 dark:bg-slate-900/30 dark:text-slate-300 border-slate-200";
}

const SHIFT_HOURS: Record<string, string> = {
  "hc manhã": "7-13",
  "hc tarde": "13-19",
  "corredor tarde": "13-19",
  "corredor manhã": "7-13",
  "zona norte manhã": "7-13",
  "zona norte tarde": "13-19",
  "zona norte (manhã)": "7-13",
  "zona norte (tarde)": "13-19",
  "noturno": "19-7",
  "noturno (19-07)": "19-7",
  "apoio": "19-01",
  "apoio (19-01)": "19-01",
};

const EVENT_TYPES = [
  { value: "HC 7-13", label: "HC 7-13 (Manhã)" },
  { value: "HC 13-19", label: "HC 13-19 (Tarde)" },
  { value: "ZN 7-13", label: "Zona Norte 7-13 (Manhã)" },
  { value: "ZN 13-19", label: "Zona Norte 13-19 (Tarde)" },
  { value: "Noturno 19-7", label: "Noturno 19-7" },
  { value: "Apoio 19-01", label: "Apoio 19-01" },
  { value: "Corredor Manhã", label: "Corredor Manhã" },
  { value: "Corredor Tarde", label: "Corredor Tarde" },
  { value: "Natação", label: "Natação" },
  { value: "Musculação", label: "Musculação" },
  { value: "Pilates", label: "Pilates" },
  { value: "Outro", label: "Outro (personalizado)" },
];

function getEventLabel(event: { type?: string; description?: string | null }): string {
  const type = event.type || "";
  const desc = event.description || "";
  const typeLower = type.toLowerCase();
  
  const timeMatchColon = desc.match(/(\d{1,2}:\d{2})/) || type.match(/(\d{1,2}:\d{2})/);
  const timeMatchHyphen = type.match(/(\d{1,2}-\d{1,2})/);
  let timeStr = timeMatchColon ? timeMatchColon[0] : (timeMatchHyphen ? timeMatchHyphen[0] : "");

  let label = type;
  if (typeLower.includes("natação")) label = "Natação";
  else if (typeLower.includes("musculação")) label = "Musculação";
  else if (typeLower.includes("pilates")) label = "Pilates";
  else if (typeLower.includes("hc")) label = "HC";
  else if (typeLower.includes("zn") || typeLower.includes("zona norte")) label = "ZN";
  else if (typeLower.includes("noturno")) label = "Noturno";
  else if (typeLower.includes("apoio")) label = "Apoio";
  else if (typeLower.includes("corredor")) label = "Corredor";
  
  if (!timeStr) {
    const mappedTime = SHIFT_HOURS[typeLower];
    if (mappedTime) timeStr = mappedTime;
  }
  
  if (timeStr && !label.includes(timeStr)) return `${label} ${timeStr}`;
  if (!timeStr && desc.length < 20 && desc.length > 0 && desc !== type) return desc;
  
  return label;
}

function extractTimeFromDescription(desc: string): string {
  if (!desc) return "";
  const match = desc.match(/(\d{1,2}):(\d{2})/);
  return match ? match[0] : "";
}

export default function CalendarPage() {
  const [, navigate] = useLocation();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDayModal, setShowDayModal] = useState(false);
  const [showAddTrainingModal, setShowAddTrainingModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  
  const [trainingType, setTrainingType] = useState<string>("");
  const [trainingTime, setTrainingTime] = useState<string>("");
  const [trainingDescription, setTrainingDescription] = useState<string>("");
  
  const [eventType, setEventType] = useState<string>("");
  const [customEventType, setCustomEventType] = useState<string>("");
  const [eventTime, setEventTime] = useState<string>("");
  const [eventDescription, setEventDescription] = useState<string>("");
  
  const [editingEvent, setEditingEvent] = useState<{ id: number; type: string; description: string | null; createdBy?: string | null; date?: string } | null>(null);
  const [eventToDelete, setEventToDelete] = useState<{ id: number; type: string } | null>(null);

  const { data: events = [] } = trpc.events.list.useQuery();
  const { data: authData } = trpc.auth.checkSimpleAuth.useQuery();
  const utils = trpc.useUtils();

  // Query dedicada para o total de horas ZN do período de fechamento (dia 20 do mês anterior ao dia 19 do mês atual)
  const { data: znHoursData } = trpc.events.getZNHours.useQuery({
    month: currentMonth.getMonth() + 1,
    year: currentMonth.getFullYear(),
  });
  const znTotalHours = znHoursData?.totalHours ?? 0;

  // Query do diário para o dia selecionado (apenas admin)
  const selectedDateKey = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null;
  const { data: diaryEntry } = trpc.diary.get.useQuery(
    { date: selectedDateKey || "" },
    { enabled: !!selectedDateKey && authData?.user?.role === "admin" }
  );

  const isTrainer = authData?.user?.role === "trainer";
  const isAdmin = authData?.user?.role === "admin";
  const currentUsername = authData?.user?.username;

  const createEventMutation = trpc.events.create.useMutation({
    onSuccess: () => {
      toast.success("Evento adicionado com sucesso!");
      utils.events.list.invalidate();
      setShowAddTrainingModal(false);
      setShowAddEventModal(false);
      resetForm();
    },
    onError: (error) => toast.error(`Erro: ${error.message}`),
  });

  const updateEventMutation = trpc.events.update.useMutation({
    onSuccess: () => {
      toast.success("Evento atualizado com sucesso!");
      utils.events.list.invalidate();
      setShowEditModal(false);
      setEditingEvent(null);
      resetForm();
    },
    onError: (error) => toast.error(`Erro: ${error.message}`),
  });

  const deleteEventMutation = trpc.events.delete.useMutation({
    onSuccess: () => {
      toast.success("Evento excluído com sucesso!");
      utils.events.list.invalidate();
      setShowDeleteConfirm(false);
      setEventToDelete(null);
      setShowDayModal(false);
    },
    onError: (error) => toast.error(`Erro: ${error.message}`),
  });

  const resetForm = () => {
    setTrainingType(""); setTrainingTime(""); setTrainingDescription("");
    setEventType(""); setCustomEventType(""); setEventTime(""); setEventDescription("");
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = getDay(monthStart);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, typeof events>();
    const processedIds = new Set<number>();
    if (!events) return map;
    events.forEach(e => {
      if (e.id && processedIds.has(e.id)) return;
      if (e.id) processedIds.add(e.id);
      const dateStr = normalizeDateKey(e.date);
      if (!map.has(dateStr)) map.set(dateStr, []);
      map.get(dateStr)!.push(e);
    });
    return map;
  }, [events]);

  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return [];
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return eventsByDate.get(dateStr) || [];
  }, [selectedDate, eventsByDate]);

  const editableEvents = useMemo(() => {
    if (!isTrainer) return [];
    return selectedDateEvents.filter(e => 
      e.createdBy === currentUsername && 
      (e.type.toLowerCase().includes("musculação") || e.type.toLowerCase().includes("pilates"))
    );
  }, [selectedDateEvents, isTrainer, currentUsername]);

  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    if (isTrainer) setShowAddTrainingModal(true);
    else setShowDayModal(true);
  };

  const handleAddTraining = () => {
    if (!selectedDate || !trainingType || !trainingTime) return toast.error("Preencha campos.");
    if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(trainingTime)) return toast.error("Horário inválido.");
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const description = trainingDescription ? `${trainingDescription} ${trainingTime}` : `${trainingType} ${trainingTime}`;
    createEventMutation.mutate({ date: dateStr, type: trainingType, description, isShift: false });
  };

  const handleEditTrainingClick = (event: typeof editableEvents[0]) => {
    setEditingEvent(event);
    setTrainingType(event.type);
    const time = extractTimeFromDescription(event.description || "");
    setTrainingTime(time);
    setTrainingDescription((event.description || "").replace(event.type, "").replace(time, "").trim());
    setShowAddTrainingModal(false);
    setShowEditModal(true);
  };

  const handleUpdateTraining = () => {
    if (!editingEvent || !trainingType || !trainingTime) return toast.error("Preencha campos.");
    const description = trainingDescription ? `${trainingDescription} ${trainingTime}` : `${trainingType} ${trainingTime}`;
    updateEventMutation.mutate({ id: editingEvent.id, type: trainingType, description });
  };

  const handleAddEvent = () => {
    if (!selectedDate || !eventType) return toast.error("Selecione o tipo.");
    const finalType = eventType === "Outro" ? customEventType : eventType;
    if (!finalType) return toast.error("Digite o tipo.");
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    let description = eventDescription || finalType;
    if (eventTime) description = `${description} ${eventTime}`;
    const isShift = ["hc", "zn", "noturno", "apoio", "corredor"].some(k => finalType.toLowerCase().includes(k));
    createEventMutation.mutate({ date: dateStr, type: finalType, description, isShift });
  };

  const handleEditEventClick = (event: typeof selectedDateEvents[0]) => {
    setEditingEvent({ ...event, date: normalizeDateKey(event.date) });
    const matchedType = EVENT_TYPES.find(t => event.type.toLowerCase().includes(t.value.toLowerCase().split(" ")[0]));
    if (matchedType) { setEventType(matchedType.value); setCustomEventType(""); } 
    else { setEventType("Outro"); setCustomEventType(event.type); }
    const time = extractTimeFromDescription(event.description || "");
    setEventTime(time);
    setEventDescription((event.description || "").replace(event.type, "").replace(time, "").trim());
    setShowDayModal(false);
    setShowEditModal(true);
  };

  const handleUpdateEvent = () => {
    if (!editingEvent || !eventType) return toast.error("Selecione o tipo.");
    const finalType = eventType === "Outro" ? customEventType : eventType;
    if (!finalType) return toast.error("Digite o tipo.");
    let description = eventDescription || finalType;
    if (eventTime) description = `${description} ${eventTime}`;
    updateEventMutation.mutate({ id: editingEvent.id, type: finalType, description });
  };

  const handleDeleteClick = (event: { id: number; type: string }) => {
    setEventToDelete(event);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (eventToDelete) deleteEventMutation.mutate({ id: eventToDelete.id });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-primary"><CalendarIcon className="w-6 h-6" /> Calendário</h1>
          <p className="text-muted-foreground text-sm">{isTrainer ? "Adicione treinos." : "Gerencie eventos."}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())}>Hoje</Button>
      </div>

      <Card className="shadow-md">
        <CardHeader className="pb-4 border-b">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronLeft className="w-5 h-5" /></Button>
            <CardTitle className="text-lg font-semibold capitalize">{format(currentMonth, "MMMM yyyy", { locale: ptBR })}</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight className="w-5 h-5" /></Button>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(day => <div key={day} className="text-center text-xs font-bold text-muted-foreground uppercase py-2">{day}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1 auto-rows-fr">
            {Array.from({ length: startDayOfWeek }).map((_, i) => <div key={`empty-${i}`} className="min-h-[100px] bg-gray-50/50 dark:bg-gray-900/10 rounded-md" />)}
            {days.map(day => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const dayEvents = eventsByDate.get(dateStr) || [];
              return (
                <button key={dateStr} onClick={() => handleDayClick(day)} className={`min-h-[110px] p-2 rounded-lg text-sm relative border transition-all flex flex-col items-start gap-1 group ${isToday(day) ? "border-primary/50 bg-primary/5" : "border-border bg-card hover:border-primary/30"} ${!isSameMonth(day, currentMonth) ? "opacity-40 bg-muted/20" : ""}`}>
                  <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full mb-1 ${isToday(day) ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{format(day, "d")}</span>
                  <div className="w-full space-y-1 overflow-hidden">
                    {dayEvents.slice(0, 3).map(e => <div key={e.id} className={`text-[10px] px-1.5 py-0.5 rounded-sm truncate w-full border-l-2 text-left font-medium ${getEventColor(e.type, e.isPassed)} ${e.isPassed ? "line-through opacity-60" : ""}`}>{getEventLabel(e)}</div>)}
                    {dayEvents.length > 3 && <div className="text-[9px] text-muted-foreground pl-1">+{dayEvents.length - 3} mais</div>}
                  </div>
                  {format(day, "d") === "19" && isSameMonth(day, currentMonth) && znTotalHours > 0 && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="mt-auto w-full px-1.5 py-0.5 rounded-sm bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 cursor-default"
                    >
                      <span className="text-[9px] font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        Total ZN: {znTotalHours}h
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDayModal} onOpenChange={setShowDayModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{selectedDate && format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}</span>
              {isAdmin && <Button size="sm" onClick={() => { setShowDayModal(false); setShowAddEventModal(true); }} className="ml-4"><Plus className="w-4 h-4 mr-1" /> Novo Evento</Button>}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto">
            {selectedDateEvents.length === 0 ? <p className="text-center text-muted-foreground py-8">Sem eventos.</p> : selectedDateEvents.map(event => (
              <div key={event.id} className={`p-3 rounded-md border ${getEventColor(event.type, event.isPassed)}`}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2"><span className="font-semibold">{event.type}</span><span className="text-xs font-mono">{extractTimeFromDescription(event.description || "")}</span></div>
                    {event.description && event.description !== event.type && <p className="text-sm mt-1 opacity-80">{event.description.replace(event.type, '').replace(extractTimeFromDescription(event.description || ""), '').trim()}</p>}
                  </div>
                  {isAdmin && <div className="flex gap-1 ml-2"><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditEventClick(event)}><Pencil className="w-4 h-4" /></Button><Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700" onClick={() => handleDeleteClick({ id: event.id, type: event.type })}><Trash2 className="w-4 h-4" /></Button></div>}
                </div>
              </div>
            ))}
            {isAdmin && (
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold flex items-center gap-2"><BookOpen className="w-4 h-4 text-primary" /> Diário do Dia</h4>
                  <Button variant="link" size="sm" className="text-xs h-auto p-0" onClick={() => { setShowDayModal(false); navigate(`/diario?date=${format(selectedDate!, 'yyyy-MM-dd')}`); }}>Abrir Diário Completo &rarr;</Button>
                </div>
                <div className="bg-muted/30 p-3 rounded-md text-sm text-muted-foreground italic min-h-[60px]">
                  {diaryEntry?.content ? (
                    <div>
                      {diaryEntry.title && <p className="font-semibold not-italic text-foreground mb-1">{diaryEntry.title}</p>}
                      <p className="line-clamp-3">"{diaryEntry.content.substring(0, 200)}..."</p>
                    </div>
                  ) : <span className="opacity-50">Nenhum registro.</span>}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Modais de Add Event, Training, Edit e Delete mantidos (simplificados visualmente aqui mas funcionais no código completo) */}
      <Dialog open={showAddEventModal} onOpenChange={setShowAddEventModal}><DialogContent><DialogHeader><DialogTitle>Novo Evento</DialogTitle></DialogHeader><div className="space-y-4 py-4"><Select value={eventType} onValueChange={setEventType}><SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger><SelectContent>{EVENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select>{eventType === "Outro" && <Input value={customEventType} onChange={e => setCustomEventType(e.target.value)} placeholder="Personalizado" />}<Input type="time" value={eventTime} onChange={e => setEventTime(e.target.value)} /><Textarea value={eventDescription} onChange={e => setEventDescription(e.target.value)} placeholder="Obs" /></div><DialogFooter><Button onClick={handleAddEvent}>Salvar</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={showAddTrainingModal} onOpenChange={setShowAddTrainingModal}><DialogContent><DialogHeader><DialogTitle>Novo Treino</DialogTitle></DialogHeader><div className="space-y-4 py-4"><Select value={trainingType} onValueChange={setTrainingType}><SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger><SelectContent><SelectItem value="Musculação">Musculação</SelectItem><SelectItem value="Pilates">Pilates</SelectItem></SelectContent></Select><Input type="time" value={trainingTime} onChange={e => setTrainingTime(e.target.value)} /><Textarea value={trainingDescription} onChange={e => setTrainingDescription(e.target.value)} placeholder="Obs" /></div><DialogFooter><Button onClick={handleAddTraining}>Salvar</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}><DialogContent><DialogHeader><DialogTitle>Editar</DialogTitle></DialogHeader><div className="space-y-4 py-4">{isAdmin ? <><Select value={eventType} onValueChange={setEventType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{EVENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select><Input type="time" value={eventTime} onChange={e => setEventTime(e.target.value)} /><Textarea value={eventDescription} onChange={e => setEventDescription(e.target.value)} /></> : <><Select value={trainingType} onValueChange={setTrainingType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Musculação">Musculação</SelectItem><SelectItem value="Pilates">Pilates</SelectItem></SelectContent></Select><Input type="time" value={trainingTime} onChange={e => setTrainingTime(e.target.value)} /><Textarea value={trainingDescription} onChange={e => setTrainingDescription(e.target.value)} /></>}</div><DialogFooter><Button onClick={isAdmin ? handleUpdateEvent : handleUpdateTraining}>Atualizar</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}><DialogContent><DialogHeader><DialogTitle>Excluir?</DialogTitle></DialogHeader><DialogFooter><Button variant="destructive" onClick={confirmDelete}>Excluir</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}