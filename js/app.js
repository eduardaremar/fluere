/* =========================================================
   Fluere · app
   Liga tudo: pede a senha, carrega os dados, desenha o menu
   (lateral no Mac, barra de baixo no iPhone), troca de tela
   conforme o endereço (#/hoje, #/dinheiro…), cuida do botão
   "+ Novo" e do bloqueio automático.

   Para acrescentar uma tela nova:
   1. crie js/telas/minha-tela.js com `export function desenhar(el, partes) {}`
   2. registre em TELAS (barra de baixo) ou como parte de "Mais"
      (js/telas/mais.js) e, se quiser, no MENU_LATERAL.
   ========================================================= */

import * as dados from './nucleo/dados.js';
import * as cofre from './nucleo/cofre.js';
import * as avisos from './nucleo/avisos.js';
import * as backup from './nucleo/backup.js';
import * as nuvem from './nucleo/sincronia.js';
import { abrirFolha, fecharFolha, folhaAberta, toast, icone, areaLimpa } from './nucleo/ui.js';
import { pref, diasDesde } from './nucleo/util.js';
import { pedirSenha } from './telas/bloqueio.js';
import * as hoje from './telas/hoje.js';
import * as dinheiro from './telas/dinheiro.js';
import * as pacientes from './telas/pacientes.js';
import * as rotina from './telas/rotina.js';
import * as mais from './telas/mais.js';
import * as T from './modulos/tarefas.js';
import * as H from './modulos/habitos.js';
import * as C from './modulos/consultorio.js';
import * as S from './modulos/gastos.js';
import * as P from './modulos/pacientes.js';
import './modulos/trabalhos.js';
import * as Pe from './modulos/pecas.js';

/* ---------- telas da barra de baixo (celular) ---------- */
const TELAS = [
  { rota: 'hoje', nome: 'Hoje', icone: icone.hoje, modulo: hoje },
  { rota: 'dinheiro', nome: 'Dinheiro', icone: icone.dinheiro, modulo: dinheiro },
  { rota: 'pacientes', nome: 'Pacientes', icone: icone.pacientes, modulo: pacientes },
  { rota: 'rotina', nome: 'Rotina', icone: icone.rotina, modulo: rotina },
  { rota: 'mais', nome: 'Mais', icone: icone.mais, modulo: mais },
];

/* ---------- menu lateral (Mac): os mesmos lugares, agrupados ---------- */
const MENU_LATERAL = [
  { grupo: 'Meu dia', itens: [
    { nome: 'Hoje', href: '#/hoje', icone: icone.hoje },
    { nome: 'Rotina', href: '#/rotina', icone: icone.rotina },
  ] },
  { grupo: 'Consultório', itens: [
    { nome: 'Pacientes', href: '#/pacientes', icone: icone.pacientes },
    { nome: 'Dinheiro', href: '#/dinheiro', icone: icone.dinheiro },
  ] },
  { grupo: 'Frentes', itens: [
    { nome: 'Conteúdo', href: '#/mais/conteudo', icone: icone.conteudo },
    { nome: 'Trabalhos', href: '#/mais/trabalhos', icone: icone.trabalho },
    { nome: 'Estudos', href: '#/mais/estudos', icone: icone.estudos },
  ] },
  { grupo: 'Organização', itens: [
    { nome: 'Vencimentos', href: '#/mais/vencimentos', icone: icone.vencimentos },
    { nome: 'Revisão semanal', href: '#/mais/revisao', icone: icone.revisao },
    { nome: 'Ajustes e backup', href: '#/mais/ajustes', icone: icone.ajustes },
  ] },
];

/* ---------- itens do botão "+ Novo" ---------- */
// Só aparecem os atalhos que já funcionam. Quando um módulo novo ficar
// pronto, acrescente aqui um item com a função que abre o formulário dele.
const NOVOS = [
  { nome: 'Atendimento', desc: 'Consulta ou acompanhamento vendido', icone: icone.atendimento, abrir: () => C.abrirAtendimento() },
  { nome: 'Consulta feita', desc: 'Atualiza o pacote do paciente', icone: icone.consulta, abrir: () => P.abrirConsultaFeita() },
  { nome: 'Paciente', desc: 'Nova ficha de cadastro', icone: icone.pacientes, abrir: () => P.abrirPaciente() },
  { nome: 'Ideia de conteúdo', desc: 'Captura rápida para a caixinha', icone: icone.ideia, abrir: () => Pe.abrirIdeia() },
  { nome: 'Gasto', desc: 'CPF ou CNPJ, à vista ou parcelado', icone: icone.gasto, abrir: () => S.abrirGasto() },
  { nome: 'Tarefa', desc: 'Com área, dia, prazo e tempo', icone: icone.tarefa, abrir: () => T.abrirTarefa() },
  { nome: 'Hábito', desc: 'Todo dia ou algumas vezes por semana', icone: icone.revisao, abrir: () => H.abrirHabito() },
];

const $ = (id) => document.getElementById(id);
let pararDeOuvir = null;

/* ---------- navegação ---------- */

function rotaAtual() {
  const partes = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const tela = TELAS.find((t) => t.rota === partes[0]) || TELAS[0];
  return { tela, partes: partes.slice(1) };
}

