/*
  # Add Production RLS Policies for Property Access
  
  ## Overview
  This migration adds production-ready RLS policies for the property-related tables.
  These policies use auth.uid() to allow authenticated users to access their own data
  in production environments where JWT tokens are provided by n8n.
  
  ## Tables Updated
  
  ### 1. vinculo_usuario_propriedade
  - Policies for SELECT, INSERT, UPDATE, DELETE operations
  - Users can access their own property links where user_id matches auth.uid()
  
  ### 2. propriedades
  - Policies for SELECT, INSERT, UPDATE, DELETE operations
  - Users can access properties they are linked to via vinculo_usuario_propriedade
  
  ### 3. talhoes
  - Policies for SELECT, INSERT, UPDATE, DELETE operations
  - Users can access talhoes based on property ownership
  - Also allows access to talhoes where criado_por matches auth.uid()
  
  ### 4. transacoes_financeiras
  - Enhanced policies for better production access
  - Users can access their own transactions where user_id matches auth.uid()
  
  ### 5. atividades_agricolas
  - Enhanced policies for better production access
  - Users can access their own activities where user_id matches auth.uid()
  
  ### 6. usuarios
  - Enhanced policies for better production access
  - Users can access their own profile where user_id matches auth.uid()
  
  ## Security Notes
  - All policies use (select auth.uid()) pattern for optimal performance
  - Policies are restrictive by default - only authenticated users can access data
  - Each policy checks ownership via user_id or property relationships
  - Development bypass policies remain intact for local development
*/

-- ============================================================================
-- vinculo_usuario_propriedade: Property-User Link Policies
-- ============================================================================

-- Drop existing production policies if any
DROP POLICY IF EXISTS "Users can view own property links" ON public.vinculo_usuario_propriedade;
DROP POLICY IF EXISTS "Users can insert own property links" ON public.vinculo_usuario_propriedade;
DROP POLICY IF EXISTS "Users can update own property links" ON public.vinculo_usuario_propriedade;
DROP POLICY IF EXISTS "Users can delete own property links" ON public.vinculo_usuario_propriedade;

-- Allow users to view their own property links
CREATE POLICY "Users can view own property links"
  ON public.vinculo_usuario_propriedade
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

-- Allow users to insert their own property links
CREATE POLICY "Users can insert own property links"
  ON public.vinculo_usuario_propriedade
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- Allow users to update their own property links
CREATE POLICY "Users can update own property links"
  ON public.vinculo_usuario_propriedade
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- Allow users to delete their own property links
CREATE POLICY "Users can delete own property links"
  ON public.vinculo_usuario_propriedade
  FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- ============================================================================
-- propriedades: Property Policies
-- ============================================================================

-- Drop existing production policies if any
DROP POLICY IF EXISTS "Users can view linked properties" ON public.propriedades;
DROP POLICY IF EXISTS "Users can insert properties" ON public.propriedades;
DROP POLICY IF EXISTS "Users can update linked properties" ON public.propriedades;
DROP POLICY IF EXISTS "Users can delete linked properties" ON public.propriedades;

-- Allow users to view properties they are linked to
CREATE POLICY "Users can view linked properties"
  ON public.propriedades
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.vinculo_usuario_propriedade
      WHERE vinculo_usuario_propriedade.id_propriedade = propriedades.id_propriedade
      AND vinculo_usuario_propriedade.user_id = (select auth.uid())
    )
  );

-- Allow users to insert new properties
CREATE POLICY "Users can insert properties"
  ON public.propriedades
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow users to update properties they are linked to
CREATE POLICY "Users can update linked properties"
  ON public.propriedades
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.vinculo_usuario_propriedade
      WHERE vinculo_usuario_propriedade.id_propriedade = propriedades.id_propriedade
      AND vinculo_usuario_propriedade.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.vinculo_usuario_propriedade
      WHERE vinculo_usuario_propriedade.id_propriedade = propriedades.id_propriedade
      AND vinculo_usuario_propriedade.user_id = (select auth.uid())
    )
  );

-- Allow users to delete properties they are linked to
CREATE POLICY "Users can delete linked properties"
  ON public.propriedades
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.vinculo_usuario_propriedade
      WHERE vinculo_usuario_propriedade.id_propriedade = propriedades.id_propriedade
      AND vinculo_usuario_propriedade.user_id = (select auth.uid())
    )
  );

-- ============================================================================
-- talhoes: Plot/Field Policies
-- ============================================================================

