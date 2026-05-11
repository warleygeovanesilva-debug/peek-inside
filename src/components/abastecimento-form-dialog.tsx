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

type Abastecimento = Database["public"]["Tables"]["abastecimentos"]["Row"];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  registro: Abastecimento | null;
  filialId: string;
}

export function AbastecimentoFormDialog({ open, onOpenChange, registro, filialId }: Props) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [form, setForm] = useState({
    veiculo_id: "",
    motorista_id: "",
    data: new Date().toISOString().slice(0, 16),
    km: "",
    litros: "",
    valor_litro: "",
    combustivel: "",
    posto: "",
    observacoes: "",
  });

  const { data: veiculos = [] } = useQuery({
    queryKey: ["veiculos-select"],
    queryFn: async () => {
      const { data, error } = await supabase.from("veiculos").select("id, placa, modelo, km_atual, combustivel").order("placa");
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
        veiculo_id: registro.veiculo_id,
        motorista_id: registro.motorista_id ?? "",
        data: new Date(registro.data).toISOString().slice(0, 16),
        km: registro.km.toString(),
        litros: registro.litros.toString(),
        valor_litro: registro.valor_litro.toString(),
        combustivel: registro.combustivel ?? "",
        posto: registro.posto ?? "",
        observacoes: registro.observacoes ?? "",
      });
    } else {
      setForm({ veiculo_id: "", motorista_id: "", data: new Date().toISOString().slice(0, 16), km: "", litros: "", valor_litro: "", combustivel: "", posto: "", observacoes: "" });
    }
  }, [registro, open]);

  const selectedVeic = veiculos.find((v) => v.id === form.veiculo_id);

  const mutation = useMutation({
    mutationFn: async () => {
      const litros = parseFloat(form.litros);
      const valor_litro = parseFloat(form.valor_litro);
      const payload = {
        filial_id: filialId,
        veiculo_id: form.veiculo_id,
        motorista_id: form.motorista_id || null,
        data: new Date(form.data).toISOString(),
        km: parseInt(form.km),
        litros,
        valor_litro,
        valor_total: Math.round(litros * valor_litro * 100) / 100,
        combustivel: form.combustivel.trim() || null,
        posto: form.posto.trim() || null,
        observacoes: form.observacoes.trim() || null,
        created_by: user?.id ?? null,
      };
      if (registro) {
        const { error } = await supabase.from("abastecimentos").update(payload).eq("id", registro.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("abastecimentos").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(registro ? "Abastecimento atualizado" : "Abastecimento registrado");
      qc.invalidateQueries({ queryKey: ["abastecimentos"] });
      qc.invalidateQueries({ queryKey: ["veiculos"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const total = (parseFloat(form.litros) || 0) * (parseFloat(form.valor_litro) || 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{registro ? "Editar abastecimento" : "Novo abastecimento"}</DialogTitle></DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.veiculo_id) return toast.error("Selecione o veículo");
            if (!form.km || !form.litros || !form.valor_litro) return toast.error("Preencha KM, litros e valor");
            mutation.mutate();
          }}
          className="grid gap-4 md:grid-cols-2"
        >
          <div className="space-y-2 md:col-span-2">
            <Label>Veículo *</Label>
            <Select value={form.veiculo_id} onValueChange={(v) => {
              const veic = veiculos.find((x) => x.id === v);
              setForm({ ...form, veiculo_id: v, combustivel: form.combustivel || veic?.combustivel || "" });
            }}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {veiculos.map((v) => <SelectItem key={v.id} value={v.id}>{v.placa} — {v.modelo ?? ""}</SelectItem>)}
              </SelectContent>
            </Select>
            {selectedVeic && <p className="text-xs text-muted-foreground">KM atual: {selectedVeic.km_atual.toLocaleString("pt-BR")}</p>}
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
          <div className="space-y-2"><Label>Data *</Label><Input type="datetime-local" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} required /></div>
          <div className="space-y-2"><Label>KM no abastecimento *</Label><Input type="number" value={form.km} onChange={(e) => setForm({ ...form, km: e.target.value })} required /></div>
          <div className="space-y-2"><Label>Combustível</Label><Input value={form.combustivel} onChange={(e) => setForm({ ...form, combustivel: e.target.value })} placeholder="Diesel S10..." /></div>
          <div className="space-y-2"><Label>Litros *</Label><Input type="number" step="0.001" value={form.litros} onChange={(e) => setForm({ ...form, litros: e.target.value })} required /></div>
          <div className="space-y-2"><Label>Valor por litro *</Label><Input type="number" step="0.001" value={form.valor_litro} onChange={(e) => setForm({ ...form, valor_litro: e.target.value })} required /></div>
          <div className="space-y-2 md:col-span-2"><Label>Posto</Label><Input value={form.posto} onChange={(e) => setForm({ ...form, posto: e.target.value })} /></div>
          <div className="space-y-2 md:col-span-2"><Label>Observações</Label><Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
          <div className="md:col-span-2 rounded-md bg-muted p-3 text-sm">
            <span className="text-muted-foreground">Total estimado: </span>
            <span className="font-semibold">R$ {total.toFixed(2)}</span>
            <span className="ml-3 text-xs text-muted-foreground">(consumo será calculado automaticamente)</span>
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
