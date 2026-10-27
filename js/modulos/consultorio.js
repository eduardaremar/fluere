/* =========================================================
   Fluere · módulo Financeiro do consultório
   Regras, cálculos e formulários. A tela Dinheiro → Consultório
   e o Resumo geral usam as funções daqui.

   IMPORTANTE: nenhum valor pessoal fica escrito no código (ele
   é público no GitHub). Percentuais, aluguel, preços e custos
   são preenchidos pela Eduarda e ficam no cofre, embaralhados.

   Regras (configuração "regrasConsultorio"), guardadas por mês:
     { porMes: { 'AAAA-MM': {
         pctCampoLargo, aluguelCuritiba, pctImposto, meta,
         precos: { avulsa, tri, sem }, consultas: { tri, sem },
         custos: [{ nome, valor, tipo: 'mensal' | 'anual' }] } } }
     Cada mês usa a regra mais recente até ele: mudar a regra
     não altera os meses anteriores.

   Atendimento (coleção "atendimentos"):
     { data, paciente, local, tipo, valorTabela, valor, motivoDesconto,
       forma, recorrente, parcelas: [{ n, valor, pago, pagoEm }], nota }
     Tudo conta no MÊS DA VENDA (bruto, repasse e imposto).
     Parcelas não pagas aparecem como "a receber".

   Contas do mês (configuração "consultorio-AAAA-MM"):
     { pagos: { repasse: true, aluguel: true, imposto: true, 'custo:Contadora': true } }
   ========================================================= */

import * as dados from '../nucleo/dados.js';
import * as avisos from '../nucleo/avisos.js';
import { abrirFolha, fecharFolha, toast, confirmar } from '../nucleo/ui.js';
import { esc, brl, r2, lerValor, isoDia, isoMes, mesPorExtenso, somarMeses } from '../nucleo/util.js';

const COL = 'atendimentos';

export const LOCAIS = [
  { id: 'curitiba', nome: 'Curitiba', cor: 'var(--g1)' },
  { id: 'campolargo', nome: 'Campo Largo', cor: 'var(--g2)' },
  { id: 'online', nome: 'Online', cor: 'var(--g3)' },
];
export const TIPOS = [
  { id: 'avulsa', nome: 'Consulta avulsa', curto: 'Avulsa', cor: 'var(--g4)' },
  { id: 'tri', nome: 'Acompanhamento 3 meses', curto: '3 meses', cor: 'var(--g5)' },
  { id: 'sem', nome: 'Acompanhamento 6 meses', curto: '6 meses', cor: 'var(--g6)' },
  { id: 'outro', nome: 'Outro', curto: 'Outro', cor: 'var(--g7)' },
];
export const FORMAS = [
  { id: 'pix', nome: 'Pix' },
  { id: 'link', nome: 'Link de pagamento' },
  { id: 'dinheiro', nome: 'Dinheiro' },
  { id: 'transferencia', nome: 'Transferência' },
];
const nomeDe = (lista, id) => lista.find((x) => x.id === id)?.nome ?? id;
export const nomeLocal = (id) => nomeDe(LOCAIS, id);
export const nomeTipo = (id) => nomeDe(TIPOS, id);
export const nomeForma = (id) => nomeDe(FORMAS, id);

/** 1234.5 → "1234,50" (para preencher campos de valor) */
const numBR = (v) => (v == null || v === '' ? '' : r2(v).toFixed(2).replace('.', ','));

/* =========================================================
   REGRAS
   ========================================================= */

const regrasGuardadas = () => dados.config('regrasConsultorio')?.porMes ?? {};
export const temRegras = () => Object.keys(regrasGuardadas()).length > 0;

