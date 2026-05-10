import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Truck } from "lucide-react";

export function OnboardingScreen() {
  const qc = useQueryClient();
  const [nome, setNome] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return toast.error("Informe o nome da filial");
    setLoading(true);
    const { error } = await supabase.rpc("bootstrap_filial", {
      _nome: nome.trim(),
      _cidade: cidade.trim() || undefined,
      _estado: estado.trim() || undefined,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Filial criada! Você é o administrador.");
    qc.invalidateQueries({ queryKey: ["profile"] });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/20">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto h-12 w-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center mb-2">
            <Truck className="h-6 w-6" />
          </div>
          <CardTitle>Bem-vindo ao FrotaPro</CardTitle>
          <CardDescription>Vamos começar criando sua filial.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome da filial *</Label>
              <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Matriz" required />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="cidade">Cidade</Label>
                <Input id="cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estado">UF</Label>
                <Input id="estado" maxLength={2} value={estado} onChange={(e) => setEstado(e.target.value.toUpperCase())} />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Criando..." : "Criar filial"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
