/* =========================================================
   Fluere · Dinheiro
   Três partes: Consultório · Gastos · Resumo geral.
   Endereços: #/dinheiro/consultorio, #/dinheiro/gastos, #/dinheiro/resumo
   Consultório funciona de verdade (módulo financeiro).
   Gastos chega na próxima etapa; o Resumo já usa o líquido real.
   ========================================================= */

import * as G from '../nucleo/graficos.js';
import { cabecalho, painel, kpi, abas, icone, areaLimpa } from '../nucleo/ui.js';
import { brl, r2, esc, normal, isoMes, mesPorExtenso, somarMeses, diaPorExtenso, deIso } from '../nucleo/util.js';
import * as C from '../modulos/consultorio.js';
import * as S from '../modulos/gastos.js';
import * as W from '../modulos/trabalhos.js';

const PARTES = [
  { rota: 'consultorio', nome: 'Consultório', desenhar: consultorio, ligar: ligarConsultorio },
  { rota: 'gastos', nome: 'Gastos', desenhar: gastos, ligar: ligarGastos },
  { rota: 'resumo', nome: 'Resumo geral', desenhar: resumo, ligar: (el) => el.addEventListener('click', (e) => { if (e.target.closest('[data-cfg-g]')) S.abrirConfigGastos(); }) },
];

/* O que a tela lembra enquanto você navega */
const estado = { mes: isoMes(), filtro: 'tudo', busca: '', filtroG: 'tudo', buscaG: '' };
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
const curto = (v) => (Math.abs(v) >= 100000 ? `R$ ${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil` : Math.abs(v) >= 1000 ? brl(Math.round(v)).replace(/,00$/, '') : brl(v).replace(/,00$/, ''));
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
   GASTOS (CPF e CNPJ)
   ========================================================= */
const FILTROS_GASTO = [['tudo', 'Tudo'], ['CNPJ', 'CNPJ'], ['CPF', 'CPF'], ['rev', 'Revisar']];

