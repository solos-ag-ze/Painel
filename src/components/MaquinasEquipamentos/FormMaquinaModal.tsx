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
    documento_maquina: null as File | null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleFileChange = (field: 'anexo' | 'documento_maquina', file: File | null) => {
    setValidationMessage(null);

    if (file) {
      const attachmentService = new AttachmentService();
      const validationError = attachmentService.validateFile(file);

      if (validationError) {
        setValidationMessage(validationError);
        setErrors((prev) => ({ ...prev, [field]: validationError }));
        return;
      }

      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: '' }));
      }
    }

    setFormData((prev) => ({ ...prev, [field]: file }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.nome.trim()) newErrors.nome = 'Nome é obrigatório';
    if (!formData.marca_modelo.trim()) newErrors.marca_modelo = 'Marca/Modelo é obrigatório';
    if (!formData.categoria) newErrors.categoria = 'Categoria é obrigatória';
    if (!formData.fornecedor.trim()) newErrors.fornecedor = 'Fornecedor é obrigatório';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setValidationMessage(null);

    let maquinaId: string | null = null;

    try {
      const user = AuthService.getInstance().getCurrentUser();
      if (!user) throw new Error('Usuário não autenticado');

      const attachmentService = new AttachmentService();

      if (formData.anexo) {
        const validationError = attachmentService.validateFile(formData.anexo);
        if (validationError) {
          setValidationMessage(validationError);
          throw new Error(validationError);
        }
      }

      if (formData.documento_maquina) {
        const validationError = attachmentService.validateFile(formData.documento_maquina);
        if (validationError) {
          setValidationMessage(validationError);
          throw new Error(validationError);
        }
      }

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

      maquinaId = novaMaquina.id_maquina;
      console.log('✅ Máquina criada com ID:', maquinaId);

      if (formData.anexo) {
        console.log('📤 Enviando foto da máquina...');
        const uploadResult = await attachmentService.uploadFile(
          novaMaquina.id_maquina,
          formData.anexo,
          'primeiro_envio'
        );

        if (!uploadResult.success) {
          throw new Error(uploadResult.error || 'Erro ao fazer upload da foto da máquina');
        }
        console.log('✅ Foto enviada com sucesso');
      }

      if (formData.documento_maquina) {
        console.log('📤 Enviando documento da máquina...');
        const uploadResult = await attachmentService.uploadFile(
          novaMaquina.id_maquina,
          formData.documento_maquina,
          'segundo_envio'
        );

        if (!uploadResult.success) {
          throw new Error(uploadResult.error || 'Erro ao fazer upload do documento da máquina');
        }
        console.log('✅ Documento enviado com sucesso');
      }

      onCreated(novaMaquina);
      onClose();
      const anexosMsg = formData.anexo || formData.documento_maquina ? ' e anexo(s) enviado(s).' : '.';
      alert('✅ Máquina cadastrada com sucesso' + anexosMsg);
    } catch (error) {
      console.error('❌ Erro ao cadastrar máquina:', error);

      if (maquinaId) {
        console.log('🔄 Erro detectado após criar máquina. Executando rollback...');
        try {
          const maquinaService = new MaquinaService();
          await maquinaService.deleteMaquina(maquinaId);
          console.log('✅ Rollback concluído - máquina removida do banco');
        } catch (rollbackError) {
          console.error('❌ Erro no rollback:', rollbackError);
        }
      }

      alert(error instanceof Error ? error.message : 'Erro ao cadastrar máquina.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl my-auto">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
          <h2 className="text-lg sm:text-xl font-bold">Cadastrar Nova Máquina/Equipamento</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-500" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {validationMessage && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700 font-medium">{validationMessage}</p>
                  <p className="text-xs text-red-600 mt-1">Por favor, selecione um arquivo válido antes de continuar.</p>
                </div>
              </div>
            </div>
          )}

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
              <option value="Adubadeira">Adubadeira</option>
              <option value="Carreta">Carreta</option>
              <option value="Colheitadeira">Colheitadeira</option>
              <option value="Equipamentos manuais">Equipamentos manuais</option>
              <option value="Esqueletadeira">Esqueletadeira</option>
              <option value="Grade/Subsolador">Grade/Subsolador</option>
              <option value="Pulverizador/Bomba">Pulverizador/Bomba</option>
              <option value="Roçadeira/Trincha">Roçadeira/Trincha</option>
              <option value="Trator">Trator</option>
              <option value="Varredora">Varredora</option>
              <option value="Outra">Outra</option>
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
            <label className="block text-sm font-medium mb-1">Fornecedor</label>
            <input
              type="text"
              value={formData.fornecedor}
              onChange={(e) => handleInputChange('fornecedor', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg ${errors.fornecedor ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="Ex.: Concessionária John Deere Sul de Minas"
              required
            />
            {errors.fornecedor && <p className="text-red-500 text-xs">{errors.fornecedor}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Foto da máquina (opcional)</label>
            <div className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
              errors.anexo ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-[#397738]'
            }`}>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={(e) => handleFileChange('anexo', e.target.files?.[0] || null)}
                className="hidden"
                id="file-upload-maquina"
              />
              <label htmlFor="file-upload-maquina" className="cursor-pointer">
                <Upload className={`w-8 h-8 mx-auto mb-2 ${
                  errors.anexo ? 'text-red-500' : formData.anexo ? 'text-[#397738]' : 'text-gray-400'
                }`} />
                <p className={`text-sm ${
                  errors.anexo ? 'text-red-700' : formData.anexo ? 'font-bold text-[#397738]' : 'text-gray-600'
                }`}>
                  {formData.anexo ? formData.anexo.name : 'Clique para selecionar um arquivo'}
                </p>
                <p className="text-xs text-gray-500 mt-1">PDF, JPG, PNG, WEBP (máx. 10MB)</p>
              </label>
            </div>
            {errors.anexo && <p className="text-red-500 text-sm mt-2">⚠️ {errors.anexo}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Documento da máquina (opcional)</label>
            <div className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
              errors.documento_maquina ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-[#397738]'
            }`}>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={(e) => handleFileChange('documento_maquina', e.target.files?.[0] || null)}
                className="hidden"
                id="file-upload-documento-maquina"
              />
              <label htmlFor="file-upload-documento-maquina" className="cursor-pointer">
                <Upload className={`w-8 h-8 mx-auto mb-2 ${
                  errors.documento_maquina ? 'text-red-500' : formData.documento_maquina ? 'text-[#397738]' : 'text-gray-400'
                }`} />
                <p className={`text-sm ${
                  errors.documento_maquina ? 'text-red-700' : formData.documento_maquina ? 'font-bold text-[#397738]' : 'text-gray-600'
                }`}>
                  {formData.documento_maquina ? formData.documento_maquina.name : 'Clique para selecionar um arquivo'}
                </p>
                <p className="text-xs text-gray-500 mt-1">PDF, JPG, PNG, WEBP (máx. 10MB)</p>
              </label>
            </div>
            {errors.documento_maquina && <p className="text-red-500 text-sm mt-2">⚠️ {errors.documento_maquina}</p>}
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
