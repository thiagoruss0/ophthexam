-- Allow users to delete analysis of their exams
CREATE POLICY "Users can delete analysis of their exams" 
ON public.ai_analysis 
FOR DELETE 
USING (EXISTS ( 
  SELECT 1 FROM exams 
  WHERE exams.id = ai_analysis.exam_id 
    AND exams.doctor_id = get_profile_id(auth.uid())
));