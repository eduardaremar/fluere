/* =========================================================
   Fluere · peças de conteúdo
   Uma "peça" é um post (Reels, carrossel, stories, TikTok) que
   anda por etapas até ser postado. Este arquivo serve a duas
   contas: a da Bela Flor (conta 'bf', usada no módulo Trabalhos)
   e, mais adiante, a sua própria (conta 'propria', módulo Conteúdo).

   Peça (coleção "pecas"):
     { conta, titulo, formato, data: 'AAAA-MM-DD', etapa: número,
       objetivo: 'atrair' | 'conectar' | 'vender' | '', ref, nota }
     "etapa" é a posição na lista de etapas do formato; a última
     etapa é "Postado".
   ========================================================= */

import * as dados from '../nucleo/dados.js';
import * as avisos from '../nucleo/avisos.js';
import { abrirFolha, fecharFolha, toast, confirmar } from '../nucleo/ui.js';
import { esc, isoDia, diaMes } from '../nucleo/util.js';

const COL = 'pecas';

export const FORMATOS = [
  { id: 'reels', nome: 'Reels', etapas: ['Ideia', 'Roteiro', 'Gravado', 'Editado', 'Postado'], contas: ['bf', 'propria'] },
  { id: 'reelsteste', nome: 'Reels teste', etapas: ['Ideia', 'Roteiro', 'Gravado', 'Editado', 'Postado'], contas: ['propria'] },
  { id: 'carrossel', nome: 'Carrossel', etapas: ['Ideia', 'Texto', 'Design', 'Postado'], contas: ['bf', 'propria'] },
  { id: 'stories', nome: 'Stories', etapas: ['Ideia', 'Planejado', 'Postado'], contas: ['bf', 'propria'] },
  { id: 'tiktok', nome: 'TikTok', etapas: ['Ideia', 'Gravado', 'Postado'], contas: ['propria'] },
];
export const OBJETIVOS = [['atrair', 'Atrair'], ['conectar', 'Conectar'], ['vender', 'Vender']];

export const formatosDaConta = (conta) => FORMATOS.filter((f) => f.contas.includes(conta));
export const formato = (id) => FORMATOS.find((f) => f.id === id) ?? FORMATOS[0];

/** As etapas de um formato (podem ser editadas no módulo Conteúdo, guardadas na configuração "etapasConteudo"). */
export const etapasDe = (id) => dados.config('etapasConteudo')?.[id] ?? formato(id).etapas;

export const todas = (conta) => dados.lista(COL).filter((p) => p.conta === conta)
  .sort((a, b) => (a.data || '9999').localeCompare(b.data || '9999') || (a.criadoEm || 0) - (b.criadoEm || 0));

export const postada = (p) => p.etapa >= etapasDe(p.formato).length - 1;
export const nomeEtapa = (p) => etapasDe(p.formato)[Math.min(p.etapa, etapasDe(p.formato).length - 1)];

/** Passa a peça para a etapa seguinte. */
export async function avancar(p) {
  const ultima = etapasDe(p.formato).length - 1;
  if (p.etapa >= ultima) return;
  const etapa = p.etapa + 1;
  await dados.salva(COL, { ...p, etapa, ...(etapa === ultima ? { postadoEm: isoDia() } : {}) });
  toast(etapa === ultima ? 'Postado ✦' : `Agora em “${etapasDe(p.formato)[etapa]}”.`);
}

