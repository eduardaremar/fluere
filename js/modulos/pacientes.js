/* =========================================================
   Fluere · módulo Pacientes
   Fichas (contato e cadastro, sem dados clínicos), pacotes de
   consultas e o botão "consulta feita". A agenda de consultas
   continua no Google Agenda/Calendário do iPhone: aqui só fica
   a data da PRÓXIMA consulta de cada paciente.

   Paciente (coleção "pacientes"):
     { nome, whatsapp, nascimento, origem, local, nota, arquivado,
       proxima: 'AAAA-MM-DD', proximaHora: 'HH:MM' }

   Pacote (coleção "pacotes"), aberto quando uma venda é lançada:
     { pacienteId, atendimentoId, tipo: 'avulsa' | 'tri' | 'sem',
       total, local, inicio, consultas: [{ data }] }
     avulsa = 1 consulta; trimestral e semestral = quantidade
     definida nas regras do consultório (padrão 3 e 4).
   ========================================================= */

import * as dados from '../nucleo/dados.js';
import * as avisos from '../nucleo/avisos.js';
import * as C from './consultorio.js';
import { abrirFolha, fecharFolha, toast, confirmar, icone } from '../nucleo/ui.js';
import { esc, normal, brl, isoDia, deIso, somarDias, segundaDaSemana, diasDaSemana, diaMes, NOMES_DIAS } from '../nucleo/util.js';

const COL = 'pacientes';
const COL_K = 'pacotes';
const PACOTES = ['avulsa', 'tri', 'sem'];

/* =========================================================
   LEITURA E CÁLCULOS
   ========================================================= */

export const todos = () => dados.lista(COL).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
export const ativos = () => todos().filter((p) => !p.arquivado);
export const pega = (id) => dados.pega(COL, id);

export const pacotesDe = (id) => dados.lista(COL_K).filter((k) => k.pacienteId === id)
  .sort((a, b) => (b.inicio || '').localeCompare(a.inicio || '') || (b.criadoEm || 0) - (a.criadoEm || 0));
const usadas = (k) => (k.consultas || []).length;
export const restante = (k) => Math.max(0, (Number(k.total) || 0) - usadas(k));
/** Pacotes com consultas a fazer, do mais antigo para o mais novo (o mais antigo é o consumido primeiro). */
export const pacotesAtivos = (id) => pacotesDe(id).filter((k) => restante(k) > 0).reverse();

const curtoTipo = (tipo) => C.TIPOS.find((t) => t.id === tipo)?.curto ?? tipo;
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

export const dataCurta = (iso) => `${NOMES_DIAS[(deIso(iso).getDay() + 6) % 7]}, ${diaMes(iso)}`;
const horaCurta = (h) => (!h ? '' : h.endsWith(':00') ? `${h.slice(0, 2)}h` : h.replace(':', 'h'));
const relativo = (iso, hoje = isoDia()) => (iso === hoje ? 'hoje' : iso === somarDias(hoje, 1) ? 'amanhã' : dataCurta(iso));

/** "2026-11-03" + "14:00" → "amanhã às 14h" */
export function proximaTexto(p, hoje = isoDia()) {
  if (!p.proxima) return '';
  return `${relativo(p.proxima, hoje)}${p.proximaHora ? ` às ${horaCurta(p.proximaHora)}` : ''}`;
}

function idadeDe(nasc, ref = new Date()) {
  if (!nasc) return null;
  const d = deIso(nasc);
  let i = ref.getFullYear() - d.getFullYear();
  if (ref.getMonth() < d.getMonth() || (ref.getMonth() === d.getMonth() && ref.getDate() < d.getDate())) i--;
  return i;
}

/** Como está o paciente agora. */
export function situacao(p, hoje = isoDia()) {
  const ks = pacotesAtivos(p.id);
  const k = ks[0] ?? null;
  const restantes = ks.reduce((s, x) => s + restante(x), 0);
  return {
    k, ativo: !!k, restantes,
    acabando: !!k && restantes === 1 && Number(k.total) > 1,
    semProxima: !!k && !p.proxima,
    passada: !!k && !!p.proxima && p.proxima < hoje,
  };
}