function gastos() {
  const s = S.calcular(estado.mes);
  const cfg = S.config();
  const q = normal(estado.buscaG.trim());
  const lista = s.L.filter((g) => {
    if (estado.filtroG === 'CNPJ' && g.conta !== 'CNPJ') return false;
    if (estado.filtroG === 'CPF' && g.conta !== 'CPF') return false;
    if (estado.filtroG === 'rev' && !g.revisar) return false;
    if (q && !normal(`${g.desc} ${g.cat} ${g.conta} ${S.nomeMeio(g.meio)}`).includes(q)) return false;
    return true;
  });
  const grupos = [];
  for (const g of lista) { if (!grupos.length || grupos.at(-1).data !== g.data) grupos.push({ data: g.data, itens: [] }); grupos.at(-1).itens.push(g); }
  const pagos = S.fixasPagas(estado.mes);
  const cores = s.categorias.map((c, i) => ({ ...c, cor: G.CORES[i % G.CORES.length] }));
  const dicas = S.dicas(estado.mes);

  return `
    <div class="grade g-kpi">
      ${kpi({ rot: 'Gasto no mês', valor: curto(s.total), sub: s.limite ? `limite de ${brl(s.limite)}` : '<button class="link-mini" data-cfg-g>definir limite</button>', extra: s.pctLimite == null ? '' : G.trilho(s.pctLimite, s.pctLimite >= 100 ? 'var(--neg-forte)' : s.pctLimite >= 80 ? 'var(--g3)' : 'var(--g4)'), classe: 'quente' })}
      ${kpi({ rot: 'CPF', valor: curto(s.cpf), sub: `${pct(s.cpf, s.total)}% do total`, classe: 'rosa' })}
      ${kpi({ rot: 'CNPJ', valor: curto(s.cnpj), sub: s.custosConsultorio ? `+ ${brl(s.custosConsultorio)} de custos já no líquido do consultório` : `${pct(s.cnpj, s.total)}% do total` })}
      ${kpi({ rot: 'Para revisar', valor: s.revisar, unidade: s.revisar === 1 ? 'gasto' : 'gastos', sub: s.revisar ? '<button class="link-mini" data-filtro-g="rev">ver agora</button>' : 'CPF ou CNPJ?' })}
    </div>

    <div class="grade g-12">
      ${painel({ rot: 'Para onde foi', titulo: 'Por <em>categoria</em>',
        corpo: `<div class="rosca-bloco">${G.rosca(cores, { centro: mini(s.total), sub: 'gastos do mês' })}
          <div class="legenda">${cores.length ? cores.slice(0, 7).map((c) => `<div><i style="background:${c.cor}"></i><span>${esc(c.rotulo)}</span><span class="p">${pct(c.valor, s.total)}%</span></div>`).join('') : '<div class="vazio" style="padding:0;text-align:left">Sem gastos neste mês.</div>'}</div></div>` })}
      ${painel({ rot: 'Faturas e contas fixas', titulo: 'O que <em>pagar</em>',
        corpo: `
          ${s.porMeio.length ? `<div class="linhas">${s.porMeio.map((m) => `<div class="linha"><span class="tx"><b>${esc(m.nome)}</b><small>${m.qtd} ${m.qtd === 1 ? 'lançamento' : 'lançamentos'}</small></span><span class="num">${brl(m.valor)}</span></div>`).join('')}</div>` : ''}
          ${s.F.length ? `<div class="rot">Contas fixas · ${s.fixasPagasN} de ${s.F.length} pagas</div>
            <div class="linhas quebra">${s.F.map((f) => `<div class="linha">
              <button class="caixa-chk ${pagos[f.id] ? 'ok' : ''}" data-fixa-paga="${f.id}" aria-label="Marcar ${esc(f.nome)}">${pagos[f.id] ? icone.check(14) : ''}</button>
              <button class="tx" data-fixa="${f.id}" style="text-align:left"><b style="${pagos[f.id] ? 'color:var(--soft)' : ''}">${esc(f.nome)}</b><small>vence dia ${f.dia} · ${f.conta}</small></button>
              <span class="num">${brl(f.valor)}</span></div>`).join('')}</div>` : '<div class="vazio" style="padding:8px 0">Aluguel, luz, internet, academia… cadastre uma vez e elas entram todo mês.</div>'}
          ${s.futuros ? `<div class="dica"><span>Já comprometido nos próximos meses (parcelas): <b>${brl(s.futuros)}</b></span></div>` : ''}
          <div class="acts"><button class="btn contorno" data-nova-fixa>${icone.soma(16)} Conta fixa</button><button class="btn contorno" data-cfg-g>${icone.ajustes(16)} Ajustes</button></div>` })}
    </div>

    ${dicas.map((t) => `<div class="dica"><span>${t}</span></div>`).join('')}

    ${painel({ rot: 'Extrato', titulo: 'Lançamentos do <em>mês</em>',
      corpo: `
        <input class="busca" type="search" id="busca-g" placeholder="Buscar por descrição, categoria ou cartão" value="${esc(estado.buscaG)}" autocomplete="off">
        <div class="filtros">${FILTROS_GASTO.map(([v, n]) => `<button class="chip ${estado.filtroG === v ? 'acc' : ''}" data-filtro-g="${v}">${n}${v === 'rev' && s.revisar ? ` · ${s.revisar}` : ''}</button>`).join('')}
          <span style="flex:1"></span><button class="btn contorno" data-importar>Importar fatura</button><button class="btn pri" data-novo-g>${icone.soma(16)} Gasto</button></div>
        ${lista.length ? grupos.map((gr) => `
          <div class="dia-ext">${diaPorExtenso(deIso(gr.data))}</div>
          <div class="linhas">${gr.itens.map((g) => `
            <div class="linha">
              <button class="tx" data-editar-g="${g.id}" style="text-align:left"><b>${esc(g.desc)}</b>
                <small>${esc(g.cat)} · ${esc(S.nomeMeio(g.meio))}${g.revisar ? ' · <span class="chip neg" style="padding:1px 8px">revisar</span>' : ''}</small></button>
              <span class="chips" style="flex-direction:column;align-items:flex-end;gap:4px"><span class="num ${g.valor < 0 ? 'neg-txt' : ''}" style="font-weight:600">${brl(g.valor)}</span>
                <span class="chips">${g.revisar && estado.filtroG === 'rev' ? `<button class="chip pos" data-confirmar-g="${g.id}">confirmar</button>` : ''}<button class="chip ${g.conta === 'CNPJ' ? 'mid' : 'acc'}" data-trocar-g="${g.id}" aria-label="Trocar conta (agora ${g.conta})">${g.conta}</button></span></span>
            </div>`).join('')}</div>`).join('')
          : `<div class="vazio">${s.L.length ? 'Nada com esse filtro.' : 'Nenhum gasto neste mês. Toque em “+ Gasto” ou em “Importar fatura” ✦'}</div>`}` })}`;
}

