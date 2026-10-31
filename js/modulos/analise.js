/* =========================================================
   Fluere · levar os dados para o Claude analisar
   Monta um texto com a EVOLUÇÃO do consultório (financeiro e
   pacientes) para você colar numa conversa com o Claude e pedir
   análise e sugestões de mudança.

   Privacidade: o texto só leva NÚMEROS AGRUPADOS. Não vai nome de
   paciente, WhatsApp, data de nascimento, anotações nem o texto
   livre dos campos. Você lê tudo antes de copiar, e nada é enviado
   pelo Fluere: quem cola é você.
   ========================================================= */

import * as dados from '../nucleo/dados.js';
import { abrirFolha, fecharFolha, toast } from '../nucleo/ui.js';
import { esc, brl, r2, normal, isoDia, isoMes, deIso, somarMeses, mesPorExtenso } from '../nucleo/util.js';
import * as C from './consultorio.js';
import * as S from './gastos.js';
import * as W from './trabalhos.js';

const dias = (de, ate) => Math.round((deIso(ate) - deIso(de)) / 86400000);
const media = (l) => (l.length ? l.reduce((s, x) => s + x, 0) / l.length : 0);
const pct = (a, b) => (b > 0 ? `${Math.round((a / b) * 100)}%` : '—');
const mesCurto = (ym) => `${mesPorExtenso(ym).slice(0, 3)}/${ym.slice(2, 4)}`;
const tabela = (cab, linhas) => [`| ${cab.join(' | ')} |`, `| ${cab.map(() => '---').join(' | ')} |`, ...linhas.map((l) => `| ${l.join(' | ')} |`)].join('\n');

export const PERIODOS = [['ano', 'Este ano até agora'], ['12', 'Últimos 12 meses'], ['6', 'Últimos 6 meses']];

export function mesesDoPeriodo(opcao, hoje = isoDia()) {
  const atual = hoje.slice(0, 7);
  const n = opcao === 'ano' ? Number(atual.slice(5)) : Number(opcao);
  return Array.from({ length: n }, (_, i) => somarMeses(atual, i - (n - 1)));
}

/** Pedaços de texto livre viram categorias fixas (para não vazar nomes digitados na origem). */
function origemPadrao(texto) {
  const t = normal(texto);
  if (!t) return 'não informada';
  for (const [chave, nome] of [['insta', 'Instagram'], ['indic', 'Indicação'], ['google', 'Google'], ['tiktok', 'TikTok'], ['clinica', 'Clínica']]) if (t.includes(chave)) return nome;
  return 'Outra';
}

