/* =========================================================
   Fluere · peças de conteúdo
   Uma "peça" é um post (Reels, carrossel, stories, TikTok) que
   anda por etapas até ser postado. Serve a duas contas: a sua
   (conta 'propria', módulo Conteúdo) e a da Bela Flor (conta
   'bf', módulo Trabalhos).

   O Fluere NÃO inventa ideias: ele serve para executar e medir
   (calendário da semana, etapas, meta, métricas). As ideias
   entram na "caixinha de ideias" (captura rápida).

   Peça (coleção "pecas"):
     { conta, titulo, formato, data: 'AAAA-MM-DD' (programada), etapa: número,
       pilar, objetivo: 'atrair' | 'conectar' | 'vender' | '', ref, nota,
       postadoEm, metricas: { alcance, curtidas, comentarios, salvamentos,
       compartilhamentos, seguidores, em } }
     "etapa" é a posição na lista de etapas do formato; a última é "Postado".
   Ideia (coleção "ideias"): { titulo, ref, pilar, nota }
   Configuração "conteudo": { metas: { feed, reelsteste, stories }, pilares: [{ id, nome }] }
   Configuração "etapasConteudo": { reels: ['Ideia', …], … } (etapas editadas por ela)
   ========================================================= */

import * as dados from '../nucleo/dados.js';
import * as avisos from '../nucleo/avisos.js';
import { abrirFolha, fecharFolha, toast, confirmar } from '../nucleo/ui.js';
import { esc, isoDia, deIso, diaMes, somarDias, segundaDaSemana } from '../nucleo/util.js';

const COL = 'pecas';

export const FORMATOS = [
  { id: 'reels', nome: 'Reels', etapas: ['Ideia', 'Roteiro', 'Gravado', 'Editado', 'Postado'], contas: ['bf', 'propria'], feed: true },
  { id: 'reelsteste', nome: 'Reels teste', etapas: ['Ideia', 'Roteiro', 'Gravado', 'Editado', 'Postado'], contas: ['propria'] },
  { id: 'carrossel', nome: 'Carrossel', etapas: ['Ideia', 'Texto', 'Design', 'Postado'], contas: ['bf', 'propria'], feed: true },
  { id: 'stories', nome: 'Stories', etapas: ['Ideia', 'Planejado', 'Postado'], contas: ['bf', 'propria'] },
  { id: 'tiktok', nome: 'TikTok', etapas: ['Ideia', 'Gravado', 'Postado'], contas: ['propria'] },
];
export const OBJETIVOS = [['atrair', 'Atrair'], ['conectar', 'Conectar'], ['vender', 'Vender']];
export const CAMPOS_METRICAS = [
  ['alcance', 'Alcance'], ['curtidas', 'Curtidas'], ['comentarios', 'Comentários'],
  ['salvamentos', 'Salvamentos'], ['compartilhamentos', 'Compartilhamentos'], ['seguidores', 'Seguidores ganhos'],
];

export const formatosDaConta = (conta) => FORMATOS.filter((f) => f.contas.includes(conta));
export const formato = (id) => FORMATOS.find((f) => f.id === id) ?? FORMATOS[0];

/** As etapas de um formato (a lista pode ser editada por ela, em "etapasConteudo"). */
export const etapasDe = (id) => {
  const mudadas = dados.config('etapasConteudo')?.[id];
  return Array.isArray(mudadas) && mudadas.length >= 2 ? mudadas : formato(id).etapas;
};

export const todas = (conta) => dados.lista(COL).filter((p) => p.conta === conta)
  .sort((a, b) => (a.data || '9999').localeCompare(b.data || '9999') || (a.criadoEm || 0) - (b.criadoEm || 0));

export const postada = (p) => p.etapa >= etapasDe(p.formato).length - 1;
export const nomeEtapa = (p) => etapasDe(p.formato)[Math.min(p.etapa, etapasDe(p.formato).length - 1)];

/* ---------- pilares e metas da semana ---------- */

const PILARES_PADRAO = [{ id: 'emagrecimento', nome: 'Emagrecimento feminino' }, { id: 'intestino', nome: 'Saúde intestinal' }];
export const pilares = () => dados.config('conteudo')?.pilares ?? PILARES_PADRAO;
export const nomePilar = (id) => pilares().find((p) => p.id === id)?.nome ?? '';

/** Meta de cada semana: 2 no feed (Reels ou carrossel), 1 Reels teste, 2 dias de stories. */
export const metas = () => ({ feed: 2, reelsteste: 1, stories: 2, ...(dados.config('conteudo')?.metas || {}) });

