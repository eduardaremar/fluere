/* =========================================================
   Fluere · Rotina
   Três partes: Semana (tarefas + planejador) · Hábitos · Metas.
   Endereços: #/rotina/tarefas, #/rotina/habitos, #/rotina/metas
   Semana e Hábitos funcionam de verdade (módulo de Hábitos e
   Tarefas). Metas chega numa próxima etapa.
   ========================================================= */

import * as G from '../nucleo/graficos.js';
import { cabecalho, painel, kpi, abas, icone, toast, areaLimpa } from '../nucleo/ui.js';
import { esc, isoDia, isoMes, mesPorExtenso, somarDias, segundaDaSemana, diaMes, duracao, diasNoMes, somarMeses } from '../nucleo/util.js';
import * as T from '../modulos/tarefas.js';
import * as H from '../modulos/habitos.js';

const PARTES = [
  { rota: 'tarefas', nome: 'Semana', desenhar: semana, ligar: ligarSemana },
  { rota: 'habitos', nome: 'Hábitos', desenhar: habitos, ligar: ligarHabitos },
  { rota: 'metas', nome: 'Metas', desenhar: metas },
];

/* O que a tela lembra enquanto você navega (semana e mês mostrados, filtro da lista) */
const estado = { segunda: segundaDaSemana(), mes: isoMes(), filtro: 'abertas' };
let ultimo = null;

export function desenhar(el, partes = ultimo?.partes ?? []) {
  el = areaLimpa(el);
  ultimo = { el, partes };
  const atual = PARTES.find((p) => p.rota === partes[0]) || PARTES[0];
  if (atual.rota === 'habitos') H.criarIniciais();
  el.innerHTML = `
    ${cabecalho({ sup: 'Dia a dia', titulo: 'Sua <em>rotina</em>' })}
    ${abas('rotina', PARTES, atual.rota)}
    ${atual.desenhar()}`;
  atual.ligar?.(el);
}
const redesenhar = () => ultimo && desenhar(ultimo.el, ultimo.partes);

/* =========================================================
   SEMANA (planejador + lista de tarefas)
   ========================================================= */

function chipTarefa(t, hoje) {
  const atrasada = t.status === 'aberta' && ((t.dia && t.dia < hoje) || (t.prazo && t.prazo < hoje));
  return `<div class="tarefa ${t.status === 'feita' ? 'feita' : ''}" draggable="true" data-id="${t.id}" style="--a:var(--area-${t.area})">
    <button class="caixa-chk ${t.status === 'feita' ? 'ok' : ''}" data-feita="${t.id}" aria-label="${t.status === 'feita' ? 'Reabrir' : 'Concluir'}: ${esc(t.titulo)}">${t.status === 'feita' ? icone.check(13) : ''}</button>
    <button class="tx" data-editar="${t.id}">${t.importante ? '<span class="imp">!</span> ' : ''}${esc(t.titulo)}
      <small>${duracao(t.tempo)}${t.prazo ? ` · prazo ${diaMes(t.prazo)}` : ''}${atrasada ? ' · <span style="color:var(--neg)">atrasada</span>' : ''}</small></button>
  </div>`;
}

