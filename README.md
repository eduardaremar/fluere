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
| 1 | Financeiro do consultório | próxima |
| 2 | Gastos CPF/CNPJ e resumo geral (+ sincronização Mac/iPhone) | |
| 3 | Pacientes | |
| 4 | Tarefas e planejador da semana | |
| 5 | Hábitos | |
| 6 | Metas do semestre | |
| 7 | Conteúdo | |
| 8 | Trabalhos paralelos (RT pousadas, Bela Flor) | |
| 9 | Estudos | |
| 10 | Vencimentos e documentos | |
| 11 | Revisão semanal | |
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