/** Dia em que a peça foi (ou será) postada. */
const diaDa = (p) => p.postadoEm || p.data || '';

/** Números da semana que começa em `segunda` (só a conta própria). */
export function semana(segunda) {
  const dom = somarDias(segunda, 6);
  const dentro = (d) => d && d >= segunda && d <= dom;
  const todasAs = todas('propria');
  const programadas = todasAs.filter((p) => dentro(p.data) || (postada(p) && dentro(p.postadoEm)));
  const postadas = todasAs.filter((p) => postada(p) && dentro(diaDa(p)));
  const m = metas();
  const feedF = (l) => l.filter((p) => formato(p.formato).feed);
  return {
    dom, meta: m, programadas, postadas,
    feed: { feitos: feedF(postadas).length, plan: feedF(programadas).length },
    teste: { feitos: postadas.filter((p) => p.formato === 'reelsteste').length, plan: programadas.filter((p) => p.formato === 'reelsteste').length },
    stories: {
      feitos: new Set(postadas.filter((p) => p.formato === 'stories').map(diaDa)).size,
      plan: new Set(programadas.filter((p) => p.formato === 'stories').map(diaDa)).size,
    },
  };
}

/* ---------- métricas ---------- */

const diasEntre = (de, ate) => Math.round((deIso(ate) - deIso(de)) / 86400000);

/** Peças postadas há 7 dias ou mais que ainda não têm métricas (stories ficam de fora). */
export const pendentesDeMetricas = (hoje = isoDia()) => todas('propria')
  .filter((p) => postada(p) && p.formato !== 'stories' && !p.metricas && p.postadoEm && diasEntre(p.postadoEm, hoje) >= 7)
  .sort((a, b) => a.postadoEm.localeCompare(b.postadoEm));

/** Resultado das peças com métricas postadas nos últimos `dias` dias. */
export function resumoMetricas(dias = 30, hoje = isoDia()) {
  const desde = somarDias(hoje, -dias);
  const lista = todas('propria').filter((p) => p.metricas && p.postadoEm && p.postadoEm >= desde);
  const soma = (campo) => lista.reduce((s, p) => s + (Number(p.metricas[campo]) || 0), 0);
  const porFormato = formatosDaConta('propria').map((f) => {
    const l = lista.filter((p) => p.formato === f.id);
    return { id: f.id, nome: f.nome, n: l.length, alcance: l.length ? Math.round(l.reduce((s, p) => s + (Number(p.metricas.alcance) || 0), 0) / l.length) : 0 };
  }).filter((x) => x.n);
  const melhores = [...lista].sort((a, b) => (Number(b.metricas.alcance) || 0) - (Number(a.metricas.alcance) || 0)).slice(0, 5);
  return {
    n: lista.length, alcance: soma('alcance'), alcanceMedio: lista.length ? Math.round(soma('alcance') / lista.length) : 0,
    salvamentos: soma('salvamentos'), compartilhamentos: soma('compartilhamentos'), seguidores: soma('seguidores'),
    porFormato, melhores,
  };
}

export function abrirMetricas(p) {
  const m = p.metricas || {};
  const f = abrirFolha(`
    <h3>Métricas <em>da peça</em></h3>
    <p class="sub">${esc(p.titulo)} · ${formato(p.formato).nome}${p.postadoEm ? ` · postado em ${diaMes(p.postadoEm)}` : ''}. Digite o que o Instagram mostra, uns 7 dias depois.</p>
    <form id="f-metricas" novalidate>
      <div class="par">${CAMPOS_METRICAS.map(([id, nome]) => `
        <div class="fld"><label for="m-${id}">${nome}</label><input id="m-${id}" type="number" min="0" inputmode="numeric" value="${m[id] ?? ''}" placeholder="0" autocomplete="off"></div>`).join('')}</div>
      <div class="acts"><button type="button" class="btn sec" data-fechar>Cancelar</button><button type="submit" class="btn pri">Salvar</button></div>
    </form>`);
  f.querySelector('[data-fechar]').onclick = fecharFolha;
  f.querySelector('#f-metricas').onsubmit = async (ev) => {
    ev.preventDefault();
    const novas = { em: isoDia() };
    for (const [id] of CAMPOS_METRICAS) novas[id] = Math.max(0, Math.round(Number(f.querySelector(`#m-${id}`).value) || 0));
    await dados.salva(COL, { ...p, metricas: novas });
    fecharFolha();
    toast('Métricas salvas ✦');
  };
}

