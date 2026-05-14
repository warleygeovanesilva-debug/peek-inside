import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Shield, Building2, UserCog } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/use-profile";
import { useAuth } from "@/hooks/use-auth";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_app/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — FrotaPro" }] }),
  component: Page,
});

type Filial = {
  id: string;
  nome: string;
  cnpj: string | null;
  cidade: string | null;
  estado: string | null;
  endereco: string | null;
  ativo: boolean;
};

type AppRole = "admin" | "gestor" | "motorista";

function Page() {
  const { data: profileData, isLoading } = useProfile();

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie filiais, usuários, papéis e seu perfil
        </p>
      </div>

      <Tabs defaultValue="perfil" className="space-y-4">
        <TabsList>
          <TabsTrigger value="perfil">
            <UserCog className="mr-2 h-4 w-4" /> Meu Perfil
          </TabsTrigger>
          {profileData?.isAdmin && (
            <>
              <TabsTrigger value="filiais">
                <Building2 className="mr-2 h-4 w-4" /> Filiais
              </TabsTrigger>
              <TabsTrigger value="usuarios">
                <Shield className="mr-2 h-4 w-4" /> Usuários e Papéis
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="perfil">
          <PerfilTab />
        </TabsContent>

        {profileData?.isAdmin && (
          <>
            <TabsContent value="filiais">
              <FiliaisTab />
            </TabsContent>
            <TabsContent value="usuarios">
              <UsuariosTab />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}

/* ───────────────────────── PERFIL ───────────────────────── */

function PerfilTab() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data, isLoading } = useProfile();

  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [edited, setEdited] = useState(false);

  // hidrata após carregar
  if (data?.profile && !edited && nome === "" && telefone === "") {
    if (data.profile.nome) setNome(data.profile.nome);
    if (data.profile.telefone) setTelefone(data.profile.telefone);
  }

  const filiaisQ = useQuery({
    queryKey: ["filiais-list-perfil"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("filiais")
        .select("id,nome")
        .order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("não autenticado");
      const { error } = await supabase
        .from("profiles")
        .update({ nome, telefone })
        .eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Perfil atualizado");
      qc.invalidateQueries({ queryKey: ["profile"] });
      setEdited(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  const filialNome =
    filiaisQ.data?.find((f) => f.id === data?.filialId)?.nome ?? "—";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Meu perfil</CardTitle>
        <CardDescription>Dados pessoais e papéis atribuídos</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>E-mail</Label>
            <Input value={data?.profile?.email ?? user?.email ?? ""} disabled />
          </div>
          <div>
            <Label>Filial</Label>
            <Input value={filialNome} disabled />
          </div>
          <div>
            <Label>Nome</Label>
            <Input
              value={nome}
              onChange={(e) => {
                setNome(e.target.value);
                setEdited(true);
              }}
            />
          </div>
          <div>
            <Label>Telefone</Label>
            <Input
              value={telefone}
              onChange={(e) => {
                setTelefone(e.target.value);
                setEdited(true);
              }}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Papéis</Label>
          <div className="flex flex-wrap gap-2">
            {data?.roles?.length ? (
              data.roles.map((r, i) => (
                <Badge key={i} variant="secondary">
                  {r.role}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">Nenhum papel</span>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={() => save.mutate()} disabled={!edited || save.isPending}>
            Salvar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ───────────────────────── FILIAIS ───────────────────────── */

function FiliaisTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Filial | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["filiais"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("filiais")
        .select("*")
        .order("nome");
      if (error) throw error;
      return data as Filial[];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("filiais").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Filial removida");
      qc.invalidateQueries({ queryKey: ["filiais"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Filiais</CardTitle>
          <CardDescription>Unidades operacionais da empresa</CardDescription>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> Nova filial
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>Cidade/UF</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-32 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data ?? []).map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">{f.nome}</TableCell>
                  <TableCell>{f.cnpj ?? "—"}</TableCell>
                  <TableCell>
                    {f.cidade ?? "—"}
                    {f.estado ? `/${f.estado}` : ""}
                  </TableCell>
                  <TableCell>
                    <Badge variant={f.ativo ? "default" : "secondary"}>
                      {f.ativo ? "Ativa" : "Inativa"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditing(f);
                          setOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover filial?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Essa ação não pode ser desfeita. Registros vinculados
                              poderão ficar órfãos.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => del.mutate(f.id)}>
                              Remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!data?.length && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Nenhuma filial cadastrada
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <FilialDialog open={open} onOpenChange={setOpen} editing={editing} />
    </Card>
  );
}

function FilialDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Filial | null;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Partial<Filial>>({});

  // Reset on open change
  if (open && form.id !== editing?.id && editing) {
    setForm(editing);
  }
  if (open && !editing && form.id) {
    setForm({});
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!form.nome) throw new Error("Nome é obrigatório");
      if (editing) {
        const { error } = await supabase
          .from("filiais")
          .update({
            nome: form.nome,
            cnpj: form.cnpj ?? null,
            cidade: form.cidade ?? null,
            estado: form.estado ?? null,
            endereco: form.endereco ?? null,
            ativo: form.ativo ?? true,
          })
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("filiais").insert({
          nome: form.nome,
          cnpj: form.cnpj ?? null,
          cidade: form.cidade ?? null,
          estado: form.estado ?? null,
          endereco: form.endereco ?? null,
          ativo: form.ativo ?? true,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Filial atualizada" : "Filial criada");
      qc.invalidateQueries({ queryKey: ["filiais"] });
      qc.invalidateQueries({ queryKey: ["filiais-list-perfil"] });
      qc.invalidateQueries({ queryKey: ["filiais-usuarios"] });
      onOpenChange(false);
      setForm({});
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Editar filial" : "Nova filial"}</DialogTitle>
          <DialogDescription>Cadastro de unidade operacional</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label>Nome *</Label>
            <Input
              value={form.nome ?? ""}
              onChange={(e) => setForm((s) => ({ ...s, nome: e.target.value }))}
            />
          </div>
          <div>
            <Label>CNPJ</Label>
            <Input
              value={form.cnpj ?? ""}
              onChange={(e) => setForm((s) => ({ ...s, cnpj: e.target.value }))}
            />
          </div>
          <div>
            <Label>Cidade</Label>
            <Input
              value={form.cidade ?? ""}
              onChange={(e) => setForm((s) => ({ ...s, cidade: e.target.value }))}
            />
          </div>
          <div>
            <Label>Estado (UF)</Label>
            <Input
              maxLength={2}
              value={form.estado ?? ""}
              onChange={(e) => setForm((s) => ({ ...s, estado: e.target.value.toUpperCase() }))}
            />
          </div>
          <div className="md:col-span-2">
            <Label>Endereço</Label>
            <Input
              value={form.endereco ?? ""}
              onChange={(e) => setForm((s) => ({ ...s, endereco: e.target.value }))}
            />
          </div>
          <div className="flex items-center gap-2 md:col-span-2">
            <Switch
              checked={form.ativo ?? true}
              onCheckedChange={(v) => setForm((s) => ({ ...s, ativo: v }))}
            />
            <Label>Ativa</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ───────────────────────── USUÁRIOS / PAPÉIS ───────────────────────── */

type ProfileRow = {
  id: string;
  nome: string | null;
  email: string | null;
  filial_id: string | null;
};

function UsuariosTab() {
  const qc = useQueryClient();

  const usersQ = useQuery({
    queryKey: ["all-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,nome,email,filial_id")
        .order("nome");
      if (error) throw error;
      return data as ProfileRow[];
    },
  });

  const rolesQ = useQuery({
    queryKey: ["all-roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("id,user_id,role,filial_id");
      if (error) throw error;
      return data ?? [];
    },
  });

  const filiaisQ = useQuery({
    queryKey: ["filiais-usuarios"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("filiais")
        .select("id,nome")
        .order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });

  const updateFilial = useMutation({
    mutationFn: async ({ id, filial_id }: { id: string; filial_id: string | null }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ filial_id })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Filial atualizada");
      qc.invalidateQueries({ queryKey: ["all-profiles"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addRole = useMutation({
    mutationFn: async ({
      user_id,
      role,
      filial_id,
    }: {
      user_id: string;
      role: AppRole;
      filial_id: string | null;
    }) => {
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id, role, filial_id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Papel atribuído");
      qc.invalidateQueries({ queryKey: ["all-roles"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeRole = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("user_roles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Papel removido");
      qc.invalidateQueries({ queryKey: ["all-roles"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (usersQ.isLoading || rolesQ.isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  const filiais = filiaisQ.data ?? [];
  const rolesByUser = new Map<string, typeof rolesQ.data>();
  for (const r of rolesQ.data ?? []) {
    const arr = rolesByUser.get(r.user_id) ?? [];
    arr.push(r);
    rolesByUser.set(r.user_id, arr);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Usuários e papéis</CardTitle>
        <CardDescription>
          Atribua filial e papéis (admin, gestor, motorista) a cada usuário
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>Filial</TableHead>
              <TableHead>Papéis</TableHead>
              <TableHead className="w-64">Atribuir papel</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(usersQ.data ?? []).map((u) => {
              const userRoles = rolesByUser.get(u.id) ?? [];
              return (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="font-medium">{u.nome ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={u.filial_id ?? "none"}
                      onValueChange={(v) =>
                        updateFilial.mutate({
                          id: u.id,
                          filial_id: v === "none" ? null : v,
                        })
                      }
                    >
                      <SelectTrigger className="w-44">
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sem filial</SelectItem>
                        {filiais.map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            {f.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {userRoles.length === 0 && (
                        <span className="text-sm text-muted-foreground">Nenhum</span>
                      )}
                      {userRoles.map((r) => (
                        <Badge
                          key={r.id}
                          variant="secondary"
                          className="cursor-pointer"
                          onClick={() => removeRole.mutate(r.id)}
                          title="Clique para remover"
                        >
                          {r.role} ✕
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <RoleAssigner
                      onAssign={(role) =>
                        addRole.mutate({
                          user_id: u.id,
                          role,
                          filial_id: u.filial_id,
                        })
                      }
                    />
                  </TableCell>
                </TableRow>
              );
            })}
            {!usersQ.data?.length && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  Nenhum usuário cadastrado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function RoleAssigner({ onAssign }: { onAssign: (r: AppRole) => void }) {
  const [role, setRole] = useState<AppRole>("motorista");
  return (
    <div className="flex gap-2">
      <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
        <SelectTrigger className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="admin">admin</SelectItem>
          <SelectItem value="gestor">gestor</SelectItem>
          <SelectItem value="motorista">motorista</SelectItem>
        </SelectContent>
      </Select>
      <Button size="sm" onClick={() => onAssign(role)}>
        Adicionar
      </Button>
    </div>
  );
}