/** A regra que vale num mês (a mais recente definida até ele). */
export function regras(ym = isoMes()) {
  const porMes = regrasGuardadas();
  const chaves = Object.keys(porMes).filter((k) => k <= ym).sort();
  const r = chaves.length ? porMes[chaves.at(-1)] : (Object.keys(porMes).sort().map((k) => porMes[k])[0] ?? null);
  return {
    pctCampoLargo: Number(r?.pctCampoLargo) || 0,
    aluguelCuritiba: Number(r?.aluguelCuritiba) || 0,
    pctImposto: Number(r?.pctImposto) || 0,
    meta: Number(r?.meta) || 0,
    precos: { avulsa: 0, tri: 0, sem: 0, ...(r?.precos || {}) },
    consultas: { avulsa: 1, tri: 3, sem: 4, ...(r?.consultas || {}) },
    custos: Array.isArray(r?.custos) ? r.custos : [],
  };
}

const custoMensal = (c) => (c.tipo === 'anual' ? (Number(c.valor) || 0) / 12 : Number(c.valor) || 0);

/* =========================================================
   CÁLCULOS DO MÊS
   ========================================================= */

export const todos = () => dados.lista(COL);
export const doMes = (ym) => todos().filter((a) => String(a.data).slice(0, 7) === ym)
  .sort((a, b) => (b.data || '').localeCompare(a.data || '') || (b.criadoEm || 0) - (a.criadoEm || 0));

export const aReceberDe = (a) => r2((a.parcelas || []).filter((p) => !p.pago).reduce((s, p) => s + (Number(p.valor) || 0), 0));
const recebidoDe = (a) => r2((a.parcelas || []).filter((p) => p.pago).reduce((s, p) => s + (Number(p.valor) || 0), 0));

/** Tudo que o painel do mês precisa. */
export function calcular(ym) {
  const R = regras(ym);
  const L = doMes(ym);
  const soma = (lista) => r2(lista.reduce((s, a) => s + (Number(a.valor) || 0), 0));
  const bruto = soma(L);
  const porLocal = LOCAIS.map((l) => ({ ...l, rotulo: l.nome, valor: soma(L.filter((a) => a.local === l.id)), qtd: L.filter((a) => a.local === l.id).length }));
  const porTipo = TIPOS.map((t) => ({ ...t, rotulo: t.nome, valor: soma(L.filter((a) => a.tipo === t.id)), qtd: L.filter((a) => a.tipo === t.id).length }));
  const brutoCL = porLocal.find((l) => l.id === 'campolargo').valor;
  const brutoCWB = porLocal.find((l) => l.id === 'curitiba').valor;

  const repasse = r2((brutoCL * R.pctCampoLargo) / 100);
  const aluguel = r2(R.aluguelCuritiba);
  const imposto = r2((bruto * R.pctImposto) / 100);
  const custos = R.custos.map((c) => ({ ...c, mensal: r2(custoMensal(c)) }));
  const totalCustos = r2(custos.reduce((s, c) => s + c.mensal, 0));
  const liquido = r2(bruto - repasse - aluguel - imposto - totalCustos);

  // Contas do mês (para marcar como pagas)
  const pagos = dados.config(`consultorio-${ym}`)?.pagos ?? {};
  const contas = [
    { id: 'repasse', nome: `Repasse Campo Largo (${String(R.pctCampoLargo).replace('.', ',')}%)`, valor: repasse },
    { id: 'aluguel', nome: 'Aluguel Curitiba', valor: aluguel },
    { id: 'imposto', nome: `Imposto / DAS (${String(R.pctImposto).replace('.', ',')}%)`, valor: imposto },
    ...custos.map((c) => ({ id: `custo:${c.nome}`, nome: c.tipo === 'anual' ? `${c.nome} (1/12 do anual)` : c.nome, valor: c.mensal })),
  ].filter((c) => c.valor > 0).map((c) => ({ ...c, pago: !!pagos[c.id] }));

  return {
    ym, R, L, bruto, porLocal, porTipo, brutoCL, brutoCWB,
    repasse, aluguel, imposto, custos, totalCustos, liquido, contas,
    aReceber: r2(L.reduce((s, a) => s + aReceberDe(a), 0)),
    recebido: r2(L.reduce((s, a) => s + recebidoDe(a), 0)),
    atendimentos: L.length,
    metaPct: R.meta > 0 ? (bruto / R.meta) * 100 : null,
  };
}

