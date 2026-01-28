import { supabase } from "@/integrations/supabase/client";

export interface FeedbackStats {
  totalFeedbacks: number;
  avgRating: number;
  correctRate: number;
  partialRate: number;
  incorrectRate: number;
  referenceCasesCount: number;
}

export interface AccuracyByExamType {
  examType: string;
  correct: number;
  partial: number;
  incorrect: number;
  total: number;
  correctRate: number;
}

export interface DiagnosisAccuracy {
  diagnosis: string;
  correctCount: number;
  removedCount: number;
  accuracy: number;
}

export interface ValidationMetrics {
  totalValidations: number;
  successRate: number;
  commonWarnings: { field: string; count: number }[];
  validationTrend: { date: string; successRate: number }[];
}

export interface LearningInsights {
  mostMissedDiagnoses: { diagnosis: string; missCount: number }[];
  mostAddedDiagnoses: { diagnosis: string; addCount: number }[];
  qualityDisagreementRate: number;
  avgDifficultyRating: Record<string, number>;
  topPathologyTags: { tag: string; count: number }[];
}

export interface TrainingDataExport {
  exam_id: string;
  exam_type: string;
  diagnosis_correct: string[] | null;
  diagnosis_added: string[] | null;
  pathology_tags: string[] | null;
  case_difficulty: string | null;
  overall_rating: number | null;
  teaching_notes: string | null;
  images: { image_url: string }[];
  analysis: any;
}

/**
 * Fetch overall feedback statistics
 */
export async function fetchFeedbackStats(): Promise<FeedbackStats> {
  const { data: allFeedback, error } = await supabase
    .from("ai_feedback")
    .select("overall_rating, accuracy_rating, is_reference_case");

  if (error) throw error;

  const total = allFeedback?.length || 0;
  
  if (total === 0) {
    return {
      totalFeedbacks: 0,
      avgRating: 0,
      correctRate: 0,
      partialRate: 0,
      incorrectRate: 0,
      referenceCasesCount: 0,
    };
  }

  const ratings = allFeedback
    ?.filter((f) => f.overall_rating !== null)
    .map((f) => f.overall_rating as number) || [];
  
  const avgRating = ratings.length > 0 
    ? ratings.reduce((a, b) => a + b, 0) / ratings.length 
    : 0;

  const accuracyCounts = {
    correct: allFeedback?.filter((f) => f.accuracy_rating === "correct").length || 0,
    partial: allFeedback?.filter((f) => f.accuracy_rating === "partially_correct").length || 0,
    incorrect: allFeedback?.filter((f) => f.accuracy_rating === "incorrect").length || 0,
  };

  const referenceCasesCount = allFeedback?.filter((f) => f.is_reference_case).length || 0;

  return {
    totalFeedbacks: total,
    avgRating,
    correctRate: (accuracyCounts.correct / total) * 100,
    partialRate: (accuracyCounts.partial / total) * 100,
    incorrectRate: (accuracyCounts.incorrect / total) * 100,
    referenceCasesCount,
  };
}

/**
 * Fetch accuracy breakdown by exam type
 */
export async function fetchAccuracyByExamType(): Promise<AccuracyByExamType[]> {
  const { data, error } = await supabase
    .from("ai_feedback")
    .select(`
      accuracy_rating,
      exams!inner(exam_type)
    `);

  if (error) throw error;

  const typeStats: Record<string, { correct: number; partial: number; incorrect: number }> = {};
  
  data?.forEach((f: any) => {
    const type = f.exams?.exam_type;
    if (!type) return;
    
    if (!typeStats[type]) {
      typeStats[type] = { correct: 0, partial: 0, incorrect: 0 };
    }
    
    if (f.accuracy_rating === "correct") typeStats[type].correct++;
    else if (f.accuracy_rating === "partially_correct") typeStats[type].partial++;
    else if (f.accuracy_rating === "incorrect") typeStats[type].incorrect++;
  });

  return Object.entries(typeStats).map(([examType, counts]) => {
    const total = counts.correct + counts.partial + counts.incorrect;
    return {
      examType,
      ...counts,
      total,
      correctRate: total > 0 ? (counts.correct / total) * 100 : 0,
    };
  });
}

/**
 * Analyze diagnosis accuracy from feedback
 */
