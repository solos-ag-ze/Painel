// utilitários compartilhados entre diferentes serviços de histórico
// baseado no código existente em historicoTransacoesService.ts

import { supabase } from '../lib/supabase';

// campos que não devem ser considerados ao comparar
const CAMPOS_IGNORADOS_BASE = new Set([
  'id_transacao',
  'user_id',
  'created_at',
  'data_registro',
  'updated_at',
  'alocacoes',
  'transacoes_talhoes',
  'talhao_id',
]);

export function calcularCamposAlterados(
  anterior: Record<string, unknown>,
  novo: Record<string, unknown>,
  extrasIgnorados: Set<string> = new Set()
): string[] {
  const camposIgnorados = new Set([...CAMPOS_IGNORADOS_BASE, ...extrasIgnorados]);

  const camposAlterados: string[] = [];
  // Normalizar possíveis aliases de atividades agrícolas (nome_atividade, observacao, talhoes etc)
  const anteriorNorm = normalizeActivitySnapshot(anterior);
  const novoNorm = normalizeActivitySnapshot(novo);

  const todasChaves = new Set([...Object.keys(anteriorNorm), ...Object.keys(novoNorm)]);

  for (const chave of todasChaves) {
    if (camposIgnorados.has(chave)) continue;

    const valorAnterior = anteriorNorm[chave];
    const valorNovo = novoNorm[chave];

    // comparar talhões por conjunto de ids (ignora diferença de objeto completo)
    if (['talhoes', 'lancamento_talhoes', 'talhao_ids', 'id_talhoes'].includes(chave)) {
      const idsA = extractIdsFromField(valorAnterior);
      const idsB = extractIdsFromField(valorNovo);
      if (JSON.stringify(idsA) !== JSON.stringify(idsB)) camposAlterados.push(chave);
      continue;
    }

    // comparar produtos por chave normalizada (id/produto_catalogo/nome + quantidade + unidade)
    if (['produtos', 'lancamento_produtos', 'lancamento_produtos_norm'].includes(chave)) {
      const pA = normalizeProdutosForCompare(valorAnterior);
      const pB = normalizeProdutosForCompare(valorNovo);
      if (JSON.stringify(pA) !== JSON.stringify(pB)) camposAlterados.push(chave);
      continue;
    }

    // comparar máquinas por nome + horas (ignorar id serial do registro)
    if (['maquinas', 'lancamento_maquinas'].includes(chave)) {
      const mA = normalizeMaquinasForCompare(valorAnterior);
      const mB = normalizeMaquinasForCompare(valorNovo);
      if (JSON.stringify(mA) !== JSON.stringify(mB)) camposAlterados.push(chave);
      continue;
    }

    // comparar responsáveis por chave normalizada (id ou nome)
    if (['responsaveis', 'lancamento_responsaveis'].includes(chave)) {
      const rA = normalizeResponsaveisForCompare(valorAnterior);
      const rB = normalizeResponsaveisForCompare(valorNovo);
      // debug: mostrar diferença detalhada em dev
      try {
        if (process.env.NODE_ENV !== 'production') {
          console.debug('[historicoUtils] comparar responsaveis', { chave, rA, rB });
        }
      } catch (e) {
        // ignore
      }
      if (JSON.stringify(rA) !== JSON.stringify(rB)) camposAlterados.push(chave);
      continue;
    }

    if (!valoresIguais(valorAnterior, valorNovo, chave)) {
      camposAlterados.push(chave);
    }
  }

  // collapse aliases into canonical keys before returning
  return collapseCampos(camposAlterados);
}

// Agrupa aliases relacionados em uma chave canônica única
function collapseCampos(campos: string[]): string[] {
  const grupos: string[][] = [
    ['talhoes', 'lancamento_talhoes', 'talhao_ids', 'id_talhoes'],
    ['produtos', 'lancamento_produtos', 'lancamento_produtos_norm'],
    ['responsaveis', 'lancamento_responsaveis'],
    ['maquinas', 'lancamento_maquinas'],
  ];

  const setCampos = new Set(campos);
  for (const grupo of grupos) {
    const found = grupo.find((g) => setCampos.has(g));
    if (found) {
      // remover todos os aliases do set e adicionar apenas o canônico (primeiro)
      for (const g of grupo) setCampos.delete(g);
      setCampos.add(grupo[0]);
    }
  }

  return Array.from(setCampos).sort();
}

