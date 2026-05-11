import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/use-profile";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Search, Fuel, DollarSign, TrendingUp } from "lucide-react";
import { AbastecimentoFormDialog } from "@/components/abastecimento-form-dialog";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Abastecimento = Database["public"]["Tables"]["abastecimentos"]["Row"];

export const Route = createFileRoute("/_app/abastecimento")({
  head: () => ({ meta: [{ title: "Abastecimento — FrotaPro" }] }),
  component: Page,
});

function Page() {
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Abastecimento | null>(null);
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<Abastecimento | null>(null);

  const { data: registros = [], isLoading } = useQuery({
    queryKey: ["abastecimentos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("abastecimentos")
        .select("*, veiculos(placa, modelo), motoristas(nome)")
        .order("data", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as (Abastecimento & { veiculos: { placa: string; modelo: string | null } | null; motoristas: { nome: string } | null })[];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("abastecimentos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Removido"); qc.invalidateQueries({ queryKey: ["abastecimentos"] }); setDeleting(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = registros.filter((r) => {
    const q = search.toLowerCase();
    return !q || r.veiculos?.placa?.toLowerCase().includes(q) || r.posto?.toLowerCase().includes(q);
  });

  // KPIs do mês corrente
  const now = new Date();
  const mesAtual = registros.filter((r) => {
    const d = new Date(r.data);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const totalGasto = mesAtual.reduce((s, r) => s + Number(r.valor_total ?? 0), 0);
  const totalLitros = mesAtual.reduce((s, r) => s + Number(r.litros ?? 0), 0);
  const consumoMedio = mesAtual.filter((r) => r.consumo_kml).reduce((s, r, _, a) => s + Number(r.consumo_kml ?? 0) / a.length, 0);

  const canEdit = profile?.canEdit ?? false;
  const canDelete = profile?.isAdmin ?? false;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Abastecimento</h1>
          <p className="text-sm text-muted-foreground">Registro unificado de combustível com cálculo automático de consumo</p>
        </div>
        {canEdit && <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4 mr-2" /> Novo abastecimento</Button>}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardContent className="pt-6 flex items-center gap-3"><div className="rounded-full bg-primary/10 p-3"><DollarSign className="h-5 w-5 text-primary" /></div><div><p className="text-xs text-muted-foreground">Gasto no mês</p><p className="text-xl font-bold">R$ {totalGasto.toFixed(2)}</p></div></CardContent></Card>
        <Card><CardContent className="pt-6 flex items-center gap-3"><div className="rounded-full bg-primary/10 p-3"><Fuel className="h-5 w-5 text-primary" /></div><div><p className="text-xs text-muted-foreground">Litros no mês</p><p className="text-xl font-bold">{totalLitros.toFixed(1)} L</p></div></CardContent></Card>
        <Card><CardContent className="pt-6 flex items-center gap-3"><div className="rounded-full bg-primary/10 p-3"><TrendingUp className="h-5 w-5 text-primary" /></div><div><p className="text-xs text-muted-foreground">Consumo médio</p><p className="text-xl font-bold">{consumoMedio ? consumoMedio.toFixed(2) : "—"} km/L</p></div></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Buscar por placa ou posto..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Veículo</TableHead>
                  <TableHead>Motorista</TableHead>
                  <TableHead>KM</TableHead>
                  <TableHead>Litros</TableHead>
                  <TableHead>R$/L</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Consumo</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Nenhum abastecimento registrado</TableCell></TableRow>
                ) : filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs">{new Date(r.data).toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="font-mono">{r.veiculos?.placa ?? "—"}</TableCell>
                    <TableCell>{r.motoristas?.nome ?? "—"}</TableCell>
                    <TableCell>{r.km.toLocaleString("pt-BR")}</TableCell>
                    <TableCell>{Number(r.litros).toFixed(2)}</TableCell>
                    <TableCell>R$ {Number(r.valor_litro).toFixed(3)}</TableCell>
                    <TableCell className="font-semibold">R$ {Number(r.valor_total).toFixed(2)}</TableCell>
                    <TableCell>{r.consumo_kml ? `${Number(r.consumo_kml).toFixed(2)} km/L` : "—"}</TableCell>
                    <TableCell className="text-right">
                      {canEdit && <Button variant="ghost" size="icon" onClick={() => { setEditing(r); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>}
                      {canDelete && <Button variant="ghost" size="icon" onClick={() => setDeleting(r)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {profile?.filialId && <AbastecimentoFormDialog open={open} onOpenChange={setOpen} registro={editing} filialId={profile.filialId} />}

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Remover abastecimento?</AlertDialogTitle></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleting && del.mutate(deleting.id)}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
