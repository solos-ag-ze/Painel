import { supabase, MaquinasEquipamentos } from '../lib/supabase';
import logger from '../lib/logger';
import { PropriedadeService } from './propriedadeService';


interface AddMaquinaPayload {
    user_id: string;
    nome: string;
    marca_modelo: string;
    categoria: string;
    horimetro_atual: number | null;
    valor_compra: number | null;
    data_compra: string | null;
    fornecedor: string | null;
    numero_serie: string | null;
    id_propriedade?: string | null;
}

export class MaquinaService {

    async addMaquina(data: AddMaquinaPayload): Promise<MaquinasEquipamentos> {
        try {
            const payload = { ...data };

            if (!payload.id_propriedade) {
                payload.id_propriedade = await PropriedadeService.getPropriedadeAtivaDoUsuario(payload.user_id);
            }

            const { data: maquina, error } = await supabase
                .from('maquinas_equipamentos')
                .insert([payload])
                .select()
                .single();

            if (error) {
                throw new Error(`Error adding machine: ${error.message}`);
            }

            if (!maquina) {
                throw new Error('Failed to create machine');
            }

            return maquina;
        } catch (error) {
            console.error('Erro ao adicionar máquina:', error);
            throw error;
        }
    }

    async getMaquinasByUserId(userId: string): Promise<MaquinasEquipamentos[]> {
        try {
            const { data, error } = await supabase
                .from('maquinas_equipamentos')
                .select('*')
                .eq('user_id', userId);

                if (error) {
                    throw new Error(`Error fetching machines: ${error.message}`);
                }

            return data || [];
        } catch (error) {
            logger.error('Erro ao buscar maquinas', error);
            return [];
        }
    }

    async numeroMaquinas(userId: string): Promise<number> {
        try {
            const { count, error } = await supabase
                .from('maquinas_equipamentos')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId);

            if (error) {
                throw new Error(`Error fetching machine count: ${error.message}`);
            }

            return count || 0;
        } catch (error) {
            logger.error('Erro ao contar maquinas', error);
            return 0;
        }
    }

    async custoTotalMaquinas(userId: string): Promise<number> {
        try {
            const { data, error } = await supabase
                .from('maquinas_equipamentos')
                .select('valor_compra')
                .eq('user_id', userId);

            if (error) {
                throw new Error(`Error fetching machine costs: ${error.message}`);
            }

        
            if (!data || data.length === 0) {
                return 0;
            }

            return data.reduce((total: number, maquina: { valor_compra: number | null }) => total + (maquina.valor_compra || 0), 0);
        } catch (error) {
            console.error('Erro ao calcular custo total das maquinas', error);
            return 0;
        }
    }



    //Métodos relacionados ao crud do modal de imagens das maquinas, os anteriores são relacionados a parte geral da MaquinasEquipamentosPanel

    async getMaquinaById(maquinaId: string): Promise<MaquinasEquipamentos & { 
            url_primeiro_envio?: string | null; 
            url_segundo_envio?: string | null; 
            } | null> {
            try {
                const { data, error } = await supabase
                  .from('maquinas_equipamentos')
                  .select('*, url_primeiro_envio, url_segundo_envio')
                  .eq('id_maquina', maquinaId)
                  .single();
                
                if (error) {
                    throw new Error(`Error ao buscar a maquina pelo id: ${error.message}`);
                }

                return data;
            } catch (error) {
                logger.error('Error ao buscar a maquina pelo id:', error);
                throw error;
            }
            }
        async updateMaquinaUrl(
            maquinaId: string, 
            columnName: 'url_primeiro_envio' | 'url_segundo_envio', 
            url: string | null
            ): Promise<void> {
            try {
                 const { error } = await supabase
                   .from('maquinas_equipamentos')
                   .update({ [columnName]: url })
                   .eq('id_maquina', maquinaId);

                if (error) throw Error (`Error ao atualizar a maquina: ${error.message}`);

               return;
            } catch (error) {
                logger.error('Error updating machine URL:', error);
                throw error;
            }
            }

            async getMaquinasSemAnexos(userId: string): Promise<string[]> {
                try {
                const { data, error } = await supabase
                    .from('maquinas_equipamentos')
                    .select('id_maquina')
                    .eq('user_id', userId)
                    .is('url_primeiro_envio', null)
                    .is('url_segundo_envio', null);

                if (error) {
                    logger.error('Error fetching machines without attachments:', error);
                    return [];
                }

                return (data || []).map(item => item.id_maquina);
                } catch (error) {
                logger.error('Error getting machines without attachments:', error);
                return [];
                }
            }

            async deleteMaquina(maquinaId: string): Promise<void> {
                try {
                    logger.info('🗑️ Deletando máquina:', maquinaId);

                    const { error } = await supabase
                        .from('maquinas_equipamentos')
                        .delete()
                        .eq('id_maquina', maquinaId);

                    if (error) {
                        throw new Error(`Error deleting machine: ${error.message}`);
                    }

                    logger.info('✅ Máquina deletada com sucesso');
                } catch (error) {
                    logger.error('Erro ao deletar máquina:', error);
                    throw error;
                }
            }

}