function semana() {
  const hoje = isoDia();
  const r = T.resumoSemana(estado.segunda);
  const livresDefinidas = r.minLivres != null;
  const abertas = r.dias.reduce((s, d) => s + d.tarefas.filter((t) => t.status === 'aberta').length, 0);
  const feitas = r.dias.reduce((s, d) => s + d.tarefas.filter((t) => t.status === 'feita').length, 0);
  const titulo = estado.segunda === segundaDaSemana() ? 'Esta <em>semana</em>' : `Semana de <em>${diaMes(estado.segunda)}</em>`;
  const semDia = T.semDia();
  const recusadas = T.foraDaSemana('recusada'), delegadas = T.foraDaSemana('delegada');

  let aviso;
  if (!livresDefinidas) aviso = `<button class="alert mid" data-horas><span class="d"></span><div><strong>Defina suas horas livres</strong> para eu avisar quando a semana não fechar. Toque aqui.</div></button>`;
  else if (!r.fecha) aviso = `<div class="alert warn"><span class="d"></span><div><strong>Essa semana não fecha.</strong> São ${duracao(r.minTarefas)} de tarefas para ${duracao(r.minLivres)} livres. Adie, recuse ou delegue alguma coisa.</div></div>`;
  else {
    // A semana cabe no total, mas algum dia (de hoje em diante) pode ter passado do limite.
    const cheios = r.dias.filter((d) => d.passou && d.iso >= hoje).map((d) => d.nome);
    aviso = cheios.length
      ? `<div class="alert mid"><span class="d"></span><div><strong>A semana cabe, mas ${cheios.join(', ').replace(/, ([^,]*)$/, ' e $1')} ${cheios.length === 1 ? 'passou' : 'passaram'} do limite.</strong> Arraste ou mude o dia de alguma tarefa.</div></div>`
      : `<div class="alert ok"><span class="d"></span><div><strong>A semana cabe.</strong> ${duracao(r.minTarefas)} de tarefas para ${duracao(r.minLivres)} livres${r.minLivres - r.minTarefas > 0 ? ` · sobram ${duracao(r.minLivres - r.minTarefas)}` : ''}.</div></div>`;
  }

  return `
    <div class="grade g-3">
      ${kpi({ rot: 'Tarefas da semana', valor: abertas, unidade: abertas === 1 ? 'aberta' : 'abertas', sub: `${feitas} ${feitas === 1 ? 'feita' : 'feitas'}`, classe: 'quente' })}
      ${kpi({ rot: 'Tempo previsto', valor: duracao(r.minTarefas), sub: 'somando as tarefas abertas', extra: livresDefinidas ? G.trilho(r.minLivres ? (r.minTarefas / r.minLivres) * 100 : 0, r.fecha ? 'var(--g4)' : 'var(--neg-forte)') : '' })}
      ${kpi({ rot: 'Horas livres', valor: livresDefinidas ? duracao(r.minLivres) : '—', sub: livresDefinidas ? '<button class="link-mini" data-horas>ajustar</button>' : '<button class="link-mini" data-horas>definir</button>', classe: 'verde' })}
    </div>

    ${aviso}

    ${painel({ rot: 'Onde encaixar cada coisa', titulo,
      corpo: `
        <div class="nav-semana">
          <button class="redondo" data-semana="-7" aria-label="Semana anterior">${icone.voltar(18)}</button>
          <span>${diaMes(estado.segunda)} a ${diaMes(somarDias(estado.segunda, 6))}</span>
          <button class="redondo" data-semana="7" aria-label="Próxima semana">${icone.seta(18)}</button>
          ${estado.segunda !== segundaDaSemana() ? '<button class="link-mini" data-semana="hoje">voltar para hoje</button>' : ''}
          <span style="flex:1"></span>
          <button class="btn contorno" data-copiar>${icone.ideia(16)} Copiar para o Claude</button>
        </div>
        <div class="semana-grade">${r.dias.map((d) => `
          <div class="dia ${d.iso === hoje ? 'hoje' : ''} ${d.passou ? 'cheio' : ''}" data-dia="${d.iso}">
            <div class="dia-h"><b>${d.nome}</b><span>${diaMes(d.iso)}</span></div>
            ${d.minLivres != null ? `<small class="cap">${duracao(d.minAbertos)} / ${duracao(d.minLivres)}</small>${G.trilho(d.minLivres ? (d.minAbertos / d.minLivres) * 100 : (d.minAbertos ? 100 : 0), d.passou ? 'var(--neg-forte)' : 'var(--g4)')}` : ''}
            ${d.tarefas.map((t) => chipTarefa(t, hoje)).join('')}
            <button class="add-dia" data-novo-dia="${d.iso}" aria-label="Nova tarefa em ${d.nome}">${icone.soma(16)}</button>
          </div>`).join('')}</div>
        <small style="color:var(--soft)">No Mac, dá para arrastar as tarefas entre os dias. No iPhone, toque na tarefa e mude o dia.</small>` })}

    <div class="grade g-2">
      ${painel({ rot: 'Para encaixar', titulo: 'Sem dia <em>definido</em>',
        corpo: semDia.length
          ? `<div class="lista-tarefas" data-dia="">${semDia.map((t) => chipTarefa(t, hoje)).join('')}</div>`
          : '<div class="vazio">Nenhuma tarefa solta ✦</div>' })}
      ${painel({ rot: 'Dá para recusar · dá para delegar', titulo: 'Fora da <em>sua lista</em>',
        corpo: (recusadas.length || delegadas.length)
          ? `<div class="linhas">${[...recusadas, ...delegadas].map((t) => `
              <div class="linha"><span class="tx"><b>${esc(t.titulo)}</b><small>${t.status === 'recusada' ? 'recusada' : 'delegada'}${t.destino ? ` → ${esc(t.destino)}` : ''}</small></span>
              <button class="link-mini" data-voltar="${t.id}">trazer de volta</button></div>`).join('')}</div>`
          : '<div class="vazio">O que você recusar ou delegar aparece aqui.</div>' })}
    </div>

    ${painel({ rot: 'Todas as tarefas', titulo: 'Sua <em>lista</em>', corpo: listaTarefas(hoje) })}`;
}

