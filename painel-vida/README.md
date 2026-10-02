# Painel de Vida

Painel pessoal para acompanhar a rotina com 5 a 10 minutos de registro por dia:

- **Hoje:** contador de mensagens proativas, registro rápido (gasto, treino,
  estudo, reunião, revisão, conteúdo) e fechamento do dia.
- **Semana:** metas semanais, histórico de 8 semanas e revisão semanal.
- **Finanças:** previsão x realizado por mês, receitas previstas x recebidas,
  fatura do cartão, caixinhas e projeção do quanto vai ter guardado.
- **Assessoria:** captação, resgates, patrimônio, comissão, reuniões, cobertura
  de revisões, mensagens proativas e conteúdo.
- **Saúde:** corridas e musculação (km por semana, alerta de aumento brusco de
  volume) e consultas com aviso de check-up vencido.
- **Estudos:** certificações, cursos e livros com o ritmo necessário até a prova.

Configuração inicial: [`docs/configuracao.md`](docs/configuracao.md).
Regras de lógica que mantêm o histórico confiável: [`docs/decisoes.md`](docs/decisoes.md).

## Desenvolvimento

```bash
npm install
npm run dev     # http://localhost:5173/Finan-as-Pessoais/painel-vida/?demo
npm test        # regras de negócio
npm run build
```

React + TypeScript + Vite, Tailwind, Recharts e Firebase (Auth + Firestore com
cache offline).
