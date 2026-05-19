import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Truck, Users, Fuel, Wrench, AlertTriangle, TrendingUp, DollarSign, Trophy, Activity } from "lucide-react";
import { getDocStatus, statusBadgeClass, statusLabel, formatDateBR } from "@/lib/validity";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — FrotaPro" }] }),
  component: DashboardPage,
});

type ConsumoRow = { veiculo_id: string; placa: string; modelo: string | null; abastecimentos: number; litros_total: number; gasto_total: number; consumo_medio_kml: number | null };
type CustoRow = { veiculo_id: string; placa: string; km_atual: number; custo_abastecimento: number; custo_manutencao: number; custo_total: number; custo_por_km: number };
type RankingRow = { motorista_id: string; nome: string; abastecimentos: number; litros_total: number; gasto_total: number; consumo_medio_kml: number | null; ocorrencias: number };

const mockCombustivelMensal = [
  { mes: "Jan", litros: 820, gasto: 4100 },
  { mes: "Fev", litros: 760, gasto: 3800 },
  { mes: "Mar", litros: 910, gasto: 4550 },
  { mes: "Abr", litros: 680, gasto: 3400 },
  { mes: "Mai", litros: 1020, gasto: 5100 },
  { mes: "Jun", litros: 890, gasto: 4450 },
];

const mockManutencaoMensal = [
  { mes: "Jan", preventiva: 3, corretiva: 1 },
  { mes: "Fev", preventiva: 2, corretiva: 2 },
  { mes: "Mar", preventiva: 4, corretiva: 0 },
  { mes: "Abr", preventiva: 1, corretiva: 3 },
  { mes: "Mai", preventiva: 5, corretiva: 1 },
  { mes: "Jun", preventiva: 3, corretiva: 2 },
];

