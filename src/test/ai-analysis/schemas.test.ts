import { describe, it, expect } from "vitest";

// OCT Macular schemas
import {
  OctMacularLayersSchema,
  OctMacularBiomarkersSchema,
  OctMacularMeasurementsSchema,
  OctMacularSingleEyeResponseSchema,
  OctMacularBilateralResponseSchema,
  OctMacularResponseSchema,
  isBilateralOctMacular,
  isSingleEyeOctMacular,
} from "@/types/ai-analysis/oct-macular";

// OCT Nerve schemas
import {
  RnflAnalysisSchema,
  OpticDiscAnalysisSchema,
  GlaucomaBiomarkersSchema,
  RiskClassificationSchema,
  OctNerveSingleEyeResponseSchema,
  OctNerveBilateralResponseSchema,
  OctNerveResponseSchema,
  isBilateralOctNerve,
  isSingleEyeOctNerve,
} from "@/types/ai-analysis/oct-nerve";

// Retinography schemas
import {
  RetinographyOpticDiscSchema,
  RetinographyMaculaSchema,
  RetinographyVesselsSchema,
  RetinographyBiomarkersSchema,
  RetinographySingleEyeResponseSchema,
  RetinographyBilateralResponseSchema,
  RetinographyResponseSchema,
  isBilateralRetinography,
  isSingleEyeRetinography,
} from "@/types/ai-analysis/retinography";

describe("OCT Macular Schemas", () => {
  describe("OctMacularLayersSchema", () => {
    it("should parse valid layers", () => {
      const result = OctMacularLayersSchema.parse({
        cfnr: { status: "normal", description: "" },
        epr: { status: "alterada", description: "Irregularidade focal" },
        zona_elipsoide: { status: "ausente" },
      });
      expect(result.cfnr?.status).toBe("normal");
      expect(result.epr?.status).toBe("alterada");
    });

    it("should parse empty object", () => {
      const result = OctMacularLayersSchema.parse({});
      expect(result).toBeDefined();
    });
  });

  describe("OctMacularBiomarkersSchema", () => {
    it("should parse biomarkers with fluids", () => {
      const result = OctMacularBiomarkersSchema.parse({
        fluido_intraretiniano: {
          present: true,
          location: "perifoveal",
          severity: "moderado",
        },
        fluido_subretiniano: { present: false },
      });
      expect(result.fluido_intraretiniano?.present).toBe(true);
      expect(result.fluido_subretiniano?.present).toBe(false);
    });

    it("should parse drusas with type", () => {
      const result = OctMacularBiomarkersSchema.parse({
        drusas: {
          present: true,
          size: "grandes",
          type: "moles",
          location: "macular",
        },
      });
      expect(result.drusas?.size).toBe("grandes");
      expect(result.drusas?.type).toBe("moles");
    });

    it("should parse buraco macular with stage", () => {
      const result = OctMacularBiomarkersSchema.parse({
        buraco_macular: { present: true, stage: "2", size: "400μm" },
      });
      expect(result.buraco_macular?.stage).toBe("2");
    });
  });

  describe("OctMacularSingleEyeResponseSchema", () => {
    it("should parse complete single eye response", () => {
      const result = OctMacularSingleEyeResponseSchema.parse({
        quality: { score: "boa", signal_strength: 9 },
        layers: {
          epr: { status: "normal" },
        },
        biomarkers: {
          edema_macular: { present: false },
        },
        measurements: {
          central_foveal_thickness: { value: 250, unit: "μm", classification: "normal" },
        },
        diagnosis: { primary: "Mácula normal" },
        recommendations: ["Retorno anual"],
      });
      expect(result.quality.score).toBe("boa");
      expect(result.diagnosis?.primary).toBe("Mácula normal");
    });

    it("should apply default recommendations", () => {
      const result = OctMacularSingleEyeResponseSchema.parse({
        quality: { score: "moderada" },
      });
      expect(result.recommendations).toEqual([]);
    });
  });

  describe("OctMacularBilateralResponseSchema", () => {
    it("should require bilateral flag", () => {
      const result = OctMacularBilateralResponseSchema.parse({
        bilateral: true,
        od: { quality: { score: "boa" } },
        oe: { quality: { score: "boa" } },
      });
      expect(result.bilateral).toBe(true);
    });

    it("should parse comparison", () => {
      const result = OctMacularBilateralResponseSchema.parse({
        bilateral: true,
        od: {},
        oe: {},
        comparison: { symmetry: "simetrico" },
        diagnosis: { primary: "Normal bilateral" },
      });
      expect(result.comparison?.symmetry).toBe("simetrico");
    });
  });

  describe("Type Guards", () => {
    it("isBilateralOctMacular should identify bilateral", () => {
      const bilateral = { bilateral: true, od: {}, oe: {} };
      const single = { quality: { score: "boa" } };
      
      expect(isBilateralOctMacular(bilateral as any)).toBe(true);
      expect(isBilateralOctMacular(single as any)).toBe(false);
    });

    it("isSingleEyeOctMacular should identify single eye", () => {
      const single = { quality: { score: "boa" } };
      const bilateral = { bilateral: true, od: {}, oe: {} };
      
      expect(isSingleEyeOctMacular(single as any)).toBe(true);
      expect(isSingleEyeOctMacular(bilateral as any)).toBe(false);
    });
  });
});

