import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { DividasFinanciamentosService, DividaFinanciamento } from '../../services/dividasFinanciamentosService';
import { AuthService } from '../../services/authService';
import DividaCard from './DividaCard';
import DividaDetailPanel from './DividaDetailPanel';
import DividaFormModal from './DividaFormModal';
import { supabase } from '../../lib/supabase';

export default function DividasFinanciamentosPanel() {
  const [dividas, setDividas] = useState<DividaFinanciamento[]>([]);
  const [selectedDivida, setSelectedDivida] = useState<DividaFinanciamento | null>(null);
  const [editingDivida, setEditingDivida] = useState<DividaFinanciamento | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const user = AuthService.getInstance().getCurrentUser();
    if (user?.user_id) {
      setUserId(user.user_id);
      loadDividas(user.user_id);
    } else {
      setIsLoading(false);
    }
  }, []);

  const loadDividas = async (uid: string) => {
    setIsLoading(true);
    const data = await DividasFinanciamentosService.getAll(uid);
    setDividas(data);
    setIsLoading(false);
  };

  const handleViewDetails = (id: string) => {
    const divida = dividas.find((d) => d.id === id);
    if (divida) {
      setSelectedDivida(divida);
      setIsDetailOpen(true);
    }
  };

  const handleEdit = (id: string) => {
    const divida = dividas.find((d) => d.id === id);
    if (divida) {
      console.log('✏️ Editar dívida:', divida);
      setEditingDivida(divida);
      setIsFormOpen(true);
    }
  };

  const handleLiquidar = async (id: string) => {
    if (!userId) return;
    const success = await DividasFinanciamentosService.liquidar(id);
    if (success) {
      await loadDividas(userId);
      if (isDetailOpen) {
        setIsDetailOpen(false);
        setSelectedDivida(null);
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!userId) return;
    const success = await DividasFinanciamentosService.delete(id);
    if (success) {
      await loadDividas(userId);
      if (isDetailOpen) {
        setIsDetailOpen(false);
        setSelectedDivida(null);
      }
    }
  };

  const uploadFilesForDivida = async (dividaId: string, files: File[]) => {
    const bucket = 'dividas_financiamentos';
    const ALLOWED_EXT = ['pdf', 'png', 'jpg', 'jpeg'];
    const MAX_BYTES = 10 * 1024 * 1024; // 10MB
    const uploadedPaths: string[] = [];

    if (!userId) return [];

    for (const file of files) {
      try {
        const ext = (file.name.split('.').pop() || '').toLowerCase();
        if (!ALLOWED_EXT.includes(ext)) {
          console.warn('Formato não permitido:', file.name);
          continue;
        }
        if (file.size > MAX_BYTES) {
          console.warn('Arquivo excede tamanho máximo:', file.name);
          continue;
        }

        const safeName = file.name.replace(/\s+/g, '_');
        const path = `${userId}/${dividaId}/${Date.now()}_${safeName}`;
        const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, {
          cacheControl: '3600',
          upsert: false,
        });

        if (uploadError) {
          console.error('Erro upload arquivo:', uploadError);
          continue;
        }

        // Armazenamos o caminho do objeto no banco (não a URL pública)
        uploadedPaths.push(path);
      } catch (err) {
        console.error('Erro no upload de arquivo:', err);
      }
    }

    return uploadedPaths;
  };

  const getPathFromPublicUrl = (url: string) => {
    // tenta extrair caminho após bucket `dividas_financiamentos/`
    try {
      if (!url) return null;
      // se já for um path relativo, retorna direto
      if (!url.startsWith('http')) return decodeURIComponent(url.split('?')[0]);
      const m = url.match(/dividas_financiamentos\/(.*)$/);
      if (!m) return null;
      return decodeURIComponent(m[1].split('?')[0]);
    } catch (e) {
      return null;
    }
  };

  const removeFilesFromStorage = async (urls: string[]) => {
    const bucket = 'dividas_financiamentos';
    const paths = urls.map(getPathFromPublicUrl).filter(Boolean) as string[];
    if (paths.length === 0) return;
    const { error } = await supabase.storage.from(bucket).remove(paths);
    if (error) console.error('Erro removendo arquivos do storage:', error);
  };

  const handleFormSubmit = async (
    formData: Partial<DividaFinanciamento>,
    files?: File[],
    removedAnexos?: string[]
  ) => {
    if (!userId) return;

    // Se estiver editando, atualiza
    if (editingDivida) {
      // primeiro: remover arquivos marcados
      if (removedAnexos && removedAnexos.length) {
        await removeFilesFromStorage(removedAnexos);
      }

      const updated = await DividasFinanciamentosService.update(editingDivida.id, formData);
      if (updated) {
        // atualizar lista de anexos existentes (removendo os marcados)
        // normalizar existing para sempre conter paths (não URLs)
        let existing: string[] = Array.isArray(editingDivida.anexos) ? (editingDivida.anexos as string[]) : [];
        existing = existing.map((a) => (a && a.startsWith('http') ? getPathFromPublicUrl(a) || a : a));
        if (removedAnexos && removedAnexos.length) {
          existing = existing.filter((u: string) => !removedAnexos.includes(u));
        }

        // se houver arquivos novos, subir e juntar
        if (files && files.length > 0) {
          const urls = await uploadFilesForDivida(editingDivida.id, files);
          if (urls.length > 0) {
            existing = [...existing, ...urls];
          }
        }

        // gravar anexos finais
        await DividasFinanciamentosService.update(editingDivida.id, { anexos: existing });

        await loadDividas(userId);
        setIsFormOpen(false);
        setEditingDivida(null);
      }
    } else {
      // Senão, cria novo
      const dividaData = {
        ...formData,
        user_id: userId,
      } as Omit<DividaFinanciamento, 'id' | 'created_at' | 'updated_at'>;

      const newDivida = await DividasFinanciamentosService.create(dividaData);
      if (newDivida) {
        // upload de arquivos usando o id recém-criado
        if (files && files.length > 0) {
          const urls = await uploadFilesForDivida(newDivida.id, files);
          if (urls.length > 0) {
            await DividasFinanciamentosService.update(newDivida.id, { anexos: urls });
          }
        }

        await loadDividas(userId);
        setIsFormOpen(false);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#004417] mb-4">Dívidas e Financiamentos</h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Desktop: botão com texto (restaurado ao estilo original) */}
          <button
            onClick={() => {
              setEditingDivida(null);
              setIsFormOpen(true);
            }}
            className="hidden md:inline-flex items-center gap-2 px-4 py-2 bg-[#00A651] hover:bg-[#008c44] text-white rounded-lg font-medium transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Nova dívida/financiamento</span>
          </button>

          {/* Mobile: apenas o ícone + */}
          <button
            onClick={() => {
              setEditingDivida(null);
              setIsFormOpen(true);
            }}
            className="inline-flex md:hidden items-center justify-center p-2 bg-[#00A651] hover:bg-[#008c44] text-white rounded-full"
            aria-label="Nova dívida"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Cards Grid */}
      {dividas.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {dividas.map((divida) => (
            <DividaCard
              key={divida.id}
              divida={divida}
              onViewDetails={handleViewDetails}
              onEdit={handleEdit}
              onLiquidar={handleLiquidar}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {dividas.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-600 mb-4">Nenhuma dívida ou financiamento cadastrado</p>
          <button
            onClick={() => {
              setEditingDivida(null);
              setIsFormOpen(true);
            }}
            className="px-4 py-2 bg-[#00A651] hover:bg-[#008c44] text-white rounded-lg font-medium transition-colors"
          >
            Cadastrar agora
          </button>
        </div>
      )}

      {/* Detail Panel */}
      <DividaDetailPanel
        divida={selectedDivida}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedDivida(null);
        }}
        onEdit={handleEdit}
        onLiquidar={handleLiquidar}
        onDelete={handleDelete}
      />

      {/* Form Modal */}
      <DividaFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingDivida(null);
        }}
        onSubmit={handleFormSubmit}
        initialData={editingDivida}
      />
    </div>
  );
}
