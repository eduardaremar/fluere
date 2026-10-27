/* =========================================================
   Fluere · Conteúdo (@nutrieduardaremar)
   Executar e medir: calendário da semana com a meta, etapas de
   cada peça, caixinha de ideias e métricas. O Fluere não gera
   ideias. Endereços: #/mais/conteudo, /ideias e /metricas
   A lógica fica em js/modulos/pecas.js.
   ========================================================= */

import * as G from '../nucleo/graficos.js';
import * as avisos from '../nucleo/avisos.js';
import { cabecalho, painel, kpi, abas, icone, areaLimpa, toast } from '../nucleo/ui.js';
import * as dados from '../nucleo/dados.js';
import { esc, isoDia, diaMes, somarDias, segundaDaSemana, NOMES_DIAS } from '../nucleo/util.js';
import * as P from '../modulos/pecas.js';

const PARTES = [
  { rota: 'semana', nome: 'Semana', desenhar: semana },
  { rota: 'ideias', nome: 'Ideias', desenhar: ideias },
  { rota: 'metricas', nome: 'Métricas', desenhar: metricas },
];
const estado = { segunda: segundaDaSemana() };
let ultimo = null;

const COR_FORMATO = { reels: 'var(--g4)', reelsteste: 'var(--g3)', carrossel: 'var(--g6)', stories: 'var(--g8)', tiktok: 'var(--g7)' };
const COR_PILAR = ['var(--g2)', 'var(--g4)', 'var(--g6)', 'var(--g8)'];
const num = (v) => Number(v || 0).toLocaleString('pt-BR');

export function desenhar(el, partes = ultimo?.partes ?? []) {
  el = areaLimpa(el);
  ultimo = { el, partes };
  const atual = PARTES.find((p) => p.rota === partes[0]) || PARTES[0];
  el.innerHTML = `
    ${cabecalho({ voltar: ['#/mais', 'Mais'], sup: 'Frentes', titulo: 'Conteúdo', avisos: avisos.todos().length })}
    <div class="nav-mes">${abas('mais/conteudo', PARTES, atual.rota)}
      <button type="button" class="chip" data-ajustes>Metas e etapas</button></div>
    ${atual.desenhar()}`;
  ligar(el);
}
const redesenhar = () => ultimo && desenhar(ultimo.el, ultimo.partes);

const chipEtapa = (p) => `<span class="chip ${P.postada(p) ? 'pos' : ''}">${esc(P.nomeEtapa(p))}</span>`;

/* =========================================================
   SEMANA
   ========================================================= */

function cartaoPeca(p) {
  return `<div class="peca-card" style="--a:${COR_FORMATO[p.formato] || 'var(--g1)'}">
    <button type="button" class="tx" data-peca="${p.id}"><b>${esc(p.titulo)}</b><small>${P.formato(p.formato).nome} · ${esc(P.nomeEtapa(p))}</small></button>
    ${P.postada(p) ? `<span class="caixa-chk ok">${icone.check(12)}</span>` : `<button type="button" class="avanca" data-avancar="${p.id}" aria-label="Avançar etapa de ${esc(p.titulo)}">${icone.seta(14)}</button>`}
  </div>`;
}

