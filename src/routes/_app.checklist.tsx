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
import { Plus, Pencil, Trash2, Search, Camera, CheckCircle2, XCircle, Clock, Download, Eye, AlertTriangle, Fuel, Wrench, FileText, Shield } from "lucide-react";
import { ChecklistFormDialog } from "@/components/checklist-form-dialog";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Checklist = Database["public"]["Tables"]["checklists"]["Row"];

export const Route = createFileRoute("/_app/checklist")({
  head: () => ({ meta: [{ title: "Checklist — FrotaPro" }] }),
  component: Page,
});

const statusColor: Record<string, string> = {
  aprovado: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  reprovado: "bg-red-500/15 text-red-400 border-red-500/30",
  pendente: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
};

const CATEGORIAS_CHECKLIST = [
  { id: "motor", label: "Motor e Fluidos", icon: Wrench, itens: ["Nível de óleo", "Nível de água/radiador", "Correia dentada", "Vazamentos", "Filtro de ar"] },
  { id: "seguranca", label: "Segurança", icon: Shield, itens: ["Freios", "Pneus (estado/calibragem)", "Estepe", "Cintos de segurança", "Extintor de incêndio", "Triângulo", "Macaco"] },
  { id: "iluminacao", label: "Iluminação", icon: AlertTriangle, itens: ["Faróis dianteiros", "Faróis traseiros", "Setas", "Luz de freio", "Luz de ré", "Pisca alerta"] },
  { id: "combustivel", label: "Combustível", icon: Fuel, itens: ["Nível de combustível", "Tanque sem vazamentos"] },
  { id: "documentos", label: "Documentos", icon: FileText, itens: ["CNH válida", "CRLV do veículo", "Seguro obrigatório (DPVAT)", "Tacógrafo"] },
  { id: "cabine", label: "Cabine/Carroceria", icon: Eye, itens: ["Espelhos retrovisores", "Limpadores de para-brisa", "Buzina", "Travas das portas", "Para-brisas sem trincas"] },
];

type ItemStatus = "ok" | "nao_ok" | "nao_aplicavel";

interface ChecklistItem {
  categoria: string;
  item: string;
  status: ItemStatus;
  observacao?: string;
  foto_url?: string;
  critico: boolean;
}

function FotoModal({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Foto do item crítico</DialogTitle></DialogHeader>
        <img src={url} alt="Foto item crítico" className="w-full rounded-lg object-contain max-h-[60vh]" />
      </DialogContent>
    </Dialog>
  );
}

