/* =========================================================
   Fluere · Dinheiro
   Três partes: Consultório · Gastos · Resumo geral.
   Endereços: #/dinheiro/consultorio, #/dinheiro/gastos, #/dinheiro/resumo
   Consultório funciona de verdade (módulo financeiro).
   Gastos chega na próxima etapa; o Resumo já usa o líquido real.
   ========================================================= */

import * as G from '../nucleo/graficos.js';
import { cabecalho, painel, kpi, abas, icone, areaLimpa } from '../nucleo/ui.js';
import { brl, esc, normal, isoMes, mesPorExtenso, somarMeses, diaPorExtenso, deIso } from '../nucleo/util.js';
import * as C from '../modulos/consultorio.js';

const PARTES = [
  { rota: 'consultorio', nome: 'Consultório', desenhar: consultorio, ligar: ligarConsultorio },
  { rota: 'gastos', nome: 'Gastos', desenhar: gastos },
  { rota: 'resumo', nome: 'Resumo geral', desenhar: resumo },
];

/* O que a tela lembra enquanto você navega */
const estado = { mes: isoMes(), filtro: 'tudo', busca: '' };
let ultimo = null;

export function desenhar(el, partes = ultimo?.partes ?? []) {
  el = areaLimpa(el);
  ultimo = { el, partes };
  const atual = PARTES.find((p) => p.rota === partes[0]) || PARTES[0];
  el.innerHTML = `
    ${cabecalho({ sup: 'Finanças', titulo: mesPorExtenso(estado.mes).replace(/ (\d{4})$/, ' <em>$1</em>') })}
    <div class="nav-mes">
      ${abas('dinheiro', PARTES, atual.rota)}
      <div class="nav-semana">
        <button class="redondo" data-mes="-1" aria-label="Mês anterior">${icone.voltar(18)}</button>
        <button class="redondo" data-mes="1" aria-label="Próximo mês">${icone.seta(18)}</button>
        ${estado.mes !== isoMes() ? '<button class="link-mini" data-mes="hoje">mês atual</button>' : ''}
      </div>
    </div>
    ${atual.desenhar()}`;
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-mes]');
    if (!b) return;
    estado.mes = b.dataset.mes === 'hoje' ? isoMes() : somarMeses(estado.mes, Number(b.dataset.mes));
    redesenhar();
  });
  atual.ligar?.(el);
}
const redesenhar = () => ultimo && desenhar(ultimo.el, ultimo.partes);

const pct = (v, total) => (total > 0 ? Math.round((v / total) * 100) : 0);
const curto = (v) => (Math.abs(v) >= 100000 ? `R$ ${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil` : brl(v).replace(/,00$/, ''));
/** Para o meio das roscas, onde cabe pouco: 4450 → "R$ 4,5 mil" */
const mini = (v) => (Math.abs(v) >= 1000 ? `R$ ${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil` : brl(v).replace(',00', ''));

/* =========================================================
   CONSULTÓRIO
   ========================================================= */

