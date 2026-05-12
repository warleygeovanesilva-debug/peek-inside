import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Ocorrencia = Database["public"]["Tables"]["ocorrencias"]["Row"];
type Tipo = Database["public"]["Enums"]["ocorrencia_tipo"];
type Severidade = Database["public"]["Enums"]["ocorrencia_severidade"];
type Status = Database["public"]["Enums"]["ocorrencia_status"];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  registro: Ocorrencia | null;
  filialId: string;
}

export function OcorrenciaFormDialog({ open, onOpenChange, registro, filialId }: Props) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [form, setForm] = useState({
    tipo: "multa" as Tipo,
    severidade: "media" as Severidade,
    status: "aberta" as Status,
    veiculo_id: "",
    motorista_id: "",
    data: new Date().toISOString().slice(0, 10),
    data_resolucao: "",
    local: "",
    descricao: "",
    valor: "",
    numero_documento: "",
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
  const { data: motoristas = [] } = useQuery({
    queryKey: ["motoristas-select"],
    queryFn: async () => {
      const { data, error } = await supabase.from("motoristas").select("id, nome").eq("ativo", true).order("nome");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (registro) {
      setForm({
        tipo: registro.tipo,
        severidade: registro.severidade,
        status: registro.status,
        veiculo_id: registro.veiculo_id ?? "",
        motorista_id: registro.motorista_id ?? "",
        data: registro.data,
        data_resolucao: registro.data_resolucao ?? "",
        local: registro.local ?? "",
        descricao: registro.descricao,
        valor: registro.valor?.toString() ?? "",
        numero_documento: registro.numero_documento ?? "",
        observacoes: registro.observacoes ?? "",
      });
    } else {
      setForm({
        tipo: "multa", severidade: "media", status: "aberta",
        veiculo_id: "", motorista_id: "",
        data: new Date().toISOString().slice(0, 10), data_resolucao: "",
        local: "", descricao: "", valor: "", numero_documento: "", observacoes: "",
      });
    }
  }, [registro, open]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        filial_id: filialId,
        tipo: form.tipo,
        severidade: form.severidade,
        status: form.status,
        veiculo_id: form.veiculo_id || null,
        motorista_id: form.motorista_id || null,
        data: form.data,
        data_resolucao: form.data_resolucao || null,
        local: form.local.trim() || null,
        descricao: form.descricao.trim(),
        valor: form.valor ? parseFloat(form.valor) : null,
        numero_documento: form.numero_documento.trim() || null,
        observacoes: form.observacoes.trim() || null,
        created_by: user?.id ?? null,
      };
      if (registro) {
        const { error } = await supabase.from("ocorrencias").update(payload).eq("id", registro.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("ocorrencias").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(registro ? "Ocorrência atualizada" : "Ocorrência registrada");
      qc.invalidateQueries({ queryKey: ["ocorrencias"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{registro ? "Editar ocorrência" : "Nova ocorrência"}</DialogTitle></DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.descricao.trim()) return toast.error("Informe a descrição");
            mutation.mutate();
          }}
          className="grid gap-4 md:grid-cols-2"
        >
          <div className="space-y-2">
            <Label>Tipo *</Label>
            <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v as Tipo })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="multa">Multa</SelectItem>
                <SelectItem value="sinistro">Sinistro</SelectItem>
                <SelectItem value="avaria">Avaria</SelectItem>
                <SelectItem value="infracao">Infração</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Severidade</Label>
            <Select value={form.severidade} onValueChange={(v) => setForm({ ...form, severidade: v as Severidade })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="baixa">Baixa</SelectItem>
                <SelectItem value="media">Média</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="critica">Crítica</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as Status })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="aberta">Aberta</SelectItem>
                <SelectItem value="em_analise">Em análise</SelectItem>
                <SelectItem value="resolvida">Resolvida</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Data *</Label><Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} required /></div>

          <div className="space-y-2">
            <Label>Veículo</Label>
            <Select value={form.veiculo_id || "_"} onValueChange={(v) => setForm({ ...form, veiculo_id: v === "_" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_">Sem veículo</SelectItem>
                {veiculos.map((v) => <SelectItem key={v.id} value={v.id}>{v.placa} — {v.modelo ?? ""}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Motorista</Label>
            <Select value={form.motorista_id || "_"} onValueChange={(v) => setForm({ ...form, motorista_id: v === "_" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_">Sem motorista</SelectItem>
                {motoristas.map((m) => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2"><Label>Local</Label><Input value={form.local} onChange={(e) => setForm({ ...form, local: e.target.value })} /></div>
          <div className="space-y-2"><Label>Nº documento / AIT</Label><Input value={form.numero_documento} onChange={(e) => setForm({ ...form, numero_documento: e.target.value })} /></div>
          <div className="space-y-2"><Label>Valor (R$)</Label><Input type="number" step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} /></div>
          <div className="space-y-2"><Label>Data resolução</Label><Input type="date" value={form.data_resolucao} onChange={(e) => setForm({ ...form, data_resolucao: e.target.value })} /></div>

          <div className="space-y-2 md:col-span-2"><Label>Descrição *</Label><Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} required /></div>
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
