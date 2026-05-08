# Plano de Migração — FrotaPro → Lovable

Vou trazer o FrotaPro pra cá **reconstruindo do zero** sobre TanStack Start + Lovable Cloud, já corrigindo as duplicações que identifiquei no mapa do projeto. Não é cópia 1:1 — é uma versão refatorada e mais automatizada.

## Por que reconstruir e não portar Next.js linha por linha
- Seu projeto atual mistura `app/` (Next App Router), Prisma, NextAuth e várias telas que repetem função. Portar arquivo a arquivo carrega a bagunça pra cá.
- Reconstruindo, eu já consolido o que é redundante e aplico padrão único (server functions, RLS, design tokens).

## Duplicações que vou resolver já na arquitetura

| Hoje (FrotaPro) | Vai virar |
|---|---|
| `abastecimento/` + `combustivel/` | **1 módulo `abastecimentos`** com filtros |
| `dashboard/` + `analytics/` + `dashboard-bi/` | **1 hub `/dashboard`** com abas (Visão geral · Analytics · BI) |
| Botões de export espalhados (Maintenance, Pneus, Inspections) | **1 módulo `/relatorios`** central |
| `actions/*.ts` separados por domínio + lógica repetida | **server functions** em `src/lib/*.functions.ts` com helpers compartilhados |
| `prisma/schema.prisma` + NextAuth | **Lovable Cloud** (Postgres + Auth nativos, RLS por filial) |

## Fases (cada fase = entregável funcionando)

### Fase 1 — Fundação (essa próxima rodada)
1. Ativar **Lovable Cloud**
2. Schema base: `profiles`, `user_roles` (admin/gestor/motorista), `filiais`, `veiculos`, `motoristas` — com RLS multi-filial
3. **Auth** (email/senha + Google) com tela de login
4. **Layout** com sidebar (Dashboard, Frota, Motoristas, Abastecimento, Manutenção, Pneus, Checklist, Ocorrências, Relatórios, Configurações)
5. **Dashboard hub** com abas vazias (estrutura pronta pra plugar KPIs)

### Fase 2 — Frota + Motoristas
- CRUD veículos (com upload de docs)
- CRUD motoristas (CNH, validade, vínculo a filial)
- **Automação**: alerta de CNH/CRLV vencendo

### Fase 3 — Operação (Abastecimento unificado + Manutenção + Pneus + Checklist)
- Abastecimento consolidado (combustível como filtro, não tela separada)
- Manutenção com agendamento por km/data
- Pneus com rodízio e vida útil
- Checklist digital
- **Automações**: próxima troca de óleo, pneu pra trocar, manutenção preventiva — calculados via trigger/view

### Fase 4 — Inteligência (Dashboard BI + Relatórios + NF-e + Ocorrências)
- KPIs automáticos (custo/km, consumo médio, ranking motoristas) via views SQL
- Central de relatórios única com export PDF/Excel
- Importação de NF-e (parser XML → lança abastecimento/manutenção sozinho)
- Ocorrências (multas, sinistros)

## Stack técnica (resumo)
- TanStack Start (rotas) · React 19 · Tailwind v4
- Lovable Cloud (Postgres + Auth + Storage + Edge Functions)
- Server functions (`createServerFn`) para toda lógica de negócio — substituem os `actions/*.ts` do Next
- RLS no banco para isolamento multi-filial (sem precisar checar permissão no código)
- Design system com tokens semânticos em `src/styles.css`

## O que vou fazer agora se você aprovar
Apenas a **Fase 1**: Cloud + schema base + auth + sidebar + dashboard hub vazio. Isso te dá o esqueleto navegável pra você ver o caminho antes de eu seguir pras fases pesadas.

Confirma que sigo por aí?
