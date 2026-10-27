/* =========================================================
   Fluere · painel Hoje
   Primeira tela. Junta os avisos de todos os módulos e mostra
   o ritmo do dia. Cada painel começa vazio e passa a mostrar
   os dados reais quando o módulo correspondente ficar pronto.
   ========================================================= */

import * as avisos from '../nucleo/avisos.js';
import { cabecalho, painel, kpi, icone } from '../nucleo/ui.js';
import { diaPorExtenso, saudacao } from '../nucleo/util.js';

const NOME = 'Eduarda';

export function desenhar(el) {
  const lista = avisos.todos();

  el.innerHTML = `
    ${cabecalho({ sup: diaPorExtenso(), titulo: 'Seu dia <em>hoje</em>', avisos: lista.length })}

    <section class="hero">
      <div>
        <div class="ola">${saudacao()}, ${NOME} ✦</div>
        <h1>Hoje você atende <em><span class="n">0</span> pacientes</em>.</h1>
        <p>Aqui está o ritmo do seu dia.</p>
      </div>
      <div class="acts">
        <a class="btn contorno" href="#/rotina/tarefas">${icone.rotina(18)} Ver semana</a>
        <a class="btn pri" href="#/pacientes">${icone.pacientes(18)} Pacientes</a>
      </div>
    </section>

    <div class="grade g-kpi">
      ${kpi({ rot: 'Pacientes hoje', valor: 0, unidade: 'consultas', sub: 'nenhuma anotada', classe: 'quente' })}
      ${kpi({ rot: 'Próxima consulta', valor: '—', sub: 'ninguém aguardando' })}
      ${kpi({ rot: 'Tarefas', valor: 0, unidade: 'para hoje', sub: 'nada planejado' })}
      ${kpi({ rot: 'Hábitos de hoje', valor: 0, unidade: 'marcados', sub: 'nenhum hábito criado', classe: 'rosa' })}
    </div>

    <div class="grade g-21">
      ${painel({
        rot: 'Consultório · hoje', titulo: 'Quem você atende', ver: ['#/pacientes', 'Ver todos'],
        corpo: '<div class="vazio">Nenhuma consulta para hoje. As próximas consultas anotadas nas fichas aparecem aqui ✦</div>',
      })}
      ${painel({
        rot: 'Central', titulo: 'Avisos',
        corpo: lista.length
          ? `<ul class="alerts">${lista.map((a) => `<li>${a.irPara
              ? `<button class="alert ${a.tipo || ''}" data-ir="${a.irPara}"><span class="d"></span><div>${a.texto}</div></button>`
              : `<div class="alert ${a.tipo || ''}"><span class="d"></span><div>${a.texto}</div></div>`}</li>`).join('')}</ul>`
          : '<div class="vazio">Nenhum aviso agora. Tudo em dia ✦</div>',
      })}
    </div>

    <div class="grade g-3">
      ${painel({ rot: 'Rotina', titulo: 'Tarefas do dia', ver: ['#/rotina/tarefas', 'Semana'],
        corpo: '<div class="vazio">Nada planejado para hoje.</div>' })}
      ${painel({ rot: 'Hábitos', titulo: 'Seu mês até aqui', ver: ['#/rotina/habitos', 'Ver'],
        corpo: '<div class="vazio">Seus hábitos e as bolinhas do mês aparecem aqui.</div>' })}
      ${painel({ rot: 'Conteúdo · hoje', titulo: 'Peça do dia', ver: ['#/mais/conteudo', 'Semana'],
        corpo: '<div class="vazio">Nenhuma peça programada para hoje.</div>' })}
    </div>`;
}
