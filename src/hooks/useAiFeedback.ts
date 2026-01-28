import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface AiFeedbackData {
  id: string;
  exam_id: string;
  ai_analysis_id: string | null;
  doctor_id: string;
  overall_rating: number | null;
  accuracy_rating: string | null;
  quality_feedback: string | null;
  quality_correct: string | null;
  diagnosis_feedback: string | null;
  diagnosis_added: string[] | null;
  diagnosis_removed: string[] | null;
  diagnosis_correct: string[] | null;
  general_comments: string | null;
  teaching_notes: string | null;
  is_reference_case: boolean | null;
  case_difficulty: string | null;
  pathology_tags: string[] | null;
  created_at: string | null;
}

export interface FeedbackSubmitData {
  exam_id: string;
  ai_analysis_id?: string | null;
  doctor_id: string;
  overall_rating: number;
  accuracy_rating?: string | null;
  quality_feedback?: string | null;
  quality_correct?: string | null;
  diagnosis_feedback?: string | null;
  diagnosis_added?: string[] | null;
  diagnosis_removed?: string[] | null;
  diagnosis_correct?: string[] | null;
  general_comments?: string | null;
  teaching_notes?: string | null;
  is_reference_case?: boolean;
  case_difficulty?: string | null;
  pathology_tags?: string[] | null;
}

interface UseAiFeedbackReturn {
  feedback: AiFeedbackData | null;
  isLoading: boolean;
  isSubmitting: boolean;
  hasFeedback: boolean;
  fetchFeedback: (examId: string, doctorId: string) => Promise<void>;
  submitFeedback: (data: FeedbackSubmitData) => Promise<boolean>;
  updateFeedback: (id: string, data: Partial<FeedbackSubmitData>) => Promise<boolean>;
  deleteFeedback: (id: string) => Promise<boolean>;
}

export function useAiFeedback(): UseAiFeedbackReturn {
  const { toast } = useToast();
  const [feedback, setFeedback] = useState<AiFeedbackData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchFeedback = useCallback(async (examId: string, doctorId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("ai_feedback")
        .select("*")
        .eq("exam_id", examId)
        .eq("doctor_id", doctorId)
        .maybeSingle();

      if (error) throw error;
      setFeedback(data as AiFeedbackData | null);
    } catch (error) {
      console.error("Error fetching feedback:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const submitFeedback = useCallback(async (data: FeedbackSubmitData): Promise<boolean> => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("ai_feedback").insert(data);

      if (error) throw error;

      toast({ title: "Feedback enviado com sucesso!" });
      
      // Refresh feedback after submit
      await fetchFeedback(data.exam_id, data.doctor_id);
      return true;
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast({ title: "Erro ao enviar feedback", variant: "destructive" });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [toast, fetchFeedback]);

  const updateFeedback = useCallback(async (id: string, data: Partial<FeedbackSubmitData>): Promise<boolean> => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("ai_feedback")
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;

      toast({ title: "Feedback atualizado!" });
      return true;
    } catch (error) {
      console.error("Error updating feedback:", error);
      toast({ title: "Erro ao atualizar feedback", variant: "destructive" });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [toast]);

  const deleteFeedback = useCallback(async (id: string): Promise<boolean> => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("ai_feedback").delete().eq("id", id);

      if (error) throw error;

      setFeedback(null);
      toast({ title: "Feedback removido" });
      return true;
    } catch (error) {
      console.error("Error deleting feedback:", error);
      toast({ title: "Erro ao remover feedback", variant: "destructive" });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [toast]);

  return {
    feedback,
    isLoading,
    isSubmitting,
    hasFeedback: feedback !== null,
    fetchFeedback,
    submitFeedback,
    updateFeedback,
    deleteFeedback,
  };
}

// Hook for counting exams without feedback
export function useExamsWithoutFeedback(doctorProfileId: string | undefined) {
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const fetchCount = useCallback(async () => {
    if (!doctorProfileId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc("count_exams_without_feedback", {
        doctor_profile_id: doctorProfileId,
      });

      if (error) throw error;
      setCount(data || 0);
    } catch (error) {
      console.error("Error counting exams without feedback:", error);
    } finally {
      setIsLoading(false);
    }
  }, [doctorProfileId]);

  return { count, isLoading, fetchCount };
}