export function resumo(hoje = isoDia()) {
  const lista = ativos().map((p) => ({ p, s: situacao(p, hoje) }));
  return {
    lista,
    ativos: lista.filter((x) => x.s.ativo).length,
    acabando: lista.filter((x) => x.s.acabando).length,
    semProxima: lista.filter((x) => x.s.semProxima).length,
    aniversarios: aniversarios(hoje).length,
  };
}

/** Aniversariantes da semana (segunda a domingo) em que o dia dado cai. */
export function aniversarios(ref = isoDia()) {
  const dias = diasDaSemana(segundaDaSemana(ref));
  const porDia = new Map(dias.map((d) => [d.slice(5), d]));
  return ativos().filter((p) => p.nascimento && porDia.has(p.nascimento.slice(5)))
    .map((p) => { const dia = porDia.get(p.nascimento.slice(5)); return { p, dia, idade: Number(dia.slice(0, 4)) - Number(p.nascimento.slice(0, 4)) }; })
    .sort((a, b) => a.dia.localeCompare(b.dia));
}

/** Pacientes com consulta marcada para o dia, por hora. */
export const doDia = (iso = isoDia()) => ativos().filter((p) => p.proxima === iso)
  .sort((a, b) => (a.proximaHora || '99').localeCompare(b.proximaHora || '99'));

/** Próximas consultas marcadas (de hoje em diante). */
export const proximas = (hoje = isoDia()) => ativos().filter((p) => p.proxima && p.proxima >= hoje)
  .sort((a, b) => a.proxima.localeCompare(b.proxima) || (a.proximaHora || '').localeCompare(b.proximaHora || ''));

/** Vendas e pagamentos ligados ao paciente (pelo id ou, nas antigas, pelo nome). */
export const pagamentosDe = (p) => C.todos()
  .filter((a) => a.pacienteId === p.id || (!a.pacienteId && normal(a.paciente) === normal(p.nome)))
  .sort((a, b) => (b.data || '').localeCompare(a.data || ''));

export const irFicha = (id) => `#/pacientes/ficha/${id}`;

/* ---------- avisos ---------- */

export function pendencias(hoje = isoDia()) {
  const out = [];
  for (const { p, s } of resumo(hoje).lista) {
    const nome = `<strong>${esc(p.nome)}</strong>`;
    if (s.passada) out.push({ id: `pac-passada-${p.id}`, tipo: 'warn', prioridade: 7, irPara: irFicha(p.id), texto: `${nome} tinha consulta em ${dataCurta(p.proxima)}. Marque como feita.` });
    else if (s.semProxima) out.push({ id: `pac-retorno-${p.id}`, tipo: 'warn', prioridade: 6, irPara: irFicha(p.id), texto: usadas(s.k) ? `Marcar o retorno de ${nome} (${usadas(s.k)} de ${s.k.total} consultas feitas).` : `Marcar a 1ª consulta de ${nome}.` });
    if (s.acabando) out.push({ id: `pac-acabando-${p.id}`, tipo: 'info', prioridade: 4, irPara: irFicha(p.id), texto: `O pacote de ${nome} está na última consulta. Hora de oferecer a renovação.` });
  }
  for (const a of aniversarios(hoje)) {
    out.push({ id: `pac-aniv-${a.p.id}`, tipo: 'ok', prioridade: a.dia === hoje ? 5 : 3, irPara: irFicha(a.p.id), texto: `Aniversário de <strong>${esc(a.p.nome)}</strong> ${a.dia === hoje ? 'hoje' : `(${dataCurta(a.dia)})`} · ${a.idade} anos.` });
  }
  return out;
}
avisos.registrar('pacientes', () => pendencias());

/* =========================================================
   MUDANÇAS NOS DADOS
   ========================================================= */

/** Abre o pacote de consultas de uma venda. */
async function abrirPacote(a) {
  const total = C.regras(String(a.data).slice(0, 7)).consultas[a.tipo] || 1;
  await dados.salva(COL_K, { pacienteId: a.pacienteId, atendimentoId: a.id, tipo: a.tipo, total, local: a.local, inicio: a.data, consultas: [] });
  return total;
}

