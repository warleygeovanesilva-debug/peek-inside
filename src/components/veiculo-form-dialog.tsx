import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";
import { DocumentUploader } from "@/components/document-uploader";

type Veiculo = Database["public"]["Tables"]["veiculos"]["Row"];

const TIPOS = ["carro", "caminhao", "moto", "van", "onibus", "outro"] as const;
const STATUS = ["ativo", "inativo", "manutencao", "vendido"] as const;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  veiculo: Veiculo | null;
  filialId: string;
}

export function VeiculoFormDialog({ open, onOpenChange, veiculo, filialId }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    placa: "",
    marca: "",
    modelo: "",
    ano: "",
    cor: "",
    tipo: "carro" as (typeof TIPOS)[number],
    combustivel: "",
    km_atual: "0",
    status: "ativo" as (typeof STATUS)[number],
    renavam: "",
    chassi: "",
    crlv_validade: "",
    observacoes: "",
  });

  useEffect(() => {
    if (veiculo) {
      setForm({
        placa: veiculo.placa ?? "",
        marca: veiculo.marca ?? "",
        modelo: veiculo.modelo ?? "",
        ano: veiculo.ano?.toString() ?? "",
        cor: veiculo.cor ?? "",
        tipo: (veiculo.tipo as (typeof TIPOS)[number]) ?? "carro",
        combustivel: veiculo.combustivel ?? "",
        km_atual: veiculo.km_atual?.toString() ?? "0",
        status: (veiculo.status as (typeof STATUS)[number]) ?? "ativo",
        renavam: veiculo.renavam ?? "",
        chassi: veiculo.chassi ?? "",
        crlv_validade: veiculo.crlv_validade ?? "",
        observacoes: veiculo.observacoes ?? "",
      });
    } else {
      setForm({
        placa: "", marca: "", modelo: "", ano: "", cor: "",
        tipo: "carro", combustivel: "", km_atual: "0", status: "ativo",
        renavam: "", chassi: "", crlv_validade: "", observacoes: "",
      });
    }
  }, [veiculo, open]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        filial_id: filialId,
        placa: form.placa.toUpperCase().trim(),
        marca: form.marca.trim() || null,
        modelo: form.modelo.trim() || null,
        ano: form.ano ? parseInt(form.ano) : null,
        cor: form.cor.trim() || null,
        tipo: form.tipo,
        combustivel: form.combustivel.trim() || null,
        km_atual: parseInt(form.km_atual) || 0,
        status: form.status,
        renavam: form.renavam.trim() || null,
        chassi: form.chassi.trim() || null,
        crlv_validade: form.crlv_validade || null,
        observacoes: form.observacoes.trim() || null,
      };
      if (veiculo) {
        const { error } = await supabase.from("veiculos").update(payload).eq("id", veiculo.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("veiculos").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(veiculo ? "Veículo atualizado" : "Veículo cadastrado");
      qc.invalidateQueries({ queryKey: ["veiculos"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{veiculo ? "Editar veículo" : "Novo veículo"}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => { e.preventDefault(); if (!form.placa.trim()) return toast.error("Placa é obrigatória"); mutation.mutate(); }}
          className="grid gap-4 md:grid-cols-2"
        >
          <div className="space-y-2">
            <Label>Placa *</Label>
            <Input value={form.placa} onChange={(e) => setForm({ ...form, placa: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v as typeof form.tipo })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TIPOS.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Marca</Label><Input value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} /></div>
          <div className="space-y-2"><Label>Modelo</Label><Input value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} /></div>
          <div className="space-y-2"><Label>Ano</Label><Input type="number" value={form.ano} onChange={(e) => setForm({ ...form, ano: e.target.value })} /></div>
          <div className="space-y-2"><Label>Cor</Label><Input value={form.cor} onChange={(e) => setForm({ ...form, cor: e.target.value })} /></div>
          <div className="space-y-2"><Label>Combustível</Label><Input value={form.combustivel} onChange={(e) => setForm({ ...form, combustivel: e.target.value })} placeholder="Diesel, Gasolina..." /></div>
          <div className="space-y-2"><Label>KM atual</Label><Input type="number" value={form.km_atual} onChange={(e) => setForm({ ...form, km_atual: e.target.value })} /></div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as typeof form.status })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STATUS.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Validade CRLV</Label><Input type="date" value={form.crlv_validade} onChange={(e) => setForm({ ...form, crlv_validade: e.target.value })} /></div>
          <div className="space-y-2"><Label>Renavam</Label><Input value={form.renavam} onChange={(e) => setForm({ ...form, renavam: e.target.value })} /></div>
          <div className="space-y-2"><Label>Chassi</Label><Input value={form.chassi} onChange={(e) => setForm({ ...form, chassi: e.target.value })} /></div>
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
