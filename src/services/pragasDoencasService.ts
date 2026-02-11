import { supabase } from '../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Cliente com service role para operações de storage (contorna RLS)
// Em produção, usa o cliente principal com sessão do usuário (JWT injetado)
const url = import.meta.env.VITE_SUPABASE_URL;
const serviceRole = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// Criar cliente service role apenas se a chave existir
let supabaseServiceRole: ReturnType<typeof createClient> | null = null;
if (serviceRole && url) {
  supabaseServiceRole = createClient(url, serviceRole);
}

/**
 * Retorna o cliente de storage apropriado:
 * - Se houver service role key, usa cliente com bypass de RLS
 * - Caso contrário, usa cliente principal com sessão do usuário (JWT injetado)
 */
function getStorageClient() {
  return supabaseServiceRole || supabase;
}

export interface PragaDoenca {
  id: number;
  user_id: string;
  talhoes?: string;
  data_da_ocorrencia: string;
  fase_da_lavoura?: string;
  tipo_de_ocorrencia?: string;
  nivel_da_gravidade?: string;
  area_afetada?: string;
  sintomas_observados?: string;
  acao_tomada?: string;
  origem?: string;
  nome_praga?: string;
  diagnostico?: string;
  descricao_detalhada?: string;
  clima_recente?: string;
  produtos_aplicados?: string[];
  data_aplicacao?: string;
  recomendacoes?: string;
  status?: string;
  anexos?: string[];
  foto_principal?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PragaDoencaComTalhoes extends PragaDoenca {
  talhoes_vinculados?: Array<{
    id: number;
    talhao_id: string;
    nome_talhao?: string;
  }>;
}

export class PragasDoencasService {
  static async getOcorrencias(userId?: string, limit: number = 100): Promise<PragaDoencaComTalhoes[]> {
    try {
      const query = supabase
        .from('pragas_e_doencas')
        .select('*')
        .order('data_da_ocorrencia', { ascending: false })
        .limit(limit);

      if (userId) {
        query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar ocorrências:', error);
        return [];
      }

      const ocorrenciasComTalhoes = await Promise.all(
        (data || []).map(async (ocorrencia) => {
          const { data: talhoesData } = await supabase
            .from('pragas_e_doencas_talhoes')
            .select('id, talhao_id')
            .eq('praga_doenca_id', ocorrencia.id);

          const talhoesComNomes = await Promise.all(
            (talhoesData || []).map(async (vinculo) => {
              const { data: talhaoData } = await supabase
                .from('talhoes')
                .select('nome')
                .eq('id_talhao', vinculo.talhao_id)
                .maybeSingle();

              return {
                ...vinculo,
                nome_talhao: talhaoData?.nome || 'Talhão não encontrado',
              };
            })
          );

          return {
            ...ocorrencia,
            talhoes_vinculados: talhoesComNomes,
          };
        })
      );

      return ocorrenciasComTalhoes;
    } catch (err) {
      console.error('Erro no PragasDoencasService.getOcorrencias:', err);
      return [];
    }
  }

  static async getOcorrenciaById(id: number): Promise<PragaDoencaComTalhoes | null> {
    try {
      const { data, error } = await supabase
        .from('pragas_e_doencas')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error || !data) {
        console.error('Erro ao buscar ocorrência por id:', error);
        return null;
      }

      const { data: talhoesData } = await supabase
        .from('pragas_e_doencas_talhoes')
        .select('id, talhao_id')
        .eq('praga_doenca_id', data.id);

      const talhoesComNomes = await Promise.all(
        (talhoesData || []).map(async (vinculo) => {
          const { data: talhaoData } = await supabase
            .from('talhoes')
            .select('nome')
            .eq('id_talhao', vinculo.talhao_id)
            .maybeSingle();

          return {
            ...vinculo,
            nome_talhao: talhaoData?.nome || 'Talhão não encontrado',
          };
        })
      );

      return {
        ...data,
        talhoes_vinculados: talhoesComNomes,
      };
    } catch (err) {
      console.error('Erro no PragasDoencasService.getOcorrenciaById:', err);
      return null;
    }
  }

  private static readonly BUCKET_NAME = 'pragas_e_doencas';

  static async uploadImage(file: File, ocorrenciaId: number, userId: string): Promise<string | null> {
    try {
      // Padrão fixo: user_id/id.jpg — sempre sobrescreve (upsert)
      const filePath = `${userId}/${ocorrenciaId}.jpg`;

      console.log('📸 [PragasDoencas] Iniciando upload da imagem:', { filePath, fileSize: file.size, fileType: file.type });

      const { error: uploadError } = await getStorageClient().storage
        .from(this.BUCKET_NAME)
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type,
          cacheControl: '3600',
        });