function listaTarefas(hoje) {
  const filtros = [['abertas', 'Abertas'], ['atrasadas', 'Atrasadas'], ['feitas', 'Feitas'], ['todas', 'Todas']];
  let lista = T.todas();
  if (estado.filtro === 'abertas') lista = lista.filter((t) => t.status === 'aberta');
  if (estado.filtro === 'atrasadas') lista = T.atrasadas(hoje);
  if (estado.filtro === 'feitas') lista = lista.filter((t) => t.status === 'feita');
  lista.sort((a, b) => (a.dia || '9999').localeCompare(b.dia || '9999') || (b.importante ? 1 : 0) - (a.importante ? 1 : 0));
  return `
    <div class="filtros">${filtros.map(([v, n]) => `<button class="chip ${estado.filtro === v ? 'acc' : ''}" data-filtro="${v}">${n}</button>`).join('')}
      <span style="flex:1"></span><button class="btn pri" data-novo-dia="">${icone.soma(16)} Nova tarefa</button></div>
    ${lista.length ? `<div class="linhas">${lista.map((t) => `
      <div class="linha">
        <button class="caixa-chk ${t.status === 'feita' ? 'ok' : ''}" data-feita="${t.id}" aria-label="Concluir">${t.status === 'feita' ? icone.check(13) : ''}</button>
        <button class="tx" data-editar="${t.id}" style="text-align:left"><b style="${t.status === 'feita' ? 'text-decoration:line-through;color:var(--soft)' : ''}">${t.importante ? '<span class="imp">!</span> ' : ''}${esc(t.titulo)}</b>
          <small><span class="marca-area" style="display:inline-block;background:var(--area-${t.area})"></span> ${T.nomeArea(t.area)} · ${duracao(t.tempo)}${t.dia ? ` · ${diaMes(t.dia)}` : ' · sem dia'}${t.prazo ? ` · prazo ${diaMes(t.prazo)}` : ''}</small></button>
        ${T.atrasadas(hoje).includes(t) ? '<span class="chip neg">atrasada</span>' : ''}
      </div>`).join('')}</div>` : '<div class="vazio">Nada por aqui ✦</div>'}`;
}

