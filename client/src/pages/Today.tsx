import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Calendar, Pill, Sun, Moon, Sunset, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function getGreeting(): { text: string; icon: React.ReactNode } {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return { text: "Bom dia", icon: <Sun className="w-8 h-8 text-yellow-500" /> };
  } else if (hour >= 12 && hour < 18) {
    return { text: "Boa tarde", icon: <Sunset className="w-8 h-8 text-orange-500" /> };
  } else {
    return { text: "Boa noite", icon: <Moon className="w-8 h-8 text-indigo-400" /> };
  }
}

function getEventClass(type: string): string {
  const typeLower = type.toLowerCase();
  if (typeLower.includes("hc")) return "border-l-red-500 bg-red-50 dark:bg-red-900/10";
  if (typeLower.includes("manhã") || typeLower.includes("manha")) return "border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/10";
  if (typeLower.includes("tarde")) return "border-l-orange-500 bg-orange-50 dark:bg-orange-900/10";
  if (typeLower.includes("noturno") || typeLower.includes("apoio")) return "border-l-indigo-500 bg-indigo-50 dark:bg-indigo-900/10";
  return "border-l-pink-500 bg-pink-50 dark:bg-pink-900/10";
}

export default function Today() {
  const utils = trpc.useUtils();
  const today = new Date();
  // Usar data local sem conversão de timezone
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const { data: events = [] } = trpc.events.list.useQuery();
  const { data: medications = [] } = trpc.medications.list.useQuery();
  const { data: logs = [] } = trpc.medications.getLogs.useQuery({ date: todayStr });

  const greeting = getGreeting();

  // Today's events
  const todayEvents = useMemo(() => {
    return events.filter(e => {
      // Extrair apenas a parte da data (YYYY-MM-DD) sem conversão de timezone
      const eventDate = String(e.date).split('T')[0];
      return eventDate === todayStr;
    }).sort((a, b) => a.type.localeCompare(b.type));
  }, [events, todayStr]);

  // Medication progress
  const takenMedicationIds = useMemo(() => {
    return new Set(logs.map(l => l.medicationId));
  }, [logs]);

  const medicationProgress = useMemo(() => {
    if (medications.length === 0) return 0;
    return (takenMedicationIds.size / medications.length) * 100;
  }, [medications, takenMedicationIds]);

  // Mutations for medications
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

  const handleToggleMedication = (medicationId: number) => {
    const isTaken = takenMedicationIds.has(medicationId);
    if (isTaken) {
      undoTakenMutation.mutate({ medicationId, date: todayStr });
    } else {
      logTakenMutation.mutate({ medicationId, date: todayStr });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-4">
          {greeting.icon}
          <div>
            <h1 className="text-2xl font-bold">{greeting.text}!</h1>
            <p className="text-white/80 capitalize">
              {format(today, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </p>
          </div>
        </div>
      </div>

      {/* Today's Events */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Agenda de Hoje
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todayEvents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum evento para hoje</p>
              <p className="text-sm">Aproveite o dia livre!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayEvents.map((event) => (
                <div
                  key={event.id}
                  className={`p-4 rounded-lg border-l-4 ${getEventClass(event.type)} ${
                    event.isPassed || event.isCancelled ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className={`font-semibold ${event.isPassed || event.isCancelled ? "line-through" : ""}`}>
                        {event.description || event.type}
                      </p>
                      <p className="text-sm text-muted-foreground">{event.type}</p>
                    </div>
                    {event.isShift && (
                      <span className="px-2 py-1 text-xs rounded-full bg-primary/10 text-primary">
                        Plantão
                      </span>
                    )}
                  </div>
                  {event.passedReason && (
                    <span className="passed-note mt-2">
                      📝 {event.passedReason}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Medications Checklist */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Pill className="w-5 h-5 text-emerald-500" />
              Medicamentos
            </CardTitle>
            <span className="text-sm font-medium text-muted-foreground">
              {takenMedicationIds.size}/{medications.length}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {medications.length === 0 ? (
            <p className="text-center py-4 text-muted-foreground">
              Nenhum medicamento cadastrado
            </p>
          ) : (
            <>
              <Progress value={medicationProgress} className="h-2 mb-4" />
              <div className="space-y-2">
                {medications.map((medication) => {
                  const isTaken = takenMedicationIds.has(medication.id);
                  return (
                    <div
                      key={medication.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                        isTaken
                          ? "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800"
                          : "hover:bg-accent/50"
                      }`}
                      onClick={() => handleToggleMedication(medication.id)}
                    >
                      <Checkbox
                        checked={isTaken}
                        onCheckedChange={() => handleToggleMedication(medication.id)}
                        className="h-5 w-5"
                      />
                      <div className="flex-1">
                        <p className={`font-medium ${isTaken ? "line-through text-muted-foreground" : ""}`}>
                          {medication.name}
                        </p>
                        <p className="text-xs text-muted-foreground">{medication.time}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              {medicationProgress === 100 && (
                <p className="text-center text-sm text-emerald-600 dark:text-emerald-400 mt-4 font-medium">
                  ✓ Todos os medicamentos foram tomados!
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
