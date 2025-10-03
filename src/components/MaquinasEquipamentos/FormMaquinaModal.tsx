import React, { useState } from 'react';
import { X, Save, Upload } from 'lucide-react';
import { MaquinaService } from '../../services/maquinaService';
import { AuthService } from '../../services/authService';
import { AttachmentService } from '../../services/attachmentService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (maquina: any) => void;
}

export default function FormMaquinaModal({ isOpen, onClose, onCreated }: Props) {
  const [formData, setFormData] = useState({
    nome: '',
    marca_modelo: '',
    categoria: '',
    horimetro_atual: '',
    valor_compra: '',
    data_compra: '',
    fornecedor: '',
    numero_serie: '',
    anexo: null as File | null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleFileChange = (file: File | null) =>
    setFormData((prev) => ({ ...prev, anexo: file }));

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.nome.trim()) newErrors.nome = 'Nome é obrigatório';
    if (!formData.marca_modelo.trim()) newErrors.marca_modelo = 'Marca/Modelo é obrigatório';
    if (!formData.categoria) newErrors.categoria = 'Categoria é obrigatória';
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

      const maquinaService = new MaquinaService();
      const novaMaquina = await maquinaService.addMaquina({
        user_id: user.user_id,
        nome: formData.nome,
        marca_modelo: formData.marca_modelo,
        categoria: formData.categoria,
        horimetro_atual: formData.horimetro_atual ? Number(formData.horimetro_atual) : null,
        valor_compra: formData.valor_compra ? Number(formData.valor_compra) : null,
        data_compra: formData.data_compra || null,
        fornecedor: formData.fornecedor || null,
        numero_serie: formData.numero_serie || null,
      });

      if (formData.anexo) {
        const attachmentService = new AttachmentService();
        const validationError = attachmentService.validateFile(formData.anexo);
        if (validationError) throw new Error(validationError);

        await attachmentService.uploadFile(
          novaMaquina.id_maquina,
          formData.anexo,
          'url_primeiro_envio'
        );
      }

      onCreated(novaMaquina);
      onClose();
      alert('✅ Máquina cadastrada com sucesso' + (formData.anexo ? ' e anexo enviado.' : '.'));
    } catch (error) {
      console.error('❌ Erro ao cadastrar máquina:', error);
      alert(error instanceof Error ? error.message : 'Erro ao cadastrar máquina.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold">Cadastrar Nova Máquina/Equipamento</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-500" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium mb-1">Nome da máquina</label>
            <input
              type="text"
              value={formData.nome}
              onChange={(e) => handleInputChange('nome', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg ${errors.nome ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="Ex.: Trator John Deere 6110, Pulverizador Jacto"
              required
            />
            {errors.nome && <p className="text-red-500 text-xs">{errors.nome}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Marca/Modelo</label>
            <input
              type="text"
              value={formData.marca_modelo}
              onChange={(e) => handleInputChange('marca_modelo', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg ${errors.marca_modelo ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="Ex.: John Deere 6110D, Massey Ferguson 4283"
              required
            />
            {errors.marca_modelo && <p className="text-red-500 text-xs">{errors.marca_modelo}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Categoria</label>
            <select
              value={formData.categoria}
              onChange={(e) => handleInputChange('categoria', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg ${errors.categoria ? 'border-red-500' : 'border-gray-300'}`}
              required
            >
              <option value="">Selecione...</option>
              <option value="Trator">Trator</option>
              <option value="Colheitadeira">Colheitadeira</option>
              <option value="Pulverizador">Pulverizador</option>
              <option value="Implemento">Implemento</option>
              <option value="Caminhão">Caminhão</option>
              <option value="Outro">Outro</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Horímetro atual (opcional)</label>
            <input
              type="number"
              step="0.01"
              value={formData.horimetro_atual}
              onChange={(e) => handleInputChange('horimetro_atual', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg border-gray-300"
              placeholder="Ex.: 1500 (horas)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Valor de compra (opcional)</label>
            <input
              type="number"
              step="0.01"
              value={formData.valor_compra}
              onChange={(e) => handleInputChange('valor_compra', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg border-gray-300"
              placeholder="Ex.: 250000,00"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Data de compra (opcional)</label>
              <input
                type="date"
                value={formData.data_compra}
                onChange={(e) => handleInputChange('data_compra', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg border-gray-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Número de série (opcional)</label>
              <input
                type="text"
                value={formData.numero_serie}
                onChange={(e) => handleInputChange('numero_serie', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg border-gray-300"
                placeholder="Ex.: JD6110-2024-001"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Fornecedor (opcional)</label>
            <input
              type="text"
              value={formData.fornecedor}
              onChange={(e) => handleInputChange('fornecedor', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg border-gray-300"
              placeholder="Ex.: Concessionária John Deere Sul de Minas"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Anexar arquivo (opcional)</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-[#397738] transition-colors">
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                className="hidden"
                id="file-upload-maquina"
              />
              <label htmlFor="file-upload-maquina" className="cursor-pointer">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">
                  {formData.anexo ? formData.anexo.name : 'Clique para selecionar um arquivo'}
                </p>
                <p className="text-xs text-gray-500 mt-1">PDF, JPG, PNG, WEBP (máx. 10MB)</p>
              </label>
            </div>
          </div>

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
                  <span>Cadastrar Máquina</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