/* ---------- ideias (caixinha de captura rápida) ---------- */

export const ideias = () => dados.lista('ideias').sort((a, b) => (b.criadoEm || 0) - (a.criadoEm || 0));

export function abrirIdeia(ideia = null, prefill = {}) {
  const nova = !ideia;
  const a = ideia ? { ...ideia } : { titulo: '', ref: '', pilar: '', nota: '', ...prefill };
  const f = abrirFolha(`
    <h3>${nova ? 'Nova' : 'Editar'} <em>ideia</em></h3>
    <form id="f-ideia" novalidate>
      <div class="fld"><label for="i-titulo">A ideia</label><input id="i-titulo" value="${esc(a.titulo)}" placeholder="Ex.: mito do intestino preso" autocomplete="off" autofocus></div>
      <div class="fld"><span class="l">Pilar</span><div class="opcoes" id="i-pilar">${pilares().map((p) => `<button type="button" data-v="${p.id}" aria-pressed="${p.id === a.pilar}">${esc(p.nome)}</button>`).join('')}</div></div>
      <div class="fld"><label for="i-ref">Link de referência (opcional)</label><input id="i-ref" type="url" inputmode="url" value="${esc(a.ref || '')}" placeholder="https://…" autocomplete="off"></div>
      <div class="erro" id="i-erro" role="alert"></div>
      ${nova ? '' : '<div class="opcoes acoes-tarefa"><button type="button" data-acao="apagar" class="perigo">Apagar ideia</button></div>'}
      <div class="acts"><button type="button" class="btn sec" data-fechar>Cancelar</button><button type="submit" class="btn pri">Guardar</button></div>
    </form>`);
  const $ = (s) => f.querySelector(s);
  $('#i-pilar').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-v]');
    if (!b) return;
    const ligado = b.getAttribute('aria-pressed') === 'true';
    $('#i-pilar').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b && !ligado)));
  });
  $('[data-fechar]').onclick = fecharFolha;
  $('#f-ideia').onsubmit = async (ev) => {
    ev.preventDefault();
    const titulo = $('#i-titulo').value.trim();
    if (!titulo) { $('#i-erro').textContent = 'Escreva a ideia.'; return; }
    await dados.salva('ideias', { ...a, titulo, pilar: $('#i-pilar [aria-pressed="true"]')?.dataset.v ?? '', ref: $('#i-ref').value.trim() });
    fecharFolha();
    toast(nova ? 'Ideia guardada ✦' : 'Ideia salva.');
  };
  f.querySelector('[data-acao="apagar"]')?.addEventListener('click', async () => {
    fecharFolha();
    if (await confirmar({ titulo: 'Apagar ideia?', texto: esc(a.titulo), ok: 'Apagar', perigo: true })) { await dados.apaga('ideias', a.id); toast('Ideia apagada.'); }
  });
}

/** Transforma a ideia numa peça (a ideia sai da caixinha quando a peça é salva). */
export function virarPeca(ideia) {
  abrirPeca(null, { conta: 'propria', prefill: { titulo: ideia.titulo, ref: ideia.ref || '', pilar: ideia.pilar || '' }, aoSalvar: () => dados.apaga('ideias', ideia.id) });
}

/* ---------- etapas e metas (ajustes) ---------- */

export async function avancar(p) {
  const ultima = etapasDe(p.formato).length - 1;
  if (p.etapa >= ultima) return;
  const etapa = p.etapa + 1;
  await dados.salva(COL, { ...p, etapa, ...(etapa === ultima ? { postadoEm: isoDia() } : {}) });
  toast(etapa === ultima ? 'Postado ✦' : `Agora em “${etapasDe(p.formato)[etapa]}”.`);
}