export function montarRelatorio(opcao = 'ano', hoje = isoDia()) {
  const meses = mesesDoPeriodo(opcao, hoje);
  const de = `${meses[0]}-01`;
  const R = C.regras(isoMes());
  const todasVendas = C.todos();
  const chave = (a) => a.pacienteId || `n:${normal(a.paciente)}`;

  /* ---------- financeiro ---------- */
  const linhasFin = meses.map((ym) => {
    const c = C.calcular(ym), s = S.calcular(ym), w = W.entradas(ym);
    const sobrou = r2(c.liquido + w.recebido - s.totalPessoal);
    return { ym, c, s, w, sobrou, linha: [mesCurto(ym), c.atendimentos, brl(c.bruto), brl(c.repasse), brl(c.aluguel), brl(c.imposto), brl(c.totalCustos), brl(c.liquido), pct(c.liquido, c.bruto), brl(w.recebido), brl(s.totalPessoal), brl(sobrou)] };
  });
  const totalBruto = r2(linhasFin.reduce((s, x) => s + x.c.bruto, 0));
  const totalLiq = r2(linhasFin.reduce((s, x) => s + x.c.liquido, 0));
  const noPeriodo = todasVendas.filter((a) => a.data >= de && a.data <= `${meses.at(-1)}-31`);
  const agrupa = (lista, ids, nomeDe, campo) => ids.map((id) => {
    const l = lista.filter((a) => a[campo] === id);
    return [nomeDe(id), l.length, brl(l.reduce((s, a) => s + (Number(a.valor) || 0), 0)), l.length ? brl(l.reduce((s, a) => s + (Number(a.valor) || 0), 0) / l.length) : '—'];
  });

  /* ---------- pacientes (agregado e anônimo) ---------- */
  const fichas = dados.lista('pacientes');
  const ativas = fichas.filter((p) => !p.arquivado);
  const pacotes = dados.lista('pacotes');
  const porPaciente = new Map();
  for (const a of todasVendas) { const k = chave(a); (porPaciente.get(k) || porPaciente.set(k, []).get(k)).push(a); }
  for (const l of porPaciente.values()) l.sort((a, b) => a.data.localeCompare(b.data));
  const novosPorMes = meses.map((ym) => [...porPaciente.values()].filter((l) => l[0].data.slice(0, 7) === ym).length);
  const consultasPorMes = meses.map((ym) => pacotes.reduce((s, k) => s + (k.consultas || []).filter((c) => c.data.slice(0, 7) === ym).length, 0));
  const vendasTipoMes = meses.map((ym) => ['avulsa', 'tri', 'sem'].map((t) => todasVendas.filter((a) => a.tipo === t && a.data.slice(0, 7) === ym).length));
  const comVenda = [...porPaciente.values()];
  const recompraN = comVenda.filter((l) => l.length >= 2).length;
  const intervalosVenda = comVenda.flatMap((l) => l.slice(1).map((a, i) => dias(l[i].data, a.data)));
  const concluidos = pacotes.filter((k) => Number(k.total) > 0 && (k.consultas || []).length >= Number(k.total));
  const renovou = (k) => { const ult = k.consultas.map((c) => c.data).sort().at(-1); return pacotes.some((o) => o !== k && o.pacienteId === k.pacienteId && o.inicio > k.inicio && o.inicio <= somarDia(ult, 45)); };
  const renovados = concluidos.filter(renovou);
  const ultimaAtividade = (k) => ((k.consultas || []).map((c) => c.data).sort().at(-1)) || k.inicio;
  const parados = pacotes.filter((k) => !concluidos.includes(k) && dias(ultimaAtividade(k), hoje) > 60);
  const intervalosConsulta = pacotes.flatMap((k) => { const d = (k.consultas || []).map((c) => c.data).sort(); return d.slice(1).map((x, i) => dias(d[i], x)); });
  const inativos = ativas.filter((p) => {
    const ks = pacotes.filter((k) => k.pacienteId === p.id);
    if (ks.some((k) => !concluidos.includes(k))) return false;
    const ult = ks.map(ultimaAtividade).sort().at(-1);
    return ult && dias(ult, hoje) > 60;
  }).length;
  const contar = (l) => Object.entries(l.reduce((m, x) => { m[x] = (m[x] || 0) + 1; return m; }, {})).sort((a, b) => b[1] - a[1]);
  const idades = ativas.filter((p) => p.nascimento).map((p) => Number(hoje.slice(0, 4)) - Number(p.nascimento.slice(0, 4)));
  const faixa = (i) => (i < 25 ? 'até 24' : i < 35 ? '25–34' : i < 45 ? '35–44' : i < 55 ? '45–54' : '55+');

  return [
    'Você é um consultor de gestão para consultórios de nutrição. Analise os dados abaixo, de uma nutricionista autônoma, e responda em português, de forma direta e prática:',
    '1. **Evolução:** o que mudou mês a mês no faturamento, na margem e nas sobras, e por quê.',
    '2. **Pontos de atenção:** margem, dependência de um local ou tipo de plano, custos fixos, recebimentos pendentes.',
    '3. **Pacientes:** captação, retenção, renovação de pacotes, pacotes parados e inativos, origem dos pacientes.',
    '4. **Cinco sugestões de mudança**, em ordem de prioridade, cada uma com o que fazer, o que esperar e como medir.',
    '5. **O que falta saber:** quais dados ou perguntas ajudariam a melhorar a análise.',
    '',
    `Os dados saíram do meu sistema de gestão (Fluere) em ${hoje}. Estão anonimizados: não há nomes nem contatos, só números agrupados. Valores em reais.`,
    '',
    '## Como o consultório funciona',
    `- Atendo em Curitiba (aluguel fixo mensal: ${brl(R.aluguelCuritiba)}), em Campo Largo (a clínica fica com ${String(R.pctCampoLargo).replace('.', ',')}% do valor da consulta) e online.`,
    `- Planos: consulta avulsa (${brl(R.precos.avulsa)}, 1 consulta), acompanhamento de 3 meses (${brl(R.precos.tri)}, ${R.consultas.tri} consultas) e de 6 meses (${brl(R.precos.sem)}, ${R.consultas.sem} consultas). Imposto estimado: ${String(R.pctImposto).replace('.', ',')}% do faturamento. Meta mensal de faturamento: ${R.meta ? brl(R.meta) : 'não definida'}.`,
    '- Tudo conta no mês da venda (o plano de 3 meses costuma ser pago inteiro antes da 1ª consulta).',
    '',
    `## Financeiro por mês (${mesCurto(meses[0])} a ${mesCurto(meses.at(-1))})`,
    tabela(['Mês', 'Atend.', 'Bruto', 'Repasse CL', 'Aluguel', 'Imposto', 'Custos fixos', 'Líquido consult.', 'Margem', 'Trabalhos receb.', 'Gastos pessoais e outros', 'Sobrou'], linhasFin.map((x) => x.linha)),
    '',
    `Total do período: bruto ${brl(totalBruto)}, líquido do consultório ${brl(totalLiq)} (margem ${pct(totalLiq, totalBruto)}). A receber de pacientes hoje: ${brl(r2(C.pendentes().reduce((s, a) => s + C.aReceberDe(a), 0)))}.`,
    '"Trabalhos receb." = outros trabalhos (fora do consultório). "Custos fixos" = contas fixas do CNPJ, já descontadas no líquido do consultório. "Gastos pessoais e outros" = contas fixas pessoais e gastos do mês, sem os custos do consultório. "Sobrou" = líquido do consultório + trabalhos − gastos pessoais e outros.',
    '',
    '### Vendas do período por local',
    tabela(['Local', 'Qtd.', 'Bruto', 'Ticket médio'], agrupa(noPeriodo, C.LOCAIS.map((l) => l.id), C.nomeLocal, 'local')),
    '',
    '### Vendas do período por tipo de plano',
    tabela(['Tipo', 'Qtd.', 'Bruto', 'Ticket médio'], agrupa(noPeriodo, C.TIPOS.map((t) => t.id), C.nomeTipo, 'tipo')),
    '',
    '## Pacientes (agregado, sem identificação)',
    tabela(['Mês', 'Pacientes novos', 'Consultas feitas', 'Vendas avulsa', 'Vendas 3 meses', 'Vendas 6 meses'], meses.map((ym, i) => [mesCurto(ym), novosPorMes[i], consultasPorMes[i], ...vendasTipoMes[i]])),
    '',
    `- Fichas ativas: ${ativas.length} (arquivadas: ${fichas.length - ativas.length}). Pacientes com alguma venda registrada: ${comVenda.length}.`,
    `- Recompra: ${recompraN} de ${comVenda.length} pacientes (${pct(recompraN, comVenda.length)}) compraram mais de uma vez; intervalo médio entre compras: ${intervalosVenda.length ? `${Math.round(media(intervalosVenda))} dias` : 'sem dados'}.`,
    `- Pacotes concluídos: ${concluidos.length}; destes, ${renovados.length} (${pct(renovados.length, concluidos.length)}) foram renovados em até 45 dias.`,
    `- Pacotes parados (sem consulta há mais de 60 dias e não concluídos): ${parados.length}. Pacientes ativos sem pacote e sem atividade há mais de 60 dias: ${inativos}.`,
    `- Intervalo médio entre consultas de um mesmo pacote: ${intervalosConsulta.length ? `${Math.round(media(intervalosConsulta))} dias` : 'sem dados'}.`,
    `- Origem dos pacientes (fichas ativas): ${contar(ativas.map((p) => origemPadrao(p.origem))).map(([n, q]) => `${n} ${q}`).join(', ') || 'sem dados'}.`,
    `- Local em que costumam atender: ${contar(ativas.map((p) => (p.local ? C.nomeLocal(p.local) : 'não informado'))).map(([n, q]) => `${n} ${q}`).join(', ') || 'sem dados'}.`,
    `- Faixa etária (quem tem nascimento cadastrado): ${idades.length ? contar(idades.map(faixa)).map(([n, q]) => `${n} anos: ${q}`).join(', ') : 'sem dados'}.`,
    '',
    'Observação: se algum número parecer estranho (por exemplo meses sem vendas porque ainda não foram lançados), me diga em vez de supor.',
  ].join('\n');
}
const somarDia = (iso, n) => { const d = deIso(iso); d.setDate(d.getDate() + n); return isoDia(d); };

