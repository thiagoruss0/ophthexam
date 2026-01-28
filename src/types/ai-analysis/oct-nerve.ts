import { z } from "zod";
import {
  QualityAssessmentSchema,
  MeasurementValueSchema,
  DiagnosisSchema,
  ClassificationSchema,
} from "./common";

// ============= RNFL SCHEMAS =============

export const RnflSectorSchema = z.object({
  value: z.number().nullable(),
  unit: z.string().default("μm"),
  classification: z.enum(["normal", "borderline", "anormal"]).optional(),
});
export type RnflSector = z.infer<typeof RnflSectorSchema>;

export const RnflAnalysisSchema = z.object({
  average: RnflSectorSchema.optional(),
  superior: RnflSectorSchema.optional(),
  inferior: RnflSectorSchema.optional(),
  nasal: RnflSectorSchema.optional(),
  temporal: RnflSectorSchema.optional(),
  symmetry: z.object({
    value: z.number().nullable().optional(),
    unit: z.string().default("%"),
    classification: z.enum(["normal", "assimetrico"]).optional(),
  }).optional(),
  thinning_location: z.array(z.string()).optional().default([]),
  defect_pattern: z.enum(["difuso", "localizado", "cunha", "nenhum"]).optional(),
});
export type RnflAnalysis = z.infer<typeof RnflAnalysisSchema>;

// ============= OPTIC DISC SCHEMAS =============

export const DiscAreaSchema = z.object({
  value: z.number().nullable(),
  unit: z.string().default("mm²"),
  classification: z.enum(["pequeno", "normal", "grande"]).optional(),
});

export const RimAreaSchema = z.object({
  value: z.number().nullable(),
  unit: z.string().default("mm²"),
  classification: z.enum(["normal", "reduzida"]).optional(),
});

export const CdRatioSchema = z.object({
  value: z.number().nullable(),
  classification: z.enum(["normal", "suspeita", "glaucomatosa"]).optional(),
});

export const IsntRuleSchema = z.object({
  preserved: z.boolean(),
  violated_sectors: z.array(z.string()).optional().default([]),
});

export const LocationPresenceSchema = z.object({
  present: z.boolean(),
  location: z.string().optional().default(""),
});

export const PeripapillaryAtrophySchema = z.object({
  present: z.boolean(),
  type: z.enum(["alfa", "beta"]).optional(),
  extent: z.string().optional().default(""),
});

export const OpticDiscAnalysisSchema = z.object({
  disc_area: DiscAreaSchema.optional(),
  cup_area: z.object({
    value: z.number().nullable(),
    unit: z.string().default("mm²"),
  }).optional(),
  rim_area: RimAreaSchema.optional(),
  cd_ratio_average: CdRatioSchema.optional(),
  cd_ratio_vertical: CdRatioSchema.optional(),
  isnt_rule: IsntRuleSchema.optional(),
  notch: LocationPresenceSchema.optional(),
  disc_hemorrhage: LocationPresenceSchema.optional(),
  peripapillary_atrophy: PeripapillaryAtrophySchema.optional(),
});
export type OpticDiscAnalysis = z.infer<typeof OpticDiscAnalysisSchema>;

// ============= GLAUCOMA BIOMARKERS =============

export const GlaucomaBiomarkersSchema = z.object({
  rnfl_wedge_defect: LocationPresenceSchema.optional(),
  rnfl_focal_thinning: LocationPresenceSchema.optional(),
  rim_thinning: LocationPresenceSchema.optional(),
  rim_notch: LocationPresenceSchema.optional(),
  disc_hemorrhage: LocationPresenceSchema.optional(),
});
export type GlaucomaBiomarkers = z.infer<typeof GlaucomaBiomarkersSchema>;

// ============= GANGLION CELL ANALYSIS =============

export const GanglionCellAnalysisSchema = z.object({
  average: MeasurementValueSchema.optional(),
  minimum: MeasurementValueSchema.optional(),
  sectors: z.record(MeasurementValueSchema).optional(),
  asymmetry: z.object({
    present: z.boolean(),
    description: z.string().optional().default(""),
  }).optional(),
});
export type GanglionCellAnalysis = z.infer<typeof GanglionCellAnalysisSchema>;

