/* =========================================================
   Fluere · Pacientes
   Lista e fichas (cadastro, pacote e pagamentos).
   Começa vazio; as fichas chegam na Etapa 3.
   ========================================================= */

import { cabecalho, painel, kpi, icone } from '../nucleo/ui.js';

export function desenhar(el) {
  el.innerHTML = `
    ${cabecalho({ sup: 'Consultório', titulo: 'Seus <em>pacientes</em>' })}
    <div class="alert ok"><span class="d"></span><div>${icone.cadeado(15)} Os dados dos pacientes ficam embaralhados no aparelho e só abrem com a sua senha.</div></div>
    <div class="grade g-kpi">
      ${kpi({ rot: 'Pacotes ativos', valor: 0, sub: 'acompanhamentos em andamento', classe: 'quente' })}
      ${kpi({ rot: 'Pacotes acabando', valor: 0, sub: 'oferecer renovação', classe: 'rosa' })}
      ${kpi({ rot: 'Sem próxima consulta', valor: 0, sub: 'marcar retorno' })}
      ${kpi({ rot: 'Aniversários', valor: 0, unidade: 'na semana', classe: 'verde' })}
    </div>
    ${painel({ rot: 'Fichas', titulo: 'Todos os pacientes',
      corpo: '<div class="vazio">Nenhum paciente cadastrado ainda ✦</div>' })}`;
}
