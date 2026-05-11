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
import { ChecklistFormDialog } from "@/components/checklist-form-dialog";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Checklist = Database["public"]["Tables"]["checklists"]["Row"];

export const Route = createFileRoute("/_app/checklist")({
  head: () => ({ meta: [{ title: "Checklist — FrotaPro" }] }),
  component: Page,
});

const statusColor: Record<string, string> = {
  aprovado: "bg-emerald-500/10 text-emerald-700 border-emerald-300",
  reprovado: "bg-red-500/10 text-red-700 border-red-300",
  pendente: "bg-yellow-500/10 text-yellow-700 border-yellow-300",
};

function Page() {
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Checklist | null>(null);
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<Checklist | null>(null);

  const { data: registros = [], isLoading } = useQuery({
    queryKey: ["checklists"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("checklists")
        .select("*, veiculos(placa), motoristas(nome)")
        .order("data", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as (Checklist & { veiculos: { placa: string } | null; motoristas: { nome: string } | null })[];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("checklists").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Removido"); qc.invalidateQueries({ queryKey: ["checklists"] }); setDeleting(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = registros.filter((r) => {
    const q = search.toLowerCase();
    return !q || r.veiculos?.placa?.toLowerCase().includes(q) || r.motoristas?.nome?.toLowerCase().includes(q);
  });

  const aprovados = registros.filter((r) => r.status === "aprovado").length;
  const reprovados = registros.filter((r) => r.status === "reprovado").length;
  const pendentes = registros.filter((r) => r.status === "pendente").length;

  const canDelete = profile?.isAdmin ?? false;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Checklist</h1>
          <p className="text-sm text-muted-foreground">Inspeções pré-viagem com avaliação automática</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4 mr-2" /> Novo checklist</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Aprovados</p><p className="text-2xl font-bold text-emerald-600">{aprovados}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Reprovados</p><p className="text-2xl font-bold text-red-600">{reprovados}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Pendentes</p><p className="text-2xl font-bold text-yellow-600">{pendentes}</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Buscar por placa ou motorista..." value={search} onChange={(e) => setSearch(e.target.value)} />
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
                  <TableHead>Itens</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum checklist registrado</TableCell></TableRow>
                ) : filtered.map((r) => {
                  const itens = Array.isArray(r.itens) ? r.itens.length : 0;
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs">{new Date(r.data).toLocaleString("pt-BR")}</TableCell>
                      <TableCell className="font-mono">{r.veiculos?.placa ?? "—"}</TableCell>
                      <TableCell>{r.motoristas?.nome ?? "—"}</TableCell>
                      <TableCell>{r.km?.toLocaleString("pt-BR") ?? "—"}</TableCell>
                      <TableCell className="text-xs">{itens} itens</TableCell>
                      <TableCell><Badge variant="outline" className={`capitalize ${statusColor[r.status]}`}>{r.status}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => { setEditing(r); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                        {canDelete && <Button variant="ghost" size="icon" onClick={() => setDeleting(r)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {profile?.filialId && <ChecklistFormDialog open={open} onOpenChange={setOpen} registro={editing} filialId={profile.filialId} />}

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Remover checklist?</AlertDialogTitle></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleting && del.mutate(deleting.id)}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
