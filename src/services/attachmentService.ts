import { supabase } from '../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase'; // ✅


// Cliente com service role para operações de storage (contorna RLS)
const supabaseServiceRole = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

interface FileOperationResult {
  success: boolean;
  url?: string;
  error?: string;
  fileType?: string;
}

interface FileDownloadResult {
  data: Blob | null;
  error: string | null;
  fileType: string | null;
}

interface AttachmentInfo {
  id: string;
  url_primeiro_envio: string | null;
  url_segundo_envio: string | null;
  hasPrimeiroEnvio: boolean;
  hasSegundoEnvio: boolean;
  hasAnyFiles: boolean;
  fileCount: number;
  primeiroEnvioType: string | null;
  segundoEnvioType: string | null;
}

export class AttachmentService {
  private static readonly BUCKET_NAME = 'notas_fiscais';
  
  /**
   * Verifica se existe um anexo para uma transação
   */
  static async hasAttachment(transactionId: string): Promise<boolean> {
    try {
      console.log('🔍 Verificando anexo para transação:', transactionId);
      const fileName = `${transactionId}.jpg`;
      
      // Tentar buscar o arquivo específico primeiro
      let { data, error } = await supabaseServiceRole.storage
        .from(this.BUCKET_NAME)
        .list('', {
          limit: 100,
          search: transactionId
        });

      if (error) {
        console.log('⚠️ Erro com service role, tentando cliente normal...');
        const result = await supabase.storage
          .from(this.BUCKET_NAME)
          .list('', {
            limit: 100,
            search: transactionId
          });
        data = result.data;
        error = result.error;
      }

      if (error) {
        console.error('❌ Erro ao verificar anexo:', error);
        // Tentar método alternativo: verificar URL pública
        return await this.checkFileExistsByUrl(transactionId);
      }

      const hasFile = data && data.some(file => file.name === fileName);
      console.log('📁 Arquivo encontrado:', hasFile, 'Nome procurado:', fileName, 'Arquivos no bucket:', data?.map(f => f.name));
      
      return hasFile;
    } catch (error) {
      console.error('💥 Erro ao verificar anexo:', error);
      // Fallback: tentar verificar por URL
      return await this.checkFileExistsByUrl(transactionId);
    }
  }

  /**
   * Verifica se arquivo existe tentando acessar a URL pública
   */
  private static async checkFileExistsByUrl(transactionId: string): Promise<boolean> {
    try {
      console.log('🔗 Verificando arquivo por URL pública...');
      const fileName = `${transactionId}.jpg`;
      
      const { data } = supabaseServiceRole.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(fileName);

      if (!data?.publicUrl) {
        return false;
      }

      // Fazer requisição HEAD para verificar se arquivo existe
      const response = await fetch(data.publicUrl, { 
        method: 'HEAD',
        cache: 'no-cache'
      });
      
      const exists = response.ok;
      console.log('🌐 Verificação por URL:', exists ? '✅ Existe' : '❌ Não existe');
      return exists;
    } catch (error) {
      console.error('💥 Erro na verificação por URL:', error);
      return false;
    }
  }

