/*
  # Inserir dados na tabela cotacao_diaria_cafe

  1. Dados da cotação
    - Insere o registro com ID 1 para cotação do café
    - Dados baseados na estrutura mostrada pelo usuário
    
  2. Estrutura
    - id: 1 (registro principal)
    - cultura: "Café"
    - municipio: "Guaxupé/MG (Cooxupé)"
    - preco: "R$1.959,00"
    - variacao: "+1,03"
*/

-- Primeiro, vamos garantir que a tabela existe com a estrutura correta
CREATE TABLE IF NOT EXISTS cotacao_diaria_cafe (
  id int8 PRIMARY KEY,
  cultura text NOT NULL,
  municipio text NOT NULL,
  preco text NOT NULL,
  variacao text NOT NULL
);

-- Inserir o registro principal (ID = 1) com os dados da cotação
INSERT INTO cotacao_diaria_cafe (id, cultura, municipio, preco, variacao) 
VALUES (1, 'Café', 'Guaxupé/MG (Cooxupé)', 'R$1.959,00', '+1,03')
ON CONFLICT (id) DO UPDATE SET
  cultura = EXCLUDED.cultura,
  municipio = EXCLUDED.municipio,
  preco = EXCLUDED.preco,
  variacao = EXCLUDED.variacao;

-- Verificar se o registro foi inserido
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cotacao_diaria_cafe WHERE id = 1) THEN
    RAISE NOTICE 'Registro de cotação inserido com sucesso!';
  ELSE
    RAISE EXCEPTION 'Falha ao inserir registro de cotação';
  END IF;
END $$;