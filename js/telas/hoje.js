/* =========================================================
   Fluere · painel Hoje
   Primeira tela. Junta os avisos de todos os módulos e mostra
   o ritmo do dia. Tarefas e hábitos já funcionam; pacientes e
   conteúdo aparecem quando os módulos deles ficarem prontos.
   ========================================================= */

import * as avisos from '../nucleo/avisos.js';
import { cabecalho, painel, kpi, icone } from '../nucleo/ui.js';
import { diaPorExtenso, saudacao, esc, isoDia, isoMes, duracao, diaMes } from '../nucleo/util.js';
import * as T from '../modulos/tarefas.js';
import * as H from '../modulos/habitos.js';
import * as P from '../modulos/pacientes.js';
import * as C from '../modulos/consultorio.js';

const NOME = 'Eduarda';

export function desenhar(el) {
  H.criarIniciais();
  const hoje = isoDia();
  const lista = avisos.todos();

  const doDia = T.doDia(hoje);
  const atrasadas = T.atrasadas(hoje).filter((t) => t.dia !== hoje);
  const feitas = doDia.filter((t) => t.status === 'feita').length;
  const restante = doDia.filter((t) => t.status === 'aberta').reduce((s, t) => s + (Number(t.tempo) || 0), 0);
  const consultas = P.doDia(hoje);
  const est = H.estatisticas(isoMes());
  const habitos = est.porHabito;

  const linhaTarefa = (t) => `
    <div class="linha">
      <button class="caixa-chk ${t.status === 'feita' ? 'ok' : ''}" data-feita="${t.id}" aria-label="${t.status === 'feita' ? 'Reabrir' : 'Concluir'}">${t.status === 'feita' ? icone.check(14) : ''}</button>
      <button class="tx" data-editar="${t.id}" style="text-align:left"><b style="${t.status === 'feita' ? 'text-decoration:line-through;color:var(--soft)' : ''}">${t.importante ? '<span class="imp">!</span> ' : ''}${esc(t.titulo)}</b>
        <small><span class="marca-area" style="display:inline-block;background:var(--area-${t.area})"></span> ${T.nomeArea(t.area)} · ${duracao(t.tempo)}${t.dia && t.dia < hoje ? ` · era para ${diaMes(t.dia)}` : ''}</small></button>
      ${t.dia !== hoje ? '<span class="chip neg">atrasada</span>' : ''}
    </div>`;

  const horaDe = (h) => (h ? h.replace(':', 'h').replace(/h00$/, 'h') : '—');
  const textoAviso = (a) => (a.irPara
    ? `<li><button type="button" class="alert ${a.tipo || ''}" data-ir="${a.irPara}"><span class="d"></span><div>${a.texto}</div></button></li>`
    : `<li><div class="alert ${a.tipo || ''}"><span class="d"></span><div>${a.texto}</div></div></li>`);
  const nH = habitos.length;

  el.innerHTML = `
    ${cabecalho({ sup: diaPorExtenso(), titulo: `${saudacao()}, ${NOME}`, avisos: lista.length, serif: true })}

    <div class="grade g-kpi">
      ${kpi({ rot: 'Consultas', valor: consultas.length, sub: consultas.length ? `primeira às ${horaDe(consultas[0].proximaHora)}` : 'nenhuma marcada' })}
      ${kpi({ rot: 'Tarefas', valor: `${feitas}<span> / ${doDia.length}</span>`, sub: restante ? `${duracao(restante)} ainda previstas` : (doDia.length ? 'tudo feito' : 'nada planejado'), extra: doDia.length ? `<div class="trilho"><i style="width:${(feitas / doDia.length) * 100}%;background:var(--g4)"></i></div>` : '' })}
      ${kpi({ rot: 'Hábitos', valor: `${est.hojeFeitos}<span> / ${nH}</span>`, sub: est.hojeFeitos === nH && nH ? 'todos marcados' : 'toque para marcar abaixo' })}
      ${kpi({ rot: 'Atrasadas', valor: atrasadas.length, sub: atrasadas.length ? 'reorganize na semana' : 'nenhuma' })}
    </div>

    ${lista.length ? painel({ rot: 'Central', titulo: lista.length === 1 ? '1 aviso' : `${lista.length} avisos`, corpo: `<ul class="alerts">${lista.map(textoAviso).join('')}</ul>` }) : ''}

    <div class="grade g-2">
      ${painel({ rot: 'Consultório', titulo: 'Quem você atende', ver: ['#/pacientes', 'Pacientes'],
        corpo: consultas.length
          ? `<div class="linhas">${consultas.map((p) => {
              const s = P.situacao(p);
              return `<div class="linha">
                <span class="hora">${horaDe(p.proximaHora)}</span>
                <button class="tx" data-ficha="${p.id}" style="text-align:left"><b>${esc(p.nome)}</b><small>${C.LOCAIS.find((l) => l.id === p.local) ? `<span class="dot" style="background:${C.LOCAIS.find((l) => l.id === p.local).cor}"></span>${C.nomeLocal(p.local)} · ` : ''}${s.k ? (s.restantes === 1 ? 'última consulta do pacote' : `${s.restantes} consultas a fazer`) : 'sem pacote ativo'}</small></button>
                <button class="chip acc" data-consulta-feita="${p.id}">feita</button>
              </div>`; }).join('')}</div>`
          : '<div class="vazio">Nenhuma consulta marcada para hoje. As datas vêm da “próxima consulta” de cada ficha.</div>' })}
      ${painel({ rot: 'Rotina', titulo: 'Tarefas do dia', ver: ['#/rotina/tarefas', 'Semana'],
        corpo: (doDia.length || atrasadas.length)
          ? `<div class="linhas">${[...atrasadas, ...doDia].map(linhaTarefa).join('')}</div>`
          : '<div class="vazio">Nada planejado para hoje.</div>' })}
    </div>

    <div class="grade g-2">
      ${painel({ rot: 'Rotina', titulo: 'Hábitos de hoje', ver: ['#/rotina/habitos', 'Tracker'],
        corpo: habitos.length
          ? `<div class="hab-hoje">${habitos.map(({ h, hoje: feito }) => `
              <button data-marcar="${h.id}" aria-pressed="${feito}" style="--c:${H.cor(h)}"><span class="bola">${feito ? icone.check(14) : ''}</span><span>${esc(h.nome)}</span></button>`).join('')}</div>`
          : '<div class="vazio">Nenhum hábito criado.</div>' })}
      ${painel({ rot: 'Conteúdo', titulo: 'Peça do dia',
        corpo: '<div class="vazio">A peça programada para hoje aparece aqui quando o módulo de conteúdo ficar pronto.</div>' })}
    </div>`;

  el.addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const tarefa = (id) => T.todas().find((t) => t.id === id);
    if (b.dataset.feita) await T.alternarFeita(tarefa(b.dataset.feita));
    else if (b.dataset.editar) T.abrirTarefa(tarefa(b.dataset.editar));
    else if (b.dataset.ficha) P.abrirFicha(b.dataset.ficha);
    else if (b.dataset.consultaFeita) P.abrirConsultaFeita(b.dataset.consultaFeita);
    else if (b.dataset.marcar) await H.alternar(H.lista().find((h) => h.id === b.dataset.marcar), hoje);
  });
}