function NovoChecklistDialog({ open, onClose, filialId }: { open: boolean; onClose: () => void; filialId: string }) {
  const qc = useQueryClient();
  const { data: profile } = useProfile();
  const [veiculoId, setVeiculoId] = useState("");
  const [motoristaId, setMotoristaId] = useState("");
  const [km, setKm] = useState("");
  const [itens, setItens] = useState<ChecklistItem[]>(
    CATEGORIAS_CHECKLIST.flatMap(cat =>
      cat.itens.map(item => ({ categoria: cat.id, item, status: "nao_aplicavel" as ItemStatus, critico: false }))
    )
  );
  const [saving, setSaving] = useState(false);
  const [fotoUploading, setFotoUploading] = useState<string | null>(null);

  const { data: veiculos = [] } = useQuery({
    queryKey: ["veiculos-select"],
    queryFn: async () => {
      const { data } = await supabase.from("veiculos").select("id, placa, modelo").eq("status", "ativo").order("placa");
      return data ?? [];
    },
  });

  const { data: motoristas = [] } = useQuery({
    queryKey: ["motoristas-select"],
    queryFn: async () => {
      const { data } = await supabase.from("motoristas").select("id, nome").eq("ativo", true).order("nome");
      return data ?? [];
    },
  });

  const updateItem = (idx: number, changes: Partial<ChecklistItem>) => {
    setItens(prev => prev.map((it, i) => i === idx ? { ...it, ...changes } : it));
  };

  const handleFoto = async (idx: number, file: File) => {
    setFotoUploading(`${idx}`);
    try {
      const ext = file.name.split(".").pop();
      const path = `checklist/${Date.now()}_${idx}.${ext}`;
      const { error } = await supabase.storage.from("checklist-fotos").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("checklist-fotos").getPublicUrl(path);
      updateItem(idx, { foto_url: publicUrl });
      toast.success("Foto enviada!");
    } catch (e: any) {
      toast.error("Erro ao enviar foto: " + e.message);
    } finally {
      setFotoUploading(null);
    }
  };

  const handleSave = async () => {
    if (!veiculoId || !motoristaId) { toast.error("Selecione veículo e motorista"); return; }
    setSaving(true);
    try {
      const itensOk = itens.filter(i => i.status !== "nao_aplicavel").length;
      const itensNok = itens.filter(i => i.status === "nao_ok").length;
      const status = itensNok > 0 ? "reprovado" : itensOk > 0 ? "aprovado" : "pendente";

      const { data: cl, error } = await supabase.from("checklists").insert({
        veiculo_id: veiculoId,
        motorista_id: motoristaId,
        filial_id: filialId,
        km: km ? Number(km) : null,
        status,
        itens: itens.filter(i => i.status !== "nao_aplicavel"),
        data: new Date().toISOString(),
      }).select().single();
      if (error) throw error;

      // Salvar fotos de itens críticos
      const criticos = itens.filter(i => i.foto_url && i.status === "nao_ok");
      for (const it of criticos) {
        await supabase.from("checklist_fotos" as never).insert({
          checklist_id: cl.id,
          item_nome: it.item,
          foto_url: it.foto_url,
          observacao: it.observacao,
          filial_id: filialId,
          uploaded_by: profile?.profile?.id,
        });
      }

      toast.success("Checklist salvo com sucesso!");
      qc.invalidateQueries({ queryKey: ["checklists"] });
      qc.invalidateQueries({ queryKey: ["checklist-fotos-criticos"] });
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const statusIcon = (s: ItemStatus) => {
    if (s === "ok") return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
    if (s === "nao_ok") return <XCircle className="h-4 w-4 text-red-400" />;
    return <Clock className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Novo Checklist de Inspeção
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div>
            <Label className="text-xs">Veículo *</Label>
            <Select value={veiculoId} onValueChange={setVeiculoId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {veiculos.map(v => <SelectItem key={v.id} value={v.id}>{v.placa} — {v.modelo}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Motorista *</Label>
            <Select value={motoristaId} onValueChange={setMotoristaId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {motoristas.map(m => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">KM atual</Label>
            <Input className="mt-1" type="number" placeholder="Ex: 125000" value={km} onChange={e => setKm(e.target.value)} />
          </div>
        </div>

        <div className="space-y-4">
          {CATEGORIAS_CHECKLIST.map(cat => {
            const catItens = itens.filter(i => i.categoria === cat.id);
            const nok = catItens.filter(i => i.status === "nao_ok").length;
            return (
              <Card key={cat.id} className={`border ${nok > 0 ? "border-red-500/30" : "border-border/50"}`}>
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <cat.icon className="h-4 w-4 text-primary" />
                    {cat.label}
                    {nok > 0 && <Badge className="bg-red-500/15 text-red-400 border-red-500/30 ml-auto">{nok} problema(s)</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-3">
                  {cat.itens.map((itemNome) => {
                    const globalIdx = itens.findIndex(i => i.categoria === cat.id && i.item === itemNome);
                    const it = itens[globalIdx];
                    if (!it) return null;
                    return (
                      <div key={itemNome} className={`rounded-lg p-3 ${it.status === "nao_ok" ? "bg-red-500/5 border border-red-500/20" : "bg-card/50"}`}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {statusIcon(it.status)}
                            <span className="text-sm">{itemNome}</span>
                          </div>
                          <div className="flex gap-1">
                            {(["ok", "nao_ok", "nao_aplicavel"] as ItemStatus[]).map(s => (
                              <button
                                key={s}
                                onClick={() => updateItem(globalIdx, { status: s })}
                                className={`text-xs px-2 py-1 rounded-md border transition-all ${it.status === s
                                  ? s === "ok" ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                                    : s === "nao_ok" ? "bg-red-500/20 border-red-500/40 text-red-400"
                                    : "bg-muted border-border text-muted-foreground"
                                  : "border-border/50 text-muted-foreground hover:bg-muted"}`}
                              >
                                {s === "ok" ? "OK" : s === "nao_ok" ? "N/OK" : "N/A"}
                              </button>
                            ))}
                          </div>
                        </div>

                        {it.status === "nao_ok" && (
                          <div className="mt-2 space-y-2">
                            <Textarea
                              placeholder="Descreva o problema encontrado..."
                              className="text-xs h-16 bg-background/50"
                              value={it.observacao || ""}
                              onChange={e => updateItem(globalIdx, { observacao: e.target.value })}
                            />
                            <div className="flex items-center gap-2">
                              <label className="cursor-pointer">
                                <div className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-dashed border-primary/50 text-primary hover:bg-primary/10 transition-all ${fotoUploading === `${globalIdx}` ? "opacity-50" : ""}`}>
                                  <Camera className="h-3.5 w-3.5" />
                                  {fotoUploading === `${globalIdx}` ? "Enviando..." : it.foto_url ? "Trocar foto" : "📷 Adicionar foto"}
                                </div>
                                <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleFoto(globalIdx, e.target.files[0])} />
                              </label>
                              {it.foto_url && (
                                <span className="text-xs text-emerald-400 flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3" /> Foto anexada
                                </span>
                              )}
                            </div>
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
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar Checklist"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FotosPanel() {
  const [fotoAberta, setFotoAberta] = useState<string | null>(null);
  const { data: fotos = [], isLoading } = useQuery({
    queryKey: ["checklist-fotos-criticos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("checklist_fotos" as never)
        .select("*, checklists(data, veiculos(placa), motoristas(nome))")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as any[];
    },
  });

  if (isLoading) return <div className="py-8 text-center text-muted-foreground text-sm">Carregando fotos...</div>;
  if (!fotos.length) return (
    <div className="py-12 text-center text-muted-foreground">
      <Camera className="h-10 w-10 mx-auto mb-3 opacity-30" />
      <p className="text-sm">Nenhuma foto de item crítico registrada</p>
    </div>
  );

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {fotos.map((f: any) => (
          <div key={f.id} className="group relative rounded-xl overflow-hidden border border-border/50 bg-card cursor-pointer hover:border-primary/50 transition-all" onClick={() => setFotoAberta(f.foto_url)}>
            <img src={f.foto_url} alt={f.item_nome} className="w-full h-36 object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="p-2">
              <p className="text-xs font-medium truncate">{f.item_nome}</p>
              <p className="text-[10px] text-muted-foreground truncate">{f.checklists?.veiculos?.placa} · {f.checklists?.motoristas?.nome}</p>
              {f.observacao && <p className="text-[10px] text-red-400 truncate mt-0.5">{f.observacao}</p>}
            </div>
            <div className="absolute top-2 right-2">
              <Badge className="bg-red-500/80 text-white border-0 text-[10px]">Crítico</Badge>
            </div>
          </div>
        ))}
      </div>
      {fotoAberta && <FotoModal url={fotoAberta} onClose={() => setFotoAberta(null)} />}
    </div>
  );
}

function Page() {
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<Checklist | null>(null);

  const { data: registros = [], isLoading } = useQuery({
    queryKey: ["checklists"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("checklists")
        .select("*, veiculos(placa, modelo), motoristas(nome)")
        .order("data", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as (Checklist & { veiculos: { placa: string; modelo: string } | null; motoristas: { nome: string } | null })[];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("checklists").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Removido"); qc.invalidateQueries({ queryKey: ["checklists"] }); setDeleting(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = registros.filter((r) => {
    const q = search.toLowerCase();
    const matchSearch = !q || r.veiculos?.placa?.toLowerCase().includes(q) || r.motoristas?.nome?.toLowerCase().includes(q);
    const matchStatus = filtroStatus === "todos" || r.status === filtroStatus;
    return matchSearch && matchStatus;
  });

  const aprovados = registros.filter(r => r.status === "aprovado").length;
  const reprovados = registros.filter(r => r.status === "reprovado").length;
  const pendentes = registros.filter(r => r.status === "pendente").length;
  const canDelete = profile?.isAdmin ?? false;

  const downloadCSV = () => {
    const rows = filtered.map(r => ({
      Data: new Date(r.data).toLocaleString("pt-BR"),
      Veiculo: r.veiculos?.placa ?? "",
      Modelo: r.veiculos?.modelo ?? "",
      Motorista: r.motoristas?.nome ?? "",
      KM: r.km ?? "",
      Status: r.status,
      Itens: Array.isArray(r.itens) ? r.itens.length : 0,
    }));
    const csv = [Object.keys(rows[0]).join(";"), ...rows.map(r => Object.values(r).join(";"))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `checklist-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Checklist</h1>
          <p className="text-sm text-muted-foreground">Inspeções pré-viagem profissionais com fotos</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={downloadCSV}><Download className="h-4 w-4 mr-1.5" />Exportar CSV</Button>
          <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1.5" />Nova inspeção</Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {[
          { label: "Aprovados", value: aprovados, color: "text-emerald-400", bg: "bg-emerald-500/10", icon: CheckCircle2 },
          { label: "Reprovados", value: reprovados, color: "text-red-400", bg: "bg-red-500/10", icon: XCircle },
          { label: "Pendentes", value: pendentes, color: "text-yellow-400", bg: "bg-yellow-500/10", icon: Clock },
        ].map(k => (
          <Card key={k.label} className="border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`h-10 w-10 rounded-xl ${k.bg} flex items-center justify-center`}>
                <k.icon className={`h-5 w-5 ${k.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{k.label}</p>
                <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="lista">
        <TabsList className="bg-card border border-border/50">
          <TabsTrigger value="lista">Lista de Checklists</TabsTrigger>
          <TabsTrigger value="fotos" className="flex items-center gap-1.5">
            <Camera className="h-3.5 w-3.5" /> Fotos Críticas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lista" className="mt-3">
          <Card className="border-border/50">
            <CardContent className="p-0">
              <div className="p-3 border-b border-border/50 flex gap-3 flex-wrap">
                <div className="relative flex-1 min-w-48">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input className="pl-9 h-8 text-sm" placeholder="Buscar por placa ou motorista..." value={search} onChange={e => setSearch(e.target.value)} />
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
                  <TableHeader>
                    <TableRow className="border-border/50">
                      <TableHead>Data</TableHead>
                      <TableHead>Veículo</TableHead>
                      <TableHead>Motorista</TableHead>
                      <TableHead>KM</TableHead>
                      <TableHead>Itens</TableHead>
                      <TableHead>Fotos</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground text-sm">Carregando...</TableCell></TableRow>
                    ) : filtered.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground text-sm">
                        <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-20" />
                        Nenhum checklist encontrado
                      </TableCell></TableRow>
                    ) : filtered.map(r => {
                      const itensArr = Array.isArray(r.itens) ? r.itens as any[] : [];
                      const nok = itensArr.filter(i => i.status === "nao_ok").length;
                      const comFoto = itensArr.filter(i => i.foto_url).length;
                      return (
                        <TableRow key={r.id} className="border-border/30 hover:bg-card/50">
                          <TableCell className="text-xs">{new Date(r.data).toLocaleString("pt-BR")}</TableCell>
                          <TableCell className="font-mono text-sm font-semibold">{r.veiculos?.placa ?? "—"}</TableCell>
                          <TableCell className="text-sm">{r.motoristas?.nome ?? "—"}</TableCell>
                          <TableCell className="text-xs">{r.km?.toLocaleString("pt-BR") ?? "—"}</TableCell>
                          <TableCell>
                            <span className="text-xs">{itensArr.length} itens</span>
                            {nok > 0 && <Badge className="ml-1 bg-red-500/15 text-red-400 border-red-500/30 text-[10px]">{nok} N/OK</Badge>}
                          </TableCell>
                          <TableCell>
                            {comFoto > 0 ? (
                              <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px]">
                                <Camera className="h-2.5 w-2.5 mr-1" />{comFoto}
                              </Badge>
                            ) : <span className="text-xs text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`capitalize text-xs ${statusColor[r.status]}`}>{r.status}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {canDelete && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleting(r)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>}
                          </TableCell>
                        </TableRow>
                      );
                    })}
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
                <Camera className="h-4 w-4 text-red-400" />
                Fotos de Itens Críticos
                <Badge className="bg-red-500/15 text-red-400 border-red-500/30 ml-auto">Visível p/ Responsáveis e Super Admin</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent><FotosPanel /></CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {profile?.filialId && (
        <NovoChecklistDialog open={open} onClose={() => setOpen(false)} filialId={profile.filialId} />
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
