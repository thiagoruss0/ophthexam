-- Fix security warnings: update overly permissive policies

-- 1. Drop the overly permissive ai_analysis INSERT policy
DROP POLICY IF EXISTS "System can insert analysis" ON public.ai_analysis;

-- 2. Drop the overly permissive audit_log INSERT policy  
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_log;

-- 3. Create more restrictive policies for ai_analysis
-- Allow authenticated users to insert analysis for their own exams
CREATE POLICY "Users can insert analysis for their exams"
    ON public.ai_analysis FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.exams 
            WHERE exams.id = ai_analysis.exam_id 
            AND exams.doctor_id = public.get_profile_id(auth.uid())
        )
    );

-- 4. Create more restrictive policy for audit_log
-- Allow authenticated users to insert audit logs
CREATE POLICY "Authenticated users can insert audit logs"
    ON public.audit_log FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- 5. Fix function search_path for update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;