export async function analyzeDiagnosisAccuracy(): Promise<DiagnosisAccuracy[]> {
  const { data, error } = await supabase
    .from("ai_feedback")
    .select("diagnosis_correct, diagnosis_removed");

  if (error) throw error;

  const diagnosisStats: Record<string, { correct: number; removed: number }> = {};

  data?.forEach((f) => {
    // Count confirmed diagnoses
    f.diagnosis_correct?.forEach((d: string) => {
      if (!diagnosisStats[d]) diagnosisStats[d] = { correct: 0, removed: 0 };
      diagnosisStats[d].correct++;
    });

    // Count removed diagnoses
    f.diagnosis_removed?.forEach((d: string) => {
      if (!diagnosisStats[d]) diagnosisStats[d] = { correct: 0, removed: 0 };
      diagnosisStats[d].removed++;
    });
  });

  return Object.entries(diagnosisStats)
    .map(([diagnosis, stats]) => {
      const total = stats.correct + stats.removed;
      return {
        diagnosis,
        correctCount: stats.correct,
        removedCount: stats.removed,
        accuracy: total > 0 ? (stats.correct / total) * 100 : 0,
      };
    })
    .sort((a, b) => b.correctCount + b.removedCount - (a.correctCount + a.removedCount));
}

/**
 * Generate learning insights from feedback data
 */
