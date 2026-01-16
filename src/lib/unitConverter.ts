export type MassUnit = 'ton' | 'kg' | 'g' | 'mg';
export type VolumeUnit = 'L' | 'mL';
export type OtherUnit = 'un';
export type Unit = MassUnit | VolumeUnit | OtherUnit;

// Mapear variantes textuais comuns para unidades canônicas
const UNIT_ALIASES: Record<string, string> = {
  // massa
  't': 'ton',
  't.': 'ton',
  'ton': 'ton',
  'tons': 'ton',
  'tonelada': 'ton',
  'toneladas': 'ton',
  'kg': 'kg',
  'kg.': 'kg',
  'kgs': 'kg',
  'kilo': 'kg',
  'kilos': 'kg',
  'kilograma': 'kg',
  'kilogramas': 'kg',
  'g': 'g',
  'g.': 'g',
  'gs': 'g',
  'gr': 'g',
  'gr.': 'g',
  'grs': 'g',
  'grama': 'g',
  'gramas': 'g',
  'mg': 'mg',
  'mg.': 'mg',
  'mgs': 'mg',
  'miligrama': 'mg',
  'miligramas': 'mg',

  // volume
  'l': 'L',
  'l.': 'L',
  'lt': 'L',
  'lt.': 'L',
  'litro': 'L',
  'litros': 'L',
  'ltrs': 'L',
  'ltrs.': 'L',
  'ml': 'mL',
  'ml.': 'mL',
  'mls': 'mL',
  'mililitro': 'mL',
  'mililitros': 'mL',

  // outros (unidades)
  'un': 'un',
  'un.': 'un',
  'und': 'un',
  'und.': 'un',
  'unidade': 'un',
  'unidades': 'un',
  'unid': 'un',
  'unid.': 'un',
  'pc': 'un',
  'pcs': 'un',
  'peca': 'un',
};

function normalizeUnit(raw?: string | null): string {
  if (!raw || typeof raw !== 'string') return '';
  // Trim, remover acentos, pontuação simples e espaços internas
  const lower = raw.trim().toLowerCase();
  const noAccents = lower.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const cleaned = noAccents.replace(/\./g, '').replace(/\s+/g, '');

  // tentativa direta por aliases
  if (UNIT_ALIASES[cleaned]) return UNIT_ALIASES[cleaned];

  // remover plural final (ex: 'kgs' -> 'kg') e tentar de novo
  if (cleaned.endsWith('s')) {
    const singular = cleaned.slice(0, -1);
    if (UNIT_ALIASES[singular]) return UNIT_ALIASES[singular];
  }

  // heurísticas por substring para cobrir variações menos comuns
  if (cleaned.includes('mg')) return 'mg';
  if (cleaned.includes('kg') || cleaned.includes('kilo')) return 'kg';
  if (cleaned === 't' || cleaned.includes('ton')) return 'ton';
  if (cleaned.includes('ml')) return 'mL';
  // 'l' pode ser ambíguo se já capturamos 'ml' antes
  if (cleaned === 'l' || cleaned.includes('litro') || cleaned === 'lt') return 'L';
  if (cleaned.startsWith('un') || cleaned.startsWith('und') || cleaned.startsWith('pc') || cleaned.startsWith('pe')) return 'un';

  // fallback: devolver versão limpa (lowercase sem pontuação) para uso posterior
  return cleaned;
}
const MASS_TO_MG: Record<MassUnit, number> = {
  'ton': 1_000_000_000,
  'kg': 1_000_000,
  'g': 1_000,
  'mg': 1,
};

const VOLUME_TO_ML: Record<VolumeUnit, number> = {
  'L': 1_000,
  'mL': 1,
};

export function isMassUnit(unit: string): unit is MassUnit {
  const u = normalizeUnit(unit);
  return ['ton', 'kg', 'g', 'mg'].includes(u);
}

export function isVolumeUnit(unit: string): unit is VolumeUnit {
  const u = normalizeUnit(unit);
  return ['L', 'mL'].includes(u);
}

export function isOtherUnit(unit: string): unit is OtherUnit {
  const u = normalizeUnit(unit);
  return u === 'un';
}

