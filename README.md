# Fluere

O painel da sua vida profissional e pessoal: consultório, dinheiro, pacientes, rotina, conteúdo, trabalhos e estudos, num lugar só.

---

## Onde estão os arquivos

| Pasta | O que tem |
|---|---|
| `Fluere` (na sua pasta pessoal do Mac: Finder → Ir → Início) | O sistema (código). Fica **fora** do iCloud de propósito, para o iCloud não atrapalhar enquanto ele é construído. |
| `Mesa/meu-sistema` (iCloud Drive) | Referências, este guia e os seus **backups**. |

O sistema não precisa de nada instalado no Mac. Não existe pasta `node_modules` nem programas extras.

---

## Como abrir no Mac

1. Abra a pasta **Fluere** no Finder.
2. Dê dois cliques em **Abrir Fluere.command**.
   - Na primeira vez, o Mac pode dizer que o arquivo é de "desenvolvedor não identificado". Nesse caso, clique com o botão direito no arquivo → **Abrir** → **Abrir**.
3. Abre uma janela do Terminal (deixe aberta) e o Fluere aparece no navegador em `http://localhost:8484`.
4. Para encerrar, feche a janela do Terminal.

> Essa é a versão de teste no Mac. Os dados que você criar nela ficam **só no navegador do Mac** e não aparecem no iPhone (por enquanto, sem sincronização).

---

## Como instalar no iPhone

Para o iPhone instalar o Fluere, o sistema precisa estar num endereço seguro na internet (começando com `https://`). Esse endereço guarda **só o código**, nunca os seus dados.

Quando o endereço estiver pronto (fazemos juntas, passo a passo):

1. Abra o endereço no **Safari** do iPhone.
2. Toque em **Compartilhar** (o quadrado com a seta para cima).
3. Toque em **Adicionar à Tela de Início** → **Adicionar**.
4. Use sempre o ícone da tela de início. O app instalado guarda os dados separados do Safari.

Depois de instalado, ele abre em tela cheia e funciona **sem internet**.

---

## A sua senha e a chave de recuperação

- No primeiro acesso você cria uma **senha** (pelo menos 8 caracteres; uma frase curta é ótima).
- O Fluere mostra uma **chave de recuperação** (ex.: `K7QM-2XRA-…`). Ela aparece **uma vez só**.
  - Guarde no app **Senhas** do iPhone (como nota) **e** num papel em casa.
  - Não mande por WhatsApp nem e-mail.
- Esqueceu a senha? Na tela de senha, toque em **Esqueci a senha** e use a chave.
- **Sem a senha e sem a chave, ninguém recupera os dados, nem quem fez o sistema.** É isso que garante a privacidade.
- O Fluere se bloqueia sozinho depois de 5 minutos fora do app (você muda isso em **Mais → Ajustes e backup**).

---

## Backup (faça toda semana)

**Fazer:** Mais → Ajustes e backup → **Fazer backup agora**.
- No iPhone: abre a folha de compartilhar → **Salvar em Arquivos** → escolha **iCloud Drive / meu-sistema / Backups**.
- No Mac: o arquivo vai para **Downloads**. Arraste para `meu-sistema/Backups` no iCloud.

O arquivo (`fluere-backup-AAAA-MM-DD.fluere`) vai **embaralhado**. Só abre com a senha que você usava no dia do backup (ou com a chave de recuperação).

O painel **Hoje** avisa quando o último backup passou de 7 dias.

**Restaurar:** Mais → Ajustes e backup → **Restaurar um backup** → escolha o arquivo → digite a senha daquela época. Os dados atuais do aparelho são **substituídos** pelos do backup.

---

## Onde ficam os dados e quem pode ver

- Os dados ficam **no próprio aparelho**, dentro do navegador, embaralhados com criptografia AES-256 (o mesmo padrão usado por bancos).
- **Nada é enviado para a internet.** O sistema não usa Google Fonts, anúncios ou contadores de visita.
- A sincronização entre Mac e iPhone (Supabase, servidores em São Paulo) vai ser ligada depois do Módulo 2. Mesmo assim, os dados vão para a nuvem **já embaralhados**, e a nuvem não consegue ler.

