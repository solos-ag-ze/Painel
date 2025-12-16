/*
  # Adicionar políticas de desenvolvimento para Pragas e Doenças
  
  1. Tabela pragas_e_doencas:
     - Permite SELECT, INSERT, UPDATE, DELETE para qualquer user_id
  
  2. Tabela pragas_e_doencas_talhoes:
     - Permite SELECT, INSERT, DELETE para qualquer user_id
*/

-- Remover políticas anteriores
DROP POLICY IF EXISTS "Users can view own pragas_e_doencas" ON pragas_e_doencas;
DROP POLICY IF EXISTS "Users can insert own pragas_e_doencas" ON pragas_e_doencas;
DROP POLICY IF EXISTS "Users can update own pragas_e_doencas" ON pragas_e_doencas;
DROP POLICY IF EXISTS "Users can delete own pragas_e_doencas" ON pragas_e_doencas;

DROP POLICY IF EXISTS "Users can view own pragas_e_doencas_talhoes" ON pragas_e_doencas_talhoes;
DROP POLICY IF EXISTS "Users can insert own pragas_e_doencas_talhoes" ON pragas_e_doencas_talhoes;
DROP POLICY IF EXISTS "Users can delete own pragas_e_doencas_talhoes" ON pragas_e_doencas_talhoes;

-- Políticas permissivas para pragas_e_doencas (modo dev)
CREATE POLICY "Dev allow select pragas_e_doencas"
  ON pragas_e_doencas
  FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Dev allow insert pragas_e_doencas"
  ON pragas_e_doencas
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "Dev allow update pragas_e_doencas"
  ON pragas_e_doencas
  FOR UPDATE
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Dev allow delete pragas_e_doencas"
  ON pragas_e_doencas
  FOR DELETE
  TO authenticated, anon
  USING (true);

-- Políticas permissivas para pragas_e_doencas_talhoes (modo dev)
CREATE POLICY "Dev allow select pragas_e_doencas_talhoes"
  ON pragas_e_doencas_talhoes
  FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Dev allow insert pragas_e_doencas_talhoes"
  ON pragas_e_doencas_talhoes
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "Dev allow delete pragas_e_doencas_talhoes"
  ON pragas_e_doencas_talhoes
  FOR DELETE
  TO authenticated, anon
  USING (true);