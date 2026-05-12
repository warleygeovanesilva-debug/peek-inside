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
import { Plus, Pencil, Trash2, Search, AlertTriangle, ShieldAlert, DollarSign } from "lucide-react";
import { OcorrenciaFormDialog } from "@/components/ocorrencia-form-dialog";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Ocorrencia = Database["public"]["Tables"]["ocorrencias"]["Row"];

export const Route = createFileRoute("/_app/ocorrencias")({
  head: () => ({ meta: [{ title: "Ocorrências — FrotaPro" }] }),
  component: Page,
});

const sevColor: Record<string, string> = {
  baixa: "bg-muted text-foreground",
  media: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400",
  alta: "bg-orange-500/20 text-orange-700 dark:text-orange-400",
  critica: "bg-destructive/20 text-destructive",
};
const statusColor: Record<string, string> = {
  aberta: "bg-blue-500/20 text-blue-700 dark:text-blue-400",
  em_analise: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400",
  resolvida: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400",
  cancelada: "bg-muted text-muted-foreground",
};

function Page() {
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Ocorrencia | null>(null);
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<Ocorrencia | null>(null);

  const { data: registros = [], isLoading } = useQuery({
    queryKey: ["ocorrencias"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ocorrencias")
        .select("*, veiculos(placa), motoristas(nome)")
        .order("data", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as (Ocorrencia & { veiculos: { placa: string } | null; motoristas: { nome: string } | null })[];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ocorrencias").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Removido"); qc.invalidateQueries({ queryKey: ["ocorrencias"] }); setDeleting(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = registros.filter((r) => {
    const q = search.toLowerCase();
    return !q || r.descricao.toLowerCase().includes(q) || r.veiculos?.placa?.toLowerCase().includes(q) || r.motoristas?.nome?.toLowerCase().includes(q);
  });

  const abertas = registros.filter((r) => r.status === "aberta" || r.status === "em_analise").length;
  const criticas = registros.filter((r) => r.severidade === "critica" && r.status !== "resolvida" && r.status !== "cancelada").length;
  const totalValor = registros.reduce((s, r) => s + Number(r.valor ?? 0), 0);

  const canEdit = profile?.canEdit ?? false;
  const canDelete = profile?.isAdmin ?? false;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Ocorrências</h1>
          <p className="text-sm text-muted-foreground">Multas, sinistros, avarias e infrações da frota</p>
        </div>
        {canEdit && <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4 mr-2" /> Nova ocorrência</Button>}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardContent className="pt-6 flex items-center gap-3"><div className="rounded-full bg-primary/10 p-3"><AlertTriangle className="h-5 w-5 text-primary" /></div><div><p className="text-xs text-muted-foreground">Em aberto</p><p className="text-xl font-bold">{abertas}</p></div></CardContent></Card>
        <Card><CardContent className="pt-6 flex items-center gap-3"><div className="rounded-full bg-destructive/10 p-3"><ShieldAlert className="h-5 w-5 text-destructive" /></div><div><p className="text-xs text-muted-foreground">Críticas pendentes</p><p className="text-xl font-bold">{criticas}</p></div></CardContent></Card>
        <Card><CardContent className="pt-6 flex items-center gap-3"><div className="rounded-full bg-primary/10 p-3"><DollarSign className="h-5 w-5 text-primary" /></div><div><p className="text-xs text-muted-foreground">Valor total registrado</p><p className="text-xl font-bold">R$ {totalValor.toFixed(2)}</p></div></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Severidade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Veículo</TableHead>
                  <TableHead>Motorista</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Nenhuma ocorrência registrada</TableCell></TableRow>
                ) : filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs">{new Date(r.data).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell className="capitalize">{r.tipo}</TableCell>
                    <TableCell><Badge className={sevColor[r.severidade]} variant="outline">{r.severidade}</Badge></TableCell>
                    <TableCell><Badge className={statusColor[r.status]} variant="outline">{r.status.replace("_", " ")}</Badge></TableCell>
                    <TableCell className="font-mono">{r.veiculos?.placa ?? "—"}</TableCell>
                    <TableCell>{r.motoristas?.nome ?? "—"}</TableCell>
                    <TableCell className="max-w-[280px] truncate">{r.descricao}</TableCell>
                    <TableCell>{r.valor ? `R$ ${Number(r.valor).toFixed(2)}` : "—"}</TableCell>
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

      {profile?.filialId && <OcorrenciaFormDialog open={open} onOpenChange={setOpen} registro={editing} filialId={profile.filialId} />}

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Remover ocorrência?</AlertDialogTitle></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleting && del.mutate(deleting.id)}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
