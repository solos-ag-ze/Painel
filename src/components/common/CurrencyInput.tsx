import { useState, useEffect } from 'react';
import { formatCurrencyInput, initializeCurrencyInput } from '../../lib/currencyFormatter';

interface CurrencyInputProps {
  value: number;
  onChange: (numericValue: number) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
}

export default function CurrencyInput({
  value,
  onChange,
  placeholder = '0,00',
  label,
  required = false,
  disabled = false,
  error,
}: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = useState<string>('');

  useEffect(() => {
    const initial = initializeCurrencyInput(value);
    setDisplayValue(initial.formatted);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;

    let cleanInput = input.replace(/R\$/g, '').trim();

    if (!cleanInput) {
      setDisplayValue('R$ 0,00');
      onChange(0);
      return;
    }

    const result = formatCurrencyInput(cleanInput);
    setDisplayValue(result.formatted);
    onChange(result.numeric);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (displayValue === 'R$ 0,00') {
      e.target.select();
    }
  };

  const handleBlur = () => {
    if (!displayValue || displayValue === 'R$') {
      setDisplayValue('R$ 0,00');
      onChange(0);
    }
  };

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          type="text"
          inputMode="decimal"
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={`R$ ${placeholder}`}
          disabled={disabled}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#00A651] focus:border-transparent outline-none transition-colors ${
            error
              ? 'border-red-300 bg-red-50'
              : 'border-gray-100 hover:border-gray-200'
          } ${disabled ? 'bg-gray-50 cursor-not-allowed text-gray-500' : ''}`}
          required={required}
        />
      </div>
      {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
    </div>
  );
}
