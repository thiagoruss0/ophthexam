import { z } from "zod";
import {
  QualityAssessmentSchema,
  LayerAnalysisSchema,
  MeasurementValueSchema,
  BiomarkerPresenceSchema,
  DiagnosisSchema,
  ComparisonSchema,
  SeveritySchema,
} from "./common";

// ============= OCT MACULAR LAYER SCHEMAS =============

export const OctMacularLayersSchema = z.object({
  vitreoretinal_interface: LayerAnalysisSchema.optional(),
  mli: LayerAnalysisSchema.optional(),
  cfnr: LayerAnalysisSchema.optional(),
  ccg: LayerAnalysisSchema.optional(),
  cpi: LayerAnalysisSchema.optional(),
  cni: LayerAnalysisSchema.optional(),
  cpe: LayerAnalysisSchema.optional(),
  cne: LayerAnalysisSchema.optional(),
  zona_elipsoide: LayerAnalysisSchema.optional(),
  epr: LayerAnalysisSchema.optional(),
  membrana_bruch: LayerAnalysisSchema.optional(),
  coroide: LayerAnalysisSchema.optional(),
});
export type OctMacularLayers = z.infer<typeof OctMacularLayersSchema>;

// ============= OCT MACULAR BIOMARKERS =============

export const FluidoPresenceSchema = z.object({
  present: z.boolean(),
  location: z.string().optional().default(""),
  severity: SeveritySchema.optional(),
});

export const DepPresenceSchema = z.object({
  present: z.boolean(),
  type: z.enum(["seroso", "fibrovascular", "drusenoide"]).optional(),
  height: z.string().optional().default(""),
});

export const DrusasPresenceSchema = z.object({
  present: z.boolean(),
  size: z.enum(["pequenas", "medias", "grandes"]).optional(),
  type: z.enum(["duras", "moles"]).optional(),
  location: z.string().optional().default(""),
});

export const MembranaEpirretinaSchema = z.object({
  present: z.boolean(),
  severity: SeveritySchema.optional(),
  traction: z.boolean().optional(),
});

export const TracaoVitreoMacularSchema = z.object({
  present: z.boolean(),
  type: z.enum(["adesao", "tracao"]).optional(),
  width: z.string().optional().default(""),
});

export const BuracoMacularSchema = z.object({
  present: z.boolean(),
  stage: z.enum(["1", "2", "3", "4"]).optional(),
  size: z.string().optional().default(""),
});

export const EdemaMacularSchema = z.object({
  present: z.boolean(),
  type: z.enum(["cistoide", "difuso"]).optional(),
  severity: SeveritySchema.optional(),
});

export const MaterialHiperreflectivoSchema = z.object({
  present: z.boolean(),
  location: z.enum(["sub_epr", "subretiniano", "intraretiniano"]).optional(),
});

export const PontosHiperreflectivosSchema = z.object({
  present: z.boolean(),
  quantity: z.enum(["poucos", "moderados", "muitos"]).optional(),
});

export const OctMacularBiomarkersSchema = z.object({
  fluido_intraretiniano: FluidoPresenceSchema.optional(),
  fluido_subretiniano: FluidoPresenceSchema.optional(),
  dep: DepPresenceSchema.optional(),
  drusas: DrusasPresenceSchema.optional(),
  atrofia_epr: BiomarkerPresenceSchema.optional(),
  membrana_epirretiniana: MembranaEpirretinaSchema.optional(),
  tracao_vitreomacular: TracaoVitreoMacularSchema.optional(),
  buraco_macular: BuracoMacularSchema.optional(),
  edema_macular: EdemaMacularSchema.optional(),
  material_hiperreflectivo: MaterialHiperreflectivoSchema.optional(),
  pontos_hiperreflectivos: PontosHiperreflectivosSchema.optional(),
  atrofia_externa: BiomarkerPresenceSchema.optional(),
  desorganizacao_camadas: BiomarkerPresenceSchema.optional(),
});
export type OctMacularBiomarkers = z.infer<typeof OctMacularBiomarkersSchema>;

// ============= OCT MACULAR MEASUREMENTS =============

export const OctMacularMeasurementsSchema = z.object({
  central_foveal_thickness: MeasurementValueSchema.optional(),
  subfoveal_choroidal_thickness: MeasurementValueSchema.optional(),
  subretinal_fluid_height: MeasurementValueSchema.optional(),
  dep_height: MeasurementValueSchema.optional(),
});
export type OctMacularMeasurements = z.infer<typeof OctMacularMeasurementsSchema>;

// ============= SINGLE EYE OCT MACULAR RESPONSE =============

export const OctMacularSingleEyeResponseSchema = z.object({
  quality: QualityAssessmentSchema,
  layers: OctMacularLayersSchema.optional(),
  foveal_depression: LayerAnalysisSchema.optional(),
  retinal_surface: LayerAnalysisSchema.optional(),
  inner_layers: LayerAnalysisSchema.optional(),
  outer_layers: LayerAnalysisSchema.optional(),
  rpe_choroid_complex: LayerAnalysisSchema.optional(),
  biomarkers: OctMacularBiomarkersSchema.optional(),
  measurements: OctMacularMeasurementsSchema.optional(),
  diagnosis: DiagnosisSchema.optional(),
  recommendations: z.array(z.string()).optional().default([]),
  clinical_notes: z.string().optional().default(""),
});
export type OctMacularSingleEyeResponse = z.infer<typeof OctMacularSingleEyeResponseSchema>;

// ============= BILATERAL OCT MACULAR RESPONSE =============

export const OctMacularEyeDataSchema = z.object({
  quality: QualityAssessmentSchema.optional(),
  layers: OctMacularLayersSchema.optional(),
  foveal_depression: LayerAnalysisSchema.optional(),
  biomarkers: OctMacularBiomarkersSchema.optional(),
  measurements: OctMacularMeasurementsSchema.optional(),
  clinical_notes: z.string().optional().default(""),
});
export type OctMacularEyeData = z.infer<typeof OctMacularEyeDataSchema>;

export const OctMacularBilateralResponseSchema = z.object({
  bilateral: z.literal(true),
  od: OctMacularEyeDataSchema,
  oe: OctMacularEyeDataSchema,
  comparison: ComparisonSchema.optional(),
  diagnosis: DiagnosisSchema.optional(),
  recommendations: z.array(z.string()).optional().default([]),
  overall_clinical_notes: z.string().optional().default(""),
});
export type OctMacularBilateralResponse = z.infer<typeof OctMacularBilateralResponseSchema>;

// ============= UNIFIED OCT MACULAR RESPONSE =============

export const OctMacularResponseSchema = z.union([
  OctMacularBilateralResponseSchema,
  OctMacularSingleEyeResponseSchema,
]);
export type OctMacularResponse = z.infer<typeof OctMacularResponseSchema>;

// ============= TYPE GUARDS =============

export function isBilateralOctMacular(
  response: OctMacularResponse
): response is OctMacularBilateralResponse {
  return "bilateral" in response && response.bilateral === true;
}

export function isSingleEyeOctMacular(
  response: OctMacularResponse
): response is OctMacularSingleEyeResponse {
  return !("bilateral" in response) || response.bilateral !== true;
}