---

## Etapas de construção

| Etapa | O que | Situação |
|---|---|---|
| 0 | Fundação: visual, navegação, senha, criptografia, backup, instalação | ✅ pronta para validar |
| 1 | Financeiro do consultório | ✅ aprovada |
| 2 | Gastos CPF/CNPJ e resumo geral (+ sincronização Mac/iPhone) | ✅ gastos prontos para validar; sincronização falta |
| 3 | Pacientes | ✅ pronto para validar |
| 4 | Tarefas e planejador da semana | ✅ aprovada |
| 5 | Hábitos | ✅ aprovada |
| 6 | Metas do semestre | ✅ pronto para validar |
| 7 | Conteúdo | ✅ pronto para validar |
| 8 | Trabalhos paralelos | ✅ pronto para validar |
| 9 | Estudos | ✅ pronto para validar |
| 10 | Vencimentos | ✅ pronto para validar |
| 11 | Revisão semanal | ✅ pronto para validar |
| 12 | Painel Hoje completo | |

---

## Visual

- **Cores:** fundo `#f5f5f5`, vinho `#740b12`, rosa `#f6d2d2` e manteiga `#fff3c6`. Positivo em verde `#e5fcc9`, alerta em vermelho claro `#ff9999` e intermediário em manteiga.
- **Letras:** títulos em **EB Garamond** (serifada fina) e textos em **Helvetica** (usa a Helvetica Now Display se ela estiver instalada no aparelho).
- **Logo:** feita pela Eduarda. `icones/logo.png` é usada no modo claro e `icones/logo-escuro.png` no modo escuro.
- **No Mac:** menu lateral. **No iPhone:** barra embaixo.
- **Dados de exemplo:** os painéis com o selo **exemplo** mostram números inventados (`js/exemplos.js`). Quando cada módulo ficar pronto, eles passam a mostrar os seus dados reais.

---

## Para quem for mexer no código

- HTML, CSS e JavaScript puros, sem etapa de "build". Os arquivos são servidos como estão.
- `css/tema.css`: fontes e cores (modo claro e escuro). `css/app.css`: componentes.
- `js/app.js`: abre o sistema, navegação (`#/hoje`, `#/dinheiro`…), botão "+ Novo" e bloqueio automático.
- `js/nucleo/`: peças comuns.
  - `cripto.js`: criptografia (Web Crypto: PBKDF2 + AES-KW + AES-GCM).
  - `cofre.js`: IndexedDB, senha, chave de recuperação.
  - `dados.js`: a API que os módulos usam (`lista`, `pega`, `salva`, `apaga`, `ouvir`, `config`).
  - `backup.js`: exportar/restaurar. `avisos.js`: central de avisos do Hoje. `util.js`: R$, datas.
  - `ui.js`: cabeçalho, painel, KPI, abas, folha que sobe, toast e ícones.
  - `graficos.js`: rosca, barras, pilha, anel, bolinhas de hábito, radar e linha do semestre (SVG feito à mão, sem bibliotecas).
- `js/exemplos.js`: dados de exemplo dos painéis (selo "exemplo").
- `js/telas/`: uma tela por arquivo. Cada uma exporta `desenhar(el, partes)`.
- `sw.js`: modo offline. **Ao criar um arquivo novo, inclua na lista e aumente a `VERSAO`.**
- Cada registro é guardado como `{ id, col, upd, del, dev, iv, ct }`, já no formato pronto para a sincronização.

---

## Publicar no GitHub (atualizar o endereço do iPhone)

Dê dois cliques em **Publicar Fluere.command**.
- **Na primeira vez:** ele pede para conectar o Mac à sua conta do GitHub. Aparece um código de 8 letras, o navegador abre e você só confirma.
- **Depois:** ele envia a versão nova e mostra o endereço `https://SEU-USUARIO.github.io/fluere/`.

**O que vai para o GitHub:** só o código, que fica público.
**O que nunca vai:** seus dados, os backups e as ferramentas desta pasta.

---

## Tarefas e semana (Rotina → Semana)

