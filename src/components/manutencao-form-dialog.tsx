import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Manutencao = Database["public"]["Tables"]["manutencoes"]["Row"];
const TIPOS = ["preventiva", "corretiva", "revisao", "troca_oleo", "outro"] as const;
const STATUS = ["agendada", "em_andamento", "concluida", "cancelada"] as const;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  registro: Manutencao | null;
  filialId: string;
}

export function ManutencaoFormDialog({ open, onOpenChange, registro, filialId }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    veiculo_id: "",
    tipo: "preventiva" as (typeof TIPOS)[number],
    status: "agendada" as (typeof STATUS)[number],
    descricao: "",
    data_prevista: "",
    data_realizada: "",
    km_realizacao: "",
    km_proxima: "",
    custo: "",
    fornecedor: "",
    observacoes: "",
  });

  const { data: veiculos = [] } = useQuery({
    queryKey: ["veiculos-select"],
    queryFn: async () => {
      const { data, error } = await supabase.from("veiculos").select("id, placa, modelo").order("placa");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (registro) {
      setForm({
        veiculo_id: registro.veiculo_id,
        tipo: registro.tipo,
        status: registro.status,
        descricao: registro.descricao,
        data_prevista: registro.data_prevista ?? "",
        data_realizada: registro.data_realizada ?? "",
        km_realizacao: registro.km_realizacao?.toString() ?? "",
        km_proxima: registro.km_proxima?.toString() ?? "",
        custo: registro.custo?.toString() ?? "",
        fornecedor: registro.fornecedor ?? "",
        observacoes: registro.observacoes ?? "",
      });
    } else {
      setForm({ veiculo_id: "", tipo: "preventiva", status: "agendada", descricao: "", data_prevista: "", data_realizada: "", km_realizacao: "", km_proxima: "", custo: "", fornecedor: "", observacoes: "" });
    }
  }, [registro, open]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        filial_id: filialId,
        veiculo_id: form.veiculo_id,
        tipo: form.tipo,
        status: form.status,
        descricao: form.descricao.trim(),
        data_prevista: form.data_prevista || null,
        data_realizada: form.data_realizada || null,
        km_realizacao: form.km_realizacao ? parseInt(form.km_realizacao) : null,
        km_proxima: form.km_proxima ? parseInt(form.km_proxima) : null,
        custo: form.custo ? parseFloat(form.custo) : null,
        fornecedor: form.fornecedor.trim() || null,
        observacoes: form.observacoes.trim() || null,
      };
      if (registro) {
        const { error } = await supabase.from("manutencoes").update(payload).eq("id", registro.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("manutencoes").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(registro ? "Manutenção atualizada" : "Manutenção criada");
      qc.invalidateQueries({ queryKey: ["manutencoes"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{registro ? "Editar manutenção" : "Nova manutenção"}</DialogTitle></DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.veiculo_id) return toast.error("Selecione o veículo");
            if (!form.descricao.trim()) return toast.error("Descrição obrigatória");
            mutation.mutate();
          }}
          className="grid gap-4 md:grid-cols-2"
        >
          <div className="space-y-2 md:col-span-2">
            <Label>Veículo *</Label>
            <Select value={form.veiculo_id} onValueChange={(v) => setForm({ ...form, veiculo_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>{veiculos.map((v) => <SelectItem key={v.id} value={v.id}>{v.placa} — {v.modelo ?? ""}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v as typeof form.tipo })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TIPOS.map((t) => <SelectItem key={t} value={t} className="capitalize">{t.replace("_", " ")}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as typeof form.status })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STATUS.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2"><Label>Descrição *</Label><Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} required /></div>
          <div className="space-y-2"><Label>Data prevista</Label><Input type="date" value={form.data_prevista} onChange={(e) => setForm({ ...form, data_prevista: e.target.value })} /></div>
          <div className="space-y-2"><Label>Data realizada</Label><Input type="date" value={form.data_realizada} onChange={(e) => setForm({ ...form, data_realizada: e.target.value })} /></div>
          <div className="space-y-2"><Label>KM da realização</Label><Input type="number" value={form.km_realizacao} onChange={(e) => setForm({ ...form, km_realizacao: e.target.value })} /></div>
          <div className="space-y-2"><Label>KM próxima revisão</Label><Input type="number" value={form.km_proxima} onChange={(e) => setForm({ ...form, km_proxima: e.target.value })} /></div>
          <div className="space-y-2"><Label>Custo (R$)</Label><Input type="number" step="0.01" value={form.custo} onChange={(e) => setForm({ ...form, custo: e.target.value })} /></div>
          <div className="space-y-2"><Label>Fornecedor</Label><Input value={form.fornecedor} onChange={(e) => setForm({ ...form, fornecedor: e.target.value })} /></div>
          <div className="space-y-2 md:col-span-2"><Label>Observações</Label><Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
          <DialogFooter className="md:col-span-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
