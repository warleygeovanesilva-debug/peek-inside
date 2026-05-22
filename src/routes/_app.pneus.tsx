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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, Search, Download, CircleDot } from "lucide-react";
import { PneuFormDialog } from "@/components/pneu-form-dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/pneus")({
  head: () => ({ meta: [{ title: "Pneus — FrotaPro" }] }),
  component: Page,
});

const statusColor: Record<string, string> = {
  em_uso: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  estoque: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  recapagem: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  descartado: "bg-muted/50 text-muted-foreground border-border/50",
};

const LAYOUTS: Record<string, { label: string; posicoes: string[] }> = {
  carro: { label: "Carro / Van", posicoes: ["DE","DD","TE","TD","ESTEPE"] },
  truck_simples: { label: "Caminhão Simples", posicoes: ["DE","DD","TE1","TE2","TD1","TD2","ESTEPE"] },
  truck_toco: { label: "Caminhão Toco", posicoes: ["DE","DD","T1E1","T1E2","T1D1","T1D2","T2E1","T2E2","T2D1","T2D2","ESTEPE"] },
  bitruck: { label: "Bitruck", posicoes: ["DE","DD","T1E1","T1E2","T1D1","T1D2","T2E1","T2E2","T2D1","T2D2","T3E1","T3E2","T3D1","T3D2","ESTEPE"] },
};

const POSICAO_LABEL: Record<string, string> = {
  DE:"Diant.Esq", DD:"Diant.Dir", TE:"Tras.Esq", TD:"Tras.Dir",
  TE1:"Tras.E1", TE2:"Tras.E2", TD1:"Tras.D1", TD2:"Tras.D2",
  T1E1:"T1-E1", T1E2:"T1-E2", T1D1:"T1-D1", T1D2:"T1-D2",
  T2E1:"T2-E1", T2E2:"T2-E2", T2D1:"T2-D1", T2D2:"T2-D2",
  T3E1:"T3-E1", T3E2:"T3-E2", T3D1:"T3-D1", T3D2:"T3-D2",
  ESTEPE:"Estepe",
};

