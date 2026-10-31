/* =========================================================
   Fluere · módulo Trabalhos paralelos
   Dois trabalhos fora do consultório:
   - RT de pousadas: visita semanal com checklist (RDC 216),
     documentos com validade e recebimento mensal;
   - marketing da Bela Flor: tarefas e entregas, posts e
     relatório mensal, mais o recebimento mensal.
   Nenhum dos dois passa pelo CNPJ, então não têm imposto aqui.

   IMPORTANTE: nenhum valor pessoal fica escrito no código (ele é
   público no GitHub). Os valores mensais e os dias de recebimento
   são preenchidos por ela e ficam no cofre, embaralhados.

   Configuração "trabalhos":
     { rt: { valor, dia }, bf: { valor, dia }, diaVisita, desde: 'AAAA-MM' }
     "desde" = mês em que os valores foram informados pela primeira vez: os avisos
     de recebimento e de relatório só valem a partir dele.
     "dia" = dia do mês em que o pagamento costuma chegar;
     "diaVisita" = dia da semana da visita às pousadas (5 = sexta).
   Mês (configuração "trabalhos-AAAA-MM"):
     { rt: { recebidoEm, valor }, bf: { recebidoEm, valor, relatorioEm } }
   Coleções: pousadas { nome, nota, arquivada },
     visitas { pousadaId, data, itens: [{ id, grupo, texto }], respostas: { id: { s: 'c'|'nc'|'na', obs } }, nota },
     docsrt { nome, pousadaId, validade, nota }.
   Tarefas dos dois trabalhos usam as áreas "RT pousadas" e "Bela Flor" do módulo Tarefas.
   ========================================================= */

import * as dados from '../nucleo/dados.js';
import * as avisos from '../nucleo/avisos.js';
import { abrirFolha, fecharFolha, toast, confirmar } from '../nucleo/ui.js';
import { esc, brl, r2, lerValor, isoDia, isoMes, deIso, diaMes, somarDias, somarMeses, segundaDaSemana, mesPorExtenso } from '../nucleo/util.js';

export const TRABALHOS = [
  { id: 'rt', nome: 'RT pousadas', cor: 'var(--g5)' },
  { id: 'bf', nome: 'Bela Flor', cor: 'var(--g3)' },
];
export const nomeTrabalho = (id) => TRABALHOS.find((t) => t.id === id)?.nome ?? id;
const numBR = (v) => (v == null || v === '' || Number(v) === 0 ? '' : r2(v).toFixed(2).replace('.', ','));
const DIAS_SEMANA = [[1, 'seg'], [2, 'ter'], [3, 'qua'], [4, 'qui'], [5, 'sex'], [6, 'sáb']];
const NOME_DIA = { 0: 'domingo', 1: 'segunda', 2: 'terça', 3: 'quarta', 4: 'quinta', 5: 'sexta', 6: 'sábado' };

/* =========================================================
   CONFIGURAÇÃO E RECEBIMENTO DO MÊS
   ========================================================= */

export function config() {
  const c = dados.config('trabalhos') ?? {};
  return {
    rt: { valor: 0, dia: 5, ...(c.rt || {}) },
    bf: { valor: 0, dia: 5, ...(c.bf || {}) },
    diaVisita: c.diaVisita ?? 5,
    desde: c.desde || '',
  };
}
export const configurado = () => { const c = config(); return c.rt.valor > 0 || c.bf.valor > 0; };

export const doMes = (ym) => dados.config(`trabalhos-${ym}`) ?? {};

/** Quanto cada trabalho rende no mês: o valor combinado, e se já foi recebido. */
export function entradas(ym) {
  const c = config(), m = doMes(ym);
  const linhas = TRABALHOS.map((t) => {
    const recebidoEm = m[t.id]?.recebidoEm || null;
    // o valor combinado vale para todos os meses, a menos que você tenha informado outro para aquele mês
    const proprio = Number(m[t.id]?.valor);
    const valor = r2(proprio > 0 ? proprio : c[t.id].valor);
    return { ...t, valor, recebido: !!recebidoEm, recebidoEm, dia: c[t.id].dia };
  });
  const soma = (l) => r2(l.reduce((s, x) => s + x.valor, 0));
  return { linhas, esperado: soma(linhas), recebido: soma(linhas.filter((x) => x.recebido)), aReceber: soma(linhas.filter((x) => !x.recebido)) };
}

