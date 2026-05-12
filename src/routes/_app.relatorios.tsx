import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/use-profile";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Upload, FileBarChart, FileText } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios — FrotaPro" }] }),
  component: Page,
});

function toCSV(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const keys = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = String(v).replace(/"/g, '""');
    return /[",\n;]/.test(s) ? `"${s}"` : s;
  };
  return [keys.join(";"), ...rows.map((r) => keys.map((k) => esc(r[k])).join(";"))].join("\n");
}

function downloadCSV(name: string, rows: Record<string, unknown>[]) {
  if (!rows.length) { toast.error("Sem dados para exportar"); return; }
  const blob = new Blob(["\uFEFF" + toCSV(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

function Page() {
  const { data: profile } = useProfile();
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  const { data: consumo = [] } = useQuery({
    queryKey: ["kpi_consumo_veiculo"],
    queryFn: async () => {
      const { data, error } = await supabase.from("kpi_consumo_veiculo" as never).select("*");
      if (error) throw error;
      return data as Array<{ veiculo_id: string; placa: string; modelo: string | null; abastecimentos: number; litros_total: number; gasto_total: number; consumo_medio_kml: number | null }>;
    },
  });

  const { data: custo = [] } = useQuery({
    queryKey: ["kpi_custo_veiculo"],
    queryFn: async () => {
      const { data, error } = await supabase.from("kpi_custo_veiculo" as never).select("*");
      if (error) throw error;
      return data as Array<{ veiculo_id: string; placa: string; km_atual: number; custo_abastecimento: number; custo_manutencao: number; custo_total: number; custo_por_km: number }>;
    },
  });

  const { data: ranking = [] } = useQuery({
    queryKey: ["kpi_ranking_motoristas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("kpi_ranking_motoristas" as never).select("*").order("consumo_medio_kml", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data as Array<{ motorista_id: string; nome: string; abastecimentos: number; litros_total: number; gasto_total: number; consumo_medio_kml: number | null; ocorrencias: number }>;
    },
  });

  // === Importação NF-e ===
  async function handleNFe(file: File) {
    if (!profile?.filialId) return toast.error("Filial não configurada");
    setImporting(true);
    try {
      const text = await file.text();
      const xml = new DOMParser().parseFromString(text, "application/xml");
      if (xml.querySelector("parsererror")) throw new Error("XML inválido");

      const get = (tag: string) => xml.getElementsByTagName(tag)[0]?.textContent ?? "";
      const dhEmi = get("dhEmi") || get("dEmi");
      const cnpjEmit = xml.querySelector("emit > CNPJ")?.textContent ?? "";
      const xNomeEmit = xml.querySelector("emit > xNome")?.textContent ?? "";
      const nNF = get("nNF");
      const vNF = parseFloat(get("vNF") || "0");

      // Coletar itens (det)
      const dets = Array.from(xml.getElementsByTagName("det"));
      const itens = dets.map((d) => ({
        descricao: d.querySelector("prod > xProd")?.textContent ?? "",
        qtd: parseFloat(d.querySelector("prod > qCom")?.textContent ?? "0"),
        vUnit: parseFloat(d.querySelector("prod > vUnCom")?.textContent ?? "0"),
        vTotal: parseFloat(d.querySelector("prod > vProd")?.textContent ?? "0"),
        cfop: d.querySelector("prod > CFOP")?.textContent ?? "",
      }));

      // Detecta combustível (CFOP 5656/6656 ou descrição)
      const isCombustivel = itens.some((i) =>
        /diesel|gasolina|etanol|alcool|álcool|gnv/i.test(i.descricao) ||
        ["5656", "6656", "5667", "6667"].includes(i.cfop)
      );

      if (isCombustivel) {
        const item = itens.find((i) => /diesel|gasolina|etanol|alcool|álcool|gnv/i.test(i.descricao)) ?? itens[0];
        const observacoes = `NF-e ${nNF} • ${xNomeEmit} • CNPJ ${cnpjEmit}\n` +
          itens.map((i) => `• ${i.descricao} — ${i.qtd} x R$${i.vUnit.toFixed(3)} = R$${i.vTotal.toFixed(2)}`).join("\n");

        toast.info("Combustível detectado. Abra o módulo Abastecimento e informe veículo/KM. Pré-preenchimento copiado.");
        sessionStorage.setItem("nfe_prefill_abastecimento", JSON.stringify({
          litros: item.qtd, valor_litro: item.vUnit, valor_total: item.vTotal,
          posto: xNomeEmit, data: dhEmi, observacoes,
        }));
        toast.success(`NF-e ${nNF} processada como abastecimento`);
      } else {
        // Lança como manutenção
        const descricao = `NF-e ${nNF} — ${xNomeEmit}\n` +
          itens.map((i) => `• ${i.descricao} (${i.qtd} x R$${i.vUnit.toFixed(2)})`).join("\n");
        // sem veiculo_id: precisa filial. Inserimos pendente com veiculo placeholder? Não — exigir veículo. Salvar como rascunho local.
        sessionStorage.setItem("nfe_prefill_manutencao", JSON.stringify({
          fornecedor: xNomeEmit, custo: vNF, data_realizada: (dhEmi || "").slice(0, 10), descricao,
        }));
        toast.success(`NF-e ${nNF} processada — abra Manutenção para vincular ao veículo`);
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Relatórios & Inteligência</h1>
          <p className="text-sm text-muted-foreground">KPIs consolidados, exportações e importação de NF-e</p>
        </div>
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept=".xml,application/xml,text/xml" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleNFe(f); }} />
          <Button variant="outline" disabled={importing} onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" /> {importing ? "Importando..." : "Importar NF-e"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="consumo">
        <TabsList>
          <TabsTrigger value="consumo"><FileBarChart className="h-4 w-4 mr-2" />Consumo por veículo</TabsTrigger>
          <TabsTrigger value="custo"><FileBarChart className="h-4 w-4 mr-2" />Custo por veículo</TabsTrigger>
          <TabsTrigger value="motoristas"><FileBarChart className="h-4 w-4 mr-2" />Ranking motoristas</TabsTrigger>
          <TabsTrigger value="export"><FileText className="h-4 w-4 mr-2" />Exportações</TabsTrigger>
        </TabsList>

        <TabsContent value="consumo">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Consumo médio por veículo</CardTitle>
              <Button variant="outline" size="sm" onClick={() => downloadCSV("consumo-veiculo", consumo)}><Download className="h-4 w-4 mr-2" />CSV</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Placa</TableHead><TableHead>Modelo</TableHead><TableHead>Abastec.</TableHead><TableHead>Litros</TableHead><TableHead>Gasto</TableHead><TableHead>Consumo médio</TableHead></TableRow></TableHeader>
                <TableBody>
                  {consumo.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Sem dados</TableCell></TableRow> :
                    consumo.map((r) => (
                      <TableRow key={r.veiculo_id}>
                        <TableCell className="font-mono">{r.placa}</TableCell>
                        <TableCell>{r.modelo ?? "—"}</TableCell>
                        <TableCell>{r.abastecimentos}</TableCell>
                        <TableCell>{Number(r.litros_total).toFixed(2)} L</TableCell>
                        <TableCell>R$ {Number(r.gasto_total).toFixed(2)}</TableCell>
                        <TableCell>{r.consumo_medio_kml ? `${Number(r.consumo_medio_kml).toFixed(2)} km/L` : "—"}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="custo">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Custo total e custo por km</CardTitle>
              <Button variant="outline" size="sm" onClick={() => downloadCSV("custo-veiculo", custo)}><Download className="h-4 w-4 mr-2" />CSV</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Placa</TableHead><TableHead>KM atual</TableHead><TableHead>Combustível</TableHead><TableHead>Manutenção</TableHead><TableHead>Total</TableHead><TableHead>R$/km</TableHead></TableRow></TableHeader>
                <TableBody>
                  {custo.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Sem dados</TableCell></TableRow> :
                    custo.map((r) => (
                      <TableRow key={r.veiculo_id}>
                        <TableCell className="font-mono">{r.placa}</TableCell>
                        <TableCell>{Number(r.km_atual).toLocaleString("pt-BR")}</TableCell>
                        <TableCell>R$ {Number(r.custo_abastecimento).toFixed(2)}</TableCell>
                        <TableCell>R$ {Number(r.custo_manutencao).toFixed(2)}</TableCell>
                        <TableCell className="font-semibold">R$ {Number(r.custo_total).toFixed(2)}</TableCell>
                        <TableCell>R$ {Number(r.custo_por_km).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="motoristas">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Ranking de motoristas</CardTitle>
              <Button variant="outline" size="sm" onClick={() => downloadCSV("ranking-motoristas", ranking)}><Download className="h-4 w-4 mr-2" />CSV</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Motorista</TableHead><TableHead>Abastec.</TableHead><TableHead>Litros</TableHead><TableHead>Gasto</TableHead><TableHead>Consumo médio</TableHead><TableHead>Ocorrências</TableHead></TableRow></TableHeader>
                <TableBody>
                  {ranking.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">Sem dados</TableCell></TableRow> :
                    ranking.map((r, i) => (
                      <TableRow key={r.motorista_id}>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell>{r.nome}</TableCell>
                        <TableCell>{r.abastecimentos}</TableCell>
                        <TableCell>{Number(r.litros_total).toFixed(2)} L</TableCell>
                        <TableCell>R$ {Number(r.gasto_total).toFixed(2)}</TableCell>
                        <TableCell>{r.consumo_medio_kml ? `${Number(r.consumo_medio_kml).toFixed(2)} km/L` : "—"}</TableCell>
                        <TableCell>{r.ocorrencias}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export">
          <div className="grid gap-4 md:grid-cols-2">
            <ExportCard title="Veículos" table="veiculos" filename="veiculos" />
            <ExportCard title="Motoristas" table="motoristas" filename="motoristas" />
            <ExportCard title="Abastecimentos" table="abastecimentos" filename="abastecimentos" />
            <ExportCard title="Manutenções" table="manutencoes" filename="manutencoes" />
            <ExportCard title="Pneus" table="pneus" filename="pneus" />
            <ExportCard title="Checklists" table="checklists" filename="checklists" />
            <ExportCard title="Ocorrências" table="ocorrencias" filename="ocorrencias" />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ExportCard({ title, table, filename }: { title: string; table: "veiculos" | "motoristas" | "abastecimentos" | "manutencoes" | "pneus" | "checklists" | "ocorrencias"; filename: string }) {
  const [loading, setLoading] = useState(false);
  return (
    <Card>
      <CardContent className="pt-6 flex items-center justify-between">
        <div>
          <p className="font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">Exportar todos os registros visíveis</p>
        </div>
        <Button variant="outline" size="sm" disabled={loading} onClick={async () => {
          setLoading(true);
          try {
            const { data, error } = await supabase.from(table).select("*").limit(10000);
            if (error) throw error;
            downloadCSV(filename, (data ?? []) as Record<string, unknown>[]);
          } catch (e) { toast.error((e as Error).message); }
          finally { setLoading(false); }
        }}>
          <Download className="h-4 w-4 mr-2" /> CSV
        </Button>
      </CardContent>
    </Card>
  );
}