function consultorio() {
  if (!C.temRegras()) {
    return `
      <section class="hero">
        <div>
          <div class="ola">Primeiro passo ✦</div>
          <h1>Vamos configurar o seu <em>consultório</em>.</h1>
          <p>Percentual de Campo Largo, aluguel de Curitiba, imposto, preços e custos fixos. Leva 2 minutos e fica guardado no seu cofre.</p>
        </div>
        <div class="acts"><button class="btn pri" data-regras>${icone.ajustes(18)} Configurar agora</button></div>
      </section>`;
  }

  const c = C.calcular(estado.mes);
  const ant = C.calcular(somarMeses(estado.mes, -1));
  const descontos = [
    { rotulo: 'Fica com você', valor: Math.max(0, c.liquido), cor: 'var(--g4)' },
    { rotulo: 'Campo Largo', valor: c.repasse, cor: 'var(--g2)' },
    { rotulo: 'Aluguel Curitiba', valor: c.aluguel, cor: 'var(--g3)' },
    { rotulo: 'Imposto', valor: c.imposto, cor: 'var(--g6)' },
    { rotulo: 'Custos fixos', valor: c.totalCustos, cor: 'var(--g5)' },
  ];

  /* Leituras do mês (alertas e comparações) */
  const leituras = [];
  if (c.aluguel > 0) {
    const sobra = c.brutoCWB - c.aluguel;
    leituras.push(sobra >= 0
      ? `<li class="alert ok"><span class="d"></span><div>Curitiba já cobriu o aluguel de <strong>${brl(c.aluguel)}</strong> e sobraram <strong>${brl(sobra)}</strong>.</div></li>`
      : `<li class="alert warn"><span class="d"></span><div>Faltam <strong>${brl(-sobra)}</strong> de atendimentos em Curitiba para cobrir o aluguel de <strong>${brl(c.aluguel)}</strong>.</div></li>`);
  }
  if (c.brutoCL > 0) leituras.push(`<li class="alert"><span class="d"></span><div>Em Campo Largo, <strong>${brl(c.repasse)}</strong> vão para a clínica e <strong>${brl(c.brutoCL - c.repasse)}</strong> ficam com você (antes do imposto).</div></li>`);
  if (c.aReceber > 0) leituras.push(`<li><button class="alert warn" data-filtro="receber"><span class="d"></span><div><strong>${brl(c.aReceber)}</strong> ainda a receber deste mês. Toque para ver.</div></button></li>`);
  if (c.bruto > 0) leituras.push(`<li class="alert"><span class="d"></span><div>De cada R$ 100 que você fatura, <strong>${brl((c.liquido / c.bruto) * 100)}</strong> ficam com você.</div></li>`);
  if (ant.bruto > 0 && c.bruto > 0) {
    const v = Math.round(((c.bruto - ant.bruto) / ant.bruto) * 100);
    leituras.push(`<li class="alert ${v >= 0 ? 'ok' : 'mid'}"><span class="d"></span><div>O bruto ${v >= 0 ? 'subiu' : 'caiu'} <strong>${Math.abs(v)}%</strong> em relação a ${mesPorExtenso(ant.ym).split(' ')[0].toLowerCase()} (${brl(ant.bruto)}).</div></li>`);
  }

  return `
    <div class="grade g-kpi">
      ${kpi({ rot: 'Ganho bruto', valor: curto(c.bruto), sub: `${c.atendimentos} ${c.atendimentos === 1 ? 'atendimento' : 'atendimentos'}`, classe: 'quente' })}
      ${kpi({ rot: 'Ganho líquido', valor: curto(c.liquido), sub: c.bruto ? `fica com você ${pct(c.liquido, c.bruto)}%` : 'depois de repasse, aluguel, imposto e custos', classe: 'verde' })}
      ${kpi({ rot: 'A receber', valor: curto(c.aReceber), sub: c.aReceber ? 'deste mês' : 'tudo recebido ✦' })}
      ${kpi({ rot: 'Meta do mês', valor: c.metaPct == null ? '—' : `${Math.round(c.metaPct)}%`, sub: c.R.meta ? `de ${brl(c.R.meta)}` : '<button class="link-mini" data-regras>definir meta</button>', extra: c.metaPct == null ? '' : G.trilho(c.metaPct, c.metaPct >= 100 ? 'var(--g4)' : 'var(--g1)'), classe: 'rosa' })}
    </div>

    <div class="grade g-21">
      ${painel({ rot: 'Para onde vai cada real', titulo: 'Do bruto ao <em>líquido</em>',
        corpo: `
          ${c.bruto ? G.pilha(descontos) : G.pilha([])}
          <div class="linhas">
            <div class="linha"><span class="tx"><b>Ganho bruto</b><small>${c.atendimentos} atendimentos no mês</small></span><span class="num">${brl(c.bruto)}</span></div>
            ${c.repasse ? `<div class="linha"><span class="tx"><small><i class="pt" style="background:var(--g2)"></i>Repasse Campo Largo (${String(c.R.pctCampoLargo).replace('.', ',')}%)</small></span><span class="num menos">− ${brl(c.repasse)}</span></div>` : ''}
            ${c.aluguel ? `<div class="linha"><span class="tx"><small><i class="pt" style="background:var(--g3)"></i>Aluguel Curitiba</small></span><span class="num menos">− ${brl(c.aluguel)}</span></div>` : ''}
            ${c.imposto ? `<div class="linha"><span class="tx"><small><i class="pt" style="background:var(--g6)"></i>Imposto / DAS (${String(c.R.pctImposto).replace('.', ',')}%)</small></span><span class="num menos">− ${brl(c.imposto)}</span></div>` : ''}
            ${c.totalCustos ? `<div class="linha"><span class="tx"><small><i class="pt" style="background:var(--g5)"></i>Custos fixos (${c.custos.filter((x) => x.mensal).map((x) => esc(x.nome)).join(', ')})</small></span><span class="num menos">− ${brl(c.totalCustos)}</span></div>` : ''}
            <div class="linha"><span class="tx"><b>Ganho líquido</b></span><span class="valor ${c.liquido >= 0 ? 'pos-txt' : 'neg-txt'}">${brl(c.liquido)}</span></div>
          </div>` })}

      ${painel({ rot: 'Leituras do mês', titulo: 'Alertas',
        corpo: leituras.length ? `<ul class="alerts">${leituras.join('')}</ul>` : '<div class="vazio">Lance os atendimentos do mês e as leituras aparecem aqui ✦</div>' })}
    </div>

    <div class="grade g-2">
      ${painel({ rot: 'De onde veio', titulo: 'Por <em>local</em>',
        corpo: `<div class="rosca-bloco">${G.rosca(c.porLocal.filter((x) => x.valor), { centro: mini(c.bruto), sub: 'bruto' })}
          <div class="legenda">${c.porLocal.map((l) => `<div><i style="background:${l.cor}"></i><span>${l.nome} · ${l.qtd}</span><span class="p">${pct(l.valor, c.bruto)}%</span></div>`).join('')}</div></div>` })}
      ${painel({ rot: 'De onde veio', titulo: 'Por <em>tipo</em>',
        corpo: `<div class="rosca-bloco">${G.rosca(c.porTipo.filter((x) => x.valor), { centro: String(c.atendimentos), sub: 'atendimentos' })}
          <div class="legenda">${c.porTipo.filter((t) => t.id !== 'outro' || t.qtd).map((t) => `<div><i style="background:${t.cor}"></i><span>${t.curto} · ${t.qtd}</span><span class="p">${pct(t.valor, c.bruto)}%</span></div>`).join('')}</div></div>` })}
    </div>

    <div class="grade g-12">
      ${painel({ rot: 'Contas do mês', titulo: 'O que <em>pagar</em>',
        corpo: c.contas.length
          ? `<div class="linhas quebra">${c.contas.map((x) => `
              <div class="linha">
                <button class="caixa-chk ${x.pago ? 'ok' : ''}" data-conta="${esc(x.id)}" aria-label="${x.pago ? 'Marcar como não pago' : 'Marcar como pago'}: ${esc(x.nome)}">${x.pago ? icone.check(14) : ''}</button>
                <span class="tx"><b style="${x.pago ? 'color:var(--soft)' : ''}">${esc(x.nome)}</b><small>${x.pago ? 'pago ✦' : 'a pagar'}</small></span>
                <span class="num">${brl(x.valor)}</span>
              </div>`).join('')}</div>
            <button class="link-mini" data-regras style="align-self:flex-start">ajustar regras e custos</button>`
          : '<div class="vazio">Sem contas neste mês.</div>' })}
      ${painel({ rot: 'Extrato', titulo: 'Atendimentos do <em>mês</em>', corpo: extrato(c) })}
    </div>`;
}

