import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/use-profile";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { PneuFormDialog } from "@/components/pneu-form-dialog";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Pneu = Database["public"]["Tables"]["pneus"]["Row"];

export const Route = createFileRoute("/_app/pneus")({
  head: () => ({ meta: [{ title: "Pneus — FrotaPro" }] }),
  component: Page,
});

const statusColor: Record<string, string> = {
  em_uso: "bg-emerald-500/10 text-emerald-700 border-emerald-300",
  estoque: "bg-blue-500/10 text-blue-700 border-blue-300",
  recapagem: "bg-yellow-500/10 text-yellow-700 border-yellow-300",
  descartado: "bg-muted text-muted-foreground",
};

function Page() {
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Pneu | null>(null);
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<Pneu | null>(null);

  const { data: pneus = [], isLoading } = useQuery({
    queryKey: ["pneus"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pneus")
        .select("*, veiculos(placa)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as (Pneu & { veiculos: { placa: string } | null })[];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pneus").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Removido"); qc.invalidateQueries({ queryKey: ["pneus"] }); setDeleting(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = pneus.filter((p) => {
    const q = search.toLowerCase();
    return !q || p.numero_serie?.toLowerCase().includes(q) || p.marca?.toLowerCase().includes(q) || p.veiculos?.placa?.toLowerCase().includes(q);
  });

  const emUso = pneus.filter((p) => p.status === "em_uso").length;
  const estoque = pneus.filter((p) => p.status === "estoque").length;
  const recapagem = pneus.filter((p) => p.status === "recapagem").length;

  const canEdit = profile?.canEdit ?? false;
  const canDelete = profile?.isAdmin ?? false;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Pneus</h1>
          <p className="text-sm text-muted-foreground">Controle de pneus, posições e rodízios</p>
        </div>
        {canEdit && <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4 mr-2" /> Novo pneu</Button>}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Em uso</p><p className="text-2xl font-bold">{emUso}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Em estoque</p><p className="text-2xl font-bold">{estoque}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Em recapagem</p><p className="text-2xl font-bold">{recapagem}</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Buscar por série, marca ou placa..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Série</TableHead>
                  <TableHead>Marca/Modelo</TableHead>
                  <TableHead>Medida</TableHead>
                  <TableHead>DOT</TableHead>
                  <TableHead>Veículo</TableHead>
                  <TableHead>Posição</TableHead>
                  <TableHead>KM</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Nenhum pneu cadastrado</TableCell></TableRow>
                ) : filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.numero_serie ?? "—"}</TableCell>
                    <TableCell>{[p.marca, p.modelo].filter(Boolean).join(" ") || "—"}</TableCell>
                    <TableCell className="text-xs">{p.medida ?? "—"}</TableCell>
                    <TableCell className="text-xs">{p.dot ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{p.veiculos?.placa ?? "—"}</TableCell>
                    <TableCell className="text-xs">{p.posicao ?? "—"}</TableCell>
                    <TableCell className="text-xs">{p.km_atual?.toLocaleString("pt-BR") ?? "—"}</TableCell>
                    <TableCell><Badge variant="outline" className={`capitalize ${statusColor[p.status]}`}>{p.status.replace("_", " ")}</Badge></TableCell>
                    <TableCell className="text-right">
                      {canEdit && <Button variant="ghost" size="icon" onClick={() => { setEditing(p); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>}
                      {canDelete && <Button variant="ghost" size="icon" onClick={() => setDeleting(p)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {profile?.filialId && <PneuFormDialog open={open} onOpenChange={setOpen} registro={editing} filialId={profile.filialId} />}

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
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
