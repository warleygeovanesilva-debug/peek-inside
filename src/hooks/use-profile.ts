import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";

export function useProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return null;
      const [{ data: profile, error: pErr }, { data: roles, error: rErr }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role, filial_id").eq("user_id", user.id),
      ]);
      if (pErr) throw pErr;
      if (rErr) throw rErr;
      const roleSet = new Set((roles ?? []).map((r) => r.role));
      return {
        profile,
        roles: roles ?? [],
        isAdmin: roleSet.has("admin"),
        isGestor: roleSet.has("gestor"),
        canEdit: roleSet.has("admin") || roleSet.has("gestor"),
        filialId: profile?.filial_id ?? null,
      };
    },
  });
}
