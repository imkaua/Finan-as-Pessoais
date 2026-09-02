# Minhas Finanças

Dashboard pessoal de organização financeira para o período de setembro a
dezembro de 2026: orçamento mensal por categoria, evolução da reserva de
emergência e acompanhamento de grandes gastos planejados (viagens, cursos etc).

Todos os dados ficam salvos apenas no `localStorage` do seu navegador — nada
é enviado para nenhum servidor.

## Rodando localmente

```bash
npm install
npm run dev
```

Abra `http://localhost:5173`.

## O que tem no dashboard

- **Visão geral**: renda total, gasto planejado total e saldo do período,
  gráfico de renda vs. planejado por mês e distribuição de gastos por
  categoria no mês selecionado.
- **Orçamento mensal**: para cada mês (setembro a dezembro), defina a renda
  esperada e o valor planejado (e, opcionalmente, o realizado) em cada
  categoria de gasto. Categorias são totalmente customizáveis.
- **Reserva de emergência**: saldo inicial, meta, aportes mensais e gráfico
  de evolução do saldo acumulado, com progresso até a meta e quantos meses
  de gasto ela cobre.
- **Grandes gastos**: cadastre metas maiores (uma viagem, por exemplo) com
  valor total, quanto já foi guardado e data alvo, acompanhando o progresso.

## Stack

React + TypeScript + Vite, Tailwind CSS, Recharts e Zustand (persistência em
`localStorage`).
