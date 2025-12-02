// src/services/agruparProdutosService.ts
import { ProdutoEstoque } from "./estoqueService";
import { convertToStandardUnit, convertBetweenUnits, isMassUnit, isVolumeUnit } from '../lib/unitConverter';

/**
 * Normaliza o nome do produto para comparação
 * Remove acentos, converte para minúsculo, mas PRESERVA números e hífens
 */
function normalizeName(name: string | null | undefined): string {
  if (!name || typeof name !== 'string') {
    return '';
  }
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .trim()
    .replace(/\s+/g, " "); // Normaliza espaços
}

/**
 * Extrai a "fórmula" ou números significativos do nome do produto
 * Ex: "NPK 20-05-20" → "20-05-20"
 * Ex: "Boro 10%" → "10"
 * Ex: "Roundup" → ""
 */
function extractFormula(name: string): string {
  if (!name) return '';
  
  // Padrão para fórmulas tipo "20-05-20", "10-10-10", etc.
  const formulaMatch = name.match(/\d+[-]\d+[-]\d+/);
  if (formulaMatch) return formulaMatch[0];
  
  // Padrão para percentuais tipo "10%", "5%"
  const percentMatch = name.match(/\d+\s*%/g);
  if (percentMatch) return percentMatch.join('-');
  
  // Padrão para números isolados significativos (ex: "Boro 10")
  const numbersMatch = name.match(/\d+/g);
  if (numbersMatch && numbersMatch.length > 0) {
    return numbersMatch.join('-');
  }
  
  return '';
}

/**
 * Extrai o nome base do produto (sem números/fórmulas)
 * Ex: "NPK 20-05-20" → "npk"
 * Ex: "Ureia" → "ureia"
 */
function extractBaseName(name: string): string {
  if (!name) return '';
  return normalizeName(name)
    .replace(/\d+[-]?\d*[-]?\d*/g, '') // Remove números e fórmulas
    .replace(/%/g, '')                  // Remove %
    .replace(/\s+/g, ' ')               // Normaliza espaços
    .trim();
}

function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = Array(a.length + 1).fill(null).map(() => Array(b.length + 1).fill(null));

  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[a.length][b.length];
}

/**
 * Verifica se dois nomes de produtos são similares o suficiente para agrupar
 * REGRA IMPORTANTE: Se ambos têm fórmulas/números, eles DEVEM ser IGUAIS
 */
function areSimilar(name1: string | null | undefined, name2: string | null | undefined): boolean {
  if (!name1 || !name2 || typeof name1 !== 'string' || typeof name2 !== 'string') {
    return false;
  }
  
  const norm1 = normalizeName(name1);
  const norm2 = normalizeName(name2);
  
  // Se os nomes normalizados são idênticos, são iguais
  if (norm1 === norm2) return true;
  if (!norm1 || !norm2) return false;

  // Extrair fórmulas/números
  const formula1 = extractFormula(name1);
  const formula2 = extractFormula(name2);
  
  // 🚨 REGRA CRÍTICA: Se ambos têm fórmulas, elas DEVEM ser idênticas
  // Isso evita agrupar "NPK 10-10-10" com "NPK 20-20-20"
  if (formula1 && formula2) {
    if (formula1 !== formula2) {
      return false; // Fórmulas diferentes = produtos diferentes
    }
  }
  
  // Extrair nomes base (sem números)
  const base1 = extractBaseName(name1);
  const base2 = extractBaseName(name2);
  
  // Se os nomes base são muito diferentes, não agrupa
  if (!base1 || !base2) {
    // Se um tem base e outro não, compara os nomes completos
    const distance = levenshteinDistance(norm1, norm2);
    const similarity = 1 - (distance / Math.max(norm1.length, norm2.length));
    return similarity > 0.9; // Exige 90% de similaridade
  }
  
  // Comparar nomes base usando Levenshtein
  const baseDistance = levenshteinDistance(base1, base2);
  const baseSimilarity = 1 - (baseDistance / Math.max(base1.length, base2.length));
  
  // Nomes base devem ter alta similaridade (85%+)
  if (baseSimilarity < 0.85) {
    return false;
  }
  
  // Se chegou aqui:
  // - Fórmulas são iguais (ou um/ambos não têm fórmula)
  // - Nomes base são similares
  return true;
}

