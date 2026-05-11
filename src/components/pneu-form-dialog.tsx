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

type Pneu = Database["public"]["Tables"]["pneus"]["Row"];
const STATUS = ["em_uso", "estoque", "recapagem", "descartado"] as const;
const POSICOES = ["DE", "DD", "TE", "TD", "TE-Externo", "TD-Externo", "TE-Interno", "TD-Interno", "Estepe"];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  registro: Pneu | null;
  filialId: string;
}

export function PneuFormDialog({ open, onOpenChange, registro, filialId }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    veiculo_id: "",
    numero_serie: "",
    marca: "",
    modelo: "",
    medida: "",
    dot: "",
    posicao: "",
    km_instalacao: "",
    km_atual: "",
    status: "estoque" as (typeof STATUS)[number],
    data_compra: "",
    custo: "",
    observacoes: "",
  });

  const { data: veiculos = [] } = useQuery({
    queryKey: ["veiculos-select"],
    queryFn: async () => {
      const { data, error } = await supabase.from("veiculos").select("id, placa").order("placa");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (registro) {
      setForm({
        veiculo_id: registro.veiculo_id ?? "",
        numero_serie: registro.numero_serie ?? "",
        marca: registro.marca ?? "",
        modelo: registro.modelo ?? "",
        medida: registro.medida ?? "",
        dot: registro.dot ?? "",
        posicao: registro.posicao ?? "",
        km_instalacao: registro.km_instalacao?.toString() ?? "",
        km_atual: registro.km_atual?.toString() ?? "",
        status: registro.status,
        data_compra: registro.data_compra ?? "",
        custo: registro.custo?.toString() ?? "",
        observacoes: registro.observacoes ?? "",
      });
    } else {
      setForm({ veiculo_id: "", numero_serie: "", marca: "", modelo: "", medida: "", dot: "", posicao: "", km_instalacao: "", km_atual: "", status: "estoque", data_compra: "", custo: "", observacoes: "" });
    }
  }, [registro, open]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        filial_id: filialId,
        veiculo_id: form.veiculo_id || null,
        numero_serie: form.numero_serie.trim() || null,
        marca: form.marca.trim() || null,
        modelo: form.modelo.trim() || null,
        medida: form.medida.trim() || null,
        dot: form.dot.trim() || null,
        posicao: form.posicao || null,
        km_instalacao: form.km_instalacao ? parseInt(form.km_instalacao) : null,
        km_atual: form.km_atual ? parseInt(form.km_atual) : null,
        status: form.status,
        data_compra: form.data_compra || null,
        custo: form.custo ? parseFloat(form.custo) : null,
        observacoes: form.observacoes.trim() || null,
      };
      if (registro) {
        const { error } = await supabase.from("pneus").update(payload).eq("id", registro.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("pneus").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(registro ? "Pneu atualizado" : "Pneu cadastrado");
      qc.invalidateQueries({ queryKey: ["pneus"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{registro ? "Editar pneu" : "Novo pneu"}</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2"><Label>Nº de série / patrimônio</Label><Input value={form.numero_serie} onChange={(e) => setForm({ ...form, numero_serie: e.target.value })} /></div>
          <div className="space-y-2"><Label>DOT</Label><Input value={form.dot} onChange={(e) => setForm({ ...form, dot: e.target.value })} placeholder="0124" /></div>
          <div className="space-y-2"><Label>Marca</Label><Input value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} /></div>
          <div className="space-y-2"><Label>Modelo</Label><Input value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} /></div>
          <div className="space-y-2"><Label>Medida</Label><Input value={form.medida} onChange={(e) => setForm({ ...form, medida: e.target.value })} placeholder="295/80 R22.5" /></div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as typeof form.status })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STATUS.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Veículo (se em uso)</Label>
            <Select value={form.veiculo_id || "_"} onValueChange={(v) => setForm({ ...form, veiculo_id: v === "_" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_">Sem veículo</SelectItem>
                {veiculos.map((v) => <SelectItem key={v.id} value={v.id}>{v.placa}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Posição</Label>
            <Select value={form.posicao || "_"} onValueChange={(v) => setForm({ ...form, posicao: v === "_" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_">—</SelectItem>
                {POSICOES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>KM de instalação</Label><Input type="number" value={form.km_instalacao} onChange={(e) => setForm({ ...form, km_instalacao: e.target.value })} /></div>
          <div className="space-y-2"><Label>KM atual</Label><Input type="number" value={form.km_atual} onChange={(e) => setForm({ ...form, km_atual: e.target.value })} /></div>
          <div className="space-y-2"><Label>Data de compra</Label><Input type="date" value={form.data_compra} onChange={(e) => setForm({ ...form, data_compra: e.target.value })} /></div>
          <div className="space-y-2"><Label>Custo (R$)</Label><Input type="number" step="0.01" value={form.custo} onChange={(e) => setForm({ ...form, custo: e.target.value })} /></div>
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
