import { z } from "zod";
import {
  QualityAssessmentSchema,
  DiagnosisSchema,
  SeveritySchema,
} from "./common";

// ============= OPTIC DISC RETINOGRAPHY =============

export const RetinographyOpticDiscSchema = z.object({
  appearance: z.enum(["normal", "alterado"]).optional(),
  color: z.string().optional().default(""),
  margins: z.enum(["nítidas", "borradas", "elevadas"]).optional(),
  cd_ratio: z.number().nullable().optional(),
  neuroretinal_rim: z.string().optional().default(""),
  excavation: z.string().optional().default(""),
  peripapillary_changes: z.string().optional().default(""),
  description: z.string().optional().default(""),
});
export type RetinographyOpticDisc = z.infer<typeof RetinographyOpticDiscSchema>;

// ============= MACULA =============

export const RetinographyMaculaSchema = z.object({
  appearance: z.enum(["normal", "alterada"]).optional(),
  foveal_reflex: z.enum(["presente", "ausente", "diminuído"]).optional(),
  pigment_changes: z.boolean().optional(),
  exudates: z.boolean().optional(),
  hemorrhages: z.boolean().optional(),
  edema_signs: z.boolean().optional(),
  drusen: z.boolean().optional(),
  description: z.string().optional().default(""),
});
export type RetinographyMacula = z.infer<typeof RetinographyMaculaSchema>;

// ============= VESSELS =============

export const RetinographyVesselsSchema = z.object({
  arteries: z.object({
    caliber: z.enum(["normal", "afinadas", "dilatadas"]).optional(),
    tortuosity: z.enum(["normal", "aumentada"]).optional(),
    description: z.string().optional().default(""),
  }).optional(),
  veins: z.object({
    caliber: z.enum(["normal", "dilatadas", "tortuosas"]).optional(),
    description: z.string().optional().default(""),
  }).optional(),
  av_ratio: z.string().optional().default(""),
  av_crossing: z.enum(["normal", "alterado"]).optional(),
  neovasos: z.boolean().optional(),
  description: z.string().optional().default(""),
});
export type RetinographyVessels = z.infer<typeof RetinographyVesselsSchema>;

// ============= RETINA GENERAL =============

export const RetinographyRetinaGeneralSchema = z.object({
  hemorrhages: z.object({
    present: z.boolean(),
    type: z.enum(["puntiformes", "em_chama", "prerretinianas", "subretinianas"]).optional(),
    location: z.string().optional().default(""),
    quadrants: z.array(z.string()).optional().default([]),
  }).optional(),
  exudates: z.object({
    present: z.boolean(),
    type: z.enum(["duros", "algodonosos"]).optional(),
    location: z.string().optional().default(""),
  }).optional(),
  microaneurysms: z.object({
    present: z.boolean(),
    quantity: z.enum(["poucos", "moderados", "muitos"]).optional(),
  }).optional(),
  cotton_wool_spots: z.object({
    present: z.boolean(),
    quantity: z.number().nullable().optional(),
    location: z.string().optional().default(""),
  }).optional(),
  pigment_changes: z.object({
    present: z.boolean(),
    type: z.string().optional().default(""),
    location: z.string().optional().default(""),
  }).optional(),
  atrophy: z.object({
    present: z.boolean(),
    location: z.string().optional().default(""),
  }).optional(),
  detachment_signs: z.object({
    present: z.boolean(),
    type: z.string().optional().default(""),
  }).optional(),
  description: z.string().optional().default(""),
});
export type RetinographyRetinaGeneral = z.infer<typeof RetinographyRetinaGeneralSchema>;

// ============= BIOMARKERS =============

export const RetinographyBiomarkersSchema = z.object({
  retinopatia_diabetica: z.object({
    present: z.boolean(),
    stage: z.enum(["leve", "moderada", "severa", "proliferativa"]).optional(),
    edema_macular: z.boolean().optional(),
  }).optional(),
  retinopatia_hipertensiva: z.object({
    present: z.boolean(),
    grade: z.enum(["1", "2", "3", "4"]).optional(),
  }).optional(),
  dmri: z.object({
    present: z.boolean(),
    type: z.enum(["seca", "úmida"]).optional(),
    stage: z.string().optional().default(""),
  }).optional(),
  oclusao_vascular: z.object({
    present: z.boolean(),
    type: z.enum(["arterial", "venosa"]).optional(),
    location: z.string().optional().default(""),
  }).optional(),
  papiledema: z.object({
    present: z.boolean(),
    grade: z.string().optional().default(""),
  }).optional(),
  nevus: z.object({
    present: z.boolean(),
    characteristics: z.string().optional().default(""),
  }).optional(),
});
export type RetinographyBiomarkers = z.infer<typeof RetinographyBiomarkersSchema>;

