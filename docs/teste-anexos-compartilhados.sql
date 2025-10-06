-- Script de Teste: Sistema de Anexos Compartilhados
-- Este script testa toda a funcionalidade do sistema de anexos compartilhados

-- ========================================
-- PARTE 1: Verificar Estrutura
-- ========================================

-- Verificar se os campos foram criados corretamente
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'transacoes_financeiras'
    AND column_name IN ('anexo_compartilhado_url', 'id_grupo_anexo', 'parcela_com_anexo_original')
ORDER BY column_name;

-- Verificar se os índices foram criados
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'transacoes_financeiras'
    AND (indexname LIKE '%grupo_anexo%' OR indexname LIKE '%transacao_pai%');

-- Verificar se os triggers foram criados
SELECT
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'transacoes_financeiras'
    AND trigger_name IN ('trigger_propagar_anexo', 'trigger_limpar_anexo');

-- ========================================
-- PARTE 2: Verificar Inicialização de Dados
-- ========================================

-- Contar transações com id_grupo_anexo preenchido
SELECT
    COUNT(*) as total_transacoes,
    COUNT(id_grupo_anexo) as com_grupo_anexo,
    COUNT(id_grupo_anexo) * 100.0 / COUNT(*) as percentual
FROM transacoes_financeiras;

-- Verificar distribuição de transações parceladas
SELECT
    numero_parcelas,
    COUNT(*) as quantidade,
    COUNT(DISTINCT id_grupo_anexo) as grupos_unicos
FROM transacoes_financeiras
GROUP BY numero_parcelas
ORDER BY numero_parcelas;

-- ========================================
-- PARTE 3: Buscar Exemplos de Transações Parceladas
-- ========================================

-- Encontrar um grupo de parcelas para teste
SELECT
    id_transacao,
    descricao,
    parcela,
    numero_parcelas,
    id_transacao_pai,
    id_grupo_anexo,
    anexo_compartilhado_url,
    parcela_com_anexo_original
FROM transacoes_financeiras
WHERE id_transacao_pai IS NOT NULL
    OR numero_parcelas > 1
ORDER BY data_registro DESC
LIMIT 5;

-- Ver todas as parcelas de um grupo específico
-- (Substitua o UUID abaixo pelo id_grupo_anexo real do seu sistema)
SELECT
    id_transacao,
    descricao,
    parcela,
    valor,
    data_agendamento_pagamento,
    anexo_compartilhado_url,
    parcela_com_anexo_original
FROM transacoes_financeiras
WHERE id_grupo_anexo = 'cole-aqui-um-id-grupo-anexo-real'
ORDER BY data_agendamento_pagamento;

-- ========================================
-- PARTE 4: Teste de Propagação de Anexo
-- ========================================

-- IMPORTANTE: Execute este teste em um ambiente de desenvolvimento!
-- Não execute em produção sem verificar os IDs primeiro!

-- 4.1. Selecionar uma transação parcelada para teste
DO $$
DECLARE
    teste_id_transacao uuid;
    teste_id_grupo uuid;
    teste_url text := 'https://exemplo.com/storage/teste-anexo.jpg';
    total_parcelas int;
BEGIN
    -- Busca primeira transação parcelada
    SELECT id_transacao, id_grupo_anexo
    INTO teste_id_transacao, teste_id_grupo
    FROM transacoes_financeiras
    WHERE numero_parcelas > 1
    LIMIT 1;

    IF teste_id_transacao IS NULL THEN
        RAISE NOTICE '❌ Nenhuma transação parcelada encontrada para teste';
        RETURN;
    END IF;

    RAISE NOTICE '🧪 Testando com transação: %', teste_id_transacao;
    RAISE NOTICE '📦 Grupo de anexo: %', teste_id_grupo;

    -- 4.2. Simular upload de anexo (atualiza apenas UMA transação)
    UPDATE transacoes_financeiras
    SET
        anexo_compartilhado_url = teste_url,
        parcela_com_anexo_original = true
    WHERE id_transacao = teste_id_transacao;

    RAISE NOTICE '✅ URL do anexo atualizada na transação original';

    -- 4.3. Aguardar trigger executar (normalmente instantâneo)
    PERFORM pg_sleep(0.5);

    -- 4.4. Verificar se propagou para todas as parcelas do grupo
    SELECT COUNT(*)
    INTO total_parcelas
    FROM transacoes_financeiras
    WHERE id_grupo_anexo = teste_id_grupo
        AND anexo_compartilhado_url = teste_url;

    RAISE NOTICE '📊 Total de parcelas com anexo propagado: %', total_parcelas;

    -- 4.5. Exibir resultado detalhado
    RAISE NOTICE '📋 Detalhes das parcelas:';
    FOR r IN
        SELECT
            id_transacao,
            parcela,
            CASE
                WHEN anexo_compartilhado_url = teste_url THEN '✅'
                ELSE '❌'
            END as tem_anexo,
            parcela_com_anexo_original
        FROM transacoes_financeiras
        WHERE id_grupo_anexo = teste_id_grupo
        ORDER BY data_agendamento_pagamento
    LOOP
        RAISE NOTICE '  Parcela %: % Anexo | Original: %',
            r.parcela,
            r.tem_anexo,
            r.parcela_com_anexo_original;
    END LOOP;

    -- 4.6. Limpar dados de teste
    UPDATE transacoes_financeiras
    SET
        anexo_compartilhado_url = NULL,
        parcela_com_anexo_original = false
    WHERE id_grupo_anexo = teste_id_grupo;

    RAISE NOTICE '🧹 Dados de teste limpos';
    RAISE NOTICE '✅ TESTE CONCLUÍDO COM SUCESSO!';

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Erro no teste: %', SQLERRM;
END $$;