// Venda nova ligada a um paciente → abre o pacote automaticamente.
C.aoNovoAtendimento(async (a) => {
  if (!a.pacienteId || !PACOTES.includes(a.tipo)) return '';
  if (dados.lista(COL_K).some((k) => k.atendimentoId === a.id)) return '';
  const total = await abrirPacote(a);
  return `Venda lançada ✦ Pacote de ${plural(total, 'consulta', 'consultas')} aberto para ${pega(a.pacienteId)?.nome ?? 'o paciente'}.`;
});

/** Registra uma consulta no pacote mais antigo ainda aberto. Devolve o pacote atualizado. */
export async function registrarConsulta(p, { data, proxima, hora }) {
  const k = pacotesAtivos(p.id)[0];
  if (!k) return null;
  const novo = await dados.salva(COL_K, { ...k, consultas: [...(k.consultas || []), { data }] });
  await dados.salva(COL, { ...p, proxima: proxima || '', proximaHora: proxima ? (hora || '') : '' });
  return novo;
}

/** Tira a última consulta registrada (a do pacote mexido por último). */
async function desfazerUltima(p) {
  const k = pacotesDe(p.id).filter((x) => usadas(x)).sort((a, b) => (b.atualizadoEm || 0) - (a.atualizadoEm || 0))[0];
  if (!k) return;
  await dados.salva(COL_K, { ...k, consultas: k.consultas.slice(0, -1) });
}

/* =========================================================
   PEÇAS DE FORMULÁRIO
   ========================================================= */

const inicial = (p) => esc((p.nome || '?').trim().charAt(0).toUpperCase());

/** Folha com busca para escolher um paciente. */
function escolherPaciente({ titulo, sub = '', aoEscolher, soComPacote = false }) {
  const f = abrirFolha(`
    <h3>${titulo}</h3>
    ${sub ? `<p class="sub">${sub}</p>` : ''}
    <div id="esc-pac">
      <input class="busca" type="search" id="esc-q" placeholder="Buscar paciente" autocomplete="off" autofocus style="margin-bottom:12px">
      <div id="esc-lista"></div>
      <div class="acts" style="margin-top:14px"><button type="button" class="btn sec" data-fechar>Cancelar</button></div>
    </div>`);
  const raiz = f.querySelector('#esc-pac');
  const pintar = () => {
    const q = normal(raiz.querySelector('#esc-q').value.trim());
    const itens = ativos().map((p) => ({ p, s: situacao(p) }))
      .filter(({ p, s }) => (!soComPacote || s.ativo) && (!q || normal(p.nome).includes(q)))
      .sort((a, b) => Number(b.s.ativo) - Number(a.s.ativo));
    raiz.querySelector('#esc-lista').innerHTML = itens.length
      ? `<div class="lista">${itens.map(({ p, s }) => `
          <button type="button" class="item" data-id="${p.id}">
            <span class="ic">${inicial(p)}</span>
            <span class="tx"><b>${esc(p.nome)}</b><small>${s.ativo ? `${curtoTipo(s.k.tipo)} · ${usadas(s.k)} de ${s.k.total}` : 'sem pacote ativo'}</small></span>
            <span class="seta">${icone.seta()}</span>
          </button>`).join('')}</div>`
      : `<div class="vazio">${ativos().length ? 'Ninguém encontrado.' : 'Nenhum paciente cadastrado ainda.'}</div>`;
  };
  raiz.querySelector('#esc-q').addEventListener('input', pintar);
  raiz.addEventListener('click', (e) => {
    const b = e.target.closest('[data-id]');
    if (b) aoEscolher(b.dataset.id);
  });
  raiz.querySelector('[data-fechar]').onclick = fecharFolha;
  pintar();
}

/* =========================================================
   FORMULÁRIO DO PACIENTE
   ========================================================= */