const COLORS = ["#4f46e5", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444"];

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
  const topConsumo = [...consumo].filter((c) => c.consumo_medio_kml).sort((a, b) => Number(b.consumo_medio_kml) - Number(a.consumo_medio_kml)).slice(0, 5);
  const topCusto = [...custo].sort((a, b) => Number(b.custo_total) - Number(a.custo_total)).slice(0, 5);
  const topMotoristas = ranking.filter((r) => r.consumo_medio_kml).slice(0, 5);

  const statusFrota = [
    { name: "Ativos", value: veiculos.filter(v => v.status === "ativo").length },
    { name: "Manutenção", value: veiculos.filter(v => v.status === "manutencao").length },
    { name: "Parados", value: veiculos.filter(v => v.status === "inativo").length },
  ].filter(s => s.value > 0);

  const kpis = [
    { label: "Veículos ativos", value: veiculosAtivos.toString(), icon: Truck, color: "from-blue-600 to-blue-800", bg: "bg-blue-50", text: "text-blue-600" },
    { label: "Motoristas ativos", value: motoristasAtivos.toString(), icon: Users, color: "from-emerald-500 to-emerald-700", bg: "bg-emerald-50", text: "text-emerald-600" },
    { label: "Gasto combustível (mês)", value: `R$ ${gastoMes.toFixed(2)}`, sub: `${litrosMes.toFixed(1)} L`, icon: Fuel, color: "from-orange-400 to-orange-600", bg: "bg-orange-50", text: "text-orange-600" },
    { label: "Manutenções abertas", value: manutAbertas.length.toString(), sub: `${ocorAbertas.length} ocorrências`, icon: Wrench, color: "from-violet-500 to-violet-700", bg: "bg-violet-50", text: "text-violet-600" },
  ];

  const medalColor = (i: number) => i === 0 ? "bg-amber-400" : i === 1 ? "bg-slate-400" : i === 2 ? "bg-orange-400" : "bg-muted text-muted-foreground";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Visão geral, analytics e BI da sua frota</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-card border rounded-lg px-3 py-2 shadow-sm">
          <Activity className="h-3.5 w-3.5 text-primary" />
          <span>Atualizado agora</span>
        </div>
      </div>

      <Tabs defaultValue="visao-geral">
        <TabsList className="bg-card border shadow-sm">
          <TabsTrigger value="visao-geral">Visão geral</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="bi">BI</TabsTrigger>
        </TabsList>

        {/* VISÃO GERAL */}
        <TabsContent value="visao-geral" className="space-y-4 mt-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {kpis.map((k) => (
              <Card key={k.label} className="border-0 shadow-sm hover:shadow-md transition-all overflow-hidden">
                <CardContent className="p-0">
                  <div className={`h-1 bg-gradient-to-r ${k.color}`} />
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <p className="text-xs font-medium text-muted-foreground leading-tight pr-2">{k.label}</p>
                      <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${k.color} flex items-center justify-center shrink-0 shadow-sm`}>
                        <k.icon className="h-4 w-4 text-white" />
                      </div>
                    </div>
                    <div className="text-2xl font-bold tracking-tight">{k.value}</div>
                    {k.sub && <p className={`text-xs mt-0.5 ${k.text}`}>{k.sub}</p>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <span className="h-5 w-5 rounded-md bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
                    <Fuel className="h-3 w-3 text-white" />
                  </span>
                  Combustível — últimos 6 meses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={mockCombustivelMensal}>
                    <defs>
                      <linearGradient id="colorGasto" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-40" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number, name: string) => name === "gasto" ? [`R$ ${v}`, "Gasto"] : [`${v} L`, "Litros"]} />
                    <Area type="monotone" dataKey="gasto" stroke="#f59e0b" strokeWidth={2} fill="url(#colorGasto)" name="gasto" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <span className="h-5 w-5 rounded-md bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center">
                    <Wrench className="h-3 w-3 text-white" />
                  </span>
                  Manutenções por mês
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={mockManutencaoMensal}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-40" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="preventiva" name="Preventiva" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="corretiva" name="Corretiva" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {[
              { title: "Alertas de CRLV", alertas: alertasCRLV, link: "/frota", keyField: "placa", dateField: "crlv_validade" },
              { title: "Alertas de CNH", alertas: alertasCNH, link: "/motoristas", keyField: "nome", dateField: "cnh_validade" },
            ].map(({ title, alertas, link, keyField, dateField }) => (
              <Card key={title} className="shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    {title}
                    {alertas.length > 0 && (
                      <Badge className="bg-amber-100 text-amber-700 border-amber-200 ml-auto">{alertas.length}</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {alertas.length === 0 ? (
                    <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 rounded-lg p-3">
                      <span>✅</span><span>Nenhum alerta. Tudo em dia.</span>
                    </div>
                  ) : alertas.slice(0, 5).map((item: any) => (
                    <Link key={item.id} to={link} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors">
                      <span className={keyField === "placa" ? "font-mono font-semibold text-sm" : "font-medium text-sm"}>{item[keyField]}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{formatDateBR(item[dateField])}</span>
                        <Badge variant="outline" className={statusBadgeClass(item.status_doc)}>{statusLabel(item.status_doc)}</Badge>
                      </div>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ANALYTICS */}
        <TabsContent value="analytics" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { label: "Consumo médio frota", value: consumoMedioFrota ? `${consumoMedioFrota.toFixed(2)} km/L` : "—", sub: "km/L médio", icon: TrendingUp, color: "from-emerald-500 to-emerald-700" },
              { label: "Custo total frota", value: `R$ ${totalCustoFrota.toFixed(2)}`, sub: "combustível + manutenção", icon: DollarSign, color: "from-orange-400 to-orange-600" },
              { label: "Custo por km", value: `R$ ${custoPorKmFrota.toFixed(2)}`, sub: "média ponderada", icon: DollarSign, color: "from-violet-500 to-violet-700" },
            ].map((k) => (
              <Card key={k.label} className="shadow-sm overflow-hidden">
                <div className={`h-1 bg-gradient-to-r ${k.color}`} />
                <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{k.label}</CardTitle>
                  <div className={`h-8 w-8 rounded-lg bg-gradient-to-br ${k.color} flex items-center justify-center`}>
                    <k.icon className="h-4 w-4 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{k.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">{k.sub}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Status da frota</CardTitle></CardHeader>
              <CardContent>
                {statusFrota.length > 0 ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={statusFrota} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value">
                        {statusFrota.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[180px] flex items-center justify-center text-sm text-muted-foreground">Sem dados</div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-sm md:col-span-2">
              <CardHeader><CardTitle className="text-sm font-semibold">Top 5 — melhor consumo (km/L)</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Placa</TableHead><TableHead>Modelo</TableHead><TableHead className="text-right">km/L</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {topConsumo.length === 0
                      ? <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">Sem dados</TableCell></TableRow>
                      : topConsumo.map((c, i) => (
                        <TableRow key={c.veiculo_id}>
                          <TableCell><span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white ${medalColor(i)}`}>{i + 1}</span></TableCell>
                          <TableCell className="font-mono font-semibold">{c.placa}</TableCell>
                          <TableCell>{c.modelo ?? "—"}</TableCell>
                          <TableCell className="text-right font-semibold text-primary">{Number(c.consumo_medio_kml).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-sm">
            <CardHeader><CardTitle className="text-sm font-semibold">Top 5 — maior custo total</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Placa</TableHead><TableHead className="text-right">Combustível</TableHead><TableHead className="text-right">Manutenção</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">R$/km</TableHead></TableRow></TableHeader>
                <TableBody>
                  {topCusto.length === 0
                    ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Sem dados</TableCell></TableRow>
                    : topCusto.map((c) => (
                      <TableRow key={c.veiculo_id}>
                        <TableCell className="font-mono font-semibold">{c.placa}</TableCell>
                        <TableCell className="text-right">R$ {Number(c.custo_abastecimento).toFixed(2)}</TableCell>
                        <TableCell className="text-right">R$ {Number(c.custo_manutencao).toFixed(2)}</TableCell>
                        <TableCell className="text-right font-semibold">R$ {Number(c.custo_total).toFixed(2)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">R$ {Number(c.custo_por_km).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* BI */}
        <TabsContent value="bi" className="mt-4 space-y-4">
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <span className="h-5 w-5 rounded-md bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
                  <Fuel className="h-3 w-3 text-white" />
                </span>
                Litros abastecidos por mês
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={mockCombustivelMensal}>
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4f46e5" /><stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-40" />
                  <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: number) => [`${v} L`, "Litros"]} />
                  <Bar dataKey="litros" fill="url(#barGrad)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Trophy className="h-4 w-4 text-amber-500" />
                Ranking de motoristas — eficiência (km/L)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Motorista</TableHead><TableHead className="text-right">Abastec.</TableHead><TableHead className="text-right">Litros</TableHead><TableHead className="text-right">Gasto</TableHead><TableHead className="text-right">km/L</TableHead><TableHead className="text-right">Ocorr.</TableHead></TableRow></TableHeader>
                <TableBody>
                  {topMotoristas.length === 0
                    ? <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">Sem dados ainda</TableCell></TableRow>
                    : topMotoristas.map((r, i) => (
                      <TableRow key={r.motorista_id}>
                        <TableCell><span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white ${medalColor(i)}`}>{i + 1}</span></TableCell>
                        <TableCell className="font-medium">{r.nome}</TableCell>
                        <TableCell className="text-right">{r.abastecimentos}</TableCell>
                        <TableCell className="text-right">{Number(r.litros_total).toFixed(1)}</TableCell>
                        <TableCell className="text-right">R$ {Number(r.gasto_total).toFixed(2)}</TableCell>
                        <TableCell className="text-right font-semibold text-primary">{Number(r.consumo_medio_kml).toFixed(2)}</TableCell>
                        <TableCell className="text-right">{r.ocorrencias > 0 ? <Badge className="bg-red-100 text-red-700 border-red-200">{r.ocorrencias}</Badge> : <span className="text-emerald-600">0</span>}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
              <p className="text-xs text-muted-foreground mt-4">
                Para relatórios completos, acesse <Link to="/relatorios" className="text-primary underline">Relatórios</Link>.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