/** Folha para marcar o recebimento do mês: o valor pode ser diferente do combinado (ex.: valor antigo). */
export function abrirRecebimento(ym, id) {
  const t = TRABALHOS.find((x) => x.id === id);
  const e = entradas(ym).linhas.find((l) => l.id === id);
  const f = abrirFolha(`
    <h3>${esc(t.nome)} · ${esc(mesPorExtenso(ym))}</h3>
    <p class="sub">${e.recebido ? 'Já marcado como recebido. Corrija o valor ou desfaça.' : 'Confirme quanto você recebeu neste mês. Se o valor foi diferente do combinado, é só trocar.'}</p>
    <form id="f-receb" novalidate>
      <div class="fld valor-grande"><label for="rc-valor">Valor deste mês</label>
        <input id="rc-valor" inputmode="decimal" value="${numBR(e.valor)}" placeholder="R$ 0,00" autocomplete="off" autofocus>
        <small>Só vale para ${esc(mesPorExtenso(ym))}. O valor dos outros meses continua o combinado${config()[id].valor ? ` (${brl(config()[id].valor)})` : ''}.</small></div>
      <label class="chk"><input type="checkbox" id="rc-ok" checked> Já recebi</label>
      <div class="erro" id="rc-erro" role="alert"></div>
      <div class="acts"><button type="button" class="btn sec" data-fechar>Cancelar</button><button type="submit" class="btn pri">Salvar</button></div>
    </form>`);
  f.querySelector('[data-fechar]').onclick = fecharFolha;
  f.querySelector('#f-receb').onsubmit = async (ev) => {
    ev.preventDefault();
    const v = lerValor(f.querySelector('#rc-valor').value);
    if (!Number.isFinite(v) || v <= 0) { f.querySelector('#rc-erro').textContent = 'Digite o valor recebido.'; return; }
    const recebeu = f.querySelector('#rc-ok').checked;
    const atual = doMes(ym);
    await dados.salvaConfig(`trabalhos-${ym}`, { ...atual, [id]: { ...atual[id], valor: r2(v), recebidoEm: recebeu ? (atual[id]?.recebidoEm || isoDia()) : null } });
    fecharFolha();
    toast(recebeu ? 'Recebimento salvo ✦' : 'Valor do mês salvo.');
  };
}

export async function alternarRecebido(ym, id) {
  const atual = doMes(ym);
  const novo = atual[id]?.recebidoEm
    ? { ...atual[id], recebidoEm: null }
    : { ...atual[id], recebidoEm: isoDia(), valor: config()[id].valor };
  await dados.salvaConfig(`trabalhos-${ym}`, { ...atual, [id]: novo });
  toast(novo.recebidoEm ? 'Recebimento marcado ✦' : 'Marcado como a receber.');
}

export async function alternarRelatorio(ym) {
  const atual = doMes(ym);
  const enviado = !atual.bf?.relatorioEm;
  await dados.salvaConfig(`trabalhos-${ym}`, { ...atual, bf: { ...atual.bf, relatorioEm: enviado ? isoDia() : null } });
  toast(enviado ? 'Relatório marcado como enviado ✦' : 'Relatório marcado como pendente.');
}

