import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, ArrowRight, RefreshCw, Plus, UserMinus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

// Reutilizando lógica de determinação de tipo
function determineType(title: string, place: string) {
  const titleLower = title.toLowerCase();
  const placeLower = place.toLowerCase();
  const isHC = titleLower.includes('hc') || placeLower.includes('hc');
  
  if (titleLower.includes('apoio')) return 'Apoio (19-01)';
  if (titleLower.includes('noturno')) return isHC ? 'HC Noturno' : 'Noturno (19-07)';
  if (titleLower.includes('corredor') || titleLower.includes('observação') || titleLower.includes('observacao')) return 'Zona Norte (Tarde)';
  if (titleLower.includes('13-19') || titleLower.includes('tarde')) return isHC ? 'HC Tarde' : 'Zona Norte (Tarde)';
  if (titleLower.includes('manhã') || titleLower.includes('manha') || titleLower.includes('07-13')) return isHC ? 'HC Manhã' : 'Zona Norte (Manhã)';
  return isHC ? 'HC Manhã' : 'Zona Norte (Manhã)';
}

export default function ComparisonPage() {
  const utils = trpc.useUtils();
  const { data: events = [], isLoading } = trpc.events.list.useQuery();
  const [csvData, setCsvData] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const createMutation = trpc.events.create.useMutation({
    onSuccess: () => {
      utils.events.list.invalidate();
      toast.success("Plantão adicionado!");
    }
  });

  const passMutation = trpc.events.passShift.useMutation({
    onSuccess: () => {
      utils.events.list.invalidate();
      toast.success("Status atualizado!");
    }
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim());
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      
      const parsed = lines.slice(1).map(line => {
        const values: string[] = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') inQuotes = !inQuotes;
          else if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
          } else current += char;
        }
        values.push(current.trim());
        
        const row: any = {};
        headers.forEach((h, idx) => { row[h] = values[idx]?.replace(/"/g, '') || ''; });
        return row;
      });

      const processed = parsed.map(row => {
        const date = row.start_date.split('T')[0];
        const type = determineType(row.title, row.place);
        const isPassed = row.place.toLowerCase().includes('passei') || row.title.toLowerCase().includes('passei');
        return { date, type, title: row.title, isPassed };
      });

      setCsvData(processed);
      setIsProcessing(false);
      toast.success("CSV processado com sucesso!");
    };
    reader.readAsText(file);
  };

  const comparison = useMemo(() => {
    if (csvData.length === 0 || events.length === 0) return null;

    const dbMap = new Map();
    events.forEach(e => {
      const dateStr = String(e.date).split('T')[0];
      const key = `${dateStr}|${e.type}`;
      if (!dbMap.has(key)) dbMap.set(key, []);
      dbMap.get(key).push(e);
    });

    const missingInDb: any[] = [];
    const statusDiffs: any[] = [];
    
    csvData.forEach(csvEv => {
      const key = `${csvEv.date}|${csvEv.type}`;
      const matches = dbMap.get(key);
      
      if (!matches || matches.length === 0) {
        missingInDb.push(csvEv);
      } else {
        const match = matches[0];
        if (Boolean(match.isPassed) !== csvEv.isPassed) {
          statusDiffs.push({
            ...csvEv,
            dbId: match.id,
            dbStatus: match.isPassed ? 'Passado' : 'Ativo'
          });
        }
        matches.shift();
      }
    });

    const onlyInDb: any[] = [];
    dbMap.forEach((list, key) => {
      list.forEach(e => {
        onlyInDb.push({
          id: e.id,
          date: key.split('|')[0],
          type: e.type,
          description: e.description
        });
      });
    });

    return { missingInDb, statusDiffs, onlyInDb };
  }, [csvData, events]);

  if (isLoading) return <div className="p-8 text-center">Carregando agenda...</div>;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Comparação Plantãozinho</h1>
          <p className="text-muted-foreground">Sincronize sua agenda com o app</p>
        </div>
        <div className="flex gap-2">
          <Input 
            type="file" 
            accept=".csv" 
            onChange={handleFileUpload}
            className="hidden" 
            id="csv-upload"
          />
          <Button asChild variant="outline">
            <label htmlFor="csv-upload" className="cursor-pointer flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Upload CSV
            </label>
          </Button>
        </div>
      </div>

      {!comparison ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>Faça o upload do arquivo CSV para iniciar a comparação</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {/* Faltando na Agenda */}
          <Card className="border-amber-200 bg-amber-50/30">
            <CardHeader>
              <CardTitle className="text-amber-800 flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Faltando na Agenda ({comparison.missingInDb.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {comparison.missingInDb.map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-white rounded-lg border shadow-sm">
                    <div>
                      <p className="font-medium">{item.date} - {item.type}</p>
                      <p className="text-sm text-muted-foreground">{item.title}</p>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => createMutation.mutate({
                        date: item.date,
                        type: item.type,
                        description: item.title,
                        isShift: true
                      })}
                    >
                      Adicionar
                    </Button>
                  </div>
                ))}
                {comparison.missingInDb.length === 0 && <p className="text-sm text-muted-foreground">Nenhum plantão faltando.</p>}
              </div>
            </CardContent>
          </Card>

          {/* Diferenças de Status */}
          <Card className="border-blue-200 bg-blue-50/30">
            <CardHeader>
              <CardTitle className="text-blue-800 flex items-center gap-2">
                <RefreshCw className="w-5 h-5" />
                Diferenças de Status ({comparison.statusDiffs.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {comparison.statusDiffs.map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-white rounded-lg border shadow-sm">
                    <div>
                      <p className="font-medium">{item.date} - {item.type}</p>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Agenda: {item.dbStatus}</span>
                        <ArrowRight className="w-3 h-3" />
                        <span className="font-semibold text-blue-600">CSV: {item.isPassed ? 'Passado' : 'Ativo'}</span>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => passMutation.mutate({
                        id: item.dbId,
                        reason: item.title
                      })}
                    >
                      Atualizar Status
                    </Button>
                  </div>
                ))}
                {comparison.statusDiffs.length === 0 && <p className="text-sm text-muted-foreground">Tudo sincronizado.</p>}
              </div>
            </CardContent>
          </Card>

          {/* Apenas na Agenda */}
          <Card className="border-slate-200 bg-slate-50/30">
            <CardHeader>
              <CardTitle className="text-slate-800 flex items-center gap-2">
                <UserMinus className="w-5 h-5" />
                Apenas na Agenda ({comparison.onlyInDb.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {comparison.onlyInDb.map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-white rounded-lg border shadow-sm">
                    <div>
                      <p className="font-medium">{item.date} - {item.type}</p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                    <span className="text-xs font-medium px-2 py-1 bg-slate-100 rounded text-slate-600">
                      Não está no CSV
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// Helper para Input (caso não esteja disponível como componente)
function Input(props: any) {
  return <input {...props} className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${props.className}`} />;
}
