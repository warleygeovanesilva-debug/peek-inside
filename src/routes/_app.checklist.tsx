import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/use-profile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Search, Camera, CheckCircle2, XCircle, Clock, Download, AlertTriangle, Fuel, Wrench, FileText, Shield } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/checklist")({
  head: () => ({ meta: [{ title: "Checklist — FrotaPro" }] }),
  component: Page,
});

const statusColor: Record<string, string> = {
  aprovado: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  reprovado: "bg-red-500/15 text-red-400 border-red-500/30",
  pendente: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
};

const CATEGORIAS = [
  { id: "motor", label: "Motor e Fluidos", icon: Wrench, itens: ["Nível de óleo", "Nível de água/radiador", "Correia dentada", "Vazamentos", "Filtro de ar"] },
  { id: "seguranca", label: "Segurança", icon: Shield, itens: ["Freios", "Pneus (estado/calibragem)", "Estepe", "Cintos de segurança", "Extintor de incêndio", "Triângulo", "Macaco"] },
  { id: "iluminacao", label: "Iluminação", icon: AlertTriangle, itens: ["Faróis dianteiros", "Faróis traseiros", "Setas", "Luz de freio", "Luz de ré", "Pisca alerta"] },
  { id: "combustivel", label: "Combustível", icon: Fuel, itens: ["Nível de combustível", "Tanque sem vazamentos"] },
  { id: "documentos", label: "Documentos", icon: FileText, itens: ["CNH válida", "CRLV do veículo", "Seguro obrigatório"] },
  { id: "cabine", label: "Cabine/Carroceria", icon: Camera, itens: ["Espelhos retrovisores", "Limpadores de para-brisa", "Buzina", "Travas das portas"] },
];

type ItemStatus = "ok" | "nao_ok" | "nao_aplicavel";
interface CKItem { categoria: string; item: string; status: ItemStatus; observacao?: string; foto_url?: string; }

