import { supabaseAdmin } from "./src/integrations/supabase/client.server";

const email = "heitorsilvamora27@gmail.com";
const newPassword = "FrotaPro2026!";

async function main() {
  const { data: userList, error: listError } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (listError) {
    console.error("Erro ao listar usuários:", listError.message);
    process.exit(1);
  }

  const user = userList.users.find((u) => u.email === email);
  if (!user) {
    console.error("Usuário não encontrado:", email);
    process.exit(1);
  }

  console.log("Usuário encontrado:", user.id);

  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
    password: newPassword,
  });

  if (error) {
    console.error("Erro ao atualizar senha:", error.message);
    process.exit(1);
  }

  console.log("Senha atualizada com sucesso!");
  console.log("Email:", email);
  console.log("Nova senha:", newPassword);
}

main();