/** Tudo que ainda não foi pago, de qualquer mês. */
export function pendentes() {
  return todos().filter((a) => aReceberDe(a) > 0).sort((a, b) => (a.data || '').localeCompare(b.data || ''));
}

export async function alternarConta(ym, id) {
  const atual = dados.config(`consultorio-${ym}`)?.pagos ?? {};
  await dados.salvaConfig(`consultorio-${ym}`, { pagos: { ...atual, [id]: !atual[id] } });
}

/** Marca a próxima parcela não paga como recebida (ou desfaz, se todas estiverem pagas). */
export async function alternarRecebido(a) {
  const parcelas = (a.parcelas || []).map((p) => ({ ...p }));
  const proxima = parcelas.find((p) => !p.pago);
  if (proxima) { proxima.pago = true; proxima.pagoEm = isoDia(); }
  else if (parcelas.length === 1) { parcelas[0].pago = false; parcelas[0].pagoEm = null; }
  else { abrirAtendimento(a); return; }
  await dados.salva(COL, { ...a, parcelas });
  toast(proxima ? (parcelas.length > 1 ? `Parcela ${proxima.n} recebida ✦` : 'Marcado como recebido ✦') : 'Marcado como a receber.');
}

/* =========================================================
   FORMULÁRIO DO ATENDIMENTO
   ========================================================= */

function escolha(raiz, sel, aoMudar) {
  const el = raiz.querySelector(sel);
  el.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-v]');
    if (!b) return;
    el.querySelectorAll('button[data-v]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    aoMudar?.(b.dataset.v);
  });
  return () => el.querySelector('[aria-pressed="true"]')?.dataset.v ?? null;
}

const botoes = (lista, atual) => lista.map((x) =>
  `<button type="button" data-v="${x.id}" aria-pressed="${x.id === atual}">${x.cor ? `<i style="background:${x.cor}"></i>` : ''}${x.nome}</button>`).join('');

/**
 * Abre a folha de atendimento (novo ou edição).
 * Se as regras ainda não foram preenchidas, abre primeiro a configuração.
 */