// ============= RISK CLASSIFICATION =============

export const RiskLevelSchema = z.enum(["baixo", "moderado", "alto"]);
export type RiskLevel = z.infer<typeof RiskLevelSchema>;

export const RiskClassificationSchema = z.object({
  glaucoma_risk: RiskLevelSchema.optional(),
  progression_risk: RiskLevelSchema.optional(),
  justification: z.string().optional().default(""),
});
export type RiskClassification = z.infer<typeof RiskClassificationSchema>;

// ============= NERVE DIAGNOSIS =============

export const OctNerveDiagnosisSchema = z.object({
  primary: z.string(),
  staging: z.enum(["suspeito", "inicial", "moderado", "avancado"]).optional(),
  secondary: z.array(z.string()).optional().default([]),
  differential: z.array(z.string()).optional().default([]),
});
export type OctNerveDiagnosis = z.infer<typeof OctNerveDiagnosisSchema>;

// ============= COMPARISON =============

export const OctNerveComparisonSchema = z.object({
  od_oe_asymmetry: z.object({
    significant: z.boolean(),
    description: z.string().optional().default(""),
  }).optional(),
  rnfl_asymmetry_percentage: z.number().nullable().optional(),
  symmetry: z.enum(["simetrico", "assimetrico"]).optional(),
});
export type OctNerveComparison = z.infer<typeof OctNerveComparisonSchema>;

// ============= SINGLE EYE OCT NERVE RESPONSE =============

export const OctNerveSingleEyeResponseSchema = z.object({
  quality: QualityAssessmentSchema,
  rnfl: RnflAnalysisSchema.optional(),
  optic_disc: OpticDiscAnalysisSchema.optional(),
  ganglion_cell_analysis: GanglionCellAnalysisSchema.optional(),
  biomarkers_glaucoma: GlaucomaBiomarkersSchema.optional(),
  comparison: z.object({
    previous_exam: z.object({
      date: z.string().optional(),
      progression: z.string().optional(),
    }).optional(),
  }).optional(),
  risk_classification: RiskClassificationSchema.optional(),
  diagnosis: OctNerveDiagnosisSchema.optional(),
  recommendations: z.array(z.string()).optional().default([]),
  clinical_notes: z.string().optional().default(""),
});
export type OctNerveSingleEyeResponse = z.infer<typeof OctNerveSingleEyeResponseSchema>;

// ============= BILATERAL EYE DATA =============

export const OctNerveEyeDataSchema = z.object({
  quality: QualityAssessmentSchema.optional(),
  rnfl: RnflAnalysisSchema.optional(),
  optic_disc: OpticDiscAnalysisSchema.optional(),
  biomarkers_glaucoma: GlaucomaBiomarkersSchema.optional(),
  clinical_notes: z.string().optional().default(""),
});
export type OctNerveEyeData = z.infer<typeof OctNerveEyeDataSchema>;

// ============= BILATERAL OCT NERVE RESPONSE =============

export const OctNerveBilateralResponseSchema = z.object({
  bilateral: z.literal(true),
  od: OctNerveEyeDataSchema,
  oe: OctNerveEyeDataSchema,
  comparison: OctNerveComparisonSchema.optional(),
  risk_classification: RiskClassificationSchema.optional(),
  diagnosis: OctNerveDiagnosisSchema.optional(),
  recommendations: z.array(z.string()).optional().default([]),
  overall_clinical_notes: z.string().optional().default(""),
});
export type OctNerveBilateralResponse = z.infer<typeof OctNerveBilateralResponseSchema>;

// ============= UNIFIED OCT NERVE RESPONSE =============

export const OctNerveResponseSchema = z.union([
  OctNerveBilateralResponseSchema,
  OctNerveSingleEyeResponseSchema,
]);
export type OctNerveResponse = z.infer<typeof OctNerveResponseSchema>;

// ============= TYPE GUARDS =============

export function isBilateralOctNerve(
  response: OctNerveResponse
): response is OctNerveBilateralResponse {
  return "bilateral" in response && response.bilateral === true;
}

export function isSingleEyeOctNerve(
  response: OctNerveResponse
): response is OctNerveSingleEyeResponse {
  return !("bilateral" in response) || response.bilateral !== true;
}
