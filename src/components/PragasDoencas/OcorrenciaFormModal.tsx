import { useState, useEffect } from 'react';
import { X, Check, Upload, Image as ImageIcon } from 'lucide-react';
import { Ocorrencia } from './mockOcorrencias';
import { TalhaoService } from '../../services/talhaoService';
import { PragasDoencasService } from '../../services/pragasDoencasService';

interface TalhaoOption {
  id_talhao: string;
  nome: string;
}

interface OcorrenciaFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (ocorrencia: Partial<Ocorrencia>, talhaoIds: string[], imageFile?: File) => void;
  initialData?: Ocorrencia | null;
  userId: string;
  initialTalhaoIds?: string[];
}

const fasesOptions = ['Vegetativo', 'Floração', 'Granação', 'Pré-colheita', 'Colheita', 'Pós-colheita'];
const tiposOptions = ['Praga', 'Doença', 'Deficiência', 'Planta daninha', 'Não sei / Outra'];
const severidadeOptions = ['Baixa', 'Média', 'Alta'];
const statusOptions = ['Nova', 'Em acompanhamento', 'Resolvida'];

export default function OcorrenciaFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  userId,
  initialTalhaoIds = [],
}: OcorrenciaFormModalProps) {
  const [formData, setFormData] = useState<Partial<Ocorrencia>>(
    initialData || {
      talhao: '',
      dataOcorrencia: '',
      faseLavoura: 'Vegetativo',
      tipoOcorrencia: 'Praga',
      severidade: 'Média',
      areaAfetada: '',
      sintomas: '',
      acaoTomada: '',
      nomePraga: '',
      descricaoDetalhada: '',
      climaRecente: '',
      produtosAplicados: [],
      dataAplicacao: '',
      recomendacoes: '',
      status: 'Nova',
    }
  );

  const [produtoInput, setProdutoInput] = useState('');
  const [talhoes, setTalhoes] = useState<TalhaoOption[]>([]);
  const [selectedTalhaoIds, setSelectedTalhaoIds] = useState<string[]>(initialTalhaoIds);
  const [loadingTalhoes, setLoadingTalhoes] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && userId) {
      loadTalhoes();
    }
    if (!isOpen) {
      setSelectedImage(null);
      setImagePreview(null);
    }
  }, [isOpen, userId]);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
      // Carregar preview da imagem se existir
      const fp = initialData.fotoPrincipal;
      const storagePath = PragasDoencasService.extractStoragePath(fp);
      if (storagePath) {
        (async () => {
          try {
            const signedUrl = await PragasDoencasService.getSignedUrl(fp, 3600, userId);
            if (signedUrl) {
              setImagePreview(signedUrl);
            }
          } catch (error) {
            console.error('[OcorrenciaFormModal] Erro ao gerar signed URL:', error);
          }
        })();
      }
    }
    if (initialTalhaoIds.length > 0) {
      setSelectedTalhaoIds(initialTalhaoIds);
    }
  }, [initialData, initialTalhaoIds, userId]);

  const loadTalhoes = async () => {
    setLoadingTalhoes(true);
    try {
      const allTalhoes = await TalhaoService.getTalhoesNonDefault(userId);
      const talhaoOptions = allTalhoes.map(t => ({
        id_talhao: t.id_talhao,
        nome: t.nome
      }));
      setTalhoes(talhaoOptions);
    } catch (error) {
      console.error('Erro ao carregar talhoes:', error);
    } finally {
      setLoadingTalhoes(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleTalhaoToggle = (talhaoId: string) => {
    setSelectedTalhaoIds((prev) => {
      if (prev.includes(talhaoId)) {
        return prev.filter((id) => id !== talhaoId);
      } else {
        return [...prev, talhaoId];
      }
    });
  };

  const handleAddProduto = () => {
    if (produtoInput.trim()) {
      setFormData((prev) => ({
        ...prev,
        produtosAplicados: [...(prev.produtosAplicados || []), produtoInput.trim()],
      }));
      setProdutoInput('');
    }
  };

  const handleRemoveProduto = (idx: number) => {
    setFormData((prev) => ({
      ...prev,
      produtosAplicados: (prev.produtosAplicados || []).filter((_, i) => i !== idx),
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('A imagem deve ter no máximo 5MB');
        return;
      }

      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedTalhaoIds.length === 0 && !formData.talhao) {
      alert('Por favor, selecione pelo menos um talhão afetado');
      return;
    }

    const selectedTalhaoNames = talhoes
      .filter((t) => selectedTalhaoIds.includes(t.id_talhao))
      .map((t) => t.nome)
      .join(', ');

    const dataToSubmit = {
      ...formData,
      talhao: selectedTalhaoNames || formData.talhao,
    };

    onSubmit(dataToSubmit, selectedTalhaoIds, selectedImage || undefined);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-40 z-50 transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <h2 className="text-xl font-bold text-[#004417] mb-4">
              {initialData ? 'Editar Ocorrencia' : 'Nova Ocorrencia'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <form onSubmit={handleSubmit} id="ocorrenciaForm" className="flex-1 overflow-y-auto p-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">
                  Informacoes da Ocorrencia
                </h3>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Talhoes Afetados *
                  </label>
                  {loadingTalhoes ? (
                    <div className="text-sm text-gray-500">Carregando talhoes...</div>
                  ) : talhoes.length === 0 ? (
                    <div className="text-sm text-gray-500 p-3 bg-gray-50 rounded-lg">
                      Nenhum talhao cadastrado. Cadastre seus talhoes primeiro.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 rounded-lg">
                      {talhoes.map((talhao) => (
                        <button
                          key={talhao.id_talhao}
                          type="button"
                          onClick={() => handleTalhaoToggle(talhao.id_talhao)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            selectedTalhaoIds.includes(talhao.id_talhao)
                              ? 'bg-[#00A651] text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {selectedTalhaoIds.includes(talhao.id_talhao) && (
                            <Check className="w-4 h-4" />
                          )}
                          {talhao.nome}
                        </button>
                      ))}
                    </div>
                  )}
                  {selectedTalhaoIds.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      {selectedTalhaoIds.length} talhao(s) selecionado(s)
                    </p>
                  )}
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data da Ocorrencia *
                  </label>
                  <input
                    type="date"
                    name="dataOcorrencia"
                    value={formData.dataOcorrencia || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-100 rounded-lg focus:ring-2 focus:ring-[#00A651] focus:border-transparent outline-none"
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fase da Lavoura *
                  </label>
                  <select
                    name="faseLavoura"
                    value={formData.faseLavoura || 'Vegetativo'}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-100 rounded-lg focus:ring-2 focus:ring-[#00A651] focus:border-transparent outline-none"
                    required
                  >
                    {fasesOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo da Ocorrencia *
                  </label>
                  <select
                    name="tipoOcorrencia"
                    value={formData.tipoOcorrencia || 'Praga'}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-100 rounded-lg focus:ring-2 focus:ring-[#00A651] focus:border-transparent outline-none"
                    required
                  >
                    {tiposOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Severidade *
                  </label>
                  <select
                    name="severidade"
                    value={formData.severidade || 'Media'}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-100 rounded-lg focus:ring-2 focus:ring-[#00A651] focus:border-transparent outline-none"
                    required
                  >
                    {severidadeOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Area Afetada Aproximada *
                  </label>
                  <input
                    type="text"
                    name="areaAfetada"
                    value={formData.areaAfetada || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-100 rounded-lg focus:ring-2 focus:ring-[#00A651] focus:border-transparent outline-none"
                    placeholder="Ex: ~10% do talhao"
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sintomas Observados *
                  </label>
                  <textarea
                    name="sintomas"
                    value={formData.sintomas || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-100 rounded-lg focus:ring-2 focus:ring-[#00A651] focus:border-transparent outline-none resize-none"
                    rows={3}
                    placeholder="Descreva os sintomas observados"
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Acao Tomada *
                  </label>
                  <textarea
                    name="acaoTomada"
                    value={formData.acaoTomada || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-100 rounded-lg focus:ring-2 focus:ring-[#00A651] focus:border-transparent outline-none resize-none"
                    rows={2}
                    placeholder="Qual acao foi tomada para contornar o problema"
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Foto Principal
                  </label>
                  {!imagePreview ? (
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-200 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 text-gray-400 mb-2" />
                        <p className="text-sm text-gray-500 font-medium">Clique para adicionar foto</p>
                        <p className="text-xs text-gray-400 mt-1">PNG, JPG até 5MB</p>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleImageChange}
                      />
                    </label>
                  ) : (
                    <div className="relative w-full h-40 border border-gray-200 rounded-lg overflow-hidden">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="absolute top-2 right-2 p-1.5 bg-[#F7941F] hover:bg-[#e07d0d] text-white rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                        <ImageIcon className="w-3 h-3" />
                        Imagem selecionada
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <h3 className="text-sm font-medium text-gray-700 mb-3 uppercase tracking-wide">
                  Informacoes Adicionais
                </h3>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome da Praga / Doenca
                  </label>
                  <input
                    type="text"
                    name="nomePraga"
                    value={formData.nomePraga || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-100 rounded-lg focus:ring-2 focus:ring-[#00A651] focus:border-transparent outline-none"
                    placeholder="Ex: Ferrugem do cafeeiro"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descricao Detalhada dos Sintomas
                  </label>
                  <textarea
                    name="descricaoDetalhada"
                    value={formData.descricaoDetalhada || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-100 rounded-lg focus:ring-2 focus:ring-[#00A651] focus:border-transparent outline-none resize-none"
                    rows={2}
                    placeholder="Detalhe mais sobre os sintomas"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Clima Recente
                  </label>
                  <input
                    type="text"
                    name="climaRecente"
                    value={formData.climaRecente || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-100 rounded-lg focus:ring-2 focus:ring-[#00A651] focus:border-transparent outline-none"
                    placeholder="Ex: Ultimos 7 dias com muita chuva"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Produtos Aplicados
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={produtoInput}
                      onChange={(e) => setProdutoInput(e.target.value)}
                      placeholder="Ex: Fungicida X - 0,5 L/ha"
                      className="flex-1 px-3 py-2 border border-gray-100 rounded-lg focus:ring-2 focus:ring-[#00A651] focus:border-transparent outline-none text-sm"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddProduto();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddProduto}
                      className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium text-gray-700 transition-colors"
                    >
                      +
                    </button>
                  </div>
                  {formData.produtosAplicados && formData.produtosAplicados.length > 0 && (
                    <div className="space-y-2">
                      {formData.produtosAplicados.map((produto, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between bg-gray-50 p-2 rounded-lg text-sm"
                        >
                          <span className="text-gray-700">{produto}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveProduto(idx)}
                            className="text-[#F7941F] hover:text-[#F7941F] hover:opacity-70 font-medium"
                          >
                            X
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data da Aplicacao
                  </label>
                  <input
                    type="date"
                    name="dataAplicacao"
                    value={formData.dataAplicacao || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-100 rounded-lg focus:ring-2 focus:ring-[#00A651] focus:border-transparent outline-none"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Proximas Recomendacoes / Acompanhamento
                  </label>
                  <textarea
                    name="recomendacoes"
                    value={formData.recomendacoes || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-100 rounded-lg focus:ring-2 focus:ring-[#00A651] focus:border-transparent outline-none resize-none"
                    rows={2}
                    placeholder="Recomendacoes para acompanhamento futuro"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status da Ocorrencia *
                  </label>
                  <select
                    name="status"
                    value={formData.status || 'Nova'}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-100 rounded-lg focus:ring-2 focus:ring-[#00A651] focus:border-transparent outline-none"
                    required
                  >
                    {statusOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </form>

          <div className="border-t border-gray-100 p-4 md:p-6 flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-100 hover:bg-gray-50 rounded-lg text-sm font-medium text-gray-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="ocorrenciaForm"
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
