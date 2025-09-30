/*
  # Relacionar atividades agrícolas com talhões

  1. Verificações
    - Confirma que a coluna id_talhoes existe na tabela atividades_agricolas
    - Adiciona índice para melhorar performance das consultas
    
  2. Dados de exemplo
    - Insere algumas atividades de exemplo relacionadas aos talhões
    
  3. Segurança
    - Mantém as políticas RLS existentes
*/

-- Verificar se a coluna id_talhoes existe, se não existir, criar
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'atividades_agricolas' 
    AND column_name = 'id_talhoes'
  ) THEN
    ALTER TABLE atividades_agricolas ADD COLUMN id_talhoes text;
  END IF;
END $$;

-- Criar índice para melhorar performance das consultas por talhão
CREATE INDEX IF NOT EXISTS idx_atividades_id_talhoes 
ON atividades_agricolas USING gin (string_to_array(id_talhoes, ','));

-- Comentário na coluna para documentação
COMMENT ON COLUMN atividades_agricolas.id_talhoes IS 'IDs dos talhões onde a atividade foi realizada, separados por vírgula';

-- Inserir alguns dados de exemplo para demonstração (apenas se não existirem dados)
DO $$
DECLARE
  user_demo_id uuid;
  talhao1_id uuid;
  talhao2_id uuid;
  talhao3_id uuid;
BEGIN
  -- Buscar um usuário de exemplo (primeiro usuário da tabela)
  SELECT user_id INTO user_demo_id FROM usuarios LIMIT 1;
  
  IF user_demo_id IS NOT NULL THEN
    -- Buscar alguns talhões deste usuário
    SELECT id_talhao INTO talhao1_id FROM talhoes WHERE criado_por = user_demo_id LIMIT 1;
    SELECT id_talhao INTO talhao2_id FROM talhoes WHERE criado_por = user_demo_id OFFSET 1 LIMIT 1;
    SELECT id_talhao INTO talhao3_id FROM talhoes WHERE criado_por = user_demo_id OFFSET 2 LIMIT 1;
    
    -- Inserir atividades de exemplo apenas se os talhões existirem
    IF talhao1_id IS NOT NULL THEN
      INSERT INTO atividades_agricolas (
        user_id, nome_atividade, area, produto_usado, quantidade, 
        responsavel, observacao, data, dose_usada, id_talhoes
      ) VALUES 
      (
        user_demo_id,
        'Pulverização preventiva',
        '5.2 hectares',
        'Fungicida Sistêmico',
        '200 litros',
        'João Silva',
        'Aplicação preventiva contra ferrugem',
        '2024-01-15',
        '2L/ha',
        talhao1_id::text
      ),
      (
        user_demo_id,
        'Adubação de cobertura',
        '3.8 hectares', 
        'NPK 20-05-20',
        '15 sacas',
        'Maria Santos',
        'Segunda adubação do ano',
        '2024-01-20',
        '400kg/ha',
        talhao1_id::text || ',' || COALESCE(talhao2_id::text, '')
      )
      ON CONFLICT DO NOTHING;
    END IF;
    
    IF talhao2_id IS NOT NULL THEN
      INSERT INTO atividades_agricolas (
        user_id, nome_atividade, area, produto_usado, quantidade,
        responsavel, observacao, data, dose_usada, id_talhoes
      ) VALUES 
      (
        user_demo_id,
        'Capina manual',
        '2.1 hectares',
        'Não se aplica',
        '8 diárias',
        'Equipe de campo',
        'Limpeza das entrelinhas',
        '2024-01-25',
        'Manual',
        talhao2_id::text
      )
      ON CONFLICT DO NOTHING;
    END IF;
    
    IF talhao3_id IS NOT NULL THEN
      INSERT INTO atividades_agricolas (
        user_id, nome_atividade, area, produto_usado, quantidade,
        responsavel, observacao, data, dose_usada, id_talhoes
      ) VALUES 
      (
        user_demo_id,
        'Análise de solo',
        '1.5 hectares',
        'Kit de coleta',
        '12 amostras',
        'Técnico agrônomo',
        'Coleta para análise química',
        '2024-02-01',
        '1 amostra/0.5ha',
        talhao3_id::text
      )
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
END $$;