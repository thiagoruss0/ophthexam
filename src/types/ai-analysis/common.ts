import { z } from "zod";

// ============= COMMON TYPES =============

export const QualityScoreSchema = z.enum(["boa", "moderada", "ruim"]);
export type QualityScore = z.infer<typeof QualityScoreSchema>;

export const LayerStatusSchema = z.enum(["normal", "alterada", "alterado", "ausente"]);
export type LayerStatus = z.infer<typeof LayerStatusSchema>;

export const SeveritySchema = z.enum(["leve", "moderado", "moderada", "severo", "severa"]);
export type Severity = z.infer<typeof SeveritySchema>;

export const ClassificationSchema = z.enum(["normal", "borderline", "anormal", "aumentada", "diminuida"]);
export type Classification = z.infer<typeof ClassificationSchema>;

export const EyeTypeSchema = z.enum(["od", "oe", "both"]);
export type EyeType = z.infer<typeof EyeTypeSchema>;

// ============= COMMON SCHEMAS =============

export const QualityAssessmentSchema = z.object({
  score: QualityScoreSchema,
  issues: z.array(z.string()).optional().default([]),
  centered: z.boolean().optional(),
  signal_strength: z.number().nullable().optional(),
});
export type QualityAssessment = z.infer<typeof QualityAssessmentSchema>;

export const LayerAnalysisSchema = z.object({
  status: LayerStatusSchema,
  description: z.string().optional().default(""),
});
export type LayerAnalysis = z.infer<typeof LayerAnalysisSchema>;

export const MeasurementValueSchema = z.object({
  value: z.number().nullable(),
  unit: z.string().default("μm"),
  classification: ClassificationSchema.optional(),
});
export type MeasurementValue = z.infer<typeof MeasurementValueSchema>;

export const BiomarkerPresenceSchema = z.object({
  present: z.boolean(),
  location: z.string().optional().default(""),
  severity: SeveritySchema.optional(),
});
export type BiomarkerPresence = z.infer<typeof BiomarkerPresenceSchema>;

export const DiagnosisSchema = z.object({
  primary: z.string(),
  secondary: z.array(z.string()).optional().default([]),
  differential: z.array(z.string()).optional().default([]),
});
export type Diagnosis = z.infer<typeof DiagnosisSchema>;

export const ComparisonSchema = z.object({
  symmetry: z.enum(["simetrico", "assimetrico"]).optional(),
  asymmetry_details: z.string().optional().default(""),
  notes: z.string().optional().default(""),
});
export type Comparison = z.infer<typeof ComparisonSchema>;

// ============= HELPER FUNCTIONS =============

/**
 * Safely parse analysis data with Zod schema
 * Returns parsed data or null if validation fails
 */
export function safeParseAnalysis<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  console.error("[AI Analysis] Validation error:", result.error.format());
  return { success: false, error: result.error };
}

/**
 * Parse analysis data with fallback to raw data
 * Logs warning if validation fails but returns raw data
 */
export function parseWithFallback<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  context: string
): T | unknown {
  const result = schema.safeParse(data);
  if (result.success) {
    return result.data;
  }
  console.warn(`[AI Analysis] Validation failed for ${context}:`, result.error.format());
  return data;
}
