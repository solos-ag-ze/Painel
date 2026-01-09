// ...imports e variáveis já existentes...

// Removida a duplicidade da classe. O método getAttachmentUrlFinanceiro deve estar dentro da única classe AttachmentService já exportada no arquivo.
import { supabase } from '../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { AuthService } from './authService';

// Cliente com service role para operações de storage (contorna RLS)
// Em produção, usa o cliente principal com sessão do usuário
const url = import.meta.env.VITE_SUPABASE_URL;
const serviceRole = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Criar cliente service role apenas se a chave existir
let supabaseServiceRole: any = null;
if (serviceRole) {
  supabaseServiceRole = createClient(url, serviceRole);
}

/**
 * Retorna o cliente de storage apropriado:
 * - Se houver service role key, usa cliente com bypass de RLS
 * - Caso contrário, usa cliente principal com sessão do usuário
 */
function getStorageClient() {
  return supabaseServiceRole || supabase;
}

function logAuthStatus(context: string) {
  supabase.auth.getSession().then(({ data: { session } }) => {
    console.log(`🔐 [${context}] Auth status:`, {
      hasSession: !!session,
      userId: session?.user?.id || 'N/A',
      expiresAt: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'N/A'
    });
  });
}

/**
 * Resultado de operações de upload/delete de anexos financeiros
 */
export interface FileOperationResult {
  success: boolean;
  url?: string;
  error?: string;
  fileType?: string;
}

/**
 * Resultado de operações de download de anexos financeiros
 */
export interface FileDownloadResult {
  data: Blob | null;
  error: string | null;
  fileType: string | null;
}

/**
 * Informações resumidas sobre anexos financeiros
 */
export interface AttachmentInfo {
  id: string;
  url_primeiro_envio?: string | null;
  url_segundo_envio?: string | null;
  hasPrimeiroEnvio?: boolean;
  hasSegundoEnvio?: boolean;
  hasAnyFiles?: boolean;
  fileCount?: number;
  primeiroEnvioType?: string | null;
  segundoEnvioType?: string | null;
}

export class AttachmentService {
  private static readonly BUCKET_NAME = 'notas_fiscais';
  // private static readonly IMAGE_FOLDER = 'imagens'; // Não utilizada
  private static readonly FILE_FOLDER = 'arquivos';

  /**
   * Busca informações do grupo de anexo de uma transação
   */
  private static async getTransactionAttachmentGroup(transactionId: string): Promise<{
    id_grupo_anexo: string | null;
    id_transacao_pai: string | null;
    anexo_compartilhado_url: string | null;
    anexo_arquivo_url: string | null;
    numero_parcelas: number;
  } | null> {
    try {
      const { data, error } = await supabase
        .from('transacoes_financeiras')
        .select('id_grupo_anexo, id_transacao_pai, anexo_compartilhado_url, anexo_arquivo_url, numero_parcelas')
        .eq('id_transacao', transactionId)
        .single();

      if (error) {
        console.error('❌ Erro ao buscar grupo de anexo:', {
          error,
          transactionId
        });
        return null;
      }

      console.log('📊 Informações do grupo obtidas:', {
        transactionId,
        id_grupo_anexo: data.id_grupo_anexo,
        id_transacao_pai: data.id_transacao_pai,
        numero_parcelas: data.numero_parcelas,
        has_shared_url: !!data.anexo_compartilhado_url,
        has_arquivo_url: !!data.anexo_arquivo_url
      });

      return data;
    } catch (error) {
      console.error('💥 Erro ao buscar informações do grupo:', {
        error: error instanceof Error ? error.message : error,
        transactionId
      });
      return null;
    }
  }

  /**
   * Retorna o ID usado para nomear o arquivo no storage
   * Prioridade:
   * 1. Se existe anexo_compartilhado_url, extrai o ID do arquivo da URL
   * 2. Se não, usa id_grupo_anexo para parcelas
   * 3. Caso contrário, usa id_transacao para transações individuais
   */
  private static async getStorageFileId(transactionId: string): Promise<string> {
    const groupInfo = await this.getTransactionAttachmentGroup(transactionId);

    // Prioridade 1: Se já existe URL compartilhada, extrair o ID do arquivo dela
    if (groupInfo?.anexo_compartilhado_url) {
      const fileId = this.extractFileIdFromUrl(groupInfo.anexo_compartilhado_url);
      if (fileId) {
        console.log('🔗 Usando ID extraído da URL compartilhada:', fileId);
        return fileId;
      }
    }

    // Prioridade 2: Usar id_grupo_anexo se disponível
    if (groupInfo?.id_grupo_anexo) {
      console.log('📦 Usando ID do grupo de anexo:', groupInfo.id_grupo_anexo);
      return groupInfo.id_grupo_anexo;
    }

    // Prioridade 3: Usar o ID da própria transação
    console.log('📄 Usando ID da transação individual:', transactionId);
    return transactionId;
  }

  /**
   * Extrai o ID do arquivo de uma URL do Supabase Storage
   * Exemplo: https://.../notas_fiscais/88a47ce1-baaa-463c-afe7-5d90c8186625.jpg
   * Retorna: 88a47ce1-baaa-463c-afe7-5d90c8186625
   */
  private static extractFileIdFromUrl(url: string): string | null {
    try {
      // Remove query parameters
      const urlWithoutParams = url.split('?')[0];

      // Extract filename from URL
      const parts = urlWithoutParams.split('/');
      const filename = parts[parts.length - 1];

      // Remove extension
      const fileId = filename.replace(/\.[^/.]+$/, '');

      return fileId || null;
    } catch (error) {
      console.error('❌ Erro ao extrair ID do arquivo da URL:', error);
      return null;
    }
  }

  /**
   * Normaliza um valor armazenado em `anexo_compartilhado_url` para extrair o
   * object path dentro do bucket. Aceita formatos:
   * - URL completa (https://.../storage/v1/object/public/{bucket}/{path})
   * - path com prefixo de bucket ("notas_fiscais/.../file.jpg")
   * - path relativo ("user_id/file.jpg" ou "arquivos/file.pdf")
   */
  private static normalizeStoredPath(stored: string): string {
    if (!stored) return stored;
    const s = stored.split('?')[0];
    // se for URL completa, tentar extrair tudo após /storage/v1/object/public/{bucket}/
    try {
      if (s.startsWith('http://') || s.startsWith('https://')) {
        // aceitar URLs com /public/ e sem /public/
        const markerPublic = `/storage/v1/object/public/${this.BUCKET_NAME}/`;
        const markerNoPublic = `/storage/v1/object/${this.BUCKET_NAME}/`;
        let idx = s.indexOf(markerPublic);
        if (idx >= 0) return s.substring(idx + markerPublic.length);
        idx = s.indexOf(markerNoPublic);
        if (idx >= 0) return s.substring(idx + markerNoPublic.length);

        // fallback: encontrar o segmento do bucket e retornar o resto, removendo duplicação se existir
        const parts = s.split('/');
        const bi = parts.findIndex(p => p === this.BUCKET_NAME);
        if (bi >= 0 && parts.length > bi + 1) {
          let rest = parts.slice(bi + 1).join('/');
          // remover duplicação 'bucket/bucket/...' -> 'bucket/...'
          if (rest.startsWith(`${this.BUCKET_NAME}/`)) rest = rest.substring(this.BUCKET_NAME.length + 1);
          return rest;
        }
        return s.replace(/^https?:\/\//, '');
      }

      // se começar com nome do bucket, remover prefixo
      if (s.startsWith(`${this.BUCKET_NAME}/`)) return s.substring(this.BUCKET_NAME.length + 1);
      return s.replace(/^\/+/, '');
    } catch (err) {
      console.warn('⚠️ normalizeStoredPath falhou para:', stored, err);
      return stored;
    }
  }

  /**
   * Constroi uma URL pública segura para um object path no Storage,
   * codificando cada segmento do caminho para evitar caracteres inválidos
   * e mantendo as barras entre segmentos.
   */
  private static buildPublicUrl(objectPath: string, bucketName?: string): string {
    const bucket = bucketName || this.BUCKET_NAME;
    const base = url.replace(/\/+$/, '');
    if (!objectPath) return `${base}/storage/v1/object/public/${bucket}`;
    const encoded = objectPath.split('/').map(seg => encodeURIComponent(seg)).join('/');
    return `${base}/storage/v1/object/public/${bucket}/${encoded}`;
  }

  /**
   * Atualiza a URL do anexo compartilhado no banco de dados
   * O trigger do banco propagará automaticamente para todas as parcelas do grupo
   */
  private static async updateSharedAttachmentUrl(
    transactionId: string,
    url: string | null
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('transacoes_financeiras')
        .update({
          anexo_compartilhado_url: url,
          parcela_com_anexo_original: url !== null
        })
        .eq('id_transacao', transactionId);

      if (error) {
        console.error('Erro ao atualizar URL do anexo compartilhado:', error);
        return false;
      }

      console.log('✅ URL do anexo compartilhado atualizada (trigger propagará para parcelas)');
      return true;
    } catch (error) {
      console.error('Erro ao atualizar anexo compartilhado:', error);
      return false;
    }
  }
  
  /**
   * Verifica se existe um anexo para uma transação
   */
  static async hasAttachment(transactionId: string): Promise<boolean> {
    try {
      console.log('🔍 Verificando anexo para transação:', transactionId);

      // Primeiro verifica se há anexo compartilhado no banco
      const groupInfo = await this.getTransactionAttachmentGroup(transactionId);
      if (groupInfo?.anexo_compartilhado_url) {
        console.log('✅ Anexo compartilhado encontrado no banco de dados');
        return true;
      }

      // Se não, busca no storage usando o ID correto (grupo ou transação)
      const fileId = await this.getStorageFileId(transactionId);
      const fileName = `${fileId}.jpg`;
      const user = AuthService.getInstance().getCurrentUser();
      const userPath = user ? `${user.user_id}` : '';

      // Método 1: Tentar buscar o arquivo específico com service role - incluindo user_id
      let { data, error } = await getStorageClient().storage
        .from(this.BUCKET_NAME)
        .list(userPath, {
          limit: 1000,
          search: fileId
        });

      if (error) {
        console.log('⚠️ Erro com service role, tentando cliente normal...');
        const result = await supabase.storage
          .from(this.BUCKET_NAME)
          .list(userPath, {
            limit: 1000,
            search: fileId
          });
        data = result.data;
        error = result.error;
      }

      if (error) {
        console.error('❌ Erro ao listar arquivos:', error);
        // Fallback: verificar por URL pública
        return await this.checkFileExistsByUrl(transactionId);
      }

      const hasFile = data && data.some(file => file.name === fileName);
      console.log('📁 Resultado da busca:', {
        encontrado: hasFile,
        nomeProcurado: fileName,
        arquivosEncontrados: data?.map(f => f.name).join(', ') || 'nenhum'
      });

      if (hasFile) {
        return true;
      }

      // Método 2: Se não encontrou na lista, tentar verificar por URL direta
      console.log('🔄 Arquivo não encontrado na lista, tentando verificação por URL...');
      return await this.checkFileExistsByUrl(transactionId, false);
    } catch (error) {
      console.error('💥 Erro ao verificar anexo:', error);
      // Fallback final: tentar verificar por URL
      return await this.checkFileExistsByUrl(transactionId, false);
    }
  }