- **Criar uma tarefa:** "+ Novo" → Tarefa. Cada tarefa tem área, tempo estimado, dia para fazer e prazo (opcional). Marque como **Importante** para ela aparecer primeiro.
- **Horas livres:** toque em "ajustar" no cartão de horas livres. A semana padrão vale para todas as semanas, e dá para ajustar só uma semana específica.
- **A semana não fecha?** O aviso compara o tempo das tarefas com as horas livres e também aponta os dias que passaram do limite.
- **Mudar o dia:** no Mac, arraste a tarefa para outro dia. No iPhone, toque na tarefa e mude o dia.
- **Adiar, recusar, delegar:** toque na tarefa. O que for recusado ou delegado vai para o quadro "Fora da sua lista" e pode voltar quando você quiser.
- **Copiar para o Claude:** copia a semana em texto (só as tarefas, nunca dados de pacientes) para você colar no chat e pedir uma reorganização.

## Hábitos (Rotina → Hábitos)

- **Marcar:** toque na bolinha do dia, no tracker ou no painel Hoje.
- **Criar ou editar:** "Novo hábito", ou toque no nome do hábito. Ele pode ser **todo dia** ou **algumas vezes por semana**.
- **Lembrete:** escolha um horário e o Fluere cria um evento que se repete no Calendário, com aviso na hora.
- **Números do mês:** melhor sequência, % cumprida (respeitando a frequência de cada hábito) e descobertas automáticas, como "nos dias em que você faz X, Y acontece 2x mais". Tudo é calculado no próprio aparelho.

## Financeiro do consultório (Dinheiro → Consultório)

- **Primeira vez:** toque em "Configurar agora" e preencha o percentual de Campo Largo, o aluguel de Curitiba, o imposto, a meta, os preços de tabela e os custos fixos. Tudo fica no seu cofre, embaralhado. Nada disso aparece no código público.
- **Mudar uma regra:** "ajustar regras e custos". A mudança vale a partir do mês que está aberto na tela; os meses anteriores continuam com a regra antiga.
- **Lançar um atendimento:** "+ Novo" → Atendimento. O valor de tabela aparece sozinho conforme o tipo. Se você cobrar menos, ele mostra o desconto e pede o motivo. A prévia mostra quanto fica com você.
- **Plano recorrente:** quando o paciente paga a cada consulta, escolha "Plano recorrente". O sistema cria uma parcela por consulta e você marca cada uma ao receber.
- **Tudo conta no mês da venda:** bruto, repasse de Campo Largo e imposto. O que falta pagar aparece como "a receber", no painel e no Hoje.
- **Contas do mês:** repasse, aluguel, imposto e custos fixos, com caixinha para marcar como pagos. O Hoje avisa quando ficou alguma conta do mês anterior.
- **Extrato:** busca por paciente, tipo ou forma de pagamento, e filtros por local e "a receber". Um toque no selo marca como recebido.

## Gastos CPF e CNPJ (Dinheiro → Gastos)

- **Lançar:** "+ Novo" → Gasto. Escolha CPF ou CNPJ, categoria, como pagou (seus cartões, Pix, débito ou dinheiro), a data da compra e o **mês da fatura**. Estorno: digite o valor com sinal de menos.
- **Parcelado:** escolha o número de parcelas. Você lança uma vez só e o sistema cria uma parcela em cada fatura dos próximos meses. O painel mostra quanto já está comprometido.
- **Não sabe se é CPF ou CNPJ?** Marque "Ainda não sei". O gasto vai para a aba **Revisar** e você confirma depois. Tocar no selo CPF/CNPJ de um gasto troca a conta.
- **Contas fixas:** aluguel, luz, internet, academia… cadastre uma vez e elas entram todo mês. Você marca quando pagar, e o Hoje avisa as vencidas.
- **Importar fatura:** "Importar fatura" lê um arquivo CSV ou OFX do banco **aqui no aparelho** (nada é enviado). Ele sugere conta e categoria, ignora o que já foi lançado e aprende com as suas correções. Para fatura em PDF, peça no app do banco o arquivo CSV ou OFX.
- **Ajustes:** nomes dos cartões, limite de gastos e meta de sobra (valem todo mês) e as categorias.
- **Custos fixos do consultório** (contadora, CRN, sistemas) já são descontados no líquido do Módulo 1, por isso não entram de novo aqui.
- **Resumo geral:** entrou (líquido do consultório) − saiu (gastos e contas fixas) = sobrou, com rosca por categoria, barras dos últimos 6 meses e dicas automáticas.

