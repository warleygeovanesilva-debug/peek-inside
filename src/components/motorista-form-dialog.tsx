import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";
import { DocumentUploader } from "@/components/document-uploader";

type Motorista = Database["public"]["Tables"]["motoristas"]["Row"];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  motorista: Motorista | null;
  filialId: string;
}

export function MotoristaFormDialog({ open, onOpenChange, motorista, filialId }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    nome: "", cpf: "", cnh: "", cnh_categoria: "", cnh_validade: "",
    telefone: "", email: "", ativo: true, observacoes: "",
  });

  useEffect(() => {
    if (motorista) {
      setForm({
        nome: motorista.nome ?? "",
        cpf: motorista.cpf ?? "",
        cnh: motorista.cnh ?? "",
        cnh_categoria: motorista.cnh_categoria ?? "",
        cnh_validade: motorista.cnh_validade ?? "",
        telefone: motorista.telefone ?? "",
        email: motorista.email ?? "",
        ativo: motorista.ativo ?? true,
        observacoes: motorista.observacoes ?? "",
      });
    } else {
      setForm({ nome: "", cpf: "", cnh: "", cnh_categoria: "", cnh_validade: "", telefone: "", email: "", ativo: true, observacoes: "" });
    }
  }, [motorista, open]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        filial_id: filialId,
        nome: form.nome.trim(),
        cpf: form.cpf.trim() || null,
        cnh: form.cnh.trim() || null,
        cnh_categoria: form.cnh_categoria.trim().toUpperCase() || null,
        cnh_validade: form.cnh_validade || null,
        telefone: form.telefone.trim() || null,
        email: form.email.trim() || null,
        ativo: form.ativo,
        observacoes: form.observacoes.trim() || null,
      };
      if (motorista) {
        const { error } = await supabase.from("motoristas").update(payload).eq("id", motorista.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("motoristas").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(motorista ? "Motorista atualizado" : "Motorista cadastrado");
      qc.invalidateQueries({ queryKey: ["motoristas"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{motorista ? "Editar motorista" : "Novo motorista"}</DialogTitle></DialogHeader>
        <form
          onSubmit={(e) => { e.preventDefault(); if (!form.nome.trim()) return toast.error("Nome é obrigatório"); mutation.mutate(); }}
          className="grid gap-4 md:grid-cols-2"
        >
          <div className="space-y-2 md:col-span-2"><Label>Nome *</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required /></div>
          <div className="space-y-2"><Label>CPF</Label><Input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} /></div>
          <div className="space-y-2"><Label>Telefone</Label><Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></div>
          <div className="space-y-2"><Label>CNH</Label><Input value={form.cnh} onChange={(e) => setForm({ ...form, cnh: e.target.value })} /></div>
          <div className="space-y-2"><Label>Categoria CNH</Label><Input value={form.cnh_categoria} onChange={(e) => setForm({ ...form, cnh_categoria: e.target.value })} placeholder="A, B, C, D, E" /></div>
          <div className="space-y-2"><Label>Validade CNH</Label><Input type="date" value={form.cnh_validade} onChange={(e) => setForm({ ...form, cnh_validade: e.target.value })} /></div>
          <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div className="flex items-center gap-3 md:col-span-2">
            <Switch id="ativo" checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} />
            <Label htmlFor="ativo">Motorista ativo</Label>
          </div>
          <div className="space-y-2 md:col-span-2"><Label>Observações</Label><Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
          <div className="md:col-span-2 border-t pt-4">
            <DocumentUploader modulo="motoristas" entidadeId={motorista?.id} label="Documentos (CNH, comprovantes)" />
          </div>
          <DialogFooter className="md:col-span-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