export function abrirPaciente(p = null, { depois } = {}) {
  const novo = !p;
  const a = p ? { ...p } : { nome: '', whatsapp: '', nascimento: '', origem: '', local: '', nota: '' };
  const f = abrirFolha(`
    <h3>${novo ? 'Novo' : 'Editar'} <em>paciente</em></h3>
    <form id="f-pac" novalidate>
      <div class="fld"><label for="p-nome">Nome</label>
        <input id="p-nome" value="${esc(a.nome)}" placeholder="Nome e sobrenome" autocomplete="off" autofocus></div>
      <div class="par">
        <div class="fld"><label for="p-zap">WhatsApp</label><input id="p-zap" type="tel" inputmode="tel" value="${esc(a.whatsapp)}" placeholder="(41) 90000-0000" autocomplete="off"></div>
        <div class="fld"><label for="p-nasc">Nascimento</label><input id="p-nasc" type="date" value="${esc(a.nascimento)}"></div>
      </div>
      <div class="fld"><label for="p-origem">Como chegou até você</label>
        <input id="p-origem" list="p-origens" value="${esc(a.origem)}" placeholder="Instagram, indicação…" autocomplete="off">
        <datalist id="p-origens"><option value="Instagram"><option value="Indicação"><option value="Google"><option value="TikTok"><option value="Clínica"><option value="Outro"></datalist></div>
      <div class="fld"><span class="l">Onde costuma atender</span>
        <div class="opcoes" id="p-local">${C.LOCAIS.map((l) => `<button type="button" data-v="${l.id}" aria-pressed="${l.id === a.local}">${l.nome}</button>`).join('')}</div></div>
      <div class="fld"><label for="p-nota">Anotação</label><input id="p-nota" value="${esc(a.nota)}" placeholder="Só informações de cadastro, nada clínico" autocomplete="off"></div>
      <div class="erro" id="p-erro" role="alert"></div>
      ${novo ? '' : `<div class="opcoes acoes-tarefa">
        <button type="button" data-acao="arquivar">${a.arquivado ? 'Reativar paciente' : 'Arquivar paciente'}</button>
        <button type="button" data-acao="apagar" class="perigo">Apagar paciente</button></div>`}
      <div class="acts"><button type="button" class="btn sec" data-fechar>Cancelar</button><button type="submit" class="btn pri">Salvar</button></div>
    </form>`);
  const $ = (s) => f.querySelector(s);
  const volta = (id) => (depois ? depois(id) : fecharFolha());

  $('#p-local').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-v]');
    if (!b) return;
    const ligado = b.getAttribute('aria-pressed') === 'true';
    $('#p-local').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b && !ligado)));
  });
  $('[data-fechar]').onclick = () => (novo ? fecharFolha() : volta(p.id));

  $('#f-pac').onsubmit = async (ev) => {
    ev.preventDefault();
    const nome = $('#p-nome').value.trim();
    if (!nome) { $('#p-erro').textContent = 'Digite o nome do paciente.'; $('#p-nome').focus(); return; }
    const salvo = await dados.salva(COL, {
      ...a, nome,
      whatsapp: $('#p-zap').value.trim(), nascimento: $('#p-nasc').value, origem: $('#p-origem').value.trim(),
      local: $('#p-local [aria-pressed="true"]')?.dataset.v ?? '', nota: $('#p-nota').value.trim(),
    });
    toast(novo ? 'Paciente cadastrado ✦' : 'Ficha salva.');
    abrirFicha(salvo.id);
  };

  f.querySelector('[data-acao="arquivar"]')?.addEventListener('click', async () => {
    await dados.salva(COL, { ...a, arquivado: !a.arquivado });
    toast(a.arquivado ? 'Paciente reativado.' : 'Paciente arquivado. Os dados continuam guardados.');
    fecharFolha();
  });
  f.querySelector('[data-acao="apagar"]')?.addEventListener('click', async () => {
    fecharFolha();
    if (await confirmar({ titulo: 'Apagar paciente?', texto: `${esc(a.nome)} e os pacotes de consultas serão apagados. As vendas lançadas no financeiro continuam.`, ok: 'Apagar', perigo: true })) {
      for (const k of pacotesDe(a.id)) await dados.apaga(COL_K, k.id);
      await dados.apaga(COL, a.id);
      toast('Paciente apagado.');
    }
  });
}

/* =========================================================
   PRÓXIMA CONSULTA
   ========================================================= */

