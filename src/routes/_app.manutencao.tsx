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
import { ManutencaoFormDialog } from "@/components/manutencao-form-dialog";
import { formatDateBR } from "@/lib/validity";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Manutencao = Database["public"]["Tables"]["manutencoes"]["Row"];

export const Route = createFileRoute("/_app/manutencao")({
  head: () => ({ meta: [{ title: "Manutenção — FrotaPro" }] }),
  component: Page,
});

const statusColor: Record<string, string> = {
  agendada: "bg-blue-500/10 text-blue-700 border-blue-300",
  em_andamento: "bg-yellow-500/10 text-yellow-700 border-yellow-300",
  concluida: "bg-emerald-500/10 text-emerald-700 border-emerald-300",
  cancelada: "bg-muted text-muted-foreground",
};

function Page() {
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Manutencao | null>(null);
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<Manutencao | null>(null);

  const { data: registros = [], isLoading } = useQuery({
    queryKey: ["manutencoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("manutencoes")
        .select("*, veiculos(placa, modelo)")
        .order("data_prevista", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data as (Manutencao & { veiculos: { placa: string; modelo: string | null } | null })[];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("manutencoes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Removido"); qc.invalidateQueries({ queryKey: ["manutencoes"] }); setDeleting(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = registros.filter((r) => {
    const q = search.toLowerCase();
    return !q || r.veiculos?.placa?.toLowerCase().includes(q) || r.descricao?.toLowerCase().includes(q);
  });

  const agendadas = registros.filter((r) => r.status === "agendada").length;
  const emAndamento = registros.filter((r) => r.status === "em_andamento").length;
  const concluidas = registros.filter((r) => r.status === "concluida").length;

  const canEdit = profile?.canEdit ?? false;
  const canDelete = profile?.isAdmin ?? false;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Manutenção</h1>
          <p className="text-sm text-muted-foreground">Ordens de serviço, agendamentos e histórico</p>
        </div>
        {canEdit && <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4 mr-2" /> Nova manutenção</Button>}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Agendadas</p><p className="text-2xl font-bold">{agendadas}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Em andamento</p><p className="text-2xl font-bold">{emAndamento}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Concluídas</p><p className="text-2xl font-bold">{concluidas}</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Buscar por placa ou descrição..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Veículo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Prevista</TableHead>
                  <TableHead>Realizada</TableHead>
                  <TableHead>Custo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhuma manutenção registrada</TableCell></TableRow>
                ) : filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono">{r.veiculos?.placa ?? "—"}</TableCell>
                    <TableCell className="capitalize text-xs">{r.tipo.replace("_", " ")}</TableCell>
                    <TableCell className="max-w-[280px] truncate">{r.descricao}</TableCell>
                    <TableCell className="text-xs">{formatDateBR(r.data_prevista)}</TableCell>
                    <TableCell className="text-xs">{formatDateBR(r.data_realizada)}</TableCell>
                    <TableCell>{r.custo ? `R$ ${Number(r.custo).toFixed(2)}` : "—"}</TableCell>
                    <TableCell><Badge variant="outline" className={`capitalize ${statusColor[r.status]}`}>{r.status.replace("_", " ")}</Badge></TableCell>
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

      {profile?.filialId && <ManutencaoFormDialog open={open} onOpenChange={setOpen} registro={editing} filialId={profile.filialId} />}

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Remover manutenção?</AlertDialogTitle></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleting && del.mutate(deleting.id)}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