export function abrirValores() {
  const c = config();
  const campo = (id, rotulo, valor, ajuda) => `
    <div class="fld"><label for="${id}">${rotulo}</label>
      <input id="${id}" inputmode="decimal" value="${numBR(valor)}" placeholder="R$ 0,00" autocomplete="off">${ajuda ? `<small>${ajuda}</small>` : ''}</div>`;
  const dia = (id, valor) => `<div class="fld"><label for="${id}">Costuma cair no dia</label><input id="${id}" type="number" min="1" max="31" inputmode="numeric" value="${esc(valor)}"></div>`;
  const f = abrirFolha(`
    <h3>Valores dos <em>trabalhos</em></h3>
    <p class="sub">Ficam só no seu cofre, embaralhados. Nenhum trabalho passa pelo CNPJ, então não há imposto.</p>
    <form id="f-valores" novalidate>
      <div class="par">${campo('v-rt', 'RT pousadas (por mês, as duas juntas)', c.rt.valor)}${dia('v-rt-dia', c.rt.dia)}</div>
      <div class="par">${campo('v-bf', 'Bela Flor (por mês)', c.bf.valor)}${dia('v-bf-dia', c.bf.dia)}</div>
      <div class="fld"><span class="l">Dia da visita às pousadas</span>
        <div class="opcoes" id="v-visita">${DIAS_SEMANA.map(([v, n]) => `<button type="button" data-v="${v}" aria-pressed="${v === c.diaVisita}">${n}</button>`).join('')}</div>
        <small>Uma visita por semana em cada pousada. Se passar do dia sem visita, aparece um aviso.</small></div>
      <div class="acts"><button type="button" class="btn sec" data-fechar>Cancelar</button><button type="submit" class="btn pri">Salvar</button></div>
    </form>`);
  const $ = (s) => f.querySelector(s);
  $('#v-visita').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-v]');
    if (b) $('#v-visita').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  });
  $('[data-fechar]').onclick = fecharFolha;
  $('#f-valores').onsubmit = async (ev) => {
    ev.preventDefault();
    const n = (sel) => { const v = lerValor($(sel).value); return Number.isFinite(v) && v > 0 ? r2(v) : 0; };
    const d = (sel, padrao) => Math.min(31, Math.max(1, Math.round(Number($(sel).value) || padrao)));
    await dados.salvaConfig('trabalhos', {
      rt: { valor: n('#v-rt'), dia: d('#v-rt-dia', 5) }, bf: { valor: n('#v-bf'), dia: d('#v-bf-dia', 5) },
      diaVisita: Number($('#v-visita [aria-pressed="true"]')?.dataset.v ?? 5),
      desde: c.desde || isoMes(),
    });
    fecharFolha();
    toast('Valores salvos.');
  };
}

/* =========================================================
   POUSADAS E VISITAS
   ========================================================= */

export const pousadas = () => dados.lista('pousadas').filter((p) => !p.arquivada)
  .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

export function abrirPousada(p = null) {
  const nova = !p;
  const a = p ? { ...p } : { nome: '', nota: '' };
  const f = abrirFolha(`
    <h3>${nova ? 'Nova' : 'Editar'} <em>pousada</em></h3>
    <form id="f-pousada" novalidate>
      <div class="fld"><label for="po-nome">Nome da pousada</label><input id="po-nome" value="${esc(a.nome)}" autocomplete="off" autofocus></div>
      <div class="fld"><label for="po-nota">Anotação (opcional)</label><input id="po-nota" value="${esc(a.nota || '')}" placeholder="Contato, horário da visita…" autocomplete="off"></div>
      <div class="erro" id="po-erro" role="alert"></div>
      ${nova ? '' : '<div class="opcoes acoes-tarefa"><button type="button" data-acao="arquivar">Arquivar pousada</button></div>'}
      <div class="acts"><button type="button" class="btn sec" data-fechar>Cancelar</button><button type="submit" class="btn pri">Salvar</button></div>
    </form>`);
  f.querySelector('[data-fechar]').onclick = fecharFolha;
  f.querySelector('#f-pousada').onsubmit = async (ev) => {
    ev.preventDefault();
    const nome = f.querySelector('#po-nome').value.trim();
    if (!nome) { f.querySelector('#po-erro').textContent = 'Digite o nome da pousada.'; return; }
    await dados.salva('pousadas', { ...a, nome, nota: f.querySelector('#po-nota').value.trim() });
    fecharFolha();
    toast(nova ? 'Pousada cadastrada ✦' : 'Pousada salva.');
  };
  f.querySelector('[data-acao="arquivar"]')?.addEventListener('click', async () => {
    await dados.salva('pousadas', { ...a, arquivada: true });
    fecharFolha();
    toast('Pousada arquivada. O histórico de visitas continua guardado.');
  });
}

export const visitasDe = (id) => dados.lista('visitas').filter((v) => v.pousadaId === id)
  .sort((a, b) => (b.data || '').localeCompare(a.data || '') || (b.criadoEm || 0) - (a.criadoEm || 0));

