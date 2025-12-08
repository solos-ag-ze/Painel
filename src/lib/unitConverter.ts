export type MassUnit = 'ton' | 'kg' | 'g' | 'mg';
export type VolumeUnit = 'L' | 'mL';
export type OtherUnit = 'un';
export type Unit = MassUnit | VolumeUnit | OtherUnit;

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
  return ['ton', 'kg', 'g', 'mg'].includes(unit);
}

export function isVolumeUnit(unit: string): unit is VolumeUnit {
  return ['L', 'mL'].includes(unit);
}

export function isOtherUnit(unit: string): unit is OtherUnit {
  return unit === 'un';
}

export function convertToStandardUnit(quantidade: number, unidade: string): { quantidade: number; unidade: string } {
  if (isMassUnit(unidade)) {
    if (unidade === 'mg') {
      return { quantidade, unidade: 'mg' };
    }
    const fator = MASS_TO_MG[unidade];
    return {
      quantidade: quantidade * fator,
      unidade: 'mg'
    };
  }

  if (isVolumeUnit(unidade)) {
    if (unidade === 'mL') {
      return { quantidade, unidade: 'mL' };
    }
    const fator = VOLUME_TO_ML[unidade];
    return {
      quantidade: quantidade * fator,
      unidade: 'mL'
    };
  }

  return { quantidade, unidade };
}

export function convertFromStandardUnit(
  quantidadePadrao: number,
  unidadePadrao: string,
  unidadeDesejada: string
): number {
  if (unidadePadrao === 'mg' && isMassUnit(unidadeDesejada)) {
    const fator = MASS_TO_MG[unidadeDesejada];
    return quantidadePadrao / fator;
  }

  if (unidadePadrao === 'mL' && isVolumeUnit(unidadeDesejada)) {
    const fator = VOLUME_TO_ML[unidadeDesejada];
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
  if (unidadeOriginal === unidadeDestino) {
    return valor;
  }

  if (isMassUnit(unidadeOriginal) && isMassUnit(unidadeDestino)) {
    const quantidadeEmMg = convertToStandardUnit(1, unidadeOriginal).quantidade;
    const quantidadeDestinoEmMg = convertToStandardUnit(1, unidadeDestino).quantidade;
    return (valor * quantidadeEmMg) / quantidadeDestinoEmMg;
  }

  if (isVolumeUnit(unidadeOriginal) && isVolumeUnit(unidadeDestino)) {
    const quantidadeEmMl = convertToStandardUnit(1, unidadeOriginal).quantidade;
    const quantidadeDestinoEmMl = convertToStandardUnit(1, unidadeDestino).quantidade;
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

  // Para unidades de massa (ton, kg, g, mg)
  if (isMassUnit(unidadeOriginal)) {
    const fatorConversao = MASS_TO_MG[unidadeOriginal];
    return valorPorUnidadePadrao * fatorConversao;
  }

  // Para unidades de volume (L, mL)
  if (isVolumeUnit(unidadeOriginal)) {
    const fatorConversao = VOLUME_TO_ML[unidadeOriginal];
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
  // Se as unidades são iguais, não precisa converter
  if (fromUnit === toUnit) {
    return value;
  }

  // Conversão DIRETA entre unidades de massa
  if (isMassUnit(fromUnit) && isMassUnit(toUnit)) {
    const fromFactor = MASS_TO_MG[fromUnit];  // quanto vale 1 unidade de origem em mg
    const toFactor = MASS_TO_MG[toUnit];      // quanto vale 1 unidade de destino em mg
    return value * (fromFactor / toFactor);
  }

  // Conversão DIRETA entre unidades de volume
  if (isVolumeUnit(fromUnit) && isVolumeUnit(toUnit)) {
    const fromFactor = VOLUME_TO_ML[fromUnit];  // quanto vale 1 unidade de origem em mL
    const toFactor = VOLUME_TO_ML[toUnit];      // quanto vale 1 unidade de destino em mL
    return value * (fromFactor / toFactor);
  }

  // Para outras unidades ou incompatíveis, retorna o valor sem conversão
  return value;
}
