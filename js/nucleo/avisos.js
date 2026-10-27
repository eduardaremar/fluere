/* =========================================================
   Fluere · central de avisos
   Cada módulo registra uma função que devolve os seus avisos
   do momento. O painel Hoje junta todos num lugar só.

   Formato de um aviso:
     { id, texto (pode ter <strong>), tipo: 'warn' | 'ok' | 'info',
       area: 'consultorio' | ..., irPara: '#/rota' (opcional),
       prioridade: número (maior aparece primeiro) }

   Uso num módulo:
     avisos.registrar('financeiro', () => [ {...}, ... ]);
   ========================================================= */

const fontes = new Map();

export function registrar(nome, fn) {
  fontes.set(nome, fn);
}

/** Todos os avisos de todos os módulos, do mais importante para o menos. */
export function todos() {
  const lista = [];
  for (const [nome, fn] of fontes) {
    try { lista.push(...(fn() || [])); } catch (e) { console.error('Aviso com erro em', nome, e); }
  }
  return lista.sort((a, b) => (b.prioridade || 0) - (a.prioridade || 0));
}