function extrato(c) {
  const filtros = [['tudo', 'Tudo'], ['curitiba', 'Curitiba'], ['campolargo', 'Campo Largo'], ['online', 'Online'], ['receber', 'A receber']];
  const q = normal(estado.busca.trim());
  const lista = c.L.filter((a) => {
    if (['curitiba', 'campolargo', 'online'].includes(estado.filtro) && a.local !== estado.filtro) return false;
    if (estado.filtro === 'receber' && !(C.aReceberDe(a) > 0)) return false;
    if (q && !normal(`${a.paciente} ${C.nomeTipo(a.tipo)} ${C.nomeLocal(a.local)} ${C.nomeForma(a.forma)} ${a.nota || ''}`).includes(q)) return false;
    return true;
  });
  const grupos = [];
  for (const a of lista) {
    if (!grupos.length || grupos.at(-1).data !== a.data) grupos.push({ data: a.data, itens: [] });
    grupos.at(-1).itens.push(a);
  }
  return `
    <input class="busca" type="search" id="busca-ext" placeholder="Buscar paciente, tipo ou forma de pagamento" value="${esc(estado.busca)}" autocomplete="off">
    <div class="filtros">${filtros.map(([v, n]) => `<button class="chip ${estado.filtro === v ? 'acc' : ''}" data-filtro="${v}">${n}</button>`).join('')}
      <span style="flex:1"></span><button class="btn pri" data-novo-at>${icone.soma(16)} Atendimento</button></div>
    ${lista.length ? grupos.map((g) => `
      <div class="dia-ext">${diaPorExtenso(deIso(g.data))}</div>
      <div class="linhas">${g.itens.map((a) => {
        const falta = C.aReceberDe(a), total = (a.parcelas || []).length, pagas = (a.parcelas || []).filter((p) => p.pago).length;
        const estadoTxt = falta > 0 ? (total > 1 ? `${pagas}/${total} pagas` : 'a receber') : 'recebido';
        return `
        <div class="linha">
          <span class="marca-area" style="background:${C.LOCAIS.find((l) => l.id === a.local)?.cor}"></span>
          <button class="tx" data-editar-at="${a.id}" style="text-align:left"><b>${esc(a.paciente || C.nomeTipo(a.tipo))}</b>
            <small>${C.nomeTipo(a.tipo)} · ${C.nomeLocal(a.local)} · ${C.nomeForma(a.forma)}${a.motivoDesconto ? ` · desconto: ${esc(a.motivoDesconto)}` : ''}</small></button>
          <span class="chips" style="flex-direction:column;align-items:flex-end;gap:4px"><span class="num" style="font-weight:600">${brl(a.valor)}</span>
            <button class="chip ${falta > 0 ? 'neg' : 'pos'}" data-receber="${a.id}">${estadoTxt}</button></span>
        </div>`;
      }).join('')}</div>`).join('')
      : `<div class="vazio">${c.L.length ? 'Nada com esse filtro.' : 'Nenhum atendimento lançado neste mês. Toque em “+ Atendimento” ✦'}</div>`}`;
}