export function abrirAjustes() {
  const m = metas();
  const formatos = formatosDaConta('propria');
  const f = abrirFolha(`
    <h3>Metas e <em>etapas</em></h3>
    <form id="f-ajustes" novalidate>
      <div class="rot acc">Meta de cada semana</div>
      <div class="par3 par">
        <div class="fld"><label for="a-feed">No feed</label><input id="a-feed" type="number" min="0" inputmode="numeric" value="${m.feed}"><small>Reels ou carrossel</small></div>
        <div class="fld"><label for="a-teste">Reels teste</label><input id="a-teste" type="number" min="0" inputmode="numeric" value="${m.reelsteste}"></div>
        <div class="fld"><label for="a-stories">Dias de stories</label><input id="a-stories" type="number" min="0" inputmode="numeric" value="${m.stories}"></div>
      </div>
      <div class="rot acc" style="margin-top:6px">Etapas de cada formato</div>
      <p class="sub" style="margin-bottom:10px">Separe por vírgula, na ordem. A última é sempre a de “postado”.</p>
      ${formatos.map((x) => `<div class="fld"><label for="e-${x.id}">${x.nome}</label><input id="e-${x.id}" value="${esc(etapasDe(x.id).join(', '))}" autocomplete="off"></div>`).join('')}
      <div class="erro" id="a-erro" role="alert"></div>
      <div class="opcoes acoes-tarefa"><button type="button" data-acao="padrao">Voltar às etapas originais</button></div>
      <div class="acts"><button type="button" class="btn sec" data-fechar>Cancelar</button><button type="submit" class="btn pri">Salvar</button></div>
    </form>`);
  const $ = (s) => f.querySelector(s);
  $('[data-fechar]').onclick = fecharFolha;
  $('[data-acao="padrao"]').onclick = () => formatos.forEach((x) => { $(`#e-${x.id}`).value = x.etapas.join(', '); });
  $('#f-ajustes').onsubmit = async (ev) => {
    ev.preventDefault();
    const etapas = {};
    for (const x of formatos) {
      const lista = $(`#e-${x.id}`).value.split(',').map((t) => t.trim()).filter(Boolean);
      if (lista.length < 2) { $('#a-erro').textContent = `${x.nome}: coloque pelo menos duas etapas.`; return; }
      if (lista.join('|') !== x.etapas.join('|')) etapas[x.id] = lista;
    }
    const n = (sel) => Math.max(0, Math.round(Number($(sel).value) || 0));
    await dados.salvaConfig('conteudo', { ...(dados.config('conteudo') || {}), metas: { feed: n('#a-feed'), reelsteste: n('#a-teste'), stories: n('#a-stories') } });
    await dados.salvaConfig('etapasConteudo', etapas);
    fecharFolha();
    toast('Ajustes salvos ✦');
  };
}

/* ---------- formulário da peça ---------- */

/** Folha para criar ou editar uma peça. `prefill`: campos já preenchidos. `aoSalvar`: chamado depois de salvar. */
export function abrirPeca(peca = null, { conta = 'bf', prefill = {}, aoSalvar } = {}) {
  const nova = !peca;
  const contaDaPeca = peca?.conta || conta;
  const formatos = formatosDaConta(contaDaPeca);
  const p = peca ? { ...peca } : { conta, titulo: '', formato: formatos[0].id, data: '', etapa: 0, pilar: '', objetivo: '', ref: '', nota: '', ...prefill };
  const propria = contaDaPeca === 'propria';

  const f = abrirFolha(`
    <h3>${nova ? 'Nova' : 'Editar'} <em>peça</em></h3>
    <form id="f-peca" novalidate>
      <div class="fld"><label for="pc-titulo">Tema ou título</label>
        <input id="pc-titulo" value="${esc(p.titulo)}" placeholder="Ex.: 3 dicas para o café da manhã" autocomplete="off" autofocus></div>
      <div class="fld"><span class="l">Formato</span><div class="opcoes" id="pc-formato">${formatos.map((x) => `<button type="button" data-v="${x.id}" aria-pressed="${x.id === p.formato}">${x.nome}</button>`).join('')}</div></div>
      <div class="fld"><span class="l">Etapa</span><div class="opcoes" id="pc-etapa"></div></div>
      ${propria ? `<div class="fld"><span class="l">Pilar</span><div class="opcoes" id="pc-pilar">${pilares().map((x) => `<button type="button" data-v="${x.id}" aria-pressed="${x.id === p.pilar}">${esc(x.nome)}</button>`).join('')}</div></div>` : ''}
      <div class="fld"><span class="l">Objetivo</span><div class="opcoes" id="pc-obj">${OBJETIVOS.map(([v, n]) => `<button type="button" data-v="${v}" aria-pressed="${v === p.objetivo}">${n}</button>`).join('')}</div></div>
      <div class="fld"><label for="pc-data">Programada para</label><input id="pc-data" type="date" value="${esc(p.data || '')}"></div>
      <div class="fld"><label for="pc-ref">Link de referência (opcional)</label><input id="pc-ref" type="url" inputmode="url" value="${esc(p.ref || '')}" placeholder="https://…" autocomplete="off"></div>
      <div class="fld"><label for="pc-nota">Anotação (opcional)</label><textarea id="pc-nota" rows="2">${esc(p.nota || '')}</textarea></div>
      <div class="erro" id="pc-erro" role="alert"></div>
      ${nova ? '' : `<div class="opcoes acoes-tarefa">${propria && postada(p) ? '<button type="button" data-acao="metricas">Métricas</button>' : ''}<button type="button" data-acao="apagar" class="perigo">Apagar peça</button></div>`}
      <div class="acts"><button type="button" class="btn sec" data-fechar>Cancelar</button><button type="submit" class="btn pri">Salvar</button></div>
    </form>`);
  const $ = (s) => f.querySelector(s);
  const escolhido = (sel) => $(sel)?.querySelector('[aria-pressed="true"]')?.dataset.v ?? null;
  const grupo = (sel, aoMudar, podeLimpar = false) => $(sel)?.addEventListener('click', (e) => {
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
    $('#pc-etapa').innerHTML = lista.map((n, i) => `<button type="button" data-v="${i}" aria-pressed="${i === etapa}">${esc(n)}</button>`).join('');
  };
  grupo('#pc-formato', () => { etapa = 0; desenharEtapas(); });
  grupo('#pc-etapa', () => { etapa = Number(escolhido('#pc-etapa')); });
  grupo('#pc-pilar', null, true);
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
      ...p, titulo, formato: fmt, etapa, data: $('#pc-data').value, pilar: propria ? (escolhido('#pc-pilar') ?? '') : '', objetivo: escolhido('#pc-obj') ?? '',
      ref: $('#pc-ref').value.trim(), nota: $('#pc-nota').value.trim(),
      postadoEm: etapa === ultima ? (p.postadoEm || isoDia()) : null,
    });
    fecharFolha();
    toast(nova ? 'Peça criada ✦' : 'Peça salva.');
    aoSalvar?.();
  };
  f.querySelector('[data-acao="metricas"]')?.addEventListener('click', () => abrirMetricas(p));
  f.querySelector('[data-acao="apagar"]')?.addEventListener('click', async () => {
    fecharFolha();
    if (await confirmar({ titulo: 'Apagar peça?', texto: esc(p.titulo), ok: 'Apagar', perigo: true })) { await dados.apaga(COL, p.id); toast('Peça apagada.'); }
  });
}