export function convertToStandardUnit(quantidade: number, unidade: string): { quantidade: number; unidade: string } {
  const u = normalizeUnit(unidade) || unidade;
  if (isMassUnit(u)) {
    if (u === 'mg') {
      return { quantidade, unidade: 'mg' };
    }
    const fator = MASS_TO_MG[u as MassUnit];
    return {
      quantidade: quantidade * fator,
      unidade: 'mg'
    };
  }

  if (isVolumeUnit(u)) {
    if (u === 'mL') {
      return { quantidade, unidade: 'mL' };
    }
    const fator = VOLUME_TO_ML[u as VolumeUnit];
    return {
      quantidade: quantidade * fator,
      unidade: 'mL'
    };
  }

  return { quantidade, unidade: u };
}

export function convertFromStandardUnit(
  quantidadePadrao: number,
  unidadePadrao: string,
  unidadeDesejada: string
): number {
  const padrao = normalizeUnit(unidadePadrao) || unidadePadrao;
  const desejada = normalizeUnit(unidadeDesejada) || unidadeDesejada;
  if (padrao === 'mg' && isMassUnit(desejada)) {
    const fator = MASS_TO_MG[desejada as MassUnit];
    return quantidadePadrao / fator;
  }

  if (padrao === 'mL' && isVolumeUnit(desejada)) {
    const fator = VOLUME_TO_ML[desejada as VolumeUnit];
    return quantidadePadrao / fator;
  }

  return quantidadePadrao;
}

export function getBestDisplayUnit(quantidadeMgOrMl: number, unidadePadrao: 'mg' | 'mL'): { quantidade: number; unidade: string } {
  const absQtd = Math.abs(quantidadeMgOrMl);

  if (unidadePadrao === 'mg') {
    if (absQtd >= 1_000_000_000) {
      const tons = quantidadeMgOrMl / 1_000_000_000;
      return {
        quantidade: Number(tons.toFixed(Math.abs(tons) >= 10 ? 1 : 2)),
        unidade: 'ton'
      };
    }
    if (absQtd >= 1_000_000) {
      const kg = quantidadeMgOrMl / 1_000_000;
      return {
        quantidade: Number(kg.toFixed(Math.abs(kg) >= 10 ? 1 : 2)),
        unidade: 'kg'
      };
    }
    if (absQtd >= 1_000) {
      const g = quantidadeMgOrMl / 1_000;
      return {
        quantidade: Number(g.toFixed(Math.abs(g) >= 10 ? 1 : 2)),
        unidade: 'g'
      };
    }
    return {
      quantidade: Number(quantidadeMgOrMl.toFixed(2)),
      unidade: 'mg'
    };
  }

  if (unidadePadrao === 'mL') {
    if (absQtd >= 1_000) {
      const liters = quantidadeMgOrMl / 1_000;
      return {
        quantidade: Number(liters.toFixed(Math.abs(liters) >= 10 ? 1 : 2)),
        unidade: 'L'
      };
    }
    return {
      quantidade: Number(quantidadeMgOrMl.toFixed(2)),
      unidade: 'mL'
    };
  }

  return { quantidade: quantidadeMgOrMl, unidade: unidadePadrao };
}

export function formatQuantityWithUnit(quantidade: number, unidade: string): string {
  const formatted = quantidade % 1 === 0 ? quantidade.toString() : quantidade.toFixed(2);
  return `${formatted} ${unidade}`;
}

export function autoScaleQuantity(quantidade: number, unidade: string): { quantidade: number; unidade: string } {
  // Validar entrada para evitar NaN
  if (typeof quantidade !== 'number' || isNaN(quantidade) || !isFinite(quantidade)) {
    return { quantidade: 0, unidade: unidade || 'un' };
  }
  
  if (!unidade) {
    return { quantidade, unidade: 'un' };
  }

  const standardized = convertToStandardUnit(quantidade, unidade);

  if (standardized.unidade === 'mg' || standardized.unidade === 'mL') {
    return getBestDisplayUnit(standardized.quantidade, standardized.unidade);
  }

  return { quantidade, unidade };
}

export function formatQuantityAutoScaled(quantidade: number, unidade: string): string {
  const scaled = autoScaleQuantity(quantidade, unidade);
  return formatQuantityWithUnit(scaled.quantidade, scaled.unidade);
}