  /**
   * Faz o download de um anexo
   */
  static async downloadAttachment(transactionId: string): Promise<void> {
    try {
      console.log('⬇️ Fazendo download do anexo:', transactionId);
      const fileId = await this.getStorageFileId(transactionId);
      const fileName = `${fileId}.jpg`;
      const user = AuthService.getInstance().getCurrentUser();
      const filePath = user ? `${user.user_id}/${fileName}` : fileName;

      console.log('📦 Resolvido ID do arquivo:', {
        transactionId,
        fileId,
        fileName,
        filePath,
        isGroup: fileId !== transactionId
      });

      // Tentar primeiro com service role
      let { data, error } = await getStorageClient().storage
        .from(this.BUCKET_NAME)
        .download(filePath);

      // Fallback para cliente normal
      if (error) {
        console.log('⚠️ Tentando download com cliente normal...');
        const result = await supabase.storage
          .from(this.BUCKET_NAME)
          .download(filePath);
        data = result.data;
        error = result.error;
      }

      if (error) {
        console.error('❌ Erro no download:', {
          error,
          fileName,
          fileId,
          transactionId
        });
        // Tentar download via URL pública
        await this.downloadViaPublicUrl(transactionId);
        return;
      }

      if (!data) {
        throw new Error('Nenhum dado recebido no download');
      }

      console.log('📦 Blob recebido:', data.size, 'bytes, tipo:', data.type);
      
      // Criar URL para download
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `anexo_${transactionId}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      console.log('✅ Download concluído');
    } catch (error) {
      console.error('💥 Erro no download:', error);
      throw error;
    }
  }

  /**
   * Download via URL pública (fallback)
   */
  private static async downloadViaPublicUrl(transactionId: string): Promise<void> {
    try {
      console.log('🔗 Tentando download via URL pública...');
      const fileId = await this.getStorageFileId(transactionId);
      const fileName = `${fileId}.jpg`;
      const user = AuthService.getInstance().getCurrentUser();
      const filePath = user ? `${user.user_id}/${fileName}` : fileName;

      console.log('📦 Usando fileId para URL pública:', {
        transactionId,
        fileId,
        fileName,
        filePath
      });

      const { data } = getStorageClient().storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(filePath);

      if (!data?.publicUrl) {
        throw new Error('Não foi possível obter URL pública');
      }

      console.log('🔗 URL pública gerada:', data.publicUrl);

      // Fazer download via fetch
      const response = await fetch(data.publicUrl);
      if (!response.ok) {
        console.error('❌ Falha na requisição HTTP:', {
          status: response.status,
          statusText: response.statusText,
          url: data.publicUrl
        });
        throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `anexo_${transactionId}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      console.log('✅ Download via URL pública concluído');
    } catch (error) {
      console.error('💥 Erro no download via URL:', {
        error: error instanceof Error ? error.message : error,
        transactionId
      });
      throw error;
    }
  }