export function normalizeActivitySnapshot(obj: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!obj || Object.keys(obj).length === 0) return {};
  const copy = { ...obj } as Record<string, unknown>;

  // map aliases
  // map aliases and canonicalize keys to avoid duplicate 'observacao' vs 'observacoes'
  if (copy['nome_atividade'] && !copy['descricao']) {
    copy['descricao'] = copy['nome_atividade'];
  }
  if (copy['observacao'] && !copy['observacoes']) {
    copy['observacoes'] = copy['observacao'];
  }
  // Remove original alias keys to avoid duplication in key lists
  if ('nome_atividade' in copy) delete copy['nome_atividade'];
  if ('observacao' in copy) delete copy['observacao'];

  if (copy['area_atividade'] && !copy['nome_talhao']) {
    copy['nome_talhao'] = copy['area_atividade'];
  }
  if ('area_atividade' in copy) delete copy['area_atividade'];

  // normalizar talhoes -> talhao_ids (extrair ids)
  if (copy['talhoes'] && Array.isArray(copy['talhoes'])) {
    const arr = copy['talhoes'] as any[];
    copy['talhao_ids'] = arr.map((it) => it?.talhao_id ?? it?.id_talhao ?? it?.id ?? null).filter(Boolean);
  }
  if (copy['lancamento_talhoes'] && Array.isArray(copy['lancamento_talhoes'])) {
    const arr = copy['lancamento_talhoes'] as any[];
    copy['talhao_ids'] = (copy['talhao_ids'] || []).concat(arr.map((it) => it?.talhao_id ?? it?.id_talhao ?? it?.id ?? null).filter(Boolean));
  }

  // Normalizar filhos N:N: mapear 'lancamento_*' para chaves canônicas
  if (copy['lancamento_responsaveis'] && Array.isArray(copy['lancamento_responsaveis'])) {
    try {
      copy['responsaveis'] = (copy['lancamento_responsaveis'] as any[]).map((r) => {
        if (r == null) return null;
        if (typeof r === 'string') return { nome: r };
        return { ...(r as any) };
      }).filter(Boolean);
    } catch (e) {
      // ignore
    }
    delete copy['lancamento_responsaveis'];
  }

  if (copy['lancamento_produtos'] && Array.isArray(copy['lancamento_produtos'])) {
    try {
      copy['produtos'] = (copy['lancamento_produtos'] as any[]).map((p) => {
        if (p == null) return null;
        if (typeof p === 'string') return { nome_produto: p };
        return { ...(p as any) };
      }).filter(Boolean);
    } catch (e) {
      // ignore
    }
    delete copy['lancamento_produtos'];
  }

  if (copy['lancamento_maquinas'] && Array.isArray(copy['lancamento_maquinas'])) {
    try {
      copy['maquinas'] = (copy['lancamento_maquinas'] as any[]).map((m) => {
        if (m == null) return null;
        if (typeof m === 'string') return { nome_maquina: m };
        return { ...(m as any) };
      }).filter(Boolean);
    } catch (e) {
      // ignore
    }
    delete copy['lancamento_maquinas'];
  }

  // garantir talhao_ids como array único de strings
  if (copy['talhao_ids'] && Array.isArray(copy['talhao_ids'])) {
    try {
      copy['talhao_ids'] = Array.from(new Set((copy['talhao_ids'] as any[]).map(String)));
    } catch (e) {
      // ignore
    }
  }

  return copy;
}

function extractIdsFromField(v: unknown): string[] {
  if (!v) return [];
  if (Array.isArray(v)) {
    try {
      const flat = v
        .map((it) => {
          if (it == null) return null;
          if (typeof it === 'string' || typeof it === 'number') return String(it);
          if (typeof it === 'object') {
            return (it as any).talhao_id || (it as any).id_talhao || (it as any).id || (it as any).talho_id || null;
          }
          return String(it);
        })
        .filter(Boolean) as string[];
      return flat.sort();
    } catch (e) {
      return [];
    }
  }
  // single value
  return [String(v)];
}

export function normalizeProdutosForCompare(v: unknown): string[] {
  if (!v) return [];
  const arr = Array.isArray(v) ? v : [v];
  const keys: string[] = arr.map((it) => {
    try {
      if (it == null) return '';
      if (typeof it === 'string' || typeof it === 'number') return String(it);
      // Prefer meaningful identifiers for comparison: produto_catalogo_id (UUID) or produto_id
      // Fall back to nome; avoid using the local serial 'id' which changes on re-insert.
      const produtoCatalogoId = (it as any).produto_catalogo_id ?? null;
      const produtoId = (it as any).produto_id ?? null;
      const rawId = (it as any).id ?? null;
      const nome = ((it as any).nome || (it as any).nome_produto || (it as any).nome_do_produto || '').toString().trim().toLowerCase();
      // ignorar marcadores vazios/placeholder
      if (['', '-', 'nenhum'].includes(nome)) return '';
      // preferir identificadores estáveis, mas usar nome antes do id serial
      const chaveId = produtoCatalogoId || produtoId || null;
      const quantidadeNum = (it as any).quantidade ?? (it as any).quantidade_val ?? (it as any).quantidade_total_usada ?? '';
      const quantidade = quantidadeNum !== null && quantidadeNum !== undefined ? Number(quantidadeNum) : '';
      const unidade = ((it as any).unidade || (it as any).quantidade_un || (it as any).unidade_medida || '')?.toString().trim().toLowerCase() || '';
      const chaveFinal = chaveId ?? nome ?? (rawId ? String(rawId) : null);
      if (!chaveFinal) return '';
      return `${chaveFinal}|${String(quantidade)}|${unidade}`;
    } catch (e) {
      return '';
    }
  }).filter(Boolean) as string[];
  return Array.from(new Set(keys)).sort();
}

