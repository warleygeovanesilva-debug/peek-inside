import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Truck, Users, Fuel, Wrench, AlertTriangle, TrendingUp, DollarSign, Trophy } from "lucide-react";
import { getDocStatus, statusBadgeClass, statusLabel, formatDateBR } from "@/lib/validity";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — FrotaPro" }] }),
  component: DashboardPage,
});

type ConsumoRow = { veiculo_id: string; placa: string; modelo: string | null; abastecimentos: number; litros_total: number; gasto_total: number; consumo_medio_kml: number | null };
type CustoRow = { veiculo_id: string; placa: string; km_atual: number; custo_abastecimento: number; custo_manutencao: number; custo_total: number; custo_por_km: number };
type RankingRow = { motorista_id: string; nome: string; abastecimentos: number; litros_total: number; gasto_total: number; consumo_medio_kml: number | null; ocorrencias: number };

function DashboardPage() {
  const { data } = useQuery({
    queryKey: ["dashboard-overview"],
    queryFn: async () => {
      const startMonth = new Date();
      startMonth.setDate(1);
      startMonth.setHours(0, 0, 0, 0);
      const isoMonth = startMonth.toISOString();

      const [veicRes, motRes, abastRes, manutRes, ocorRes] = await Promise.all([
        supabase.from("veiculos").select("id, placa, status, crlv_validade"),
        supabase.from("motoristas").select("id, nome, ativo, cnh_validade"),
        supabase.from("abastecimentos").select("valor_total, litros, data").gte("data", isoMonth),
        supabase.from("manutencoes").select("id, status, custo, data_prevista").in("status", ["agendada", "em_andamento"]),
        supabase.from("ocorrencias").select("id, status").eq("status", "aberta"),
      ]);

      return {
        veiculos: veicRes.data ?? [],
        motoristas: motRes.data ?? [],
        abastMes: abastRes.data ?? [],
        manutAbertas: manutRes.data ?? [],
        ocorAbertas: ocorRes.data ?? [],
      };
    },
  });

  const { data: consumo = [] } = useQuery({
    queryKey: ["dash_consumo"],
    queryFn: async () => {
      const { data, error } = await supabase.from("kpi_consumo_veiculo" as never).select("*");
      if (error) throw error;
      return data as ConsumoRow[];
    },
  });

  const { data: custo = [] } = useQuery({
    queryKey: ["dash_custo"],
    queryFn: async () => {
      const { data, error } = await supabase.from("kpi_custo_veiculo" as never).select("*");
      if (error) throw error;
      return data as CustoRow[];
    },
  });

  const { data: ranking = [] } = useQuery({
    queryKey: ["dash_ranking"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kpi_ranking_motoristas" as never)
        .select("*")
        .order("consumo_medio_kml", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data as RankingRow[];
    },
  });

  const veiculos = data?.veiculos ?? [];
  const motoristas = data?.motoristas ?? [];
  const abastMes = data?.abastMes ?? [];
  const manutAbertas = data?.manutAbertas ?? [];
  const ocorAbertas = data?.ocorAbertas ?? [];

  const veiculosAtivos = veiculos.filter((v) => v.status === "ativo").length;
  const motoristasAtivos = motoristas.filter((m) => m.ativo).length;
  const gastoMes = abastMes.reduce((s, a) => s + Number(a.valor_total ?? 0), 0);
  const litrosMes = abastMes.reduce((s, a) => s + Number(a.litros ?? 0), 0);

  const alertasCRLV = veiculos
    .map((v) => ({ ...v, status_doc: getDocStatus(v.crlv_validade) }))
    .filter((v) => v.status_doc === "expired" || v.status_doc === "expiring");

  const alertasCNH = motoristas
    .map((m) => ({ ...m, status_doc: getDocStatus(m.cnh_validade) }))
    .filter((m) => m.status_doc === "expired" || m.status_doc === "expiring");

  const totalCustoFrota = custo.reduce((s, c) => s + Number(c.custo_total ?? 0), 0);
  const kmFrota = custo.reduce((s, c) => s + Number(c.km_atual ?? 0), 0);
  const consumoMedioFrota = (() => {
    const valid = consumo.filter((c) => c.consumo_medio_kml);
    if (!valid.length) return null;
    return valid.reduce((s, c) => s + Number(c.consumo_medio_kml), 0) / valid.length;
  })();
  const custoPorKmFrota = kmFrota > 0 ? totalCustoFrota / kmFrota : 0;

  const kpis = [
    { label: "Veículos ativos", value: veiculosAtivos.toString(), icon: Truck },
    { label: "Motoristas ativos", value: motoristasAtivos.toString(), icon: Users },
    { label: "Gasto combustível (mês)", value: `R$ ${gastoMes.toFixed(2)}`, sub: `${litrosMes.toFixed(1)} L`, icon: Fuel },
    { label: "Manutenções abertas", value: manutAbertas.length.toString(), sub: `${ocorAbertas.length} ocorrências`, icon: Wrench },
  ];

  const topConsumo = [...consumo]
    .filter((c) => c.consumo_medio_kml)
    .sort((a, b) => Number(b.consumo_medio_kml) - Number(a.consumo_medio_kml))
    .slice(0, 5);

  const topCusto = [...custo]
    .sort((a, b) => Number(b.custo_total) - Number(a.custo_total))
    .slice(0, 5);

  const topMotoristas = ranking.filter((r) => r.consumo_medio_kml).slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral, analytics e BI da sua frota</p>
      </div>

      <Tabs defaultValue="visao-geral">
        <TabsList>
          <TabsTrigger value="visao-geral">Visão geral</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="bi">BI</TabsTrigger>
        </TabsList>

        <TabsContent value="visao-geral" className="space-y-4 mt-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {kpis.map((k) => (
              <Card key={k.label}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{k.label}</CardTitle>
                  <k.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{k.value}</div>
                  {k.sub && <p className="text-xs text-muted-foreground mt-1">{k.sub}</p>}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Alertas de CRLV
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {alertasCRLV.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum alerta. Tudo em dia.</p>
                ) : alertasCRLV.slice(0, 5).map((v) => (
                  <Link key={v.id} to="/frota" className="flex items-center justify-between p-2 rounded hover:bg-muted">
                    <span className="font-mono font-semibold">{v.placa}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{formatDateBR(v.crlv_validade)}</span>
                      <Badge variant="outline" className={statusBadgeClass(v.status_doc)}>{statusLabel(v.status_doc)}</Badge>
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Alertas de CNH
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {alertasCNH.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum alerta. Tudo em dia.</p>
                ) : alertasCNH.slice(0, 5).map((m) => (
                  <Link key={m.id} to="/motoristas" className="flex items-center justify-between p-2 rounded hover:bg-muted">
                    <span className="font-medium">{m.nome}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{formatDateBR(m.cnh_validade)}</span>
                      <Badge variant="outline" className={statusBadgeClass(m.status_doc)}>{statusLabel(m.status_doc)}</Badge>
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Consumo médio frota</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{consumoMedioFrota ? `${consumoMedioFrota.toFixed(2)}` : "—"}</div>
                <p className="text-xs text-muted-foreground mt-1">km/L</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Custo total frota</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">R$ {totalCustoFrota.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground mt-1">combustível + manutenção</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Custo por km</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">R$ {custoPorKmFrota.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground mt-1">média ponderada</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">Top 5 — melhor consumo</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Placa</TableHead><TableHead>Modelo</TableHead><TableHead className="text-right">km/L</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {topConsumo.length === 0 ? (
                      <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">Sem dados</TableCell></TableRow>
                    ) : topConsumo.map((c) => (
                      <TableRow key={c.veiculo_id}>
                        <TableCell className="font-mono">{c.placa}</TableCell>
                        <TableCell>{c.modelo ?? "—"}</TableCell>
                        <TableCell className="text-right font-semibold">{Number(c.consumo_medio_kml).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Top 5 — maior custo</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Placa</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">R$/km</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {topCusto.length === 0 ? (
                      <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">Sem dados</TableCell></TableRow>
                    ) : topCusto.map((c) => (
                      <TableRow key={c.veiculo_id}>
                        <TableCell className="font-mono">{c.placa}</TableCell>
                        <TableCell className="text-right">R$ {Number(c.custo_total).toFixed(2)}</TableCell>
                        <TableCell className="text-right">R$ {Number(c.custo_por_km).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="bi" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Trophy className="h-4 w-4 text-amber-500" />
                Ranking de motoristas (eficiência)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Motorista</TableHead><TableHead className="text-right">Abastec.</TableHead><TableHead className="text-right">Litros</TableHead><TableHead className="text-right">Gasto</TableHead><TableHead className="text-right">km/L</TableHead><TableHead className="text-right">Ocorr.</TableHead></TableRow></TableHeader>
                <TableBody>
                  {topMotoristas.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">Sem dados ainda</TableCell></TableRow>
                  ) : topMotoristas.map((r, i) => (
                    <TableRow key={r.motorista_id}>
                      <TableCell className="font-semibold">{i + 1}</TableCell>
                      <TableCell>{r.nome}</TableCell>
                      <TableCell className="text-right">{r.abastecimentos}</TableCell>
                      <TableCell className="text-right">{Number(r.litros_total).toFixed(2)}</TableCell>
                      <TableCell className="text-right">R$ {Number(r.gasto_total).toFixed(2)}</TableCell>
                      <TableCell className="text-right font-semibold">{Number(r.consumo_medio_kml).toFixed(2)}</TableCell>
                      <TableCell className="text-right">{r.ocorrencias}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p className="text-xs text-muted-foreground mt-4">
                Para relatórios completos e exportação CSV, acesse <Link to="/relatorios" className="underline">Relatórios</Link>.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