export function abrirAtendimento(atend = null, { data } = {}) {
  if (!temRegras() && !atend) { abrirRegras({ depois: () => abrirAtendimento(null, { data }) }); return; }
  const novo = !atend;
  const a = atend ? structuredClone(atend) : {
    data: data || isoDia(), paciente: '', local: 'curitiba', tipo: 'avulsa', forma: 'pix',
    recorrente: false, parcelas: [], motivoDesconto: '', nota: '',
  };
  const precoDe = (tipo, ym) => regras(ym).precos[tipo] || 0;
  if (novo) { a.valorTabela = precoDe(a.tipo, a.data.slice(0, 7)); a.valor = a.valorTabela; }
  const jaRecebido = novo ? true : (a.parcelas || []).every((p) => p.pago);

  const f = abrirFolha(`
    <h3>${novo ? 'Novo' : 'Editar'} <em>atendimento</em></h3>
    <form id="f-at" novalidate>
      <div class="fld"><label for="a-pac">Paciente ou descrição</label>
        <input id="a-pac" value="${esc(a.paciente)}" placeholder="Ex.: Maria S." autocomplete="off" autofocus></div>
      <div class="fld"><span class="l">Onde atendeu</span><div class="opcoes" id="a-local">${botoes(LOCAIS, a.local)}</div></div>
      <div class="fld"><span class="l">Tipo</span><div class="opcoes" id="a-tipo">${botoes(TIPOS, a.tipo)}</div></div>
      <div class="fld valor-grande"><label for="a-valor">Valor cobrado</label>
        <input id="a-valor" inputmode="decimal" value="${numBR(a.valor)}" placeholder="R$ 0,00" autocomplete="off">
        <small id="a-tabela"></small></div>
      <div class="fld" id="a-desc-box" hidden><label for="a-desc">Motivo do desconto</label>
        <input id="a-desc" value="${esc(a.motivoDesconto || '')}" placeholder="Ex.: paciente antiga, ação especial" autocomplete="off"></div>
      <div class="fld"><span class="l">Forma de pagamento</span><div class="opcoes" id="a-forma">${botoes(FORMAS, a.forma)}</div></div>
      <div class="fld"><span class="l">Como paga</span>
        <div class="opcoes" id="a-modo">
          <button type="button" data-v="avista" aria-pressed="${!a.recorrente}">Valor inteiro</button>
          <button type="button" data-v="recorrente" aria-pressed="${!!a.recorrente}">Plano recorrente (paga a cada consulta)</button>
        </div></div>
      <div id="a-parcelas"></div>
      <label class="chk" id="a-rec-box"><input type="checkbox" id="a-rec" ${jaRecebido ? 'checked' : ''}> Já recebi este valor</label>
      <div class="par">
        <div class="fld"><label for="a-data">Data</label><input id="a-data" type="date" value="${esc(a.data)}"></div>
        <div class="fld"><label for="a-nota">Anotação</label><input id="a-nota" value="${esc(a.nota || '')}" autocomplete="off"></div>
      </div>
      <div class="previa" id="a-previa" aria-live="polite"></div>
      <div class="erro" id="a-erro" role="alert"></div>
      ${novo ? '' : '<div class="opcoes acoes-tarefa"><button type="button" data-acao="apagar" class="perigo">Apagar atendimento</button></div>'}
      <div class="acts"><button type="button" class="btn sec" data-fechar>Cancelar</button><button type="submit" class="btn pri">Salvar</button></div>
    </form>`);

  const $ = (s) => f.querySelector(s);
  let parcelas = (a.parcelas || []).map((p) => ({ ...p }));

  const valorAtual = () => { const v = lerValor($('#a-valor').value); return Number.isFinite(v) ? r2(v) : 0; };
  const lerLocal = escolha(f, '#a-local', () => atualizar());
  const lerTipo = escolha(f, '#a-tipo', (tipo) => {
    const preco = precoDe(tipo, ($('#a-data').value || a.data).slice(0, 7));
    a.valorTabela = preco;
    if (preco) $('#a-valor').value = numBR(preco);
    if ($('#a-modo [aria-pressed="true"]')?.dataset.v === 'recorrente') parcelas = [];
    atualizar();
  });
  const lerForma = escolha(f, '#a-forma');
  const lerModo = escolha(f, '#a-modo', () => { parcelas = []; atualizar(); });

  /** Monta a lista de parcelas do plano recorrente (uma por consulta). */
  function desenharParcelas() {
    const box = $('#a-parcelas');
    if (lerModo() !== 'recorrente') { box.innerHTML = ''; return; }
    const R = regras(($('#a-data').value || a.data).slice(0, 7));
    const qtdPadrao = R.consultas[lerTipo()] || 3;
    if (!parcelas.length) {
      const total = valorAtual();
      const base = r2(Math.floor((total / qtdPadrao) * 100) / 100);
      parcelas = Array.from({ length: qtdPadrao }, (_, i) => ({ n: i + 1, valor: i === qtdPadrao - 1 ? r2(total - base * (qtdPadrao - 1)) : base, pago: false, pagoEm: null }));
    }
    box.innerHTML = `
      <div class="fld"><span class="l">Parcelas (uma por consulta) · toque para marcar como recebida</span>
        <div class="parcelas">${parcelas.map((p, i) => `
          <button type="button" data-p="${i}" aria-pressed="${p.pago}"><b>${p.n}ª</b><span>${brl(p.valor)}</span><small>${p.pago ? 'recebida' : 'a receber'}</small></button>`).join('')}</div>
      </div>`;
    box.querySelectorAll('[data-p]').forEach((b) => b.addEventListener('click', () => {
      const p = parcelas[b.dataset.p];
      p.pago = !p.pago; p.pagoEm = p.pago ? isoDia() : null;
      desenharParcelas(); atualizar(false);
    }));
  }

  function atualizar(refazerParcelas = true) {
    if (refazerParcelas) desenharParcelas();
    const v = valorAtual();
    const tabela = Number(a.valorTabela) || 0;
    const desconto = tabela > 0 && v > 0 && v < tabela ? r2(tabela - v) : 0;
    $('#a-tabela').textContent = tabela ? (desconto ? `Tabela: ${brl(tabela)} · desconto de ${brl(desconto)}` : `Valor de tabela: ${brl(tabela)}`) : 'Sem preço de tabela para este tipo.';
    $('#a-desc-box').hidden = !desconto;
    $('#a-rec-box').hidden = lerModo() === 'recorrente';
    const R = regras(($('#a-data').value || a.data).slice(0, 7));
    const repasse = lerLocal() === 'campolargo' ? (v * R.pctCampoLargo) / 100 : 0;
    const imposto = (v * R.pctImposto) / 100;
    $('#a-previa').innerHTML = v > 0
      ? `Fica com você <strong>${brl(v - repasse - imposto)}</strong>${repasse ? ` · Campo Largo ${brl(repasse)}` : ''}${imposto ? ` · imposto ${brl(imposto)}` : ''}.<br><small>O aluguel e os custos fixos são descontados no total do mês.</small>`
      : 'Digite o valor para ver quanto fica com você.';
  }

  $('#a-valor').addEventListener('input', () => { if (lerModo() === 'recorrente') parcelas = []; atualizar(); });
  $('#a-data').addEventListener('change', () => atualizar(false));
  $('[data-fechar]').onclick = fecharFolha;
  atualizar();

  $('#f-at').onsubmit = async (ev) => {
    ev.preventDefault();
    const valor = valorAtual();
    if (!(valor > 0)) { $('#a-erro').textContent = 'Digite o valor cobrado.'; $('#a-valor').focus(); return; }
    const recorrente = lerModo() === 'recorrente';
    let ps;
    if (recorrente) {
      const soma = r2(parcelas.reduce((s, p) => s + p.valor, 0));
      ps = parcelas.map((p, i) => (i === parcelas.length - 1 ? { ...p, valor: r2(p.valor + valor - soma) } : p));
    } else {
      const rec = $('#a-rec').checked;
      const antes = (a.parcelas || [])[0];
      ps = [{ n: 1, valor, pago: rec, pagoEm: rec ? (antes?.pagoEm || isoDia()) : null }];
    }
    const tabela = Number(a.valorTabela) || 0;
    await dados.salva(COL, {
      ...a,
      paciente: $('#a-pac').value.trim(),
      local: lerLocal(), tipo: lerTipo(), forma: lerForma(), recorrente,
      valorTabela: tabela, valor,
      motivoDesconto: tabela && valor < tabela ? $('#a-desc').value.trim() : '',
      data: $('#a-data').value || isoDia(), nota: $('#a-nota').value.trim(), parcelas: ps,
    });
    fecharFolha();
    toast(novo ? 'Atendimento lançado ✦' : 'Atendimento salvo.');
  };

  f.querySelector('[data-acao="apagar"]')?.addEventListener('click', async () => {
    fecharFolha();
    if (await confirmar({ titulo: 'Apagar atendimento?', texto: `${esc(a.paciente || nomeTipo(a.tipo))} · ${brl(a.valor)}`, ok: 'Apagar', perigo: true })) {
      await dados.apaga(COL, a.id);
      toast('Atendimento apagado.');
    }
  });
}