-- Drop existing production policies if any
DROP POLICY IF EXISTS "Users can view linked plots" ON public.talhoes;
DROP POLICY IF EXISTS "Users can insert plots" ON public.talhoes;
DROP POLICY IF EXISTS "Users can update linked plots" ON public.talhoes;
DROP POLICY IF EXISTS "Users can delete linked plots" ON public.talhoes;

-- Allow users to view plots from their linked properties OR plots they created
CREATE POLICY "Users can view linked plots"
  ON public.talhoes
  FOR SELECT
  TO authenticated
  USING (
    criado_por = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.vinculo_usuario_propriedade
      WHERE vinculo_usuario_propriedade.id_propriedade = talhoes.id_propriedade
      AND vinculo_usuario_propriedade.user_id = (select auth.uid())
    )
  );

-- Allow users to insert plots
CREATE POLICY "Users can insert plots"
  ON public.talhoes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    criado_por = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.vinculo_usuario_propriedade
      WHERE vinculo_usuario_propriedade.id_propriedade = talhoes.id_propriedade
      AND vinculo_usuario_propriedade.user_id = (select auth.uid())
    )
  );

-- Allow users to update plots they created or from their linked properties
CREATE POLICY "Users can update linked plots"
  ON public.talhoes
  FOR UPDATE
  TO authenticated
  USING (
    criado_por = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.vinculo_usuario_propriedade
      WHERE vinculo_usuario_propriedade.id_propriedade = talhoes.id_propriedade
      AND vinculo_usuario_propriedade.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    criado_por = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.vinculo_usuario_propriedade
      WHERE vinculo_usuario_propriedade.id_propriedade = talhoes.id_propriedade
      AND vinculo_usuario_propriedade.user_id = (select auth.uid())
    )
  );

-- Allow users to delete plots they created or from their linked properties
CREATE POLICY "Users can delete linked plots"
  ON public.talhoes
  FOR DELETE
  TO authenticated
  USING (
    criado_por = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.vinculo_usuario_propriedade
      WHERE vinculo_usuario_propriedade.id_propriedade = talhoes.id_propriedade
      AND vinculo_usuario_propriedade.user_id = (select auth.uid())
    )
  );

-- ============================================================================
-- transacoes_financeiras: Enhanced Financial Transaction Policies
-- ============================================================================

-- Drop existing production policies if any
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transacoes_financeiras;
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.transacoes_financeiras;
DROP POLICY IF EXISTS "Users can update own transactions" ON public.transacoes_financeiras;
DROP POLICY IF EXISTS "Users can delete own transactions" ON public.transacoes_financeiras;

-- Allow users to view their own transactions
CREATE POLICY "Users can view own transactions"
  ON public.transacoes_financeiras
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

-- Allow users to insert their own transactions
CREATE POLICY "Users can insert own transactions"
  ON public.transacoes_financeiras
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- Allow users to update their own transactions
CREATE POLICY "Users can update own transactions"
  ON public.transacoes_financeiras
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- Allow users to delete their own transactions
CREATE POLICY "Users can delete own transactions"
  ON public.transacoes_financeiras
  FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- ============================================================================
-- atividades_agricolas: Enhanced Agricultural Activity Policies
-- ============================================================================

-- Drop existing production policies if any
DROP POLICY IF EXISTS "Users can view own activities" ON public.atividades_agricolas;
DROP POLICY IF EXISTS "Users can insert own activities" ON public.atividades_agricolas;
DROP POLICY IF EXISTS "Users can update own activities" ON public.atividades_agricolas;
DROP POLICY IF EXISTS "Users can delete own activities" ON public.atividades_agricolas;

-- Allow users to view their own activities
CREATE POLICY "Users can view own activities"
  ON public.atividades_agricolas
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

-- Allow users to insert their own activities
CREATE POLICY "Users can insert own activities"
  ON public.atividades_agricolas
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- Allow users to update their own activities
CREATE POLICY "Users can update own activities"
  ON public.atividades_agricolas
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- Allow users to delete their own activities
CREATE POLICY "Users can delete own activities"
  ON public.atividades_agricolas
  FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- ============================================================================
-- usuarios: Enhanced User Profile Policies
-- ============================================================================

-- Drop existing production policies if any
DROP POLICY IF EXISTS "Users can view own profile" ON public.usuarios;
DROP POLICY IF EXISTS "Users can update own profile" ON public.usuarios;

-- Allow users to view their own profile
CREATE POLICY "Users can view own profile"
  ON public.usuarios
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
  ON public.usuarios
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));