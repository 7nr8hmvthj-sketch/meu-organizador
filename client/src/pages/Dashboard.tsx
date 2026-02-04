import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, DollarSign, Pill, Clock, Sun, Moon, Sunset } from "lucide-react";
import { format, isToday, parseISO, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

function getGreeting(): { text: string; icon: React.ReactNode } {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return { text: "Bom dia", icon: <Sun className="w-6 h-6 text-yellow-500" /> };
  } else if (hour >= 12 && hour < 18) {
    return { text: "Boa tarde", icon: <Sunset className="w-6 h-6 text-orange-500" /> };
  } else {
    return { text: "Boa noite", icon: <Moon className="w-6 h-6 text-indigo-400" /> };
  }
}

function getEventClass(type: string): string {
  const typeLower = type.toLowerCase();
  if (typeLower.includes("manhã") && !typeLower.includes("hc") && !typeLower.includes("zona")) return "event-morning";
  if (typeLower.includes("tarde") && !typeLower.includes("zona")) return "event-afternoon";
  if (typeLower.includes("noturno") || typeLower.includes("noite")) return "event-night";
  if (typeLower.includes("hc")) return "event-hc";
  if (typeLower.includes("zona")) return "event-zona";
  return "event-personal";
}

export default function Dashboard() {
  const today = new Date();
  // Usar data local sem conversão de timezone
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const monthStartDate = startOfMonth(today);
  const monthEndDate = endOfMonth(today);
  const monthStart = `${monthStartDate.getFullYear()}-${String(monthStartDate.getMonth() + 1).padStart(2, '0')}-${String(monthStartDate.getDate()).padStart(2, '0')}`;
  const monthEnd = `${monthEndDate.getFullYear()}-${String(monthEndDate.getMonth() + 1).padStart(2, '0')}-${String(monthEndDate.getDate()).padStart(2, '0')}`;

  const { data: events = [] } = trpc.events.list.useQuery();
  const { data: expenses = [] } = trpc.expenses.list.useQuery();
  const { data: medications = [] } = trpc.medications.list.useQuery();
  const { data: medicationLogs = [] } = trpc.medications.getLogs.useQuery({ date: todayStr });

  const greeting = getGreeting();

  const stats = useMemo(() => {
    const todayEvents = events.filter(e => {
      // Extrair apenas a parte da data (YYYY-MM-DD) sem conversão de timezone
      const eventDate = String(e.date).split('T')[0];
      return eventDate === todayStr && !e.isPassed && !e.isCancelled;
    });

    const monthEvents = events.filter(e => {
      const eventDate = String(e.date).split('T')[0];
      return eventDate >= monthStart && eventDate <= monthEnd && !e.isPassed && !e.isCancelled;
    });

    const pendingExpenses = expenses.filter(e => !e.isPaid);
    const takenMeds = medicationLogs.length;
    const totalMeds = medications.length;

    return {
      todayEvents: todayEvents.length,
      monthEvents: monthEvents.length,
      pendingExpenses: pendingExpenses.length,
      medicationProgress: `${takenMeds}/${totalMeds}`,
    };
  }, [events, expenses, medications, medicationLogs, todayStr, monthStart, monthEnd]);

  const todayAgenda = useMemo(() => {
    return events
      .filter(e => {
        const eventDate = String(e.date).split('T')[0];
        return eventDate === todayStr;
      })
      .sort((a, b) => a.type.localeCompare(b.type));
  }, [events, todayStr]);

  const upcomingEvents = useMemo(() => {
    return events
      .filter(e => {
        const eventDate = String(e.date).split('T')[0];
        return eventDate >= todayStr && !e.isPassed && !e.isCancelled;
      })
      .sort((a, b) => {
        const dateA = String(a.date).split('T')[0];
        const dateB = String(b.date).split('T')[0];
        return dateA.localeCompare(dateB);
      })
      .slice(0, 5);
  }, [events, todayStr]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          {greeting.icon}
          <h1 className="text-2xl font-bold">{greeting.text}!</h1>
        </div>
        <p className="text-white/80">Aqui está o resumo do seu dia</p>
        <p className="text-white/60 text-sm mt-1">
          {format(today, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="card-hover">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.todayEvents}</p>
                <p className="text-xs text-muted-foreground">Eventos Hoje</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.monthEvents}</p>
                <p className="text-xs text-muted-foreground">Eventos no Mês</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <DollarSign className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pendingExpenses}</p>
                <p className="text-xs text-muted-foreground">Contas Pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <Pill className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.medicationProgress}</p>
                <p className="text-xs text-muted-foreground">Medicamentos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Agenda & Upcoming Events */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Today's Agenda */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-500" />
              Agenda de Hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayAgenda.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">
                Nenhum evento para hoje
              </p>
            ) : (
              <div className="space-y-3">
                {todayAgenda.map((event) => (
                  <div
                    key={event.id}
                    className={`p-3 rounded-lg border-l-4 ${getEventClass(event.type)} ${
                      event.isPassed || event.isCancelled ? "event-passed" : ""
                    }`}
                  >
                    <p className={`font-medium event-title ${event.isPassed || event.isCancelled ? "line-through" : ""}`}>
                      {event.description || event.type}
                    </p>
                    <p className="text-sm text-muted-foreground">{event.type}</p>
                    {event.passedReason && (
                      <span className="passed-note">📝 {event.passedReason}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-500" />
              Próximos Eventos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingEvents.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">
                Nenhum evento próximo
              </p>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map((event) => {
                  // Usar a data diretamente sem conversão de timezone
                  let formattedDate = 'Data inválida';
                  try {
                    const dateStr = String(event.date).split('T')[0];
                    const parts = dateStr.split('-');
                    if (parts.length === 3) {
                      const year = parseInt(parts[0], 10);
                      const month = parseInt(parts[1], 10);
                      const day = parseInt(parts[2], 10);
                      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
                        const eventDate = new Date(year, month - 1, day);
                        formattedDate = `${format(eventDate, "dd/MM/yyyy")} - ${format(eventDate, "EEEE", { locale: ptBR })}`;
                      }
                    }
                  } catch (e) {
                    console.error('Erro ao formatar data:', event.date);
                  }
                  return (
                    <div
                      key={event.id}
                      className={`p-3 rounded-lg border-l-4 ${getEventClass(event.type)}`}
                    >
                      <p className="font-medium">{event.description || event.type}</p>
                      <p className="text-sm text-muted-foreground">
                        {formattedDate}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
