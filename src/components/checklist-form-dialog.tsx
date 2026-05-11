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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Checklist = Database["public"]["Tables"]["checklists"]["Row"];

type ItemResp = "ok" | "atencao" | "critico" | null;
type Item = { nome: string; resposta: ItemResp; obs: string };

const ITENS_PADRAO: string[] = [
  "Pneus (calibragem e desgaste)",
  "Faróis e lanternas",
  "Setas e luz de freio",
  "Freios",
  "Buzina",
  "Espelhos retrovisores",
  "Limpadores de para-brisa",
  "Cinto de segurança",
  "Nível de óleo",
  "Nível de água do radiador",
  "Combustível suficiente",
  "Documentação do veículo",
  "Triângulo, macaco e estepe",
  "Extintor de incêndio",
  "Limpeza interna e externa",
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  registro: Checklist | null;
  filialId: string;
}

export function ChecklistFormDialog({ open, onOpenChange, registro, filialId }: Props) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [veiculoId, setVeiculoId] = useState("");
  const [motoristaId, setMotoristaId] = useState("");
  const [km, setKm] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [itens, setItens] = useState<Item[]>([]);

  const { data: veiculos = [] } = useQuery({
    queryKey: ["veiculos-select"],
    queryFn: async () => {
      const { data, error } = await supabase.from("veiculos").select("id, placa, modelo, km_atual").order("placa");
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
      setVeiculoId(registro.veiculo_id);
      setMotoristaId(registro.motorista_id ?? "");
      setKm(registro.km?.toString() ?? "");
      setObservacoes(registro.observacoes ?? "");
      setItens(Array.isArray(registro.itens) ? (registro.itens as unknown as Item[]) : []);
    } else {
      setVeiculoId("");
      setMotoristaId("");
      setKm("");
      setObservacoes("");
      setItens(ITENS_PADRAO.map((nome) => ({ nome, resposta: null, obs: "" })));
    }
  }, [registro, open]);

  const computedStatus: "aprovado" | "reprovado" | "pendente" = (() => {
    if (itens.some((i) => i.resposta === null)) return "pendente";
    if (itens.some((i) => i.resposta === "critico")) return "reprovado";
    return "aprovado";
  })();

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        filial_id: filialId,
        veiculo_id: veiculoId,
        motorista_id: motoristaId || null,
        km: km ? parseInt(km) : null,
        status: computedStatus,
        itens: itens as unknown as Database["public"]["Tables"]["checklists"]["Insert"]["itens"],
        observacoes: observacoes.trim() || null,
        created_by: user?.id ?? null,
      };
      if (registro) {
        const { error } = await supabase.from("checklists").update(payload).eq("id", registro.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("checklists").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(registro ? "Checklist atualizado" : "Checklist registrado");
      qc.invalidateQueries({ queryKey: ["checklists"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateItem = (idx: number, patch: Partial<Item>) => {
    setItens((arr) => arr.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{registro ? "Editar checklist" : "Novo checklist"}</DialogTitle></DialogHeader>
        <form
          onSubmit={(e) => { e.preventDefault(); if (!veiculoId) return toast.error("Selecione o veículo"); mutation.mutate(); }}
          className="space-y-4"
        >
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2 md:col-span-2">
              <Label>Veículo *</Label>
              <Select value={veiculoId} onValueChange={setVeiculoId}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {veiculos.map((v) => <SelectItem key={v.id} value={v.id}>{v.placa} — {v.modelo ?? ""}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>KM</Label>
              <Input type="number" value={km} onChange={(e) => setKm(e.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-3">
              <Label>Motorista</Label>
              <Select value={motoristaId || "_"} onValueChange={(v) => setMotoristaId(v === "_" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_">Sem motorista</SelectItem>
                  {motoristas.map((m) => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-lg border">
            <div className="px-4 py-2 border-b bg-muted/50 flex justify-between text-sm font-medium">
              <span>Itens de inspeção</span>
              <span className="text-xs text-muted-foreground">Status auto: <span className="font-semibold capitalize">{computedStatus}</span></span>
            </div>
            <div className="divide-y max-h-[40vh] overflow-y-auto">
              {itens.map((item, idx) => (
                <div key={idx} className="p-3 grid gap-2 md:grid-cols-[1fr_auto_2fr] items-center">
                  <span className="text-sm">{item.nome}</span>
                  <RadioGroup
                    className="flex gap-3"
                    value={item.resposta ?? ""}
                    onValueChange={(v) => updateItem(idx, { resposta: v as ItemResp })}
                  >
                    <label className="flex items-center gap-1 text-xs cursor-pointer">
                      <RadioGroupItem value="ok" /> OK
                    </label>
                    <label className="flex items-center gap-1 text-xs cursor-pointer">
                      <RadioGroupItem value="atencao" /> Atenção
                    </label>
                    <label className="flex items-center gap-1 text-xs cursor-pointer">
                      <RadioGroupItem value="critico" /> Crítico
                    </label>
                  </RadioGroup>
                  <Input
                    placeholder="Observação"
                    value={item.obs}
                    onChange={(e) => updateItem(idx, { obs: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Observações gerais</Label>
            <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
