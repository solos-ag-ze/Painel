import { supabase } from '../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { AuthService } from './authService';

// Cliente com service role para operações de storage (contorna RLS)
// Em produção, usa anon key (requer políticas RLS corretas no Storage)
const url = import.meta.env.VITE_SUPABASE_URL;
const serviceRole = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const storageKey = serviceRole || anonKey;

if (!url || !storageKey) {
  throw new Error('Supabase configuration missing for activityAttachmentService');
}

const supabaseServiceRole = createClient(url, storageKey);

/**
 * Service de anexos agora trabalha somente com Supabase Storage.
 * Não armazenamos mais URLs no banco. Os arquivos usam o mesmo id da atividade
 * como nome do arquivo (ex: <atividade_id>.jpg, <atividade_id>.pdf).
 */
export class ActivityAttachmentService {
  private static readonly BUCKET_NAME = 'atividades_agricolas';
  private static readonly IMAGE_FOLDER = 'imagens';
  private static readonly FILE_FOLDER = 'arquivos';

  static async hasAttachment(activityId: string): Promise<boolean> {
    try {
      console.log('🔍 Verificando anexo de imagem para atividade:', activityId);

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
      console.log('📁 Resultado da busca:', { encontrado: hasFile, nomeProcurado: fileName, pasta: this.IMAGE_FOLDER });

      return hasFile || await this.checkFileExistsByUrl(activityId, false);
    } catch (error) {
      console.error('💥 Erro ao verificar anexo:', error);
      return false;
    }
  }

  static async hasFileAttachment(activityId: string): Promise<boolean> {
    try {
      console.log('🔍 Verificando arquivo para atividade:', activityId);

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

      const extensions = ['pdf','xml','xls','xlsx','doc','docx','csv','txt'];
      const hasFile = data && data.some(file =>
        extensions.some(ext => file.name === `${activityId}.${ext}`)
      );

      return hasFile || await this.checkFileExistsByUrl(activityId, true);
    } catch (error) {
      console.error('💥 Erro ao verificar arquivo:', error);
      return false;
    }
  }

  private static async checkFileExistsByUrl(activityId: string, isFile: boolean = false): Promise<boolean> {
    try {
  const extensions = isFile ? ['pdf','xml','xls','xlsx','doc','docx','csv','txt'] : ['jpg'];

      for (const ext of extensions) {
        const folder = isFile ? this.FILE_FOLDER : this.IMAGE_FOLDER;
        const fileName = `${folder}/${activityId}.${ext}`;

        const { data } = supabaseServiceRole.storage
          .from(this.BUCKET_NAME)
          .getPublicUrl(fileName);

        if (!data?.publicUrl) continue;

        const response = await fetch(data.publicUrl, { method: 'HEAD', cache: 'no-cache' });

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

  static async getAttachmentUrl(activityId: string, forceRefresh = false): Promise<{ displayUrl: string; storageUrl: string | null } | null> {
    try {
      console.log('🔗 Obtendo URL da imagem:', activityId, forceRefresh ? '(refresh forçado)' : '');

      const fileName = `${this.IMAGE_FOLDER}/${activityId}.jpg`;

      let { data } = supabaseServiceRole.storage.from(this.BUCKET_NAME).getPublicUrl(fileName);

      if (!data?.publicUrl) {
        console.log('⚠️ Tentando URL pública com cliente normal...');
        const result = supabase.storage.from(this.BUCKET_NAME).getPublicUrl(fileName);
        data = result.data;
      }

      // Se houver URL pública, confirma com HEAD e retorna
      if (data?.publicUrl) {
        const cleanUrl = data.publicUrl.split('?')[0];
        try {
          const headResp = await fetch(cleanUrl, { method: 'HEAD', cache: 'no-cache' });
          if (!headResp.ok) {
            console.log('⚠️ HEAD retornou não-ok para imagem:', headResp.status, cleanUrl);
            // cairá para tentativa de signed URL abaixo
          } else {
            const timestamp = Date.now();
            const random = Math.random().toString(36).substring(7);
            const urlWithTimestamp = `${cleanUrl}?v=${timestamp}&r=${random}`;
            console.log('📎 URL gerada do storage (verificada):', urlWithTimestamp);
            return { displayUrl: urlWithTimestamp, storageUrl: cleanUrl };
          }
        } catch (err) {
          console.log('⚠️ Erro ao checar existência da imagem via HEAD:', err);
          // tentar signed URL abaixo
        }
      }

      // Se não há public URL ou HEAD falhou, pedir signed URL ao backend
      try {
        const server = import.meta.env.VITE_SIGNED_URL_SERVER_URL || import.meta.env.VITE_API_URL || '';
        if (server) {
          const resp = await fetch(`${server.replace(/\/$/, '')}/signed-url`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bucket: this.BUCKET_NAME, path: fileName, expires: 60 })
          });
          if (resp.ok) {
            const payload = await resp.json();
            if (payload?.signedUrl) {
              console.log('🔐 Obtido signedUrl do servidor para imagem');
              return { displayUrl: payload.signedUrl, storageUrl: payload.signedUrl };
            }
          } else {
            console.log('⚠️ Signed-url server retornou erro', resp.status);
          }
        } else {
          console.log('⚠️ VITE_SIGNED_URL_SERVER_URL não configurado, não foi possível solicitar signed URL');
        }
      } catch (err) {
        console.error('💥 Erro ao solicitar signed URL ao servidor:', err);
      }

      console.log('❌ Não foi possível obter URL pública nem signed URL para a imagem');
      // Fallback: tentar baixar o blob diretamente com o cliente (se a policy permitir)
      try {
        const { data: blobData, error: dlErr } = await supabase.storage
          .from(this.BUCKET_NAME)
          .download(fileName);

        if (!dlErr && blobData) {
          const url = URL.createObjectURL(blobData);
          console.log('📦 Obtido blob URL via download fallback para imagem');
          // Tenta obter a public URL mesmo que não esteja acessível, para uso futuro
          const { data: publicData } = supabase.storage.from(this.BUCKET_NAME).getPublicUrl(fileName);
          const storageUrl = publicData?.publicUrl?.split('?')[0] || null;
          return { displayUrl: url, storageUrl };
        }
      } catch (err) {
        console.log('⚠️ Falha no download fallback da imagem:', err);
      }

      return null;
    } catch (error) {
      console.error('💥 Erro ao obter URL da imagem:', error);
      return null;
    }
  }

