/* =========================================================
   Fluere · Trabalhos paralelos
   RT das pousadas e marketing da Bela Flor.
   Endereços: #/mais/trabalhos, /rt e /belaflor
   A lógica fica em js/modulos/trabalhos.js e pecas.js.
   ========================================================= */

import * as G from '../nucleo/graficos.js';
import * as avisos from '../nucleo/avisos.js';
import { cabecalho, painel, kpi, abas, icone, areaLimpa } from '../nucleo/ui.js';
import { brl, esc, isoDia, isoMes, diaMes, mesPorExtenso, somarMeses, somarDias, segundaDaSemana } from '../nucleo/util.js';
import * as W from '../modulos/trabalhos.js';
import * as T from '../modulos/tarefas.js';
import * as P from '../modulos/pecas.js';

const PARTES = [
  { rota: 'geral', nome: 'Visão geral', desenhar: geral },
  { rota: 'rt', nome: 'RT pousadas', desenhar: rt },
  { rota: 'belaflor', nome: 'Bela Flor', desenhar: belaflor },
];
const estado = { mes: isoMes() };
let ultimo = null;

export function desenhar(el, partes = ultimo?.partes ?? []) {
  el = areaLimpa(el);
  ultimo = { el, partes };
  const atual = PARTES.find((p) => p.rota === partes[0]) || PARTES[0];
  el.innerHTML = `
    ${cabecalho({ voltar: ['#/mais', 'Mais'], sup: 'Frentes', titulo: 'Trabalhos <em>paralelos</em>', avisos: avisos.todos().length })}
    <div class="nav-mes">${abas('mais/trabalhos', PARTES, atual.rota)}</div>
    ${atual.desenhar()}`;
  ligar(el);
}
const redesenhar = () => ultimo && desenhar(ultimo.el, ultimo.partes);

const curto = (v) => (Math.abs(v) >= 1000 ? brl(Math.round(v)).replace(/,00$/, '') : brl(v).replace(/,00$/, ''));
const AVISOS_DAQUI = ['visita-', 'doc-', 'receb-', 'relat-', 'peca-'];
const pendencias = () => avisos.todos().filter((a) => AVISOS_DAQUI.some((p) => a.id.startsWith(p)));

const lista = (itens) => `<ul class="alerts">${itens.map((a) => `<li>${a.irPara
  ? `<button type="button" class="alert ${a.tipo || ''}" data-ir="${a.irPara}"><span class="d"></span><div>${a.texto}</div></button>`
  : `<div class="alert ${a.tipo || ''}"><span class="d"></span><div>${a.texto}</div></div>`}</li>`).join('')}</ul>`;

/* =========================================================
   VISÃO GERAL
   ========================================================= */

