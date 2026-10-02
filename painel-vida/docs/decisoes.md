# Decisões de lógica (leia antes de mudar o código)

Cada item abaixo é um problema previsto e a regra que o resolve. Mudar uma dessas
regras pode corromper o histórico em silêncio.

## Tempo
- **Datas são o dia local `YYYY-MM-DD`.** Nunca use `toISOString()` para gerar um
  dia: em UTC−3, algo feito às 21h cai no dia seguinte.
- **Dia lógico:** até `dayCutoffHour` (padrão 4h) ainda é o dia anterior.
- **Sem período fixo:** nenhum mês ou ano fica fixo no código.

## Registro
- **Dia sem registro ≠ zero.** O dia "fechado" (`days/{data}.closed`) diz que o que
  não está registrado não aconteceu. Semana com dias abertos aparece como
  "registro incompleto", não como "abaixo da meta".
- **Metas semanais, não sequências diárias.** Perder um dia não zera nada.
- **Nada é apagado:** excluir grava `deletedAt` (lixeira). Categorias, fontes,
  especialidades e clientes são arquivados ou encerrados com data.
- **Metas têm vigência** (`from`/`to`). A semana usa a meta vigente no último dia
  dela (ou hoje, se está em andamento). As semanas encerradas não mudam quando
  você muda a meta.
- **Primeiro acesso:** a data de início (`startedAt`) define desde quando cobrar
  dias sem registro. As configurações padrão são gravadas na conta nesse momento,
  então mudar os padrões no código não altera contas existentes.

## Finanças
- **Orçamento é por competência** (data da compra). **Fatura é por caixa:** a compra
  no cartão cai no mês de vencimento da fatura; depois do fechamento, vai para a
  fatura seguinte (`cashMonth`).
- **Categoria fixa:** o previsto conta como realizado, a não ser que você informe o
  valor real ou que existam gastos lançados nela. Os dois nunca são somados.
- **Gasto pago por caixinha** (`origin` = id da caixinha) sai da caixinha e **não**
  entra no orçamento do mês. Assim não conta duas vezes.
- **Saldo de caixinha = última conferência real + movimentos depois dela.**
  Depois de 45 dias sem conferir, o app pede uma conferência, para que rendimentos
  e esquecimentos não acumulem desvio.
- **Receita variável** (comissão) só entra no cenário conservador depois de
  recebida.

## Assessoria
- **Comissão gerada** (competência, em Assessoria) **≠ recebida** (caixa, em
  Finanças). As duas nunca são somadas.
- **Revisão não conta como reunião.** Reunião = prospecção, diagnóstico, proposta,
  fechamento ou cliente atual (fora da revisão).
- **Cobertura de revisões** usa a base de clientes ativos **naquele mês** (`since` /
  `inactiveSince`).
- **Clientes só por apelido** (LGPD e compliance): nada de nome completo, CPF ou
  patrimônio.

## Saúde e estudos
- **Consulta com valor gera o gasto automaticamente** (`appointmentId`). Ela é a fonte
  única: excluir a consulta exclui o gasto.
- **Progresso de estudo acumulado no próprio item** (`done`, `minutesTotal`, com
  incremento atômico), porque as sessões antigas saem da janela ao vivo.

## Escala e segurança
- **Um documento por registro**, em `users/{uid}/{coleção}`. Nada de um documento
  único gigante (limite de 1 MiB).
- **Janela ao vivo de 400 dias** para coleções que crescem todo dia
  (`WINDOWED`), para não estourar as 50 mil leituras/dia do plano gratuito depois
  de anos de uso. O backup lê tudo.
- **Contador de mensagens com `increment()`**: dois aparelhos não se sobrescrevem.
- **Configurações só são gravadas depois da resposta do servidor.** Num aparelho
  novo e offline o cache vem vazio, e gravar ali sobrescreveria a configuração real.
  Gravações de configuração enviam só o campo alterado.
- **Backup mensal** em JSON (lembrete na tela após 30 dias). Restaurar mescla por id.
- **Login Google + regras por `uid` e e-mail** (ver `configuracao.md`).
