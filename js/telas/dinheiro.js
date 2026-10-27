/* =========================================================
   Fluere · Dinheiro
   Três partes: Consultório · Gastos · Resumo geral.
   Endereços: #/dinheiro/consultorio, #/dinheiro/gastos, #/dinheiro/resumo
   Começa zerado; os números aparecem com as etapas 1 e 2.
   ========================================================= */

import * as G from '../nucleo/graficos.js';
import { cabecalho, painel, kpi, abas } from '../nucleo/ui.js';
import { brl, mesPorExtenso, isoMes } from '../nucleo/util.js';

const PARTES = [
  { rota: 'consultorio', nome: 'Consultório', desenhar: consultorio },
  { rota: 'gastos', nome: 'Gastos', desenhar: gastos },
  { rota: 'resumo', nome: 'Resumo geral', desenhar: resumo },
];

export function desenhar(el, [sub]) {
  const atual = PARTES.find((p) => p.rota === sub) || PARTES[0];
  el.innerHTML = `
    ${cabecalho({ sup: 'Finanças', titulo: mesPorExtenso(isoMes()).replace(/ (\d{4})$/, ' <em>$1</em>') })}
    ${abas('dinheiro', PARTES, atual.rota)}
    ${atual.desenhar()}`;
}

/* ---------- consultório ---------- */
function consultorio() {
  return `
    <div class="grade g-kpi">
      ${kpi({ rot: 'Ganho bruto', valor: brl(0), sub: '0 atendimentos' })}
      ${kpi({ rot: 'Ganho líquido', valor: brl(0), sub: 'depois de repasse, aluguel e imposto', classe: 'verde' })}
      ${kpi({ rot: 'A receber', valor: brl(0), sub: 'parcelas e pendências', classe: 'quente' })}
      ${kpi({ rot: 'Meta do mês', valor: '0%', sub: 'meta ainda não definida', extra: G.trilho(0) })}
    </div>
    <div class="grade g-21">
      ${painel({ rot: 'Para onde vai cada real', titulo: 'Do bruto ao líquido',
        corpo: `${G.pilha([])}<div class="vazio">Quando você lançar atendimentos, aqui aparece quanto fica com você e quanto vai para cada clínica, para o aluguel e para o imposto.</div>` })}
      ${painel({ rot: 'Leituras do mês', titulo: 'Alertas',
        corpo: '<div class="vazio">Nenhum alerta ainda ✦</div>' })}
    </div>
    <div class="grade g-2">
      ${painel({ rot: 'De onde veio', titulo: 'Por local',
        corpo: `<div class="rosca-bloco">${G.rosca([], { centro: 'R$ 0', sub: 'bruto' })}<div class="legenda"><div><i style="background:var(--g1)"></i><span>Curitiba</span><span class="p">0%</span></div><div><i style="background:var(--g2)"></i><span>Campo Largo</span><span class="p">0%</span></div><div><i style="background:var(--g3)"></i><span>Online</span><span class="p">0%</span></div></div></div>` })}
      ${painel({ rot: 'De onde veio', titulo: 'Por tipo',
        corpo: `<div class="rosca-bloco">${G.rosca([], { centro: '0', sub: 'atendimentos' })}<div class="legenda"><div><i style="background:var(--g4)"></i><span>Consulta avulsa</span><span class="p">0%</span></div><div><i style="background:var(--g5)"></i><span>Acompanhamento 3 meses</span><span class="p">0%</span></div><div><i style="background:var(--g6)"></i><span>Acompanhamento 6 meses</span><span class="p">0%</span></div></div></div>` })}
    </div>
    ${painel({ rot: 'Extrato', titulo: 'Lançamentos do mês',
      corpo: '<div class="vazio">Nenhum atendimento lançado ainda — eles aparecem aqui assim que você lançar ✦</div>' })}`;
}

/* ---------- gastos ---------- */
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
        corpo: '<div class="vazio">Seus 2 cartões, as contas fixas e os parcelados aparecem aqui.</div>' })}
    </div>`;
}

/* ---------- resumo geral ---------- */
function resumo() {
  const meses = ['mai', 'jun', 'jul', 'ago', 'set', 'out'];
  return `
    <div class="grade g-3">
      ${kpi({ rot: 'Entrou', valor: brl(0), sub: 'consultório + trabalhos' })}
      ${kpi({ rot: 'Saiu', valor: brl(0), sub: 'CPF + CNPJ' })}
      ${kpi({ rot: 'Sobrou', valor: brl(0), sub: 'meta de sobra ainda não definida', classe: 'verde' })}
    </div>
    <div class="grade g-2">
      ${painel({ rot: 'De onde entrou', titulo: 'Entradas',
        corpo: `<div class="rosca-bloco">${G.rosca([], { centro: 'R$ 0', sub: 'entrou' })}<div class="legenda"><div><i style="background:var(--g1)"></i><span>Consultório (líquido)</span><span class="p">0%</span></div><div><i style="background:var(--g3)"></i><span>Marketing Bela Flor</span><span class="p">0%</span></div><div><i style="background:var(--g5)"></i><span>RT pousadas</span><span class="p">0%</span></div></div></div>` })}
      ${painel({ rot: 'Quanto sobrou por mês', titulo: 'Últimos 6 meses',
        corpo: G.barras(meses.map((m) => ({ rotulo: m, valor: 0 })), { altura: 150 }) })}
    </div>`;
}