/* =========================================================
   FORMULÁRIO DAS REGRAS
   ========================================================= */

const CUSTOS_SUGERIDOS = [
  { nome: 'Contadora', valor: '', tipo: 'mensal' },
  { nome: 'Anuidade do CRN', valor: '', tipo: 'anual' },
  { nome: 'Sistemas e apps', valor: '', tipo: 'mensal' },
];

/**
 * Regras do consultório. Valem a partir do mês indicado (padrão: mês atual).
 * `depois`: o que fazer após salvar (ex.: abrir o formulário de atendimento).
 */
export function abrirRegras({ ym = isoMes(), depois } = {}) {
  const primeira = !temRegras();
  const R = regras(ym);
  const custos = R.custos.length ? R.custos : (primeira ? CUSTOS_SUGERIDOS : []);
  const campo = (id, rotulo, valor, sufixo, ajuda = '') => `
    <div class="fld"><label for="${id}">${rotulo}</label>
      <div class="com-sufixo"><input id="${id}" inputmode="decimal" value="${valor ? numBR(valor).replace(/,00$/, '') : ''}" autocomplete="off"><span>${sufixo}</span></div>
      ${ajuda ? `<small>${ajuda}</small>` : ''}</div>`;
  const linhaCusto = (c, i) => `
    <div class="custo" data-i="${i}">
      <input class="c-nome" value="${esc(c.nome)}" placeholder="Nome" aria-label="Nome do custo">
      <input class="c-valor" inputmode="decimal" value="${numBR(c.valor)}" placeholder="R$" aria-label="Valor">
      <select class="c-tipo" aria-label="Frequência"><option value="mensal" ${c.tipo !== 'anual' ? 'selected' : ''}>por mês</option><option value="anual" ${c.tipo === 'anual' ? 'selected' : ''}>por ano</option></select>
      <button type="button" class="c-tirar" aria-label="Remover">×</button>
    </div>`;

  const f = abrirFolha(`
    <h3>${primeira ? 'Vamos configurar o seu <em>consultório</em>' : 'Regras do <em>consultório</em>'}</h3>
    <p class="sub">${primeira ? 'Preencha uma vez. Tudo fica guardado embaralhado no seu cofre e você pode mudar quando quiser.' : `As mudanças valem a partir de <b>${mesPorExtenso(ym)}</b>; os meses anteriores continuam com a regra antiga.`}</p>
    <form id="f-regras" novalidate>
      <div class="rot acc">Clínicas</div>
      <div class="par">
        ${campo('r-cl', 'Campo Largo fica com', R.pctCampoLargo, '%', 'de cada atendimento')}
        ${campo('r-cwb', 'Aluguel de Curitiba', R.aluguelCuritiba, 'R$/mês', 'cobrado todo mês')}
      </div>
      <div class="rot acc">Imposto e meta</div>
      <div class="par">
        ${campo('r-imp', 'Imposto (DAS)', R.pctImposto, '%', 'sobre o valor dos atendimentos')}
        ${campo('r-meta', 'Meta de faturamento', R.meta, 'R$/mês', 'opcional')}
      </div>
      <div class="rot acc">Preços de tabela</div>
      <div class="par par3">
        ${campo('r-avulsa', 'Consulta avulsa', R.precos.avulsa, 'R$')}
        ${campo('r-tri', 'Acompanhamento 3 meses', R.precos.tri, 'R$')}
        ${campo('r-sem', 'Acompanhamento 6 meses', R.precos.sem, 'R$')}
      </div>
      <div class="par">
        ${campo('r-ctri', 'Consultas no de 3 meses', R.consultas.tri, 'consultas')}
        ${campo('r-csem', 'Consultas no de 6 meses', R.consultas.sem, 'consultas')}
      </div>
      <div class="rot acc">Custos fixos do consultório</div>
      <div id="r-custos">${custos.map(linhaCusto).join('')}</div>
      <button type="button" class="link-mini" id="r-mais">+ adicionar custo</button>
      <div class="erro" id="r-erro" role="alert"></div>
      <div class="acts" style="margin-top:14px"><button type="button" class="btn sec" data-fechar>${primeira ? 'Depois' : 'Cancelar'}</button><button type="submit" class="btn pri">Salvar</button></div>
    </form>`);

  const $ = (s) => f.querySelector(s);
  $('[data-fechar]').onclick = fecharFolha;
  $('#r-mais').onclick = () => $('#r-custos').insertAdjacentHTML('beforeend', linhaCusto({ nome: '', valor: '', tipo: 'mensal' }, Date.now()));
  $('#r-custos').addEventListener('click', (e) => { if (e.target.closest('.c-tirar')) e.target.closest('.custo').remove(); });

  $('#f-regras').onsubmit = async (ev) => {
    ev.preventDefault();
    const num = (id) => { const v = lerValor($(id).value); return Number.isFinite(v) ? r2(v) : 0; };
    const nova = {
      pctCampoLargo: num('#r-cl'), aluguelCuritiba: num('#r-cwb'), pctImposto: num('#r-imp'), meta: num('#r-meta'),
      precos: { avulsa: num('#r-avulsa'), tri: num('#r-tri'), sem: num('#r-sem') },
      consultas: { tri: num('#r-ctri') || 3, sem: num('#r-csem') || 4 },
      custos: [...f.querySelectorAll('.custo')].map((c) => ({
        nome: c.querySelector('.c-nome').value.trim(),
        valor: (() => { const v = lerValor(c.querySelector('.c-valor').value); return Number.isFinite(v) ? r2(v) : 0; })(),
        tipo: c.querySelector('.c-tipo').value,
      })).filter((c) => c.nome),
    };
    if (nova.pctCampoLargo > 100 || nova.pctImposto > 100) { $('#r-erro').textContent = 'Os percentuais precisam ficar entre 0 e 100.'; return; }
    const porMes = { ...regrasGuardadas(), [ym]: nova };
    await dados.salvaConfig('regrasConsultorio', { porMes });
    fecharFolha();
    toast('Regras salvas ✦');
    if (depois) setTimeout(depois, 300);
  };
}