/** A visita feita na semana (segunda a domingo) do dia dado, se houver. */
export function visitaDaSemana(id, ref = isoDia()) {
  const seg = segundaDaSemana(ref), dom = somarDias(seg, 6);
  return visitasDe(id).find((v) => v.data >= seg && v.data <= dom) ?? null;
}

/** Dia da visita na semana do dia dado (ex.: a sexta desta semana). */
export const diaDaVisita = (ref = isoDia()) => somarDias(segundaDaSemana(ref), (config().diaVisita + 6) % 7);

export function resumoVisita(v) {
  const r = Object.values(v.respostas || {});
  const c = r.filter((x) => x.s === 'c').length, nc = r.filter((x) => x.s === 'nc').length, na = r.filter((x) => x.s === 'na').length;
  return { c, nc, na, avaliados: c + nc, pct: c + nc ? Math.round((c / (c + nc)) * 100) : null, total: (v.itens || []).length };
}

/* ---------- checklist (base inspirada na RDC 216/2004; editável) ---------- */

const BASE = [
  ['Edificação e instalações', ['Piso, paredes e teto íntegros e limpos, sem mofo ou infiltração', 'Ralos sifonados e com tampa', 'Iluminação e ventilação adequadas, luminárias protegidas', 'Pia exclusiva para as mãos, com sabonete, papel toalha e lixeira com pedal', 'Banheiros e vestiários limpos e separados da área de manipulação']],
  ['Higienização e pragas', ['Equipamentos, móveis e utensílios limpos e em bom estado', 'Produtos de limpeza identificados e guardados longe dos alimentos', 'Controle de pragas em dia (comprovante de dedetização válido)', 'Reservatório de água higienizado (comprovante válido)']],
  ['Manipuladores', ['Uniforme completo e limpo, cabelos protegidos, sem adornos', 'Lavagem correta das mãos e higiene pessoal', 'Exames de saúde em dia', 'Treinamento dos manipuladores registrado']],
  ['Recebimento e armazenamento', ['Recebimento conferido (validade, temperatura, embalagem íntegra)', 'Estoque seco afastado do piso e da parede, organizado', 'Alimentos identificados com data de preparo e validade', 'Nenhum produto vencido ou sem identificação']],
  ['Temperaturas', ['Refrigerados até 5 °C e congelados a -18 °C ou menos, com registro', 'Alimentos quentes mantidos a 60 °C ou mais', 'Descongelamento feito sob refrigeração']],
  ['Preparo', ['Alimentos crus e cozidos separados (sem contaminação cruzada)', 'Frutas e verduras higienizadas corretamente', 'Óleo de fritura em boas condições, com registro de troca']],
  ['Documentação e resíduos', ['Manual de Boas Práticas e POPs disponíveis e atualizados', 'Planilhas de registro preenchidas (temperatura, limpeza)', 'Lixeiras com tampa, resíduos retirados com frequência']],
];
export const CHECKLIST_BASE = BASE.flatMap(([grupo, textos], g) => textos.map((texto, i) => ({ id: `b${g}${i}`, grupo, texto })));

/** O checklist em uso: o dela (se já editou) ou a base. */
export const checklist = () => dados.config('checklistRT')?.itens ?? CHECKLIST_BASE;