function semana() {
  const hoje = isoDia();
  const s = P.semana(estado.segunda);
  const dias = Array.from({ length: 7 }, (_, i) => somarDias(estado.segunda, i));
  const emProducao = P.todas('propria').filter((p) => !P.postada(p));
  const titulo = estado.segunda === segundaDaSemana() ? 'Esta semana' : `Semana de ${diaMe(estado.segunda)}`;

  const kpiMeta = (rot, f, meta, detalhe, cor) => kpi({
    rot, valor: `${f.feitos}<span> / ${meta}</span>`,
    sub: `${detalhe ? `${detalhe} · ` : ''}${f.feitos >= meta && meta > 0 ? 'meta batida' : f.plan > f.feitos ? `${f.plan} programado${f.plan > 1 ? 's' : ''}` : 'nada programado'}`,
    extra: G.trilho(meta ? (f.feitos / meta) * 100 : 0, cor),
  });
  const pil = P.pilares().map((x, i) => {
    const valor = s.postadas.filter((p) => p.pilar === x.id).length;
    return { rotulo: x.nome, valor, cor: COR_PILAR[i % COR_PILAR.length] };
  });
  const semPilar = s.postadas.filter((p) => !p.pilar).length;

  return `
    <div class="grade g-kpi">
      ${kpiMeta('Feed', s.feed, s.meta.feed, 'Reels ou carrossel', 'var(--g4)')}
      ${kpiMeta('Reels teste', s.teste, s.meta.reelsteste, '', 'var(--g3)')}
      ${kpiMeta('Stories', s.stories, s.meta.stories, 'dias com stories', 'var(--g8)')}
      ${kpi({ rot: 'Em produção', valor: emProducao.length, sub: emProducao.length ? 'peças ainda sem postar' : 'nada na fila' })}
    </div>

    ${painel({ rot: 'Calendário', titulo,
      corpo: `
        <div class="nav-semana">
          <button type="button" class="redondo" data-semana="-7" aria-label="Semana anterior">${icone.voltar(18)}</button>
          <span>${diaMe(estado.segunda)} a ${diaMe(somarDias(estado.segunda, 6))}</span>
          <button type="button" class="redondo" data-semana="7" aria-label="Próxima semana">${icone.seta(18)}</button>
          ${estado.segunda !== segundaDaSemana() ? '<button type="button" class="link-mini" data-semana="hoje">voltar para hoje</button>' : ''}
          <span style="flex:1"></span>
          <button type="button" class="btn pri" data-nova-peca>${icone.soma(16)} Peça</button>
        </div>
        <div class="semana-grade">${dias.map((iso, i) => {
          const dodia = s.programadas.filter((p) => (p.postadoEm || p.data) === iso);
          return `<div class="dia ${iso === hoje ? 'hoje' : ''}">
            <div class="dia-h"><b>${NOMES_DIAS[i]}</b><span>${diaMe(iso)}</span></div>
            ${dodia.map(cartaoPeca).join('')}
            <button type="button" class="add-dia" data-novo-dia="${iso}" aria-label="Nova peça em ${NOMES_DIAS[i]}">${icone.soma(16)}</button>
          </div>`; }).join('')}</div>` })}

    <div class="grade g-2">
      ${painel({ rot: 'Fila', titulo: 'Em produção',
        corpo: emProducao.length
          ? `<div class="linhas">${emProducao.map((p) => `
              <div class="linha">
                <span class="marca-area" style="background:${COR_FORMATO[p.formato] || 'var(--g1)'}"></span>
                <button type="button" class="tx" data-peca="${p.id}"><b>${esc(p.titulo)}</b><small>${P.formato(p.formato).nome}${p.data ? ` · ${diaMe(p.data)}` : ' · sem data'}${p.pilar ? ` · ${esc(P.nomePilar(p.pilar))}` : ''}</small></button>
                ${chipEtapa(p)}
                <button type="button" class="chip" data-avancar="${p.id}" aria-label="Avançar etapa">avançar ${icone.seta(12)}</button>
              </div>`).join('')}</div>`
          : '<div class="vazio">Nenhuma peça na fila. Toque em “+ Peça” ou transforme uma ideia em peça.</div>' })}
      ${painel({ rot: 'Pilares', titulo: 'O que você postou na semana',
        corpo: s.postadas.length
          ? `<div class="rosca-bloco">${G.rosca(pil.filter((x) => x.valor), { centro: String(s.postadas.length), sub: s.postadas.length === 1 ? 'peça' : 'peças' })}
              <div>${G.legenda(pil.map((x) => ({ ...x, extra: String(x.valor) })), { mostrar: 'extra' })}${semPilar ? `<small style="color:var(--soft)">${semPilar} sem pilar</small>` : ''}</div></div>`
          : '<div class="vazio">Quando você postar, mostro o equilíbrio entre os pilares.</div>' })}
    </div>`;
}
const diaMe = (iso) => diaMes(iso);

/* =========================================================
   IDEIAS
   ========================================================= */

function ideias() {
  const lista = P.ideias();
  return `
    ${painel({ rot: 'Captura rápida', titulo: 'Caixinha de ideias',
      corpo: `
        <form id="f-rapida" class="filtros" style="margin-bottom:6px" novalidate>
          <input class="busca" id="ideia-rapida" placeholder="Anote a ideia e toque em guardar" autocomplete="off" style="flex:1;min-width:180px;width:auto">
          <button type="submit" class="btn pri">${icone.soma(16)} Guardar</button>
          <button type="button" class="btn sec" data-ideia-completa>Com detalhes</button>
        </form>
        <small style="color:var(--soft)">Aqui só ficam as ideias. O planejamento e a estrutura dos posts você faz no seu outro projeto; no Fluere você acompanha a execução.</small>
        ${lista.length ? `<div class="linhas" style="margin-top:8px">${lista.map((i) => `
          <div class="linha">
            <button type="button" class="tx" data-ideia="${i.id}"><b>${esc(i.titulo)}</b><small>${i.pilar ? esc(P.nomePilar(i.pilar)) : 'sem pilar'}${i.ref ? ' · com link' : ''}</small></button>
            ${i.ref ? `<a class="chip" href="${esc(i.ref)}" target="_blank" rel="noopener">link</a>` : ''}
            <button type="button" class="chip acc" data-virar="${i.id}">virar peça</button>
          </div>`).join('')}</div>`
          : '<div class="vazio">Nenhuma ideia guardada ainda.</div>'}` })}`;
}

