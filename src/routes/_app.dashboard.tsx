import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Truck, Users, Fuel, Wrench, AlertTriangle } from "lucide-react";
import { getDocStatus, statusBadgeClass, statusLabel, formatDateBR } from "@/lib/validity";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — FrotaPro" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const { data } = useQuery({
    queryKey: ["dashboard-overview"],
    queryFn: async () => {
      const [{ data: veiculos }, { data: motoristas }] = await Promise.all([
        supabase.from("veiculos").select("id, placa, status, crlv_validade"),
        supabase.from("motoristas").select("id, nome, ativo, cnh_validade"),
      ]);
      return { veiculos: veiculos ?? [], motoristas: motoristas ?? [] };
    },
  });

  const veiculos = data?.veiculos ?? [];
  const motoristas = data?.motoristas ?? [];
  const veiculosAtivos = veiculos.filter((v) => v.status === "ativo").length;
  const motoristasAtivos = motoristas.filter((m) => m.ativo).length;

  const alertasCRLV = veiculos
    .map((v) => ({ ...v, status_doc: getDocStatus(v.crlv_validade) }))
    .filter((v) => v.status_doc === "expired" || v.status_doc === "expiring");

  const alertasCNH = motoristas
    .map((m) => ({ ...m, status_doc: getDocStatus(m.cnh_validade) }))
    .filter((m) => m.status_doc === "expired" || m.status_doc === "expiring");

  const kpis = [
    { label: "Veículos ativos", value: veiculosAtivos.toString(), icon: Truck },
    { label: "Motoristas ativos", value: motoristasAtivos.toString(), icon: Users },
    { label: "Abastec. (mês)", value: "—", icon: Fuel },
    { label: "Manutenções abertas", value: "—", icon: Wrench },
  ];

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
                <CardContent><div className="text-3xl font-bold">{k.value}</div></CardContent>
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

        <TabsContent value="analytics" className="mt-4">
          <Card><CardContent className="py-12 text-center text-muted-foreground">Analytics em breve (Fase 4)</CardContent></Card>
        </TabsContent>

        <TabsContent value="bi" className="mt-4">
          <Card><CardContent className="py-12 text-center text-muted-foreground">BI em breve (Fase 4)</CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