export function abrirChecklist(depois) {
  let itens = checklist().map((i) => ({ ...i }));
  const grupos = () => [...new Set(itens.map((i) => i.grupo))];
  const f = abrirFolha(`
    <h3>Checklist da <em>visita</em></h3>
    <p class="sub">Base inspirada na RDC 216/2004. Ajuste ao que você cobra em cada pousada: o que você tirar ou acrescentar vale para as próximas visitas. Visitas antigas guardam o checklist da época.</p>
    <div id="cl-lista"></div>
    <div class="fld" style="margin-top:12px"><span class="l">Acrescentar item</span>
      <input id="cl-grupo" list="cl-grupos" placeholder="Grupo (ex.: Preparo)" autocomplete="off">
      <datalist id="cl-grupos"></datalist>
      <input id="cl-texto" placeholder="Texto do item" autocomplete="off" style="margin-top:8px">
      <button type="button" class="btn sec" data-add style="margin-top:8px">${'+'} Acrescentar</button></div>
    <div class="opcoes acoes-tarefa"><button type="button" data-acao="base">Voltar à lista original</button></div>
    <div class="acts"><button type="button" class="btn sec" data-fechar>Cancelar</button><button type="button" class="btn pri" data-salvar>Salvar checklist</button></div>`);
  const $ = (s) => f.querySelector(s);
  const pintar = () => {
    $('#cl-grupos').innerHTML = grupos().map((g) => `<option value="${esc(g)}">`).join('');
    $('#cl-lista').innerHTML = grupos().map((g) => `
      <div class="chk-grupo">${esc(g)}</div>
      ${itens.filter((i) => i.grupo === g).map((i) => `
        <div class="cl-linha"><span>${esc(i.texto)}</span><button type="button" class="link-mini" data-rm="${i.id}">tirar</button></div>`).join('')}`).join('') || '<div class="vazio">Checklist vazio.</div>';
  };
  pintar();
  $('#cl-lista').addEventListener('click', (e) => {
    const b = e.target.closest('[data-rm]');
    if (b) { itens = itens.filter((i) => i.id !== b.dataset.rm); pintar(); }
  });
  $('[data-add]').onclick = () => {
    const grupo = $('#cl-grupo').value.trim() || 'Outros', texto = $('#cl-texto').value.trim();
    if (!texto) { $('#cl-texto').focus(); return; }
    itens.push({ id: `c${Date.now().toString(36)}${itens.length}`, grupo, texto });
    $('#cl-texto').value = '';
    pintar();
  };
  f.querySelector('[data-acao="base"]').onclick = () => { itens = CHECKLIST_BASE.map((i) => ({ ...i })); pintar(); };
  $('[data-fechar]').onclick = () => (depois ? depois() : fecharFolha());
  $('[data-salvar]').onclick = async () => {
    await dados.salvaConfig('checklistRT', { itens });
    toast('Checklist salvo ✦');
    depois ? depois() : fecharFolha();
  };
}

/* ---------- registrar e ver visitas ---------- */

