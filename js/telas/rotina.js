/* =========================================================
   Fluere · Rotina
   Três partes: Semana (planejador) · Hábitos · Metas.
   Endereços: #/rotina/tarefas, #/rotina/habitos, #/rotina/metas
   Começa vazio; chega nas etapas 4, 5 e 6.
   ========================================================= */

import * as G from '../nucleo/graficos.js';
import { cabecalho, painel, kpi, abas } from '../nucleo/ui.js';
import { mesPorExtenso, isoMes } from '../nucleo/util.js';

const PARTES = [
  { rota: 'tarefas', nome: 'Semana', desenhar: tarefas },
  { rota: 'habitos', nome: 'Hábitos', desenhar: habitos },
  { rota: 'metas', nome: 'Metas', desenhar: metas },
];

const DIAS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'];

export function desenhar(el, [sub]) {
  const atual = PARTES.find((p) => p.rota === sub) || PARTES[0];
  el.innerHTML = `
    ${cabecalho({ sup: 'Dia a dia', titulo: 'Sua <em>rotina</em>' })}
    ${abas('rotina', PARTES, atual.rota)}
    ${atual.desenhar()}`;
}

/* ---------- planejador da semana ---------- */
function tarefas() {
  return `
    <div class="grade g-3">
      ${kpi({ rot: 'Tarefas da semana', valor: 0, unidade: 'tarefas', classe: 'quente' })}
      ${kpi({ rot: 'Tempo previsto', valor: '0h', sub: 'somando todas as tarefas' })}
      ${kpi({ rot: 'Horas livres', valor: '—', sub: 'monte sua semana padrão', classe: 'verde' })}
    </div>
    ${painel({ rot: 'Onde encaixar cada coisa', titulo: 'Sua <em>semana</em>',
      corpo: `<div class="grade" style="grid-template-columns:repeat(7,minmax(90px,1fr));overflow-x:auto">${DIAS.map((d) => `
        <div style="display:flex;flex-direction:column;gap:8px;min-width:90px"><div class="rot">${d}</div>
          <div style="border:1px dashed var(--line);border-radius:14px;min-height:90px"></div></div>`).join('')}</div>` })}`;
}

/* ---------- hábitos ---------- */
function habitos() {
  return `
    <div class="grade g-3">
      ${kpi({ rot: 'Melhor sequência', valor: 0, unidade: 'dias', classe: 'quente' })}
      ${kpi({ rot: 'Hábitos cumpridos', valor: '0%', sub: 'no mês' })}
      ${kpi({ rot: 'Hoje', valor: 0, unidade: 'de 4', classe: 'verde' })}
    </div>
    ${painel({ rot: mesPorExtenso(isoMes()), titulo: 'Tracker <em>de hábitos</em>',
      corpo: `${HABITOS.map((h) => `
        <div class="habito"><div class="h"><span><span class="marca-area" style="display:inline-block;background:${h.cor}"></span> ${h.nome} <small style="color:var(--soft)">· ${h.meta}</small></span><span>0/${hojeIdx + 1} dias</span></div>
        ${G.pontos(diasVazios(), h.cor, hojeIdx)}</div>`).join('')}
        <div class="escala">${[1, 5, 10, 15, 20, 25, diasNoMes].map((d) => `<span style="left:${((d - 0.5) / diasNoMes) * 100}%">${d}</span>`).join('')}</div>
        <div class="dica">Conforme você marcar os dias, aparecem aqui descobertas como “nos dias em que você dorme cedo, a academia acontece mais”.</div>` })}`;
}

/* Hábitos combinados na entrevista (ela pode criar outros na Etapa 5) */
const HABITOS = [
  { nome: 'Academia', meta: '3x por semana', cor: 'var(--g4)' },
  { nome: 'Beber 2 L de água', meta: 'todo dia', cor: 'var(--g5)' },
  { nome: 'Leitura', meta: 'todo dia', cor: 'var(--g3)' },
  { nome: 'Dormir antes da meia-noite', meta: 'todo dia', cor: 'var(--g6)' },
];
const agora = new Date();
const diasNoMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0).getDate();
const hojeIdx = agora.getDate() - 1;
/** Mês ainda sem marcações: dias passados em cinza, futuros só com contorno. */
const diasVazios = () => Array.from({ length: diasNoMes }, (_, i) => (i <= hojeIdx ? false : null));

/* ---------- metas do semestre ---------- */
function metas() {
  const hoje = new Date();
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth() < 6 ? 0 : 6, 1);
  const semana = Math.min(26, Math.floor((hoje - inicio) / (7 * 86400000)) + 1);
  const pilares = [
    { nome: 'Carreira', cor: 'var(--g6)' }, { nome: 'Finanças', cor: 'var(--g4)' }, { nome: 'Saúde', cor: 'var(--g5)' },
    { nome: 'Relações', cor: 'var(--g2)' }, { nome: 'Lazer', cor: 'var(--g3)' }, { nome: 'Desenvolvimento', cor: 'var(--g7)' },
  ];
  const meses = hoje.getMonth() < 6 ? ['jan', 'fev', 'mar', 'abr', 'mai', 'jun'] : ['jul', 'ago', 'set', 'out', 'nov', 'dez'];
  return `
    ${painel({ rot: `Linha do semestre · semana ${semana} de 26`, titulo: `${hoje.getMonth() < 6 ? '1º' : '2º'} <em>semestre</em>`,
      corpo: `${G.semestre(semana)}<div class="meses-semestre">${meses.map((m) => `<span>${m}</span>`).join('')}</div>` })}
    <div class="grade g-2">
      ${painel({ rot: 'Visão geral', titulo: '',
        corpo: `<div class="radar-bloco" style="justify-content:center">
          ${G.radar(pilares.map((p) => ({ rotulo: p.nome, valor: 0 })), { tam: 220 })}
          <div><div class="rot">Progresso geral</div><div class="valor g">0%</div><small style="color:var(--soft)">faltam ${26 - semana} semanas</small></div>
        </div>` })}
      ${painel({ rot: 'Por pilar', titulo: '',
        corpo: pilares.map((p) => `<div style="display:grid;grid-template-columns:120px 1fr 40px;gap:12px;align-items:center;font-size:14px">
          <span>${p.nome}</span>${G.trilho(0, p.cor)}<span style="color:var(--soft);text-align:right">0%</span></div>`).join('') })}
    </div>
    <div class="grade g-3">${pilares.map((p) => `
      <section class="painel" style="gap:10px">
        <div style="display:flex;align-items:center;gap:12px">${G.anel(0, { tam: 44, esp: 4, cor: p.cor, texto: '0' })}
          <div><b style="font:400 22px/1.1 var(--disp);color:var(--titulo)">${p.nome}</b><br><small style="color:var(--soft)">0 metas</small></div></div>
        <div style="font-size:13.5px;color:var(--soft);font-style:italic">Nenhuma meta criada ainda.</div>
      </section>`).join('')}</div>`;
}
