import { supabase } from '../lib/supabase';
import { createClient } from '@supabase/supabase-js';

const supabaseServiceRole = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

export class ActivityAttachmentService {
  private static readonly BUCKET_NAME = 'atividades_agricolas';
  private static readonly IMAGE_FOLDER = 'imagens';
  private static readonly FILE_FOLDER = 'arquivos';

  private static async getActivityAttachmentInfo(activityId: string): Promise<{
    anexo_url: string | null;
    anexo_arquivo_url: string | null;
  } | null> {
    try {
      const { data, error } = await supabase
        .from('atividades_agricolas')
        .select('anexo_url, anexo_arquivo_url')
        .eq('id_atividade', activityId)
        .single();

      if (error) {
        console.error('❌ Erro ao buscar informações de anexo:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('💥 Erro ao buscar informações de anexo:', error);
      return null;
    }
  }

  private static async updateImageUrl(activityId: string, url: string | null): Promise<boolean> {
    try {
      const cleanUrl = url ? url.split('?')[0] : null;

      const { error } = await supabase
        .from('atividades_agricolas')
        .update({ anexo_url: cleanUrl })
        .eq('id_atividade', activityId);

      if (error) {
        console.error('❌ Erro ao atualizar URL da imagem:', error);
        return false;
      }

      console.log('✅ URL da imagem atualizada no banco:', cleanUrl);
      return true;
    } catch (error) {
      console.error('💥 Erro ao atualizar imagem:', error);
      return false;
    }
  }

  private static async updateFileUrl(activityId: string, url: string | null): Promise<boolean> {
    try {
      const cleanUrl = url ? url.split('?')[0] : null;

      const { error } = await supabase
        .from('atividades_agricolas')
        .update({ anexo_arquivo_url: cleanUrl })
        .eq('id_atividade', activityId);

      if (error) {
        console.error('❌ Erro ao atualizar URL do arquivo:', error);
        return false;
      }

      console.log('✅ URL do arquivo atualizada no banco:', cleanUrl);
      return true;
    } catch (error) {
      console.error('💥 Erro ao atualizar arquivo:', error);
      return false;
    }
  }

  static async hasAttachment(activityId: string): Promise<boolean> {
    try {
      console.log('🔍 Verificando anexo de imagem para atividade:', activityId);

      const info = await this.getActivityAttachmentInfo(activityId);
      if (info?.anexo_url) {
        console.log('✅ Anexo de imagem encontrado no banco de dados');
        return true;
      }

      const fileName = `${activityId}.jpg`;

      let { data, error } = await supabaseServiceRole.storage
        .from(this.BUCKET_NAME)
        .list(this.IMAGE_FOLDER, {
          limit: 1000,
          search: activityId
        });

      if (error) {
        console.log('⚠️ Erro com service role, tentando cliente normal...');
        const result = await supabase.storage
          .from(this.BUCKET_NAME)
          .list(this.IMAGE_FOLDER, {
            limit: 1000,
            search: activityId
          });
        data = result.data;
        error = result.error;
      }

      if (error) {
        console.error('❌ Erro ao listar arquivos:', error);
        return await this.checkFileExistsByUrl(activityId, false);
      }

      const hasFile = data && data.some(file => file.name === fileName);
      console.log('📁 Resultado da busca:', {
        encontrado: hasFile,
        nomeProcurado: fileName,
        pasta: this.IMAGE_FOLDER
      });

      return hasFile || await this.checkFileExistsByUrl(activityId, false);
    } catch (error) {
      console.error('💥 Erro ao verificar anexo:', error);
      return false;
    }
  }

  static async hasFileAttachment(activityId: string): Promise<boolean> {
    try {
      console.log('🔍 Verificando arquivo para atividade:', activityId);

      const info = await this.getActivityAttachmentInfo(activityId);
      if (info?.anexo_arquivo_url) {
        console.log('✅ Arquivo encontrado no banco de dados');
        return true;
      }

      let { data, error } = await supabaseServiceRole.storage
        .from(this.BUCKET_NAME)
        .list(this.FILE_FOLDER, {
          limit: 1000,
          search: activityId
        });

      if (error) {
        console.log('⚠️ Erro com service role, tentando cliente normal...');
        const result = await supabase.storage
          .from(this.BUCKET_NAME)
          .list(this.FILE_FOLDER, {
            limit: 1000,
            search: activityId
          });
        data = result.data;
        error = result.error;
      }

      if (error) {
        console.error('❌ Erro ao listar arquivos:', error);
        return await this.checkFileExistsByUrl(activityId, true);
      }

      const hasFile = data && data.some(file =>
        file.name === `${activityId}.pdf` || file.name === `${activityId}.xml`
      );

      return hasFile || await this.checkFileExistsByUrl(activityId, true);
    } catch (error) {
      console.error('💥 Erro ao verificar arquivo:', error);
      return false;
    }
  }

  private static async checkFileExistsByUrl(activityId: string, isFile: boolean = false): Promise<boolean> {
    try {
      const extensions = isFile ? ['pdf', 'xml'] : ['jpg'];

      for (const ext of extensions) {
        const folder = isFile ? this.FILE_FOLDER : this.IMAGE_FOLDER;
        const fileName = `${folder}/${activityId}.${ext}`;

        const { data } = supabaseServiceRole.storage
          .from(this.BUCKET_NAME)
          .getPublicUrl(fileName);

        if (!data?.publicUrl) continue;

        const response = await fetch(data.publicUrl, {
          method: 'HEAD',
          cache: 'no-cache'
        });

        if (response.ok) {
          console.log(`✅ ${isFile ? 'Arquivo' : 'Imagem'} encontrado: ${fileName}`);
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('💥 Erro na verificação por URL:', error);
      return false;
    }
  }

  static async getAttachmentUrl(activityId: string, forceRefresh = false): Promise<string | null> {
    try {
      console.log('🔗 Obtendo URL da imagem:', activityId, forceRefresh ? '(refresh forçado)' : '');

      const info = await this.getActivityAttachmentInfo(activityId);
      if (info?.anexo_url) {
        console.log('✅ URL encontrada no banco de dados:', info.anexo_url);
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(7);
        return `${info.anexo_url}?v=${timestamp}&r=${random}`;
      }

      console.log('⚠️ URL não encontrada no banco, tentando gerar do storage...');
      const fileName = `${this.IMAGE_FOLDER}/${activityId}.jpg`;

      let { data } = supabaseServiceRole.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(fileName);

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

      const cleanUrl = data.publicUrl.split('?')[0];
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(7);
      const urlWithTimestamp = `${cleanUrl}?v=${timestamp}&r=${random}`;
      console.log('📎 URL gerada do storage:', urlWithTimestamp);
      return urlWithTimestamp;
    } catch (error) {
      console.error('💥 Erro ao obter URL da imagem:', error);
      return null;
    }
  }

  static async getFileAttachmentUrl(activityId: string, forceRefresh = false): Promise<string | null> {
    try {
      console.log('🔗 Obtendo URL do arquivo:', activityId, forceRefresh ? '(refresh forçado)' : '');

      const info = await this.getActivityAttachmentInfo(activityId);
      if (info?.anexo_arquivo_url) {
        console.log('✅ URL encontrada no banco de dados:', info.anexo_arquivo_url);
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(7);
        return `${info.anexo_arquivo_url}?v=${timestamp}&r=${random}`;
      }

      console.log('⚠️ URL não encontrada no banco, tentando gerar do storage...');
      const extensions = ['pdf', 'xml'];

      for (const ext of extensions) {
        const fileName = `${this.FILE_FOLDER}/${activityId}.${ext}`;

        let { data } = supabaseServiceRole.storage
          .from(this.BUCKET_NAME)
          .getPublicUrl(fileName);

        if (!data?.publicUrl) {
          console.log('⚠️ Tentando URL pública com cliente normal...');
          const result = supabase.storage
            .from(this.BUCKET_NAME)
            .getPublicUrl(fileName);
          data = result.data;
        }

        if (data?.publicUrl) {
          const response = await fetch(data.publicUrl, { method: 'HEAD', cache: 'no-cache' });
          if (response.ok) {
            const cleanUrl = data.publicUrl.split('?')[0];
            const timestamp = Date.now();
            const random = Math.random().toString(36).substring(7);
            const urlWithTimestamp = `${cleanUrl}?v=${timestamp}&r=${random}`;
            console.log('📎 URL gerada do storage:', urlWithTimestamp);
            return urlWithTimestamp;
          }
        }
      }

      console.log('❌ Não foi possível obter URL pública do arquivo');
      return null;
    } catch (error) {
      console.error('💥 Erro ao obter URL do arquivo:', error);
      return null;
    }
  }

  static async uploadAttachment(activityId: string, file: File): Promise<boolean> {
    try {
      console.log('⬆️ Fazendo upload da imagem:', activityId);
      console.log('📁 Arquivo:', file.name, 'Tamanho:', file.size, 'bytes');

      const fileName = `${this.IMAGE_FOLDER}/${activityId}.jpg`;
      const processedFile = await this.processImageFile(file, `${activityId}.jpg`);
      console.log('🖼️ Imagem processada:', processedFile.size, 'bytes');

      let { data, error } = await supabaseServiceRole.storage
        .from(this.BUCKET_NAME)
        .upload(fileName, processedFile, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'image/jpeg'
        });

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
        console.error('❌ Erro no upload para storage:', error);
        throw new Error(`Erro ao fazer upload: ${error.message}`);
      }

      console.log('✅ Upload para storage concluído:', data);

      const { data: urlData } = supabaseServiceRole.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(fileName);

      if (!urlData?.publicUrl) {
        console.error('❌ Erro ao gerar URL pública');
        throw new Error('Não foi possível gerar URL pública do arquivo');
      }

      const cleanUrl = urlData.publicUrl.split('?')[0];
      console.log('🔗 URL pública gerada:', cleanUrl);

      const updateSuccess = await this.updateImageUrl(activityId, cleanUrl);
      if (!updateSuccess) {
        console.warn('⚠️ Upload concluído mas falha ao atualizar banco de dados');
        throw new Error('Arquivo enviado mas erro ao atualizar banco de dados');
      }

      console.log('🎉 Upload completo: storage + banco de dados');
      return true;
    } catch (error) {
      console.error('💥 Erro no upload:', error);
      throw error;
    }
  }

  static async replaceAttachment(activityId: string, file: File): Promise<boolean> {
    try {
      console.log('🔄 Substituindo imagem:', activityId);
      console.log('📁 Arquivo:', file.name, 'Tamanho:', file.size, 'bytes');

      const fileName = `${this.IMAGE_FOLDER}/${activityId}.jpg`;
      const processedFile = await this.processImageFile(file, `${activityId}.jpg`);
      console.log('🖼️ Imagem processada:', processedFile.size, 'bytes');

      let { data, error } = await supabaseServiceRole.storage
        .from(this.BUCKET_NAME)
        .update(fileName, processedFile, {
          cacheControl: '3600',
          contentType: 'image/jpeg'
        });

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
        console.error('❌ Erro na substituição do storage:', error);
        throw new Error(`Erro ao substituir imagem: ${error.message}`);
      }

      console.log('✅ Substituição no storage concluída:', data);

      const { data: urlData } = supabaseServiceRole.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(fileName);

      if (!urlData?.publicUrl) {
        console.error('❌ Erro ao gerar URL pública');
        throw new Error('Não foi possível gerar URL pública do arquivo');
      }

      const cleanUrl = urlData.publicUrl.split('?')[0];
      console.log('🔗 URL pública gerada:', cleanUrl);

      const updateSuccess = await this.updateImageUrl(activityId, cleanUrl);
      if (!updateSuccess) {
        console.warn('⚠️ Substituição concluída mas falha ao atualizar banco de dados');
        throw new Error('Arquivo substituído mas erro ao atualizar banco de dados');
      }

      console.log('🎉 Substituição completa: storage + banco de dados');
      return true;
    } catch (error) {
      console.error('💥 Erro ao substituir imagem:', error);
      throw error;
    }
  }

  static async deleteAttachment(activityId: string): Promise<boolean> {
    try {
      console.log('🗑️ Excluindo imagem:', activityId);

      const fileName = `${this.IMAGE_FOLDER}/${activityId}.jpg`;

      let { data, error } = await supabaseServiceRole.storage
        .from(this.BUCKET_NAME)
        .remove([fileName]);

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
        throw new Error(`Erro ao excluir imagem: ${error.message}`);
      }

      console.log('✅ Exclusão concluída:', data);

      await this.updateImageUrl(activityId, null);

      return true;
    } catch (error) {
      console.error('💥 Erro ao excluir imagem:', error);
      throw error;
    }
  }