/* ---------- avisos ---------- */

const CONTAS = { bf: { nome: 'Bela Flor', rota: '#/mais/trabalhos/belaflor' }, propria: { nome: 'Conteúdo', rota: '#/mais/conteudo' } };

avisos.registrar('pecas', () => {
  const hoje = isoDia();
  const out = [];
  for (const conta of ['bf', 'propria']) {
    for (const p of todas(conta).filter((x) => x.data && x.data <= hoje && !postada(x))) {
      out.push({
        id: `peca-${p.id}`, tipo: 'warn', prioridade: p.data < hoje ? 5 : 4, irPara: CONTAS[conta].rota,
        texto: `${CONTAS[conta].nome}: o post <strong>${esc(p.titulo)}</strong> ${p.data === hoje ? 'é para hoje' : `era para ${diaMe(p.data)}`} e está em “${nomeEtapa(p)}”.`,
      });
    }
  }
  const pend = pendentesDeMetricas(hoje);
  if (pend.length) out.push({ id: 'metricas-pendentes', tipo: 'info', prioridade: 3, irPara: '#/mais/conteudo/metricas', texto: `${pend.length === 1 ? '1 peça postada há mais de 7 dias está' : `${pend.length} peças postadas há mais de 7 dias estão`} sem métricas.` });

  // Meta da semana: a partir da sexta, avisa o que ainda falta
  const dow = (deIso(hoje).getDay() + 6) % 7;
  if (dow >= 4) {
    const s = semana(segundaDaSemana(hoje));
    const faltas = [];
    if (s.feed.feitos < s.meta.feed) faltas.push(`${s.meta.feed - s.feed.feitos} no feed`);
    if (s.teste.feitos < s.meta.reelsteste) faltas.push(`${s.meta.reelsteste - s.teste.feitos} Reels teste`);
    if (s.stories.feitos < s.meta.stories) faltas.push(`${s.meta.stories - s.stories.feitos} dia${s.meta.stories - s.stories.feitos > 1 ? 's' : ''} de stories`);
    if (faltas.length) out.push({ id: 'meta-semana', tipo: 'info', prioridade: 3, irPara: '#/mais/conteudo', texto: `Meta de conteúdo da semana: ainda faltam ${faltas.join(', ')}.` });
  }
  return out;
});
const diaMe = (iso) => diaMes(iso);