function ligarConsultorio(el) {
  const acha = (id) => C.todos().find((a) => a.id === id);
  el.addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.regras !== undefined) C.abrirRegras({ ym: estado.mes });
    else if (b.dataset.novoAt !== undefined) C.abrirAtendimento(null, { data: estado.mes === isoMes() ? undefined : `${estado.mes}-01` });
    else if (b.dataset.editarAt) C.abrirAtendimento(acha(b.dataset.editarAt));
    else if (b.dataset.receber) await C.alternarRecebido(acha(b.dataset.receber));
    else if (b.dataset.conta) await C.alternarConta(estado.mes, b.dataset.conta);
    else if (b.dataset.filtro) { estado.filtro = b.dataset.filtro; redesenhar(); }
  });
  const busca = el.querySelector('#busca-ext');
  busca?.addEventListener('input', () => {
    estado.busca = busca.value;
    const pos = busca.selectionStart;
    redesenhar();
    const nova = ultimo.el.querySelector('#busca-ext');
    nova.focus(); nova.setSelectionRange(pos, pos);
  });
}

/* =========================================================
   GASTOS (próxima etapa)
   ========================================================= */
function gastos() {
  return `
    <div class="grade g-kpi">
      ${kpi({ rot: 'Gasto no mês', valor: brl(0), sub: 'limite ainda não definido', extra: G.trilho(0, 'var(--g3)') })}
      ${kpi({ rot: 'CPF', valor: brl(0), sub: 'pessoal', classe: 'rosa' })}
      ${kpi({ rot: 'CNPJ', valor: brl(0), sub: 'consultório', classe: 'quente' })}
      ${kpi({ rot: 'Para revisar', valor: 0, unidade: 'gastos', sub: 'CPF ou CNPJ?' })}
    </div>
    <div class="grade g-12">
      ${painel({ rot: 'Para onde foi', titulo: 'Por categoria',
        corpo: `<div class="rosca-bloco">${G.rosca([], { centro: 'R$ 0', sub: 'gastos do mês' })}<div class="legenda">${['Casa', 'Mercado', 'Restaurante', 'Transporte', 'Beleza', 'Outros'].map((c, i) => `<div><i style="background:${G.CORES[(i + 1) % G.CORES.length]}"></i><span>${c}</span><span class="p">0%</span></div>`).join('')}</div></div>` })}
      ${painel({ rot: 'Faturas', titulo: 'Cartões e contas fixas',
        corpo: '<div class="vazio">Seus 2 cartões, as contas fixas e os parcelados aparecem aqui no próximo módulo.</div>' })}
    </div>`;
}

