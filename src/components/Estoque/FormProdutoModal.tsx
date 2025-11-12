// src/components/Estoque/FormProdutoModal.tsx
import React, { useState } from 'react';
import { X, Save, Upload } from 'lucide-react';
import { EstoqueService } from '../../services/estoqueService';
import { AuthService } from '../../services/authService';
import { AttachmentProductService } from '../../services/attachmentProductService';
import { formatCurrencyInput } from '../../lib/currencyFormatter';
import SuccessToast from '../common/SuccessToast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (produto: any) => void;
}

export default function FormProdutoModal({ isOpen, onClose, onCreated }: Props) {
  const [formData, setFormData] = useState({
    nome: '',
    marca: '',
    categoria: '',
    unidade: '',
    quantidade: '',
    valor: '',
    valorDisplay: 'R$ 0,00',
    lote: '',
    validade: '',
    fornecedor: '',
    registro_mapa: '',
    anexo: null as File | null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  if (!isOpen) return null;

  const handleInputChange = (field: string, value: string) => {
    if (field === 'valor') {
      const result = formatCurrencyInput(value);
      setFormData((prev) => ({
        ...prev,
        valor: result.numeric.toString(),
        valorDisplay: result.formatted
      }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleClearValue = () => {
    setFormData((prev) => ({
      ...prev,
      valor: '0',
      valorDisplay: ''
    }));
  };

  const handleFileChange = (file: File | null) =>
    setFormData((prev) => ({ ...prev, anexo: file }));

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.nome.trim()) newErrors.nome = 'Nome é obrigatório';
    if (!formData.marca.trim()) newErrors.marca = 'Marca/Fabricante é obrigatório';
    if (!formData.categoria) newErrors.categoria = 'Categoria é obrigatória';
    if (!formData.unidade) newErrors.unidade = 'Unidade é obrigatória';
    if (!formData.quantidade.trim()) newErrors.quantidade = 'Quantidade é obrigatória';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const user = AuthService.getInstance().getCurrentUser();
      if (!user) throw new Error('Usuário não autenticado');

      const novoProduto = await EstoqueService.addProduto({
        nome_produto: formData.nome,
        marca: formData.marca,
        categoria: formData.categoria,
        unidade: formData.unidade,
        quantidade: Number(formData.quantidade),
        valor: formData.valor ? Number(formData.valor) : null,
        lote: formData.lote || null,
        validade: formData.validade || null,
        fornecedor: formData.fornecedor || null,
        registro_mapa: formData.registro_mapa || null,
      });

      if (formData.anexo) {
        const err = AttachmentProductService.validateFile(formData.anexo);
        if (err) throw new Error(err);
        await AttachmentProductService.uploadAttachment(String(novoProduto.id), formData.anexo);
      }

      onCreated(novoProduto);
      setToastMessage(formData.anexo ? 'Produto cadastrado com sucesso e anexo enviado!' : 'Produto cadastrado com sucesso!');
      setShowToast(true);

      setTimeout(() => {
        onClose();
      }, 500);
    } catch (error) {
      console.error('❌ Erro ao cadastrar produto:', error);
      alert(error instanceof Error ? error.message : 'Erro ao cadastrar produto.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <SuccessToast
        message={toastMessage}
        isVisible={showToast}
        onClose={() => setShowToast(false)}
      />
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold">Cadastrar Novo Produto</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-500" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Nome */}
          <div>
            <label className="block text-sm font-medium mb-1">Nome do produto</label>
            <input
              type="text"
              value={formData.nome}
              onChange={(e) => handleInputChange('nome', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg ${errors.nome ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="Ex.: Opera Ultra, Roundup Original, YaraBela Nitromag"
              required
            />
            {errors.nome && <p className="text-red-500 text-xs">{errors.nome}</p>}
          </div>

          {/* Marca */}
          <div>
            <label className="block text-sm font-medium mb-1">Marca/Fabricante</label>
            <input
              type="text"
              value={formData.marca}
              onChange={(e) => handleInputChange('marca', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg ${errors.marca ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="Ex.: Bayer, BASF, Syngenta, Yara"
              required
            />
            {errors.marca && <p className="text-red-500 text-xs">{errors.marca}</p>}
          </div>

          {/* Categoria */}
          <div>
            <label className="block text-sm font-medium mb-1">Categoria</label>
            <select
              value={formData.categoria}
              onChange={(e) => handleInputChange('categoria', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg ${errors.categoria ? 'border-red-500' : 'border-gray-300'}`}
              required
            >
              <option value="">Selecione...</option>
              <option value="Fertilizante">Fertilizante</option>
              <option value="Corretivo">Corretivo</option>
              <option value="Herbicida">Herbicida</option>
              <option value="Inseticida">Inseticida</option>
              <option value="Fungicida">Fungicida</option>
              <option value="Foliar/Nutricional">Foliar/Nutricional</option>
              <option value="Adjuvante/Óleo">Adjuvante/Óleo</option>
              <option value="Outro">Outro</option>
            </select>
          </div>

          {/* Unidade */}
          <div>
            <label className="block text-sm font-medium mb-1">Unidade de medida</label>
            <select
              value={formData.unidade}
              onChange={(e) => handleInputChange('unidade', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg ${errors.unidade ? 'border-red-500' : 'border-gray-300'}`}
              required
            >
              <option value="">Selecione...</option>
              <option value="ton">ton</option>
              <option value="kg">kg</option>
              <option value="g">g</option>
              <option value="mg">mg</option>
              <option value="L">L</option>
              <option value="mL">mL</option>
              <option value="un">un</option>
            </select>
          </div>

          {/* Quantidade */}
          <div>
            <label className="block text-sm font-medium mb-1">Quantidade em estoque</label>
            <input
              type="number"
              step="0.01"
              value={formData.quantidade}
              onChange={(e) => handleInputChange('quantidade', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg ${errors.quantidade ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="Ex.: 12,5 L ou 300 kg"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Dica: Quantidades serão automaticamente convertidas para exibição (ex.: 40000 mL = 40 L, 2000 g = 2 kg)
            </p>
          </div>

          {/* Valor */}
          <div>
            <label className="block text-sm font-medium mb-1">Valor total da compra (opcional)</label>
            <input
              type="text"
              inputMode="numeric"
              value={formData.valorDisplay}
              onChange={(e) => handleInputChange('valor', e.target.value)}
              onFocus={(e) => {
                if (formData.valorDisplay === 'R$ 0,00') {
                  handleClearValue();
                }
              }}
              onBlur={(e) => {
                if (!e.target.value || e.target.value.trim() === '') {
                  const result = formatCurrencyInput('0');
                  setFormData((prev) => ({
                    ...prev,
                    valor: '0',
                    valorDisplay: result.formatted
                  }));
                }
              }}
              className="w-full px-3 py-2 border rounded-lg border-gray-300 font-medium text-lg"
              placeholder="R$ 0,00"
            />
            <p className="text-xs text-gray-500 mt-1">
              Digite apenas números: 450 = R$ 4,50 | 45000 = R$ 450,00 | 2500 = R$ 25,00
            </p>
          </div>

          {/* Lote e Validade */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Lote (opcional)</label>
              <input
                type="text"
                value={formData.lote}
                onChange={(e) => handleInputChange('lote', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg border-gray-300"
                placeholder="Ex.: L001-2024"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Validade (opcional)</label>
              <input
                type="date"
                value={formData.validade}
                onChange={(e) => handleInputChange('validade', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg border-gray-300"
              />
            </div>
          </div>

          {/* Fornecedor */}
          <div>
            <label className="block text-sm font-medium mb-1">Fornecedor</label>
            <input
              type="text"
              value={formData.fornecedor}
              onChange={(e) => handleInputChange('fornecedor', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg border-gray-300"
              placeholder="Ex.: Cooxupé, Agropecuária Silva"
            />
          </div>

          {/* Registro MAPA */}
          <div>
            <label className="block text-sm font-medium mb-1">Registro no MAPA (opcional)</label>
            <input
              type="text"
              value={formData.registro_mapa}
              onChange={(e) => handleInputChange('registro_mapa', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg border-gray-300"
              placeholder="Ex.: 12345/2025"
            />
          </div>

          {/* Upload bonito (igual antes) */}
          <div>
            <label className="block text-sm font-medium mb-1">Anexar arquivo (opcional)</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-[#397738] transition-colors">
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className={`w-8 h-8 mx-auto mb-2 ${
                  formData.anexo ? 'text-[#397738]' : 'text-gray-400'
                }`} />
                <p className={`text-sm ${
                  formData.anexo ? 'font-bold text-[#397738]' : 'text-gray-600'
                }`}>
                  {formData.anexo ? formData.anexo.name : 'Clique para selecionar um arquivo'}
                </p>
                <p className="text-xs text-gray-500 mt-1">PDF, JPG, PNG, WEBP (máx. 10MB)</p>
              </label>
            </div>
          </div>

          {/* Botões */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-[#397738] text-white rounded-lg hover:bg-[#092f20] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Cadastrando...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Cadastrar Produto</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
    </>
  );
}
