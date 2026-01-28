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

// ============= VALIDATION RESULT TYPES =============

export type ValidationSuccess<T> = {
  success: true;
  data: T;
  warnings: string[];
};

export type ValidationFailure = {
  success: false;
  error: z.ZodError;
  rawData: unknown;
  errorSummary: string;
};

export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

// ============= ERROR FORMATTING =============

/**
 * Format Zod error into human-readable summary
 */
export function formatZodError(error: z.ZodError): string {
  const issues = error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join(".") : "root";
    return `[${path}]: ${issue.message}`;
  });
  return issues.slice(0, 5).join("; ") + (issues.length > 5 ? ` (+${issues.length - 5} more)` : "");
}

/**
 * Extract field paths with errors for targeted logging
 */
export function getErrorPaths(error: z.ZodError): string[] {
  return error.issues.map((issue) => issue.path.join(".")).filter((p) => p.length > 0);
}

// ============= HELPER FUNCTIONS =============

/**
 * Safely parse analysis data with Zod schema
 * Returns parsed data or detailed error info
 */
export function safeParseAnalysis<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data, warnings: [] };
  }
  
  const errorSummary = formatZodError(result.error);
  console.error("[AI Analysis] Validation error:", errorSummary);
  
  return { 
    success: false, 
    error: result.error, 
    rawData: data,
    errorSummary 
  };
}

/**
 * Parse analysis data with fallback to raw data
 * Maintains backward compatibility - never throws
 * Logs warning if validation fails but returns raw data cast to expected type
 */
export function parseWithFallback<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  context: string
): T {
  if (data === null || data === undefined) {
    return data as T;
  }
  
  const result = schema.safeParse(data);
  if (result.success) {
    return result.data;
  }
  
  const errorSummary = formatZodError(result.error);
  console.warn(`[AI Analysis] Validation failed for ${context}: ${errorSummary}`);
  
  // Return raw data cast to T for backward compatibility
  // This allows existing code to continue working even with malformed data
  return data as T;
}

/**
 * Strict parse that throws on validation failure
 * Use only where validation is critical
 */
export function parseStrict<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  context: string
): T {
  const result = schema.safeParse(data);
  if (result.success) {
    return result.data;
  }
  
  const errorSummary = formatZodError(result.error);
  throw new Error(`[AI Analysis] Strict validation failed for ${context}: ${errorSummary}`);
}

/**
 * Partial parse that extracts valid fields and reports invalid ones
 * Useful for degraded functionality when some fields are malformed
 */
export function parsePartial<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>,
  data: unknown,
  context: string
): { data: Partial<z.infer<z.ZodObject<T>>>; invalidFields: string[]; validFields: string[] } {
  if (!data || typeof data !== "object") {
    return { data: {}, invalidFields: [], validFields: [] };
  }
  
  const partialSchema = schema.partial();
  const result = partialSchema.safeParse(data);
  
  if (result.success) {
    return { 
      data: result.data, 
      invalidFields: [], 
      validFields: Object.keys(result.data).filter(k => result.data[k] !== undefined)
    };
  }
  
  // Try to extract valid fields individually
  const validData: Record<string, unknown> = {};
  const invalidFields: string[] = [];
  const validFields: string[] = [];
  const inputData = data as Record<string, unknown>;
  
  for (const [key, fieldSchema] of Object.entries(schema.shape)) {
    if (key in inputData) {
      const fieldResult = (fieldSchema as z.ZodType).safeParse(inputData[key]);
      if (fieldResult.success) {
        validData[key] = fieldResult.data;
        validFields.push(key);
      } else {
        invalidFields.push(key);
        console.warn(`[AI Analysis] Field '${key}' failed validation in ${context}`);
      }
    }
  }
  
  return { data: validData as Partial<z.infer<z.ZodObject<T>>>, invalidFields, validFields };
}

// ============= TYPE COERCION HELPERS =============

/**
 * Safely coerce value to number, returning null if not possible
 */
export function coerceToNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return isNaN(value) ? null : value;
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}

/**
 * Safely coerce value to boolean
 */
export function coerceToBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    return value.toLowerCase() === "true" || value === "1";
  }
  if (typeof value === "number") return value !== 0;
  return false;
}

/**
 * Safely coerce value to string array
 */
export function coerceToStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((v) => typeof v === "string" && v.trim().length > 0);
  }
  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }
  return [];
}