function geral() {
  const hoje = isoDia();
  const ent = W.entradas(estado.mes);
  const [lrt, lbf] = ent.linhas;
  const ps = W.pousadas();
  const faltam = ps.filter((p) => !W.visitaDaSemana(p.id, hoje));
  const vencendo = W.docs().filter((d) => { const s = W.statusDoc(d, hoje); return s.dias != null && s.dias <= 30; });
  const pend = pendencias();
  const kpiGrana = (l) => kpi({
    rot: l.nome, valor: l.valor > 0 ? curto(l.valor) : '—',
    sub: l.valor > 0 ? (l.recebido ? `recebido em ${diaMe(l.recebidoEm)}` : `a receber · costuma cair dia ${l.dia}`) : '<button type="button" class="link-mini" data-valores>informar o valor</button>',
    classe: l.id === 'rt' ? 'verde' : 'quente',
  });
  const nomeDia = W.NOME_DIA[W.config().diaVisita];

  return `
    <div class="grade g-kpi">
      ${kpiGrana(lrt)}${kpiGrana(lbf)}
      ${kpi({ rot: 'Visitas da semana', valor: ps.length ? `${ps.length - faltam.length}<span style="font-size:.5em;color:var(--soft)"> / ${ps.length}</span>` : '—', sub: ps.length ? (faltam.length ? `faltam: ${esc(faltam.map((p) => p.nome).join(', '))}` : 'todas feitas ✦') : 'cadastre as pousadas na aba RT', classe: 'rosa' })}
      ${kpi({ rot: 'Documentos', valor: vencendo.length, unidade: vencendo.length === 1 ? 'a vencer' : 'a vencer', sub: W.docs().length ? 'vencidos ou até 30 dias' : 'nada cadastrado' })}
    </div>

    <div class="grade g-2">
      ${painel({ rot: 'Recebimento', titulo: `${mesPorExtenso(estado.mes).replace(/ (\d{4})$/, ' <em>$1</em>')}`,
        corpo: `
          <div class="nav-semana" style="justify-content:flex-end;margin-bottom:8px">
            <button type="button" class="redondo" data-mes="-1" aria-label="Mês anterior">${icone.voltar(18)}</button>
            <button type="button" class="redondo" data-mes="1" aria-label="Próximo mês">${icone.seta(18)}</button>
            ${estado.mes !== isoMes() ? '<button type="button" class="link-mini" data-mes="hoje">mês atual</button>' : ''}
          </div>
          <div class="linhas">${ent.linhas.map((l) => `
            <div class="linha">
              <span class="marca-area" style="background:${l.cor}"></span>
              <span class="tx"><b>${l.nome}</b><small>${l.valor > 0 ? brl(l.valor) : 'valor não informado'}${l.recebido ? ` · recebido em ${diaMe(l.recebidoEm)}` : ''}</small></span>
              ${l.valor > 0 ? `<button type="button" class="chip ${l.recebido ? 'pos' : 'acc'}" data-recebi="${l.id}">${l.recebido ? 'recebido ✓' : 'marcar recebido'}</button>` : ''}
            </div>`).join('')}</div>
          <div class="linha" style="border-top:1px solid var(--line);margin-top:4px"><span class="tx"><b>Entrou neste mês</b><small>${ent.aReceber > 0 ? `ainda a receber ${brl(ent.aReceber)}` : 'nada pendente'}</small></span><span class="valor pos-txt">${brl(ent.recebido)}</span></div>
          <button type="button" class="link-mini" data-valores style="margin-top:8px">ajustar valores e dias</button>` })}
      ${painel({ rot: `RT · visita de ${nomeDia}`, titulo: 'Esta <em>semana</em>', ver: ['#/mais/trabalhos/rt', 'RT pousadas'],
        corpo: ps.length ? `<div class="linhas">${ps.map((p) => {
          const v = W.visitaDaSemana(p.id, hoje);
          const r = v ? W.resumoVisita(v) : null;
          return `<div class="linha">
            <span class="caixa-chk ${v ? 'ok' : ''}">${v ? icone.check(14) : ''}</span>
            <span class="tx"><b>${esc(p.nome)}</b><small>${v ? `visitada em ${diaMe(v.data)}${r.pct != null ? ` · ${r.pct}% conforme` : ''}` : `visita de ${nomeDia}, ${diaMe(W.diaDaVisita(hoje))}`}</small></span>
            ${v ? `<button type="button" class="chip" data-visita="${v.id}">ver</button>` : `<button type="button" class="chip acc" data-visitar="${p.id}">registrar</button>`}
          </div>`; }).join('')}</div>`
          : '<div class="vazio">Cadastre as pousadas na aba “RT pousadas” ✦<br><button type="button" class="btn sec" data-nova-pousada style="margin-top:10px">+ Pousada</button></div>' })}
    </div>

    ${painel({ rot: 'Atenção', titulo: 'O que pede <em>cuidado</em>',
      corpo: pend.length ? lista(pend) : '<div class="vazio">Nada pendente nos trabalhos ✦</div>' })}`;
}
const diaMe = (iso) => (iso ? diaMes(iso) : '');

/* =========================================================
   RT POUSADAS
   ========================================================= */

function chipDoc(d) {
  const s = W.statusDoc(d);
  return `<span class="chip ${s.tipo}">${s.texto}</span>`;
}