export function abrirVisita(pousadaId, visita = null, { depois } = {}) {
  const pousada = dados.pega('pousadas', pousadaId);
  if (!pousada) return;
  const nova = !visita;
  const v = visita ? structuredClone(visita) : { pousadaId, data: isoDia(), itens: checklist().map((i) => ({ ...i })), respostas: {}, nota: '' };
  const grupos = [...new Set(v.itens.map((i) => i.grupo))];

  const f = abrirFolha(`
    <h3>${nova ? 'Visita à' : 'Visita à'} <em>${esc(pousada.nome)}</em></h3>
    <form id="f-visita" novalidate>
      <div class="par">
        <div class="fld"><label for="vi-data">Data</label><input id="vi-data" type="date" value="${esc(v.data)}"></div>
        <div class="fld"><span class="l">Atalho</span><button type="button" class="btn sec" data-tudo style="min-height:48px">Tudo conforme</button></div>
      </div>
      <p class="sub" id="vi-cont"></p>
      ${grupos.map((g) => `
        <div class="chk-grupo">${esc(g)}</div>
        ${v.itens.filter((i) => i.grupo === g).map((i) => `
          <div class="chk-item" data-id="${i.id}">
            <div class="chk-txt">${esc(i.texto)}</div>
            <div class="opcoes tri">
              <button type="button" data-v="c" aria-pressed="${v.respostas[i.id]?.s === 'c'}">Conforme</button>
              <button type="button" data-v="nc" aria-pressed="${v.respostas[i.id]?.s === 'nc'}">Não conforme</button>
              <button type="button" data-v="na" aria-pressed="${v.respostas[i.id]?.s === 'na'}">N/A</button>
            </div>
            <input class="chk-obs" placeholder="O que foi visto e o que combinar" value="${esc(v.respostas[i.id]?.obs || '')}" autocomplete="off" ${v.respostas[i.id]?.s === 'nc' ? '' : 'hidden'}>
          </div>`).join('')}`).join('')}
      <div class="fld" style="margin-top:14px"><label for="vi-nota">Anotação geral (opcional)</label><textarea id="vi-nota" rows="2">${esc(v.nota || '')}</textarea></div>
      ${nova ? '' : '<div class="opcoes acoes-tarefa"><button type="button" data-acao="apagar" class="perigo">Apagar visita</button></div>'}
      <div class="acts"><button type="button" class="btn sec" data-fechar>Cancelar</button><button type="submit" class="btn pri">Salvar visita</button></div>
    </form>`);
  const $ = (s) => f.querySelector(s);
  const contar = () => {
    const n = f.querySelectorAll('.chk-item [aria-pressed="true"]').length;
    const nc = f.querySelectorAll('.chk-item [data-v="nc"][aria-pressed="true"]').length;
    $('#vi-cont').textContent = `${n} de ${v.itens.length} itens avaliados${nc ? ` · ${nc} não conforme${nc > 1 ? 's' : ''}` : ''}`;
  };
  f.querySelectorAll('.chk-item').forEach((it) => it.querySelector('.opcoes').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-v]');
    if (!b) return;
    const ligado = b.getAttribute('aria-pressed') === 'true';
    it.querySelectorAll('.opcoes button').forEach((x) => x.setAttribute('aria-pressed', String(x === b && !ligado)));
    it.querySelector('.chk-obs').hidden = !(b.dataset.v === 'nc' && !ligado);
    contar();
  }));
  $('[data-tudo]').onclick = () => {
    f.querySelectorAll('.chk-item').forEach((it) => {
      if (it.querySelector('[aria-pressed="true"]')) return; // só preenche o que ainda está em branco
      it.querySelector('[data-v="c"]').setAttribute('aria-pressed', 'true');
    });
    contar();
  };
  contar();
  $('[data-fechar]').onclick = () => (depois ? depois() : fecharFolha());

  $('#f-visita').onsubmit = async (ev) => {
    ev.preventDefault();
    const respostas = {};
    f.querySelectorAll('.chk-item').forEach((it) => {
      const s = it.querySelector('[aria-pressed="true"]')?.dataset.v;
      if (s) respostas[it.dataset.id] = { s, ...(s === 'nc' && it.querySelector('.chk-obs').value.trim() ? { obs: it.querySelector('.chk-obs').value.trim() } : {}) };
    });
    const salva = await dados.salva('visitas', { ...v, data: $('#vi-data').value || isoDia(), respostas, nota: $('#vi-nota').value.trim() });
    const r = resumoVisita(salva);
    toast(`Visita salva ✦ ${r.pct != null ? `${r.pct}% conforme` : 'sem itens avaliados'}.`);
    fecharFolha();
    if (depois) setTimeout(() => depois(salva.id), 280);
  };
  f.querySelector('[data-acao="apagar"]')?.addEventListener('click', async () => {
    fecharFolha();
    if (await confirmar({ titulo: 'Apagar visita?', texto: `${esc(pousada.nome)} · ${diaMes(v.data)}`, ok: 'Apagar', perigo: true })) { await dados.apaga('visitas', v.id); toast('Visita apagada.'); }
  });
}