      if (uploadError) {
        console.error('❌ [PragasDoencas] Erro ao fazer upload da imagem:', uploadError);
        return null;
      }

      console.log('✅ [PragasDoencas] Upload concluído:', filePath);
      // Não retornar publicUrl (bucket privado). Retornar o path salvo no storage.
      return filePath;
    } catch (err) {
      console.error('❌ [PragasDoencas] Erro no upload da imagem:', err);
      return null;
    }
  }

  /**
   * Deleta uma imagem do storage e limpa a coluna no banco
   */
  static async deleteImage(imagePath: string, ocorrenciaId: number): Promise<boolean> {
    try {
      console.log('🗑️ [PragasDoencas] Deletando imagem:', imagePath);

      const { error } = await getStorageClient().storage
        .from(this.BUCKET_NAME)
        .remove([imagePath]);

      if (error) {
        console.error('❌ [PragasDoencas] Erro ao deletar do storage:', error);
        return false;
      }

      // Limpar coluna no banco
      const { error: dbError } = await supabase
        .from('pragas_e_doencas')
        .update({ foto_principal: null })
        .eq('id', ocorrenciaId);

      if (dbError) {
        console.error('❌ [PragasDoencas] Erro ao atualizar banco:', dbError);
        return false;
      }

      console.log('✅ [PragasDoencas] Imagem deletada com sucesso');
      return true;
    } catch (err) {
      console.error('💥 [PragasDoencas] Erro ao deletar imagem:', err);
      return false;
    }
  }

  /**
   * Substitui uma imagem existente por uma nova.
   * Como o padrão é sempre user_id/id.jpg, o upsert sobrescreve automaticamente.
   */
  static async replaceImage(file: File, _oldPath: string, ocorrenciaId: number, userId: string): Promise<string | null> {
    try {
      const filePath = `${userId}/${ocorrenciaId}.jpg`;
      console.log('🔄 [PragasDoencas] Substituindo imagem (upsert):', filePath);

      // Upload com upsert — sobrescreve o arquivo no mesmo path
      const newPath = await this.uploadImage(file, ocorrenciaId, userId);
      if (!newPath) {
        console.error('❌ [PragasDoencas] Falha no upload da nova imagem');
        return null;
      }

      // Atualizar banco com path (garantir consistência)
      const { error: dbError } = await supabase
        .from('pragas_e_doencas')
        .update({ foto_principal: newPath })
        .eq('id', ocorrenciaId);

      if (dbError) {
        console.error('❌ [PragasDoencas] Erro ao atualizar banco:', dbError);
        return null;
      }

      console.log('✅ [PragasDoencas] Imagem substituída com sucesso:', newPath);
      return newPath;
    } catch (err) {
      console.error('💥 [PragasDoencas] Erro ao substituir imagem:', err);
      return null;
    }
  }

  /**
   * Extrai o path relativo do storage a partir de qualquer formato de foto_principal.
   * Aceita: path relativo, URL pública, signed URL.
   * Retorna null para emojis, valores inválidos ou URLs externas.
   */
  static extractStoragePath(value: string | null | undefined): string | null {
    if (!value || typeof value !== 'string') return null;

    // Emoji ou texto sem extensão de arquivo
    if (!value.includes('.')) return null;

    // Se é uma URL, tentar extrair o path do storage
    if (value.startsWith('http')) {
      const bucketName = 'pragas_e_doencas';
      const markers = [
        `/storage/v1/object/public/${bucketName}/`,
        `/storage/v1/object/sign/${bucketName}/`,
        `/storage/v1/object/${bucketName}/`,
      ];

      for (const marker of markers) {
        const idx = value.indexOf(marker);
        if (idx !== -1) {
          return value.slice(idx + marker.length).split('?')[0];
        }
      }
      return null; // URL externa (não-Supabase)
    }

    // Já é um path relativo
    return value;
  }

  /**
   * Gera signed URL para um path no bucket pragas_e_doencas.
   * Aceita qualquer formato: path relativo, signed URL expirada, URL pública.
   * Padrão esperado no storage: user_id/id.jpg
   */
  static async getSignedUrl(path: string | null | undefined, expires = 3600, userId?: string): Promise<string | null> {
    try {
      const storagePath = this.extractStoragePath(path);
      if (!storagePath) return null;

      // Se path não contém '/' e temos userId, monta o path padrão user_id/id.jpg
      const resolvedPath = !storagePath.includes('/') && userId
        ? `${userId}/${storagePath}`
        : storagePath;

      const { data, error } = await getStorageClient().storage
        .from(this.BUCKET_NAME)
        .createSignedUrl(resolvedPath, expires);

      if (error) {
        console.error('Erro ao criar signedUrl:', error);
        return null;
      }
      return data?.signedUrl || null;
    } catch (err) {
      console.error('Erro em getSignedUrl:', err);
      return null;
    }
  }

  static async createOcorrencia(
    payload: Partial<PragaDoenca>,
    talhaoIds: string[] = [],
    imageFile?: File
  ) {
    try {
      const { data, error } = await supabase
        .from('pragas_e_doencas')
        .insert([payload])
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar ocorrência:', error);
        return { error };
      }

      const ocorrenciaId = (data as any).id;

      if (imageFile) {
        console.log('🖼️ Processando upload de imagem para ocorrência:', ocorrenciaId);
        const imagePath = await this.uploadImage(imageFile, ocorrenciaId, payload.user_id as string);
        if (imagePath) {
          console.log('💾 Atualizando banco com path da imagem:', imagePath);
          const { error: updateError } = await supabase
            .from('pragas_e_doencas')
            .update({ foto_principal: imagePath })
            .eq('id', ocorrenciaId);

          if (updateError) {
            console.error('❌ Erro ao atualizar foto_principal no banco:', updateError);
          } else {
            console.log('✅ foto_principal atualizada com sucesso no banco');
          }
        } else {
          console.error('❌ Não foi possível obter path da imagem');
        }
      }

      if (talhaoIds.length > 0) {
        const vinculos = talhaoIds.map((talhao_id) => ({
          praga_doenca_id: ocorrenciaId,
          talhao_id,
          user_id: payload.user_id,
        }));

        const { error: vinculoError } = await supabase
          .from('pragas_e_doencas_talhoes')
          .insert(vinculos);

        if (vinculoError) {
          console.error('Erro ao vincular talhões:', vinculoError);
        }
      }

      return { data };
    } catch (err) {
      console.error('Erro no PragasDoencasService.createOcorrencia:', err);
      return { error: err };
    }
  }

  static async updateOcorrencia(
    id: number,
    changes: Partial<PragaDoenca>,
    talhaoIds?: string[],
    imageFile?: File
  ) {
    try {
      changes.updated_at = new Date().toISOString();

      // Se houver novo arquivo de imagem na edição, faça upload primeiro
      if (imageFile) {
        try {
          const userIdForUpload = (changes.user_id as string) || '';
          if (!userIdForUpload) {
            console.warn('updateOcorrencia: user_id ausente; não foi possível fazer upload da imagem');
          } else {
            const imagePath = await this.uploadImage(imageFile, id, userIdForUpload);
            if (imagePath) {
              changes.foto_principal = imagePath;
            }
          }
        } catch (err) {
          console.error('Erro ao fazer upload da nova imagem durante edição:', err);
        }
      }

      const { data, error } = await supabase
        .from('pragas_e_doencas')
        .update(changes)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar ocorrência:', error);
        return { error };
      }

      if (talhaoIds !== undefined) {
        await supabase
          .from('pragas_e_doencas_talhoes')
          .delete()
          .eq('praga_doenca_id', id);

        if (talhaoIds.length > 0) {
          const vinculos = talhaoIds.map((talhao_id) => ({
            praga_doenca_id: id,
            talhao_id,
            user_id: changes.user_id,
          }));

          const { error: vinculoError } = await supabase
            .from('pragas_e_doencas_talhoes')
            .insert(vinculos);

          if (vinculoError) {
            console.error('Erro ao atualizar vínculos de talhões:', vinculoError);
          }
        }
      }

      return { data };
    } catch (err) {
      console.error('Erro no PragasDoencasService.updateOcorrencia:', err);
      return { error: err };
    }
  }

  static async deleteOcorrencia(id: number) {
    try {
      await supabase
        .from('pragas_e_doencas_talhoes')
        .delete()
        .eq('praga_doenca_id', id);

      const { data, error } = await supabase
        .from('pragas_e_doencas')
        .delete()
        .eq('id', id)
        .select();

      if (error) {
        console.error('Erro ao deletar ocorrência:', error);
        return { error };
      }

      return { data };
    } catch (err) {
      console.error('Erro no PragasDoencasService.deleteOcorrencia:', err);
      return { error: err };
    }
  }

  static async updateStatus(id: number, status: string, userId: string) {
    return this.updateOcorrencia(id, { status, user_id: userId });
  }

  static formatDate(dateString?: string): string {
    try {
      if (!dateString) return 'Data não informada';

      let date: Date;
      if (dateString.includes('T')) {
        date = new Date(dateString);
      } else if (dateString.includes('/')) {
        const [dia, mes, ano] = dateString.split('/');
        if (ano.length === 4) {
          date = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
        } else {
          date = new Date(parseInt(ano) + 2000, parseInt(mes) - 1, parseInt(dia));
        }
      } else if (dateString.includes('-')) {
        date = parseISO(dateString);
      } else {
        return dateString;
      }

      if (!isValid(date)) return dateString;
      return format(date, 'dd/MM/yyyy', { locale: ptBR });
    } catch (error) {
      console.error('Erro ao formatar data:', error, dateString);
      return dateString || 'Data não informada';
    }
  }

  static getOcorrenciaIcon(tipoOcorrencia?: string): string {
    const icons: { [key: string]: string } = {
      'Praga': '🐛',
      'Doença': '🍂',
      'Deficiência': '🌱',
      'Planta daninha': '🌾',
    };

    if (!tipoOcorrencia) return '📋';

    for (const [key, icon] of Object.entries(icons)) {
      if (tipoOcorrencia.toLowerCase().includes(key.toLowerCase())) {
        return icon;
      }
    }

    return '📋';
  }

  /**
   * Envia imagem da ocorrência para o WhatsApp do usuário via webhook n8n
   * @param ocorrenciaId - ID da ocorrência no banco
   * @param telefone - Telefone do usuário em formato E.164 (ex: 5511999999999)
   * @param imagePath - Path da imagem no storage
   * @param userId - ID do usuário para gerar signed URL
   * @param nomePraga - Nome da praga/doença para usar como título
   * @returns Objeto com success, message e error
   */
  static async sendToWhatsApp(
    ocorrenciaId: number,
    telefone: string,
    imagePath: string,
    userId: string,
    nomePraga?: string
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      console.log('[PragasDoencas][WhatsApp] Iniciando envio da imagem:', ocorrenciaId);

      if (!imagePath) {
        return { success: false, error: 'Ocorrência sem imagem anexada' };
      }

      // Gera URL assinada válida por 1 hora
      const signedUrl = await this.getSignedUrl(imagePath, 3600, userId);
      if (!signedUrl) {
        return { success: false, error: 'Falha ao gerar URL da imagem' };
      }

      // Em desenvolvimento, usa proxy do Vite para contornar CORS
      // Em produção, usa URL direta do webhook
      const isDev = import.meta.env.MODE === 'development' || 
                    (typeof window !== 'undefined' && 
                     (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'));
      
      let webhookUrl: string;
      if (isDev) {
        webhookUrl = '/api/whatsapp/enviar-documento-whatsapp';
      } else {
        webhookUrl = import.meta.env.VITE_WHATSAPP_WEBHOOK_URL;
        if (!webhookUrl) {
          console.error('[PragasDoencas][WhatsApp] VITE_WHATSAPP_WEBHOOK_URL não configurada');
          return { success: false, error: 'Serviço de WhatsApp não configurado' };
        }
      }

      // Extrai informações do arquivo
      const fileName = imagePath.split('/').pop() || 'imagem';
      const extension = fileName.split('.').pop()?.toLowerCase() || 'jpg';

      const payload = {
        telefone: telefone.replace(/\D/g, ''),
        arquivo_url: signedUrl,
        titulo: nomePraga || 'Ocorrência',
        tipo_arquivo: 'image',
        mime_type: `image/${extension === 'jpg' ? 'jpeg' : extension}`,
        nome_arquivo: fileName
      };

      console.log('[PragasDoencas][WhatsApp] Chamando webhook:', webhookUrl);

      const resp = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      console.log('[PragasDoencas][WhatsApp] Response status:', resp.status, resp.statusText);
      
      const responseText = await resp.text();
      
      let json: any = {};
      try {
        json = responseText ? JSON.parse(responseText) : {};
      } catch (parseErr) {
        console.error('[PragasDoencas][WhatsApp] Erro ao parsear JSON:', parseErr);
      }

      if (resp.ok && json?.success) {
        console.log('[PragasDoencas][WhatsApp] ✓ Imagem enviada com sucesso');
        return { success: true, message: 'Imagem enviada para seu WhatsApp!' };
      }

      console.error('[PragasDoencas][WhatsApp] Falha no webhook:', resp.status, json);
      
      return { success: false, error: json?.error || json?.message || `Erro ${resp.status}: ${resp.statusText}` };
    } catch (err) {
      console.error('[PragasDoencas][WhatsApp] Erro:', err);
      return { success: false, error: 'Erro de conexão. Tente novamente.' };
    }
  }
}
