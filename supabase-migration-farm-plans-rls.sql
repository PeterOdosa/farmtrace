-- Add missing UPDATE and DELETE policies for farm_plans
-- Previously only had SELECT and INSERT

CREATE POLICY "Users can update plans on owned farms"
  ON public.farm_plans FOR UPDATE
  USING (farm_id IN (SELECT id FROM public.farms WHERE owner_id = auth.uid())
    OR farm_id IN (SELECT farm_id FROM public.collaborations WHERE agronomist_id = auth.uid()));

CREATE POLICY "Users can delete plans on owned farms"
  ON public.farm_plans FOR DELETE
  USING (farm_id IN (SELECT id FROM public.farms WHERE owner_id = auth.uid())
    OR farm_id IN (SELECT farm_id FROM public.collaborations WHERE agronomist_id = auth.uid()));