function ligarGastos(el) {
  const acha = (id) => S.todos().find((g) => g.id === id);
  el.addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const d = b.dataset;
    if (d.novoG !== undefined) S.abrirGasto(null, { mes: estado.mes });
    else if (d.editarG) S.abrirGasto(acha(d.editarG));
    else if (d.importar !== undefined) S.abrirImportacao();
    else if (d.trocarG) await S.trocarConta(acha(d.trocarG));
    else if (d.confirmarG) await S.confirmarGasto(acha(d.confirmarG));
    else if (d.filtroG) { estado.filtroG = d.filtroG; redesenhar(); }
    else if (d.novaFixa !== undefined) S.abrirFixa();
    else if (d.fixa) S.abrirFixa(S.fixas().find((f) => f.id === d.fixa));
    else if (d.fixaPaga) await S.alternarFixaPaga(estado.mes, d.fixaPaga);
    else if (d.cfgG !== undefined) S.abrirConfigGastos();
  });
  const busca = el.querySelector('#busca-g');
  busca?.addEventListener('input', () => {
    estado.buscaG = busca.value;
    const pos = busca.selectionStart;
    redesenhar();
    const nova = ultimo.el.querySelector('#busca-g');
    nova.focus(); nova.setSelectionRange(pos, pos);
  });
}

/* =========================================================
   RESUMO GERAL (entrou · saiu · sobrou)
   Entrou = faturamento (consultório bruto + trabalhos recebidos).
   Saiu = gastos CPF e CNPJ + contas fixas pessoais + custos do consultório.
   Os custos do consultório (aluguel, custos fixos, repasse e imposto) entram em "saiu"; eles já são
   calculados na aba Consultório e NÃO estão nos gastos (para não contar duas vezes).
   ========================================================= */