/** Resumo de uma visita já feita, com as não conformidades. */
export function abrirDetalheVisita(id) {
  const v = dados.pega('visitas', id);
  if (!v) return;
  const pousada = dados.pega('pousadas', v.pousadaId);
  const r = resumoVisita(v);
  const ncs = v.itens.filter((i) => v.respostas[i.id]?.s === 'nc');
  const f = abrirFolha(`
    <h3>${esc(pousada?.nome ?? 'Visita')} · <em>${diaMes(v.data)}</em></h3>
    <div class="chips" style="margin-bottom:12px">
      <span class="chip ${r.pct != null && r.pct >= 90 ? 'pos' : r.pct != null && r.pct >= 70 ? 'mid' : 'neg'}">${r.pct != null ? `${r.pct}% conforme` : 'sem avaliação'}</span>
      <span class="chip">${r.c} conformes</span><span class="chip ${r.nc ? 'neg' : ''}">${r.nc} ${r.nc === 1 ? 'não conforme' : 'não conformes'}</span><span class="chip">${r.na} N/A</span>
      ${r.avaliados + r.na < r.total ? `<span class="chip mid">${r.total - r.avaliados - r.na} sem avaliar</span>` : ''}
    </div>
    ${ncs.length ? `<div class="rot" style="margin-bottom:6px">Não conformidades</div>
      <div class="linhas quebra">${ncs.map((i) => `<div class="linha"><span class="tx"><b>${esc(i.texto)}</b>${v.respostas[i.id].obs ? `<small>${esc(v.respostas[i.id].obs)}</small>` : `<small>${esc(i.grupo)}</small>`}</span></div>`).join('')}</div>`
      : '<div class="vazio" style="text-align:left">Nenhuma não conformidade nesta visita ✦</div>'}
    ${v.nota ? `<p class="sub" style="margin-top:12px">${esc(v.nota)}</p>` : ''}
    <div class="acts" style="margin-top:14px"><button type="button" class="btn sec" data-fechar>Fechar</button><button type="button" class="btn pri" data-editar>Editar</button></div>`);
  f.querySelector('[data-fechar]').onclick = fecharFolha;
  f.querySelector('[data-editar]').onclick = () => abrirVisita(v.pousadaId, v, { depois: () => abrirDetalheVisita(id) });
}

/* =========================================================
   DOCUMENTOS COM VALIDADE (RT)
   ========================================================= */

export const docs = () => dados.lista('docsrt').sort((a, b) => (a.validade || '9999').localeCompare(b.validade || '9999'));

export function statusDoc(d, hoje = isoDia()) {
  if (!d.validade) return { tipo: '', texto: 'sem validade', dias: null };
  const dias = Math.round((deIso(d.validade) - deIso(hoje)) / 86400000);
  if (dias < 0) return { tipo: 'neg', texto: `venceu há ${-dias} ${dias === -1 ? 'dia' : 'dias'}`, dias };
  if (dias === 0) return { tipo: 'neg', texto: 'vence hoje', dias };
  if (dias <= 30) return { tipo: 'mid', texto: `vence em ${dias} ${dias === 1 ? 'dia' : 'dias'}`, dias };
  return { tipo: 'pos', texto: `válido até ${diaMes(d.validade)}/${d.validade.slice(0, 4)}`, dias };
}

const SUGESTOES_DOC = ['Alvará sanitário', 'Licença de funcionamento', 'Comprovante de dedetização', 'Limpeza do reservatório de água', 'Análise de potabilidade da água', 'Manual de Boas Práticas', 'Exames de saúde dos manipuladores', 'Treinamento dos manipuladores'];

export function abrirDoc(d = null) {
  const nova = !d;
  const a = d ? { ...d } : { nome: '', pousadaId: '', validade: '', nota: '' };
  const ps = pousadas();
  const f = abrirFolha(`
    <h3>${nova ? 'Novo' : 'Editar'} <em>documento</em></h3>
    <form id="f-doc" novalidate>
      <div class="fld"><label for="dc-nome">Documento</label>
        <input id="dc-nome" list="dc-sug" value="${esc(a.nome)}" placeholder="Ex.: alvará sanitário" autocomplete="off" autofocus>
        <datalist id="dc-sug">${SUGESTOES_DOC.map((s) => `<option value="${esc(s)}">`).join('')}</datalist></div>
      ${ps.length ? `<div class="fld"><span class="l">Pousada</span>
        <div class="opcoes" id="dc-pousada"><button type="button" data-v="" aria-pressed="${!a.pousadaId}">As duas / geral</button>${ps.map((p) => `<button type="button" data-v="${p.id}" aria-pressed="${p.id === a.pousadaId}">${esc(p.nome)}</button>`).join('')}</div></div>` : ''}
      <div class="fld"><label for="dc-val">Vence em</label><input id="dc-val" type="date" value="${esc(a.validade || '')}"></div>
      <div class="fld"><label for="dc-nota">Anotação (opcional)</label><input id="dc-nota" value="${esc(a.nota || '')}" autocomplete="off"></div>
      <div class="erro" id="dc-erro" role="alert"></div>
      ${nova ? '' : '<div class="opcoes acoes-tarefa"><button type="button" data-acao="apagar" class="perigo">Apagar documento</button></div>'}
      <div class="acts"><button type="button" class="btn sec" data-fechar>Cancelar</button><button type="submit" class="btn pri">Salvar</button></div>
    </form>`);
  const $ = (s) => f.querySelector(s);
  $('#dc-pousada')?.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-v]');
    if (b) $('#dc-pousada').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  });
  $('[data-fechar]').onclick = fecharFolha;
  $('#f-doc').onsubmit = async (ev) => {
    ev.preventDefault();
    const nome = $('#dc-nome').value.trim();
    if (!nome) { $('#dc-erro').textContent = 'Digite o nome do documento.'; return; }
    await dados.salva('docsrt', { ...a, nome, pousadaId: $('#dc-pousada [aria-pressed="true"]')?.dataset.v ?? '', validade: $('#dc-val').value, nota: $('#dc-nota').value.trim() });
    fecharFolha();
    toast(nova ? 'Documento cadastrado ✦' : 'Documento salvo.');
  };
  f.querySelector('[data-acao="apagar"]')?.addEventListener('click', async () => {
    fecharFolha();
    if (await confirmar({ titulo: 'Apagar documento?', texto: esc(a.nome), ok: 'Apagar', perigo: true })) { await dados.apaga('docsrt', a.id); toast('Documento apagado.'); }
  });
}