/* =========================================================
   AVISOS PARA O PAINEL HOJE
   ========================================================= */

avisos.registrar('consultorio', () => {
  const lista = [];
  if (!temRegras()) {
    lista.push({ id: 'regras', tipo: 'mid', prioridade: 2, irPara: '#/dinheiro/consultorio', texto: 'Configure as regras do consultório (percentual, aluguel, imposto e preços) para o financeiro começar a calcular.' });
    return lista;
  }
  const pend = pendentes();
  if (pend.length) {
    const total = r2(pend.reduce((s, a) => s + aReceberDe(a), 0));
    lista.push({ id: 'a-receber', tipo: 'warn', prioridade: 4, irPara: '#/dinheiro/consultorio', texto: `<strong>${brl(total)}</strong> a receber de ${pend.length} ${pend.length === 1 ? 'atendimento' : 'atendimentos'}.` });
  }
  // Contas do mês anterior ainda não marcadas como pagas
  const ant = calcular(somarMeses(isoMes(), -1));
  const abertas = ant.atendimentos ? ant.contas.filter((c) => !c.pago) : [];
  if (abertas.length) lista.push({ id: 'contas-ant', tipo: 'mid', prioridade: 3, irPara: '#/dinheiro/consultorio', texto: `Contas de ${mesPorExtenso(ant.ym).toLowerCase()} ainda não marcadas como pagas: ${abertas.map((c) => c.nome.replace(/ \(.*\)/, '')).join(', ')}.` });
  return lista;
});