function resumo() {
  const ym = estado.mes;
  const c = C.calcular(ym), s = S.calcular(ym), cfg = S.config();
  const w = W.entradas(ym);
  // Entrou = o que você FATUROU (consultório bruto + trabalhos recebidos).
  // Saiu = seus gastos + o que o consultório custa no mês (aluguel, custos fixos, repasse e imposto).
  const custosCons = r2(c.bruto - c.liquido);
  const entrou = r2(c.bruto + w.recebido), saiu = r2(s.total + custosCons), sobrou = r2(entrou - saiu);
  const meses = Array.from({ length: 6 }, (_, i) => somarMeses(ym, i - 5));
  const barras = meses.map((m) => {
    const cm = C.calcular(m);
    const v = r2(cm.bruto + W.entradas(m).recebido - (S.calcular(m).total + (cm.bruto - cm.liquido)));
    return { rotulo: mesPorExtenso(m).slice(0, 3).toLowerCase(), valor: Math.max(0, v), on: m === ym, dica: brl(v) };
  });
  const cores = s.categorias.map((x, i) => ({ ...x, cor: G.CORES[i % G.CORES.length] }));
  const metaPct = cfg.metaSobra > 0 ? Math.max(0, (sobrou / cfg.metaSobra) * 100) : null;
  const dicas = S.dicas(ym);
  const linha = (cor, nome, valor, negativo = false) => `<div><i style="background:${cor}"></i><span>${nome}</span><span class="p">${negativo ? '− ' : ''}${typeof valor === 'string' ? valor : brl(valor)}</span></div>`;
  const total = (nome, valor) => `<div style="border-top:1px solid var(--line);padding-top:9px"><i style="background:transparent"></i><span><b>${nome}</b></span><span class="p"><b>${brl(valor)}</b></span></div>`;
  return `
    <div class="grade g-3">
      ${kpi({ rot: 'Entrou', valor: curto(entrou), sub: 'consultório + trabalhos (faturamento)' })}
      ${kpi({ rot: 'Saiu', valor: curto(saiu), sub: custosCons ? `gastos + ${curto(custosCons)} do consultório` : 'CPF + CNPJ' })}
      ${kpi({ rot: 'Sobrou', valor: curto(sobrou), sub: cfg.metaSobra ? `meta de ${brl(cfg.metaSobra)} · ${sobrou >= cfg.metaSobra ? 'batida ✦' : `faltam ${brl(cfg.metaSobra - sobrou)}`}` : '<button class="link-mini" data-cfg-g>definir meta de sobra</button>', extra: metaPct == null ? '' : G.trilho(metaPct, metaPct >= 100 ? 'var(--g4)' : 'var(--g1)'), classe: 'verde' })}
    </div>
    <div class="grade g-2">
      ${painel({ rot: 'De onde entrou', titulo: 'Entradas',
        corpo: `<div class="legenda">
          ${linha('var(--g1)', 'Consultório (faturamento bruto)', c.bruto)}
          ${w.linhas.map((l) => linha(l.cor, l.nome, l.recebido ? l.valor : l.valor > 0 ? `a receber ${brl(l.valor)}` : 'valor não informado')).join('')}
          ${total('Entrou', entrou)}</div>` })}
      ${painel({ rot: 'Para onde saiu', titulo: 'Saídas',
        corpo: `<div class="legenda">
          ${linha('var(--g2)', 'Gastos pessoais e do CNPJ', s.total)}
          ${c.repasse ? linha('var(--g7)', 'Repasse Campo Largo', c.repasse) : ''}
          ${c.aluguel ? linha('var(--g3)', 'Aluguel Curitiba', c.aluguel) : ''}
          ${c.totalCustos ? linha('var(--g5)', 'Custos fixos do consultório', c.totalCustos) : ''}
          ${c.imposto ? linha('var(--g6)', 'Imposto (DAS)', c.imposto) : ''}
          ${total('Saiu', saiu)}</div>` })}
    </div>
    <div class="grade g-2">
      ${painel({ rot: 'Para onde foi', titulo: 'Gastos por categoria',
        corpo: `<div class="rosca-bloco">${G.rosca(cores, { centro: mini(s.total), sub: 'gastos do mês' })}
          <div class="legenda">${cores.length ? cores.slice(0, 7).map((x) => `<div><i style="background:${x.cor}"></i><span>${esc(x.rotulo)}</span><span class="p">${pct(x.valor, s.total)}%</span></div>`).join('') : '<div class="vazio" style="padding:0;text-align:left">Sem gastos neste mês.</div>'}</div></div>` })}
      ${painel({ rot: 'Quanto sobrou por mês', titulo: 'Últimos 6 meses', corpo: G.barras(barras, { altura: 150 }) })}
    </div>
    ${dicas.map((t) => `<div class="dica"><span>${t}</span></div>`).join('')}`;
}
