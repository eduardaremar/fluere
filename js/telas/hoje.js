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

  const nT = doDia.length, nH = habitos.length - est.hojeFeitos;
  const frase = nT || nH
    ? `Hoje você tem <em><span class="n">${nT}</span> ${nT === 1 ? 'tarefa' : 'tarefas'}</em> e <em><span class="n">${nH}</span> ${nH === 1 ? 'hábito' : 'hábitos'}</em> para marcar.`
    : 'Hoje está <em>tudo em dia</em>.';

  const linhaTarefa = (t) => `
    <div class="linha">
      <button class="caixa-chk ${t.status === 'feita' ? 'ok' : ''}" data-feita="${t.id}" aria-label="${t.status === 'feita' ? 'Reabrir' : 'Concluir'}">${t.status === 'feita' ? icone.check(14) : ''}</button>
      <button class="tx" data-editar="${t.id}" style="text-align:left"><b style="${t.status === 'feita' ? 'text-decoration:line-through;color:var(--soft)' : ''}">${t.importante ? '<span class="imp">!</span> ' : ''}${esc(t.titulo)}</b>
        <small><span class="marca-area" style="display:inline-block;background:var(--area-${t.area})"></span> ${T.nomeArea(t.area)} · ${duracao(t.tempo)}${t.dia && t.dia < hoje ? ` · era para ${diaMes(t.dia)}` : ''}</small></button>
      ${t.dia !== hoje ? '<span class="chip neg">atrasada</span>' : ''}
    </div>`;

  el.innerHTML = `
    ${cabecalho({ sup: diaPorExtenso(), titulo: 'Seu dia <em>hoje</em>', avisos: lista.length })}

    <section class="hero">
      <div>
        <div class="ola">${saudacao()}, ${NOME} ✦</div>
        <h1>${frase}</h1>
        <p>Aqui está o ritmo do seu dia.</p>
      </div>
      <div class="acts">
        <a class="btn contorno" href="#/rotina/tarefas">${icone.rotina(18)} Ver semana</a>
        <button class="btn pri" data-nova-tarefa>${icone.soma(18)} Tarefa</button>
      </div>
    </section>

    <div class="grade g-kpi">
      ${kpi({ rot: 'Tarefas de hoje', valor: `${feitas}<span style="font-size:.5em;color:var(--soft)"> / ${nT}</span>`, sub: restante ? `${duracao(restante)} ainda previstas` : (nT ? 'tudo feito ✦' : 'nada planejado'), extra: nT ? `<div class="trilho"><i style="width:${(feitas / nT) * 100}%;background:var(--g4)"></i></div>` : '', classe: 'quente' })}
      ${kpi({ rot: 'Hábitos de hoje', valor: `${est.hojeFeitos}<span style="font-size:.5em;color:var(--soft)"> / ${habitos.length}</span>`, sub: est.hojeFeitos === habitos.length && habitos.length ? 'todos marcados ✦' : 'toque para marcar abaixo', classe: 'rosa' })}
      ${kpi({ rot: 'Atrasadas', valor: atrasadas.length, unidade: atrasadas.length === 1 ? 'tarefa' : 'tarefas', sub: atrasadas.length ? 'reorganize na semana' : 'nenhuma ✦' })}
      ${kpi({ rot: 'Pacientes hoje', valor: consultas.length, unidade: consultas.length === 1 ? 'consulta' : 'consultas', sub: consultas.length ? `primeira ${consultas[0].proximaHora ? 'às ' + consultas[0].proximaHora.replace(':', 'h').replace(/h00$/, 'h') : 'do dia'}` : 'nenhuma marcada', classe: 'verde' })}
    </div>

    <div class="grade g-21">
      ${painel({ rot: 'Rotina · hoje', titulo: 'Tarefas do <em>dia</em>', ver: ['#/rotina/tarefas', 'Semana'],
        corpo: (doDia.length || atrasadas.length)
          ? `<div class="linhas">${[...atrasadas, ...doDia].map(linhaTarefa).join('')}</div>`
          : '<div class="vazio">Nada planejado para hoje. Toque em “+ Tarefa” para começar ✦</div>' })}
      ${painel({ rot: 'Central', titulo: 'Avisos',
        corpo: lista.length
          ? `<ul class="alerts">${lista.map((a) => `<li>${a.irPara
              ? `<button class="alert ${a.tipo || ''}" data-ir="${a.irPara}"><span class="d"></span><div>${a.texto}</div></button>`
              : `<div class="alert ${a.tipo || ''}"><span class="d"></span><div>${a.texto}</div></div>`}</li>`).join('')}</ul>`
          : '<div class="vazio">Nenhum aviso agora. Tudo em dia ✦</div>' })}
    </div>

    <div class="grade g-3">
      ${painel({ rot: 'Hábitos · hoje', titulo: 'Marcar o <em>dia</em>', ver: ['#/rotina/habitos', 'Tracker'],
        corpo: habitos.length
          ? `<div class="hab-hoje">${habitos.map(({ h, hoje: feito }) => `
              <button data-marcar="${h.id}" aria-pressed="${feito}" style="--c:${H.cor(h)}"><span class="bola">${feito ? icone.check(14) : ''}</span><span>${esc(h.nome)}</span></button>`).join('')}</div>`
          : '<div class="vazio">Nenhum hábito criado.</div>' })}
      ${painel({ rot: 'Consultório · hoje', titulo: 'Quem você <em>atende</em>', ver: ['#/pacientes', 'Pacientes'],
        corpo: consultas.length
          ? `<div class="linhas">${consultas.map((p) => `
              <div class="linha">
                <span class="hora">${p.proximaHora ? p.proximaHora.replace(':', 'h').replace(/h00$/, 'h') : '—'}</span>
                <button class="tx" data-ficha="${p.id}" style="text-align:left"><b>${esc(p.nome)}</b><small>${P.situacao(p).k ? `${P.situacao(p).restantes === 1 ? 'última consulta do pacote' : `${P.situacao(p).restantes} consultas a fazer`}` : 'sem pacote ativo'}</small></button>
                <button class="chip acc" data-consulta-feita="${p.id}">feita</button>
              </div>`).join('')}</div>`
          : '<div class="vazio">Nenhuma consulta marcada para hoje. As datas vêm da “próxima consulta” de cada ficha ✦</div>' })}
      ${painel({ rot: 'Conteúdo · hoje', titulo: 'Peça do <em>dia</em>',
        corpo: '<div class="vazio">A peça programada para hoje aparece aqui quando o módulo de conteúdo ficar pronto.</div>' })}
    </div>`;

  el.addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const tarefa = (id) => T.todas().find((t) => t.id === id);
    if (b.dataset.feita) await T.alternarFeita(tarefa(b.dataset.feita));
    else if (b.dataset.editar) T.abrirTarefa(tarefa(b.dataset.editar));
    else if (b.dataset.novaTarefa !== undefined) T.abrirTarefa();
    else if (b.dataset.ficha) P.abrirFicha(b.dataset.ficha);
    else if (b.dataset.consultaFeita) P.abrirConsultaFeita(b.dataset.consultaFeita);
    else if (b.dataset.marcar) await H.alternar(H.lista().find((h) => h.id === b.dataset.marcar), hoje);
  });
}
