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
import { VeiculoFormDialog } from "@/components/veiculo-form-dialog";
import { getDocStatus, statusBadgeClass, statusLabel, formatDateBR } from "@/lib/validity";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Veiculo = Database["public"]["Tables"]["veiculos"]["Row"];

export const Route = createFileRoute("/_app/frota")({
  head: () => ({ meta: [{ title: "Frota — FrotaPro" }] }),
  component: FrotaPage,
});

function FrotaPage() {
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Veiculo | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState<Veiculo | null>(null);

  const { data: veiculos = [], isLoading } = useQuery({
    queryKey: ["veiculos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("veiculos").select("*").order("placa");
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("veiculos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Veículo removido");
      qc.invalidateQueries({ queryKey: ["veiculos"] });
      setDeleting(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = veiculos.filter((v) => {
    const q = search.toLowerCase();
    return !q || v.placa?.toLowerCase().includes(q) || v.marca?.toLowerCase().includes(q) || v.modelo?.toLowerCase().includes(q);
  });

  const canEdit = profile?.canEdit ?? false;
  const canDelete = profile?.isAdmin ?? false;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Frota</h1>
          <p className="text-sm text-muted-foreground">Gerencie veículos e acompanhe validade do CRLV</p>
        </div>
        {canEdit && (
          <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Novo veículo
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Buscar por placa, marca, modelo..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Placa</TableHead>
                  <TableHead>Veículo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>KM</TableHead>
                  <TableHead>CRLV</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum veículo cadastrado</TableCell></TableRow>
                ) : filtered.map((v) => {
                  const crlv = getDocStatus(v.crlv_validade);
                  return (
                    <TableRow key={v.id}>
                      <TableCell className="font-mono font-semibold">{v.placa}</TableCell>
                      <TableCell>{[v.marca, v.modelo, v.ano].filter(Boolean).join(" ") || "—"}</TableCell>
                      <TableCell className="capitalize">{v.tipo}</TableCell>
                      <TableCell>{v.km_atual.toLocaleString("pt-BR")} km</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-muted-foreground">{formatDateBR(v.crlv_validade)}</span>
                          <Badge variant="outline" className={statusBadgeClass(crlv)}>{statusLabel(crlv)}</Badge>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{v.status}</Badge></TableCell>
                      <TableCell className="text-right">
                        {canEdit && (
                          <Button variant="ghost" size="icon" onClick={() => { setEditing(v); setDialogOpen(true); }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button variant="ghost" size="icon" onClick={() => setDeleting(v)}>
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
        <VeiculoFormDialog open={dialogOpen} onOpenChange={setDialogOpen} veiculo={editing} filialId={profile.filialId} />
      )}

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover veículo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O veículo <span className="font-mono font-semibold">{deleting?.placa}</span> será removido.
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
