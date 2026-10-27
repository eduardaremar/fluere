/* =========================================================
   Fluere · Pacientes
   Lista de fichas, próximas consultas e aniversários.
   A ficha de cada paciente abre numa folha (módulo
   js/modulos/pacientes.js). Endereços: #/pacientes e
   #/pacientes/ficha/<id> (usado pelos avisos).
   ========================================================= */

import { cabecalho, painel, kpi, icone } from '../nucleo/ui.js';
import { esc, normal, isoDia } from '../nucleo/util.js';
import * as avisos from '../nucleo/avisos.js';
import * as P from '../modulos/pacientes.js';
import * as C from '../modulos/consultorio.js';

const estado = { busca: '', filtro: 'tudo' };
const FILTROS = [['tudo', 'Todos'], ['ativos', 'Com pacote'], ['acabando', 'Acabando'], ['sem', 'Sem próxima'], ['arquivados', 'Arquivados']];

const curto = (tipo) => C.TIPOS.find((t) => t.id === tipo)?.curto ?? tipo;

function linha({ p, s }, hoje) {
  const k = s.k;
  const detalhe = [
    k ? `${curto(k.tipo)} · ${(k.consultas || []).length} de ${k.total}` : 'sem pacote ativo',
    p.proxima ? `próxima ${P.proximaTexto(p, hoje)}` : null,
  ].filter(Boolean).join(' · ');
  const selo = s.passada ? '<span class="chip neg">registrar</span>'
    : s.semProxima ? '<span class="chip mid">sem retorno</span>'
    : s.acabando ? '<span class="chip acc">acabando</span>'
    : '';
  return `<div class="linha">
    <button type="button" class="inicial" data-ficha="${p.id}" aria-label="Abrir ficha de ${esc(p.nome)}">${esc(p.nome.trim().charAt(0).toUpperCase())}</button>
    <button type="button" class="tx" data-ficha="${p.id}"><b>${esc(p.nome)}</b><small>${esc(detalhe)}</small></button>
    ${selo}
  </div>`;
}

function listar(hoje) {
  const q = normal(estado.busca.trim());
  const todos = (estado.filtro === 'arquivados' ? P.todos().filter((p) => p.arquivado) : P.ativos())
    .map((p) => ({ p, s: P.situacao(p, hoje) }));
  const lista = todos.filter(({ p, s }) => {
    if (q && !normal(`${p.nome} ${p.origem || ''}`).includes(q)) return false;
    if (estado.filtro === 'ativos') return s.ativo;
    if (estado.filtro === 'acabando') return s.acabando;
    if (estado.filtro === 'sem') return s.semProxima || s.passada;
    return true;
  });
  if (!lista.length) {
    return `<div class="vazio">${P.todos().length ? 'Ninguém encontrado com esse filtro.' : 'Nenhum paciente cadastrado ainda. Toque em “+ Paciente” para começar ✦'}</div>`;
  }
  return `<div class="linhas">${lista.map((x) => linha(x, hoje)).join('')}</div>`;
}

export function desenhar(el, partes = []) {
  const hoje = isoDia();
  const r = P.resumo(hoje);
  const proximas = P.proximas(hoje).slice(0, 6);
  const aniv = P.aniversarios(hoje);
  const pend = P.pendencias(hoje).filter((a) => !a.id.startsWith('pac-aniv'));

  el.innerHTML = `
    ${cabecalho({ sup: 'Consultório', titulo: 'Seus <em>pacientes</em>', avisos: avisos.todos().length })}
    <div class="alert ok"><span class="d"></span><div>${icone.cadeado(15)} Aqui ficam só contato e pacote de cada paciente, nada clínico. Tudo fica embaralhado no aparelho e só abre com a sua senha.</div></div>
    <div class="grade g-kpi">
      ${kpi({ rot: 'Pacotes ativos', valor: r.ativos, sub: 'acompanhamentos em andamento', classe: 'quente' })}
      ${kpi({ rot: 'Pacotes acabando', valor: r.acabando, sub: 'oferecer renovação', classe: 'rosa' })}
      ${kpi({ rot: 'Sem próxima consulta', valor: r.semProxima, sub: 'marcar retorno' })}
      ${kpi({ rot: 'Aniversários', valor: r.aniversarios, unidade: 'na semana', classe: 'verde' })}
    </div>

    <div class="grade g-21">
      ${painel({ rot: 'Fichas', titulo: 'Todos os <em>pacientes</em>',
        corpo: `
          <div class="filtros" style="margin-bottom:12px">
            <input class="busca" type="search" id="busca-pac" placeholder="Buscar paciente" value="${esc(estado.busca)}" autocomplete="off" style="flex:1;min-width:160px;width:auto">
            <button type="button" class="btn pri" data-novo-pac>${icone.soma(16)} Paciente</button>
          </div>
          <div class="filtros" style="margin-bottom:6px">${FILTROS.map(([v, n]) => `<button type="button" class="chip ${estado.filtro === v ? 'acc' : ''}" data-filtro="${v}">${n}</button>`).join('')}</div>
          <div id="lista-pac">${listar(hoje)}</div>` })}
      <div class="coluna">
        ${painel({ rot: 'Agenda', titulo: 'Próximas <em>consultas</em>',
          corpo: proximas.length ? `<div class="linhas">${proximas.map((p) => `
            <div class="linha"><button type="button" class="tx" data-ficha="${p.id}"><b>${esc(p.nome)}</b><small>${P.proximaTexto(p, hoje)}</small></button></div>`).join('')}</div>`
            : '<div class="vazio">Nenhuma consulta marcada. A agenda fica no seu calendário; aqui só a próxima de cada paciente ✦</div>' })}
        ${painel({ rot: 'Para cuidar', titulo: 'Pendências',
          corpo: pend.length ? `<ul class="alerts">${pend.map((a) => `<li><button type="button" class="alert ${a.tipo || ''}" data-ficha="${a.irPara.split('/').pop()}"><span class="d"></span><div>${a.texto}</div></button></li>`).join('')}</ul>`
            : '<div class="vazio">Tudo em dia ✦</div>' })}
        ${painel({ rot: 'Na semana', titulo: 'Aniversários',
          corpo: aniv.length ? `<div class="linhas">${aniv.map(({ p, dia, idade }) => `
            <div class="linha"><button type="button" class="tx" data-ficha="${p.id}"><b>${esc(p.nome)}</b><small>${P.dataCurta(dia)} · ${idade} anos</small></button></div>`).join('')}</div>`
            : '<div class="vazio">Nenhum aniversário nesta semana.</div>' })}
      </div>
    </div>`;

  el.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.ficha) P.abrirFicha(b.dataset.ficha);
    else if (b.dataset.novoPac !== undefined) P.abrirPaciente();
    else if (b.dataset.filtro) {
      estado.filtro = b.dataset.filtro;
      el.querySelectorAll('[data-filtro]').forEach((x) => x.classList.toggle('acc', x === b));
      el.querySelector('#lista-pac').innerHTML = listar(hoje);
    }
  });
  el.querySelector('#busca-pac').addEventListener('input', (e) => {
    estado.busca = e.target.value;
    el.querySelector('#lista-pac').innerHTML = listar(hoje);
  });

  // Endereço de um aviso (#/pacientes/ficha/<id>): abre a ficha e volta o endereço para a lista.
  if (partes[0] === 'ficha' && partes[1]) {
    history.replaceState(null, '', '#/pacientes');
    P.abrirFicha(partes[1]);
  }
}