  static async uploadFileAttachment(activityId: string, file: File): Promise<boolean> {
    try {
      console.log('⬆️ Fazendo upload do arquivo:', activityId);
      console.log('📁 Arquivo:', file.name, 'Tipo:', file.type, 'Tamanho:', file.size, 'bytes');

      this.validateFile(file);

      const ext = this.getFileExtension(file);
      const fileName = `${this.FILE_FOLDER}/${activityId}.${ext}`;
      console.log('📂 Caminho no storage:', fileName);

      let { data, error } = await supabaseServiceRole.storage
        .from(this.BUCKET_NAME)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type
        });

      if (error) {
        console.log('⚠️ Tentativa com service role falhou, tentando com cliente normal...');
        const result = await supabase.storage
          .from(this.BUCKET_NAME)
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: true,
            contentType: file.type
          });
        data = result.data;
        error = result.error;
      }

      if (error) {
        console.error('❌ Erro no upload para storage:', error);
        throw new Error(`Erro ao fazer upload: ${error.message}`);
      }

      console.log('✅ Upload para storage concluído:', data);

      const { data: urlData } = supabaseServiceRole.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(fileName);

      if (!urlData?.publicUrl) {
        console.error('❌ Erro ao gerar URL pública');
        throw new Error('Não foi possível gerar URL pública do arquivo');
      }

      const cleanUrl = urlData.publicUrl.split('?')[0];
      console.log('🔗 URL pública gerada:', cleanUrl);

      const updateSuccess = await this.updateFileUrl(activityId, cleanUrl);
      if (!updateSuccess) {
        console.warn('⚠️ Upload concluído mas falha ao atualizar banco de dados');
        throw new Error('Arquivo enviado mas erro ao atualizar banco de dados');
      }

      console.log('🎉 Upload completo: storage + banco de dados');
      return true;
    } catch (error) {
      console.error('💥 Erro no upload de arquivo:', error);
      throw error;
    }
  }

  static async replaceFileAttachment(activityId: string, file: File): Promise<boolean> {
    try {
      console.log('🔄 Substituindo arquivo:', activityId);
      console.log('📁 Arquivo:', file.name, 'Tipo:', file.type, 'Tamanho:', file.size, 'bytes');

      this.validateFile(file);

      const ext = this.getFileExtension(file);
      const fileName = `${this.FILE_FOLDER}/${activityId}.${ext}`;
      console.log('📂 Caminho no storage:', fileName);

      let { data, error } = await supabaseServiceRole.storage
        .from(this.BUCKET_NAME)
        .update(fileName, file, {
          cacheControl: '3600',
          contentType: file.type
        });

      if (error) {
        console.log('⚠️ Tentativa com service role falhou, tentando com cliente normal...');
        const result = await supabase.storage
          .from(this.BUCKET_NAME)
          .update(fileName, file, {
            cacheControl: '3600',
            contentType: file.type
          });
        data = result.data;
        error = result.error;
      }

      if (error) {
        console.error('❌ Erro na substituição do storage:', error);
        throw new Error(`Erro ao substituir arquivo: ${error.message}`);
      }

      console.log('✅ Substituição no storage concluída:', data);

      const { data: urlData } = supabaseServiceRole.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(fileName);

      if (!urlData?.publicUrl) {
        console.error('❌ Erro ao gerar URL pública');
        throw new Error('Não foi possível gerar URL pública do arquivo');
      }

      const cleanUrl = urlData.publicUrl.split('?')[0];
      console.log('🔗 URL pública gerada:', cleanUrl);

      const updateSuccess = await this.updateFileUrl(activityId, cleanUrl);
      if (!updateSuccess) {
        console.warn('⚠️ Substituição concluída mas falha ao atualizar banco de dados');
        throw new Error('Arquivo substituído mas erro ao atualizar banco de dados');
      }

      console.log('🎉 Substituição completa: storage + banco de dados');
      return true;
    } catch (error) {
      console.error('💥 Erro ao substituir arquivo:', error);
      throw error;
    }
  }

  static async deleteFileAttachment(activityId: string): Promise<boolean> {
    try {
      console.log('🗑️ Excluindo arquivo:', activityId);

      const filesToDelete = [
        `${this.FILE_FOLDER}/${activityId}.pdf`,
        `${this.FILE_FOLDER}/${activityId}.xml`
      ];

      let { data, error } = await supabaseServiceRole.storage
        .from(this.BUCKET_NAME)
        .remove(filesToDelete);

      if (error) {
        console.log('⚠️ Tentativa com service role falhou, tentando com cliente normal...');
        const result = await supabase.storage
          .from(this.BUCKET_NAME)
          .remove(filesToDelete);
        data = result.data;
        error = result.error;
      }

      if (error) {
        console.error('❌ Erro na exclusão:', error);
        throw new Error(`Erro ao excluir arquivo: ${error.message}`);
      }

      console.log('✅ Exclusão concluída:', data);

      await this.updateFileUrl(activityId, null);

      return true;
    } catch (error) {
      console.error('💥 Erro ao excluir arquivo:', error);
      throw error;
    }
  }

  static async downloadAttachment(activityId: string): Promise<void> {
    try {
      console.log('⬇️ Fazendo download da imagem:', activityId);

      const fileName = `${this.IMAGE_FOLDER}/${activityId}.jpg`;

      let { data, error } = await supabaseServiceRole.storage
        .from(this.BUCKET_NAME)
        .download(fileName);

      if (error) {
        console.log('⚠️ Tentando download com cliente normal...');
        const result = await supabase.storage
          .from(this.BUCKET_NAME)
          .download(fileName);
        data = result.data;
        error = result.error;
      }

      if (error || !data) {
        console.error('❌ Erro no download:', error);
        throw new Error('Erro ao fazer download da imagem');
      }

      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `atividade_${activityId}.jpg`;
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

  static async downloadFileAttachment(activityId: string): Promise<void> {
    try {
      console.log('⬇️ Fazendo download do arquivo:', activityId);

      const extensions = ['pdf', 'xml'];
      let downloaded = false;

      for (const ext of extensions) {
        const fileName = `${this.FILE_FOLDER}/${activityId}.${ext}`;

        let { data, error } = await supabaseServiceRole.storage
          .from(this.BUCKET_NAME)
          .download(fileName);

        if (error) {
          console.log(`⚠️ Tentando download de ${ext} com cliente normal...`);
          const result = await supabase.storage
            .from(this.BUCKET_NAME)
            .download(fileName);
          data = result.data;
          error = result.error;
        }

        if (!error && data) {
          const url = URL.createObjectURL(data);
          const link = document.createElement('a');
          link.href = url;
          link.download = `atividade_${activityId}.${ext}`;
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

  private static async processImageFile(file: File, fileName: string): Promise<File> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
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
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob((blob) => {
            if (blob) {
              const processedFile = new File([blob], fileName, {
                type: 'image/jpeg',
                lastModified: Date.now()
              });
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

  static validateImageFile(file: File): boolean {
    const validTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/bmp',
      'image/svg+xml',
      'image/avif',
      'image/heic',
      'image/heif'
    ];
    const maxSize = 10 * 1024 * 1024;

    if (!validTypes.includes(file.type)) {
      throw new Error('Tipo de arquivo não suportado. Use JPG, PNG, GIF, WebP, BMP, SVG, AVIF ou HEIC.');
    }

    if (file.size > maxSize) {
      throw new Error('Arquivo muito grande. Tamanho máximo: 10MB.');
    }

    return true;
  }

  static validateFile(file: File): boolean {
    const validTypes = [
      'application/pdf',
      'application/xml',
      'text/xml',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'text/plain'
    ];
    const maxSize = 10 * 1024 * 1024;

    if (!validTypes.includes(file.type)) {
      throw new Error('Tipo de arquivo não suportado. Use PDF, XML, DOC, DOCX, XLS, XLSX, CSV ou TXT.');
    }

    if (file.size > maxSize) {
      throw new Error('Arquivo muito grande. Tamanho máximo: 10MB.');
    }

    return true;
  }

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
}