describe("OCT Nerve Schemas", () => {
  describe("RnflAnalysisSchema", () => {
    it("should parse RNFL sectors", () => {
      const result = RnflAnalysisSchema.parse({
        average: { value: 95, unit: "μm", classification: "normal" },
        superior: { value: 120, unit: "μm", classification: "normal" },
        inferior: { value: 110, unit: "μm", classification: "borderline" },
        thinning_location: ["temporal inferior"],
        defect_pattern: "localizado",
      });
      expect(result.average?.value).toBe(95);
      expect(result.defect_pattern).toBe("localizado");
    });

    it("should parse symmetry", () => {
      const result = RnflAnalysisSchema.parse({
        symmetry: { value: 85, classification: "normal" },
      });
      expect(result.symmetry?.classification).toBe("normal");
    });
  });

  describe("OpticDiscAnalysisSchema", () => {
    it("should parse optic disc measurements", () => {
      const result = OpticDiscAnalysisSchema.parse({
        disc_area: { value: 2.1, unit: "mm²", classification: "normal" },
        cd_ratio_vertical: { value: 0.65, classification: "suspeita" },
        isnt_rule: { preserved: false, violated_sectors: ["temporal"] },
      });
      expect(result.cd_ratio_vertical?.classification).toBe("suspeita");
      expect(result.isnt_rule?.preserved).toBe(false);
    });

    it("should parse peripapillary atrophy", () => {
      const result = OpticDiscAnalysisSchema.parse({
        peripapillary_atrophy: { present: true, type: "beta", extent: "360°" },
      });
      expect(result.peripapillary_atrophy?.type).toBe("beta");
    });
  });

  describe("RiskClassificationSchema", () => {
    it("should parse risk levels", () => {
      const result = RiskClassificationSchema.parse({
        glaucoma_risk: "moderado",
        progression_risk: "alto",
        justification: "CFNR reduzida com progressão",
      });
      expect(result.glaucoma_risk).toBe("moderado");
      expect(result.progression_risk).toBe("alto");
    });
  });

  describe("OctNerveBilateralResponseSchema", () => {
    it("should parse complete bilateral response", () => {
      const result = OctNerveBilateralResponseSchema.parse({
        bilateral: true,
        od: {
          quality: { score: "boa" },
          rnfl: { average: { value: 90, classification: "normal" } },
        },
        oe: {
          quality: { score: "boa" },
          rnfl: { average: { value: 85, classification: "borderline" } },
        },
        comparison: {
          od_oe_asymmetry: { significant: true, description: "Assimetria > 5μm" },
        },
        risk_classification: { glaucoma_risk: "moderado" },
        diagnosis: { primary: "Glaucoma suspeito", staging: "suspeito" },
        recommendations: ["Campimetria", "Retorno em 6 meses"],
      });
      expect(result.diagnosis?.staging).toBe("suspeito");
    });
  });

  describe("Type Guards", () => {
    it("isBilateralOctNerve should work correctly", () => {
      const bilateral = { bilateral: true, od: {}, oe: {} };
      const single = { quality: { score: "boa" } };
      
      expect(isBilateralOctNerve(bilateral as any)).toBe(true);
      expect(isBilateralOctNerve(single as any)).toBe(false);
    });

    it("isSingleEyeOctNerve should work correctly", () => {
      const single = { quality: { score: "boa" } };
      const bilateral = { bilateral: true, od: {}, oe: {} };
      
      expect(isSingleEyeOctNerve(single as any)).toBe(true);
      expect(isSingleEyeOctNerve(bilateral as any)).toBe(false);
    });
  });
});