function ligarSemana(el) {
  const acha = (id) => T.todas().find((t) => t.id === id);
  el.addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.feita) await T.alternarFeita(acha(b.dataset.feita));
    else if (b.dataset.editar) T.abrirTarefa(acha(b.dataset.editar));
    else if (b.dataset.novoDia !== undefined) T.abrirTarefa(null, { dia: b.dataset.novoDia || null });
    else if (b.dataset.horas !== undefined) T.abrirHorasLivres(estado.segunda);
    else if (b.dataset.filtro) { estado.filtro = b.dataset.filtro; redesenhar(); }
    else if (b.dataset.voltar) await T.moverPara(acha(b.dataset.voltar), null);
    else if (b.dataset.semana) {
      estado.segunda = b.dataset.semana === 'hoje' ? segundaDaSemana() : somarDias(estado.segunda, Number(b.dataset.semana));
      redesenhar();
    } else if (b.dataset.copiar !== undefined) {
      try { await navigator.clipboard.writeText(T.textoDaSemana(estado.segunda)); toast('Semana copiada. Cole no chat do Claude ✦'); }
      catch { toast('Não consegui copiar.'); }
    }
  });

  // No celular os dias rolam para o lado: começa mostrando o dia de hoje.
  const grade = el.querySelector('.semana-grade');
  const hojeCol = grade?.querySelector('.dia.hoje');
  if (grade && hojeCol && grade.scrollWidth > grade.clientWidth) grade.scrollLeft = hojeCol.offsetLeft - grade.offsetLeft;

  // Arrastar e soltar (Mac): tarefa → outro dia ou "sem dia"
  el.addEventListener('dragstart', (e) => {
    const c = e.target.closest('.tarefa');
    if (c) { e.dataTransfer.setData('text/plain', c.dataset.id); c.classList.add('arrastando'); }
  });
  el.addEventListener('dragend', (e) => e.target.closest?.('.tarefa')?.classList.remove('arrastando'));
  el.addEventListener('dragover', (e) => {
    const alvo = e.target.closest('[data-dia]');
    if (alvo) { e.preventDefault(); alvo.classList.add('sobre'); }
  });
  el.addEventListener('dragleave', (e) => e.target.closest?.('[data-dia]')?.classList.remove('sobre'));
  el.addEventListener('drop', async (e) => {
    const alvo = e.target.closest('[data-dia]');
    if (!alvo) return;
    e.preventDefault();
    const t = acha(e.dataTransfer.getData('text/plain'));
    if (t && (t.dia || '') !== alvo.dataset.dia) await T.moverPara(t, alvo.dataset.dia || null);
  });
}

/* =========================================================
   HÁBITOS (tracker do mês)
   ========================================================= */