function NovoChecklistDialog({ open, onClose, filialId }: { open: boolean; onClose: () => void; filialId: string }) {
  const qc = useQueryClient();
  const [veiculoId, setVeiculoId] = useState("");
  const [motoristaId, setMotoristaId] = useState("");
  const [km, setKm] = useState("");
  const [itens, setItens] = useState<CKItem[]>(
    CATEGORIAS.flatMap(cat => cat.itens.map(item => ({ categoria: cat.id, item, status: "nao_aplicavel" as ItemStatus })))
  );
  const [saving, setSaving] = useState(false);

  const { data: veiculos = [] } = useQuery({
    queryKey: ["veiculos-ck"],
    queryFn: async () => { const { data } = await supabase.from("veiculos").select("id,placa,modelo").eq("status","ativo").order("placa"); return data ?? []; },
  });
  const { data: motoristas = [] } = useQuery({
    queryKey: ["motoristas-ck"],
    queryFn: async () => { const { data } = await supabase.from("motoristas").select("id,nome").eq("ativo",true).order("nome"); return data ?? []; },
  });

  const updateItem = (idx: number, changes: Partial<CKItem>) =>
    setItens(prev => prev.map((it, i) => i === idx ? { ...it, ...changes } : it));

  const handleFoto = async (idx: number, file: File) => {
    try {
      const path = `checklist/${Date.now()}_${idx}.${file.name.split(".").pop()}`;
      const { error } = await supabase.storage.from("checklist-fotos").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("checklist-fotos").getPublicUrl(path);
      updateItem(idx, { foto_url: publicUrl });
      toast.success("Foto enviada!");
    } catch (e: any) { toast.error("Erro: " + e.message); }
  };

  const handleSave = async () => {
    if (!veiculoId || !motoristaId) { toast.error("Selecione veículo e motorista"); return; }
    setSaving(true);
    try {
      const nok = itens.filter(i => i.status === "nao_ok").length;
      const ok = itens.filter(i => i.status === "ok").length;
      const status = nok > 0 ? "reprovado" : ok > 0 ? "aprovado" : "pendente";
      const { data: cl, error } = await supabase.from("checklists").insert({
        veiculo_id: veiculoId, motorista_id: motoristaId, filial_id: filialId,
        km: km ? Number(km) : null, status, itens: itens.filter(i => i.status !== "nao_aplicavel"),
        data: new Date().toISOString(),
      }).select().single();
      if (error) throw error;
      for (const it of itens.filter(i => i.foto_url && i.status === "nao_ok")) {
        await supabase.from("checklist_fotos" as never).insert({
          checklist_id: cl.id, item_nome: it.item, foto_url: it.foto_url,
          observacao: it.observacao, filial_id: filialId,
        } as never);
      }
      toast.success("Checklist salvo!");
      qc.invalidateQueries({ queryKey: ["checklists"] });
      onClose();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-primary" />Nova Inspeção</DialogTitle></DialogHeader>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div><Label className="text-xs">Veículo *</Label>
            <Select value={veiculoId} onValueChange={setVeiculoId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>{veiculos.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.placa} — {v.modelo}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">Motorista *</Label>
            <Select value={motoristaId} onValueChange={setMotoristaId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>{motoristas.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">KM atual</Label>
            <Input className="mt-1" type="number" placeholder="Ex: 125000" value={km} onChange={e => setKm(e.target.value)} />
          </div>
        </div>
        <div className="space-y-4">
          {CATEGORIAS.map(cat => {
            const catItens = itens.filter(i => i.categoria === cat.id);
            const nok = catItens.filter(i => i.status === "nao_ok").length;
            return (
              <Card key={cat.id} className={`border ${nok > 0 ? "border-red-500/30" : "border-border/50"}`}>
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <cat.icon className="h-4 w-4 text-primary" />{cat.label}
                    {nok > 0 && <Badge className="bg-red-500/15 text-red-400 border-red-500/30 ml-auto">{nok} problema(s)</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-2">
                  {cat.itens.map(itemNome => {
                    const idx = itens.findIndex(i => i.categoria === cat.id && i.item === itemNome);
                    const it = itens[idx];
                    if (!it) return null;
                    return (
                      <div key={itemNome} className={`rounded-lg p-3 ${it.status === "nao_ok" ? "bg-red-500/5 border border-red-500/20" : "bg-card/50"}`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm">{itemNome}</span>
                          <div className="flex gap-1">
                            {(["ok","nao_ok","nao_aplicavel"] as ItemStatus[]).map(s => (
                              <button key={s} onClick={() => updateItem(idx, { status: s })}
                                className={`text-xs px-2 py-1 rounded-md border transition-all ${it.status === s
                                  ? s === "ok" ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                                    : s === "nao_ok" ? "bg-red-500/20 border-red-500/40 text-red-400"
                                    : "bg-muted border-border text-muted-foreground"
                                  : "border-border/50 text-muted-foreground hover:bg-muted"}`}>
                                {s === "ok" ? "OK" : s === "nao_ok" ? "N/OK" : "N/A"}
                              </button>
                            ))}
                          </div>
                        </div>
                        {it.status === "nao_ok" && (
                          <div className="mt-2 space-y-2">
                            <Textarea placeholder="Descreva o problema..." className="text-xs h-16 bg-background/50"
                              value={it.observacao || ""} onChange={e => updateItem(idx, { observacao: e.target.value })} />
                            <label className="cursor-pointer">
                              <div className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-dashed border-primary/50 text-primary hover:bg-primary/10 transition-all">
                                <Camera className="h-3.5 w-3.5" />{it.foto_url ? "✅ Foto anexada" : "📷 Adicionar foto"}
                              </div>
                              <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleFoto(idx, e.target.files[0])} />
                            </label>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t border-border/50 mt-4">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar Checklist"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Page() {
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<any>(null);
  const [fotoAberta, setFotoAberta] = useState<string | null>(null);

  const { data: registros = [], isLoading } = useQuery({
    queryKey: ["checklists"],
    queryFn: async () => {
      const { data, error } = await supabase.from("checklists")
        .select("*, veiculos(placa,modelo), motoristas(nome)")
        .order("data", { ascending: false }).limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: fotos = [] } = useQuery({
    queryKey: ["checklist-fotos"],
    queryFn: async () => {
      const { data } = await supabase.from("checklist_fotos" as never)
        .select("*").order("created_at", { ascending: false }).limit(100);
      return (data ?? []) as any[];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("checklists").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Removido"); qc.invalidateQueries({ queryKey: ["checklists"] }); setDeleting(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = registros.filter((r: any) => {
    const q = search.toLowerCase();
    return (!q || r.veiculos?.placa?.toLowerCase().includes(q) || r.motoristas?.nome?.toLowerCase().includes(q))
      && (filtroStatus === "todos" || r.status === filtroStatus);
  });

  const aprovados = registros.filter((r: any) => r.status === "aprovado").length;
  const reprovados = registros.filter((r: any) => r.status === "reprovado").length;
  const pendentes = registros.filter((r: any) => r.status === "pendente").length;

  const downloadCSV = () => {
    const rows = filtered.map((r: any) => ({ Data: new Date(r.data).toLocaleString("pt-BR"), Veiculo: r.veiculos?.placa ?? "", Motorista: r.motoristas?.nome ?? "", KM: r.km ?? "", Status: r.status }));
    if (!rows.length) { toast.error("Sem dados"); return; }
    const csv = [Object.keys(rows[0]).join(";"), ...rows.map((r: any) => Object.values(r).join(";"))].join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
    a.download = `checklist-${new Date().toISOString().slice(0,10)}.csv`; a.click();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold">Checklist</h1><p className="text-sm text-muted-foreground">Inspeções pré-viagem com fotos</p></div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={downloadCSV}><Download className="h-4 w-4 mr-1.5" />CSV</Button>
          <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1.5" />Nova inspeção</Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {[{ label: "Aprovados", value: aprovados, color: "text-emerald-400", icon: CheckCircle2 },
          { label: "Reprovados", value: reprovados, color: "text-red-400", icon: XCircle },
          { label: "Pendentes", value: pendentes, color: "text-yellow-400", icon: Clock }].map(k => (
          <Card key={k.label} className="border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <k.icon className={`h-8 w-8 ${k.color} opacity-80`} />
              <div><p className="text-xs text-muted-foreground">{k.label}</p><p className={`text-2xl font-bold ${k.color}`}>{k.value}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="lista">
        <TabsList className="bg-card border border-border/50">
          <TabsTrigger value="lista">Lista</TabsTrigger>
          <TabsTrigger value="fotos"><Camera className="h-3.5 w-3.5 mr-1.5" />Fotos Críticas</TabsTrigger>
        </TabsList>

        <TabsContent value="lista" className="mt-3">
          <Card className="border-border/50">
            <CardContent className="p-0">
              <div className="p-3 border-b border-border/50 flex gap-3 flex-wrap">
                <div className="relative flex-1 min-w-48">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input className="pl-9 h-8 text-sm" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                  <SelectTrigger className="w-36 h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="aprovado">Aprovado</SelectItem>
                    <SelectItem value="reprovado">Reprovado</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow className="border-border/50"><TableHead>Data</TableHead><TableHead>Veículo</TableHead><TableHead>Motorista</TableHead><TableHead>KM</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {isLoading ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm">Carregando...</TableCell></TableRow>
                      : filtered.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground text-sm">Nenhum checklist encontrado</TableCell></TableRow>
                      : filtered.map((r: any) => (
                        <TableRow key={r.id} className="border-border/30 hover:bg-card/50">
                          <TableCell className="text-xs">{new Date(r.data).toLocaleString("pt-BR")}</TableCell>
                          <TableCell className="font-mono text-sm font-semibold">{r.veiculos?.placa ?? "—"}</TableCell>
                          <TableCell className="text-sm">{r.motoristas?.nome ?? "—"}</TableCell>
                          <TableCell className="text-xs">{r.km?.toLocaleString("pt-BR") ?? "—"}</TableCell>
                          <TableCell><Badge variant="outline" className={`capitalize text-xs ${statusColor[r.status]}`}>{r.status}</Badge></TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleting(r)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fotos" className="mt-3">
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Camera className="h-4 w-4 text-red-400" />Fotos de Itens Críticos
                <Badge className="bg-red-500/15 text-red-400 border-red-500/30 ml-auto">Visível p/ Responsáveis</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {fotos.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Camera className="h-10 w-10 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">Nenhuma foto crítica registrada</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {fotos.map((f: any) => (
                    <div key={f.id} className="rounded-xl overflow-hidden border border-border/50 bg-card cursor-pointer hover:border-primary/50 transition-all" onClick={() => setFotoAberta(f.foto_url)}>
                      <img src={f.foto_url} alt={f.item_nome} className="w-full h-32 object-cover" />
                      <div className="p-2">
                        <p className="text-xs font-medium truncate">{f.item_nome}</p>
                        {f.observacao && <p className="text-[10px] text-red-400 truncate">{f.observacao}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {profile?.filialId && <NovoChecklistDialog open={open} onClose={() => setOpen(false)} filialId={profile.filialId} />}

      {fotoAberta && (
        <Dialog open onOpenChange={() => setFotoAberta(null)}>
          <DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Foto do item crítico</DialogTitle></DialogHeader>
            <img src={fotoAberta} alt="Foto" className="w-full rounded-lg object-contain max-h-[60vh]" />
          </DialogContent>
        </Dialog>
      )}

      <AlertDialog open={!!deleting} onOpenChange={o => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Remover checklist?</AlertDialogTitle></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleting && del.mutate(deleting.id)}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
