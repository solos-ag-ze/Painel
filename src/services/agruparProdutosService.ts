// src/services/agruparProdutosService.ts
import { ProdutoEstoque } from "./estoqueService";
import { convertToStandardUnit, getBestDisplayUnit, isMassUnit, isVolumeUnit, convertValueToDisplayUnit } from '../lib/unitConverter';

function normalizeName(name: string | null | undefined): string {
  if (!name || typeof name !== 'string') {
    return '';
  }
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ");
}

function areSimilar(name1: string | null | undefined, name2: string | null | undefined): boolean {
  if (!name1 || !name2 || typeof name1 !== 'string' || typeof name2 !== 'string') {
    return false;
  }

  const norm1 = normalizeName(name1);
  const norm2 = normalizeName(name2);

  return norm1 === norm2;
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
    const nomes = grupo.map(p => p.nome_produto);
    const nomeMaisComum = nomes.sort((a, b) =>
      nomes.filter(n => n === a).length - nomes.filter(n => n === b).length
    ).pop() || grupo[0].nome_produto;

    const produtosEmEstoque = grupo.filter(p => (p.quantidade ?? 0) > 0 && p.valor !== null);
    const totalPreco = produtosEmEstoque.reduce((sum, p) => sum + (p.valor ?? 0), 0);
    const media = produtosEmEstoque.length > 0 ? totalPreco / produtosEmEstoque.length : 0;

    let mediaPrecoConvertido = media;

    const primeiraUnidade = grupo[0].unidade;
    let totalEstoqueEmUnidadePadrao = 0;
    let unidadePadrao: 'mg' | 'mL' | null = null;

    if (isMassUnit(primeiraUnidade)) {
      unidadePadrao = 'mg';
      produtosEmEstoque.forEach(p => {
        const converted = convertToStandardUnit(p.quantidade ?? 0, p.unidade);
        totalEstoqueEmUnidadePadrao += converted.quantidade;
      });
    } else if (isVolumeUnit(primeiraUnidade)) {
      unidadePadrao = 'mL';
      produtosEmEstoque.forEach(p => {
        const converted = convertToStandardUnit(p.quantidade ?? 0, p.unidade);
        totalEstoqueEmUnidadePadrao += converted.quantidade;
      });
    } else {
      totalEstoqueEmUnidadePadrao = produtosEmEstoque.reduce((sum, p) => sum + (p.quantidade ?? 0), 0);
    }

    let totalEstoqueDisplay = totalEstoqueEmUnidadePadrao;
    let unidadeDisplay = primeiraUnidade;

    if (unidadePadrao) {
      const displayResult = getBestDisplayUnit(totalEstoqueEmUnidadePadrao, unidadePadrao);
      totalEstoqueDisplay = displayResult.quantidade;
      unidadeDisplay = displayResult.unidade;

      // Usa o valor original sem conversão
      mediaPrecoConvertido = media;
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

    const unidadesOriginais = produtosEmEstoque
      .map(p => p.unidade_valor_original)
      .filter(u => u != null && u !== '');

    const unidadeValorOriginal = unidadesOriginais.length > 0
      ? unidadesOriginais.sort((a, b) =>
          unidadesOriginais.filter(u => u === a).length - unidadesOriginais.filter(u => u === b).length
        ).pop() || null
      : null;

    const mediaPrecoOriginal = unidadeValorOriginal ? media : null;

    return {
      nome: nomeMaisComum,
      produtos: grupo,
      mediaPreco: media,
      mediaPrecoDisplay: mediaPrecoConvertido,
      totalEstoque,
      totalEstoqueDisplay,
      unidadeDisplay,
      marcas,
      categorias,
      unidades,
      lotes,
      validades,
      fornecedores: Object.values(fornecedoresMap),
      unidadeValorOriginal,
      mediaPrecoOriginal
    };
  });
}