export function abrirProxima(id) {
  const p = pega(id);
  if (!p) return;
  const f = abrirFolha(`
    <h3>Próxima <em>consulta</em></h3>
    <p class="sub">${esc(p.nome)} · marcada junto com o paciente. Ela também aparece no painel Hoje.</p>
    <form id="f-prox" novalidate>
      <div class="par">
        <div class="fld"><label for="x-data">Dia</label><input id="x-data" type="date" value="${esc(p.proxima || '')}" autofocus></div>
        <div class="fld"><label for="x-hora">Hora</label><input id="x-hora" type="time" value="${esc(p.proximaHora || '')}"></div>
      </div>
      <div class="opcoes acoes-tarefa">${p.proxima ? '<button type="button" data-acao="limpar">Tirar a marcação</button>' : ''}</div>
      <div class="acts"><button type="button" class="btn sec" data-fechar>Cancelar</button><button type="submit" class="btn pri">Salvar</button></div>
    </form>`);
  const $ = (s) => f.querySelector(s);
  $('[data-fechar]').onclick = () => abrirFicha(id);
  $('#f-prox').onsubmit = async (ev) => {
    ev.preventDefault();
    const dia = $('#x-data').value;
    await dados.salva(COL, { ...p, proxima: dia, proximaHora: dia ? $('#x-hora').value : '' });
    toast(dia ? 'Próxima consulta marcada ✦' : 'Marcação retirada.');
    abrirFicha(id);
  };
  f.querySelector('[data-acao="limpar"]')?.addEventListener('click', async () => {
    await dados.salva(COL, { ...p, proxima: '', proximaHora: '' });
    toast('Marcação retirada.');
    abrirFicha(id);
  });
}

/* =========================================================
   CONSULTA FEITA
   ========================================================= */

/** Sem `id`, primeiro pergunta de qual paciente foi a consulta. */
export function abrirConsultaFeita(id = null) {
  if (!id) {
    escolherPaciente({ titulo: 'Consulta <em>feita</em>', sub: 'De quem foi a consulta?', aoEscolher: (pid) => abrirConsultaFeita(pid) });
    return;
  }
  const p = pega(id);
  if (!p) return;
  const hoje = isoDia();
  const s = situacao(p, hoje);

  if (!s.ativo) {
    const f = abrirFolha(`
      <h3>Consulta <em>feita</em></h3>
      <p class="sub"><strong>${esc(p.nome)}</strong> não tem pacote com consultas a fazer. Primeiro lance a venda (consulta avulsa ou acompanhamento): o pacote abre sozinho.</p>
      <div class="acts"><button type="button" class="btn sec" data-fechar>Voltar</button><button type="button" class="btn pri" data-vender>Lançar venda</button></div>`);
    f.querySelector('[data-fechar]').onclick = () => abrirFicha(id);
    f.querySelector('[data-vender]').onclick = () => venderPara(p);
    return;
  }

  const k = s.k;
  const ultima = restante(k) === 1;
  const f = abrirFolha(`
    <h3>Consulta <em>feita</em></h3>
    <p class="sub"><strong>${esc(p.nome)}</strong> · ${curtoTipo(k.tipo)} · vai ficar <strong>${usadas(k) + 1} de ${k.total}</strong>.</p>
    <form id="f-cf" novalidate>
      <div class="fld"><label for="cf-data">Data da consulta</label><input id="cf-data" type="date" value="${p.proxima && p.proxima <= hoje ? p.proxima : hoje}"></div>
      ${ultima
        ? '<div class="alert ok"><span class="d"></span><div>Esta é a <strong>última consulta</strong> do pacote. Depois dela, ofereça a renovação.</div></div>'
        : `<div class="par">
            <div class="fld"><label for="cf-prox">Próxima consulta</label><input id="cf-prox" type="date"></div>
            <div class="fld"><label for="cf-hora">Hora</label><input id="cf-hora" type="time"></div>
          </div>
          <p class="sub" style="margin-top:-6px">Preencha se já marcou com o paciente. Pode deixar em branco.</p>`}
      <div class="acts"><button type="button" class="btn sec" data-fechar>Cancelar</button><button type="submit" class="btn pri">Registrar</button></div>
    </form>`);
  const $ = (q) => f.querySelector(q);
  $('[data-fechar]').onclick = () => abrirFicha(id);
  $('#f-cf').onsubmit = async (ev) => {
    ev.preventDefault();
    const feito = await registrarConsulta(p, {
      data: $('#cf-data').value || hoje,
      proxima: ultima ? '' : $('#cf-prox').value,
      hora: ultima ? '' : $('#cf-hora').value,
    });
    toast(feito && restante(feito) === 0 ? 'Pacote concluído ✦ Hora de oferecer a renovação.' : `Consulta registrada ✦ ${usadas(feito)} de ${feito.total}.`);
    abrirFicha(id);
  };
}

