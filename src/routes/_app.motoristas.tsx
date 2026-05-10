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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { MotoristaFormDialog } from "@/components/motorista-form-dialog";
import { getDocStatus, statusBadgeClass, statusLabel, formatDateBR } from "@/lib/validity";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Motorista = Database["public"]["Tables"]["motoristas"]["Row"];

export const Route = createFileRoute("/_app/motoristas")({
  head: () => ({ meta: [{ title: "Motoristas — FrotaPro" }] }),
  component: MotoristasPage,
});

function MotoristasPage() {
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Motorista | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState<Motorista | null>(null);

  const { data: motoristas = [], isLoading } = useQuery({
    queryKey: ["motoristas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("motoristas").select("*").order("nome");
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("motoristas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Motorista removido");
      qc.invalidateQueries({ queryKey: ["motoristas"] });
      setDeleting(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = motoristas.filter((m) => {
    const q = search.toLowerCase();
    return !q || m.nome?.toLowerCase().includes(q) || m.cpf?.includes(q) || m.cnh?.includes(q);
  });

  const canEdit = profile?.canEdit ?? false;
  const canDelete = profile?.isAdmin ?? false;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Motoristas</h1>
          <p className="text-sm text-muted-foreground">Cadastro com alertas automáticos de vencimento da CNH</p>
        </div>
        {canEdit && (
          <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Novo motorista
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Buscar por nome, CPF, CNH..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>CNH</TableHead>
                  <TableHead>Validade CNH</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum motorista cadastrado</TableCell></TableRow>
                ) : filtered.map((m) => {
                  const cnh = getDocStatus(m.cnh_validade);
                  return (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.nome}</TableCell>
                      <TableCell className="font-mono text-sm">{m.cpf || "—"}</TableCell>
                      <TableCell className="font-mono text-sm">{m.cnh ? `${m.cnh}${m.cnh_categoria ? ` · ${m.cnh_categoria}` : ""}` : "—"}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-muted-foreground">{formatDateBR(m.cnh_validade)}</span>
                          <Badge variant="outline" className={statusBadgeClass(cnh)}>{statusLabel(cnh)}</Badge>
                        </div>
                      </TableCell>
                      <TableCell>{m.telefone || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={m.ativo ? statusBadgeClass("ok") : statusBadgeClass("expired")}>
                          {m.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {canEdit && (
                          <Button variant="ghost" size="icon" onClick={() => { setEditing(m); setDialogOpen(true); }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button variant="ghost" size="icon" onClick={() => setDeleting(m)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {profile?.filialId && (
        <MotoristaFormDialog open={dialogOpen} onOpenChange={setDialogOpen} motorista={editing} filialId={profile.filialId} />
      )}

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover motorista?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O motorista <span className="font-semibold">{deleting?.nome}</span> será removido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleting && deleteMutation.mutate(deleting.id)}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
