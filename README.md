# Minhas Finanças

Dashboard pessoal de organização financeira mês a mês: renda por fonte,
pagamentos do mês, gastos fixos, gastos variáveis com limites, assinaturas e
objetivos. Navegue por qualquer mês — passado (histórico), atual ou futuro
(planejamento).

Os dados ficam salvos no `localStorage` do navegador. Opcionalmente, dá para
sincronizar entre aparelhos via Firebase/Firestore — veja
`docs/sincronizacao-firebase.md`.

## Rodando localmente

```bash
npm install
npm run dev      # http://localhost:5173/Finan-as-Pessoais/
npm test         # testes das regras de cálculo e da migração (Vitest)
```

## Áreas

- **Visão geral**: renda prevista (por fonte), comprometido, sobra projetada,
  a pagar no mês, para onde vai a renda e projeção dos próximos 6 meses.
- **Pagamentos**: checklist do mês com gastos fixos + faturas, boletos e Pix;
  "Repetir faturas do mês anterior".
- **Gastos fixos** e **Assinaturas**: itens recorrentes com início e fim.
- **Gastos variáveis**: limites por categoria, lançamentos e ritmo de gasto.
- **Objetivos**: metas com mínimo mensal, aportes e resgates.
- **Dados e sincronização**: backup/restauração em JSON, sincronização e limpeza.

## Organização do código

- `src/lib/finance.ts` — regras de cálculo puras (testadas em `finance.test.ts`).
- `src/lib/migrate.ts` — versões do schema e migração v2 → v3 (testada em `migrate.test.ts`).
- `src/store.ts` — store Zustand com persistência (`financas-pessoais-dashboard`, versão 3).
- `src/views/` — uma tela por área; `src/components/` — UI base e formulários.

## Atualização a partir da versão antiga (v2)

Na primeira abertura, os dados antigos são convertidos automaticamente e uma
cópia intacta fica em `financas-pessoais-dashboard.backup-v2` (dá para baixar
em "Dados e sincronização"). Renda por fonte, planejado (→ limites), realizado
(→ um lançamento por categoria/mês), reserva de emergência e grandes gastos
(→ objetivos) são preservados.

## Stack

React + TypeScript + Vite, Tailwind CSS v4, Recharts, Zustand e Vitest.