/** Abre o lançamento de venda já com o paciente preenchido. */
function venderPara(p) {
  fecharFolha();
  setTimeout(() => C.abrirAtendimento(null, {
    prefill: { paciente: p.nome, pacienteId: p.id, ...(p.local ? { local: p.local } : {}) },
    aoSalvar: () => setTimeout(() => abrirFicha(p.id), 300),
  }), 260);
}

/* =========================================================
   FICHA
   ========================================================= */

export function abrirFicha(id) {
  const p = pega(id);
  if (!p) return;
  const hoje = isoDia();
  const s = situacao(p, hoje);
  const idade = idadeDe(p.nascimento);
  const pagamentos = pagamentosDe(p);
  const pacotes = pacotesDe(id);
  const semPacote = (a) => PACOTES.includes(a.tipo) && !dados.lista(COL_K).some((k) => k.atendimentoId === a.id);
  const digitos = String(p.whatsapp || '').replace(/\D/g, '');
  const zap = digitos.length >= 10 ? `https://wa.me/${digitos.length <= 11 ? '55' : ''}${digitos}` : '';
  const temConsulta = pacotes.some((k) => usadas(k));

  const bolinhas = (k) => `<div class="bolinhas">${Array.from({ length: Number(k.total) || 0 }, (_, i) =>
    `<span class="${i < usadas(k) ? 'on' : ''}" title="${(k.consultas || [])[i]?.data ? diaMes(k.consultas[i].data) : ''}">${i < usadas(k) ? icone.check(13) : i + 1}</span>`).join('')}</div>`;

  const f = abrirFolha(`
    <div id="ficha">
      <h3>${esc(p.nome)}</h3>
      <div class="chips" style="margin-bottom:14px">
        ${p.local ? `<span class="chip">${esc(C.nomeLocal(p.local))}</span>` : ''}
        ${idade != null ? `<span class="chip">${plural(idade, 'ano', 'anos')}</span>` : ''}
        ${p.origem ? `<span class="chip">veio por ${esc(p.origem)}</span>` : ''}
        ${p.arquivado ? '<span class="chip neg">arquivado</span>' : ''}
      </div>
      ${p.whatsapp || p.nascimento ? `<p class="sub" style="margin-bottom:12px">${[p.whatsapp && esc(p.whatsapp), p.nascimento && `nascimento ${p.nascimento.split('-').reverse().join('/')}`].filter(Boolean).join(' · ')}</p>` : ''}
      ${p.nota ? `<p class="sub" style="margin-top:-6px">${esc(p.nota)}</p>` : ''}

      <div class="ficha-bloco">
        <div class="rot">Próxima consulta</div>
        <div class="ficha-linha"><b>${p.proxima ? `${proximaTexto(p, hoje)}${p.proxima < hoje ? ' · já passou' : ''}` : 'Nada marcada'}</b>
          <button type="button" class="link-mini" data-acao="proxima">${p.proxima ? 'Alterar' : 'Marcar'}</button></div>
      </div>

      <div class="ficha-bloco">
        <div class="rot">Pacote em andamento</div>
        ${s.ativo ? `
          <div class="ficha-linha"><b>${C.nomeTipo(s.k.tipo)} · ${usadas(s.k)} de ${s.k.total}</b>
            <span class="chip ${s.acabando ? 'mid' : ''}">${s.restantes === 1 ? 'falta 1 consulta' : `faltam ${s.restantes}`}</span></div>
          ${bolinhas(s.k)}
          <button type="button" class="btn pri" data-acao="feita" style="width:100%;margin-top:12px">${icone.check(16)} Consulta feita</button>`
          : '<div class="vazio" style="text-align:left;padding:4px 0">Sem pacote com consultas a fazer.</div>'}
      </div>

      <div class="opcoes" style="margin:0 0 18px">
        <button type="button" data-acao="vender">${icone.soma(14)} Vender pacote ou consulta</button>
        ${zap ? `<a class="botao-link" href="${zap}" target="_blank" rel="noopener">WhatsApp</a>` : ''}
        <button type="button" data-acao="editar">Editar dados</button>
      </div>

      <div class="ficha-bloco">
        <div class="rot">Pagamentos</div>
        ${pagamentos.length ? `<div class="linhas">${pagamentos.map((a) => `
          <div class="linha">
            <button type="button" class="tx" data-at="${a.id}"><b>${esc(curtoTipo(a.tipo))} · ${brl(a.valor)}</b><small>${diaMes(a.data)} · ${esc(C.nomeForma(a.forma))}</small></button>
            ${semPacote(a) ? `<button type="button" class="link-mini" data-abrir-pacote="${a.id}">Abrir pacote</button>` : ''}
            ${C.aReceberDe(a) > 0 ? `<span class="chip neg">a receber ${brl(C.aReceberDe(a))}</span>` : '<span class="chip pos">pago</span>'}
          </div>`).join('')}</div>` : '<div class="vazio" style="text-align:left;padding:4px 0">Nenhuma venda lançada para este paciente.</div>'}
      </div>

      ${pacotes.length ? `<div class="ficha-bloco">
        <div class="rot">Todos os pacotes</div>
        <div class="linhas">${pacotes.map((k) => `
          <div class="linha"><span class="tx"><b>${C.nomeTipo(k.tipo)}</b>
            <small>${usadas(k)} de ${k.total} consultas${(k.consultas || []).length ? ` · ${k.consultas.map((c) => diaMes(c.data)).join(', ')}` : ''}</small></span>
            <span class="chip ${restante(k) ? '' : 'pos'}">${restante(k) ? 'em andamento' : 'concluído'}</span>
            <button type="button" class="link-mini" data-rm-pacote="${k.id}">remover</button></div>`).join('')}</div>
        ${temConsulta ? '<button type="button" class="link-mini" data-acao="desfazer" style="margin-top:10px">Desfazer a última consulta registrada</button>' : ''}
      </div>` : ''}

      <div class="acts"><button type="button" class="btn sec" data-fechar>Fechar</button></div>
    </div>`);

  const raiz = f.querySelector('#ficha');
  raiz.querySelector('[data-fechar]').onclick = fecharFolha;
  raiz.addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const acao = b.dataset.acao;
    if (acao === 'proxima') abrirProxima(id);
    else if (acao === 'feita') abrirConsultaFeita(id);
    else if (acao === 'vender') venderPara(p);
    else if (acao === 'editar') abrirPaciente(p, { depois: abrirFicha });
    else if (acao === 'desfazer') {
      if (await confirmar({ titulo: 'Desfazer a última consulta?', texto: 'A consulta volta a ficar pendente no pacote.', ok: 'Desfazer' })) { await desfazerUltima(p); toast('Consulta desfeita.'); }
      abrirFicha(id);
    } else if (b.dataset.at) {
      const at = C.todos().find((x) => x.id === b.dataset.at);
      fecharFolha();
      if (at) setTimeout(() => C.abrirAtendimento(at), 260);
    } else if (b.dataset.abrirPacote) {
      const at = C.todos().find((x) => x.id === b.dataset.abrirPacote);
      if (!at) return;
      const ligado = at.pacienteId === id ? at : await dados.salva('atendimentos', { ...at, pacienteId: id });
      await abrirPacote(ligado);
      toast('Pacote aberto ✦');
      abrirFicha(id);
    } else if (b.dataset.rmPacote) {
      if (await confirmar({ titulo: 'Remover este pacote?', texto: 'Some o controle de consultas dele. A venda continua no financeiro.', ok: 'Remover', perigo: true })) {
        await dados.apaga(COL_K, b.dataset.rmPacote);
        toast('Pacote removido.');
      }
      abrirFicha(id);
    }
  });
}

/** Lista para "+ Novo → Consulta feita". */
export const novaConsultaFeita = () => abrirConsultaFeita();