  /**
   * Faz o download de um anexo
   */
  static async downloadAttachment(transactionId: string): Promise<void> {
    try {
      console.log('⬇️ Fazendo download do anexo:', transactionId);
      const fileName = `${transactionId}.jpg`;
      
      // Tentar primeiro com service role
      let { data, error } = await supabaseServiceRole.storage
        .from(this.BUCKET_NAME)
        .download(fileName);

      // Fallback para cliente normal
      if (error) {
        console.log('⚠️ Tentando download com cliente normal...');
        const result = await supabase.storage
          .from(this.BUCKET_NAME)
          .download(fileName);
        data = result.data;
        error = result.error;
      }

      if (error) {
        console.error('❌ Erro no download:', error);
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
      const fileName = `${transactionId}.jpg`;
      
      const { data } = supabaseServiceRole.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(fileName);

      if (!data?.publicUrl) {
        throw new Error('Não foi possível obter URL pública');
      }

      // Fazer download via fetch
      const response = await fetch(data.publicUrl);
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
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
      console.error('💥 Erro no download via URL:', error);
      throw error;
    }
  }

  /**
   * Faz upload de um novo anexo
   */
  static async uploadAttachment(transactionId: string, file: File): Promise<boolean> {
    try {
      console.log('⬆️ Fazendo upload do anexo:', transactionId);
      console.log('📁 Arquivo original:', file.name, file.size, file.type);
      const fileName = `${transactionId}.jpg`;
      
      // Converter arquivo para JPG se necessário
      const processedFile = await this.processImageFile(file, fileName);
      console.log('📷 Arquivo processado:', processedFile.name, processedFile.size);
      
      // Tentar primeiro com service role para contornar RLS
      let { data, error } = await supabaseServiceRole.storage
        .from(this.BUCKET_NAME)
        .upload(fileName, processedFile, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'image/jpeg'
        });

      // Se falhar com service role, tentar com cliente normal
      if (error) {
        console.log('⚠️ Tentativa com service role falhou, tentando com cliente normal...');
        const result = await supabase.storage
          .from(this.BUCKET_NAME)
          .upload(fileName, processedFile, {
            cacheControl: '3600',
            upsert: true,
            contentType: 'image/jpeg'
          });
        data = result.data;
        error = result.error;
      }

      if (error) {
        console.error('❌ Erro no upload:', error);
        
        // Se for erro de RLS, dar uma mensagem mais clara
        if (error.message.includes('row-level security') || error.message.includes('RLS')) {
          throw new Error('Erro de permissão: Configure as políticas RLS do bucket ou use a chave de serviço');
        }
        
        throw new Error(`Erro ao fazer upload: ${error.message}`);
      }

      console.log('✅ Upload concluído:', data);
      return true;
    } catch (error) {
      console.error('💥 Erro no upload:', error);
      throw error;
    }
  }

  /**
   * Substitui um anexo existente
   */
  static async replaceAttachment(transactionId: string, file: File): Promise<boolean> {
    try {
      console.log('🔄 Substituindo anexo:', transactionId);
      const fileName = `${transactionId}.jpg`;
      
      // Converter arquivo para JPG se necessário
      const processedFile = await this.processImageFile(file, fileName);
      
      // Tentar primeiro com service role
      let { data, error } = await supabaseServiceRole.storage
        .from(this.BUCKET_NAME)
        .update(fileName, processedFile, {
          cacheControl: '3600',
          contentType: 'image/jpeg'
        });

      // Fallback para cliente normal
      if (error) {
        console.log('⚠️ Tentativa com service role falhou, tentando com cliente normal...');
        const result = await supabase.storage
          .from(this.BUCKET_NAME)
          .update(fileName, processedFile, {
            cacheControl: '3600',
            contentType: 'image/jpeg'
          });
        data = result.data;
        error = result.error;
      }

      if (error) {
        console.error('❌ Erro na substituição:', error);
        
        if (error.message.includes('row-level security') || error.message.includes('RLS')) {
          throw new Error('Erro de permissão: Configure as políticas RLS do bucket ou use a chave de serviço');
        }
        
        throw new Error(`Erro ao substituir anexo: ${error.message}`);
      }

      console.log('✅ Substituição concluída:', data);
      return true;
    } catch (error) {
      console.error('💥 Erro ao substituir anexo:', error);
      throw error;
    }
  }

  /**
   * Exclui um anexo
   */
  static async deleteAttachment(transactionId: string): Promise<boolean> {
    try {
      console.log('🗑️ Excluindo anexo:', transactionId);
      const fileName = `${transactionId}.jpg`;
      
      // Tentar primeiro com service role
      let { data, error } = await supabaseServiceRole.storage
        .from(this.BUCKET_NAME)
        .remove([fileName]);

      // Fallback para cliente normal
      if (error) {
        console.log('⚠️ Tentativa com service role falhou, tentando com cliente normal...');
        const result = await supabase.storage
          .from(this.BUCKET_NAME)
          .remove([fileName]);
        data = result.data;
        error = result.error;
      }

      if (error) {
        console.error('❌ Erro na exclusão:', error);
        
        if (error.message.includes('row-level security') || error.message.includes('RLS')) {
          throw new Error('Erro de permissão: Configure as políticas RLS do bucket ou use a chave de serviço');
        }
        
        throw new Error(`Erro ao excluir anexo: ${error.message}`);
      }

      console.log('✅ Exclusão concluída:', data);
      return true;
    } catch (error) {
      console.error('💥 Erro ao excluir anexo:', error);
      throw error;
    }
  }