function habitos() {
  const ym = estado.mes;
  const est = H.estatisticas(ym);
  const total = diasNoMes(ym);
  const ehAtual = ym === isoMes();
  const hojeIdx = ehAtual ? new Date().getDate() : -1;

  const linhas = est.porHabito.map(({ h, set, feitos }) => `
    <div class="habito">
      <div class="h"><button class="tx-hab" data-hab="${h.id}"><span class="marca-area" style="display:inline-block;background:${H.cor(h)}"></span> ${esc(h.nome)} <small style="color:var(--soft)">· ${H.textoFreq(h)}</small></button>
        <span>${feitos}/${est.ate} dias</span></div>
      <div class="pontos">${Array.from({ length: total }, (_, i) => {
        const d = i + 1, futuro = d > est.ate, feito = set.has(d);
        const iso = `${ym}-${String(d).padStart(2, '0')}`;
        return futuro
          ? '<i class="f"></i>'
          : `<button class="${d === hojeIdx ? 'hoje' : ''}" data-marcar="${h.id}" data-d="${iso}" style="${feito ? `background:${H.cor(h)}` : ''}" aria-label="${esc(h.nome)}, dia ${d}: ${feito ? 'feito' : 'não feito'}" aria-pressed="${feito}"></button>`;
      }).join('')}</div>
    </div>`).join('');

  return `
    <div class="grade g-3">
      ${kpi({ rot: 'Melhor sequência', valor: est.melhor?.sequencia ?? 0, unidade: est.melhor?.sequencia ? `dias · ${esc(est.melhor.h.nome.toLowerCase())}` : 'dias', classe: 'quente' })}
      ${kpi({ rot: 'Hábitos cumpridos', valor: `${Math.round(est.geral * 100)}%`, sub: 'no mês, considerando a frequência de cada um' })}
      ${kpi({ rot: 'Hoje', valor: est.hojeFeitos, unidade: `de ${est.porHabito.length}`, classe: 'verde' })}
    </div>

    ${painel({ rot: mesPorExtenso(ym), titulo: 'Tracker <em>de hábitos</em>',
      corpo: `
        <div class="nav-semana">
          <button class="redondo" data-mes="-1" aria-label="Mês anterior">${icone.voltar(18)}</button>
          <span>${mesPorExtenso(ym)}</span>
          <button class="redondo" data-mes="1" aria-label="Próximo mês" ${ehAtual ? 'disabled' : ''}>${icone.seta(18)}</button>
          <span style="flex:1"></span>
          <button class="btn pri" data-novo-hab>${icone.soma(16)} Novo hábito</button>
        </div>
        ${linhas || '<div class="vazio">Nenhum hábito ainda. Toque em “Novo hábito”.</div>'}
        ${linhas ? `<div class="escala">${[1, 5, 10, 15, 20, 25, total].map((d) => `<span style="left:${((d - 0.5) / total) * 100}%">${d}</span>`).join('')}</div>` : ''}
        <small style="color:var(--soft)">Toque numa bolinha para marcar ou desmarcar o dia. Toque no nome para editar ou criar um lembrete.</small>` })}

    ${H.descobertas(ym).map((t) => `<div class="dica"><span>${t}</span></div>`).join('')}`;
}

function ligarHabitos(el) {
  const acha = (id) => H.lista().find((h) => h.id === id);
  el.addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.marcar) await H.alternar(acha(b.dataset.marcar), b.dataset.d);
    else if (b.dataset.hab) H.abrirHabito(acha(b.dataset.hab));
    else if (b.dataset.novoHab !== undefined) H.abrirHabito();
    else if (b.dataset.mes) { estado.mes = somarMeses(estado.mes, Number(b.dataset.mes)); redesenhar(); }
  });
}

/* =========================================================
   METAS DO SEMESTRE (estrutura; chega numa próxima etapa)
   ========================================================= */
function metas() {
  const hoje = new Date();
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth() < 6 ? 0 : 6, 1);
  const semanaN = Math.min(26, Math.floor((hoje - inicio) / (7 * 86400000)) + 1);
  const pilares = [
    { nome: 'Carreira', cor: 'var(--g6)' }, { nome: 'Finanças', cor: 'var(--g4)' }, { nome: 'Saúde', cor: 'var(--g5)' },
    { nome: 'Relações', cor: 'var(--g2)' }, { nome: 'Lazer', cor: 'var(--g3)' }, { nome: 'Desenvolvimento', cor: 'var(--g7)' },
  ];
  const meses = hoje.getMonth() < 6 ? ['jan', 'fev', 'mar', 'abr', 'mai', 'jun'] : ['jul', 'ago', 'set', 'out', 'nov', 'dez'];
  return `
    ${painel({ rot: `Linha do semestre · semana ${semanaN} de 26`, titulo: `${hoje.getMonth() < 6 ? '1º' : '2º'} <em>semestre</em>`,
      corpo: `${G.semestre(semanaN)}<div class="meses-semestre">${meses.map((m) => `<span>${m}</span>`).join('')}</div>` })}
    <div class="grade g-2">
      ${painel({ rot: 'Visão geral', titulo: '',
        corpo: `<div class="radar-bloco" style="justify-content:center">
          ${G.radar(pilares.map((p) => ({ rotulo: p.nome, valor: 0 })), { tam: 220 })}
          <div><div class="rot">Progresso geral</div><div class="valor g">0%</div><small style="color:var(--soft)">faltam ${26 - semanaN} semanas</small></div>
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
