import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Shield, Building2, UserCog, Truck, Users, Link2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/use-profile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_app/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — FrotaPro" }] }),
  component: Page,
});

type AppRole = "admin" | "gestor" | "motorista";

// ── Filiais ──────────────────────────────────────────────
function GestaoFiliais() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleting, setDeleting] = useState<any>(null);
  const [form, setForm] = useState({ nome: "", cnpj: "", cidade: "", estado: "", endereco: "", telefone: "", email: "" });

  const { data: filiais = [], isLoading } = useQuery({
    queryKey: ["filiais"],
    queryFn: async () => { const { data, error } = await supabase.from("filiais").select("*").order("nome"); if (error) throw error; return data ?? []; },
  });

  const openNew = () => { setEditing(null); setForm({ nome:"", cnpj:"", cidade:"", estado:"", endereco:"", telefone:"", email:"" }); setOpen(true); };
  const openEdit = (f: any) => { setEditing(f); setForm({ nome:f.nome, cnpj:f.cnpj??'', cidade:f.cidade??'', estado:f.estado??'', endereco:f.endereco??'', telefone:f.telefone??'', email:f.email??'' }); setOpen(true); };

  const save = useMutation({
    mutationFn: async () => {
      if (!form.nome.trim()) throw new Error("Nome é obrigatório");
      const payload = { nome:form.nome.trim(), cnpj:form.cnpj||null, cidade:form.cidade||null, estado:form.estado||null, endereco:form.endereco||null, telefone:form.telefone||null, email:form.email||null };
      if (editing) { const { error } = await supabase.from("filiais").update(payload).eq("id", editing.id); if (error) throw error; }
      else { const { error } = await supabase.from("filiais").insert(payload); if (error) throw error; }
    },
    onSuccess: () => { toast.success(editing ? "Filial atualizada!" : "Filial criada!"); qc.invalidateQueries({ queryKey: ["filiais"] }); setOpen(false); },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("filiais").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Filial removida"); qc.invalidateQueries({ queryKey: ["filiais"] }); setDeleting(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Gerencie as filiais da empresa</p>
        <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1.5" />Nova filial</Button>
      </div>
      <Card className="border-border/50">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader><TableRow className="border-border/50"><TableHead>Nome</TableHead><TableHead>CNPJ</TableHead><TableHead>Cidade/UF</TableHead><TableHead>Telefone</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
            <TableBody>
              {isLoading ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm">Carregando...</TableCell></TableRow>
                : filiais.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm">Nenhuma filial cadastrada</TableCell></TableRow>
                : filiais.map((f: any) => (
                  <TableRow key={f.id} className="border-border/30">
                    <TableCell className="font-medium">{f.nome}</TableCell>
                    <TableCell className="text-xs font-mono">{f.cnpj??'—'}</TableCell>
                    <TableCell className="text-xs">{[f.cidade, f.estado].filter(Boolean).join(' / ')||'—'}</TableCell>
                    <TableCell className="text-xs">{f.telefone??'—'}</TableCell>
                    <TableCell><Badge variant="outline" className={f.ativo ? "text-emerald-400 border-emerald-500/30" : "text-muted-foreground"}>{f.ativo ? "Ativa" : "Inativa"}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(f)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleting(f)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Editar filial" : "Nova filial"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Nome *</Label><Input className="mt-1" value={form.nome} onChange={e => setForm(f => ({...f, nome:e.target.value}))} placeholder="Ex: Matriz Belém" /></div>
            <div><Label className="text-xs">CNPJ</Label><Input className="mt-1" value={form.cnpj} onChange={e => setForm(f => ({...f, cnpj:e.target.value}))} placeholder="00.000.000/0000-00" /></div>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2"><Label className="text-xs">Cidade</Label><Input className="mt-1" value={form.cidade} onChange={e => setForm(f => ({...f, cidade:e.target.value}))} /></div>
              <div><Label className="text-xs">UF</Label><Input className="mt-1" maxLength={2} value={form.estado} onChange={e => setForm(f => ({...f, estado:e.target.value.toUpperCase()}))} /></div>
            </div>
            <div><Label className="text-xs">Endereço</Label><Input className="mt-1" value={form.endereco} onChange={e => setForm(f => ({...f, endereco:e.target.value}))} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Telefone</Label><Input className="mt-1" value={form.telefone} onChange={e => setForm(f => ({...f, telefone:e.target.value}))} /></div>
              <div><Label className="text-xs">E-mail</Label><Input className="mt-1" value={form.email} onChange={e => setForm(f => ({...f, email:e.target.value}))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={o => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Remover filial?</AlertDialogTitle><AlertDialogDescription>Isso pode afetar usuários, veículos e motoristas vinculados.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => deleting && del.mutate(deleting.id)}>Remover</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Usuários e Permissões ────────────────────────────────
function GestaoUsuarios() {
  const qc = useQueryClient();

  const { data: filiais = [] } = useQuery({
    queryKey: ["filiais"],
    queryFn: async () => { const { data } = await supabase.from("filiais").select("id,nome").order("nome"); return data ?? []; },
  });

  const { data: usuarios = [], isLoading } = useQuery({
    queryKey: ["usuarios-config"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*, user_roles(id,role,filial_id)").order("nome_completo");
      if (error) throw error;
      return data ?? [];
    },
  });

  const updateFilial = useMutation({
    mutationFn: async ({ id, filial_id }: { id: string; filial_id: string | null }) => {
      const { error } = await supabase.from("profiles").update({ filial_id }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Filial atualizada!"); qc.invalidateQueries({ queryKey: ["usuarios-config"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const addRole = useMutation({
    mutationFn: async ({ user_id, role, filial_id }: { user_id: string; role: AppRole; filial_id: string | null }) => {
      const { error } = await supabase.from("user_roles").insert({ user_id, role, filial_id });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Permissão adicionada!"); qc.invalidateQueries({ queryKey: ["usuarios-config"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeRole = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("user_roles").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Permissão removida"); qc.invalidateQueries({ queryKey: ["usuarios-config"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Gerencie usuários, filiais e permissões de acesso</p>
      <Card className="border-border/50">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader><TableRow className="border-border/50"><TableHead>Usuário</TableHead><TableHead>Filial</TableHead><TableHead>Permissões</TableHead><TableHead>Adicionar permissão</TableHead></TableRow></TableHeader>
            <TableBody>
              {isLoading ? <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground text-sm">Carregando...</TableCell></TableRow>
                : usuarios.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground text-sm">Nenhum usuário cadastrado</TableCell></TableRow>
                : usuarios.map((u: any) => (
                  <TableRow key={u.id} className="border-border/30">
                    <TableCell>
                      <p className="font-medium text-sm">{u.nome_completo ?? "—"}</p>
                    </TableCell>
                    <TableCell>
                      <Select value={u.filial_id ?? "none"} onValueChange={v => updateFilial.mutate({ id: u.id, filial_id: v === "none" ? null : v })}>
                        <SelectTrigger className="w-40 h-7 text-xs"><SelectValue placeholder="Sem filial" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sem filial</SelectItem>
                          {filiais.map((f: any) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(u.user_roles ?? []).length === 0 && <span className="text-xs text-muted-foreground">Nenhuma</span>}
                        {(u.user_roles ?? []).map((r: any) => (
                          <Badge key={r.id} variant="secondary" className="cursor-pointer text-xs" onClick={() => removeRole.mutate(r.id)} title="Clique para remover">
                            {r.role} ✕
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <RoleAssigner onAssign={role => addRole.mutate({ user_id: u.id, role, filial_id: u.filial_id })} />
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function RoleAssigner({ onAssign }: { onAssign: (r: AppRole) => void }) {
  const [role, setRole] = useState<AppRole>("motorista");
  return (
    <div className="flex gap-2">
      <Select value={role} onValueChange={v => setRole(v as AppRole)}>
        <SelectTrigger className="w-32 h-7 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="super_admin">super_admin</SelectItem>
          <SelectItem value="admin">admin</SelectItem>
          <SelectItem value="gestor">gestor</SelectItem>
          <SelectItem value="motorista">motorista</SelectItem>
        </SelectContent>
      </Select>
      <Button size="sm" className="h-7 text-xs" onClick={() => onAssign(role)}>Adicionar</Button>
    </div>
  );
}

// ── Vincular Veículos e Motoristas ───────────────────────
function VincularFilial() {
  const qc = useQueryClient();

  const { data: filiais = [] } = useQuery({
    queryKey: ["filiais"],
    queryFn: async () => { const { data } = await supabase.from("filiais").select("id,nome").order("nome"); return data ?? []; },
  });

  const { data: veiculos = [] } = useQuery({
    queryKey: ["veiculos-vincular"],
    queryFn: async () => { const { data } = await supabase.from("veiculos").select("id,placa,modelo,filial_id").order("placa"); return data ?? []; },
  });

  const { data: motoristas = [] } = useQuery({
    queryKey: ["motoristas-vincular"],
    queryFn: async () => { const { data } = await supabase.from("motoristas").select("id,nome,filial_id").order("nome"); return data ?? []; },
  });

  const updateVeiculoFilial = useMutation({
    mutationFn: async ({ id, filial_id }: { id: string; filial_id: string | null }) => {
      const { error } = await supabase.from("veiculos").update({ filial_id }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Veículo atualizado!"); qc.invalidateQueries({ queryKey: ["veiculos-vincular"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMotoristaFilial = useMutation({
    mutationFn: async ({ id, filial_id }: { id: string; filial_id: string | null }) => {
      const { error } = await supabase.from("motoristas").update({ filial_id }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Motorista atualizado!"); qc.invalidateQueries({ queryKey: ["motoristas-vincular"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      {/* Veículos */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Truck className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Vincular Veículos às Filiais</h3>
        </div>
        <Card className="border-border/50">
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader><TableRow className="border-border/50"><TableHead>Placa</TableHead><TableHead>Modelo</TableHead><TableHead>Filial atual</TableHead><TableHead>Alterar para</TableHead></TableRow></TableHeader>
              <TableBody>
                {veiculos.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground text-sm">Nenhum veículo cadastrado</TableCell></TableRow>
                  : veiculos.map((v: any) => (
                    <TableRow key={v.id} className="border-border/30">
                      <TableCell className="font-mono font-semibold text-sm">{v.placa}</TableCell>
                      <TableCell className="text-sm">{v.modelo ?? "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{filiais.find((f: any) => f.id === v.filial_id)?.nome ?? "Sem filial"}</TableCell>
                      <TableCell>
                        <Select value={v.filial_id ?? "none"} onValueChange={fid => updateVeiculoFilial.mutate({ id: v.id, filial_id: fid === "none" ? null : fid })}>
                          <SelectTrigger className="w-40 h-7 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Sem filial</SelectItem>
                            {filiais.map((f: any) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Motoristas */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Vincular Motoristas às Filiais</h3>
        </div>
        <Card className="border-border/50">
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader><TableRow className="border-border/50"><TableHead>Nome</TableHead><TableHead>Filial atual</TableHead><TableHead>Alterar para</TableHead></TableRow></TableHeader>
              <TableBody>
                {motoristas.length === 0 ? <TableRow><TableCell colSpan={3} className="text-center py-6 text-muted-foreground text-sm">Nenhum motorista cadastrado</TableCell></TableRow>
                  : motoristas.map((m: any) => (
                    <TableRow key={m.id} className="border-border/30">
                      <TableCell className="font-medium text-sm">{m.nome}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{filiais.find((f: any) => f.id === m.filial_id)?.nome ?? "Sem filial"}</TableCell>
                      <TableCell>
                        <Select value={m.filial_id ?? "none"} onValueChange={fid => updateMotoristaFilial.mutate({ id: m.id, filial_id: fid === "none" ? null : fid })}>
                          <SelectTrigger className="w-40 h-7 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Sem filial</SelectItem>
                            {filiais.map((f: any) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Página principal ─────────────────────────────────────
function Page() {
  const { data: profile } = useProfile();
  const isAdmin = profile?.isAdmin ?? false;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-sm text-muted-foreground">Filiais, usuários, permissões e vínculos</p>
      </div>

      <Tabs defaultValue="filiais">
        <TabsList className="bg-card border border-border/50">
          <TabsTrigger value="filiais" className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" />Filiais</TabsTrigger>
          <TabsTrigger value="usuarios" className="flex items-center gap-1.5"><UserCog className="h-3.5 w-3.5" />Usuários</TabsTrigger>
          <TabsTrigger value="vincular" className="flex items-center gap-1.5"><Link2 className="h-3.5 w-3.5" />Vincular à Filial</TabsTrigger>
        </TabsList>

        <TabsContent value="filiais" className="mt-4">
          <GestaoFiliais />
        </TabsContent>

        <TabsContent value="usuarios" className="mt-4">
          {isAdmin ? <GestaoUsuarios /> : (
            <Card className="border-border/50">
              <CardContent className="py-12 text-center text-muted-foreground">
                <Shield className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm">Apenas administradores podem gerenciar usuários</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="vincular" className="mt-4">
          {isAdmin ? <VincularFilial /> : (
            <Card className="border-border/50">
              <CardContent className="py-12 text-center text-muted-foreground">
                <Shield className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm">Apenas administradores podem vincular veículos e motoristas</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