function rt() {
  const hoje = isoDia();
  const ps = W.pousadas();
  const nomeDe = (id) => ps.find((p) => p.id === id)?.nome;
  const docs = W.docs();
  const tarefas = T.todas().filter((t) => t.area === 'rt' && t.status === 'aberta')
    .sort((a, b) => (a.prazo || a.dia || '9999').localeCompare(b.prazo || b.dia || '9999'));

  const painelPousada = (p) => {
    const vs = W.visitasDe(p.id);
    const ult = vs.slice(0, 6).reverse().map((v) => ({ v, r: W.resumoVisita(v) })).filter((x) => x.r.pct != null);
    return painel({ rot: 'Pousada', titulo: esc(p.nome), ver: null,
      corpo: `
        <div class="chips" style="margin-bottom:12px">
          <button type="button" class="btn pri" data-visitar="${p.id}">${icone.soma(16)} Registrar visita</button>
          <button type="button" class="chip" data-editar-pousada="${p.id}">editar</button>
          ${W.visitaDaSemana(p.id, hoje) ? '<span class="chip pos">visita da semana feita</span>' : '<span class="chip mid">visita da semana pendente</span>'}
        </div>
        ${ult.length ? `<div class="rot" style="margin-bottom:6px">Conformidade das últimas visitas</div>
          ${G.barras(ult.map(({ v, r }, i) => ({ rotulo: diaMe(v.data), valor: r.pct, on: i === ult.length - 1, dica: `${r.pct}% conforme` })), { altura: 110 })}` : ''}
        ${vs.length ? `<div class="linhas" style="margin-top:12px">${vs.slice(0, 5).map((v) => {
          const r = W.resumoVisita(v);
          return `<div class="linha"><button type="button" class="tx" data-visita="${v.id}"><b>${diaMe(v.data)} · ${r.pct != null ? `${r.pct}% conforme` : 'sem avaliação'}</b><small>${r.nc ? `${r.nc} ${r.nc === 1 ? 'não conformidade' : 'não conformidades'}` : 'nenhuma não conformidade'}</small></button>
            ${r.nc ? `<span class="chip neg">${r.nc}</span>` : '<span class="chip pos">ok</span>'}</div>`; }).join('')}</div>`
          : '<div class="vazio" style="text-align:left">Nenhuma visita registrada ainda ✦</div>'}`, classe: '' });
  };

  return `
    <div class="chips" style="margin-bottom:14px">
      <button type="button" class="btn sec" data-nova-pousada>${icone.soma(16)} Pousada</button>
      <button type="button" class="btn sec" data-checklist>Checklist da visita</button>
      <button type="button" class="btn sec" data-valores>Valores e dia da visita</button>
    </div>
    <div class="grade g-2">${ps.length ? ps.map(painelPousada).join('') : painel({ rot: 'Pousadas', titulo: 'Suas <em>pousadas</em>', corpo: '<div class="vazio">Nenhuma pousada cadastrada. Toque em “+ Pousada” ✦</div>' })}</div>

    <div class="grade g-2">
      ${painel({ rot: 'Validade', titulo: 'Documentos',
        corpo: `${docs.length ? `<div class="linhas">${docs.map((d) => `
            <div class="linha"><button type="button" class="tx" data-doc="${d.id}"><b>${esc(d.nome)}</b><small>${esc(nomeDe(d.pousadaId) || (d.pousadaId ? 'pousada arquivada' : 'as duas / geral'))}${d.validade ? ` · vence em ${diaMe(d.validade)}/${d.validade.slice(0, 4)}` : ''}</small></button>${chipDoc(d)}</div>`).join('')}</div>`
          : '<div class="vazio">Nenhum documento cadastrado. Cadastre o que tem validade (alvará, dedetização, limpeza da caixa d’água…) para receber o aviso antes de vencer ✦</div>'}
          <button type="button" class="btn sec" data-novo-doc style="margin-top:10px">${icone.soma(16)} Documento</button>` })}
      ${painel({ rot: 'Área RT pousadas', titulo: 'Tarefas',
        corpo: `${tarefas.length ? `<div class="linhas">${tarefas.map(linhaTarefa).join('')}</div>` : '<div class="vazio">Nenhuma tarefa aberta de RT ✦</div>'}
          <button type="button" class="btn sec" data-nova-tarefa="rt" style="margin-top:10px">${icone.soma(16)} Tarefa</button>` })}
    </div>`;
}

