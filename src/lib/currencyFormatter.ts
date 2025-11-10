// src/lib/currencyFormatter.ts

/**
 * Formata um valor numérico para o formato de moeda brasileira (R$ 1.000,00)
 * @param value - Valor em centavos ou string
 * @returns String formatada no padrão brasileiro
 */
export const formatCurrency = (value: number | string): string => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(numValue)) return 'R$ 0,00';

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numValue);
};

/**
 * Remove formatação de moeda e retorna apenas os dígitos
 * @param value - String formatada (ex: "R$ 1.234,56")
 * @returns String com apenas números (ex: "123456")
 */
export const unformatCurrency = (value: string): string => {
  return value.replace(/\D/g, '');
};

/**
 * Converte string de centavos para valor decimal
 * @param cents - String com centavos (ex: "123456")
 * @returns Número decimal (ex: 1234.56)
 */
export const centsToDecimal = (cents: string): number => {
  const numCents = parseInt(cents || '0', 10);
  return numCents / 100;
};

/**
 * Formata o input enquanto o usuário digita
 * Remove tudo que não for número e formata automaticamente
 * @param value - Valor atual do input
 * @returns Objeto com valor formatado para exibição e valor numérico
 */
export const formatCurrencyInput = (value: string): {
  formatted: string;
  numeric: number;
  cents: string;
} => {
  // Remove tudo que não for número
  const onlyNumbers = unformatCurrency(value);

  // Se vazio, retorna 0
  if (!onlyNumbers) {
    return {
      formatted: 'R$ 0,00',
      numeric: 0,
      cents: '0'
    };
  }

  // Converte para número (valor completo que o usuário digitou)
  const numericValue = parseFloat(onlyNumbers);

  // Formata para exibição
  const formatted = formatCurrency(numericValue);

  return {
    formatted,
    numeric: numericValue,
    cents: onlyNumbers
  };
};

/**
 * Hook de React para gerenciar input de moeda
 */
export const useCurrencyInput = (initialValue: string | number = 0) => {
  const getInitialFormatted = () => {
    if (typeof initialValue === 'number') {
      return formatCurrency(initialValue);
    }
    if (initialValue === '' || initialValue === '0') {
      return 'R$ 0,00';
    }
    return formatCurrencyInput(initialValue).formatted;
  };

  const [displayValue, setDisplayValue] = React.useState<string>(getInitialFormatted());
  const [numericValue, setNumericValue] = React.useState<number>(
    typeof initialValue === 'number' ? initialValue : 0
  );

  const handleChange = (inputValue: string) => {
    const result = formatCurrencyInput(inputValue);
    setDisplayValue(result.formatted);
    setNumericValue(result.numeric);
    return result;
  };

  return {
    displayValue,
    numericValue,
    handleChange,
    reset: () => {
      setDisplayValue('R$ 0,00');
      setNumericValue(0);
    }
  };
};

// Adiciona React ao escopo para o hook
import React from 'react';
