import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/use-profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileText, Trash2, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";

type DocFile = { name: string; path: string; size?: number };

interface Props {
  modulo: "veiculos" | "motoristas" | "ocorrencias";
  entidadeId?: string | null;
  label?: string;
}

const BUCKET = "documentos";

export function DocumentUploader({ modulo, entidadeId, label = "Anexos" }: Props) {
  const { data: profile } = useProfile();
  const [files, setFiles] = useState<DocFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const folder = profile?.filialId && entidadeId
    ? `${profile.filialId}/${modulo}/${entidadeId}`
    : null;

  const load = async () => {
    if (!folder) return;
    setLoading(true);
    const { data, error } = await supabase.storage.from(BUCKET).list(folder, {
      limit: 100,
      sortBy: { column: "created_at", order: "desc" },
    });
    setLoading(false);
    if (error) {
      console.error(error);
      return;
    }
    setFiles(
      (data ?? [])
        .filter((f) => f.name && !f.name.startsWith("."))
        .map((f) => ({ name: f.name, path: `${folder}/${f.name}`, size: (f as any).metadata?.size })),
    );
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folder]);

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !folder) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Arquivo maior que 10MB");
      return;
    }
    setUploading(true);
    const safe = file.name.replace(/[^\w.\-]+/g, "_");
    const path = `${folder}/${Date.now()}_${safe}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    setUploading(false);
    if (error) {
      toast.error("Falha no upload: " + error.message);
      return;
    }
    toast.success("Arquivo enviado");
    load();
  };

  const onOpen = async (path: string) => {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60);
    if (error || !data?.signedUrl) {
      toast.error("Não foi possível abrir o arquivo");
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  const onDelete = async (path: string) => {
    if (!confirm("Excluir este arquivo?")) return;
    const { error } = await supabase.storage.from(BUCKET).remove([path]);
    if (error) {
      toast.error("Falha ao excluir");
      return;
    }
    toast.success("Arquivo excluído");
    load();
  };

  if (!entidadeId) {
    return (
      <div className="text-xs text-muted-foreground border rounded-md p-3">
        Salve o registro antes de anexar documentos.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          type="file"
          accept="image/*,application/pdf"
          onChange={onUpload}
          disabled={uploading}
          className="text-xs"
        />
        {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
      </div>
      <div className="space-y-1">
        {loading && <p className="text-xs text-muted-foreground">Carregando...</p>}
        {!loading && files.length === 0 && (
          <p className="text-xs text-muted-foreground">Nenhum arquivo anexado.</p>
        )}
        {files.map((f) => (
          <div
            key={f.path}
            className="flex items-center justify-between gap-2 text-sm border rounded-md px-2 py-1"
          >
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{f.name.replace(/^\d+_/, "")}</span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button type="button" variant="ghost" size="icon" onClick={() => onOpen(f.path)}>
                <ExternalLink className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" onClick={() => onDelete(f.path)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
        <Upload className="h-3 w-3" /> PDF, JPG, PNG ou WEBP — até 10MB
      </p>
    </div>
  );
}