  static async getFileAttachmentUrl(activityId: string, forceRefresh = false): Promise<string | null> {
    try {
      console.log('🔗 Obtendo URL do arquivo:', activityId, forceRefresh ? '(refresh forçado)' : '');

  const extensions = ['pdf','xml','xls','xlsx','doc','docx','csv','txt'];

      for (const ext of extensions) {
        const fileName = `${this.FILE_FOLDER}/${activityId}.${ext}`;

        let { data } = supabaseServiceRole.storage.from(this.BUCKET_NAME).getPublicUrl(fileName);

        if (!data?.publicUrl) {
          console.log('⚠️ Tentando URL pública com cliente normal...');
          const result = supabase.storage.from(this.BUCKET_NAME).getPublicUrl(fileName);
          data = result.data;
        }

        if (data?.publicUrl) {
          try {
            const response = await fetch(data.publicUrl, { method: 'HEAD', cache: 'no-cache' });
            if (response.ok) {
              const cleanUrl = data.publicUrl.split('?')[0];
              const timestamp = Date.now();
              const random = Math.random().toString(36).substring(7);
              const urlWithTimestamp = `${cleanUrl}?v=${timestamp}&r=${random}`;
              console.log('📎 URL gerada do storage:', urlWithTimestamp);
              return urlWithTimestamp;
            }
            // se HEAD falhar, tentar signed URL abaixo
          } catch (err) {
            // continuar para tentativa de signed URL
          }
        }

        // tentar signed URL pelo servidor
        try {
          const server = import.meta.env.VITE_SIGNED_URL_SERVER_URL || import.meta.env.VITE_API_URL || '';
          if (server) {
            const resp = await fetch(`${server.replace(/\/$/, '')}/signed-url`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ bucket: this.BUCKET_NAME, path: fileName, expires: 60 })
            });
            if (resp.ok) {
              const payload = await resp.json();
              if (payload?.signedUrl) {
                console.log('🔐 Obtido signedUrl do servidor para arquivo');
                return payload.signedUrl;
              }
            } else {
              console.log('⚠️ Signed-url server retornou erro', resp.status);
            }
          } else {
            console.log('⚠️ VITE_SIGNED_URL_SERVER_URL não configurado, não foi possível solicitar signed URL');
          }
        } catch (err) {
          console.error('💥 Erro ao solicitar signed URL ao servidor:', err);
        }