function linhaTarefa(t) {
  const hoje = isoDia();
  const atrasada = (t.prazo && t.prazo < hoje) || (t.dia && t.dia < hoje);
  return `<div class="linha">
    <button type="button" class="caixa-chk" data-feita="${t.id}" aria-label="Concluir"></button>
    <button type="button" class="tx" data-tarefa="${t.id}"><b>${t.importante ? '<span class="imp">!</span> ' : ''}${esc(t.titulo)}</b>
      <small>${t.prazo ? `prazo ${diaMe(t.prazo)}` : t.dia ? `para ${diaMe(t.dia)}` : 'sem data'}</small></button>
    ${atrasada ? '<span class="chip neg">atrasada</span>' : ''}</div>`;
}

/* =========================================================
   BELA FLOR
   ========================================================= */

function belaflor() {
  const hoje = isoDia(), ym = isoMes();
  const l = W.entradas(ym).linhas[1];
  const tarefas = T.todas().filter((t) => t.area === 'belaflor');
  const abertas = tarefas.filter((t) => t.status === 'aberta').sort((a, b) => (a.prazo || a.dia || '9999').localeCompare(b.prazo || b.dia || '9999'));
  const feitas = tarefas.filter((t) => t.status === 'feita').sort((a, b) => (b.feitaEm || 0) - (a.feitaEm || 0)).slice(0, 3);
  const proximoPrazo = abertas.find((t) => t.prazo);
  const pecas = P.todas('bf');
  const aPostar = pecas.filter((p) => !P.postada(p));
  const postadas = pecas.filter(P.postada).sort((a, b) => (b.postadoEm || '').localeCompare(a.postadoEm || '')).slice(0, 4);
  const semana = pecas.filter((p) => p.data && p.data >= segundaDaSemana(hoje) && p.data <= somarDias(segundaDaSemana(hoje), 6));
  const relatorios = [somarMeses(ym, -1), ym];

  const linhaPeca = (p) => {
    const feita = P.postada(p);
    return `<div class="linha">
      <button type="button" class="tx" data-peca="${p.id}"><b>${esc(p.titulo)}</b><small>${P.formato(p.formato).nome}${p.data ? ` · ${diaMe(p.data)}` : ' · sem data'}${p.objetivo ? ` · ${P.OBJETIVOS.find((o) => o[0] === p.objetivo)?.[1].toLowerCase()}` : ''}</small></button>
      <span class="chip ${feita ? 'pos' : p.data && p.data < hoje ? 'neg' : 'acc'}">${P.nomeEtapa(p)}</span>
      ${feita ? '' : `<button type="button" class="chip" data-avancar="${p.id}" aria-label="Avançar etapa">avançar ${icone.seta(12)}</button>`}
    </div>`;
  };

  return `
    <div class="grade g-kpi">
      ${kpi({ rot: 'Bela Flor · mês', valor: l.valor > 0 ? curto(l.valor) : '—', sub: l.valor > 0 ? (l.recebido ? `recebido em ${diaMe(l.recebidoEm)}` : 'a receber') : '<button type="button" class="link-mini" data-valores>informar o valor</button>', classe: 'quente' })}
      ${kpi({ rot: 'Entregas e tarefas', valor: abertas.length, unidade: abertas.length === 1 ? 'aberta' : 'abertas', sub: proximoPrazo ? `próximo prazo: ${diaMe(proximoPrazo.prazo)}` : 'sem prazo marcado', classe: 'rosa' })}
      ${kpi({ rot: 'Posts da semana', valor: `${semana.filter(P.postada).length}<span style="font-size:.5em;color:var(--soft)"> / ${semana.length}</span>`, sub: semana.length ? 'postados / programados' : 'nenhum programado', classe: 'verde' })}
      ${kpi({ rot: 'Relatório enviado?', valor: doMesRel(ym) ? 'sim' : 'não', sub: mesPorExtenso(ym), classe: doMesRel(ym) ? 'verde' : '' })}
    </div>

    <div class="grade g-2">
      ${painel({ rot: 'Área Bela Flor', titulo: 'Entregas e <em>tarefas</em>',
        corpo: `${abertas.length || feitas.length ? `<div class="linhas">${abertas.map(linhaTarefa).join('')}${feitas.map((t) => `
            <div class="linha"><button type="button" class="caixa-chk ok" data-feita="${t.id}" aria-label="Reabrir">${icone.check(14)}</button><button type="button" class="tx" data-tarefa="${t.id}"><b style="text-decoration:line-through;color:var(--soft)">${esc(t.titulo)}</b></button></div>`).join('')}</div>`
          : '<div class="vazio">Nenhuma entrega ainda. Cadastre com prazo para receber o aviso ✦</div>'}
          <button type="button" class="btn sec" data-nova-tarefa="belaflor" style="margin-top:10px">${icone.soma(16)} Tarefa ou entrega</button>` })}
      ${painel({ rot: 'Calendário da conta', titulo: 'Posts da <em>Bela Flor</em>',
        corpo: `${pecas.length ? `<div class="linhas">${aPostar.map(linhaPeca).join('')}${postadas.map(linhaPeca).join('')}</div>` : '<div class="vazio">Nenhuma peça ainda. Crie o post com formato, data e etapa ✦</div>'}
          <button type="button" class="btn sec" data-nova-peca style="margin-top:10px">${icone.soma(16)} Peça</button>` })}
    </div>

    ${painel({ rot: 'Todo mês', titulo: 'Relatório <em>mensal</em>',
      corpo: `<div class="linhas">${relatorios.map((m) => {
        const em = doMesRel(m);
        return `<div class="linha"><span class="tx"><b>${mesPorExtenso(m)}</b><small>${em ? `enviado em ${diaMe(em)}` : 'ainda não enviado'}</small></span>
          <button type="button" class="chip ${em ? 'pos' : 'acc'}" data-relatorio="${m}">${em ? 'enviado ✓' : 'marcar enviado'}</button></div>`; }).join('')}</div>` })}`;
}
const doMesRel = (ym) => W.doMes(ym).bf?.relatorioEm || null;

