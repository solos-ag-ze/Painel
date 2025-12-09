import { useState } from 'react';
import { X, Save, Upload } from 'lucide-react';
import { MaquinaService } from '../../services/maquinaService';
import { AuthService } from '../../services/authService';
import { AttachmentService } from '../../services/attachmentService';
import { formatCurrencyInput } from '../../lib/currencyFormatter';
import DateInput from '../common/DateInput';

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
    valor_compra_display: 'R$ 0,00',
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
    if (field === 'valor_compra') {
      const result = formatCurrencyInput(value);
      setFormData((prev) => ({
        ...prev,
        valor_compra: result.numeric.toString(),
        valor_compra_display: result.formatted
      }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleClearValue = () => {
    setFormData((prev) => ({
      ...prev,
      valor_compra: '0',
      valor_compra_display: ''
    }));
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
    <div className="fixed inset-0 bg-[rgba(0,68,23,0.25)] flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-[18px] shadow-[0_8px_32px_rgba(0,68,23,0.08)] w-full max-w-2xl my-auto">
        <div className="flex items-center justify-between p-6">
          <h2 className="text-[20px] font-bold text-[#004417]">Cadastrar Nova Máquina/Equipamento</h2>
          <button onClick={onClose} className="text-[#00441766] hover:text-[#004417] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {validationMessage && (
            <div className="bg-[#FEF2F2] border-l-4 border-[#DC2626] p-4 rounded-lg">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-[#DC2626]" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-[14px] text-[#DC2626] font-semibold">{validationMessage}</p>
                  <p className="text-[13px] text-[rgba(220,38,38,0.8)] mt-1">Por favor, selecione um arquivo válido antes de continuar.</p>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-[14px] font-semibold text-[#004417] mb-2">Nome da máquina</label>
            <input
              type="text"
              value={formData.nome}
              onChange={(e) => handleInputChange('nome', e.target.value)}
              className={`w-full px-4 py-3 rounded-[12px] bg-[#F8FCF9] text-[#004417] placeholder:text-[#00441766] focus:outline-none transition-all ${
                errors.nome ? 'ring-2 ring-[#DC2626]' : 'ring-0 border border-[#00A65133]'
              }`}
              placeholder="Ex.: Trator John Deere 6110, Pulverizador Jacto"
              required
            />
            {errors.nome && <p className="text-[#DC2626] text-[13px] mt-1">{errors.nome}</p>}
          </div>

          <div>
            <label className="block text-[14px] font-semibold text-[#004417] mb-2">Marca/Modelo</label>
            <input
              type="text"
              value={formData.marca_modelo}
              onChange={(e) => handleInputChange('marca_modelo', e.target.value)}
              className={`w-full px-4 py-3 rounded-[12px] bg-[#F8FCF9] text-[#004417] placeholder:text-[#00441766] focus:outline-none transition-all ${
                errors.marca_modelo ? 'ring-2 ring-[#DC2626]' : 'ring-0 border border-[#00A65133]'
              }`}
              placeholder="Ex.: John Deere 6110D, Massey Ferguson 4283"
              required
            />
            {errors.marca_modelo && <p className="text-[#DC2626] text-[13px] mt-1">{errors.marca_modelo}</p>}
          </div>

          <div>
            <label className="block text-[14px] font-semibold text-[#004417] mb-2">Categoria</label>
            <select
              value={formData.categoria}
              onChange={(e) => handleInputChange('categoria', e.target.value)}
              className={`w-full px-4 py-3 rounded-[12px] bg-[#F8FCF9] text-[#004417] placeholder:text-[#00441766] focus:outline-none transition-all ${
                errors.categoria ? 'ring-2 ring-[#DC2626]' : 'ring-0 border border-[#00A65133]'
              }`}
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
            <label className="block text-[14px] font-semibold text-[#004417] mb-2">Horímetro atual (opcional)</label>
            <input
              type="number"
              step="0.01"
              value={formData.horimetro_atual}
              onChange={(e) => handleInputChange('horimetro_atual', e.target.value)}
              className="w-full px-4 py-3 rounded-[12px] bg-[#F8FCF9] text-[#004417] placeholder:text-[#00441766] transition-all border border-[#00A65133]"
              placeholder="Ex.: 1500 (horas)"
            />
          </div>

          <div>
            <label className="block text-[14px] font-semibold text-[#004417] mb-2">Valor de compra (opcional)</label>
            <input
              type="text"
              inputMode="numeric"
              value={formData.valor_compra_display}
              onChange={(e) => handleInputChange('valor_compra', e.target.value)}
              onFocus={() => {
                if (formData.valor_compra_display === 'R$ 0,00') {
                  handleClearValue();
                }
              }}
              onBlur={(e) => {
                if (!e.target.value || e.target.value.trim() === '') {
                  const result = formatCurrencyInput('0');
                  setFormData((prev) => ({
                    ...prev,
                    valor_compra: '0',
                    valor_compra_display: result.formatted
                  }));
                }
              }}
              className="w-full px-4 py-3 rounded-[12px] bg-[#F8FCF9] text-[#00A651] font-semibold placeholder:text-[#00441766] transition-all border border-[#00A65133]"
              placeholder="R$ 0,00"
            />
            <p className="text-[13px] text-[rgba(0,68,23,0.6)] mt-2">
              Digite apenas números. Ex: 25000000 = R$ 250.000,00 ou 12550 = R$ 125,50
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[14px] font-semibold text-[#004417] mb-2">Data de compra (opcional)</label>
              <DateInput
                value={formData.data_compra}
                onChange={(value) => handleInputChange('data_compra', value)}
                placeholder="Selecione a data"
              />
            </div>
            <div>
              <label className="block text-[14px] font-semibold text-[#004417] mb-2">Número de série (opcional)</label>
              <input
                type="text"
                value={formData.numero_serie}
                onChange={(e) => handleInputChange('numero_serie', e.target.value)}
                className="w-full px-4 py-3 rounded-[12px] bg-[#F8FCF9] text-[#004417] transition-all border border-[#00A65133] placeholder:text-[#00441766]"
                placeholder="Ex.: JD6110-2024-001"
              />
            </div>
          </div>

          <div>
            <label className="block text-[14px] font-semibold text-[#004417] mb-2">Fornecedor</label>
            <input
              type="text"
              value={formData.fornecedor}
              onChange={(e) => handleInputChange('fornecedor', e.target.value)}
              className={`w-full px-4 py-3 rounded-[12px] bg-[#F8FCF9] text-[#004417] placeholder:text-[#00441766] transition-all ${
                errors.fornecedor ? 'ring-2 ring-[#DC2626]' : 'ring-0 border border-[#00A65133]'
              }`}
              placeholder="Ex.: Concessionária John Deere Sul de Minas"
              required
            />
            {errors.fornecedor && <p className="text-[#DC2626] text-[13px] mt-1">{errors.fornecedor}</p>}
          </div>

          <div>
            <label className="block text-[14px] font-semibold text-[#004417] mb-2">Foto da máquina (opcional)</label>
            <div className={`rounded-[14px] p-4 text-center transition-all flex items-center gap-4 justify-between h-[54px] ${
              errors.anexo 
                ? 'border-2 border-[#DC2626] bg-[#FEF2F2]' 
                : 'bg-[#F5FDF8] border-2 border-dashed border-[#00A651]'
            }`}>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={(e) => handleFileChange('anexo', e.target.files?.[0] || null)}
                className="hidden"
                id="file-upload-maquina"
              />
              <label htmlFor="file-upload-maquina" className="cursor-pointer">
                <div className="flex items-center gap-3">
                  <Upload className={`w-6 h-6 ${errors.anexo ? 'text-[#DC2626]' : formData.anexo ? 'text-[#00A651]' : 'text-[#00A651]'}`} />
                  <div className="text-left">
                    <p className={`text-[14px] ${errors.anexo ? 'text-[#DC2626]' : formData.anexo ? 'font-bold text-[#004417]' : 'text-[#00441799]'}`}>
                      {formData.anexo ? formData.anexo.name : 'Anexar Arquivo'}
                    </p>
                    <p className="text-[13px] text-[#00441799]">PDF, JPG, PNG, WEBP (máx. 10MB)</p>
                  </div>
                </div>
              </label>
            </div>
            {errors.anexo && <p className="text-[#DC2626] text-[13px] mt-2">⚠️ {errors.anexo}</p>}
          </div>

          <div>
            <label className="block text-[14px] font-semibold text-[#004417] mb-2">Documento da máquina (opcional)</label>
            <div className={`rounded-[14px] p-4 text-center transition-all flex items-center gap-4 justify-between h-[54px] ${
              errors.documento_maquina 
                ? 'border-2 border-[#DC2626] bg-[#FEF2F2]' 
                : 'bg-[#F5FDF8] border-2 border-dashed border-[#00A651]'
            }`}>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={(e) => handleFileChange('documento_maquina', e.target.files?.[0] || null)}
                className="hidden"
                id="file-upload-documento-maquina"
              />
              <label htmlFor="file-upload-documento-maquina" className="cursor-pointer">
                <div className="flex items-center gap-3">
                  <Upload className={`w-6 h-6 ${errors.documento_maquina ? 'text-[#DC2626]' : formData.documento_maquina ? 'text-[#00A651]' : 'text-[#00A651]'}`} />
                  <div className="text-left">
                    <p className={`text-[14px] ${errors.documento_maquina ? 'text-[#DC2626]' : formData.documento_maquina ? 'font-bold text-[#004417]' : 'text-[#00441799]'}`}>
                      {formData.documento_maquina ? formData.documento_maquina.name : 'Anexar Documento'}
                    </p>
                    <p className="text-[13px] text-[#00441799]">PDF, JPG, PNG, WEBP (máx. 10MB)</p>
                  </div>
                </div>
              </label>
            </div>
            {errors.documento_maquina && <p className="text-[#DC2626] text-[13px] mt-2">⚠️ {errors.documento_maquina}</p>}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-[48px] px-6 bg-white text-[#004417] rounded-[12px] font-semibold hover:bg-[rgba(0,166,81,0.04)] active:scale-[0.98] transition-all border border-[#00A65133]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 h-[48px] px-6 bg-[#00A651] text-white rounded-[12px] font-bold hover:bg-[#004417] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Cadastrando...</span>
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
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