function desenharMenus() {
  const { tela } = rotaAtual();
  const hash = location.hash || '#/hoje';

  $('tabbar').innerHTML = `<div class="in">${TELAS.map((t) =>
    `<a href="#/${t.rota}" ${t === tela ? 'aria-current="page"' : ''}><span class="tb-ic">${t.icone(22)}</span><span>${t.nome}</span></a>`).join('')}</div>`;

  // No menu lateral, fica marcado o item cujo endereço é o começo do endereço atual.
  const todos = MENU_LATERAL.flatMap((g) => g.itens);
  const ativo = todos.filter((i) => hash.startsWith(i.href)).sort((a, b) => b.href.length - a.href.length)[0];
  const qtdAvisos = avisos.todos().length;
  $('lateral').innerHTML = `
    <a class="logo" href="#/hoje"><img class="logo-img logo-claro" src="icones/logo.png" alt="Fluere · Gestão pessoal"><img class="logo-img logo-escuro" src="icones/logo-escuro.png" alt="Fluere · Gestão pessoal"></a>
    ${MENU_LATERAL.map((g) => `
      <div class="grupo">${g.grupo}</div>
      ${g.itens.map((i) => `<a class="nav-item" href="${i.href}" ${i === ativo ? 'aria-current="page"' : ''}>${i.icone(20)}<span>${i.nome}</span>${i.href === '#/hoje' && qtdAvisos ? '<span class="bolinha" aria-label="Há avisos"></span>' : ''}</a>`).join('')}`).join('')}
    <div class="rodape">
      <div class="perfil">
        <span class="av">E</span>
        <div><b>Eduarda Remar</b><small>Nutricionista</small></div>
        <button data-global="bloquear" aria-label="Bloquear">${icone.cadeado(18)}</button>
      </div>
    </div>`;
}

function desenharTela() {
  if (!cofre.estaAberto()) return;
  const { tela, partes } = rotaAtual();
  const el = areaLimpa($('tela'));
  tela.modulo.desenhar(el, partes);
  desenharMenus();
}

function aoMudarRota() {
  fecharFolha();
  desenharTela();
  window.scrollTo(0, 0);
}

/* ---------- botão "+ Novo" ---------- */

function abrirNovo() {
  const f = abrirFolha(`
    <h3>O que você quer <em>lançar?</em></h3>
    <div class="lista">${NOVOS.map((n, i) => `
      <button class="item" data-i="${i}">
        <span class="ic">${n.icone(20)}</span>
        <span class="tx"><b>${n.nome}</b><small>${n.desc}</small></span>
        <span class="seta">${icone.seta()}</span>
      </button>`).join('')}</div>`);
  f.querySelectorAll('[data-i]').forEach((b) => b.addEventListener('click', () => {
    fecharFolha();
    setTimeout(NOVOS[b.dataset.i].abrir, 260);
  }));
}

/* ---------- avisos da fundação ---------- */

avisos.registrar('backup', () => {
  const ultimo = backup.ultimo();
  const temDados = Object.keys(dados.contagem()).length > 0;
  if (!ultimo && !temDados) return [];
  if (!ultimo) return [{ id: 'backup', tipo: 'warn', prioridade: 5, irPara: '#/mais/ajustes', texto: 'Você ainda não fez nenhum backup. Toque para fazer agora.' }];
  const dias = diasDesde(ultimo);
  if (dias >= 7) return [{ id: 'backup', tipo: 'warn', prioridade: 5, irPara: '#/mais/ajustes', texto: `Seu último backup foi há <strong>${dias} dias</strong>. Toque para fazer um novo.` }];
  return [];
});

/* ---------- abrir e bloquear ---------- */

function mostrarMenus(sim) {
  $('tabbar').hidden = !sim;
  $('lateral').hidden = !sim;
  $('fab').hidden = !sim;
}

async function abrirSistema() {
  mostrarMenus(false);
  await pedirSenha();
  await dados.carregar();
  mostrarMenus(true);
  pararDeOuvir = dados.ouvir(() => desenharTela());
  desenharTela();
  nuvem.iniciar();
}

function bloquear() {
  if (!cofre.estaAberto()) return;
  fecharFolha();
  pararDeOuvir?.();
  nuvem.parar();
  cofre.fechar();
  dados.esquecer();
  $('tela').innerHTML = '';
  abrirSistema();
}

// Bloqueio automático: se o app ficar em segundo plano por mais tempo que o escolhido.
let saiuEm = null;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { saiuEm = Date.now(); return; }
  const minutos = pref.ler('bloqueioMin', 5);
  if (saiuEm && minutos > 0 && Date.now() - saiuEm >= minutos * 60000) bloquear();
  saiuEm = null;
});

window.addEventListener('fluere:bloquear', bloquear);

/* ---------- eventos gerais ---------- */

window.addEventListener('hashchange', aoMudarRota);
$('fab').innerHTML = `${icone.soma(18)} Novo`;
$('fab').addEventListener('click', abrirNovo);
$('scrim').addEventListener('click', fecharFolha);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && folhaAberta()) fecharFolha(); });

document.addEventListener('click', (e) => {
  // Avisos e cartões que levam para outra tela (data-ir="#/rota")
  const alvo = e.target.closest('[data-ir]');
  if (alvo) { location.hash = alvo.dataset.ir; return; }
  // Botões presentes em várias telas (ex.: cadeado do cabeçalho)
  const g = e.target.closest('[data-global]');
  if (g?.dataset.global === 'bloquear') bloquear();
});

/* ---------- funcionar sem internet (service worker) ---------- */
// No Mac (localhost) o modo offline fica desligado: assim você sempre vê a versão mais nova.
const local = ['localhost', '127.0.0.1'].includes(location.hostname);
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  if (local) {
    navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister()));
    caches.keys().then((ks) => ks.forEach((k) => caches.delete(k)));
  } else {
    navigator.serviceWorker.register('sw.js').catch((e) => console.warn('Sem modo offline:', e));
  }
}

if (!location.hash) history.replaceState(null, '', '#/hoje');
abrirSistema();
