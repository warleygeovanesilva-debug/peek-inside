import { useState, useMemo, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/use-profile";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { VeiculoFormDialog } from "@/components/veiculo-form-dialog";
import { DataPagination } from "@/components/data-pagination";
import { getDocStatus, statusBadgeClass, statusLabel, formatDateBR } from "@/lib/validity";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Veiculo = Database["public"]["Tables"]["veiculos"]["Row"];

const PAGE_SIZE = 20;

export const Route = createFileRoute("/_app/frota")({
  head: () => ({ meta: [{ title: "Frota — FrotaPro" }] }),
  component: FrotaPage,
});

function FrotaPage() {
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [tipoFilter, setTipoFilter] = useState<string>("todos");
  const [crlvFilter, setCrlvFilter] = useState<string>("todos");
  const [page, setPage] = useState(1);
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

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return veiculos.filter((v) => {
      if (q && !(v.placa?.toLowerCase().includes(q) || v.marca?.toLowerCase().includes(q) || v.modelo?.toLowerCase().includes(q) || v.chassi?.toLowerCase().includes(q))) return false;
      if (statusFilter !== "todos" && v.status !== statusFilter) return false;
      if (tipoFilter !== "todos" && v.tipo !== tipoFilter) return false;
      if (crlvFilter !== "todos") {
        const s = getDocStatus(v.crlv_validade);
        if (crlvFilter === "ok" && s !== "ok") return false;
        if (crlvFilter === "warn" && s !== "warn") return false;
        if (crlvFilter === "expired" && s !== "expired") return false;
        if (crlvFilter === "missing" && s !== "missing") return false;
      }
      return true;
    });
  }, [veiculos, search, statusFilter, tipoFilter, crlvFilter]);

  useEffect(() => { setPage(1); }, [search, statusFilter, tipoFilter, crlvFilter]);

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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
          <div className="p-4 border-b flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Buscar placa, marca, modelo, chassi..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos status</SelectItem>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="manutencao">Manutenção</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
              </SelectContent>
            </Select>
            <Select value={tipoFilter} onValueChange={setTipoFilter}>
              <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos tipos</SelectItem>
                <SelectItem value="carro">Carro</SelectItem>
                <SelectItem value="moto">Moto</SelectItem>
                <SelectItem value="caminhao">Caminhão</SelectItem>
                <SelectItem value="van">Van</SelectItem>
                <SelectItem value="onibus">Ônibus</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
            <Select value={crlvFilter} onValueChange={setCrlvFilter}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">CRLV: todos</SelectItem>
                <SelectItem value="ok">CRLV em dia</SelectItem>
                <SelectItem value="warn">CRLV a vencer</SelectItem>
                <SelectItem value="expired">CRLV vencido</SelectItem>
                <SelectItem value="missing">CRLV ausente</SelectItem>
              </SelectContent>
            </Select>
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
                ) : paged.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum veículo encontrado</TableCell></TableRow>
                ) : paged.map((v) => {
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
          <DataPagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
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