function DiagramaVeiculo({ veiculoId, pneus }: { veiculoId: string; pneus: any[] }) {
  const [tipoLayout, setTipoLayout] = useState("truck_simples");
  const [selectedPos, setSelectedPos] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data: posicoes = [] } = useQuery({
    queryKey: ["posicoes-pneu", veiculoId],
    queryFn: async () => {
      const { data } = await supabase.from("veiculo_posicoes_pneu" as never)
        .select("*, pneus(numero_serie,marca,medida)").eq("veiculo_id" as never, veiculoId);
      return (data ?? []) as any[];
    },
  });

  const layout = LAYOUTS[tipoLayout];
  const getPosicao = (pos: string) => posicoes.find((p: any) => p.posicao === pos);

  const vincular = async (posicao: string, pneuId: string) => {
    await supabase.from("veiculo_posicoes_pneu" as never).upsert({
      veiculo_id: veiculoId, posicao, pneu_id: pneuId || null, updated_at: new Date().toISOString(),
    } as never, { onConflict: "veiculo_id,posicao" });
    qc.invalidateQueries({ queryKey: ["posicoes-pneu", veiculoId] });
    toast.success(`Posição ${posicao} atualizada`);
    setSelectedPos(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={tipoLayout} onValueChange={setTipoLayout}>
          <SelectTrigger className="w-52 h-8 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>{Object.entries(LAYOUTS).map(([k,v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">Clique numa posição para vincular pneu</span>
      </div>
      <div className="bg-card/50 rounded-xl border border-border/50 p-6">
        <div className="flex flex-wrap gap-3 justify-center">
          {layout.posicoes.map(pos => {
            const p = getPosicao(pos);
            const tem = !!p?.pneu_id;
            return (
              <button key={pos} onClick={() => setSelectedPos(pos)}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all min-w-[72px] ${tem ? "border-emerald-500/50 bg-emerald-500/10" : "border-dashed border-border hover:border-primary/50"}`}>
                <CircleDot className={`h-7 w-7 ${tem ? "text-emerald-400" : "text-muted-foreground/30"}`} />
                <span className="text-[10px] font-semibold text-center">{POSICAO_LABEL[pos] ?? pos}</span>
                <span className="text-[9px] text-center">{tem ? p?.pneus?.numero_serie ?? p?.pneus?.marca ?? "Vinculado" : "Vazio"}</span>
              </button>
            );
          })}
        </div>
      </div>
      {selectedPos && (
        <Dialog open onOpenChange={() => setSelectedPos(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Posição: {POSICAO_LABEL[selectedPos] ?? selectedPos}</DialogTitle></DialogHeader>
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start text-sm text-muted-foreground" onClick={() => vincular(selectedPos, "")}>Remover pneu desta posição</Button>
              {pneus.filter(p => p.status === "em_uso" || p.status === "estoque").map(p => (
                <Button key={p.id} variant="outline" className="w-full justify-start text-sm" onClick={() => vincular(selectedPos, p.id)}>
                  <CircleDot className="h-3.5 w-3.5 mr-2 text-primary" />{p.numero_serie} — {p.marca} {p.medida}
                </Button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function Page() {
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [editing, setEditing] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<any>(null);
  const [veiculoDiagrama, setVeiculoDiagrama] = useState("");

  const { data: pneus = [], isLoading } = useQuery({
    queryKey: ["pneus"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pneus").select("*, veiculos(placa,modelo)").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: veiculos = [] } = useQuery({
    queryKey: ["veiculos-select"],
    queryFn: async () => { const { data } = await supabase.from("veiculos").select("id,placa,modelo").order("placa"); return data ?? []; },
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("pneus").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Removido"); qc.invalidateQueries({ queryKey: ["pneus"] }); setDeleting(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = pneus.filter((p: any) => {
    const q = search.toLowerCase();
    return (!q || p.numero_serie?.toLowerCase().includes(q) || p.marca?.toLowerCase().includes(q) || p.veiculos?.placa?.toLowerCase().includes(q))
      && (filtroStatus === "todos" || p.status === filtroStatus);
  });

  const downloadCSV = () => {
    const rows = filtered.map((p: any) => ({ Serie: p.numero_serie??'', Marca: p.marca??'', Modelo: p.modelo??'', Medida: p.medida??'', Veiculo: p.veiculos?.placa??'', Posicao: p.posicao??'', KM: p.km_atual??'', Status: p.status }));
    if (!rows.length) { toast.error("Sem dados"); return; }
    const csv = [Object.keys(rows[0]).join(";"), ...rows.map((r: any) => Object.values(r).join(";"))].join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["\uFEFF"+csv], { type:"text/csv;charset=utf-8" }));
    a.download = `pneus-${new Date().toISOString().slice(0,10)}.csv`; a.click();
  };

  const canEdit = profile?.canEdit ?? false;
  const canDelete = profile?.isAdmin ?? false;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold">Pneus</h1><p className="text-sm text-muted-foreground">Controle e diagrama de posições</p></div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={downloadCSV}><Download className="h-4 w-4 mr-1.5" />CSV</Button>
          {canEdit && <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4 mr-1.5" />Novo pneu</Button>}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {[{ label:"Em uso", value: pneus.filter((p:any)=>p.status==="em_uso").length, color:"text-emerald-400" },
          { label:"Estoque", value: pneus.filter((p:any)=>p.status==="estoque").length, color:"text-blue-400" },
          { label:"Recapagem", value: pneus.filter((p:any)=>p.status==="recapagem").length, color:"text-yellow-400" }].map(k => (
          <Card key={k.label} className="border-border/50">
            <CardContent className="p-4"><p className="text-xs text-muted-foreground">{k.label}</p><p className={`text-2xl font-bold ${k.color}`}>{k.value}</p></CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="lista">
        <TabsList className="bg-card border border-border/50">
          <TabsTrigger value="lista">Lista de Pneus</TabsTrigger>
          <TabsTrigger value="diagrama"><CircleDot className="h-3.5 w-3.5 mr-1.5" />Diagrama</TabsTrigger>
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
                    <SelectItem value="em_uso">Em uso</SelectItem>
                    <SelectItem value="estoque">Estoque</SelectItem>
                    <SelectItem value="recapagem">Recapagem</SelectItem>
                    <SelectItem value="descartado">Descartado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow className="border-border/50"><TableHead>Série</TableHead><TableHead>Marca/Modelo</TableHead><TableHead>Medida</TableHead><TableHead>Veículo</TableHead><TableHead>Posição</TableHead><TableHead className="text-right">KM</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {isLoading ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground text-sm">Carregando...</TableCell></TableRow>
                      : filtered.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground text-sm">Nenhum pneu cadastrado</TableCell></TableRow>
                      : filtered.map((p: any) => (
                        <TableRow key={p.id} className="border-border/30 hover:bg-card/50">
                          <TableCell className="font-mono text-xs">{p.numero_serie??'—'}</TableCell>
                          <TableCell className="text-sm">{[p.marca,p.modelo].filter(Boolean).join(' ')||'—'}</TableCell>
                          <TableCell className="text-xs">{p.medida??'—'}</TableCell>
                          <TableCell className="font-mono text-xs">{p.veiculos?.placa??'—'}</TableCell>
                          <TableCell className="text-xs">{p.posicao??'—'}</TableCell>
                          <TableCell className="text-right text-xs">{p.km_atual?.toLocaleString('pt-BR')??'—'}</TableCell>
                          <TableCell><Badge variant="outline" className={`capitalize text-xs ${statusColor[p.status]}`}>{p.status?.replace('_',' ')}</Badge></TableCell>
                          <TableCell className="text-right">
                            {canEdit && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(p); setOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>}
                            {canDelete && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleting(p)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="diagrama" className="mt-3">
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-3">
                <CircleDot className="h-4 w-4 text-primary" />Diagrama de Pneus
                <div className="ml-auto">
                  <Select value={veiculoDiagrama} onValueChange={setVeiculoDiagrama}>
                    <SelectTrigger className="w-52 h-7 text-xs"><SelectValue placeholder="Selecione o veículo..." /></SelectTrigger>
                    <SelectContent>{veiculos.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.placa} — {v.modelo}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!veiculoDiagrama ? (
                <div className="py-12 text-center text-muted-foreground">
                  <CircleDot className="h-10 w-10 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">Selecione um veículo para ver o diagrama</p>
                </div>
              ) : <DiagramaVeiculo veiculoId={veiculoDiagrama} pneus={pneus} />}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {profile?.filialId && <PneuFormDialog open={open} onOpenChange={setOpen} registro={editing} filialId={profile.filialId} />}

      <AlertDialog open={!!deleting} onOpenChange={o => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Remover pneu?</AlertDialogTitle></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleting && del.mutate(deleting.id)}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