export async function generateLearningInsights(): Promise<LearningInsights> {
  const { data, error } = await supabase
    .from("ai_feedback")
    .select(`
      diagnosis_removed,
      diagnosis_added,
      quality_feedback,
      case_difficulty,
      pathology_tags
    `);

  if (error) throw error;

  // Most missed diagnoses (removed by doctors)
  const missedDiagnoses: Record<string, number> = {};
  data?.forEach((f) => {
    f.diagnosis_removed?.forEach((d: string) => {
      missedDiagnoses[d] = (missedDiagnoses[d] || 0) + 1;
    });
  });

  const mostMissedDiagnoses = Object.entries(missedDiagnoses)
    .map(([diagnosis, missCount]) => ({ diagnosis, missCount }))
    .sort((a, b) => b.missCount - a.missCount)
    .slice(0, 10);

  // Most added diagnoses (missed by AI)
  const addedDiagnoses: Record<string, number> = {};
  data?.forEach((f) => {
    f.diagnosis_added?.forEach((d: string) => {
      addedDiagnoses[d] = (addedDiagnoses[d] || 0) + 1;
    });
  });

  const mostAddedDiagnoses = Object.entries(addedDiagnoses)
    .map(([diagnosis, addCount]) => ({ diagnosis, addCount }))
    .sort((a, b) => b.addCount - a.addCount)
    .slice(0, 10);

  // Quality disagreement rate
  const qualityFeedbacks = data?.filter((f) => f.quality_feedback !== null) || [];
  const disagreements = qualityFeedbacks.filter((f) => f.quality_feedback === "disagree").length;
  const qualityDisagreementRate = qualityFeedbacks.length > 0 
    ? (disagreements / qualityFeedbacks.length) * 100 
    : 0;

  // Average difficulty rating distribution
  const difficultyCount: Record<string, number> = {};
  data?.forEach((f) => {
    if (f.case_difficulty) {
      difficultyCount[f.case_difficulty] = (difficultyCount[f.case_difficulty] || 0) + 1;
    }
  });

  // Top pathology tags
  const tagCounts: Record<string, number> = {};
  data?.forEach((f) => {
    f.pathology_tags?.forEach((tag: string) => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });

  const topPathologyTags = Object.entries(tagCounts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  return {
    mostMissedDiagnoses,
    mostAddedDiagnoses,
    qualityDisagreementRate,
    avgDifficultyRating: difficultyCount,
    topPathologyTags,
  };
}

/**
 * Fetch validation metrics from raw_response._validation data
 */
export async function fetchValidationMetrics(): Promise<ValidationMetrics> {
  const { data, error } = await supabase
    .from("ai_analysis")
    .select("raw_response, analyzed_at")
    .order("analyzed_at", { ascending: false })
    .limit(500);

  if (error) throw error;

  let validCount = 0;
  let totalWithValidation = 0;
  const warningCounts: Record<string, number> = {};
  const dailyStats: Record<string, { valid: number; total: number }> = {};

  data?.forEach((analysis) => {
    const rawResponse = analysis.raw_response as any;
    const validation = rawResponse?._validation;
    
    if (!validation) return;
    
    totalWithValidation++;
    
    if (validation.isValid) {
      validCount++;
    }

    // Count warnings by field
    validation.warnings?.forEach((warning: string) => {
      // Extract field name from warning message
      const fieldMatch = warning.match(/\[([^\]]+)\]/);
      const field = fieldMatch ? fieldMatch[1] : "unknown";
      warningCounts[field] = (warningCounts[field] || 0) + 1;
    });

    // Group by date for trend
    const date = analysis.analyzed_at.split("T")[0];
    if (!dailyStats[date]) {
      dailyStats[date] = { valid: 0, total: 0 };
    }
    dailyStats[date].total++;
    if (validation.isValid) {
      dailyStats[date].valid++;
    }
  });

  const commonWarnings = Object.entries(warningCounts)
    .map(([field, count]) => ({ field, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const validationTrend = Object.entries(dailyStats)
    .map(([date, stats]) => ({
      date,
      successRate: stats.total > 0 ? (stats.valid / stats.total) * 100 : 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30); // Last 30 days

  return {
    totalValidations: totalWithValidation,
    successRate: totalWithValidation > 0 ? (validCount / totalWithValidation) * 100 : 0,
    commonWarnings,
    validationTrend,
  };
}

/**
 * Export training data for high-quality reference cases
 */
export async function exportTrainingData(minRating: number = 4): Promise<TrainingDataExport[]> {
  const { data, error } = await supabase
    .from("ai_feedback")
    .select(`
      exam_id,
      diagnosis_correct,
      diagnosis_added,
      pathology_tags,
      case_difficulty,
      overall_rating,
      teaching_notes,
      exams!inner(
        exam_type,
        exam_images(image_url),
        ai_analysis(findings, biomarkers, measurements, diagnosis, recommendations)
      )
    `)
    .eq("is_reference_case", true)
    .gte("overall_rating", minRating);

  if (error) throw error;

  return (data || []).map((item: any) => ({
    exam_id: item.exam_id,
    exam_type: item.exams?.exam_type,
    diagnosis_correct: item.diagnosis_correct,
    diagnosis_added: item.diagnosis_added,
    pathology_tags: item.pathology_tags,
    case_difficulty: item.case_difficulty,
    overall_rating: item.overall_rating,
    teaching_notes: item.teaching_notes,
    images: item.exams?.exam_images || [],
    analysis: item.exams?.ai_analysis?.[0] || null,
  }));
}

/**
 * Calculate model improvement suggestions based on feedback patterns
 */
export async function generateImprovementSuggestions(): Promise<string[]> {
  const insights = await generateLearningInsights();
  const stats = await fetchFeedbackStats();
  const suggestions: string[] = [];

  // High rate of removed diagnoses for specific conditions
  insights.mostMissedDiagnoses.slice(0, 3).forEach((item) => {
    if (item.missCount >= 3) {
      suggestions.push(
        `Melhorar detecção de "${item.diagnosis}" - removido ${item.missCount} vezes pelos médicos`
      );
    }
  });

  // Diagnoses frequently added by doctors
  insights.mostAddedDiagnoses.slice(0, 3).forEach((item) => {
    if (item.addCount >= 3) {
      suggestions.push(
        `IA não detectou "${item.diagnosis}" em ${item.addCount} casos - considerar ajuste de sensibilidade`
      );
    }
  });

  // Quality score disagreement
  if (insights.qualityDisagreementRate > 20) {
    suggestions.push(
      `Taxa de discordância de qualidade: ${insights.qualityDisagreementRate.toFixed(1)}% - revisar critérios de avaliação de qualidade`
    );
  }

  // Low overall accuracy
  if (stats.correctRate < 70) {
    suggestions.push(
      `Taxa de acerto geral: ${stats.correctRate.toFixed(1)}% - considerar retreinamento do modelo`
    );
  }

  // High partial rate
  if (stats.partialRate > 30) {
    suggestions.push(
      `${stats.partialRate.toFixed(1)}% das análises são parcialmente corretas - refinar detalhes das detecções`
    );
  }

  return suggestions;
}
