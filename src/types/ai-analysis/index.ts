// ============= AI ANALYSIS TYPES =============
// Central export for all AI analysis types and schemas

export * from "./common";
export * from "./oct-macular";
export * from "./oct-nerve";
export * from "./retinography";

import { z } from "zod";
import { OctMacularResponseSchema, type OctMacularResponse } from "./oct-macular";
import { OctNerveResponseSchema, type OctNerveResponse } from "./oct-nerve";
import { RetinographyResponseSchema, type RetinographyResponse } from "./retinography";

// ============= EXAM TYPE =============

export const ExamTypeSchema = z.enum(["oct_macular", "oct_nerve", "retinography"]);
export type ExamType = z.infer<typeof ExamTypeSchema>;

// ============= UNIFIED AI RESPONSE =============

export type AiAnalysisResponse = 
  | { examType: "oct_macular"; data: OctMacularResponse }
  | { examType: "oct_nerve"; data: OctNerveResponse }
  | { examType: "retinography"; data: RetinographyResponse };

// ============= DATABASE ANALYSIS RECORD =============

export const AiAnalysisRecordSchema = z.object({
  id: z.string().uuid(),
  exam_id: z.string().uuid(),
  analyzed_at: z.string(),
  quality_score: z.string().nullable(),
  findings: z.any().nullable(),
  biomarkers: z.any().nullable(),
  measurements: z.any().nullable(),
  diagnosis: z.array(z.string()).nullable(),
  recommendations: z.array(z.string()).nullable(),
  risk_classification: z.string().nullable(),
  optic_nerve_analysis: z.any().nullable(),
  retinography_analysis: z.any().nullable(),
  model_used: z.string().nullable(),
  raw_response: z.any().nullable(),
});
export type AiAnalysisRecord = z.infer<typeof AiAnalysisRecordSchema>;

// ============= ANALYSIS REQUEST =============

export const AnalysisRequestSchema = z.object({
  examId: z.string().uuid(),
  examType: ExamTypeSchema,
  eye: z.enum(["od", "oe", "both"]),
  imageUrls: z.array(z.string().url()).min(1, "At least one image is required"),
});
export type AnalysisRequest = z.infer<typeof AnalysisRequestSchema>;

// ============= ANALYSIS RESULT =============

export const AnalysisResultSchema = z.object({
  success: z.boolean(),
  analysisId: z.string().uuid().optional(),
  error: z.string().optional(),
});
export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;

// ============= VALIDATION HELPERS =============

/**
 * Validate and parse AI response based on exam type
 */
export function validateAiResponse(
  examType: ExamType,
  response: unknown
): { success: true; data: OctMacularResponse | OctNerveResponse | RetinographyResponse } | { success: false; error: z.ZodError } {
  switch (examType) {
    case "oct_macular":
      return OctMacularResponseSchema.safeParse(response) as any;
    case "oct_nerve":
      return OctNerveResponseSchema.safeParse(response) as any;
    case "retinography":
      return RetinographyResponseSchema.safeParse(response) as any;
  }
}

/**
 * Check if response is bilateral
 */
export function isBilateralResponse(response: unknown): boolean {
  return (
    typeof response === "object" &&
    response !== null &&
    "bilateral" in response &&
    (response as any).bilateral === true
  );
}

/**
 * Get quality score from any response type
 */
export function getQualityScoreFromResponse(response: unknown): string | null {
  if (!response || typeof response !== "object") return null;

  const r = response as any;

  // Bilateral response
  if (r.bilateral === true) {
    const odQuality = r.od?.quality?.score;
    const oeQuality = r.oe?.quality?.score;
    if (odQuality && oeQuality) {
      return odQuality === oeQuality ? odQuality : `OD: ${odQuality}, OE: ${oeQuality}`;
    }
    return odQuality || oeQuality || null;
  }

  // Single eye response
  return r.quality?.score || null;
}

/**
 * Extract diagnosis array from any response type
 */
export function getDiagnosisFromResponse(response: unknown): string[] {
  if (!response || typeof response !== "object") return [];

  const r = response as any;
  const diagnosis = r.diagnosis;

  if (!diagnosis) return [];

  const result: string[] = [];

  if (diagnosis.primary) {
    result.push(diagnosis.primary);
  }

  if (Array.isArray(diagnosis.secondary)) {
    result.push(...diagnosis.secondary.filter((d: string) => d && d.trim()));
  }

  return result;
}

/**
 * Extract recommendations from any response type
 */
export function getRecommendationsFromResponse(response: unknown): string[] {
  if (!response || typeof response !== "object") return [];

  const r = response as any;
  
  if (Array.isArray(r.recommendations)) {
    return r.recommendations.filter((rec: string) => rec && rec.trim());
  }

  return [];
}