## Pacientes (barra de baixo → Pacientes)

- **Ficha:** nome, WhatsApp, nascimento, como chegou até você, onde costuma atender e uma anotação. **Sem dados clínicos.** Toque num paciente para abrir a ficha.
- **Agenda:** continua no seu calendário. O Fluere guarda só a **próxima consulta** de cada paciente (dia e hora), que aparece no painel Hoje.
- **Pacote:** "Vender pacote ou consulta" abre o lançamento do financeiro já com o paciente preenchido. Ao salvar, o pacote abre sozinho: avulsa = 1 consulta, trimestral = 3, semestral = 4 (a quantidade vem das regras do consultório). Se você lançar um atendimento digitando o nome de um paciente cadastrado, o pacote também abre.
- **Consulta feita:** botão na ficha, no painel Hoje ou em "+ Novo". Atualiza o pacote (ex.: 2 de 3) e pergunta a data da próxima consulta. Na última, avisa para oferecer a renovação. Errou? "Desfazer a última consulta registrada", na ficha.
- **Avisos:** retorno pendente (pacote ativo sem próxima consulta), consulta que já passou sem ser registrada, pacote na última consulta e aniversários da semana.
- **Vendas antigas:** se um atendimento de pacote foi lançado antes de cadastrar o paciente, abra a ficha (o nome precisa ser igual) e toque em "Abrir pacote" ao lado do pagamento.
- **Arquivar** esconde o paciente das listas sem apagar nada. **Apagar** remove a ficha e os pacotes; as vendas do financeiro continuam.

## Sincronização Mac ⇄ iPhone (Mais → Ajustes e backup → Sincronização)

- **O que vai para a nuvem:** só os registros **já embaralhados** e a chave do cofre **trancada pela senha do Fluere**. A nuvem (Supabase, região São Paulo) não lê nada. O banco só entrega as linhas para quem entra com a conta da nuvem.
- **Duas senhas diferentes:** a da **conta da nuvem** (e-mail e senha criados no Supabase) e a **senha do Fluere**. Use senhas fortes e diferentes entre si.
- **Primeiro aparelho** (o que tem os seus dados): Ajustes → "Ligar a sincronização" → e-mail e senha da nuvem → "Ligar". Tudo sobe embaralhado.
- **Outros aparelhos:** o mesmo caminho, mas ele vai pedir a **senha do Fluere do primeiro aparelho** e **troca os dados daqui pelos da nuvem**. Faça o backup antes, se houver algo que você queira guardar. Depois disso a senha do Fluere é a mesma nos dois aparelhos (se você trocar a senha em um, o outro acompanha na próxima sincronização).
- **Quando sincroniza:** ao abrir o Fluere, uns 3 segundos depois de você salvar algo, a cada 90 segundos com o app aberto e quando você volta para ele. Sem internet, tudo continua funcionando e se acerta quando a conexão voltar.
- **Se o mesmo item for mudado nos dois aparelhos:** vale a mudança mais recente.
- **Desligar** só para de enviar e receber neste aparelho; nada é apagado.
- O backup em arquivo continua existindo como segurança extra.

## Trabalhos paralelos (Mais → Trabalhos)

Duas frentes fora do consultório, em três abas: **Visão geral**, **RT pousadas** e **Bela Flor**. Nenhuma passa pelo CNPJ, então não há imposto.

