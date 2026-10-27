/* =========================================================
   Fluere · Mais
   Os módulos que não estão na barra de baixo, em blocos
   visuais. Endereços: #/mais e #/mais/<parte>
   Começa vazio; chega nas etapas 7 a 11.
   ========================================================= */

import * as G from '../nucleo/graficos.js';
import { cabecalho, painel, kpi, icone } from '../nucleo/ui.js';
import * as ajustes from './ajustes.js';
import * as trabalhosTela from './trabalhos.js';
import * as conteudoTela from './conteudo.js';
import * as vencimentosTela from './vencimentos.js';
import * as V from '../modulos/vencimentos.js';
import * as revisaoTela from './revisao.js';
import * as Rv from '../modulos/revisao.js';
import * as Pe from '../modulos/pecas.js';
import { segundaDaSemana } from '../nucleo/util.js';
import * as W from '../modulos/trabalhos.js';

const PARTES = [
  { rota: 'conteudo', nome: 'Conteúdo', desc: '@nutrieduardaremar', icone: icone.conteudo, chips: () => { const s = Pe.semana(segundaDaSemana()); return `<span class="chip">Feed ${s.feed.feitos}/${s.meta.feed}</span><span class="chip">Teste ${s.teste.feitos}/${s.meta.reelsteste}</span><span class="chip">Stories ${s.stories.feitos}/${s.meta.stories}</span>`; }, tela: conteudoTela },
  { rota: 'trabalhos', nome: 'Trabalhos', desc: 'RT pousadas · Bela Flor', icone: icone.trabalho, chips: () => `<span class="chip">${plural(W.pousadas().length, 'pousada', 'pousadas')}</span><span class="chip">visitas ${W.config().diaVisita === 6 ? 'aos sábados' : `às ${W.NOME_DIA[W.config().diaVisita]}s`}</span>`, tela: trabalhosTela },
  { rota: 'estudos', nome: 'Estudos', desc: 'Cursos, artigos, livros e temas', icone: icone.estudos, chips: () => '<span class="chip">0 estudando</span>', desenhar: estudos },
  { rota: 'vencimentos', nome: 'Vencimentos', desc: 'CRN, certificado, CNH, IPVA…', icone: icone.vencimentos, chips: () => { const n = V.todos().filter((v) => { const s = V.status(v); return s.dias != null && s.dias <= 30; }).length; return n ? `<span class="chip neg">${n} vencendo</span>` : `<span class="chip">${V.todos().length ? 'tudo em dia' : 'nada cadastrado'}</span>`; }, tela: vencimentosTela },
  { rota: 'revisao', nome: 'Revisão semanal', desc: 'Domingo, 10 minutos', icone: icone.revisao, chips: () => `<span class="chip ${Rv.daSemana(segundaDaSemana()) ? 'pos' : ''}">${Rv.daSemana(segundaDaSemana()) ? 'feita nesta semana' : 'próxima: domingo'}</span>`, tela: revisaoTela },
  { rota: 'ajustes', nome: 'Ajustes e backup', desc: 'Senha, aparência, backup', icone: icone.ajustes, chips: () => '', tela: ajustes },
];

const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

export function desenhar(el, [sub, ...resto]) {
  const parte = PARTES.find((p) => p.rota === sub);
  if (parte?.tela) return parte.tela.desenhar(el, resto);
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

/* ---------- estudos ---------- */
function estudos() {
  return `<div class="grade g-3">${['Quero estudar', 'Estudando', 'Concluído'].map((col) =>
    painel({ rot: col, titulo: '0 <em>itens</em>', corpo: '<div class="vazio">Nada aqui ainda</div>' })).join('')}</div>`;
}

