// src/services/agruparProdutosService.ts
import { ProdutoEstoque } from "./estoqueService";
import { convertToStandardUnit, convertBetweenUnits, isMassUnit, isVolumeUnit } from '../lib/unitConverter';

function normalizeName(name: string | null | undefined): string {
  if (!name || typeof name !== 'string') {
    return '';
  }
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, " ")
    .trim()
    .replace(/\s+/g, " ");
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

function areSimilar(name1: string | null | undefined, name2: string | null | undefined): boolean {
  if (!name1 || !name2 || typeof name1 !== 'string' || typeof name2 !== 'string') {
    return false;
  }
  
  const norm1 = normalizeName(name1);
  const norm2 = normalizeName(name2);
  
  if (norm1 === norm2) return true;
  if (!norm1 || !norm2) return false;

  const avgLength = (norm1.length + norm2.length) / 2;
  const distance = levenshteinDistance(norm1, norm2);
  const similarity = 1 - (distance / Math.max(norm1.length, norm2.length));
  
  if (avgLength < 4) return norm1 === norm2;
  if (avgLength <= 6) return similarity > 0.85;
  if (avgLength <= 10) return similarity > 0.75;
  return similarity > 0.7;
}

export interface ProdutoAgrupado {
  nome: string;
  produtos: ProdutoEstoque[];
  mediaPreco: number;
  mediaPrecoDisplay: number;
  totalEstoque: number;
  totalEstoqueDisplay: number;
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
    // 1️⃣ ORDENAR produtos por created_at (mais antigo primeiro)
    grupo.sort((a, b) => {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      return dateA - dateB;
    });

    const nomes = grupo.map(p => p.nome_produto);
    const nomeMaisComum = nomes.sort((a, b) =>
      nomes.filter(n => n === a).length - nomes.filter(n => n === b).length
    ).pop() || grupo[0].nome_produto;

    const produtosEmEstoque = grupo.filter(p => (p.quantidade ?? 0) > 0);

    // 2️⃣ CALCULAR MÉDIA PONDERADA DO GRUPO CORRETAMENTE
    // Converter TUDO para a mesma unidade de referência antes de somar
    const produtoMaisAntigo = grupo[0];
    const unidadeReferencia = produtoMaisAntigo.unidade_valor_original || produtoMaisAntigo.unidade;
    const primeiraUnidade = grupo[0].unidade;
    
    let somaValorTotal = 0;
    let somaQuantidadeNaUnidadeReferencia = 0;
    
    // Somar valores e quantidades de TODOS os produtos do grupo
    // IMPORTANTE: Converter todas as quantidades para a UNIDADE DE REFERÊNCIA usando convertBetweenUnits
    grupo.forEach(p => {
      const valorTotal = p.valor_total || 0;
      const quantidadeInicial = p.quantidade_inicial || 0;
      
      // Converter DIRETAMENTE da unidade do produto para a unidade de referência
      const quantidadeNaUnidadeRef = convertBetweenUnits(
        quantidadeInicial,
        p.unidade,
        unidadeReferencia
      );
      
      somaValorTotal += valorTotal;
      somaQuantidadeNaUnidadeReferencia += quantidadeNaUnidadeRef;
    });
    
    // Calcular média ponderada na unidade de referência
    const mediaPrecoFinal = somaQuantidadeNaUnidadeReferencia > 0 
      ? somaValorTotal / somaQuantidadeNaUnidadeReferencia 
      : 0;

    // 3️⃣ CALCULAR totalEstoqueDisplay DIRETAMENTE na UNIDADE DE REFERÊNCIA
    // Usar a mesma lógica do convertBetweenUnits para garantir consistência
    let totalEstoqueDisplay = 0;
    
    produtosEmEstoque.forEach(p => {
      const quantidadeConvertida = convertBetweenUnits(
        p.quantidade ?? 0,
        p.unidade,
        unidadeReferencia
      );
      totalEstoqueDisplay += quantidadeConvertida;
    });

    const unidadeDisplay = unidadeReferencia;
    
    // Manter totalEstoque em unidade padrão para compatibilidade com código legado (se necessário)
    let totalEstoqueEmUnidadePadrao = 0;
    if (isMassUnit(primeiraUnidade)) {
      produtosEmEstoque.forEach(p => {
        const converted = convertToStandardUnit(p.quantidade ?? 0, p.unidade);
        totalEstoqueEmUnidadePadrao += converted.quantidade;
      });
    } else if (isVolumeUnit(primeiraUnidade)) {
      produtosEmEstoque.forEach(p => {
        const converted = convertToStandardUnit(p.quantidade ?? 0, p.unidade);
        totalEstoqueEmUnidadePadrao += converted.quantidade;
      });
    } else {
      totalEstoqueEmUnidadePadrao = produtosEmEstoque.reduce((sum, p) => sum + (p.quantidade ?? 0), 0);
    }

    const totalEstoque = totalEstoqueEmUnidadePadrao;

    const marcas = Array.from(new Set(grupo.map(p => p.marca)));
    const categorias = Array.from(new Set(grupo.map(p => p.categoria)));
    const unidades = Array.from(new Set(grupo.map(p => p.unidade)));
    const lotes = Array.from(new Set(grupo.map(p => p.lote)));
    const validades = Array.from(new Set(grupo.map(p => p.validade)));

    const fornecedoresMap: Record<string, { fornecedor: string|null, quantidade: number, valor: number|null, registro_mapa: string|null, ids: number[] }> = {};
    produtosEmEstoque.forEach(p => {
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

    // ✅ Usar média ponderada calculada e unidadeReferencia do produto mais antigo
    return {
      nome: nomeMaisComum,
      produtos: grupo,
      mediaPreco: mediaPrecoFinal,
      mediaPrecoDisplay: mediaPrecoFinal,
      totalEstoque,
      totalEstoqueDisplay,
      unidadeDisplay,
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