- **Valores:** em "Valores e dia da visita", informe quanto cada trabalho rende por mês e o dia em que o pagamento costuma cair. Esses valores ficam só no seu cofre. Em "Recebimento", toque em "marcar recebido" quando o dinheiro chegar: só o que foi recebido entra no **Entrou** do Resumo geral (Dinheiro → Resumo geral). Os avisos de recebimento valem a partir do mês em que você informou os valores.
- **RT pousadas:**
  - Cadastre cada pousada. Em "Registrar visita", avalie o checklist item por item (conforme, não conforme ou N/A). "Tudo conforme" preenche o que ainda está em branco, e você marca só as exceções. Cada não conformidade aceita uma observação.
  - A visita mostra o % de conformidade e a lista de não conformidades. A aba mostra a evolução das últimas visitas.
  - O checklist é uma **base inspirada na RDC 216/2004**, editável em "Checklist da visita" (tirar, acrescentar, voltar ao original). Visitas antigas guardam o checklist da época.
  - **Documentos com validade** (alvará, dedetização, limpeza do reservatório…): a lista começa vazia; o Fluere avisa 30 dias antes e quando vence.
  - **Visita semanal:** no dia escolhido (padrão: sexta) aparece o lembrete; se passar do dia sem visita, vira aviso.
  - As tarefas de RT são as do módulo Tarefas, na área "RT pousadas".
- **Bela Flor:** tarefas e entregas com prazo (também da área "Bela Flor" do módulo Tarefas), posts com etapas (Reels: ideia → roteiro → gravado → editado → postado; carrossel: ideia → texto → design → postado; stories: ideia → planejado → postado), avisos de post atrasado e **relatório mensal** (lembrete a partir do dia 25 e nos primeiros 10 dias do mês seguinte).
- Os avisos de tudo isso aparecem no painel Hoje.

## Conteúdo (Mais → Conteúdo)

O Fluere **não gera ideias**: serve para **executar e medir**. O planejamento e a estrutura dos posts você faz no seu outro projeto. Três abas: **Semana**, **Ideias** e **Métricas**.

- **Semana:** quatro cartões com a meta da semana (2 no feed, 1 Reels teste, 2 dias de stories) e o calendário de segunda a domingo. Cada peça mostra formato e etapa; a setinha avança a etapa e a última é "postado". Toque em "+" num dia para criar uma peça nele. Mais abaixo, a fila "Em produção" e a divisão entre os pilares (emagrecimento feminino e saúde intestinal) do que você postou na semana.
- **Peça:** tema, formato (Reels, Reels teste, carrossel, stories, TikTok), etapa, pilar, objetivo (atrair, conectar ou vender), data programada, link de referência e anotação.
- **Etapas por formato:** Reels e Reels teste: ideia → roteiro → gravado → editado → postado. Carrossel: ideia → texto → design → postado. Stories: ideia → planejado → postado. TikTok: ideia → gravado → postado. Dá para editar tudo em "Metas e etapas", junto com os números da meta semanal.
- **Ideias:** caixinha de captura rápida (também em "+ Novo → Ideia de conteúdo"). "Virar peça" abre a peça já com o tema, o pilar e o link, e a ideia sai da caixinha.
- **Métricas:** cerca de 7 dias depois de postar, o Fluere pede alcance, curtidas, comentários, salvamentos, compartilhamentos e seguidores ganhos (stories ficam de fora). A aba mostra os totais dos últimos 30 dias, o alcance médio por formato e o ranking "o que mais funcionou".
- **Avisos no Hoje:** peça programada para hoje ou atrasada, métricas pendentes e, a partir da sexta, o que ainda falta da meta da semana. O painel Hoje mostra a "peça do dia", com botão para avançar.

## Metas do semestre (Rotina → Metas)

- **Seis pilares:** Carreira, Finanças, Saúde, Relações, Lazer e Desenvolvimento, cada um com a sua cor. O semestre é de janeiro a junho (1º) ou de julho a dezembro (2º); as setas trocam de semestre.
- **Criar uma meta:** "+ Meta" (ou o botão do próprio pilar). Escolha o pilar, escreva a meta, informe o **alvo** e como acompanhar.
- **Eu atualizo:** você digita o alvo e o quanto já fez (com unidade, como kg ou livros) e toca em "atualizar" quando quiser.
- **Automática:** o Fluere calcula sozinho somando o semestre inteiro. As fontes são: faturamento do consultório (bruto), quanto sobrou (entrou − saiu), vezes que você fez um hábito, posts no feed (Reels e carrossel), seguidores ganhos (das métricas) e atendimentos vendidos.
- **Progresso:** cada pilar mostra a média das suas metas, e o **progresso geral** é a média dos pilares que têm metas. A teia (radar) mostra o equilíbrio entre os pilares.
- **Aviso no Hoje:** quando uma meta está bem atrás do ritmo (por exemplo, 10% feito com 65% do semestre passado), o Fluere avisa. No máximo 3 avisos por vez.
- Os alvos são seus e ficam só no cofre.