/* =========================================================
   MÉTRICAS
   ========================================================= */

function metricas() {
  const hoje = isoDia();
  const r = P.resumoMetricas(30, hoje);
  const pend = P.pendentesDeMetricas(hoje);
  const barras = r.porFormato.map((x) => ({ rotulo: x.nome.replace('Reels teste', 'Teste'), valor: x.alcance, cor: COR_FORMATO[x.id], dica: `${num(x.alcance)} de alcance médio (${x.n} ${x.n === 1 ? 'peça' : 'peças'})` }));
  return `
    <div class="grade g-kpi">
      ${kpi({ rot: 'Alcance médio', valor: r.n ? num(r.alcanceMedio) : '—', sub: `${r.n} ${r.n === 1 ? 'peça medida' : 'peças medidas'} em 30 dias` })}
      ${kpi({ rot: 'Salvamentos', valor: num(r.salvamentos), sub: 'últimos 30 dias' })}
      ${kpi({ rot: 'Compartilhados', valor: num(r.compartilhamentos), sub: 'últimos 30 dias' })}
      ${kpi({ rot: 'Seguidores ganhos', valor: num(r.seguidores), sub: 'últimos 30 dias' })}
    </div>

    ${painel({ rot: 'Uns 7 dias depois', titulo: 'Para registrar',
      corpo: pend.length
        ? `<div class="linhas">${pend.map((p) => `
            <div class="linha"><button type="button" class="tx" data-peca="${p.id}"><b>${esc(p.titulo)}</b><small>${P.formato(p.formato).nome} · postado em ${diaMe(p.postadoEm)}</small></button>
              <button type="button" class="chip acc" data-metricas="${p.id}">registrar</button></div>`).join('')}</div>`
        : '<div class="vazio">Nenhuma peça esperando métricas ✦</div>' })}

    <div class="grade g-2">
      ${painel({ rot: 'Comparar', titulo: 'Alcance médio por formato',
        corpo: barras.length ? G.barras(barras, { altura: 150 }) : '<div class="vazio">Registre as métricas de algumas peças para comparar os formatos.</div>' })}
      ${painel({ rot: 'Ranking', titulo: 'O que mais funcionou',
        corpo: r.melhores.length
          ? `<div class="linhas">${r.melhores.map((p, i) => `
              <div class="linha"><span class="hora" style="width:24px">${i + 1}</span>
                <button type="button" class="tx" data-metricas="${p.id}"><b>${esc(p.titulo)}</b><small>${P.formato(p.formato).nome}${p.pilar ? ` · ${esc(P.nomePilar(p.pilar))}` : ''}${p.objetivo ? ` · ${P.OBJETIVOS.find((o) => o[0] === p.objetivo)?.[1].toLowerCase()}` : ''}</small></button>
                <span class="valor">${num(p.metricas.alcance)}</span></div>`).join('')}</div>`
          : '<div class="vazio">O ranking aparece quando houver métricas.</div>' })}
    </div>`;
}

/* =========================================================
   CLIQUES
   ========================================================= */

function ligar(el) {
  el.addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const d = b.dataset;
    const peca = (id) => P.todas('propria').find((p) => p.id === id);
    if (d.semana) { estado.segunda = d.semana === 'hoje' ? segundaDaSemana() : somarDias(estado.segunda, Number(d.semana)); redesenhar(); }
    else if (d.ajustes !== undefined) P.abrirAjustes();
    else if (d.novaPeca !== undefined) P.abrirPeca(null, { conta: 'propria', prefill: { data: estado.segunda === segundaDaSemana() ? isoDia() : estado.segunda } });
    else if (d.novoDia) P.abrirPeca(null, { conta: 'propria', prefill: { data: d.novoDia } });
    else if (d.peca) P.abrirPeca(peca(d.peca));
    else if (d.avancar) await P.avancar(peca(d.avancar));
    else if (d.metricas) P.abrirMetricas(peca(d.metricas));
    else if (d.ideiaCompleta !== undefined) P.abrirIdeia(null, { titulo: el.querySelector('#ideia-rapida')?.value.trim() || '' });
    else if (d.ideia) P.abrirIdeia(P.ideias().find((i) => i.id === d.ideia));
    else if (d.virar) P.virarPeca(P.ideias().find((i) => i.id === d.virar));
  });
  el.querySelector('#f-rapida')?.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const campo = el.querySelector('#ideia-rapida');
    const titulo = campo.value.trim();
    if (!titulo) { campo.focus(); return; }
    await dados.salva('ideias', { titulo, ref: '', pilar: '', nota: '' });
    toast('Ideia guardada ✦');
  });
}