/* ---------- folha: escolher o período, ler e copiar ---------- */

export function abrirAnalise() {
  let opcao = 'ano';
  const f = abrirFolha(`
    <h3>Levar para o Claude</h3>
    <p class="sub">Gera um resumo da evolução do consultório (financeiro e pacientes) para você colar numa conversa com o Claude e pedir análise e sugestões. <strong>Sem nomes, contatos, nascimentos ou anotações:</strong> só números agrupados. Leia antes de copiar.</p>
    <div class="fld"><span class="l">Período</span><div class="opcoes" id="an-per">${PERIODOS.map(([v, n]) => `<button type="button" data-v="${v}" aria-pressed="${v === opcao}">${n}</button>`).join('')}</div></div>
    <div class="fld"><label for="an-txt">Texto que será copiado</label><textarea id="an-txt" rows="12" readonly style="font-size:12.5px;line-height:1.4"></textarea></div>
    <div class="acts"><button type="button" class="btn sec" data-fechar>Fechar</button><button type="button" class="btn pri" data-copiar>Copiar</button></div>`);
  const $ = (s) => f.querySelector(s);
  const pintar = () => { $('#an-txt').value = montarRelatorio(opcao); };
  $('#an-per').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-v]');
    if (!b) return;
    opcao = b.dataset.v;
    $('#an-per').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    pintar();
  });
  pintar();
  $('[data-fechar]').onclick = fecharFolha;
  $('[data-copiar]').onclick = async () => {
    try { await navigator.clipboard.writeText($('#an-txt').value); toast('Copiado. Cole numa conversa com o Claude ✦'); }
    catch { $('#an-txt').select(); toast('Não consegui copiar sozinho: o texto ficou selecionado, é só copiar.'); }
  };
}