/** Folha para criar ou editar uma peça. */
export function abrirPeca(peca = null, { conta = 'bf' } = {}) {
  const nova = !peca;
  const formatos = formatosDaConta(peca?.conta || conta);
  const p = peca ? { ...peca } : { conta, titulo: '', formato: formatos[0].id, data: '', etapa: 0, objetivo: '', ref: '', nota: '' };

  const f = abrirFolha(`
    <h3>${nova ? 'Nova' : 'Editar'} <em>peça</em></h3>
    <form id="f-peca" novalidate>
      <div class="fld"><label for="pc-titulo">Tema ou título</label>
        <input id="pc-titulo" value="${esc(p.titulo)}" placeholder="Ex.: 3 dicas para o café da manhã" autocomplete="off" autofocus></div>
      <div class="fld"><span class="l">Formato</span><div class="opcoes" id="pc-formato">${formatos.map((x) => `<button type="button" data-v="${x.id}" aria-pressed="${x.id === p.formato}">${x.nome}</button>`).join('')}</div></div>
      <div class="fld"><span class="l">Etapa</span><div class="opcoes" id="pc-etapa"></div></div>
      <div class="par">
        <div class="fld"><label for="pc-data">Programada para</label><input id="pc-data" type="date" value="${esc(p.data || '')}"></div>
        <div class="fld"><span class="l">Objetivo</span><div class="opcoes" id="pc-obj">${OBJETIVOS.map(([v, n]) => `<button type="button" data-v="${v}" aria-pressed="${v === p.objetivo}">${n}</button>`).join('')}</div></div>
      </div>
      <div class="fld"><label for="pc-ref">Link de referência (opcional)</label><input id="pc-ref" type="url" inputmode="url" value="${esc(p.ref || '')}" placeholder="https://…" autocomplete="off"></div>
      <div class="fld"><label for="pc-nota">Anotação (opcional)</label><textarea id="pc-nota" rows="2">${esc(p.nota || '')}</textarea></div>
      <div class="erro" id="pc-erro" role="alert"></div>
      ${nova ? '' : '<div class="opcoes acoes-tarefa"><button type="button" data-acao="apagar" class="perigo">Apagar peça</button></div>'}
      <div class="acts"><button type="button" class="btn sec" data-fechar>Cancelar</button><button type="submit" class="btn pri">Salvar</button></div>
    </form>`);
  const $ = (s) => f.querySelector(s);
  const escolhido = (sel) => $(sel).querySelector('[aria-pressed="true"]')?.dataset.v ?? null;
  const grupo = (sel, aoMudar, podeLimpar = false) => $(sel).addEventListener('click', (e) => {
    const b = e.target.closest('button[data-v]');
    if (!b) return;
    const ligado = b.getAttribute('aria-pressed') === 'true';
    $(sel).querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b && !(podeLimpar && ligado))));
    aoMudar?.();
  });

  let etapa = Math.min(p.etapa, etapasDe(p.formato).length - 1);
  const desenharEtapas = () => {
    const lista = etapasDe(escolhido('#pc-formato'));
    etapa = Math.min(etapa, lista.length - 1);
    $('#pc-etapa').innerHTML = lista.map((n, i) => `<button type="button" data-v="${i}" aria-pressed="${i === etapa}">${n}</button>`).join('');
  };
  grupo('#pc-formato', () => { etapa = 0; desenharEtapas(); });
  grupo('#pc-etapa', () => { etapa = Number(escolhido('#pc-etapa')); });
  grupo('#pc-obj', null, true);
  desenharEtapas();
  $('[data-fechar]').onclick = fecharFolha;

  $('#f-peca').onsubmit = async (ev) => {
    ev.preventDefault();
    const titulo = $('#pc-titulo').value.trim();
    if (!titulo) { $('#pc-erro').textContent = 'Escreva o tema da peça.'; $('#pc-titulo').focus(); return; }
    const fmt = escolhido('#pc-formato');
    const ultima = etapasDe(fmt).length - 1;
    await dados.salva(COL, {
      ...p, titulo, formato: fmt, etapa, data: $('#pc-data').value, objetivo: escolhido('#pc-obj') ?? '',
      ref: $('#pc-ref').value.trim(), nota: $('#pc-nota').value.trim(),
      postadoEm: etapa === ultima ? (p.postadoEm || isoDia()) : null,
    });
    fecharFolha();
    toast(nova ? 'Peça criada ✦' : 'Peça salva.');
  };
  f.querySelector('[data-acao="apagar"]')?.addEventListener('click', async () => {
    fecharFolha();
    if (await confirmar({ titulo: 'Apagar peça?', texto: esc(p.titulo), ok: 'Apagar', perigo: true })) { await dados.apaga(COL, p.id); toast('Peça apagada.'); }
  });
}

/* ---------- avisos: peça da Bela Flor com a data chegando ou passada ---------- */

avisos.registrar('pecas-bf', () => {
  const hoje = isoDia();
  return todas('bf').filter((p) => p.data && p.data <= hoje && !postada(p)).map((p) => ({
    id: `peca-${p.id}`, tipo: 'warn', prioridade: p.data < hoje ? 5 : 4, irPara: '#/mais/trabalhos/belaflor',
    texto: `Bela Flor: o post <strong>${esc(p.titulo)}</strong> ${p.data === hoje ? 'é para hoje' : `era para ${diaMes(p.data)}`} e está em “${nomeEtapa(p)}”.`,
  }));
});
