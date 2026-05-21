import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/use-profile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Download, FileBarChart, Upload, FileText, Wrench, Fuel, CircleDot, ClipboardCheck, AlertTriangle, TrendingUp, Trophy, Building2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios & BI — FrotaPro" }] }),
  component: Page,
});

const COLORS = ["#4f46e5", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4"];

function toCSV(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const keys = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = String(v).replace(/"/g, '""');
    return /[",\n;]/.test(s) ? `"${s}"` : s;
  };
  return [keys.join(";"), ...rows.map(r => keys.map(k => esc(r[k])).join(";"))].join("\n");
}

function downloadCSV(name: string, rows: Record<string, unknown>[]) {
  if (!rows.length) { toast.error("Sem dados para exportar"); return; }
  const blob = new Blob(["\uFEFF" + toCSV(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

function FiltroPeriodo({ inicio, fim, onInicio, onFim }: { inicio: string; fim: string; onInicio: (v: string) => void; onFim: (v: string) => void }) {
  return (
    <div className="flex gap-3 items-end flex-wrap">
      <div>
        <Label className="text-xs text-muted-foreground">De</Label>
        <Input type="date" className="h-8 text-sm mt-1 w-36" value={inicio} onChange={e => onInicio(e.target.value)} />
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">Até</Label>
        <Input type="date" className="h-8 text-sm mt-1 w-36" value={fim} onChange={e => onFim(e.target.value)} />
      </div>
    </div>
  );
}

function Page() {
  const { data: profile } = useProfile();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [inicioPeriodo, setInicioPeriodo] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 3);
    return d.toISOString().slice(0, 10);
  });
  const [fimPeriodo, setFimPeriodo] = useState(() => new Date().toISOString().slice(0, 10));

  // ── Queries ──
  const { data: abast = [] } = useQuery({
    queryKey: ["rel_abastecimentos", inicioPeriodo, fimPeriodo],
    queryFn: async () => {
      const { data, error } = await supabase.from("abastecimentos")
        .select("*, veiculos(placa, modelo), motoristas(nome)")
        .gte("data", inicioPeriodo).lte("data", fimPeriodo + "T23:59:59")
        .order("data", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: manut = [] } = useQuery({
    queryKey: ["rel_manutencoes", inicioPeriodo, fimPeriodo],
    queryFn: async () => {
      const { data, error } = await supabase.from("manutencoes")
        .select("*, veiculos(placa, modelo)")
        .gte("data_prevista", inicioPeriodo).lte("data_prevista", fimPeriodo + "T23:59:59")
        .order("data_prevista", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: pneus = [] } = useQuery({
    queryKey: ["rel_pneus"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pneus").select("*, veiculos(placa)").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: ocorrencias = [] } = useQuery({
    queryKey: ["rel_ocorrencias", inicioPeriodo, fimPeriodo],
    queryFn: async () => {
      const { data, error } = await supabase.from("ocorrencias")
        .select("*, veiculos(placa), motoristas(nome)")
        .gte("data", inicioPeriodo).lte("data", fimPeriodo + "T23:59:59")
        .order("data", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: checklists = [] } = useQuery({
    queryKey: ["rel_checklists", inicioPeriodo, fimPeriodo],
    queryFn: async () => {
      const { data, error } = await supabase.from("checklists")
        .select("*, veiculos(placa), motoristas(nome)")
        .gte("data", inicioPeriodo).lte("data", fimPeriodo + "T23:59:59")
        .order("data", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: consumo = [] } = useQuery({
    queryKey: ["kpi_consumo"],
    queryFn: async () => {
      const { data, error } = await supabase.from("kpi_consumo_veiculo" as never).select("*");
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: custoVeiculo = [] } = useQuery({
    queryKey: ["kpi_custo"],
    queryFn: async () => {
      const { data, error } = await supabase.from("kpi_custo_veiculo" as never).select("*");
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: ranking = [] } = useQuery({
    queryKey: ["kpi_ranking"],
    queryFn: async () => {
      const { data, error } = await supabase.from("kpi_ranking_motoristas" as never).select("*").order("consumo_medio_kml", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: kpiFilial = [] } = useQuery({
    queryKey: ["kpi_filial"],
    queryFn: async () => {
      const { data, error } = await supabase.from("kpi_por_filial" as never).select("*");
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: nfes = [] } = useQuery({
    queryKey: ["nfes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("nfe_importadas" as never).select("*, nfe_itens(*)").order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  // ── Importar XML NF-e ──
  const importarXML = async (file: File) => {
    setImporting(true);
    try {
      const text = await file.text();
      const parser = new DOMParser();
      const xml = parser.parseFromString(text, "text/xml");
      const get = (tag: string) => xml.getElementsByTagName(tag)[0]?.textContent ?? null;

      const chave = get("chNFe") ?? get("Id")?.replace("NFe", "") ?? null;
      const numero = get("nNF");
      const dataEmissao = get("dhEmi")?.slice(0, 10) ?? get("dEmi") ?? null;
      const cnpj = get("CNPJ");
      const xNome = get("xNome");
      const vNF = get("vNF");

      const { data: nfe, error: nfeErr } = await supabase.from("nfe_importadas" as never).insert({
        filial_id: profile?.filialId,
        chave_acesso: chave,
        numero_nf: numero,
        data_emissao: dataEmissao,
        fornecedor_cnpj: cnpj,
        fornecedor_nome: xNome,
        valor_total: vNF ? parseFloat(vNF) : null,
        xml_raw: text,
        status: "importada",
        created_by: profile?.profile?.id,
      } as never).select().single();
      if (nfeErr) throw nfeErr;

      // Importar itens do XML
      const dets = xml.getElementsByTagName("det");
      const itens = [];
      for (let i = 0; i < dets.length; i++) {
        const det = dets[i];
        const xProd = det.getElementsByTagName("xProd")[0]?.textContent ?? "";
        const qCom = det.getElementsByTagName("qCom")[0]?.textContent ?? "0";
        const uCom = det.getElementsByTagName("uCom")[0]?.textContent ?? "";
        const vUnCom = det.getElementsByTagName("vUnCom")[0]?.textContent ?? "0";
        const vProd = det.getElementsByTagName("vProd")[0]?.textContent ?? "0";
        const NCM = det.getElementsByTagName("NCM")[0]?.textContent ?? "";
        itens.push({
          nfe_id: (nfe as any).id,
          descricao: xProd,
          quantidade: parseFloat(qCom),
          unidade: uCom,
          valor_unitario: parseFloat(vUnCom),
          valor_total: parseFloat(vProd),
          ncm: NCM,
          tipo: "peca",
        });
      }
      if (itens.length > 0) {
        await supabase.from("nfe_itens" as never).insert(itens as never);
      }

      toast.success(`NF-e importada! ${itens.length} itens extraídos. Vincule os itens aos veículos.`);
    } catch (e: any) {
      toast.error("Erro ao importar XML: " + e.message);
    } finally {
      setImporting(false);
    }
  };

  const medalColor = (i: number) => i === 0 ? "bg-amber-400" : i === 1 ? "bg-slate-400" : i === 2 ? "bg-orange-400" : "bg-muted/50 text-muted-foreground";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Relatórios & BI</h1>
          <p className="text-sm text-muted-foreground">Exportação, análises e inteligência de negócio</p>
        </div>
        <FiltroPeriodo inicio={inicioPeriodo} fim={fimPeriodo} onInicio={setInicioPeriodo} onFim={setFimPeriodo} />
      </div>

      <Tabs defaultValue="abastecimento">
        <TabsList className="bg-card border border-border/50 flex-wrap h-auto gap-1">
          {[
            { value: "abastecimento", icon: Fuel, label: "Abastecimento" },
            { value: "manutencao", icon: Wrench, label: "Manutenção" },
            { value: "pneus", icon: CircleDot, label: "Pneus" },
            { value: "checklist", icon: ClipboardCheck, label: "Checklist" },
            { value: "ocorrencias", icon: AlertTriangle, label: "Ocorrências" },
            { value: "nfe", icon: FileText, label: "NF-e" },
            { value: "bi", icon: TrendingUp, label: "BI" },
          ].map(t => (
            <TabsTrigger key={t.value} value={t.value} className="flex items-center gap-1.5 text-xs">
              <t.icon className="h-3.5 w-3.5" />{t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ABASTECIMENTO */}
        <TabsContent value="abastecimento" className="mt-3">
          <Card className="border-border/50">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Abastecimentos ({abast.length})</CardTitle>
              <Button size="sm" variant="outline" onClick={() => downloadCSV("abastecimentos", abast.map((a: any) => ({ Data: a.data?.slice(0,10), Placa: a.veiculos?.placa, Modelo: a.veiculos?.modelo, Motorista: a.motoristas?.nome, Combustivel: a.combustivel, Litros: a.litros, Valor: a.valor_total, KM: a.km_abastecido, Consumo_kml: a.consumo_kml })))}>
                <Download className="h-3.5 w-3.5 mr-1.5" />CSV
              </Button>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader><TableRow className="border-border/50"><TableHead>Data</TableHead><TableHead>Placa</TableHead><TableHead>Motorista</TableHead><TableHead>Combustível</TableHead><TableHead className="text-right">Litros</TableHead><TableHead className="text-right">Valor</TableHead><TableHead className="text-right">km/L</TableHead></TableRow></TableHeader>
                <TableBody>
                  {abast.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-sm">Sem dados no período</TableCell></TableRow>
                    : abast.slice(0, 100).map((a: any) => (
                      <TableRow key={a.id} className="border-border/30">
                        <TableCell className="text-xs">{a.data?.slice(0,10)}</TableCell>
                        <TableCell className="font-mono text-xs font-semibold">{a.veiculos?.placa ?? "—"}</TableCell>
                        <TableCell className="text-xs">{a.motoristas?.nome ?? "—"}</TableCell>
                        <TableCell className="text-xs">{a.combustivel ?? "—"}</TableCell>
                        <TableCell className="text-right text-xs">{Number(a.litros).toFixed(1)}</TableCell>
                        <TableCell className="text-right text-xs font-medium">R$ {Number(a.valor_total).toFixed(2)}</TableCell>
                        <TableCell className="text-right text-xs">{a.consumo_kml ? Number(a.consumo_kml).toFixed(2) : "—"}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* MANUTENÇÃO */}
        <TabsContent value="manutencao" className="mt-3">
          <Card className="border-border/50">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Manutenções ({manut.length})</CardTitle>
              <Button size="sm" variant="outline" onClick={() => downloadCSV("manutencoes", manut.map((m: any) => ({ Data: m.data_prevista?.slice(0,10), Placa: m.veiculos?.placa, Tipo: m.tipo, Descricao: m.descricao, Status: m.status, Custo: m.custo, Km: m.km_veiculo })))}>
                <Download className="h-3.5 w-3.5 mr-1.5" />CSV
              </Button>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader><TableRow className="border-border/50"><TableHead>Data</TableHead><TableHead>Placa</TableHead><TableHead>Tipo</TableHead><TableHead>Descrição</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Custo</TableHead></TableRow></TableHeader>
                <TableBody>
                  {manut.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm">Sem dados no período</TableCell></TableRow>
                    : manut.slice(0, 100).map((m: any) => (
                      <TableRow key={m.id} className="border-border/30">
                        <TableCell className="text-xs">{m.data_prevista?.slice(0,10) ?? "—"}</TableCell>
                        <TableCell className="font-mono text-xs font-semibold">{m.veiculos?.placa ?? "—"}</TableCell>
                        <TableCell className="text-xs capitalize">{m.tipo ?? "—"}</TableCell>
                        <TableCell className="text-xs max-w-48 truncate">{m.descricao ?? "—"}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px] capitalize">{m.status}</Badge></TableCell>
                        <TableCell className="text-right text-xs font-medium">R$ {Number(m.custo ?? 0).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PNEUS */}
        <TabsContent value="pneus" className="mt-3">
          <Card className="border-border/50">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Pneus ({pneus.length})</CardTitle>
              <Button size="sm" variant="outline" onClick={() => downloadCSV("pneus", pneus.map((p: any) => ({ Serie: p.numero_serie, Marca: p.marca, Modelo: p.modelo, Medida: p.medida, DOT: p.dot, Veiculo: p.veiculos?.placa, Posicao: p.posicao, KM: p.km_atual, Status: p.status })))}>
                <Download className="h-3.5 w-3.5 mr-1.5" />CSV
              </Button>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader><TableRow className="border-border/50"><TableHead>Série</TableHead><TableHead>Marca/Modelo</TableHead><TableHead>Medida</TableHead><TableHead>Veículo</TableHead><TableHead>Posição</TableHead><TableHead className="text-right">KM</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {pneus.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-sm">Nenhum pneu</TableCell></TableRow>
                    : pneus.slice(0, 100).map((p: any) => (
                      <TableRow key={p.id} className="border-border/30">
                        <TableCell className="font-mono text-xs">{p.numero_serie ?? "—"}</TableCell>
                        <TableCell className="text-xs">{[p.marca, p.modelo].filter(Boolean).join(" ") || "—"}</TableCell>
                        <TableCell className="text-xs">{p.medida ?? "—"}</TableCell>
                        <TableCell className="font-mono text-xs">{p.veiculos?.placa ?? "—"}</TableCell>
                        <TableCell className="text-xs">{p.posicao ?? "—"}</TableCell>
                        <TableCell className="text-right text-xs">{p.km_atual?.toLocaleString("pt-BR") ?? "—"}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px] capitalize">{p.status?.replace("_"," ")}</Badge></TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CHECKLIST */}
        <TabsContent value="checklist" className="mt-3">
          <Card className="border-border/50">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Checklists ({checklists.length})</CardTitle>
              <Button size="sm" variant="outline" onClick={() => downloadCSV("checklists", checklists.map((c: any) => ({ Data: c.data?.slice(0,10), Placa: c.veiculos?.placa, Motorista: c.motoristas?.nome, KM: c.km, Status: c.status, Itens: Array.isArray(c.itens) ? c.itens.length : 0 })))}>
                <Download className="h-3.5 w-3.5 mr-1.5" />CSV
              </Button>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader><TableRow className="border-border/50"><TableHead>Data</TableHead><TableHead>Placa</TableHead><TableHead>Motorista</TableHead><TableHead className="text-right">KM</TableHead><TableHead className="text-right">Itens</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {checklists.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm">Sem dados no período</TableCell></TableRow>
                    : checklists.slice(0, 100).map((c: any) => (
                      <TableRow key={c.id} className="border-border/30">
                        <TableCell className="text-xs">{c.data?.slice(0,10) ?? "—"}</TableCell>
                        <TableCell className="font-mono text-xs font-semibold">{c.veiculos?.placa ?? "—"}</TableCell>
                        <TableCell className="text-xs">{c.motoristas?.nome ?? "—"}</TableCell>
                        <TableCell className="text-right text-xs">{c.km?.toLocaleString("pt-BR") ?? "—"}</TableCell>
                        <TableCell className="text-right text-xs">{Array.isArray(c.itens) ? c.itens.length : 0}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px] capitalize">{c.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* OCORRÊNCIAS */}
        <TabsContent value="ocorrencias" className="mt-3">
          <Card className="border-border/50">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Ocorrências ({ocorrencias.length})</CardTitle>
              <Button size="sm" variant="outline" onClick={() => downloadCSV("ocorrencias", ocorrencias.map((o: any) => ({ Data: o.data?.slice(0,10), Placa: o.veiculos?.placa, Motorista: o.motoristas?.nome, Tipo: o.tipo, Severidade: o.severidade, Status: o.status, Valor: o.valor })))}>
                <Download className="h-3.5 w-3.5 mr-1.5" />CSV
              </Button>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader><TableRow className="border-border/50"><TableHead>Data</TableHead><TableHead>Placa</TableHead><TableHead>Motorista</TableHead><TableHead>Tipo</TableHead><TableHead>Severidade</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Valor</TableHead></TableRow></TableHeader>
                <TableBody>
                  {ocorrencias.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-sm">Sem dados no período</TableCell></TableRow>
                    : ocorrencias.slice(0, 100).map((o: any) => (
                      <TableRow key={o.id} className="border-border/30">
                        <TableCell className="text-xs">{o.data?.slice(0,10) ?? "—"}</TableCell>
                        <TableCell className="font-mono text-xs font-semibold">{o.veiculos?.placa ?? "—"}</TableCell>
                        <TableCell className="text-xs">{o.motoristas?.nome ?? "—"}</TableCell>
                        <TableCell className="text-xs capitalize">{o.tipo ?? "—"}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px] capitalize">{o.severidade ?? "—"}</Badge></TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px] capitalize">{o.status}</Badge></TableCell>
                        <TableCell className="text-right text-xs">R$ {Number(o.valor ?? 0).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* NF-e */}
        <TabsContent value="nfe" className="mt-3 space-y-3">
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Upload className="h-4 w-4 text-primary" />
                Importar XML de Nota Fiscal Eletrônica
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="border-2 border-dashed border-border/50 rounded-xl p-8 text-center hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer"
                onClick={() => fileRef.current?.click()}
              >
                <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-sm font-medium">Clique para importar XML da NF-e</p>
                <p className="text-xs text-muted-foreground mt-1">Suporta NF-e padrão SEFAZ. Os itens serão extraídos automaticamente.</p>
                {importing && <p className="text-xs text-primary mt-2 animate-pulse">Processando XML...</p>}
              </div>
              <input ref={fileRef} type="file" accept=".xml" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) importarXML(f); e.target.value = ""; }} />
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">NF-e Importadas ({nfes.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader><TableRow className="border-border/50"><TableHead>Número</TableHead><TableHead>Data</TableHead><TableHead>Fornecedor</TableHead><TableHead className="text-right">Valor</TableHead><TableHead>Itens</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {nfes.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm">Nenhuma NF-e importada</TableCell></TableRow>
                    : nfes.slice(0, 50).map((n: any) => (
                      <TableRow key={n.id} className="border-border/30">
                        <TableCell className="font-mono text-xs">{n.numero_nf ?? "—"}</TableCell>
                        <TableCell className="text-xs">{n.data_emissao ?? "—"}</TableCell>
                        <TableCell className="text-xs max-w-48 truncate">{n.fornecedor_nome ?? "—"}</TableCell>
                        <TableCell className="text-right text-xs font-medium">R$ {Number(n.valor_total ?? 0).toFixed(2)}</TableCell>
                        <TableCell className="text-xs">{n.nfe_itens?.length ?? 0} itens</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px] capitalize">{n.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* BI */}
        <TabsContent value="bi" className="mt-3 space-y-4">
          {/* Custo por veículo */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-border/50">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Custo total por veículo (Top 8)</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={custoVeiculo.slice(0, 8).map((c: any) => ({ placa: c.placa, custo: Number(c.custo_total) }))}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                    <XAxis dataKey="placa" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v: number) => [`R$ ${v.toFixed(2)}`, "Custo"]} />
                    <Bar dataKey="custo" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Custo por filial */}
            <Card className="border-border/50">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" />KPIs por Filial</CardTitle></CardHeader>
              <CardContent>
                {kpiFilial.length === 0 ? (
                  <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">Sem dados de filiais</div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={kpiFilial.map((f: any) => ({ filial: f.filial_nome, combustivel: Number(f.gasto_combustivel_total), manutencao: Number(f.custo_manutencao_total) }))}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                      <XAxis dataKey="filial" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v: number) => `R$ ${v.toFixed(2)}`} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="combustivel" name="Combustível" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="manutencao" name="Manutenção" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Ranking de eficiência motoristas */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-400" />
                Ranking de Eficiência — Motoristas (km/L)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow className="border-border/50"><TableHead>#</TableHead><TableHead>Motorista</TableHead><TableHead className="text-right">Abastec.</TableHead><TableHead className="text-right">Litros</TableHead><TableHead className="text-right">Gasto</TableHead><TableHead className="text-right">km/L</TableHead><TableHead className="text-right">Ocorr.</TableHead></TableRow></TableHeader>
                <TableBody>
                  {ranking.filter((r: any) => r.consumo_medio_kml).slice(0, 10).map((r: any, i: number) => (
                    <TableRow key={r.motorista_id} className="border-border/30">
                      <TableCell><span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white ${medalColor(i)}`}>{i + 1}</span></TableCell>
                      <TableCell className="font-medium text-sm">{r.nome}</TableCell>
                      <TableCell className="text-right text-xs">{r.abastecimentos}</TableCell>
                      <TableCell className="text-right text-xs">{Number(r.litros_total).toFixed(1)}</TableCell>
                      <TableCell className="text-right text-xs">R$ {Number(r.gasto_total).toFixed(2)}</TableCell>
                      <TableCell className="text-right font-semibold text-primary text-sm">{Number(r.consumo_medio_kml).toFixed(2)}</TableCell>
                      <TableCell className="text-right">{r.ocorrencias > 0 ? <Badge className="bg-red-500/15 text-red-400 border-red-500/30">{r.ocorrencias}</Badge> : <span className="text-emerald-400 text-xs">0</span>}</TableCell>
                    </TableRow>
                  ))}
                  {ranking.filter((r: any) => r.consumo_medio_kml).length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-sm">Sem dados de eficiência</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* KPIs por filial em cards */}
          {kpiFilial.length > 0 && (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {kpiFilial.map((f: any) => (
                <Card key={f.filial_id} className="border-border/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-primary" />{f.filial_nome}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-2">
                    <div><p className="text-[10px] text-muted-foreground">Veículos ativos</p><p className="font-bold text-lg">{f.veiculos_ativos}</p></div>
                    <div><p className="text-[10px] text-muted-foreground">Motoristas ativos</p><p className="font-bold text-lg">{f.motoristas_ativos}</p></div>
                    <div><p className="text-[10px] text-muted-foreground">Combustível</p><p className="font-bold text-sm text-orange-400">R$ {Number(f.gasto_combustivel_total).toFixed(0)}</p></div>
                    <div><p className="text-[10px] text-muted-foreground">Manutenção</p><p className="font-bold text-sm text-violet-400">R$ {Number(f.custo_manutencao_total).toFixed(0)}</p></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