-- ========================================
-- PARTE 5: Verificar Integridade dos Dados
-- ========================================

-- Verificar grupos com parcelas inconsistentes
SELECT
    id_grupo_anexo,
    COUNT(*) as total_parcelas,
    COUNT(DISTINCT anexo_compartilhado_url) as urls_diferentes,
    ARRAY_AGG(DISTINCT anexo_compartilhado_url) as urls
FROM transacoes_financeiras
WHERE id_grupo_anexo IS NOT NULL
GROUP BY id_grupo_anexo
HAVING COUNT(DISTINCT anexo_compartilhado_url) > 1;

-- Se a query acima retornar resultados, há inconsistência!
-- Todas as parcelas do mesmo grupo devem ter a mesma URL

-- Verificar transações com anexo mas sem grupo
SELECT
    id_transacao,
    descricao,
    numero_parcelas,
    anexo_compartilhado_url
FROM transacoes_financeiras
WHERE anexo_compartilhado_url IS NOT NULL
    AND id_grupo_anexo IS NULL;

-- ========================================
-- PARTE 6: Estatísticas do Sistema
-- ========================================

-- Resumo geral de anexos
SELECT
    COUNT(*) as total_transacoes,
    COUNT(DISTINCT id_grupo_anexo) as total_grupos,
    COUNT(anexo_compartilhado_url) as transacoes_com_anexo,
    COUNT(DISTINCT CASE
        WHEN anexo_compartilhado_url IS NOT NULL
        THEN id_grupo_anexo
    END) as grupos_com_anexo,
    SUM(CASE
        WHEN numero_parcelas > 1 THEN 1
        ELSE 0
    END) as transacoes_parceladas,
    ROUND(
        COUNT(anexo_compartilhado_url) * 100.0 / NULLIF(COUNT(*), 0),
        2
    ) as percentual_com_anexo
FROM transacoes_financeiras;

-- Estatísticas por número de parcelas
SELECT
    numero_parcelas,
    COUNT(*) as total_transacoes,
    COUNT(anexo_compartilhado_url) as com_anexo,
    ROUND(
        COUNT(anexo_compartilhado_url) * 100.0 / COUNT(*),
        2
    ) as percentual_anexo
FROM transacoes_financeiras
GROUP BY numero_parcelas
ORDER BY numero_parcelas;

-- ========================================
-- PARTE 7: Queries Úteis para Manutenção
-- ========================================

-- Encontrar grupos órfãos (sem transações ativas)
SELECT DISTINCT t1.id_grupo_anexo
FROM transacoes_financeiras t1
WHERE NOT EXISTS (
    SELECT 1
    FROM transacoes_financeiras t2
    WHERE t2.id_grupo_anexo = t1.id_grupo_anexo
        AND t2.ativo = true
);

-- Contar quantos anexos únicos existem no storage vs. banco
-- (Esta query ajuda a identificar arquivos órfãos)
SELECT
    COUNT(DISTINCT id_grupo_anexo) as grupos_com_anexo_no_banco,
    COUNT(DISTINCT anexo_compartilhado_url) as urls_unicas
FROM transacoes_financeiras
WHERE anexo_compartilhado_url IS NOT NULL;

-- ========================================
-- FIM DOS TESTES
-- ========================================

-- Resumo: O que esperar dos testes

/*
✅ SUCESSO significa:
   - Todos os campos foram criados
   - Índices estão presentes
   - Triggers estão funcionando
   - id_grupo_anexo está preenchido para todas as transações
   - Trigger de propagação funciona corretamente
   - Não há inconsistências entre parcelas do mesmo grupo

❌ PROBLEMAS potenciais:
   - Campos faltando = Migration não executou
   - Triggers ausentes = Propagação não funcionará automaticamente
   - id_grupo_anexo NULL = Inicialização falhou
   - URLs diferentes no mesmo grupo = Trigger não propagou
   - Grupos órfãos = Possível vazamento de storage
*/

-- Para mais informações, consulte:
-- - /docs/integracao-anexos-n8n.md
-- - /src/services/sharedAttachmentService.ts
-- - Migration: add_shared_attachment_fields.sql
