/*
  # Add RLS Policies for transacoes_talhoes Table

  ## Problem
  The transacoes_talhoes table has RLS enabled but NO policies defined.
  This causes the table to be completely inaccessible in production where
  RLS is enforced, resulting in talhao names showing as "Sem talhao especifico".
  
  In development, the service role key bypasses RLS, so the issue is not visible.

  ## Solution
  Add proper RLS policies for the transacoes_talhoes table allowing users
  to access rows where user_id matches auth.uid().

  ## Tables Updated
  
  ### 1. transacoes_talhoes
  - New SELECT policy: Users can view their own talhao links
  - New INSERT policy: Users can create talhao links for their transactions
  - New UPDATE policy: Users can update their own talhao links
  - New DELETE policy: Users can delete their own talhao links

  ## Security
  - All policies restricted to authenticated users only
  - All policies check user_id = auth.uid() for ownership verification
*/

-- ============================================================================
-- transacoes_talhoes: Transaction-Talhao Link Policies
-- ============================================================================

-- Drop any existing policies (if they exist) to avoid conflicts
DROP POLICY IF EXISTS "Users can view own transaction talhoes" ON public.transacoes_talhoes;
DROP POLICY IF EXISTS "Users can insert own transaction talhoes" ON public.transacoes_talhoes;
DROP POLICY IF EXISTS "Users can update own transaction talhoes" ON public.transacoes_talhoes;
DROP POLICY IF EXISTS "Users can delete own transaction talhoes" ON public.transacoes_talhoes;

-- Allow users to view their own transaction-talhao links
CREATE POLICY "Users can view own transaction talhoes"
  ON public.transacoes_talhoes
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

-- Allow users to insert transaction-talhao links for their transactions
CREATE POLICY "Users can insert own transaction talhoes"
  ON public.transacoes_talhoes
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- Allow users to update their own transaction-talhao links
CREATE POLICY "Users can update own transaction talhoes"
  ON public.transacoes_talhoes
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- Allow users to delete their own transaction-talhao links
CREATE POLICY "Users can delete own transaction talhoes"
  ON public.transacoes_talhoes
  FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));