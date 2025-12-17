import { useState } from 'react';
import { X } from 'lucide-react';
import { DividaFinanciamento } from '../../services/dividasFinanciamentosService';
import CurrencyInput from '../common/CurrencyInput';

interface DividaFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (divida: Partial<DividaFinanciamento>) => void;
  initialData?: DividaFinanciamento | null;
}

const tipoOptions = [
  'Financiamento bancário',
  'Custeio',
  'Investimento',
  'Máquina',
  'CPR Financeira',
  'CPR Física',
  'Barter',
  'Adiantamento de venda',
  'Cooperativa / Revenda',
  'Outro',
];

const indexadorOptions = ['Fixo', 'CDI', 'Selic', '% café', 'Outro'];
const responsavelOptions = ['Produtor', 'Sócio', 'Empresa', 'Outro'];
const situacaoOptions = ['Ativa', 'Liquidada', 'Renegociada'];
const jurosFreqOptions = ['a.a.', 'a.m.'];

export default function DividaFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}: DividaFormModalProps) {
  const [formData, setFormData] = useState<Partial<DividaFinanciamento>>(
    initialData || {
      nome: '',
      credor: '',
      tipo: '',
      data_contratacao: '',
      valor_contratado: 0,
      taxa: '',
      juros_aa: 'a.a.',
      indexador: 'Fixo',
      carencia: '',
      garantia: '',
      responsavel: 'Produtor',
      observacoes: '',
      situacao: 'Ativa',
      anexos: [],
      pagamento_parcela: { valor: 0, data: '' },
      pagamento_parcelado: { numParcelas: 0, valorParcela: 0, primeiradata: '' },
      pagamento_producao: { produto: '', quantidadeSacas: 0, dataPeriodo: '' },
      cronograma_manual: '',
      forma_pagamento: '',
    }
  );

  const [showIndexadorOutro, setShowIndexadorOutro] = useState(
    initialData?.indexador === 'Outro'
  );

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const numValue = type === 'number' ? parseFloat(value) || 0 : value;

    if (name === 'indexador') {
      setShowIndexadorOutro(value === 'Outro');
    }

    setFormData((prev) => ({
      ...prev,
      [name]: numValue,
    }));
  };

  const handleNestedChange = (
    parent: 'pagamento_parcela' | 'pagamento_parcelado' | 'pagamento_producao',
    field: string,
    value: any
  ) => {
    setFormData((prev) => ({
      ...prev,
      [parent]: {
        ...((prev[parent] as any) || {}),
        [field]: value,
      },
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('📝 Formulário enviado:', formData);
    onSubmit(formData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-40 z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900">
              {initialData ? 'Editar' : 'Nova'} Dívida/Financiamento
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 space-y-4">
              {/* 1. Nome */}
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome *
                </label>
                <input
                  type="text"
                  name="nome"
                  value={formData.nome || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-100 rounded-lg focus:ring-2 focus:ring-[#00A651] focus:border-transparent outline-none"
                  placeholder="Ex: Custeio 2025"
                  required
                />
              </div>

              {/* 2. Credor */}
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Credor *
                </label>
                <input
                  type="text"
                  name="credor"
                  value={formData.credor || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-100 rounded-lg focus:ring-2 focus:ring-[#00A651] focus:border-transparent outline-none"
                  placeholder="Ex: Banco do Brasil"
                  required
                />
              </div>

              {/* 3. Tipo */}
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo *
                </label>
                <select
                  name="tipo"
                  value={formData.tipo || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-100 rounded-lg focus:ring-2 focus:ring-[#00A651] focus:border-transparent outline-none"
                  required
                >
                  <option value="">Selecione...</option>
                  {tipoOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              {/* 4. Data da contratação */}
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data da Contratação
                </label>
                <input
                  type="date"
                  name="data_contratacao"
                  value={formData.data_contratacao || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-100 rounded-lg focus:ring-2 focus:ring-[#00A651] focus:border-transparent outline-none"
                />
              </div>

              {/* 5. Valor contratado */}
              <div className="col-span-1">
                <CurrencyInput
                  value={formData.valor_contratado || 0}
                  onChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      valor_contratado: value,
                    }))
                  }
                  label="Valor Contratado"
                  required
                />
              </div>

              {/* 6. Taxa de juros */}
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Taxa de Juros (%)
                </label>
                <input
                  type="number"
                  name="taxa"
                  value={formData.taxa || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-100 rounded-lg focus:ring-2 focus:ring-[#00A651] focus:border-transparent outline-none"
                  placeholder="Ex: 12"
                  step="0.01"
                />
              </div>

              {/* 7. Juros a.a./a.m. */}
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Juros
                </label>
                <select
                  name="juros_aa"
                  value={formData.juros_aa || 'a.a.'}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-100 rounded-lg focus:ring-2 focus:ring-[#00A651] focus:border-transparent outline-none"
                >
                  {jurosFreqOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              {/* 8. Indexador */}
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Indexador
                </label>
                <select
                  name="indexador"
                  value={formData.indexador || 'Fixo'}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-100 rounded-lg focus:ring-2 focus:ring-[#00A651] focus:border-transparent outline-none"
                >
                  {indexadorOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              {/* 8b. Indexador Outro */}
              {showIndexadorOutro && (
                <div className="col-span-1 md:col-span-2">
                  <input
                    type="text"
                    name="indexador_outro"
                    value={formData.indexador_outro || ''}
                    onChange={handleChange}
                    placeholder="Especifique o indexador"
                    className="w-full px-3 py-2 border border-gray-100 rounded-lg focus:ring-2 focus:ring-[#00A651] focus:border-transparent outline-none"
                  />
                </div>
              )}

              {/* 9. Carência */}
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Carência
                </label>
                <input
                  type="text"
                  name="carencia"
                  value={formData.carencia || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-100 rounded-lg focus:ring-2 focus:ring-[#00A651] focus:border-transparent outline-none"
                  placeholder="Ex: 6 meses"
                />
              </div>

              {/* 10. Garantia */}
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Garantia
                </label>
                <input
                  type="text"
                  name="garantia"
                  value={formData.garantia || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-100 rounded-lg focus:ring-2 focus:ring-[#00A651] focus:border-transparent outline-none"
                  placeholder="Ex: Safra 2025"
                />
              </div>

              {/* 11. Responsável */}
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Responsável
                </label>
                <select
                  name="responsavel"
                  value={formData.responsavel || 'Produtor'}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-100 rounded-lg focus:ring-2 focus:ring-[#00A651] focus:border-transparent outline-none"
                >
                  {responsavelOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              {/* 12. Observações */}
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observações
                </label>
                <textarea
                  name="observacoes"
                  value={formData.observacoes || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-100 rounded-lg focus:ring-2 focus:ring-[#00A651] focus:border-transparent outline-none resize-none"
                  rows={3}
                  placeholder="Adicione observações sobre a dívida"
                />
              </div>

              {/* SEÇÃO: Formas de Pagamento */}
              <div className="col-span-1 md:col-span-2 border-t border-gray-200 pt-4 mt-4">
                <h3 className="text-sm font-bold text-gray-900 mb-4">Formas de Pagamento</h3>
              </div>

              {/* 13. Pagamento parcela única */}
              <div className="col-span-1 md:col-span-2 border border-gray-100 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Parcela Única</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <CurrencyInput
                      value={formData.pagamento_parcela?.valor || 0}
                      onChange={(value) =>
                        handleNestedChange('pagamento_parcela', 'valor', value)
                      }
                      label="Valor"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Data
                    </label>
                    <input
                      type="date"
                      value={formData.pagamento_parcela?.data || ''}
                      onChange={(e) =>
                        handleNestedChange('pagamento_parcela', 'data', e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-100 rounded-lg focus:ring-2 focus:ring-[#00A651] focus:border-transparent outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 14. Pagamento parcelado */}
              <div className="col-span-1 md:col-span-2 border border-gray-100 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Parcelado</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Nº Parcelas
                    </label>
                    <input
                      type="number"
                      value={formData.pagamento_parcelado?.numParcelas || 0}
                      onChange={(e) =>
                        handleNestedChange(
                          'pagamento_parcelado',
                          'numParcelas',
                          parseInt(e.target.value) || 0
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-100 rounded-lg focus:ring-2 focus:ring-[#00A651] focus:border-transparent outline-none"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <CurrencyInput
                      value={formData.pagamento_parcelado?.valorParcela || 0}
                      onChange={(value) =>
                        handleNestedChange('pagamento_parcelado', 'valorParcela', value)
                      }
                      label="Valor/Parcela"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Primeira Data
                    </label>
                    <input
                      type="date"
                      value={formData.pagamento_parcelado?.primeiradata || ''}
                      onChange={(e) =>
                        handleNestedChange('pagamento_parcelado', 'primeiradata', e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-100 rounded-lg focus:ring-2 focus:ring-[#00A651] focus:border-transparent outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 15. Pagamento com produção */}
              <div className="col-span-1 md:col-span-2 border border-gray-100 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Com Produção</h4>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Produto
                    </label>
                    <input
                      type="text"
                      value={formData.pagamento_producao?.produto || ''}
                      onChange={(e) =>
                        handleNestedChange('pagamento_producao', 'produto', e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-100 rounded-lg focus:ring-2 focus:ring-[#00A651] focus:border-transparent outline-none"
                      placeholder="Ex: Café"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Qtd. (sacas)
                    </label>
                    <input
                      type="number"
                      value={formData.pagamento_producao?.quantidadeSacas || 0}
                      onChange={(e) =>
                        handleNestedChange(
                          'pagamento_producao',
                          'quantidadeSacas',
                          parseInt(e.target.value) || 0
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-100 rounded-lg focus:ring-2 focus:ring-[#00A651] focus:border-transparent outline-none"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <CurrencyInput
                      value={formData.pagamento_producao?.precoPorSaca || 0}
                      onChange={(value) =>
                        handleNestedChange('pagamento_producao', 'precoPorSaca', value)
                      }
                      label="Preço/Saca"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Data/Período
                    </label>
                    <input
                      type="text"
                      value={formData.pagamento_producao?.dataPeriodo || ''}
                      onChange={(e) =>
                        handleNestedChange('pagamento_producao', 'dataPeriodo', e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-100 rounded-lg focus:ring-2 focus:ring-[#00A651] focus:border-transparent outline-none"
                      placeholder="Ex: Junho 2025"
                    />
                  </div>
                </div>
              </div>

              {/* 16. Cronograma manual */}
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cronograma Manual
                </label>
                <textarea
                  name="cronograma_manual"
                  value={formData.cronograma_manual || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-100 rounded-lg focus:ring-2 focus:ring-[#00A651] focus:border-transparent outline-none resize-none"
                  rows={3}
                  placeholder="Descreva o cronograma de pagamento customizado"
                />
              </div>

              {/* 17. Anexos (mockado) */}
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Anexos (Mockado)
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-not-allowed">
                  <p className="text-sm text-gray-600">
                    Upload de arquivos desabilitado (mock apenas)
                  </p>
                </div>
              </div>

              {/* 18. Situação */}
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Situação *
                </label>
                <select
                  name="situacao"
                  value={formData.situacao || 'Ativa'}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-100 rounded-lg focus:ring-2 focus:ring-[#00A651] focus:border-transparent outline-none"
                  required
                >
                  {situacaoOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </form>

          {/* Footer */}
          <div className="border-t border-gray-100 p-4 md:p-6 flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-100 hover:bg-gray-50 rounded-lg text-sm font-medium text-gray-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-[#00A651] hover:bg-[#008c44] text-white rounded-lg text-sm font-medium transition-colors"
            >
              Salvar
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
