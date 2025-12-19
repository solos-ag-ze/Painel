import { useState, useEffect } from 'react';
import { X, Upload, RefreshCw, Trash2 } from 'lucide-react';
import { DividaFinanciamento } from '../../services/dividasFinanciamentosService';
import CurrencyInput from '../common/CurrencyInput';

interface DividaFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  // agora aceita arquivos selecionados opcionalmente
  onSubmit: (divida: Partial<DividaFinanciamento>, files?: File[], removedAnexos?: string[]) => void;
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
  const getEmptyFormData = (): Partial<DividaFinanciamento> => ({
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
  });

  const [formData, setFormData] = useState<Partial<DividaFinanciamento>>(
    initialData || getEmptyFormData()
  );
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [existingAnexos, setExistingAnexos] = useState<string[]>([]);
  const [removedAnexos, setRemovedAnexos] = useState<string[]>([]);
  const [signedExisting, setSignedExisting] = useState<Record<string, string>>({});

  const [showIndexadorOutro, setShowIndexadorOutro] = useState(
    initialData?.indexador === 'Outro'
  );

  // Atualiza o formData quando initialData mudar (edição vs novo)
  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
      setShowIndexadorOutro(initialData.indexador === 'Outro');
      // normalizar anexos do initialData (pode ser array ou string JSON)
      try {
        const raw = (initialData as any).anexos;
        if (!raw) setExistingAnexos([]);
        else if (Array.isArray(raw)) setExistingAnexos((raw as string[]).map((a: string) => {
          if (typeof a === 'string' && a.startsWith('http')) {
            const m = a.match(/dividas_financiamentos\/(.*)$/);
            return m ? decodeURIComponent(m[1].split('?')[0]) : a;
          }
          return a;
        }));
        else if (typeof raw === 'string') {
          const parsed = JSON.parse(raw);
          setExistingAnexos(Array.isArray(parsed) ? parsed.map((a: string) => {
            // se for URL pública antiga, extrai apenas o path relativo
            if (typeof a === 'string' && a.startsWith('http')) {
              const m = a.match(/dividas_financiamentos\/(.*)$/);
              return m ? decodeURIComponent(m[1].split('?')[0]) : a;
            }
            return a;
          }) : []);
        } else setExistingAnexos([]);
      } catch (err) {
        setExistingAnexos([]);
      }
    } else {
      setFormData(getEmptyFormData());
      setShowIndexadorOutro(false);
    }
    // reset arquivos selecionados quando troca entre editar/novo
    setSelectedFiles([]);
  }, [initialData]);

  useEffect(() => {
    let mounted = true;
    const bucket = 'dividas_financiamentos';
    const load = async () => {
      const map: Record<string, string> = {};
      for (const path of existingAnexos) {
        try {
          if (!path) continue;
          // se já for URL pública, usa direto
          if (path.startsWith('http')) {
            map[path] = path;
            continue;
          }
          const { data, error } = await (await import('../../lib/supabase')).supabase.storage.from(bucket).createSignedUrl(path, 60);
          if (!error && data?.signedUrl) map[path] = data.signedUrl;
        } catch (err) {
          console.error('Erro gerando signed url para existingAnexos:', err);
        }
      }
      if (mounted) setSignedExisting(map);
    };
    load();
    return () => { mounted = false; };
  }, [existingAnexos]);

  // quando modal fecha, garantir que o state de arquivos seja resetado
  useEffect(() => {
    if (!isOpen) setSelectedFiles([]);
  }, [isOpen]);

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
    console.log('📝 Formulário enviado:', formData, 'arquivos:', selectedFiles);
    onSubmit(
      formData,
      selectedFiles.length ? selectedFiles : undefined,
      removedAnexos.length ? removedAnexos : undefined
    );
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
              <h2 className="text-xl font-bold text-[#004417] mb-4">
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
          <form id="divida-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
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

              {/* 17. Anexos */}
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Anexos
                </label>

                {existingAnexos.length > 0 && (
                  <div className="mb-3 flex items-center gap-4">
                    {existingAnexos.map((url, i) => {
                      const displayUrl = signedExisting[url] || (url.startsWith('http') ? url : undefined);
                      const name = (url.split('/').pop()?.split('?')[0]) || `anexo-${i}`;
                      const ext = (name.split('.').pop() || '').toLowerCase();
                      const isImage = ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext);
                      return (
                        <div key={i} className="relative">
                          <a href={displayUrl || '#'} target="_blank" rel="noreferrer" className="block">
                            {isImage && displayUrl ? (
                              <img src={displayUrl} alt={name} className="w-20 h-14 object-cover rounded border border-gray-100" />
                            ) : displayUrl ? (
                              <div className="w-20 h-14 flex items-center justify-center bg-gray-100 rounded border border-gray-100 text-xs text-gray-600 px-1">
                                {name.length > 18 ? name.slice(0, 15) + '...' : name}
                              </div>
                            ) : (
                              <div className="w-20 h-14 flex items-center justify-center bg-gray-50 rounded border border-gray-100 text-xs text-gray-400 px-1">
                                Carregando...
                              </div>
                            )}
                          </a>

                          <div className="absolute -top-2 -right-2 flex gap-2">
                            <label htmlFor={`replace-${i}`} className="cursor-pointer bg-white border border-gray-200 rounded-full p-2 text-gray-600 shadow-sm hover:bg-gray-50" title="Substituir">
                              <RefreshCw className="w-4 h-4" />
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                setExistingAnexos((prev) => prev.filter((u) => u !== url));
                                setRemovedAnexos((prev) => [...prev, url]);
                              }}
                              className="bg-white border border-gray-200 rounded-full p-2 text-red-500 shadow-sm hover:bg-gray-50"
                              title="Remover"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <input
                            id={`replace-${i}`}
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,.webp"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (!f) return;
                              // mark old for removal and add new to selected files
                              setExistingAnexos((prev) => prev.filter((u) => u !== url));
                              setRemovedAnexos((prev) => [...prev, url]);
                              setSelectedFiles((prev) => [...prev, f]);
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className={`rounded-[14px] p-5 transition-all flex items-center gap-4 justify-between ${
                  selectedFiles.length > 0 ? 'bg-[#F5FDF8] border-2 border-dashed border-[#00A651]' : 'bg-[#F5FDF8] border-2 border-dashed border-[#00A651]'
                }`}>
                  <input
                    type="file"
                    id="file-upload-divida"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    multiple
                    onChange={(e) => {
                      const files = e.target.files;
                      if (!files) return;
                      setSelectedFiles(Array.from(files));
                    }}
                    className="hidden"
                  />

                  <label htmlFor="file-upload-divida" className="cursor-pointer w-full">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-lg bg-white/60 border border-gray-100 flex items-center justify-center">
                        <Upload className={`w-7 h-7 text-[#00A651]`} />
                      </div>

                      <div className="text-left w-full">
                        <p className={`text-[15px] ${selectedFiles.length ? 'font-semibold text-[#004417]' : 'text-[#00441799]'}`}>
                          {selectedFiles.length === 0 ? 'Anexar arquivo(s)' : selectedFiles.length === 1 ? selectedFiles[0].name : `${selectedFiles.length} arquivos selecionados`}
                        </p>
                        <p className="text-[13px] text-[#00441799]">PDF, JPG, PNG, WEBP — máximo 10MB por arquivo</p>
                      </div>

                      <div className="text-sm text-gray-500">Clique para selecionar</div>
                    </div>
                  </label>
                </div>

                {selectedFiles.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    {selectedFiles.map((f, idx) => {
                      const isImage = /(png|jpe?g|webp|gif)$/i.test(f.name);
                      const sizeKb = Math.round(f.size / 1024);
                      return (
                        <div key={idx} className="flex items-center gap-3 bg-white p-3 rounded-[12px] border border-[#00A65133]">
                          <div className="w-20 h-14 flex items-center justify-center bg-gray-50 rounded overflow-hidden border">
                            {isImage ? (
                              <img src={URL.createObjectURL(f)} alt={f.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="text-xs text-gray-600 px-2 text-center">{f.name.length > 20 ? f.name.slice(0, 17) + '...' : f.name}</div>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="text-sm text-[#004417] truncate">{f.name}</div>
                            <div className="text-xs text-[#00441799]">{sizeKb} KB</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedFiles((prev) => prev.filter((_, i) => i !== idx))}
                              className="bg-white border border-gray-200 rounded-full p-2 text-red-500 shadow-sm hover:bg-gray-50"
                              title="Remover arquivo selecionado"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
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
              form="divida-form"
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