/* =========================================================
   RESUMO GERAL (entrou · saiu · sobrou)
   Entrou = líquido do consultório (+ trabalhos paralelos, numa próxima etapa).
   Saiu   = gastos (próxima etapa).
   ========================================================= */
function resumo() {
  const c = C.calcular(estado.mes);
  const entrou = Math.max(0, c.liquido), saiu = 0, sobrou = entrou - saiu;
  const meses = Array.from({ length: 6 }, (_, i) => somarMeses(estado.mes, i - 5));
  const barras = meses.map((m) => {
    const x = C.calcular(m);
    return { rotulo: mesPorExtenso(m).slice(0, 3).toLowerCase(), valor: Math.max(0, x.liquido), on: m === estado.mes, dica: brl(x.liquido) };
  });
  return `
    <div class="grade g-3">
      ${kpi({ rot: 'Entrou', valor: brl(entrou), sub: 'líquido do consultório' })}
      ${kpi({ rot: 'Saiu', valor: brl(saiu), sub: 'os gastos entram no próximo módulo' })}
      ${kpi({ rot: 'Sobrou', valor: brl(sobrou), sub: 'meta de sobra: no próximo módulo', classe: 'verde' })}
    </div>
    <div class="grade g-2">
      ${painel({ rot: 'De onde entrou', titulo: 'Entradas',
        corpo: `<div class="rosca-bloco">${G.rosca(entrou ? [{ rotulo: 'Consultório', valor: entrou, cor: 'var(--g1)' }] : [], { centro: mini(entrou), sub: 'entrou' })}
          <div class="legenda"><div><i style="background:var(--g1)"></i><span>Consultório (líquido)</span><span class="p">${entrou ? 100 : 0}%</span></div>
          <div><i style="background:var(--g3)"></i><span>Marketing Bela Flor</span><span class="p">—</span></div>
          <div><i style="background:var(--g5)"></i><span>RT pousadas</span><span class="p">—</span></div></div></div>
          <small style="color:var(--soft)">Bela Flor e RT entram quando o módulo de trabalhos ficar pronto.</small>` })}
      ${painel({ rot: 'Quanto sobrou por mês', titulo: 'Últimos 6 meses', corpo: G.barras(barras, { altura: 150 }) })}
    </div>`;
}