/* =========================================================
   CLIQUES
   ========================================================= */

function ligar(el) {
  el.addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const d = b.dataset;
    if (d.mes) { estado.mes = d.mes === 'hoje' ? isoMes() : somarMeses(estado.mes, Number(d.mes)); redesenhar(); }
    else if (d.recebi) await W.alternarRecebido(estado.mes, d.recebi);
    else if (d.valores !== undefined) W.abrirValores();
    else if (d.novaPousada !== undefined) W.abrirPousada();
    else if (d.editarPousada) W.abrirPousada(W.pousadas().find((p) => p.id === d.editarPousada));
    else if (d.checklist !== undefined) W.abrirChecklist();
    else if (d.visitar) W.abrirVisita(d.visitar, null, { depois: (id) => id && W.abrirDetalheVisita(id) });
    else if (d.visita) W.abrirDetalheVisita(d.visita);
    else if (d.novoDoc !== undefined) W.abrirDoc();
    else if (d.doc) W.abrirDoc(W.docs().find((x) => x.id === d.doc));
    else if (d.novaTarefa) T.abrirTarefa(null, { area: d.novaTarefa, dia: null });
    else if (d.feita) await T.alternarFeita(T.todas().find((t) => t.id === d.feita));
    else if (d.tarefa) T.abrirTarefa(T.todas().find((t) => t.id === d.tarefa));
    else if (d.novaPeca !== undefined) P.abrirPeca(null, { conta: 'bf' });
    else if (d.peca) P.abrirPeca(P.todas('bf').find((p) => p.id === d.peca));
    else if (d.avancar) await P.avancar(P.todas('bf').find((p) => p.id === d.avancar));
    else if (d.relatorio) await W.alternarRelatorio(d.relatorio);
  });
}