/* =========================================================
   AVISOS
   ========================================================= */

avisos.registrar('trabalhos', () => {
  const hoje = isoDia(), ym = isoMes(), dia = Number(hoje.slice(8)), c = config();
  const out = [];
  const ir = (rota) => `#/mais/trabalhos/${rota}`;

  // Visita semanal a cada pousada
  const alvo = diaDaVisita(hoje);
  for (const p of pousadas()) {
    if (visitaDaSemana(p.id, hoje)) continue;
    if (hoje === alvo) out.push({ id: `visita-${p.id}`, tipo: 'info', prioridade: 5, irPara: ir('rt'), texto: `Hoje é dia de visita à pousada <strong>${esc(p.nome)}</strong>.` });
    else if (hoje > alvo) out.push({ id: `visita-${p.id}`, tipo: 'warn', prioridade: 6, irPara: ir('rt'), texto: `A visita desta semana à pousada <strong>${esc(p.nome)}</strong> ainda não foi registrada.` });
  }

  // Documentos com validade
  for (const d of docs()) {
    const s = statusDoc(d, hoje);
    if (s.dias == null || s.dias > 30) continue;
    out.push({ id: `doc-${d.id}`, tipo: 'warn', prioridade: s.dias < 0 ? 7 : 5, irPara: ir('rt'), texto: `Documento <strong>${esc(d.nome)}</strong>: ${s.texto}.` });
  }

  // Recebimento do mês (e do mês anterior, se ficou pendente)
  for (const [mes, atrasado] of [[ym, false], [somarMeses(ym, -1), true]]) {
    if (!c.desde || mes < c.desde) continue;
    const e = entradas(mes);
    for (const l of e.linhas) {
      if (l.valor <= 0 || l.recebido) continue;
      if (atrasado || dia >= l.dia) out.push({ id: `receb-${l.id}-${mes}`, tipo: 'warn', prioridade: atrasado ? 6 : 4, irPara: ir(''), texto: `Receber <strong>${brl(l.valor)}</strong> de ${l.nome} (${mesPorExtenso(mes)}).` });
    }
  }

  // Relatório mensal da Bela Flor
  const anterior = somarMeses(ym, -1);
  if (c.bf.valor > 0 && c.desde) {
    if (dia <= 10 && anterior >= c.desde && !doMes(anterior).bf?.relatorioEm) out.push({ id: `relat-${anterior}`, tipo: 'warn', prioridade: 5, irPara: ir('belaflor'), texto: `O relatório da Bela Flor de ${mesPorExtenso(anterior)} ainda não foi enviado.` });
    else if (dia >= 25 && !doMes(ym).bf?.relatorioEm) out.push({ id: `relat-${ym}`, tipo: 'info', prioridade: 3, irPara: ir('belaflor'), texto: `O mês está acabando: prepare o relatório da Bela Flor de ${mesPorExtenso(ym)}.` });
  }
  return out;
});

export { NOME_DIA };
