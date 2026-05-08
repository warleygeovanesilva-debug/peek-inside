import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Truck, Users, Fuel, Wrench } from "lucide-react";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — FrotaPro" }] }),
  component: DashboardPage,
});

const kpis = [
  { label: "Veículos ativos", value: "—", icon: Truck },
  { label: "Motoristas", value: "—", icon: Users },
  { label: "Abastec. (mês)", value: "—", icon: Fuel },
  { label: "Manutenções abertas", value: "—", icon: Wrench },
];

function DashboardPage() {
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
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader><CardTitle>Próximas etapas</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-1">
              <p>✅ Fase 1 completa: backend, autenticação, layout e dashboard.</p>
              <p>➡️ Fase 2: cadastro de veículos e motoristas com alertas automáticos.</p>
              <p>➡️ Fase 3: abastecimento unificado, manutenção, pneus, checklist.</p>
              <p>➡️ Fase 4: BI, relatórios centralizados, importação de NF-e.</p>
            </CardContent>
          </Card>
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
