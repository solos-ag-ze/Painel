import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { ActivityPayload, ProdutoItem, MaquinaItem } from '../types/activity';
import logger from '../lib/logger';

export function useLoadActivity(transaction?: ActivityPayload | null) {
  const [local, setLocal] = useState<ActivityPayload | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!transaction) {
      setLocal(null);
      return;
    }

    let mounted = true;
    async function loadActivityData() {
      setLoading(true);
      try {
        // Buscar talhões vinculados na tabela lancamento_talhoes
        const { data: vinculados, error: errorTalhoes } = await supabase
          .from('lancamento_talhoes')
          .select('talhao_id')
          .eq('atividade_id', transaction.id);

        if (errorTalhoes) logger.error('Erro ao carregar talhões vinculados:', errorTalhoes);
        const talhaoIdsVinculados = (vinculados || []).map((v: any) => v.talhao_id);

        // Buscar responsáveis vinculados
        const { data: responsaveisVinculados, error: errorResp } = await supabase
          .from('lancamento_responsaveis')
          .select('id, nome')
          .eq('atividade_id', transaction.id);
        if (errorResp) logger.error('Erro ao carregar responsáveis vinculados:', errorResp);
        const responsaveis = (responsaveisVinculados || []).map((r: any) => ({ id: String(r.id), nome: r.nome }));

        // Produtos vinculados
        const { data: produtosVinculados, error: errorProd } = await supabase
          .from('lancamento_produtos')
          .select('id, nome_produto, quantidade_val, quantidade_un, unidade_medida, produto_catalogo_id')
          .eq('atividade_id', transaction.id);
        if (errorProd) logger.error('Erro ao carregar produtos vinculados:', errorProd);

        const produtosRaw = (produtosVinculados || []).map((p: any) => ({
          id: String(p.id),
          nome: p.nome_produto || '',
          quantidade: p.quantidade_val ? String(p.quantidade_val) : '',
          unidade: p.quantidade_un || p.unidade_medida || 'kg',
          produto_catalogo_id: p.produto_catalogo_id,
        })) as ProdutoItem[];

        // Resolver nomes via catálogo
        const catalogoIds = produtosRaw.map(p => p.produto_catalogo_id).filter(Boolean);
        let prodNamesMap: Record<string, string> = {};
        if (catalogoIds.length > 0) {
          const { data: estoqueProds } = await supabase
            .from('estoque_de_produtos')
            .select('produto_id, nome_do_produto')
            .in('produto_id', catalogoIds);
          prodNamesMap = (estoqueProds || []).reduce((acc: Record<string, string>, ep: any) => {
            if (ep.produto_id && ep.nome_do_produto) acc[ep.produto_id] = ep.nome_do_produto;
            return acc;
          }, {});
        }

        const produtos = produtosRaw.map(p => ({ ...p, nome: (p.produto_catalogo_id && prodNamesMap[p.produto_catalogo_id]) ? prodNamesMap[p.produto_catalogo_id] : p.nome }));

        // Máquinas vinculadas
        const { data: maquinasVinculadas, error: errorMaq } = await supabase
          .from('lancamento_maquinas')
          .select('id, maquina_id, nome_maquina, horas_maquina')
          .eq('atividade_id', transaction.id);
        if (errorMaq) logger.error('Erro ao carregar máquinas vinculadas:', errorMaq);

        const maqIds = (maquinasVinculadas || []).map((m: any) => m.maquina_id).filter(Boolean);
        let maqNamesMap: Record<string, string> = {};
        if (maqIds.length > 0) {
          const { data: maqEquip } = await supabase
            .from('maquinas_equipamentos')
            .select('id_maquina, nome')
            .in('id_maquina', maqIds);
          maqNamesMap = (maqEquip || []).reduce((acc: Record<string, string>, eq: any) => {
            acc[eq.id_maquina] = eq.nome;
            return acc;
          }, {});
        }

        const maquinas = (maquinasVinculadas || []).map((m: any) => ({
          id: String(m.id),
          nome: (m.maquina_id && maqNamesMap[m.maquina_id]) ? maqNamesMap[m.maquina_id] : (m.nome_maquina || ''),
          horas: m.horas_maquina != null ? String(m.horas_maquina) : '',
          maquina_id: m.maquina_id,
        })) as MaquinaItem[];

        const tx = transaction as ActivityPayload;
        const localPayload: ActivityPayload = {
          descricao: tx.descricao ?? undefined,
          data_atividade: tx.data_atividade ?? undefined,
          nome_talhao: tx.nome_talhao ?? '',
          talhao_ids: talhaoIdsVinculados.length > 0 ? talhaoIdsVinculados : (tx.talhao_ids ?? []),
          produtos: produtos.length > 0 ? produtos : (tx.produtos ?? []),
          maquinas: maquinas.length > 0 ? maquinas : (tx.maquinas ?? []),
          imagem: tx.imagem ?? undefined,
          arquivo: tx.arquivo ?? undefined,
          observacoes: tx.observacoes ?? undefined,
          responsaveis: responsaveis.length > 0 ? responsaveis : (tx.responsaveis ?? []),
        };

        if (mounted) setLocal(localPayload);
      } catch (e) {
        logger.error('Erro ao carregar dados da atividade (hook):', e);
        const tx = transaction as ActivityPayload;
        if (mounted) setLocal({
          descricao: tx.descricao ?? undefined,
          data_atividade: tx.data_atividade ?? undefined,
          nome_talhao: tx.nome_talhao ?? '',
          talhao_ids: tx.talhao_ids ?? [],
          produtos: tx.produtos ?? [],
          maquinas: tx.maquinas ?? [],
          imagem: tx.imagem ?? undefined,
          arquivo: tx.arquivo ?? undefined,
          observacoes: tx.observacoes ?? undefined,
          responsaveis: tx.responsaveis ?? [],
        });
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadActivityData();

    return () => { mounted = false; };
  }, [transaction]);

  return { local, setLocal, loading } as const;
}

export default useLoadActivity;