  /**
   * Obtém a URL pública de um anexo
   */
  static async getAttachmentUrl(transactionId: string): Promise<string | null> {
    try {
      console.log('🔗 Obtendo URL do anexo:', transactionId);
      const fileName = `${transactionId}.jpg`;
      
      // Tentar obter URL pública com service role primeiro
      let { data } = supabaseServiceRole.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(fileName);

      // Se não conseguir com service role, tentar com cliente normal
      if (!data?.publicUrl) {
        console.log('⚠️ Tentando URL pública com cliente normal...');
        const result = supabase.storage
          .from(this.BUCKET_NAME)
          .getPublicUrl(fileName);
        data = result.data;
      }

      if (!data?.publicUrl) {
        console.log('❌ Não foi possível obter URL pública');
        return null;
      }
      
      // Adicionar timestamp para evitar cache do browser
      const urlWithTimestamp = `${data.publicUrl}?t=${Date.now()}&cache=no-cache`;
      console.log('📎 URL gerada:', urlWithTimestamp);
      return urlWithTimestamp;
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
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .list('', { limit: 1 });

      const { data: serviceData, error: serviceError } = await supabaseServiceRole.storage
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
      let { data, error } = await supabaseServiceRole.storage
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
   * Valida se o arquivo é uma imagem válida
   */
  static validateImageFile(file: File): boolean {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!validTypes.includes(file.type)) {
      throw new Error('Tipo de arquivo não suportado. Use JPG, PNG, GIF ou WebP.');
    }

    if (file.size > maxSize) {
      throw new Error('Arquivo muito grande. Tamanho máximo: 10MB.');
    }

    return true;
  }

  //parte diferente adicionar só apartir daqui no bolt adicionar as interfaces também file opperation result, filedownloadresult e attachmentserviceinterface


  private bucketName = 'Documento_Maquina';
  private tableName = 'maquinas_equipamentos';
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

    const allowedExtensions = ['xml', 'jpg', 'jpeg', 'pdf'];
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
        error: `Tipo de arquivo ${fileExt || 'desconhecido'} não permitido. Apenas xml, jpg e pdf são suportados.` 
      };
    }

    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const fileName = `${timestamp}_${randomSuffix}.${fileExt}`;
    const filePath = `${uploadType}/${fileExt}/${fileName}`;

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
    const { error: uploadError } =  await supabaseServiceRole.storage
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

    const { data: publicUrlData } = supabase.storage
      .from(this.bucketName)
      .getPublicUrl(filePath);

    const publicUrl = publicUrlData.publicUrl;
    console.log('🔗 Public URL generated:', publicUrl);

    const columnName = uploadType === 'primeiro_envio' ? 'url_primeiro_envio' : 'url_segundo_envio';
    console.log('💾 Updating database column:', columnName);

    const { error: dbError } = await supabase
      .from(this.tableName)
      .update({ [columnName]: publicUrl })
      .eq('id_maquina', maquinaId);

    if (dbError) {
      console.error('❌ Database update error:', dbError);
      
      console.log('🔄 Rolling back - deleting uploaded file');
      await supabase.storage.from(this.bucketName).remove([filePath]);
      
      return { success: false, error: `Erro na base de dados: ${dbError.message}` };
    }

    console.log('✅ Database updated successfully');
    console.log('🎉 Upload process completed successfully');

    return { success: true, url: publicUrl, fileType: uploadType };

  } catch (error) {
    console.error('💥 Unexpected error in uploadFile:', error);
    return { success: false, error: `Erro inesperado: ${(error as Error).message}` };
  }
}

 async downloadFile(url: string): Promise<FileDownloadResult> {
    try {
      if (!url) {
        return { data: null, error: 'No URL provided', fileType: null };
      }

      const filePath = this.extractFilePathFromUrl(url);
      
      const fileType = this.getFileTypeFromUrl(url);
      
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .download(filePath);

      if (error) {
        return { data: null, error: error.message, fileType: null };
      }

      return { data, error: null, fileType };
    } catch (error) {
      console.error('Error downloading file:', error);
      return { data: null, error: (error as Error).message, fileType: null };
    }
  }


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

