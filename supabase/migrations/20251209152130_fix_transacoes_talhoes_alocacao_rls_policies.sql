/*
  # Fix RLS Policies for transacoes_talhoes_alocacao Table

  ## Problem
  The existing INSERT, UPDATE, and DELETE policies for transacoes_talhoes_alocacao
  have a bug in the WHERE clause:
  
  WRONG: `tf.id_transacao = tf.id_transacao` (always true - compares column to itself)
  RIGHT: `tf.id_transacao = transacoes_talhoes_alocacao.id_transacao` (proper join)
  
  The SELECT policy was correct, but INSERT/UPDATE/DELETE policies were not
  properly checking ownership through the transaction relationship.

  ## Solution
  Drop and recreate the buggy policies with the correct join condition.

  ## Tables Updated
  
  ### 1. transacoes_talhoes_alocacao
  - Fixed INSERT policy: Properly checks transaction ownership
  - Fixed UPDATE policy: Properly checks transaction ownership
  - Fixed DELETE policy: Properly checks transaction ownership
  - SELECT policy unchanged (was already correct)

  ## Security
  - All policies restricted to authenticated users only
  - All policies verify ownership via transacoes_financeiras.user_id = auth.uid()
*/

-- ============================================================================
-- transacoes_talhoes_alocacao: Fix Buggy Policies
-- ============================================================================

-- Drop the buggy policies
DROP POLICY IF EXISTS "Users can create allocations for own transactions" ON public.transacoes_talhoes_alocacao;
DROP POLICY IF EXISTS "Users can update allocations for own transactions" ON public.transacoes_talhoes_alocacao;
DROP POLICY IF EXISTS "Users can delete allocations for own transactions" ON public.transacoes_talhoes_alocacao;

-- Recreate INSERT policy with correct join
CREATE POLICY "Users can create allocations for own transactions"
  ON public.transacoes_talhoes_alocacao
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.transacoes_financeiras tf
      WHERE tf.id_transacao = transacoes_talhoes_alocacao.id_transacao
      AND tf.user_id = (select auth.uid())
    )
  );

-- Recreate UPDATE policy with correct join
CREATE POLICY "Users can update allocations for own transactions"
  ON public.transacoes_talhoes_alocacao
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.transacoes_financeiras tf
      WHERE tf.id_transacao = transacoes_talhoes_alocacao.id_transacao
      AND tf.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.transacoes_financeiras tf
      WHERE tf.id_transacao = transacoes_talhoes_alocacao.id_transacao
      AND tf.user_id = (select auth.uid())
    )
  );

-- Recreate DELETE policy with correct join
CREATE POLICY "Users can delete allocations for own transactions"
  ON public.transacoes_talhoes_alocacao
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.transacoes_financeiras tf
      WHERE tf.id_transacao = transacoes_talhoes_alocacao.id_transacao
      AND tf.user_id = (select auth.uid())
    )
  );