describe("Retinography Schemas", () => {
  describe("RetinographyOpticDiscSchema", () => {
    it("should parse optic disc findings", () => {
      const result = RetinographyOpticDiscSchema.parse({
        appearance: "normal",
        color: "róseo",
        margins: "nítidas",
        cd_ratio: 0.3,
        neuroretinal_rim: "preservado",
      });
      expect(result.appearance).toBe("normal");
      expect(result.cd_ratio).toBe(0.3);
    });
  });

  describe("RetinographyMaculaSchema", () => {
    it("should parse macula findings", () => {
      const result = RetinographyMaculaSchema.parse({
        appearance: "alterada",
        foveal_reflex: "diminuído",
        drusen: true,
        hemorrhages: true,
      });
      expect(result.foveal_reflex).toBe("diminuído");
      expect(result.drusen).toBe(true);
    });
  });

  describe("RetinographyVesselsSchema", () => {
    it("should parse vessel analysis", () => {
      const result = RetinographyVesselsSchema.parse({
        arteries: { caliber: "afinadas", tortuosity: "normal" },
        veins: { caliber: "dilatadas" },
        av_ratio: "2:3",
        av_crossing: "alterado",
        neovasos: true,
      });
      expect(result.arteries?.caliber).toBe("afinadas");
      expect(result.neovasos).toBe(true);
    });
  });

  describe("RetinographyBiomarkersSchema", () => {
    it("should parse diabetic retinopathy", () => {
      const result = RetinographyBiomarkersSchema.parse({
        retinopatia_diabetica: {
          present: true,
          stage: "moderada",
          edema_macular: true,
        },
      });
      expect(result.retinopatia_diabetica?.stage).toBe("moderada");
    });

    it("should parse DMRI", () => {
      const result = RetinographyBiomarkersSchema.parse({
        dmri: { present: true, type: "seca", stage: "intermediária" },
      });
      expect(result.dmri?.type).toBe("seca");
    });
  });

  describe("RetinographySingleEyeResponseSchema", () => {
    it("should parse complete single eye response", () => {
      const result = RetinographySingleEyeResponseSchema.parse({
        quality: { score: "boa" },
        optic_disc: { appearance: "normal" },
        macula: { appearance: "normal", foveal_reflex: "presente" },
        vessels: { av_crossing: "normal" },
        urgency: { level: "rotina" },
        diagnosis: { primary: "Fundoscopia normal" },
        recommendations: ["Controle anual"],
      });
      expect(result.urgency?.level).toBe("rotina");
    });
  });

  describe("RetinographyBilateralResponseSchema", () => {
    it("should parse bilateral with comparison", () => {
      const result = RetinographyBilateralResponseSchema.parse({
        bilateral: true,
        od: { quality: { score: "boa" } },
        oe: { quality: { score: "moderada" } },
        comparison: {
          symmetry: "assimetrico",
          significant_differences: ["Qualidade inferior OE"],
        },
        urgency: { level: "prioritário", reason: "Avaliar OE" },
      });
      expect(result.comparison?.symmetry).toBe("assimetrico");
    });
  });

  describe("Type Guards", () => {
    it("isBilateralRetinography should work correctly", () => {
      const bilateral = { bilateral: true, od: {}, oe: {} };
      const single = { quality: { score: "boa" } };
      
      expect(isBilateralRetinography(bilateral as any)).toBe(true);
      expect(isBilateralRetinography(single as any)).toBe(false);
    });

    it("isSingleEyeRetinography should work correctly", () => {
      const single = { quality: { score: "boa" } };
      const bilateral = { bilateral: true, od: {}, oe: {} };
      
      expect(isSingleEyeRetinography(single as any)).toBe(true);
      expect(isSingleEyeRetinography(bilateral as any)).toBe(false);
    });
  });
});

describe("Union Schema Validation", () => {
  describe("OctMacularResponseSchema", () => {
    it("should accept single eye response", () => {
      const result = OctMacularResponseSchema.safeParse({
        quality: { score: "boa" },
      });
      expect(result.success).toBe(true);
    });

    it("should accept bilateral response", () => {
      const result = OctMacularResponseSchema.safeParse({
        bilateral: true,
        od: {},
        oe: {},
      });
      expect(result.success).toBe(true);
    });
  });

  describe("OctNerveResponseSchema", () => {
    it("should accept single eye response", () => {
      const result = OctNerveResponseSchema.safeParse({
        quality: { score: "moderada" },
      });
      expect(result.success).toBe(true);
    });

    it("should accept bilateral response", () => {
      const result = OctNerveResponseSchema.safeParse({
        bilateral: true,
        od: {},
        oe: {},
      });
      expect(result.success).toBe(true);
    });
  });

  describe("RetinographyResponseSchema", () => {
    it("should accept single eye response", () => {
      const result = RetinographyResponseSchema.safeParse({
        quality: { score: "ruim", issues: ["movimento"] },
      });
      expect(result.success).toBe(true);
    });

    it("should accept bilateral response", () => {
      const result = RetinographyResponseSchema.safeParse({
        bilateral: true,
        od: {},
        oe: {},
      });
      expect(result.success).toBe(true);
    });
  });
});
