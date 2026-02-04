import { useState, useEffect, useRef, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ChevronLeft, 
  ChevronRight, 
  Save, 
  Book, 
  Search, 
  Tag, 
  Calendar as CalendarIcon,
  Plus,
  X,
  Trash2,
  List,
  FileText
} from "lucide-react";
import { format, addDays, subDays, isToday, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useSearch, useLocation } from "wouter";

// Simple markdown renderer
function SimpleMarkdown({ children }: { children: string }) {
  const html = children
    .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mt-4 mb-2">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-4 mb-2">$1</h1>')
    .replace(/\*\*\*(.*)\*\*\*/gim, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*)\*/gim, '<em>$1</em>')
    .replace(/^\- (.*$)/gim, '<li class="ml-4">$1</li>')
    .replace(/^\* (.*$)/gim, '<li class="ml-4">$1</li>')
    .replace(/\n/gim, '<br />');
  
  return <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: html }} />;
}

const TAG_SUGGESTIONS = [
  "trabalho", "pessoal", "saúde", "exercício", "reflexão", 
  "gratidão", "meta", "ideia", "importante", "humor"
];

export default function DiaryPage() {
  const searchString = useSearch();
  const [, setLocation] = useLocation();
  
  // CORREÇÃO 1: Forçar meio-dia para evitar bug de fuso horário
  const getDateFromUrl = () => {
    const params = new URLSearchParams(searchString);
    const dateParam = params.get('date');
    if (dateParam) {
      try {
        return new Date(dateParam + "T12:00:00");
      } catch {
        return new Date();
      }
    }
    return new Date();
  };
  
  const [currentDate, setCurrentDate] = useState(getDateFromUrl);
  
  useEffect(() => {
    setCurrentDate(getDateFromUrl());
  }, [searchString]);
  
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("write");
  const [showEntriesModal, setShowEntriesModal] = useState(false);
  
  // CORREÇÃO 2: Ref para impedir limpeza indevida do form
  const lastLoadedDateRef = useRef<string | null>(null);
  
  const dateKey = format(currentDate, "yyyy-MM-dd");
  const utils = trpc.useUtils();
  
  const { data: entry, isLoading } = trpc.diary.get.useQuery({ date: dateKey });
  const { data: allEntries } = trpc.diary.list.useQuery();
  const { data: allTags } = trpc.diary.tags.useQuery();
  const { data: searchResults } = trpc.diary.search.useQuery(
    { query: searchQuery },
    { enabled: searchQuery.length >= 2 }
  );
  const { data: tagResults } = trpc.diary.byTag.useQuery(
    { tag: selectedTag || "" },
    { enabled: !!selectedTag }
  );

  const saveMutation = trpc.diary.save.useMutation({
    onSuccess: (savedData) => {
      toast.success("Diário salvo com sucesso!");
      // Atualiza estado local imediatamente se disponível
      if (savedData) {
        setTitle(savedData.title || "");
        setContent(savedData.content || "");
        setTags(savedData.tags ? savedData.tags.split(",").map(t => t.trim()).filter(Boolean) : []);
      }
      utils.diary.get.invalidate({ date: dateKey });
      utils.diary.list.invalidate();
      utils.diary.tags.invalidate();
    },
    onError: () => toast.error("Erro ao salvar.")
  });

  const deleteMutation = trpc.diary.delete.useMutation({
    onSuccess: () => {
      toast.success("Entrada excluída!");
      setTitle("");
      setContent("");
      setTags([]);
      utils.diary.get.invalidate({ date: dateKey });
      utils.diary.list.invalidate();
    },
    onError: () => toast.error("Erro ao excluir.")
  });

  // CORREÇÃO 3: Lógica blindada de carregamento
  useEffect(() => {
    const isDateChange = dateKey !== lastLoadedDateRef.current;

    if (entry) {
        // Se o servidor retornou dados, atualizamos
        setTitle(entry.title || "");
        setContent(entry.content || "");
        setTags(entry.tags ? entry.tags.split(",").map(t => t.trim()).filter(Boolean) : []);
        lastLoadedDateRef.current = dateKey;
    } else if (isDateChange && !isLoading) {
        // Só limpamos a tela SE a data mudou E o carregamento terminou
        // Isso impede que o texto suma durante o "loading" do salvamento
        setTitle("");
        setContent("");
        setTags([]);
        lastLoadedDateRef.current = dateKey;
    }
  }, [entry, isLoading, dateKey]);

  const handleSave = () => {
    saveMutation.mutate({ 
      date: dateKey, 
      title: title || null,
      content: content || null,
      tags: tags.length > 0 ? tags.join(", ") : null
    });
  };

  const handleDelete = () => {
    if (confirm("Tem certeza que deseja excluir esta entrada?")) {
      deleteMutation.mutate({ date: dateKey });
    }
  };

  const changeDate = (days: number) => {
    const newDate = days > 0 ? addDays(currentDate, days) : subDays(currentDate, Math.abs(days));
    // Navega atualizando a URL para manter consistência
    setLocation(`/diario?date=${format(newDate, "yyyy-MM-dd")}`);
  };

  const goToDate = (dateStr: string) => {
    setLocation(`/diario?date=${dateStr}`);
    setShowEntriesModal(false);
    setSelectedTag(null);
    setSearchQuery("");
  };

  const addTag = (tag: string) => {
    const trimmed = tag.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
    }
    setNewTag("");
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const displayEntries = useMemo(() => {
    if (searchQuery.length >= 2 && searchResults) return searchResults;
    if (selectedTag && tagResults) return tagResults;
    return allEntries || [];
  }, [searchQuery, searchResults, selectedTag, tagResults, allEntries]);

  const hasContent = title || content || tags.length > 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-500">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-primary">
            <Book className="w-6 h-6" /> Meu Diário
          </h1>
          <p className="text-muted-foreground text-sm">
            Registre seus pensamentos, evolução e notas pessoais.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowEntriesModal(true)}>
            <List className="w-4 h-4 mr-2" /> Ver Entradas
          </Button>
          <Button variant="outline" size="sm" onClick={() => setLocation(`/diario?date=${format(new Date(), 'yyyy-MM-dd')}`)}>
            <CalendarIcon className="w-4 h-4 mr-2" /> Hoje
          </Button>
        </div>
      </div>

      <Card className="shadow-lg border-t-4 border-t-primary">
        <CardHeader className="pb-2 border-b">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => changeDate(-1)}>
              <ChevronLeft className="w-5 h-5" /> Ontem
            </Button>
            <div className="text-center">
              <CardTitle className="text-lg capitalize">
                {format(currentDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {format(currentDate, "yyyy")}
                {isToday(currentDate) && <Badge variant="secondary" className="ml-2 text-xs">Hoje</Badge>}
              </p>
            </div>
            <Button variant="ghost" onClick={() => changeDate(1)}>
              Amanhã <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="p-6">
          {isLoading && !title && !content ? (
            <div className="h-[400px] flex items-center justify-center text-muted-foreground">Carregando...</div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="write"><FileText className="w-4 h-4 mr-2" /> Escrever</TabsTrigger>
                <TabsTrigger value="preview"><Book className="w-4 h-4 mr-2" /> Visualizar</TabsTrigger>
              </TabsList>

              <TabsContent value="write" className="space-y-4">
                <div>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título do dia (opcional)" className="text-lg font-semibold" />
                </div>
                <div>
                  <Textarea 
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Como foi o seu dia? Escreva aqui... (suporta Markdown)"
                    className="min-h-[300px] text-base leading-relaxed p-4 resize-y bg-background font-mono"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Dica: Use **negrito**, *itálico*, - listas, # títulos</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2"><Tag className="w-4 h-4" /> Tags</label>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="gap-1">
                        {tag}
                        <button onClick={() => removeTag(tag)} className="ml-1 hover:text-destructive"><X className="w-3 h-3" /></button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="Adicionar tag..."
                      className="max-w-[200px]"
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(newTag); } }}
                    />
                    <Button variant="outline" size="sm" onClick={() => addTag(newTag)} disabled={!newTag.trim()}><Plus className="w-4 h-4" /></Button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {TAG_SUGGESTIONS.filter(s => !tags.includes(s)).slice(0, 5).map((suggestion) => (
                      <Button key={suggestion} variant="ghost" size="sm" className="h-6 text-xs" onClick={() => addTag(suggestion)}>+ {suggestion}</Button>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="preview" className="space-y-4">
                <div className="min-h-[400px] p-4 bg-muted/30 rounded-lg border">
                  {title && <h2 className="text-2xl font-bold mb-4">{title}</h2>}
                  {content ? <SimpleMarkdown>{content}</SimpleMarkdown> : <p className="text-muted-foreground italic">Nenhum conteúdo para visualizar...</p>}
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t">
                      {tags.map((tag) => <Badge key={tag} variant="outline">#{tag}</Badge>)}
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
          
          <div className="flex justify-between mt-6 pt-4 border-t">
            <Button variant="outline" onClick={handleDelete} disabled={!hasContent || deleteMutation.isPending} className="text-destructive hover:text-destructive">
              <Trash2 className="w-4 h-4 mr-2" /> Excluir
            </Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              <Save className="w-4 h-4 mr-2" /> {saveMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Entries List Modal */}
      <Dialog open={showEntriesModal} onOpenChange={setShowEntriesModal}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Book className="w-5 h-5" /> Entradas do Diário</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setSelectedTag(null); }} placeholder="Buscar..." className="pl-10" />
              </div>
              {(searchQuery || selectedTag) && <Button variant="ghost" size="sm" onClick={() => { setSearchQuery(""); setSelectedTag(null); }}>Limpar</Button>}
            </div>
            {allTags && allTags.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Filtrar por tag:</label>
                <div className="flex flex-wrap gap-2">
                  {allTags.map((tag) => (
                    <Badge key={tag} variant={selectedTag === tag ? "default" : "outline"} className="cursor-pointer" onClick={() => { setSelectedTag(selectedTag === tag ? null : tag); setSearchQuery(""); }}>#{tag}</Badge>
                  ))}
                </div>
              </div>
            )}
            <ScrollArea className="h-[400px] pr-4">
              {displayEntries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">Nenhuma entrada encontrada.</div>
              ) : (
                <div className="space-y-3">
                  {displayEntries.map((e) => (
                    <Card key={e.date as string} className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => goToDate(String(e.date))}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-muted-foreground">{format(parseISO(String(e.date)), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
                            {e.title && <h4 className="font-semibold mt-1">{e.title}</h4>}
                            {e.content && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{e.content.substring(0, 150)}...</p>}
                            {e.tags && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {e.tags.split(",").map((tag) => <Badge key={tag.trim()} variant="outline" className="text-xs">#{tag.trim()}</Badge>)}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowEntriesModal(false)}>Fechar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}