export interface ProdutoAgrupado {
  nome: string;
  produtos: ProdutoEstoque[];          // Todos os registros (entradas e saídas)
  entradas: ProdutoEstoque[];          // Apenas entradas
  saidas: ProdutoEstoque[];            // Apenas saídas
  mediaPreco: number;
  mediaPrecoDisplay: number;
  totalEstoque: number;                // Estoque em unidade padrão (mg/mL)
  totalEstoqueDisplay: number;         // Estoque na unidade de display (entradas - saídas)
  unidadeDisplay: string;
  marcas: string[];
  categorias: string[];
  unidades: string[];
  lotes: (string|null)[];
  validades: (string|null)[];
  fornecedores: {
    fornecedor: string|null;
    quantidade: number;
    valor: number|null;
    registro_mapa: string|null;
    ids: number[];
  }[];
  unidadeValorOriginal: string | null;
  mediaPrecoOriginal: number | null;
}

export function agruparProdutos(produtos: ProdutoEstoque[]): ProdutoAgrupado[] {
  if (!produtos.length) return [];

  const produtosValidos = produtos.filter(p => 
    p.nome_produto && 
    typeof p.nome_produto === 'string' && 
    p.nome_produto.trim()
  );
  
  if (!produtosValidos.length) return [];

  const grupos: Record<string, ProdutoEstoque[]> = {};
  grupos[produtosValidos[0].nome_produto] = [produtosValidos[0]];

  for (let i = 1; i < produtosValidos.length; i++) {
    const produto = produtosValidos[i];
    let encontrouGrupo = false;

    for (const [nomeGrupo] of Object.entries(grupos)) {
      if (areSimilar(produto.nome_produto, nomeGrupo)) {
        grupos[nomeGrupo].push(produto);
        encontrouGrupo = true;
        break;
      }
    }

    if (!encontrouGrupo) {
      grupos[produto.nome_produto] = [produto];
    }
  }

  return Object.values(grupos).map(grupo => {
    // 1️⃣ ORDENAR produtos por created_at (mais antigo primeiro - FIFO)
    grupo.sort((a, b) => {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      return dateA - dateB;
    });

    const nomes = grupo.map(p => p.nome_produto);
    const nomeMaisComum = nomes.sort((a, b) =>
      nomes.filter(n => n === a).length - nomes.filter(n => n === b).length
    ).pop() || grupo[0].nome_produto;

    // 2️⃣ SEPARAR ENTRADAS E SAÍDAS
    // tipo_de_movimentacao pode ser 'entrada', 'saida', ou undefined (legado = entrada)
    const entradas = grupo.filter(p => 
      !p.tipo_de_movimentacao || p.tipo_de_movimentacao === 'entrada'
    );
    const saidas = grupo.filter(p => p.tipo_de_movimentacao === 'saida');

    // 3️⃣ DETERMINAR UNIDADE DE REFERÊNCIA (do produto mais antigo)
    const produtoMaisAntigo = entradas[0] || grupo[0];
    const unidadeReferencia = produtoMaisAntigo.unidade_valor_original || produtoMaisAntigo.unidade;
    const primeiraUnidade = produtoMaisAntigo.unidade;
    
    // 4️⃣ CALCULAR ESTOQUE: ENTRADAS - SAÍDAS
    let totalEntradas = 0;
    let totalSaidas = 0;
    let somaValorTotal = 0;
    
    console.log(`\n📊 Calculando estoque do grupo: ${nomeMaisComum}`);
    console.log(`   Unidade de referência: ${unidadeReferencia}`);
    console.log(`   Entradas: ${entradas.length} | Saídas: ${saidas.length}`);
    
    // Somar entradas (quantidade positiva)
    entradas.forEach(p => {
      const quantidadeAtual = p.quantidade ?? 0;
      const quantidadeNaUnidadeRef = convertBetweenUnits(
        quantidadeAtual,
        p.unidade,
        unidadeReferencia
      );
      totalEntradas += quantidadeNaUnidadeRef;
      
      // Calcular valor para média ponderada
      const valorMedio = p.valor_medio ?? p.valor ?? 0;
      const unidadeValorProduto = p.unidade_valor_original || p.unidade;
      const fatorConversaoValor = convertBetweenUnits(1, unidadeReferencia, unidadeValorProduto);
      const valorMedioNaUnidadeRef = valorMedio * fatorConversaoValor;
      somaValorTotal += valorMedioNaUnidadeRef * quantidadeNaUnidadeRef;
      
      console.log(`   ➕ Entrada ID ${p.id}: ${quantidadeNaUnidadeRef.toFixed(2)} ${unidadeReferencia}`);
    });
    
    // Subtrair saídas (quantidade negativa no cálculo)
    saidas.forEach(p => {
      const quantidadeAtual = p.quantidade ?? 0;
      const quantidadeNaUnidadeRef = convertBetweenUnits(
        quantidadeAtual,
        p.unidade,
        unidadeReferencia
      );
      totalSaidas += quantidadeNaUnidadeRef;
      
      console.log(`   ➖ Saída ID ${p.id}: ${quantidadeNaUnidadeRef.toFixed(2)} ${unidadeReferencia}`);
    });
    
    // Estoque real = entradas - saídas
    const totalEstoqueDisplay = Math.max(0, totalEntradas - totalSaidas);
    
    // Média ponderada (baseada apenas nas entradas)
    const mediaPrecoFinal = totalEntradas > 0 
      ? somaValorTotal / totalEntradas 
      : 0;
    
    console.log(`   📦 Total Entradas: ${totalEntradas.toFixed(2)} ${unidadeReferencia}`);
    console.log(`   📤 Total Saídas: ${totalSaidas.toFixed(2)} ${unidadeReferencia}`);
    console.log(`   ✅ Estoque Real: ${totalEstoqueDisplay.toFixed(2)} ${unidadeReferencia}`);
    console.log(`   💰 Média ponderada: R$ ${mediaPrecoFinal.toFixed(2)}/${unidadeReferencia}\n`);

    // 5️⃣ CALCULAR totalEstoque em unidade padrão (para compatibilidade)
    let totalEstoqueEmUnidadePadrao = 0;
    if (isMassUnit(primeiraUnidade)) {
      const converted = convertToStandardUnit(totalEstoqueDisplay, unidadeReferencia);
      totalEstoqueEmUnidadePadrao = converted.quantidade;
    } else if (isVolumeUnit(primeiraUnidade)) {
      const converted = convertToStandardUnit(totalEstoqueDisplay, unidadeReferencia);
      totalEstoqueEmUnidadePadrao = converted.quantidade;
    } else {
      totalEstoqueEmUnidadePadrao = totalEstoqueDisplay;
    }

    const marcas = Array.from(new Set(entradas.map(p => p.marca)));
    const categorias = Array.from(new Set(entradas.map(p => p.categoria)));
    const unidades = Array.from(new Set(entradas.map(p => p.unidade)));
    const lotes = Array.from(new Set(entradas.map(p => p.lote)));
    const validades = Array.from(new Set(entradas.map(p => p.validade)));

    // Fornecedores apenas das entradas
    const fornecedoresMap: Record<string, { fornecedor: string|null, quantidade: number, valor: number|null, registro_mapa: string|null, ids: number[] }> = {};
    entradas.forEach(p => {
      const key = (p.fornecedor ?? "Desconhecido") + "_" + (p.valor ?? "0");
      if (!fornecedoresMap[key]) {
        fornecedoresMap[key] = {
          fornecedor: p.fornecedor ?? "Desconhecido",
          quantidade: 0,
          valor: p.valor,
          registro_mapa: p.registro_mapa ?? null,
          ids: []
        };
      }
      fornecedoresMap[key].quantidade += p.quantidade;
      fornecedoresMap[key].ids.push(p.id);
    });

    return {
      nome: nomeMaisComum,
      produtos: grupo,
      entradas,
      saidas,
      mediaPreco: mediaPrecoFinal,
      mediaPrecoDisplay: mediaPrecoFinal,
      totalEstoque: totalEstoqueEmUnidadePadrao,
      totalEstoqueDisplay,
      unidadeDisplay: unidadeReferencia,
      marcas,
      categorias,
      unidades,
      lotes,
      validades,
      fornecedores: Object.values(fornecedoresMap),
      unidadeValorOriginal: unidadeReferencia,
      mediaPrecoOriginal: mediaPrecoFinal
    };
  });
}