        // Fallback: tentar baixar o blob diretamente com o cliente (se a policy permitir)
        try {
          const { data: blobData, error: dlErr } = await supabase.storage
            .from(this.BUCKET_NAME)
            .download(fileName);

          if (!dlErr && blobData) {
            const url = URL.createObjectURL(blobData);
            console.log('📦 Obtido blob URL via download fallback para arquivo');
            return url;
          }
        } catch (err) {
          console.log('⚠️ Falha no download fallback do arquivo:', err);
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
        const result = await supabase.storage.from(this.BUCKET_NAME).upload(fileName, processedFile, {
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

      // Não atualizamos mais o banco de dados com a URL — apenas retornamos sucesso
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
        const result = await supabase.storage.from(this.BUCKET_NAME).update(fileName, processedFile, {
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
      return true;
    } catch (error) {
      console.error('💥 Erro ao substituir imagem:', error);
      throw error;
    }
  }

  static async deleteAttachment(activityId: string): Promise<boolean> {
    try {
      console.log('🗑️ [Manejo] Excluindo imagem:', activityId);
      
      // 🔍 DIAGNÓSTICO: Verificar estado atual do banco
      const { data: dbState } = await supabase
        .from('lancamentos_agricolas')
        .select('esperando_por_anexo')
        .eq('atividade_id', activityId)
        .single();
      console.log('📊 [Diagnóstico] Estado atual no banco:', dbState);
      
      // 🔍 DIAGNÓSTICO: Listar arquivos no bucket
      try {
        const { data: allFiles } = await supabase.storage
          .from(this.BUCKET_NAME)
          .list(this.IMAGE_FOLDER, { limit: 1000 });
        console.log('📁 [Diagnóstico] Total de arquivos na pasta imagens:', allFiles?.length || 0);
        const matchingFiles = allFiles?.filter(f => f.name.includes(activityId)) || [];
        console.log('🎯 [Diagnóstico] Arquivos que contêm o activityId:', matchingFiles.map(f => f.name));
      } catch (listErr) {
        console.log('⚠️ [Diagnóstico] Erro ao listar arquivos:', listErr);
      }

      const user = AuthService.getInstance().getCurrentUser();
      const pathsToTry: string[] = [];

      // 1. Path padrão (formato atual)
      pathsToTry.push(`${this.IMAGE_FOLDER}/${activityId}.jpg`);

      // 2. Path com user_id (caso exista)
      if (user?.user_id) {
        pathsToTry.push(`${user.user_id}/${this.IMAGE_FOLDER}/${activityId}.jpg`);
        pathsToTry.push(`${user.user_id}/${activityId}.jpg`);
      }

      // 3. Path direto (sem pasta)
      pathsToTry.push(`${activityId}.jpg`);

      console.log('🔍 [Manejo] Tentando excluir paths:', pathsToTry);

      // Tentar excluir cada path até conseguir
      for (const path of pathsToTry) {
        console.log(`🗑️ [Manejo] Tentando excluir: ${path}`);

        let { data, error } = await supabaseServiceRole.storage
          .from(this.BUCKET_NAME)
          .remove([path]);

        if (error) {
          console.log('⚠️ [Manejo] Tentando com cliente normal...');
          const result = await supabase.storage.from(this.BUCKET_NAME).remove([path]);
          data = result.data;
          error = result.error;
        }

        if (!error && data && data.length > 0) {
          console.log('✅ [Manejo] Exclusão do storage concluída:', path);
          console.log('📦 [Diagnóstico] Dados retornados pelo storage.remove():', data);
          
          // ⭐ Atualizar flag no banco de dados
          const { data: updateData, error: updateError } = await supabase
            .from('lancamentos_agricolas')
            .update({ esperando_por_anexo: false })
            .eq('atividade_id', activityId)
            .select();
          
          if (updateError) {
            console.error('❌ [Manejo] Erro ao atualizar banco:', updateError);
          } else {
            console.log('✅ [Manejo] Flag esperando_por_anexo resetada no banco:', updateData);
          }
          
          // 🔍 DIAGNÓSTICO: Verificar se arquivo ainda existe
          const stillExists = await this.hasAttachment(activityId);
          console.log('🔍 [Diagnóstico] Arquivo ainda existe após exclusão?', stillExists);
          
          return true;
        } else {
          console.log(`⚠️ [Manejo] Falha ao excluir ${path}:`, error?.message || 'Nenhum arquivo removido');
          console.log('📦 [Diagnóstico] Dados retornados (falha):', { data, error });
        }
      }

      throw new Error('Imagem não encontrada em nenhum dos caminhos tentados');
    } catch (error) {
      console.error('💥 [Manejo] Erro ao excluir imagem:', error);
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

      let { data, error } = await supabaseServiceRole.storage.from(this.BUCKET_NAME).upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type
      });

      if (error) {
        console.log('⚠️ Tentativa com service role falhou, tentando com cliente normal...');
        const result = await supabase.storage.from(this.BUCKET_NAME).upload(fileName, file, {
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

      let { data, error } = await supabaseServiceRole.storage.from(this.BUCKET_NAME).update(fileName, file, {
        cacheControl: '3600',
        contentType: file.type
      });

      if (error) {
        console.log('⚠️ Tentativa com service role falhou, tentando com cliente normal...');
        const result = await supabase.storage.from(this.BUCKET_NAME).update(fileName, file, {
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
      return true;
    } catch (error) {
      console.error('💥 Erro ao substituir arquivo:', error);
      throw error;
    }
  }

  static async deleteFileAttachment(activityId: string): Promise<boolean> {
    try {
      console.log('🗑️ [Manejo] Excluindo arquivo:', activityId);
      
      // 🔍 DIAGNÓSTICO: Verificar estado atual do banco
      const { data: dbState } = await supabase
        .from('lancamentos_agricolas')
        .select('esperando_por_anexo')
        .eq('atividade_id', activityId)
        .single();
      console.log('📊 [Diagnóstico] Estado atual no banco:', dbState);
      
      // 🔍 DIAGNÓSTICO: Listar arquivos no bucket
      try {
        const { data: allFiles } = await supabase.storage
          .from(this.BUCKET_NAME)
          .list(this.FILE_FOLDER, { limit: 1000 });
        console.log('📁 [Diagnóstico] Total de arquivos na pasta arquivos:', allFiles?.length || 0);
        const matchingFiles = allFiles?.filter(f => f.name.includes(activityId)) || [];
        console.log('🎯 [Diagnóstico] Arquivos que contêm o activityId:', matchingFiles.map(f => f.name));
      } catch (listErr) {
        console.log('⚠️ [Diagnóstico] Erro ao listar arquivos:', listErr);
      }

      const user = AuthService.getInstance().getCurrentUser();
      const extensions = ['pdf','xml','xls','xlsx','doc','docx','csv','txt'];
      const pathsToTry: string[] = [];

      // 1. Paths padrão (formato atual) - todas as extensões possíveis
      for (const ext of extensions) {
        pathsToTry.push(`${this.FILE_FOLDER}/${activityId}.${ext}`);
      }

      // 2. Paths com user_id (caso exista) - todas as extensões possíveis
      if (user?.user_id) {
        for (const ext of extensions) {
          pathsToTry.push(`${user.user_id}/${this.FILE_FOLDER}/${activityId}.${ext}`);
          pathsToTry.push(`${user.user_id}/${activityId}.${ext}`);
        }
      }

      // 3. Paths diretos (sem pasta) - todas as extensões possíveis
      for (const ext of extensions) {
        pathsToTry.push(`${activityId}.${ext}`);
      }

      console.log('🔍 [Manejo] Tentando excluir paths de arquivo (total:', pathsToTry.length, ')');

      // Tentar excluir todos os paths de uma vez (mais eficiente)
      let { data, error } = await supabaseServiceRole.storage
        .from(this.BUCKET_NAME)
        .remove(pathsToTry);

      if (error) {
        console.log('⚠️ [Manejo] Tentando com cliente normal...');
        const result = await supabase.storage.from(this.BUCKET_NAME).remove(pathsToTry);
        data = result.data;
        error = result.error;
      }

      if (!error && data && data.length > 0) {
        console.log('✅ [Manejo] Exclusão em massa concluída. Arquivos removidos:', data.length);
        console.log('📦 [Diagnóstico] Dados retornados:', data);
        
        // ⭐ Atualizar flag no banco de dados
        const { data: updateData, error: updateError } = await supabase
          .from('lancamentos_agricolas')
          .update({ esperando_por_anexo: false })
          .eq('atividade_id', activityId)
          .select();
        
        if (updateError) {
          console.error('❌ [Manejo] Erro ao atualizar banco:', updateError);
        } else {
          console.log('✅ [Manejo] Flag esperando_por_anexo resetada no banco:', updateData);
        }
        
        // 🔍 DIAGNÓSTICO: Verificar se arquivo ainda existe
        const stillExists = await this.hasFileAttachment(activityId);
        console.log('🔍 [Diagnóstico] Arquivo ainda existe após exclusão?', stillExists);
        
        return true;
      }

      // Se a tentativa em massa falhou, tentar um por um
      console.log('⚠️ [Manejo] Tentativa em massa falhou, tentando individualmente...');
      let removedCount = 0;

      for (const path of pathsToTry) {
        let { data: singleData, error: singleError } = await supabaseServiceRole.storage
          .from(this.BUCKET_NAME)
          .remove([path]);

        if (singleError) {
          const result = await supabase.storage.from(this.BUCKET_NAME).remove([path]);
          singleData = result.data;
          singleError = result.error;
        }

        if (!singleError && singleData && singleData.length > 0) {
          console.log('✅ [Manejo] Arquivo removido:', path);
          removedCount++;
        }
      }

      if (removedCount > 0) {
        console.log(`✅ [Manejo] Total de arquivos removidos (individual): ${removedCount}`);
        
        // ⭐ Atualizar flag no banco de dados
        const { data: updateData, error: updateError } = await supabase
          .from('lancamentos_agricolas')
          .update({ esperando_por_anexo: false })
          .eq('atividade_id', activityId)
          .select();
        
        if (updateError) {
          console.error('❌ [Manejo] Erro ao atualizar banco:', updateError);
        } else {
          console.log('✅ [Manejo] Flag esperando_por_anexo resetada no banco:', updateData);
        }
        
        // 🔍 DIAGNÓSTICO: Verificar se arquivo ainda existe
        const stillExists = await this.hasFileAttachment(activityId);
        console.log('🔍 [Diagnóstico] Arquivo ainda existe após exclusão?', stillExists);
        
        return true;
      }

      throw new Error('Arquivo não encontrado em nenhum dos caminhos tentados');
    } catch (error) {
      console.error('💥 [Manejo] Erro ao excluir arquivo:', error);
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

  const extensions = ['pdf','xml','xls','xlsx','doc','docx','csv','txt'];
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

  /**
   * Gera signed URL para imagem de atividade (válida por 1 hora)
   * @param activityId - ID da atividade
   * @param expiresIn - Tempo de expiração em segundos (padrão: 3600 = 1 hora)
   * @returns URL assinada ou null se falhar
   */
  static async getSignedImageUrl(activityId: string, expiresIn: number = 3600): Promise<string | null> {
    try {
      const filePath = `${this.IMAGE_FOLDER}/${activityId}.jpg`;
      console.log('🔐 Gerando signed URL para imagem:', filePath);

      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .createSignedUrl(filePath, expiresIn);

      if (error) {
        console.error('❌ Erro ao gerar signed URL:', error);
        return null;
      }

      console.log('✅ Signed URL gerada com sucesso');
      return data.signedUrl;
    } catch (err) {
      console.error('💥 Erro ao gerar signed URL:', err);
      return null;
    }
  }

  /**
   * Gera signed URL para arquivo de atividade (válida por 1 hora)
   * @param activityId - ID da atividade
   * @param expiresIn - Tempo de expiração em segundos (padrão: 3600 = 1 hora)
   * @returns URL assinada ou null se falhar
   */
  static async getSignedFileUrl(activityId: string, expiresIn: number = 3600): Promise<string | null> {
    try {
      const extensions = ['pdf','xml','xls','xlsx','doc','docx','csv','txt'];

      for (const ext of extensions) {
        const filePath = `${this.FILE_FOLDER}/${activityId}.${ext}`;

        const { data, error } = await supabase.storage
          .from(this.BUCKET_NAME)
          .createSignedUrl(filePath, expiresIn);

        if (!error && data?.signedUrl) {
          console.log('✅ Signed URL gerada para arquivo:', filePath);
          return data.signedUrl;
        }
      }

      console.error('❌ Não foi possível gerar signed URL para nenhuma extensão');
      return null;
    } catch (err) {
      console.error('💥 Erro ao gerar signed URL:', err);
      return null;
    }
  }
}