// ============= CLASSIFICATIONS =============

export const RetinographyClassificationsSchema = z.object({
  diabetic_retinopathy: z.object({
    stage: z.enum(["ausente", "leve", "moderada", "severa", "proliferativa"]).optional(),
    macular_edema: z.boolean().optional(),
  }).optional(),
  hypertensive_retinopathy: z.object({
    grade: z.enum(["0", "1", "2", "3", "4"]).optional(),
  }).optional(),
  amd: z.object({
    present: z.boolean(),
    type: z.enum(["seca", "úmida"]).optional(),
  }).optional(),
});
export type RetinographyClassifications = z.infer<typeof RetinographyClassificationsSchema>;

// ============= URGENCY =============

export const UrgencyLevelSchema = z.enum(["rotina", "prioritário", "urgente"]);
export type UrgencyLevel = z.infer<typeof UrgencyLevelSchema>;

export const RetinographyUrgencySchema = z.object({
  level: UrgencyLevelSchema.optional(),
  reason: z.string().optional().default(""),
  recommended_timeframe: z.string().optional().default(""),
});
export type RetinographyUrgency = z.infer<typeof RetinographyUrgencySchema>;

// ============= SINGLE EYE RETINOGRAPHY RESPONSE =============

export const RetinographySingleEyeResponseSchema = z.object({
  quality: QualityAssessmentSchema,
  optic_disc: RetinographyOpticDiscSchema.optional(),
  macula: RetinographyMaculaSchema.optional(),
  vessels: RetinographyVesselsSchema.optional(),
  retina_general: RetinographyRetinaGeneralSchema.optional(),
  biomarkers: RetinographyBiomarkersSchema.optional(),
  classifications: RetinographyClassificationsSchema.optional(),
  urgency: RetinographyUrgencySchema.optional(),
  diagnosis: DiagnosisSchema.optional(),
  recommendations: z.array(z.string()).optional().default([]),
  clinical_notes: z.string().optional().default(""),
});
export type RetinographySingleEyeResponse = z.infer<typeof RetinographySingleEyeResponseSchema>;

// ============= BILATERAL EYE DATA =============

export const RetinographyEyeDataSchema = z.object({
  quality: QualityAssessmentSchema.optional(),
  optic_disc: RetinographyOpticDiscSchema.optional(),
  macula: RetinographyMaculaSchema.optional(),
  vessels: RetinographyVesselsSchema.optional(),
  retina_general: RetinographyRetinaGeneralSchema.optional(),
  clinical_notes: z.string().optional().default(""),
});
export type RetinographyEyeData = z.infer<typeof RetinographyEyeDataSchema>;

// ============= COMPARISON =============

export const RetinographyComparisonSchema = z.object({
  symmetry: z.enum(["simetrico", "assimetrico"]).optional(),
  asymmetry_details: z.string().optional().default(""),
  significant_differences: z.array(z.string()).optional().default([]),
  notes: z.string().optional().default(""),
});
export type RetinographyComparison = z.infer<typeof RetinographyComparisonSchema>;

// ============= BILATERAL RETINOGRAPHY RESPONSE =============

export const RetinographyBilateralResponseSchema = z.object({
  bilateral: z.literal(true),
  od: RetinographyEyeDataSchema,
  oe: RetinographyEyeDataSchema,
  comparison: RetinographyComparisonSchema.optional(),
  classifications: RetinographyClassificationsSchema.optional(),
  urgency: RetinographyUrgencySchema.optional(),
  diagnosis: DiagnosisSchema.optional(),
  recommendations: z.array(z.string()).optional().default([]),
  overall_clinical_notes: z.string().optional().default(""),
});
export type RetinographyBilateralResponse = z.infer<typeof RetinographyBilateralResponseSchema>;

// ============= UNIFIED RETINOGRAPHY RESPONSE =============

export const RetinographyResponseSchema = z.union([
  RetinographyBilateralResponseSchema,
  RetinographySingleEyeResponseSchema,
]);
export type RetinographyResponse = z.infer<typeof RetinographyResponseSchema>;

// ============= TYPE GUARDS =============

export function isBilateralRetinography(
  response: RetinographyResponse
): response is RetinographyBilateralResponse {
  return "bilateral" in response && response.bilateral === true;
}

export function isSingleEyeRetinography(
  response: RetinographyResponse
): response is RetinographySingleEyeResponse {
  return !("bilateral" in response) || response.bilateral !== true;
}
