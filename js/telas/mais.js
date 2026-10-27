/* =========================================================
   Fluere · Mais
   Os módulos que não estão na barra de baixo, em blocos
   visuais. Endereços: #/mais e #/mais/<parte>
   Começa vazio; chega nas etapas 7 a 11.
   ========================================================= */

import * as G from '../nucleo/graficos.js';
import { cabecalho, painel, kpi, icone } from '../nucleo/ui.js';
import { brl } from '../nucleo/util.js';
import * as ajustes from './ajustes.js';

/* Metas e valores que já combinamos na entrevista (não são exemplos) */
const META_CONTEUDO = [
  { nome: 'Feed', total: 2 },
  { nome: 'Reels teste', total: 1 },
  { nome: 'Stories', total: 2 },
];

const PARTES = [
  { rota: 'conteudo', nome: 'Conteúdo', desc: '@nutrieduardaremar', icone: icone.conteudo, chips: () => META_CONTEUDO.map((m) => `<span class="chip">${m.nome} 0/${m.total}</span>`).join(''), desenhar: conteudo },
  { rota: 'trabalhos', nome: 'Trabalhos', desc: 'RT pousadas · Bela Flor', icone: icone.trabalho, chips: () => '<span class="chip">visitas às sextas</span>', desenhar: trabalhos },
  { rota: 'estudos', nome: 'Estudos', desc: 'Cursos, artigos, livros e temas', icone: icone.estudos, chips: () => '<span class="chip">0 estudando</span>', desenhar: estudos },
  { rota: 'vencimentos', nome: 'Vencimentos', desc: 'CRN, certificado, CNH, IPVA…', icone: icone.vencimentos, chips: () => '<span class="chip">nada cadastrado</span>', desenhar: vencimentos },
  { rota: 'revisao', nome: 'Revisão semanal', desc: 'Domingo, 10 minutos', icone: icone.revisao, chips: () => '<span class="chip">próxima: domingo</span>', desenhar: revisao },
  { rota: 'ajustes', nome: 'Ajustes e backup', desc: 'Senha, aparência, backup', icone: icone.ajustes, chips: () => '', tela: ajustes },
];

export function desenhar(el, [sub]) {
  const parte = PARTES.find((p) => p.rota === sub);
  if (parte?.tela) return parte.tela.desenhar(el);
  if (parte) {
    el.innerHTML = `${cabecalho({ voltar: ['#/mais', 'Mais'], titulo: parte.nome })}${parte.desenhar()}`;
    return;
  }
  el.innerHTML = `
    ${cabecalho({ sup: 'Tudo o mais', titulo: 'Suas <em>frentes</em>' })}
    <div class="grade g-3">${PARTES.map((p) => `
      <a class="ladrilho" href="#/mais/${p.rota}">
        <span class="ic">${p.icone(22)}</span>
        <b>${p.nome}</b><small>${p.desc}</small>
        <span class="rodape chips">${p.chips()}</span>
      </a>`).join('')}</div>`;
}

/* ---------- conteúdo ---------- */
function conteudo() {
  const dias = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'];
  return `
    <div class="grade g-kpi">
      ${META_CONTEUDO.map((m) => kpi({ rot: `Meta · ${m.nome}`, valor: `0<span style="font-size:.5em;color:var(--soft)"> / ${m.total}</span>`, sub: 'nesta semana', classe: 'quente', extra: G.trilho(0, 'var(--g2)') })).join('')}
      ${kpi({ rot: 'Seguidores no mês', valor: '0', sub: 'métricas digitadas', classe: 'rosa' })}
    </div>
    ${painel({ rot: 'Calendário', titulo: 'Sua <em>semana</em>',
      corpo: `<div class="grade" style="grid-template-columns:repeat(7,minmax(90px,1fr));overflow-x:auto">${dias.map((d) => `
        <div style="display:flex;flex-direction:column;gap:8px;min-width:90px"><div class="rot">${d}</div>
          <div style="border:1px dashed var(--line);border-radius:14px;min-height:90px"></div></div>`).join('')}</div>` })}
    <div class="grade g-2">
      ${painel({ rot: 'Pilares', titulo: 'O que você está postando',
        corpo: `<div class="rosca-bloco">${G.rosca([], { centro: '0', sub: 'peças' })}<div class="legenda"><div><i style="background:var(--g4)"></i><span>Saúde intestinal</span><span class="p">0%</span></div><div><i style="background:var(--g2)"></i><span>Emagrecimento feminino</span><span class="p">0%</span></div></div></div>` })}
      ${painel({ rot: 'Métricas', titulo: 'O que mais funcionou',
        corpo: '<div class="vazio">As métricas das peças postadas aparecem aqui.</div>' })}
    </div>`;
}

/* ---------- trabalhos ---------- */
function trabalhos() {
  return `
    <div class="grade g-kpi">
      ${kpi({ rot: 'RT pousadas', valor: brl(0), sub: 'recebido no mês', classe: 'verde' })}
      ${kpi({ rot: 'Bela Flor', valor: brl(0), sub: 'recebido no mês', classe: 'quente' })}
      ${kpi({ rot: 'Próxima visita', valor: 'sex', sub: 'as duas pousadas' })}
      ${kpi({ rot: 'Documentos', valor: 0, sub: 'com validade', classe: 'rosa' })}
    </div>
    <div class="grade g-2">
      ${painel({ rot: 'RT · RDC 216', titulo: 'Pousadas',
        corpo: '<div class="vazio">Visitas, checklist e documentos das pousadas aparecem aqui.</div>' })}
      ${painel({ rot: 'Marketing', titulo: 'Bela <em>Flor</em>',
        corpo: '<div class="vazio">Tarefas, posts e o relatório do mês aparecem aqui.</div>' })}
    </div>`;
}

/* ---------- estudos ---------- */
function estudos() {
  return `<div class="grade g-3">${['Quero estudar', 'Estudando', 'Concluído'].map((col) =>
    painel({ rot: col, titulo: '0 <em>itens</em>', corpo: '<div class="vazio">Nada aqui ainda</div>' })).join('')}</div>`;
}

/* ---------- vencimentos ---------- */
function vencimentos() {
  return painel({ rot: 'Linha do tempo', titulo: 'O que <em>vence</em>',
    corpo: '<div class="vazio">Nenhum vencimento cadastrado ✦</div>' });
}

/* ---------- revisão semanal ---------- */
function revisao() {
  const passos = ['O que deu certo na semana', 'Quanto entrou e quanto saiu', 'Hábitos e metas', 'Pendências que ficaram', 'Planejar a próxima semana'];
  return painel({ rot: 'Domingo · 10 minutos', titulo: 'Revisão <em>semanal</em>',
    corpo: `<div class="linhas">${passos.map((p, i) => `<div class="linha"><span class="hora">${i + 1}</span><span class="tx"><b>${p}</b></span></div>`).join('')}</div>` });
}