  /**
   * Faz upload de um novo anexo
   */
  static async uploadAttachment(transactionId: string, file: File): Promise<boolean> {
    try {
      console.log('⬆️ [Image Upload] Iniciando upload:', transactionId);
      console.log('📁 [Image Upload] Arquivo:', file.name, file.size, file.type);

      logAuthStatus('Image Upload Start');

      const fileId = await this.getStorageFileId(transactionId);
      const fileName = `${fileId}.jpg`;
      const user = AuthService.getInstance().getCurrentUser();

      if (!user?.user_id) {
        throw new Error('Usuario nao autenticado - user_id ausente');
      }

      const filePath = `${user.user_id}/${fileName}`;

      console.log('👤 [Image Upload] userId:', user.user_id);
      console.log('📍 [Image Upload] path:', filePath);

      const processedFile = await this.processImageFile(file, fileName);

      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(filePath, processedFile, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'image/jpeg'
        });

      if (error) {
        console.error('❌ [Image Upload] Erro detalhado:', {
          message: error.message,
          statusCode: (error as any).statusCode,
          error: error
        });
        throw new Error(`Erro ao fazer upload: ${error.message}`);
      }

      if (!data?.path) {
        console.error('❌ [Image Upload] Upload retornou sem path');
        throw new Error('Upload falhou: imagem nao foi salva');
      }

      console.log('✅ [Image Upload] Concluido:', filePath);
      await this.updateSharedAttachmentUrl(transactionId, filePath);

      return true;
    } catch (error) {
      console.error('💥 [Image Upload] Erro:', error);
      throw error;
    }
  }

  /**
   * Substitui um anexo existente
   */
  static async replaceAttachment(transactionId: string, file: File): Promise<boolean> {
    try {
      console.log('🔄 [Image Replace] Substituindo:', transactionId);

      logAuthStatus('Image Replace Start');

      const fileId = await this.getStorageFileId(transactionId);
      const fileName = `${fileId}.jpg`;
      const user = AuthService.getInstance().getCurrentUser();

      if (!user?.user_id) {
        throw new Error('Usuario nao autenticado - user_id ausente');
      }

      const filePath = `${user.user_id}/${fileName}`;

      console.log('👤 [Image Replace] userId:', user.user_id);
      console.log('📍 [Image Replace] path:', filePath);

      const processedFile = await this.processImageFile(file, fileName);

      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .update(filePath, processedFile, {
          cacheControl: '3600',
          contentType: 'image/jpeg'
        });

      if (error) {
        console.error('❌ [Image Replace] Erro detalhado:', {
          message: error.message,
          statusCode: (error as any).statusCode,
          error: error
        });
        throw new Error(`Erro ao substituir anexo: ${error.message}`);
      }

      console.log('✅ [Image Replace] Concluido:', filePath);
      await this.updateSharedAttachmentUrl(transactionId, filePath);

      return true;
    } catch (error) {
      console.error('💥 [Image Replace] Erro:', error);
      throw error;
    }
  }

  /**
   * Exclui um anexo
   */
  static async deleteAttachment(transactionId: string): Promise<boolean> {
    try {
      console.log('🗑️ Excluindo anexo:', transactionId);

      const { data: txData, error: txError } = await supabase
        .from('transacoes_financeiras')
        .select('anexo_compartilhado_url')
        .eq('id_transacao', transactionId)
        .maybeSingle();

      if (txError) {
        console.error('❌ Erro ao buscar path do banco:', txError);
      }

      const storedPath = txData?.anexo_compartilhado_url;

      console.log('📊 [Delete Image] Path salvo no banco:', storedPath || 'N/A');

      const fileId = await this.getStorageFileId(transactionId);
      const user = AuthService.getInstance().getCurrentUser();
      const pathsToTry: string[] = [];

      if (storedPath) {
        const pathToDelete = this.normalizeStoredPath(storedPath);
        console.log('📍 [Delete Image] Path normalizado:', pathToDelete);
        pathsToTry.push(pathToDelete);
      }

      if (user?.user_id) {
        pathsToTry.push(`${user.user_id}/${fileId}.jpg`);
        pathsToTry.push(`${user.user_id}/imagens/${fileId}.jpg`);
      }
      pathsToTry.push(`${fileId}.jpg`);
      pathsToTry.push(`imagens/${fileId}.jpg`);

      console.log('🔍 [Delete Image] Tentando excluir paths:', pathsToTry);

      for (const path of pathsToTry) {
        console.log(`🗑️ Tentando excluir: ${path}`);

        const { data, error } = await supabase.storage
          .from(this.BUCKET_NAME)
          .remove([path]);

        if (!error && data && data.length > 0) {
          console.log('✅ Exclusão concluída:', path);

          await this.updateSharedAttachmentUrl(transactionId, null);

          return true;
        } else {
          console.log(`⚠️ Falha ao excluir ${path}:`, error?.message || 'Nenhum arquivo removido');
        }
      }

      throw new Error('Arquivo não encontrado em nenhum dos caminhos tentados');
    } catch (error) {
      console.error('💥 Erro ao excluir anexo:', error);
      throw error;
    }
  }

  /**
   * Obtém a URL pública de um anexo
   * @param transactionId - ID da transação
   * @param forceRefresh - Se true, ignora cache do banco e busca direto do storage
   */
  static async getAttachmentUrl(transactionId: string, forceRefresh = false): Promise<string | null> {
    try {
      console.log('🔗 Obtendo URL do anexo:', transactionId, forceRefresh ? '(forçando refresh)' : '');

      // Se não forçar refresh, tenta obter do banco primeiro (mais rápido)
      if (!forceRefresh) {
        const groupInfo = await this.getTransactionAttachmentGroup(transactionId);
        if (groupInfo?.anexo_compartilhado_url) {
            console.log('✅ URL obtida do banco de dados (anexo compartilhado)');
            // Pode ser um path armazenado (ex: "<user_id>/file.jpg") ou uma URL completa.
            const stored = groupInfo.anexo_compartilhado_url.split('?')[0];
            const timestamp = Date.now();
            const random = Math.random().toString(36).substring(7);
            // Se já for uma URL completa, retorna com cache-busting
            if (stored.startsWith('http://') || stored.startsWith('https://')) {
              return `${stored}?v=${timestamp}&r=${random}&nocache=true`;
            }
            // Caso seja um path armazenado, o bucket pode ser privado.
            // Estratégia: 1) tentar servidor de signed-urls se configurado; 2) tentar createSignedUrl via SDK (service role) se disponível; 3) fazer download do blob via SDK e retornar blob: URL.
            const rawSignedServer = import.meta.env.VITE_SIGNED_URL_SERVER_URL as string | undefined;
            const fallbackServer = (import.meta.env.VITE_API_URL as string | undefined) || (import.meta.env.VITE_BASE_URL as string | undefined) || '';
            const signedServer = rawSignedServer || (fallbackServer ? fallbackServer : undefined);

            // Log explícito do comportamento quando não configurado
            if (!rawSignedServer) {
              if (fallbackServer) {
                console.warn('⚠️ VITE_SIGNED_URL_SERVER_URL não configurado — usando fallback:', fallbackServer);
              } else {
                console.warn('⚠️ VITE_SIGNED_URL_SERVER_URL não configurado e nenhum fallback disponível; continuará tentando via SDK.');
              }
            }

            // 1) signed-url server
            if (signedServer) {
              try {
                // usar objectPath (sem prefixo de bucket) ao solicitar signed-url
                const objectPath = this.normalizeStoredPath(stored);
                const user = AuthService.getInstance().getCurrentUser();
                const pathsToTry = [objectPath];
                if (user?.user_id && !objectPath.startsWith(user.user_id)) {
                  pathsToTry.unshift(`${user.user_id}/${objectPath}`);
                }

                const { data: { session } } = await supabase.auth.getSession();
                const accessToken = session?.access_token || anonKey;
                const headers: HeadersInit = { 'Content-Type': 'application/json' };
                if (accessToken) {
                  headers['Authorization'] = `Bearer ${accessToken}`;
                }

                for (const tryPath of pathsToTry) {
                  const resp = await fetch(`${signedServer.replace(/\/+$/, '')}/signed-url`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ bucket: this.BUCKET_NAME, path: tryPath, expires: 120 })
                  });
                  const json = await resp.json().catch(() => ({}));
                  if (resp.ok && json?.signedUrl) {
                    console.log('🔐 Obtida signedUrl via servidor:', json.signedUrl);
                    console.log('🧭 USING_ATTACHMENT_URL_METHOD: signed-server', { transactionId, url: json.signedUrl });
                    return json.signedUrl;
                  }
                }
                console.warn('⚠️ signed-url server falhou para todos os paths tentados');
              } catch (err) {
                console.warn('⚠️ Erro ao solicitar signed-url:', err);
              }
            }

            // 2) createSignedUrl via SDK (apenas se service role estiver presente)
            try {
                if (serviceRole && serviceRole.length) {
                try {
                const objectPath = this.normalizeStoredPath(stored);
                const user = AuthService.getInstance().getCurrentUser();
                const pathsToTry = [objectPath];
                if (user?.user_id && !objectPath.startsWith(user.user_id)) {
                  pathsToTry.unshift(`${user.user_id}/${objectPath}`);
                }

                for (const tryPath of pathsToTry) {
                  const { data: signedData, error: signedError } = await getStorageClient().storage
                    .from(this.BUCKET_NAME)
                    .createSignedUrl(tryPath, 120);
                    if (!signedError && signedData?.signedUrl) {
                      console.log('🔐 Obtida signedUrl via SDK:', signedData.signedUrl);
                      console.log('🧭 USING_ATTACHMENT_URL_METHOD: signed-sdk', { transactionId, url: signedData.signedUrl });
                      return signedData.signedUrl;
                    }
                }
                console.warn('⚠️ createSignedUrl falhou para todos os paths tentados');
                } catch (err) {
                  console.warn('⚠️ Falha ao chamar createSignedUrl via serviceRole:', err);
                }
              }
            } catch (err) {
              console.warn('⚠️ Erro ao verificar serviceRole para createSignedUrl:', err);
            }

            // 3) Fallback: tentar baixar o blob via SDK (precisa de service role) e retornar URL.createObjectURL
            try {
              const objectPath = this.normalizeStoredPath(stored);
              const user = AuthService.getInstance().getCurrentUser();
              const pathsToTry = [objectPath];
              if (user?.user_id && !objectPath.startsWith(user.user_id)) {
                pathsToTry.unshift(`${user.user_id}/${objectPath}`);
              }

              for (const tryPath of pathsToTry) {
                const { data: blobData, error: dlError } = await getStorageClient().storage
                    .from(this.BUCKET_NAME)
                    .download(tryPath);
                if (!dlError && blobData) {
                  console.log('📦 Blob obtido via SDK para preview, criando object URL');
                  const objectUrl = URL.createObjectURL(blobData as Blob);
                  console.log('🧭 USING_ATTACHMENT_URL_METHOD: blob-object-url', { transactionId, url: objectUrl });
                  return objectUrl;
                }
              }
              console.warn('⚠️ download via SDK falhou para todos os paths tentados');
            } catch (err) {
              console.warn('⚠️ Erro no download via SDK:', err);
            }

            // último recurso: construir URL pública manualmente (útil em dev publique)
            const publicUrl = this.buildPublicUrl(stored);
            const finalPublic = `${publicUrl}?v=${timestamp}&r=${random}&nocache=true`;
            console.log('🧭 USING_ATTACHMENT_URL_METHOD: public-url-constructed', { transactionId, url: finalPublic });
            return finalPublic;
          }
      }

      const fileId = await this.getStorageFileId(transactionId);
      const fileName = `${fileId}.jpg`;

      console.log('📦 Gerando URL pública para arquivo (construída):', fileName);

      // Construir diretamente a URL pública conhecida do Supabase Storage para buckets públicos.
      // Priorizar <user_id>/<fileName> (imagens dentro da pasta do usuário), depois fileName na raiz.
      const user = AuthService.getInstance().getCurrentUser();
      const baseUrl = url.replace(/\/+$/, '');
      const candidates = [] as string[];
      if (user?.user_id) candidates.push(`${user.user_id}/${fileName}`);
      candidates.push(fileName);

      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(7);

      for (const candidate of candidates) {
        const objectPath = candidate;

        // 1) tentar obter signedUrl via SDK/service role
        try {
          if (serviceRole && serviceRole.length) {
            const { data: signedData, error: signedError } = await getStorageClient().storage
              .from(this.BUCKET_NAME)
              .createSignedUrl(objectPath, 120);

            if (signedError) {
              console.warn('⚠️ createSignedUrl erro para candidate:', objectPath, signedError.message || signedError);
            }
            if (signedData?.signedUrl) {
              console.log('🔐 Obtida signedUrl via SDK para candidate:', objectPath);
              console.log('🧭 USING_ATTACHMENT_URL_METHOD: signed-sdk-candidate', { candidate: objectPath, url: signedData.signedUrl });
              return signedData.signedUrl;
            }
          }
        } catch (err) {
          console.warn('⚠️ createSignedUrl exception para candidate:', objectPath, err);
        }

        // 2) tentar baixar blob via service role e retornar object URL (preview local)
        try {
          if (serviceRole && serviceRole.length) {
            const { data: blobData, error: dlError } = await getStorageClient().storage
              .from(this.BUCKET_NAME)
              .download(objectPath);
            if (!dlError && blobData) {
              console.log('📦 Blob obtido via SDK para preview (candidate):', objectPath);
              const objectUrl = URL.createObjectURL(blobData as Blob);
              console.log('🧭 USING_ATTACHMENT_URL_METHOD: blob-object-url-candidate', { candidate: objectPath, url: objectUrl });
              return objectUrl;
            }
            if (dlError) console.warn('⚠️ download erro para candidate:', objectPath, dlError.message || dlError);
          }
        } catch (err) {
          console.warn('⚠️ download exception para candidate:', objectPath, err);
        }

        // 3) último recurso: construir URL pública conhecida do Supabase Storage
        const publicUrlBase = this.buildPublicUrl(candidate);
        const urlWithTimestamp = `${publicUrlBase}?v=${timestamp}&r=${random}&nocache=true`;
        console.log('📎 URL construída com cache-busting (fallback):', urlWithTimestamp);
        console.log('🧭 USING_ATTACHMENT_URL_METHOD: public-url-candidate', { candidate: objectPath, url: urlWithTimestamp });
        return urlWithTimestamp;
      }
    } catch (error) {
      console.error('💥 Erro ao obter URL do anexo:', error);
      return null;
    }
  }

  /**
   * Testa a conectividade com o Supabase Storage
   */
  static async testS3Connection(): Promise<boolean> {
    try {
      console.log('🧪 Testando conexão com Supabase Storage...');
      
      // Testar com ambos os clientes
      const { error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .list('', { limit: 1 });

      const { error: serviceError } = await getStorageClient().storage
        .from(this.BUCKET_NAME)
        .list('', { limit: 1 });

      const normalSuccess = !error;
      const serviceSuccess = !serviceError;

      console.log('🔗 Conexão com Storage (normal):', normalSuccess ? '✅ OK' : '❌ FALHOU');
      console.log('🔗 Conexão com Storage (service):', serviceSuccess ? '✅ OK' : '❌ FALHOU');

      if (error) {
        console.error('Erro na conexão normal:', error);
      }
      if (serviceError) {
        console.error('Erro na conexão service:', serviceError);
      } else {
        console.log('📋 Teste bem-sucedido, bucket acessível');
      }

      return normalSuccess || serviceSuccess;
    } catch (error) {
      console.error('💥 Erro no teste de conexão:', error);
      return false;
    }
  }

  /**
   * Lista todos os anexos no bucket (para debug)
   */
  static async listAllAttachments(): Promise<string[]> {
    try {
      console.log('📋 Listando todos os anexos no bucket...');
      
      // Tentar com service role primeiro
      let { data, error } = await getStorageClient().storage
        .from(this.BUCKET_NAME)
        .list('');

      // Fallback para cliente normal
      if (error) {
        console.log('⚠️ Tentando listar com cliente normal...');
        const result = await supabase.storage
          .from(this.BUCKET_NAME)
          .list('');
        data = result.data;
        error = result.error;
      }

      if (error) {
        console.error('❌ Erro ao listar anexos:', error);
        return [];
      }

      const fileNames = data?.map(file => file.name) || [];
      console.log('📁 Arquivos encontrados no bucket:', fileNames.length, 'arquivos:', fileNames);
      return fileNames;
    } catch (error) {
      console.error('💥 Erro ao listar anexos:', error);
      return [];
    }
  }

  /**
   * Processa arquivo de imagem para garantir formato JPG
   */
  private static async processImageFile(file: File, fileName: string): Promise<File> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Redimensionar se necessário (máximo 1920x1080)
        const maxWidth = 1920;
        const maxHeight = 1080;
        let { width, height } = img;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }

        canvas.width = width;
        canvas.height = height;

        if (ctx) {
          // Fundo branco para JPG
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob((blob) => {
            if (blob) {
              const processedFile = new File([blob], fileName, {
                type: 'image/jpeg',
                lastModified: Date.now()
              });
              console.log('🖼️ Imagem processada:', processedFile.size, 'bytes');
              resolve(processedFile);
            } else {
              reject(new Error('Erro ao processar imagem'));
            }
          }, 'image/jpeg', 0.9);
        } else {
          reject(new Error('Erro ao criar contexto do canvas'));
        }
      };

      img.onerror = () => reject(new Error('Erro ao carregar imagem'));
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Converte File para base64 (somente dados, sem prefixo data:)
   */
  private static async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // remover prefixo data:...;base64, se presente
        const commaIndex = result.indexOf(',');
        resolve(commaIndex >= 0 ? result.substring(commaIndex + 1) : result);
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  }

  /**
   * Valida se o arquivo é uma imagem válida para anexos financeiros
   * @param file Arquivo a ser validado
   * @throws Error se tipo ou tamanho inválido
   */
  static validateImageFile(file: File): boolean {
    const validTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'image/bmp', 'image/svg+xml', 'image/avif', 'image/heic', 'image/heif'
    ];
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (!validTypes.includes(file.type)) {
      throw new Error('Tipo de arquivo não suportado. Use JPG, PNG, GIF, WebP, BMP, SVG, AVIF ou HEIC.');
    }
    if (file.size > maxSize) {
      throw new Error('Arquivo muito grande. Tamanho máximo: 10MB.');
    }
    return true;
  }

  /**
   * Valida se o arquivo é um documento aceito (PDF, XML, DOC, DOCX, XLS, XLSX, CSV, TXT) para anexos financeiros
   * @param file Arquivo a ser validado
   * @throws Error se tipo ou tamanho inválido
   */
  static validateFile(file: File): boolean {
    const validTypes = [
      'application/pdf', 'application/xml', 'text/xml',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv', 'text/plain'
    ];
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (!validTypes.includes(file.type)) {
      throw new Error('Tipo de arquivo não suportado. Use PDF, XML, DOC, DOCX, XLS, XLSX, CSV ou TXT.');
    }
    if (file.size > maxSize) {
      throw new Error('Arquivo muito grande. Tamanho máximo: 10MB.');
    }
    return true;
  }

  /**
   * Retorna o ID usado para nomear arquivos (PDF, XML) no storage
   */
  private static async getStorageFileIdForFile(transactionId: string): Promise<string> {
    // Usar somente storage direto: preferir id_grupo_anexo quando disponível,
    // caso contrário usar o próprio id da transação.
    try {
      const groupInfo = await this.getTransactionAttachmentGroup(transactionId);
      if (groupInfo?.id_grupo_anexo) {
        console.log('� Usando ID do grupo de anexo para arquivo (storage direto):', groupInfo.id_grupo_anexo);
        return groupInfo.id_grupo_anexo;
      }
    } catch (err) {
      console.warn('⚠️ Falha ao obter grupo de anexo, fallback para transactionId:', transactionId, err);
    }

    console.log('📄 Usando ID da transação individual para arquivo (storage direto):', transactionId);
    return transactionId;
  }

  /**
   * Detecta a extensão do arquivo baseado no tipo MIME
   */
  private static getFileExtension(file: File): string {
    const mimeToExt: Record<string, string> = {
      'application/pdf': 'pdf',
      'application/xml': 'xml',
      'text/xml': 'xml',
      'application/msword': 'doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'application/vnd.ms-excel': 'xls',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
      'text/csv': 'csv',
      'text/plain': 'txt'
    };

    if (mimeToExt[file.type]) {
      return mimeToExt[file.type];
    }

    const nameParts = file.name.split('.');
    if (nameParts.length > 1) {
      const ext = nameParts[nameParts.length - 1].toLowerCase();
      if (['pdf', 'xml', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'txt'].includes(ext)) return ext;
    }

    return 'pdf';
  }

  /**
   * Verifica se existe um arquivo anexado para uma transação
   */
  static async hasFileAttachment(transactionId: string): Promise<boolean> {
    try {
      console.log('🔍 Verificando arquivo para transação:', transactionId);

      const { data: txData, error: txError } = await supabase
        .from('transacoes_financeiras')
        .select('anexo_arquivo_url')
        .eq('id_transacao', transactionId)
        .maybeSingle();

      if (txError) {
        console.error('❌ Erro ao buscar path do banco:', txError);
      }

      const storedPath = txData?.anexo_arquivo_url;

      console.log('📊 [hasFileAttachment] Path salvo no banco:', storedPath || 'N/A');

      if (storedPath) {
        console.log('✅ [hasFileAttachment] Arquivo encontrado via banco');
        return true;
      }

      console.log('🔄 Path não encontrado no banco, verificando storage...');

      const fileId = await this.getStorageFileIdForFile(transactionId);
      const extensionsList = ['pdf','xml','xls','xlsx','doc','docx','csv','txt'];
      const user = AuthService.getInstance().getCurrentUser();

      const candidatePaths = [] as string[];
      if (user?.user_id) candidatePaths.push(`${user.user_id}/${this.FILE_FOLDER}`);
      candidatePaths.push(this.FILE_FOLDER);
      candidatePaths.push('');

      let data = null as any;
      let error = null as any;
      for (const path of candidatePaths) {
        try {
          const res = await supabase.storage
            .from(this.BUCKET_NAME)
            .list(path, {
              limit: 1000,
              search: fileId
            });
          data = res.data;
          error = res.error;
        } catch (e) {
          data = null;
          error = e;
        }
        if (!error && data) break;
      }

      if (error) {
        console.error('❌ Erro ao listar arquivos:', error);
        return false;
      }

      const hasFile = data && data.some(file =>
        extensionsList.some(ext => file.name === `${fileId}.${ext}`)
      );

      console.log('📁 [hasFileAttachment] Resultado da busca no storage:', {
        encontrado: hasFile,
        arquivosEncontrados: data?.map(f => f.name).join(', ') || 'nenhum'
      });

      return hasFile;
    } catch (error) {
      console.error('💥 Erro ao verificar arquivo:', error);
      return false;
    }
  }

  /**
   * Verifica se arquivo existe tentando acessar a URL pública
   */
  private static async checkFileExistsByUrl(transactionId: string, isFile: boolean = false): Promise<boolean> {
    try {
      console.log(`🔗 Verificando ${isFile ? 'arquivo' : 'imagem'} por URL pública...`);

      const fileId = isFile
        ? await this.getStorageFileIdForFile(transactionId)
        : await this.getStorageFileId(transactionId);

  const extensionsList = isFile ? ['pdf','xml','xls','xlsx','doc','docx','csv','txt'] : ['jpg'];


    // Tentar com prefixo de usuário (user_id/arquivos), em seguida arquivos/, em seguida raiz
    const user = AuthService.getInstance().getCurrentUser();
    const candidates: string[] = [];
    if (isFile) {
      if (user?.user_id) candidates.push(`${user.user_id}/${this.FILE_FOLDER}`);
      candidates.push(this.FILE_FOLDER);
      candidates.push('');
    } else {
      if (user?.user_id) candidates.push(`${user.user_id}`);
      candidates.push('');
    }

    const tried: Array<{ file: string; publicStatus?: string; signedStatus?: string; error?: string }> = [];

    for (const folder of candidates) {
      for (const ext of extensionsList) {
        const fileName = folder ? `${folder}/${fileId}.${ext}` : `${fileId}.${ext}`;
        // Agrupar logs por candidato para legibilidade
        try {
          console.groupCollapsed(`Anexo: ${fileName}`);
          // Primeiro tentar obter a URL pública via SDK (pode respeitar as configurações do projeto)
          let publicUrl: string;
          try {
            const { data: pubData, error: pubErr } = await getStorageClient().storage
              .from(this.BUCKET_NAME)
              .getPublicUrl(fileName);

            if (!pubErr && pubData?.publicUrl) {
              publicUrl = pubData.publicUrl;
              console.log('→ publicUrl (SDK):', publicUrl);
            } else {
              publicUrl = this.buildPublicUrl(fileName);
              console.log('→ publicUrl (construída):', publicUrl);
              if (pubErr) console.warn('   getPublicUrl retornou erro:', pubErr);
            }
          } catch (err) {
            publicUrl = this.buildPublicUrl(fileName);
            console.log('→ publicUrl (construída, SDK indisponível):', publicUrl);
          }

          try {
            const response = await fetch(publicUrl, { method: 'GET', cache: 'no-cache', mode: 'cors' });
            if (response.ok) {
              console.log(`✅ Encontrado (público): ${fileName} — ${response.status}`);
              console.groupEnd();
              return true;
            }
            const statusInfo = `${response.status} ${response.statusText}`;
            console.log(`ℹ️ Verificação pública: ${statusInfo}`);
            tried.push({ file: fileName, publicStatus: statusInfo });

            // Se o bucket for privado ou a URL pública falhar com 400/403/404, tentar signed URL via SDK (service role)
            if ([400, 403, 404].includes(response.status)) {
              try {
                const objectPath = this.normalizeStoredPath(fileName);
                if (serviceRole && serviceRole.length) {
                  const { data: signedData, error: signedError } = await getStorageClient().storage
                    .from(this.BUCKET_NAME)
                    .createSignedUrl(objectPath, 120);
                  if (!signedError && signedData?.signedUrl) {
                    console.log('→ signedUrl gerada via SDK');
                    const sres = await fetch(signedData.signedUrl, { method: 'GET', cache: 'no-cache', mode: 'cors' });
                    if (sres.ok) {
                      console.log(`✅ Encontrado (signed): ${fileName} — ${sres.status}`);
                      console.groupEnd();
                      return true;
                    }
                    const sStatus = `${sres.status} ${sres.statusText}`;
                    console.log('ℹ️ signedUrl retornou:', sStatus);
                    // registrar tentativa signed
                    tried[tried.length - 1].signedStatus = sStatus;
                  } else {
                    console.warn('⚠️ createSignedUrl retornou erro ou sem signedUrl:', signedError);
                    tried[tried.length - 1].signedStatus = 'erro-gerar-signedUrl';
                  }
                } else {
                  console.log('→ service_role indisponível; não foi possível gerar signedUrl via SDK');
                  tried[tried.length - 1].signedStatus = 'service_role_missing';
                }
              } catch (err) {
                console.warn('⚠️ Erro ao tentar createSignedUrl/fetch:', err);
                tried[tried.length - 1].error = String(err?.message || err);
              }
            }
          } catch (err) {
            console.warn('⚠️ Erro ao verificar URL pública (GET):', publicUrl, err);
            tried.push({ file: fileName, error: String(err?.message || err) });
          }
        } finally {
          console.groupEnd();
        }
      }
    }

      if (tried && tried.length) {
        console.groupCollapsed(`❌ Resumo: nenhuma ${isFile ? 'arquivo' : 'imagem'} encontrada — tentativas: ${tried.length}`);
        console.table(tried.map(t => ({ Arquivo: t.file, Public: t.publicStatus || '-', Signed: t.signedStatus || '-', Erro: t.error || '-' })) );
        console.groupEnd();
      } else {
        console.log(`❌ Nenhum ${isFile ? 'arquivo' : 'imagem'} encontrado`);
      }
      return false;
    } catch (error) {
      console.error('💥 Erro na verificação por URL:', error);
      return false;
    }
  }

  /**
   * Faz upload de um arquivo (PDF ou XML)
   */
  static async uploadFileAttachment(transactionId: string, file: File): Promise<boolean> {
    try {
      console.log('⬆️ Fazendo upload do arquivo:', transactionId);
      console.log('📁 Arquivo original:', file.name, file.size, file.type);

      logAuthStatus('File Upload Start');

      this.validateFile(file);

      const fileId = await this.getStorageFileIdForFile(transactionId);
      const ext = this.getFileExtension(file);
      const user = AuthService.getInstance().getCurrentUser();

      if (!user?.user_id) {
        throw new Error('Usuario nao autenticado - user_id ausente');
      }

      const fileName = `${user.user_id}/${this.FILE_FOLDER}/${fileId}.${ext}`;

      console.log('📦 [File Upload] fileId:', fileId, 'ext:', ext);
      console.log('👤 [File Upload] userId:', user.user_id);
      console.log('📍 [File Upload] path:', fileName);

      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type
        });

      if (error) {
        console.error('❌ [File Upload] Erro detalhado:', {
          message: error.message,
          statusCode: (error as any).statusCode,
          error: error
        });
        throw new Error(`Erro ao fazer upload: ${error.message}`);
      }

      if (!data?.path) {
        console.error('❌ [File Upload] Upload retornou sem path');
        throw new Error('Upload falhou: arquivo nao foi salvo');
      }

      console.log('✅ [File Upload] Concluido:', data);

      await supabase
        .from('transacoes_financeiras')
        .update({ anexo_arquivo_url: data.path })
        .eq('id_transacao', transactionId);

      console.log('📝 [File Upload] Path salvo no banco:', data.path);

      return true;
    } catch (error) {
      console.error('💥 [File Upload] Erro:', error);
      throw error;
    }
  }

  /**
   * Substitui um arquivo existente
   */
  static async replaceFileAttachment(transactionId: string, file: File): Promise<boolean> {
    try {
      console.log('🔄 [File Replace] Substituindo arquivo:', transactionId);

      logAuthStatus('File Replace Start');

      this.validateFile(file);

      const fileId = await this.getStorageFileIdForFile(transactionId);
      const ext = this.getFileExtension(file);
      const user = AuthService.getInstance().getCurrentUser();

      if (!user?.user_id) {
        throw new Error('Usuario nao autenticado - user_id ausente');
      }

      const fileName = `${user.user_id}/${this.FILE_FOLDER}/${fileId}.${ext}`;

      console.log('👤 [File Replace] userId:', user.user_id);
      console.log('📍 [File Replace] path:', fileName);

      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .update(fileName, file, {
          cacheControl: '3600',
          contentType: file.type
        });

      if (error) {
        console.error('❌ [File Replace] Erro detalhado:', {
          message: error.message,
          statusCode: (error as any).statusCode,
          error: error
        });
        throw new Error(`Erro ao substituir arquivo: ${error.message}`);
      }

      console.log('✅ [File Replace] Concluido:', data);

      await supabase
        .from('transacoes_financeiras')
        .update({ anexo_arquivo_url: fileName })
        .eq('id_transacao', transactionId);

      console.log('📝 [File Replace] Path salvo no banco:', fileName);

      return true;
    } catch (error) {
      console.error('💥 [File Replace] Erro:', error);
      throw error;
    }
  }

  /**
   * Exclui um arquivo
   */
  static async deleteFileAttachment(transactionId: string): Promise<boolean> {
    try {
      console.log('🗑️ Excluindo arquivo:', transactionId);

      const { data: txData, error: txError } = await supabase
        .from('transacoes_financeiras')
        .select('anexo_arquivo_url')
        .eq('id_transacao', transactionId)
        .maybeSingle();

      if (txError) {
        console.error('❌ Erro ao buscar path do banco:', txError);
      }

      const storedPath = txData?.anexo_arquivo_url;

      console.log('📊 [Delete File] Path salvo no banco:', storedPath || 'N/A');

      if (storedPath) {
        console.log('📍 [Delete File] Usando path do banco:', storedPath);

        let { data, error } = await supabase.storage
          .from(this.BUCKET_NAME)
          .remove([storedPath]);

        if (error) {
          console.error('❌ Erro ao excluir via path do banco:', error);
          throw new Error(`Erro ao excluir arquivo: ${error.message}`);
        }

        console.log('✅ Exclusão concluída via path do banco');

        await supabase
          .from('transacoes_financeiras')
          .update({ anexo_arquivo_url: null })
          .eq('id_transacao', transactionId);

        console.log('📝 [File Delete] Path removido do banco');

        return true;
      }

      console.log('🔄 Path não encontrado no banco, tentando fallback...');

      const fileId = await this.getStorageFileIdForFile(transactionId);
      const extensions = ['pdf','xml','xls','xlsx','doc','docx','csv','txt'];
      const user = AuthService.getInstance().getCurrentUser();
      const filesToDelete = [] as string[];

      if (user?.user_id) {
        filesToDelete.push(...extensions.map(ext => `${user.user_id}/${this.FILE_FOLDER}/${fileId}.${ext}`));
      }
      filesToDelete.push(...extensions.map(ext => `${this.FILE_FOLDER}/${fileId}.${ext}`));
      filesToDelete.push(...extensions.map(ext => `${fileId}.${ext}`));

      let { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .remove(filesToDelete);

      if (error) {
        console.error('❌ Erro na exclusão:', error);
        throw new Error(`Erro ao excluir arquivo: ${error.message}`);
      }

      console.log('✅ Exclusão concluída via fallback');

      await supabase
        .from('transacoes_financeiras')
        .update({ anexo_arquivo_url: null })
        .eq('id_transacao', transactionId);

      console.log('📝 [File Delete] Path removido do banco');

      return true;
    } catch (error) {
      console.error('💥 Erro ao excluir arquivo:', error);
      throw error;
    }
  }

  /**
   * Faz o download de um arquivo
   */
  static async downloadFileAttachment(transactionId: string): Promise<void> {
    try {
      console.log('⬇️ Fazendo download do arquivo:', transactionId);

      const { data: txData, error: txError } = await supabase
        .from('transacoes_financeiras')
        .select('anexo_arquivo_url')
        .eq('id_transacao', transactionId)
        .maybeSingle();

      if (txError) {
        console.error('❌ Erro ao buscar path do banco:', txError);
      }

      const storedPath = txData?.anexo_arquivo_url;

      console.log('📊 [Download File] Path salvo no banco:', storedPath || 'N/A');

      if (storedPath) {
        console.log('📍 [Download File] Usando path do banco:', storedPath);

        const { data, error } = await supabase.storage
          .from(this.BUCKET_NAME)
          .download(storedPath);

        if (!error && data) {
          console.log('📦 Blob recebido:', data.size, 'bytes, tipo:', data.type);

          const fileExtension = storedPath.split('.').pop() || 'pdf';
          const url = URL.createObjectURL(data);
          const link = document.createElement('a');
          link.href = url;
          link.download = `arquivo_${transactionId}.${fileExtension}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);

          console.log('✅ Download concluído via path do banco');
          return;
        } else {
          console.log('⚠️ Erro ao baixar via path do banco:', error);
        }
      }

      console.log('🔄 Path não encontrado no banco, tentando fallback...');

      const fileId = await this.getStorageFileIdForFile(transactionId);
      const extensions = ['pdf','xml','xls','xlsx','doc','docx','csv','txt'];
      let downloaded = false;

      const user = AuthService.getInstance().getCurrentUser();
      const candidateNames: string[] = [];
      if (user?.user_id) candidateNames.push(...extensions.map(ext => `${user.user_id}/${this.FILE_FOLDER}/${fileId}.${ext}`));
      candidateNames.push(...extensions.map(ext => `${this.FILE_FOLDER}/${fileId}.${ext}`));
      candidateNames.push(...extensions.map(ext => `${fileId}.${ext}`));

      for (const fileName of candidateNames) {
        const { data, error } = await supabase.storage
          .from(this.BUCKET_NAME)
          .download(fileName);

        if (!error && data) {
          console.log('📦 Blob recebido:', data.size, 'bytes, tipo:', data.type);

          const fileExtension = fileName.split('.').pop() || 'pdf';
          const url = URL.createObjectURL(data);
          const link = document.createElement('a');
          link.href = url;
          link.download = `arquivo_${transactionId}.${fileExtension}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);

          console.log('✅ Download concluído');
          downloaded = true;
          break;
        }
      }

      if (!downloaded) {
        throw new Error('Arquivo não encontrado');
      }
    } catch (error) {
      console.error('💥 Erro no download:', error);
      throw error;
    }
  }

  /**
   * Download de arquivo via URL pública (fallback)
   */
  private static async downloadFileViaPublicUrl(transactionId: string): Promise<void> {
    try {
      console.log('🔗 Tentando download de arquivo via URL pública...');
      const fileId = await this.getStorageFileIdForFile(transactionId);

  const extensions = ['pdf','xml','xls','xlsx','doc','docx','csv','txt'];

      // tentar possíveis caminhos com prefixo de usuário e fallbacks
      const user = AuthService.getInstance().getCurrentUser();
      const candidateNames: string[] = [];
      if (user?.user_id) candidateNames.push(...extensions.map(ext => `${user.user_id}/${this.FILE_FOLDER}/${fileId}.${ext}`));
      candidateNames.push(...extensions.map(ext => `${this.FILE_FOLDER}/${fileId}.${ext}`));
      candidateNames.push(...extensions.map(ext => `${fileId}.${ext}`));

      for (const fileName of candidateNames) {
        const { data } = getStorageClient().storage
          .from(this.BUCKET_NAME)
          .getPublicUrl(fileName);

        if (!data?.publicUrl) continue;

        console.log('🔗 URL pública gerada:', data.publicUrl);

        const response = await fetch(data.publicUrl);
        if (!response.ok) continue;

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `arquivo_${transactionId}.${fileName.split('.').pop()}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        console.log('✅ Download via URL pública concluído');
        return;
      }

      throw new Error('Arquivo não encontrado');
    } catch (error) {
      console.error('💥 Erro no download via URL:', error);
      throw error;
    }
  }

  /**
   * Obtém a URL pública de um arquivo
   */
  static async getFileAttachmentUrl(transactionId: string, forceRefresh = false): Promise<string | null> {
    try {
      console.log('🔗 [Financeiro File] Obtendo URL do arquivo:', transactionId, forceRefresh ? '(forçando refresh)' : '');

      const { data: txData, error: txError } = await supabase
        .from('transacoes_financeiras')
        .select('anexo_arquivo_url')
        .eq('id_transacao', transactionId)
        .maybeSingle();

      if (txError) {
        console.error('❌ Erro ao buscar path do banco:', txError);
      }

      const storedPath = txData?.anexo_arquivo_url;

      console.log('📊 [Financeiro File] Path salvo no banco:', storedPath || 'N/A');

      if (storedPath) {
        console.log('📍 [Financeiro File] Usando path do banco:', storedPath);

        const { data: signedData, error: signedErr } = await supabase.storage
          .from(this.BUCKET_NAME)
          .createSignedUrl(storedPath, 3600);

        if (signedData?.signedUrl && !signedErr) {
          try {
            const testRes = await fetch(signedData.signedUrl, { method: 'HEAD', cache: 'no-cache' });
            console.log(`   SignedUrl HEAD: ${testRes.status}`);
            if (testRes.ok) {
              console.log('✅ [Financeiro File] Encontrado via path do banco');
              return signedData.signedUrl;
            }
          } catch (headErr) {
            console.log(`   SignedUrl HEAD falhou:`, headErr);
          }
        }

        try {
          const { data: blobData, error: dlErr } = await supabase.storage
            .from(this.BUCKET_NAME)
            .download(storedPath);

          if (blobData && !dlErr) {
            const blobUrl = URL.createObjectURL(blobData);
            console.log('✅ [Financeiro File] Encontrado via blob download (path do banco)');
            return blobUrl;
          }
        } catch (blobErr) {
          console.log(`   Blob download falhou:`, blobErr);
        }
      }

      const fileId = await this.getStorageFileIdForFile(transactionId);
      const user = AuthService.getInstance().getCurrentUser();
      const userId = user?.user_id || '';
      const extensions = ['pdf', 'xml', 'xls', 'xlsx', 'doc', 'docx', 'csv', 'txt'];

      console.log('📦 [Financeiro File] fileId:', fileId, '| userId:', userId);

      const pathsToTry: string[] = [];

      for (const ext of extensions) {
        if (userId) {
          pathsToTry.push(`${userId}/${this.FILE_FOLDER}/${fileId}.${ext}`);
        }
        pathsToTry.push(`${this.FILE_FOLDER}/${fileId}.${ext}`);
        pathsToTry.push(`${fileId}.${ext}`);
      }

      const uniquePaths = [...new Set(pathsToTry)];
      console.log('🔄 [Financeiro File] Paths a tentar (fallback):', uniquePaths.slice(0, 10), '...');

      for (const objectPath of uniquePaths) {
        console.log(`📍 [Financeiro File] Tentando path: ${objectPath}`);

        const { data: signedData, error: signedErr } = await supabase.storage
          .from(this.BUCKET_NAME)
          .createSignedUrl(objectPath, 3600);

        if (signedData?.signedUrl && !signedErr) {
          try {
            const testRes = await fetch(signedData.signedUrl, { method: 'HEAD', cache: 'no-cache' });
            console.log(`   SignedUrl SDK HEAD: ${testRes.status}`);
            if (testRes.ok) {
              console.log('✅ [Financeiro File] Encontrado via signedUrl SDK');
              return signedData.signedUrl;
            }
          } catch (headErr) {
            console.log(`   SignedUrl HEAD falhou:`, headErr);
          }
        } else if (signedErr) {
          console.log(`   SignedUrl SDK erro:`, signedErr.message);
        }

        try {
          console.log(`   Tentando download blob: ${objectPath}`);
          const { data: blobData, error: dlErr } = await supabase.storage
            .from(this.BUCKET_NAME)
            .download(objectPath);

          if (blobData && !dlErr) {
            const blobUrl = URL.createObjectURL(blobData);
            console.log('✅ [Financeiro File] Encontrado via blob download');
            return blobUrl;
          }
          if (dlErr) {
            console.log(`   Blob download falhou:`, dlErr.message);
          }
        } catch (blobErr) {
          console.log(`   Blob download exception:`, blobErr);
        }
      }

      console.log('❌ [Financeiro File] Nenhum arquivo encontrado para:', transactionId);
      return null;
    } catch (error) {
      console.error('💥 [Financeiro File] Erro getFileAttachmentUrl:', error);
      return null;
    }
  }

  /**
   * Atualiza a URL do arquivo compartilhado no banco de dados
   */
  // private static async updateFileAttachmentUrl(...) { ... } // Não utilizado

  //parte diferente adicionar só apartir daqui no bolt adicionar as interfaces também file opperation result, filedownloadresult e attachmentserviceinterface



  // --- MÉTODOS E PROPRIEDADES PARA DOCUMENTOS DE MÁQUINAS ---
  private bucketName = 'Documento_Maquina';
  private tableName = 'maquinas_equipamentos';

  /**
   * Valida se o arquivo tem tipo e tamanho adequados (instância, documentos de máquina)
   */
  validateFile(file: File): string | null {
    const maxFileSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/bmp',
      'image/svg+xml',
      'image/avif',
      'application/xml',
      'text/xml',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'text/plain'
    ];

    if (!file || !file.name) {
      return 'Arquivo inválido ou sem nome.';
    }
    if (file.size === 0) {
      return 'Arquivo está vazio.';
    }
    if (file.size > maxFileSize) {
      return 'Arquivo muito grande. Limite de 10MB.';
    }
    if (!allowedTypes.includes(file.type)) {
      return 'Tipo de arquivo não permitido. Suportados: imagens (JPG, PNG, WebP, GIF, BMP, SVG, AVIF), documentos (PDF, XML, DOC, DOCX, XLS, XLSX, CSV, TXT).';
    }
    return null;
  }
  /**
   * Faz upload de arquivo/documento para máquina
   */
  async uploadFile(
    maquinaId: string,
    file: File, 
    uploadType: 'primeiro_envio' | 'segundo_envio'
  ): Promise<FileOperationResult> {
  try {
    if (!file || !file.name) {
      console.error('❌ Invalid file or missing name');
      return { success: false, error: 'Arquivo inválido ou sem nome.' };
    }

    const maxFileSize = 10 * 1024 * 1024;
    if (file.size > maxFileSize) {
      console.error('❌ File too large:', file.size);
      return { success: false, error: 'Arquivo muito grande. Limite de 10MB.' };
    }

    if (file.size === 0) {
      console.error('❌ Empty file');
      return { success: false, error: 'Arquivo está vazio.' };
    }

    const allowedExtensions = ['xml', 'jpg', 'jpeg', 'pdf', 'png', 'webp', 'gif', 'bmp', 'svg', 'avif', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'txt'];
    const getFileExtension = (fileName: string): string | null => {
      const match = fileName.match(/\.([^.]+)$/);
      return match ? match[1].toLowerCase() : null;
    };

    let fileExt = getFileExtension(file.name);
    if (fileExt === 'jpeg') fileExt = 'jpg';

    console.log('📂 File extension:', fileExt);

    if (!fileExt || !allowedExtensions.includes(fileExt)) {
      console.error('❌ Invalid file type:', fileExt);
      return {
        success: false,
        error: `Tipo de arquivo ${fileExt || 'desconhecido'} não permitido. Suportados: imagens (jpg, png, webp, gif, bmp, svg, avif), documentos (pdf, xml, doc, docx, xls, xlsx, csv, txt).`
      };
    }

    // Obter user_id para estrutura de pastas (igual ao bucket notas_fiscais)
    const user = AuthService.getInstance().getCurrentUser();
    if (!user?.user_id) {
      console.error('❌ User not authenticated');
      return { success: false, error: 'Usuário não autenticado.' };
    }

    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const fileName = `${timestamp}_${randomSuffix}.${fileExt}`;
    const filePath = `${user.user_id}/${uploadType}/${fileExt}/${fileName}`;

    console.log('👤 User ID:', user.user_id);
    console.log('📁 File path:', filePath);

    const existingUrl = await this.getFileUrl(maquinaId, uploadType);
    if (existingUrl) {
      console.log('🔄 Found existing file, deleting:', existingUrl);
      const deleteResult = await this.deleteFile(existingUrl, maquinaId, uploadType);
      if (!deleteResult.success) {
        console.warn('⚠️ Failed to delete existing file:', deleteResult.error);
      } else {
        console.log('✅ Old file deleted successfully');
      }
    } else {
      console.log('📤 No existing file found, proceeding with upload');
    }

    const contentType = this.getContentType(fileExt);
    console.log('📋 Content type:', contentType);

    console.log('⬆️ Uploading to storage...');
    const storageClient = getStorageClient();
    const { error: uploadError } = await storageClient.storage
      .from(this.bucketName)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: contentType
      });

    if (uploadError) {
      console.error('❌ Storage upload error:', uploadError);
      return { success: false, error: `Erro no upload: ${uploadError.message}` };
    }

    console.log('✅ File uploaded to storage successfully');

    // armazenar apenas o caminho no storage (ex: primeiro_envio/pdf/12345_abc.pdf)
    const storedValue = filePath;
    const columnName = uploadType === 'primeiro_envio' ? 'url_primeiro_envio' : 'url_segundo_envio';
    console.log('💾 Atualizando coluna do banco com path:', columnName, storedValue);

    const { error: dbError } = await supabase
      .from(this.tableName)
      .update({ [columnName]: storedValue })
      .eq('id_maquina', maquinaId);

    if (dbError) {
      console.error('❌ Database update error:', dbError);
      
      console.log('🔄 Rolling back - deleting uploaded file');
      await supabase.storage.from(this.bucketName).remove([filePath]);
      
      return { success: false, error: `Erro na base de dados: ${dbError.message}` };
    }

    console.log('✅ Database updated successfully');
    console.log('🎉 Upload process completed successfully');

    return { success: true, url: storedValue, fileType: uploadType };

  } catch (error) {
    console.error('💥 Unexpected error in uploadFile:', error);
    return { success: false, error: `Erro inesperado: ${(error as Error).message}` };
  }
}

  /**
   * Faz download de arquivo/documento de máquina
   */
  async downloadFile(url: string): Promise<FileDownloadResult> {
    try {
      if (!url) {
        console.error('❌ No URL provided for download');
        return { data: null, error: 'No URL provided', fileType: null };
      }

      console.log('⬇️ Starting download for URL:', url);

      // tentar extrair path (quando a coluna armazena um publicUrl)
      let filePath = this.extractFilePathFromUrl(url);
      let fileType = this.getFileTypeFromUrl(url);

      if (filePath) {
        try {
          const { data, error } = await supabase.storage
            .from(this.bucketName)
            .download(filePath);

          if (error || !data) {
            console.error('❌ Download error via storage:', error);
            // continuar para tentativas por URL
          } else {
            console.log('✅ Download successful via storage, blob size:', data.size);
            return { data, error: null, fileType };
          }
        } catch (err) {
          console.error('❌ Storage download exception:', err);
        }
      }

      // se for blob URL já criado no cliente
      if (url.startsWith('blob:')) {
        // não podemos obter o blob do browser a partir do blob: sem referência; assumir que a UI já pode usar
        console.warn('⚠️ URL é blob:; será usada diretamente para download via link');
        const resp = await fetch(url);
        const blob = await resp.blob();
        return { data: blob as unknown as Blob, error: null, fileType };
      }

      // se for uma URL HTTP (signed ou pública), buscar e retornar blob
      if (url.startsWith('http')) {
        try {
          const resp = await fetch(url);
          if (!resp.ok) {
            throw new Error(`HTTP ${resp.status}`);
          }
          const blob = await resp.blob();
          console.log('✅ Download via HTTP concluído, tamanho:', blob.size);
          return { data: blob as unknown as Blob, error: null, fileType };
        } catch (err) {
          console.error('❌ Erro no fetch HTTP para download:', err);
          return { data: null, error: (err as Error).message, fileType: null };
        }
      }

      // se chegou aqui, formato desconhecido
      console.error('❌ Could not download file: unsupported URL or path', url);
      return { data: null, error: 'Unsupported URL or unable to download', fileType: null };
    } catch (error) {
      console.error('💥 Unexpected error downloading file:', error);
      return { data: null, error: (error as Error).message, fileType: null };
    }
  }


  /**
   * Limpa a URL do arquivo/documento no banco (máquina)
   */
  async clearFileUrl(maquinaId: string, uploadType: 'primeiro_envio' | 'segundo_envio'): Promise<{ success: boolean; error?: string }> {
  try {
    const field = uploadType === 'primeiro_envio' ? 'url_primeiro_envio' : 'url_segundo_envio';

    const { error } = await supabaseServiceRole
      .from('maquinas_equipamentos')  
      .update({ [field]: null })
      .eq('id_maquina', maquinaId);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

  /**
   * Exclui arquivo/documento de máquina
   */
  async deleteFile(
    url: string,
    maquinaId: string,
    uploadType: 'primeiro_envio' | 'segundo_envio'
  ): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🗑️ [Maquinas] Excluindo arquivo:', uploadType, 'maquinaId:', maquinaId);

    // Buscar o path salvo no banco
    const columnName = uploadType === 'primeiro_envio' ? 'url_primeiro_envio' : 'url_segundo_envio';
    let storedPath = '';

    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select(columnName)
        .eq('id_maquina', maquinaId)
        .maybeSingle();

      if (!error && data) {
        const raw = (data as any)[columnName];
        if (raw) {
          if (raw.startsWith('http')) {
            storedPath = this.extractFilePathFromUrl(raw);
          } else {
            storedPath = raw;
          }
        }
      }
    } catch (err) {
      console.warn('⚠️ Erro ao buscar path do banco:', err);
    }

    console.log('📊 [Maquinas] Path salvo no banco:', storedPath || 'N/A');

    // Obter user_id
    const user = AuthService.getInstance().getCurrentUser();
    const pathsToTry: string[] = [];

    // 1. Path do banco (se existir e for válido)
    if (storedPath) {
      pathsToTry.push(storedPath);
    }

    // 2. Tentar com user_id (formato novo)
    if (user?.user_id && storedPath) {
      // Se o path do banco não tem user_id, tentar adicionar
      if (!storedPath.startsWith(user.user_id)) {
        pathsToTry.push(`${user.user_id}/${storedPath}`);
      }
    }

    // 3. Extrair path da URL fornecida (se diferente)
    if (url) {
      const extractedPath = this.extractFilePathFromUrl(url);
      if (extractedPath && !pathsToTry.includes(extractedPath)) {
        pathsToTry.push(extractedPath);
      }
    }

    console.log('🔍 [Maquinas] Tentando excluir paths:', pathsToTry);

    if (pathsToTry.length === 0) {
      return { success: false, error: 'Nenhum path válido encontrado para exclusão' };
    }

    // Tentar excluir cada path até conseguir
    const storageClient = getStorageClient();
    for (const path of pathsToTry) {
      console.log(`🗑️ [Maquinas] Tentando excluir: ${path}`);

      const { data, error } = await storageClient.storage
        .from(this.bucketName)
        .remove([path]);

      if (!error && data && data.length > 0) {
        console.log('✅ [Maquinas] Exclusão concluída:', path);

        // Limpar o campo no banco
        const clearResult = await this.clearFileUrl(maquinaId, uploadType);
        if (!clearResult.success) {
          console.warn('⚠️ [Maquinas] Falha ao limpar URL no banco:', clearResult.error);
        }

        return { success: true };
      } else {
        console.log(`⚠️ [Maquinas] Falha ao excluir ${path}:`, error?.message || 'Nenhum arquivo removido');
      }
    }

    return { success: false, error: 'Arquivo não encontrado em nenhum dos caminhos tentados' };
  } catch (error) {
    console.error('💥 [Maquinas] Erro ao excluir arquivo:', error);
    return { success: false, error: (error as Error).message };
  }
}

  /**
   * Busca informações resumidas dos anexos de uma máquina
   */
  async getAttachmentInfo(maquinaId: string): Promise<AttachmentInfo | null> {
  try {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('id_maquina, url_primeiro_envio, url_segundo_envio')
      .eq('id_maquina', maquinaId)
      .single();

    if (error) {
      console.error('Error fetching attachment info:', error);
      return null;
    }

    if (!data) return null;

    return {
      id: data.id_maquina,
      url_primeiro_envio: data.url_primeiro_envio,
      url_segundo_envio: data.url_segundo_envio,
      hasPrimeiroEnvio: !!data.url_primeiro_envio,
      hasSegundoEnvio: !!data.url_segundo_envio,
      hasAnyFiles: !!(data.url_primeiro_envio || data.url_segundo_envio),
      fileCount: (data.url_primeiro_envio ? 1 : 0) + (data.url_segundo_envio ? 1 : 0),
      primeiroEnvioType: data.url_primeiro_envio ? this.getFileTypeFromUrl(data.url_primeiro_envio) : null,
      segundoEnvioType: data.url_segundo_envio ? this.getFileTypeFromUrl(data.url_segundo_envio) : null
    };
  } catch (error) {
    console.error('Error getting attachment info:', error);
    return null;
  }
}

  /**
   * Busca informações resumidas dos anexos de múltiplas máquinas
   */
  async getMultipleAttachmentInfo(maquinaIds: string[]): Promise<AttachmentInfo[]> {
  try {
    if (maquinaIds.length === 0) return [];

    const { data, error } = await supabase
      .from(this.tableName)
      .select('id_maquina, url_primeiro_envio, url_segundo_envio')
      .in('id_maquina', maquinaIds);

    if (error) {
      console.error('Error fetching multiple attachment info:', error);
      return [];
    }

    return (data || []).map(item => ({
      id: item.id_maquina,
      url_primeiro_envio: item.url_primeiro_envio,
      url_segundo_envio: item.url_segundo_envio,
      hasPrimeiroEnvio: !!item.url_primeiro_envio,
      hasSegundoEnvio: !!item.url_segundo_envio,
      hasAnyFiles: !!(item.url_primeiro_envio || item.url_segundo_envio),
      fileCount: (item.url_primeiro_envio ? 1 : 0) + (item.url_segundo_envio ? 1 : 0),
      primeiroEnvioType: item.url_primeiro_envio ? this.getFileTypeFromUrl(item.url_primeiro_envio) : null,
      segundoEnvioType: item.url_segundo_envio ? this.getFileTypeFromUrl(item.url_segundo_envio) : null
    }));
  } catch (error) {
    console.error('Error getting multiple attachment info:', error);
    return [];
  }
}

  /**
   * Deleta em lote anexos de máquinas
   */
  async bulkDeleteAttachments(
    maquinaIds: string[], 
    uploadType?: 'primeiro_envio' | 'segundo_envio'
  ): Promise<{ success: number; failed: number; errors: string[] }> {
  const results = { success: 0, failed: 0, errors: [] as string[] };

  for (const maquinaId of maquinaIds) {
    try {
      if (uploadType) {
        const url = await this.getFileUrl(maquinaId, uploadType);
        if (url) {
          const result = await this.deleteFile(url, maquinaId, uploadType);
          if (result.success) {
            results.success++;
          } else {
            results.failed++;
            if (result.error) results.errors.push(`${maquinaId}: ${result.error}`);
          }
        } else {
          results.success++;
        }
      } else {
        const url1 = await this.getFileUrl(maquinaId, 'primeiro_envio');
        const url2 = await this.getFileUrl(maquinaId, 'segundo_envio');
        
        let hasSuccess = false;
        
        if (url1) {
          const result1 = await this.deleteFile(url1, maquinaId, 'primeiro_envio');
          if (result1.success) hasSuccess = true;
          else if (result1.error) results.errors.push(`${maquinaId} (primeiro): ${result1.error}`);
        }
        
        if (url2) {
          const result2 = await this.deleteFile(url2, maquinaId, 'segundo_envio');
          if (result2.success) hasSuccess = true;
          else if (result2.error) results.errors.push(`${maquinaId} (segundo): ${result2.error}`);
        }
        
        if (hasSuccess || (!url1 && !url2)) {
          results.success++;
        } else {
          results.failed++;
        }
      }
    } catch (error) {
      results.failed++;
      results.errors.push(`${maquinaId}: ${(error as Error).message}`);
    }
  }

  return results;
}

  /**
   * Busca a URL do arquivo/documento de máquina
   */
  private async getFileUrl(maquinaId: string, uploadType: 'primeiro_envio' | 'segundo_envio'): Promise<string | null> {
  try {
      const result = await supabase
        .from(this.tableName)
        .select(uploadType === 'primeiro_envio' ? 'url_primeiro_envio' : 'url_segundo_envio')
        .eq('id_maquina', maquinaId)
        .single();

      if (result.error || !result.data) return null;

      const data = result.data as { url_primeiro_envio?: string; url_segundo_envio?: string };
      const stored = uploadType === 'primeiro_envio' ? (data.url_primeiro_envio ?? null) : (data.url_segundo_envio ?? null);
      if (!stored) return null;

      // se for URL completa, tentar usar diretamente (HEAD)
      if (stored.startsWith('http')) {
        try {
          const head = await fetch(stored, { method: 'HEAD', cache: 'no-cache' });
          if (head.ok) return stored;
        } catch (err) {
          // continuar para tentar extrair path
        }
      }

      // se for um path armazenado (ex: primeiro_envio/pdf/123.pdf) ou extraível da URL, normalizar
      let path = '';
      if (!stored.startsWith('http')) {
        path = stored;
      } else {
        path = this.extractFilePathFromUrl(stored);
      }

      if (!path) return null;

      // tentar public URL
      const storageClient = getStorageClient();
      try {
        const { data } = storageClient.storage.from(this.bucketName).getPublicUrl(path);
        if (data?.publicUrl) {
          try {
            const head = await fetch(data.publicUrl, { method: 'HEAD', cache: 'no-cache' });
            if (head.ok) return data.publicUrl;
          } catch (err) {
            // continuar para signed-url
          }
        }
      } catch (err) {
        // ignore
      }

      // tentar signed-url no server
      const server = import.meta.env.VITE_SIGNED_URL_SERVER_URL || import.meta.env.VITE_API_URL || '';
      if (server) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const accessToken = session?.access_token || anonKey;
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (accessToken) {
            headers['Authorization'] = `Bearer ${accessToken}`;
          }
          const resp = await fetch(`${server.replace(/\/$/, '')}/signed-url`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ bucket: this.bucketName, path, expires: 60 })
          });
          if (resp.ok) {
            const payload = await resp.json();
            if (payload?.signedUrl) return payload.signedUrl;
          }
        } catch (err) {
          // continue
        }
      }

      // fallback: download blob e retornar URL.createObjectURL
      try {
        const dlClient = getStorageClient();
        const { data: blobData, error: dlErr } = await dlClient.storage.from(this.bucketName).download(path);
        if (!dlErr && blobData) {
          return URL.createObjectURL(blobData);
        }
      } catch (err) {
        // ignore
      }

      return null;
  } catch (e) {
    console.error('Erro em getFileUrl:', e);
    return null;
  }
}

  /**
   * Extrai o caminho do arquivo a partir da URL pública (máquina)
   */
  private extractFilePathFromUrl(url: string): string {
  if (!url) {
    console.log('❌ Empty URL provided');
    return '';
  }

  console.log('🔍 Input URL:', url);
  console.log('🪣 Bucket name:', `"${this.bucketName}"`);

  const urlWithoutParams = url.split('?')[0];
  console.log('🔍 URL without params:', urlWithoutParams);

  const regex = new RegExp(`https?://[^/]+/storage/v1/object/public/${this.bucketName}/(.+)$`);
  console.log('📝 Regex pattern:', regex.toString());

  const match = urlWithoutParams.match(regex);
  console.log('🎯 Regex match result:', match);

  if (match && match[1]) {
    console.log('✅ Extracted path:', match[1]);
    return match[1];
  }

  const expectedPattern = `/storage/v1/object/public/${this.bucketName}/`;
  console.log('🔍 Expected pattern:', expectedPattern);
  console.log('🔍 URL contains pattern?', urlWithoutParams.includes(expectedPattern));

  if (urlWithoutParams.includes(expectedPattern)) {
    const startIndex = urlWithoutParams.indexOf(expectedPattern) + expectedPattern.length;
    const filePath = urlWithoutParams.substring(startIndex);
    console.log('✅ Manual extraction result:', filePath);
    return filePath;
  }

  console.log('❌ No match found');
  return '';
}

  /**
   * Detecta o tipo do arquivo a partir da URL (máquina)
   */
  private getFileTypeFromUrl(url: string): string {
  if (!url) return 'unknown';

  const pathExtensions = ['/xml/', '/jpg/', '/pdf/', '/png/', '/webp/', '/gif/', '/bmp/', '/svg/', '/avif/', '/doc/', '/docx/', '/xls/', '/xlsx/', '/csv/', '/txt/'];
  for (const pathExt of pathExtensions) {
    if (url.includes(pathExt)) {
      return pathExt.replace(/\//g, '');
    }
  }

  const urlWithoutParams = url.split('?')[0];
  const extension = urlWithoutParams.includes('.') ? urlWithoutParams.split('.').pop() : null;

  if (!extension) return 'unknown';

  const ext = extension.toLowerCase();
  const validExts = ['xml', 'jpg', 'jpeg', 'pdf', 'png', 'webp', 'gif', 'bmp', 'svg', 'avif', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'txt'];
  return validExts.includes(ext) ? (ext === 'jpeg' ? 'jpg' : ext) : 'unknown';
}

  /**
   * Retorna o content-type correto para a extensão
   */
  private getContentType(fileExtension: string): string {
  const contentTypes: Record<string, string> = {
    'xml': 'application/xml',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'pdf': 'application/pdf',
    'png': 'image/png',
    'webp': 'image/webp',
    'gif': 'image/gif',
    'bmp': 'image/bmp',
    'svg': 'image/svg+xml',
    'avif': 'image/avif',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'csv': 'text/csv',
    'txt': 'text/plain'
  };
  return contentTypes[fileExtension.toLowerCase()] || 'application/octet-stream';
}
  /**
   * Obtém a URL de anexo financeiro (imagem) com fallback robusto
   * IMPORTANTE: bucket notas_fiscais é PRIVADO, URLs públicas não funcionam!
   * Ordem: signedUrl SDK -> download blob
   */
  static async getAttachmentUrlFinanceiro(transactionId: string, forceRefresh = false): Promise<string | null> {
    try {
      console.log('🔍 [Financeiro] Buscando URL para transação:', transactionId, forceRefresh ? '(refresh forçado)' : '');

      const groupInfo = await this.getTransactionAttachmentGroup(transactionId);
      const storedPath = groupInfo?.anexo_compartilhado_url;

      console.log('📊 [Financeiro] Path salvo no banco:', storedPath || 'N/A');

      const fileId = await this.getStorageFileId(transactionId);
      const user = AuthService.getInstance().getCurrentUser();
      const userId = user?.user_id || '';
      const fileName = `${fileId}.jpg`;

      console.log('📦 [Financeiro] fileId:', fileId, '| userId:', userId);

      const pathsToTry: string[] = [];

      if (storedPath) {
        const normalizedPath = this.normalizeStoredPath(storedPath);
        pathsToTry.push(normalizedPath);
        console.log('📍 [Financeiro] Path normalizado do banco:', normalizedPath);
      }

      if (userId) {
        pathsToTry.push(`${userId}/${fileName}`);
      }
      pathsToTry.push(fileName);
      pathsToTry.push(`imagens/${fileName}`);
      if (userId) {
        pathsToTry.push(`${userId}/imagens/${fileName}`);
      }

      const uniquePaths = [...new Set(pathsToTry)];
      console.log('🔄 [Financeiro] Paths a tentar:', uniquePaths);

      for (const objectPath of uniquePaths) {
        console.log(`📍 [Financeiro] Tentando path: ${objectPath}`);

        const { data: signedData, error: signedErr } = await supabase.storage
          .from(this.BUCKET_NAME)
          .createSignedUrl(objectPath, 3600);

        if (signedData?.signedUrl && !signedErr) {
          try {
            const testRes = await fetch(signedData.signedUrl, { method: 'HEAD', cache: 'no-cache' });
            console.log(`   SignedUrl SDK HEAD: ${testRes.status}`);
            if (testRes.ok) {
              console.log('✅ [Financeiro] Encontrado via signedUrl SDK');
              return signedData.signedUrl;
            }
          } catch (headErr) {
            console.log(`   SignedUrl HEAD falhou:`, headErr);
          }
        } else if (signedErr) {
          console.log(`   SignedUrl SDK erro:`, signedErr.message);
        }

        try {
          console.log(`   Tentando download blob: ${objectPath}`);
          const { data: blobData, error: dlErr } = await supabase.storage
            .from(this.BUCKET_NAME)
            .download(objectPath);

          if (blobData && !dlErr) {
            const blobUrl = URL.createObjectURL(blobData);
            console.log('✅ [Financeiro] Encontrado via blob download');
            return blobUrl;
          }
          if (dlErr) {
            console.log(`   Blob download falhou:`, dlErr.message);
          }
        } catch (blobErr) {
          console.log(`   Blob download exception:`, blobErr);
        }
      }

      console.log('❌ [Financeiro] Nenhum anexo encontrado para:', transactionId);
      return null;
    } catch (error) {
      console.error('💥 [Financeiro] Erro getAttachmentUrlFinanceiro:', error);
      return null;
    }
  }
}