export function normalizeResponsaveisForCompare(v: unknown): string[] {
  if (!v) return [];
  const arr = Array.isArray(v) ? v : [v];
  const keys = arr.map((it) => {
    try {
      if (it == null) return '';
      if (typeof it === 'string' || typeof it === 'number') return String(it).trim().toLowerCase();
      const id = (it as any).id ?? (it as any).user_id ?? null;
      const nome = ((it as any).nome || (it as any).nome_responsavel || '')?.toString().trim().toLowerCase();
      // preferir nome normalizado quando disponível — evita falsos positivos
      if (nome && nome !== '-' && nome !== 'nenhum') return nome;
      if (id) return String(id).trim().toLowerCase();
      return '';
    } catch (e) {
      return '';
    }
  }).filter(Boolean) as string[];
  return Array.from(new Set(keys)).sort();
}

export function valoresIguais(a: unknown, b: unknown, campo?: string): boolean {
  const valoresVazios = ['sem talhão específico', 'sem talhao especifico', 'nenhum', '-'];

  const isVazio = (v: unknown): boolean => {
    if (v === null || v === undefined || v === '') return true;
    const str = String(v).trim().toLowerCase();
    return valoresVazios.includes(str);
  };

  const aVazio = isVazio(a);
  const bVazio = isVazio(b);
  if (aVazio && bVazio) return true;
  if (aVazio !== bVazio) return false;

  // arrays: comparar como JSON ordenado
  if (Array.isArray(a) || Array.isArray(b)) {
    const sa = Array.isArray(a) ? JSON.stringify(a) : String(a);
    const sb = Array.isArray(b) ? JSON.stringify(b) : String(b);
    return sa === sb;
  }

  let strA = String(a).trim();
  let strB = String(b).trim();

  const camposCaseInsensitive = ['tipo_transacao', 'status', 'categoria', 'tipo_pagamento'];
  if (campo && camposCaseInsensitive.includes(campo)) {
    strA = strA.toLowerCase();
    strB = strB.toLowerCase();
  }

  const numA = Number(strA);
  const numB = Number(strB);
  if (!isNaN(numA) && !isNaN(numB)) {
    return numA === numB;
  }

  return strA === strB;
}

export function filtrarCamposRelevantes(
  dados: Record<string, unknown>,
  camposAlterados: string[]
): Record<string, unknown> {
  const resultado: Record<string, unknown> = {};

  for (const campo of camposAlterados) {
    if (campo in dados) {
      resultado[campo] = dados[campo];
    }
  }

  return resultado;
}

export function filtrarCamposExibicao(
  dados: Record<string, unknown>
): Record<string, unknown> {
  const camposExibicao = [
    'tipo_transacao',
    'descricao',
    'valor',
    'categoria',
    'data_transacao',
    'data_agendamento_pagamento',
    'pagador_recebedor',
    'forma_pagamento_recebimento',
    'forma_pagamento',
    'tipo_pagamento',
    'status',
    'nome_talhao',
    'area_vinculada',
    'numero_parcelas',
    'parcela',
    'observacao',
    'is_completed',
  ];

  const resultado: Record<string, unknown> = {};

  for (const campo of camposExibicao) {
    if (campo in dados && dados[campo] !== null && dados[campo] !== undefined && dados[campo] !== '') {
      resultado[campo] = dados[campo];
    }
  }

  return resultado;
}

export function formatarNomeCampo(campo: string): string {
  // mesma lógica do serviço financeiro, pode expandir
  return campo.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
}

export function formatarValor(campo: string, valor: unknown): unknown {
  // placeholder: no financeiro havia regras para datas/valores
  return valor;
}

export function normalizeMaquinasForCompare(v: unknown): string[] {
  if (!v) return [];
  const arr = Array.isArray(v) ? v : [v];
  const keys: string[] = arr.map((it) => {
    try {
      if (it == null) return '';
      if (typeof it === 'string' || typeof it === 'number') return String(it);
      // Prefer meaningful identifiers: maquina_id or nome_maquina
      const maquinaId = (it as any).maquina_id ?? null;
      const nome = ((it as any).nome_maquina || (it as any).nome || '')?.toString().trim().toLowerCase();
      const horas = (it as any).horas_maquina ?? (it as any).horas ?? '';
      if (nome && nome !== '-' && nome !== 'nenhum') {
        return `${nome}|${String(horas)}`;
      }
      if (maquinaId) return `${String(maquinaId)}|${String(horas)}`;
      return '';
    } catch (e) {
      return '';
    }
  }).filter(Boolean) as string[];
  return Array.from(new Set(keys)).sort();
}