export function convertValueBetweenUnits(
  valor: number,
  unidadeOriginal: string,
  unidadeDestino: string
): number {
  const orig = normalizeUnit(unidadeOriginal) || unidadeOriginal;
  const dest = normalizeUnit(unidadeDestino) || unidadeDestino;

  if (orig === dest) {
    return valor;
  }

  if (isMassUnit(orig) && isMassUnit(dest)) {
    const quantidadeEmMg = convertToStandardUnit(1, orig).quantidade;
    const quantidadeDestinoEmMg = convertToStandardUnit(1, dest).quantidade;
    return (valor * quantidadeEmMg) / quantidadeDestinoEmMg;
  }

  if (isVolumeUnit(orig) && isVolumeUnit(dest)) {
    const quantidadeEmMl = convertToStandardUnit(1, orig).quantidade;
    const quantidadeDestinoEmMl = convertToStandardUnit(1, dest).quantidade;
    return (valor * quantidadeEmMl) / quantidadeDestinoEmMl;
  }

  return valor;
}

export function convertValueToDisplayUnit(
  valor: number | null,
  unidadeValorOriginal: string | null | undefined,
  unidadeDisplay: string
): number | null {
  if (valor === null || valor === undefined) return null;
  if (!unidadeValorOriginal) return valor;

  return convertValueBetweenUnits(valor, unidadeValorOriginal, unidadeDisplay);
}

/**
 * Converte um valor unitário da unidade padrão (mg ou mL) para a unidade original
 *
 * Exemplo: Se valor_unitario = 0.001 (em mg) e unidade_original = 'kg'
 *          Retorna: 0.001 × 1.000.000 = 1000 (valor por kg)
 *
 * @param valorPorUnidadePadrao - Valor por mg ou mL (como armazenado no banco)
 * @param unidadeOriginal - Unidade original informada pelo usuário (ton, kg, L, etc)
 * @returns Valor convertido para a unidade original
 */
export function convertValueFromStandardUnit(
  valorPorUnidadePadrao: number,
  unidadeOriginal: string
): number {
  if (!unidadeOriginal) return valorPorUnidadePadrao;
  const orig = normalizeUnit(unidadeOriginal) || unidadeOriginal;

  // Para unidades de massa (ton, kg, g, mg)
  if (isMassUnit(orig)) {
    const fatorConversao = MASS_TO_MG[orig as MassUnit];
    return valorPorUnidadePadrao * fatorConversao;
  }

  // Para unidades de volume (L, mL)
  if (isVolumeUnit(orig)) {
    const fatorConversao = VOLUME_TO_ML[orig as VolumeUnit];
    return valorPorUnidadePadrao * fatorConversao;
  }

  // Para outras unidades (un), retorna o valor sem conversão
  return valorPorUnidadePadrao;
}

/**
 * Converte uma quantidade de uma unidade para outra (do mesmo tipo)
 * Conversão DIRETA sem passar por unidade padrão intermediária
 * Ex: convertBetweenUnits(2, 'ton', 'kg') → 2000
 * Ex: convertBetweenUnits(500, 'g', 'kg') → 0.5
 * Ex: convertBetweenUnits(2000, 'mL', 'L') → 2
 *
 * @param value - Valor a ser convertido
 * @param fromUnit - Unidade de origem
 * @param toUnit - Unidade de destino
 * @returns Valor convertido para a unidade de destino
 */
export function convertBetweenUnits(
  value: number,
  fromUnit: string,
  toUnit: string
): number {
  // Normalizar unidades primeiro (aceita "Kg", "KG", "gr", "litro" etc.)
  const from = normalizeUnit(fromUnit) || fromUnit;
  const to = normalizeUnit(toUnit) || toUnit;

  // Se as unidades são iguais, não precisa converter
  if (from === to) {
    return value;
  }

  // Conversão DIRETA entre unidades de massa
  if (isMassUnit(from) && isMassUnit(to)) {
    const fromFactor = MASS_TO_MG[from as MassUnit];  // quanto vale 1 unidade de origem em mg
    const toFactor = MASS_TO_MG[to as MassUnit];      // quanto vale 1 unidade de destino em mg
    return value * (fromFactor / toFactor);
  }

  // Conversão DIRETA entre unidades de volume
  if (isVolumeUnit(from) && isVolumeUnit(to)) {
    const fromFactor = VOLUME_TO_ML[from as VolumeUnit];  // quanto vale 1 unidade de origem em mL
    const toFactor = VOLUME_TO_ML[to as VolumeUnit];      // quanto vale 1 unidade de destino em mL
    return value * (fromFactor / toFactor);
  }

  // Para outras unidades ou incompatíveis, retorna o valor sem conversão
  return value;
}
