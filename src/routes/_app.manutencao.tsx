import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/_app/manutencao")({
  head: () => ({ meta: [{ title: "Manutencao — FrotaPro" }] }),
  component: Page,
});

function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold capitalize">manutencao</h1>
        <p className="text-sm text-muted-foreground">Módulo será construído nas próximas fases</p>
      </div>
      <Card>
        <CardContent className="py-16 text-center text-muted-foreground">
          Em breve
        </CardContent>
      </Card>
    </div>
  );
}