async deleteFile(
  url: string,
  maquinaId: string,
  uploadType: 'primeiro_envio' | 'segundo_envio'
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!url) {
      return { success: false, error: 'No URL provided' };
    }

    const filePath = this.extractFilePathFromUrl(url);
    console.log('⚠️ File path to delete:', filePath);

    if (!filePath) {
      return { success: false, error: 'File path is empty or invalid for deletion' };
    }

    const { error: deleteError } = await supabaseServiceRole.storage
      .from(this.bucketName)
      .remove([filePath]);

    if (deleteError) {
      return { success: false, error: deleteError.message };
    }

    const clearResult = await this.clearFileUrl(maquinaId, uploadType);
    if (!clearResult.success) {
      return { success: false, error: clearResult.error };
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting file:', error);
    return { success: false, error: (error as Error).message };
  }
}

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

private async getFileUrl(maquinaId: string, uploadType: 'primeiro_envio' | 'segundo_envio'): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from(this.tableName)
      .select(uploadType === 'primeiro_envio' ? 'url_primeiro_envio' : 'url_segundo_envio')
      .eq('id_maquina', maquinaId)
      .single();

    if (error) return null;
    return uploadType === 'primeiro_envio' ? data.url_primeiro_envio : data.url_segundo_envio;
  } catch {
    return null;
  }
}

private extractFilePathFromUrl(url: string): string {
  console.log('🔍 Input URL:', url);
  console.log('🪣 Bucket name:', `"${this.bucketName}"`);
  console.log('🪣 Bucket name length:', this.bucketName.length);
  console.log('🪣 Bucket name chars:', [...this.bucketName]);
  
const regex = new RegExp(`https?://[^/]+/storage/v1/object/public/${this.bucketName}/(.+)$`);
  console.log('📝 Regex pattern:', regex.toString());
  
  const match = url.match(regex);
  console.log('🎯 Regex match result:', match);
  
  if (match && match[1]) {
    console.log('✅ Extracted path:', match[1]);
    return match[1];
  }
  
  const expectedPattern = `/storage/v1/object/${this.bucketName}/`;
  console.log('🔍 Expected pattern:', expectedPattern);
  console.log('🔍 URL contains pattern?', url.includes(expectedPattern));
  
  if (url.includes(expectedPattern)) {
    const filePath = url.substring(url.indexOf(expectedPattern) + expectedPattern.length);
    console.log('✅ Manual extraction result:', filePath);
    return filePath;
  }
  
  console.log('❌ No match found');
  return '';
}

private getFileTypeFromUrl(url: string): string {
  if (!url) return 'unknown'; 
  if (url.includes('/xml/')) return 'xml';
  if (url.includes('/jpg/')) return 'jpg';
  if (url.includes('/pdf/')) return 'pdf';

  const extension = url.includes('.') ? url.split('.').pop()?.toLowerCase() : '';
  return ['xml', 'jpg', 'jpeg', 'pdf'].includes(extension || '') ? 
         (extension === 'jpeg' ? 'jpg' : extension || 'unknown') : 'unknown';
}

private getContentType(fileExtension: string): string {
  const contentTypes: Record<string, string> = {
    'xml': 'application/xml',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'pdf': 'application/pdf'
  };
  return contentTypes[fileExtension.toLowerCase()] || 'application/octet-stream';
}
}