## Vencimentos e documentos (Mais → Vencimentos)

- **O que cadastrar:** tudo que tem data para renovar ou pagar: anuidade do CRN, certificado digital, CNH, IPVA, licenciamento, seguros, contratos. A lista começa vazia; os **atalhos** ("Anuidade do CRN", "IPVA"…) só preenchem o formulário, e você escolhe a data.
- **Cada item** tem categoria (Profissional, Veículo, Seguros e contratos, Pessoal), data, se **se repete** (todo mês, 3 meses, 6 meses, todo ano ou não), quantos dias antes avisar (padrão: 30), valor e link opcionais.
- **Renovei:** o botão passa a data sozinho para o próximo vencimento (IPVA anual vira o ano seguinte). Se o item não se repete (como a CNH), abre o formulário para você digitar a data nova.
- **Linha do tempo:** vencidos, próximos 30 dias, 30 a 90 dias e mais adiante. Os **documentos das pousadas** (cadastrados em Trabalhos → RT) aparecem aqui também.
- **Avisos no Hoje:** quando entra na janela de aviso e quando vence (mais urgente nos últimos 7 dias).

## Revisão semanal (Mais → Revisão semanal)

Cinco passos, uns 10 minutos, de preferência no domingo. O Fluere junta os números sozinho; você escreve só o essencial.

1. **Como foi a semana:** tarefas feitas, consultas, peças postadas, visitas RT. Você escreve o que deu certo e o que não saiu como esperado.
2. **Dinheiro:** vendas e gastos da semana, o que falta receber dos pacientes e a sobra do mês até agora.
3. **Hábitos e metas:** os hábitos da semana em bolinhas, a meta de conteúdo e as metas do semestre que estão atrás do ritmo.
4. **Pendências:** tarefas atrasadas (um toque move para a próxima semana), tarefas sem dia e todos os avisos dos módulos.
5. **Próxima semana:** consultas marcadas, se a semana fecha nas horas livres, conteúdo programado, prazos e vencimentos. Você escreve as 3 prioridades e pode copiar a semana para o Claude.

- O que você escreve fica na memória enquanto navega e só vai para o cofre ao tocar em **Concluir revisão**. Se bloquear o app no meio, escreva de novo.
- As setas trocam de semana, e o histórico guarda as revisões anteriores.
- **Aviso no Hoje:** no domingo, se a revisão ainda não foi feita (e na segunda, se a da semana passada ficou de fora).

## Estudos (Mais → Estudos)

Quadro com três colunas: **Quero estudar → Estudando → Concluído**. Sem meta de estudo: serve para não perder nada.

- **Tipos:** cursos, artigos científicos, livros e temas para pesquisar. Os filtros no topo mostram um tipo de cada vez.
- **Cada item** tem título, autor ou instituição, link, em que ponto está e uma **anotação** livre (links, trechos colados, o que aprendeu).
- **Progresso:** cursos (aulas feitas de X) e livros (páginas lidas de X) mostram uma barra. No curso em andamento, o botão **+1 aula** soma uma aula; ao chegar no total, o curso vai para "Concluído".
- **Data limite** (só para cursos): quando faltam 14 dias ou menos, ou se passou, o Hoje avisa.
- **Vira conteúdo:** manda o estudo para a caixinha de ideias do Conteúdo, já com o link da fonte, e você escolhe o pilar.
- **Curso pago:** informe o valor no curso e use "Lançar gasto no CNPJ": o gasto abre já preenchido com a categoria Educação.
- "+ Novo → Estudo" também cadastra de qualquer tela.
