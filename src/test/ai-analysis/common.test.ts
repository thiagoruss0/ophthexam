import { describe, it, expect } from "vitest";
import {
  QualityScoreSchema,
  LayerStatusSchema,
  SeveritySchema,
  ClassificationSchema,
  EyeTypeSchema,
  QualityAssessmentSchema,
  LayerAnalysisSchema,
  MeasurementValueSchema,
  BiomarkerPresenceSchema,
  DiagnosisSchema,
  ComparisonSchema,
  formatZodError,
  getErrorPaths,
  safeParseAnalysis,
  parseWithFallback,
  parseStrict,
  parsePartial,
  coerceToNumber,
  coerceToBoolean,
  coerceToStringArray,
} from "@/types/ai-analysis/common";
import { z } from "zod";

describe("Common Enums", () => {
  describe("QualityScoreSchema", () => {
    it("should accept valid quality scores", () => {
      expect(QualityScoreSchema.parse("boa")).toBe("boa");
      expect(QualityScoreSchema.parse("moderada")).toBe("moderada");
      expect(QualityScoreSchema.parse("ruim")).toBe("ruim");
    });

    it("should reject invalid quality scores", () => {
      expect(() => QualityScoreSchema.parse("excellent")).toThrow();
      expect(() => QualityScoreSchema.parse("")).toThrow();
    });
  });

  describe("LayerStatusSchema", () => {
    it("should accept valid layer statuses", () => {
      expect(LayerStatusSchema.parse("normal")).toBe("normal");
      expect(LayerStatusSchema.parse("alterada")).toBe("alterada");
      expect(LayerStatusSchema.parse("alterado")).toBe("alterado");
      expect(LayerStatusSchema.parse("ausente")).toBe("ausente");
    });
  });

  describe("SeveritySchema", () => {
    it("should accept valid severities", () => {
      expect(SeveritySchema.parse("leve")).toBe("leve");
      expect(SeveritySchema.parse("moderado")).toBe("moderado");
      expect(SeveritySchema.parse("moderada")).toBe("moderada");
      expect(SeveritySchema.parse("severo")).toBe("severo");
      expect(SeveritySchema.parse("severa")).toBe("severa");
    });
  });

  describe("ClassificationSchema", () => {
    it("should accept valid classifications", () => {
      expect(ClassificationSchema.parse("normal")).toBe("normal");
      expect(ClassificationSchema.parse("borderline")).toBe("borderline");
      expect(ClassificationSchema.parse("anormal")).toBe("anormal");
      expect(ClassificationSchema.parse("aumentada")).toBe("aumentada");
      expect(ClassificationSchema.parse("diminuida")).toBe("diminuida");
    });
  });

  describe("EyeTypeSchema", () => {
    it("should accept valid eye types", () => {
      expect(EyeTypeSchema.parse("od")).toBe("od");
      expect(EyeTypeSchema.parse("oe")).toBe("oe");
      expect(EyeTypeSchema.parse("both")).toBe("both");
    });
  });
});

describe("Common Object Schemas", () => {
  describe("QualityAssessmentSchema", () => {
    it("should parse valid quality assessment", () => {
      const result = QualityAssessmentSchema.parse({
        score: "boa",
        issues: ["artifact"],
        centered: true,
        signal_strength: 8,
      });
      expect(result.score).toBe("boa");
      expect(result.issues).toEqual(["artifact"]);
      expect(result.centered).toBe(true);
      expect(result.signal_strength).toBe(8);
    });

    it("should apply defaults for optional fields", () => {
      const result = QualityAssessmentSchema.parse({ score: "moderada" });
      expect(result.issues).toEqual([]);
    });

    it("should accept null signal_strength", () => {
      const result = QualityAssessmentSchema.parse({
        score: "ruim",
        signal_strength: null,
      });
      expect(result.signal_strength).toBeNull();
    });
  });

  describe("LayerAnalysisSchema", () => {
    it("should parse valid layer analysis", () => {
      const result = LayerAnalysisSchema.parse({
        status: "alterada",
        description: "Espessamento focal",
      });
      expect(result.status).toBe("alterada");
      expect(result.description).toBe("Espessamento focal");
    });

    it("should apply default description", () => {
      const result = LayerAnalysisSchema.parse({ status: "normal" });
      expect(result.description).toBe("");
    });
  });

  describe("MeasurementValueSchema", () => {
    it("should parse valid measurement", () => {
      const result = MeasurementValueSchema.parse({
        value: 250,
        unit: "μm",
        classification: "normal",
      });
      expect(result.value).toBe(250);
      expect(result.unit).toBe("μm");
      expect(result.classification).toBe("normal");
    });

    it("should accept null value", () => {
      const result = MeasurementValueSchema.parse({ value: null });
      expect(result.value).toBeNull();
      expect(result.unit).toBe("μm");
    });
  });

  describe("BiomarkerPresenceSchema", () => {
    it("should parse valid biomarker presence", () => {
      const result = BiomarkerPresenceSchema.parse({
        present: true,
        location: "foveal",
        severity: "moderado",
      });
      expect(result.present).toBe(true);
      expect(result.location).toBe("foveal");
      expect(result.severity).toBe("moderado");
    });

    it("should apply defaults", () => {
      const result = BiomarkerPresenceSchema.parse({ present: false });
      expect(result.location).toBe("");
    });
  });

  describe("DiagnosisSchema", () => {
    it("should parse complete diagnosis", () => {
      const result = DiagnosisSchema.parse({
        primary: "Glaucoma suspeito",
        secondary: ["Hipertensão ocular"],
        differential: ["Glaucoma de ângulo aberto"],
      });
      expect(result.primary).toBe("Glaucoma suspeito");
      expect(result.secondary).toEqual(["Hipertensão ocular"]);
      expect(result.differential).toEqual(["Glaucoma de ângulo aberto"]);
    });

    it("should apply defaults for arrays", () => {
      const result = DiagnosisSchema.parse({ primary: "Normal" });
      expect(result.secondary).toEqual([]);
      expect(result.differential).toEqual([]);
    });
  });

  describe("ComparisonSchema", () => {
    it("should parse comparison with all fields", () => {
      const result = ComparisonSchema.parse({
        symmetry: "assimetrico",
        asymmetry_details: "OD apresenta maior espessura",
        notes: "Comparar com exame anterior",
      });
      expect(result.symmetry).toBe("assimetrico");
      expect(result.asymmetry_details).toBe("OD apresenta maior espessura");
    });

    it("should apply defaults", () => {
      const result = ComparisonSchema.parse({});
      expect(result.asymmetry_details).toBe("");
      expect(result.notes).toBe("");
    });
  });
});

describe("Error Formatting", () => {
  describe("formatZodError", () => {
    it("should format single error", () => {
      const result = QualityScoreSchema.safeParse("invalid");
      if (!result.success) {
        const formatted = formatZodError(result.error);
        expect(formatted).toContain("[root]");
      }
    });

    it("should format nested path errors", () => {
      const TestSchema = z.object({
        quality: QualityAssessmentSchema,
      });
      const result = TestSchema.safeParse({ quality: { score: "invalid" } });
      if (!result.success) {
        const formatted = formatZodError(result.error);
        expect(formatted).toContain("quality.score");
      }
    });

    it("should truncate many errors", () => {
      const ManyFieldsSchema = z.object({
        a: z.string(),
        b: z.string(),
        c: z.string(),
        d: z.string(),
        e: z.string(),
        f: z.string(),
        g: z.string(),
      });
      const result = ManyFieldsSchema.safeParse({});
      if (!result.success) {
        const formatted = formatZodError(result.error);
        expect(formatted).toContain("+");
      }
    });
  });

  describe("getErrorPaths", () => {
    it("should extract error paths", () => {
      const TestSchema = z.object({
        quality: z.object({
          score: QualityScoreSchema,
        }),
        layers: z.object({
          status: LayerStatusSchema,
        }),
      });
      const result = TestSchema.safeParse({
        quality: { score: "bad" },
        layers: { status: "wrong" },
      });
      if (!result.success) {
        const paths = getErrorPaths(result.error);
        expect(paths).toContain("quality.score");
        expect(paths).toContain("layers.status");
      }
    });
  });
});

describe("Safe Parse Functions", () => {
  describe("safeParseAnalysis", () => {
    it("should return success for valid data", () => {
      const result = safeParseAnalysis(QualityAssessmentSchema, {
        score: "boa",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.score).toBe("boa");
        expect(result.warnings).toEqual([]);
      }
    });

    it("should return failure with error details", () => {
      const result = safeParseAnalysis(QualityAssessmentSchema, {
        score: "invalid",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect((result as any).error).toBeDefined();
        expect((result as any).rawData).toEqual({ score: "invalid" });
        expect((result as any).errorSummary).toBeTruthy();
      }
    });
  });

  describe("parseWithFallback", () => {
    it("should return parsed data for valid input", () => {
      const result = parseWithFallback(
        QualityAssessmentSchema,
        { score: "boa" },
        "test"
      );
      expect(result.score).toBe("boa");
    });

    it("should return raw data as fallback for invalid input", () => {
      const invalidData = { score: "invalid", extra: "field" };
      const result = parseWithFallback(
        QualityAssessmentSchema,
        invalidData,
        "test"
      );
      // Should return raw data cast to type
      expect(result).toEqual(invalidData);
    });

    it("should return null/undefined as is", () => {
      expect(parseWithFallback(QualityAssessmentSchema, null, "test")).toBeNull();
      expect(parseWithFallback(QualityAssessmentSchema, undefined, "test")).toBeUndefined();
    });
  });

  describe("parseStrict", () => {
    it("should return parsed data for valid input", () => {
      const result = parseStrict(
        QualityAssessmentSchema,
        { score: "moderada" },
        "test"
      );
      expect(result.score).toBe("moderada");
    });

    it("should throw for invalid input", () => {
      expect(() =>
        parseStrict(QualityAssessmentSchema, { score: "bad" }, "test")
      ).toThrow("[AI Analysis] Strict validation failed");
    });
  });

  describe("parsePartial", () => {
    const TestSchema = z.object({
      score: QualityScoreSchema,
      description: z.string(),
      count: z.number(),
    });

    it("should extract valid fields from mixed data", () => {
      const { data, invalidFields, validFields } = parsePartial(
        TestSchema,
        {
          score: "boa",
          description: "Valid text",
          count: "not a number",
        },
        "test"
      );
      expect(data.score).toBe("boa");
      expect(data.description).toBe("Valid text");
      expect(invalidFields).toContain("count");
      expect(validFields).toContain("score");
      expect(validFields).toContain("description");
    });

    it("should return empty for non-object input", () => {
      const { data, invalidFields, validFields } = parsePartial(
        TestSchema,
        null,
        "test"
      );
      expect(data).toEqual({});
      expect(invalidFields).toEqual([]);
      expect(validFields).toEqual([]);
    });

    it("should handle fully valid data", () => {
      const { data, invalidFields, validFields } = parsePartial(
        TestSchema,
        {
          score: "ruim",
          description: "Test",
          count: 5,
        },
        "test"
      );
      expect(validFields).toHaveLength(3);
      expect(invalidFields).toHaveLength(0);
    });
  });
});

describe("Type Coercion Helpers", () => {
  describe("coerceToNumber", () => {
    it("should return number as is", () => {
      expect(coerceToNumber(42)).toBe(42);
      expect(coerceToNumber(3.14)).toBe(3.14);
      expect(coerceToNumber(0)).toBe(0);
    });

    it("should parse string to number", () => {
      expect(coerceToNumber("42")).toBe(42);
      expect(coerceToNumber("3.14")).toBe(3.14);
      expect(coerceToNumber("-10")).toBe(-10);
    });

    it("should return null for invalid values", () => {
      expect(coerceToNumber(null)).toBeNull();
      expect(coerceToNumber(undefined)).toBeNull();
      expect(coerceToNumber("not a number")).toBeNull();
      expect(coerceToNumber(NaN)).toBeNull();
      expect(coerceToNumber({})).toBeNull();
    });
  });

  describe("coerceToBoolean", () => {
    it("should return boolean as is", () => {
      expect(coerceToBoolean(true)).toBe(true);
      expect(coerceToBoolean(false)).toBe(false);
    });

    it("should parse string to boolean", () => {
      expect(coerceToBoolean("true")).toBe(true);
      expect(coerceToBoolean("TRUE")).toBe(true);
      expect(coerceToBoolean("1")).toBe(true);
      expect(coerceToBoolean("false")).toBe(false);
      expect(coerceToBoolean("0")).toBe(false);
    });

    it("should parse number to boolean", () => {
      expect(coerceToBoolean(1)).toBe(true);
      expect(coerceToBoolean(-1)).toBe(true);
      expect(coerceToBoolean(0)).toBe(false);
    });

    it("should return false for other types", () => {
      expect(coerceToBoolean(null)).toBe(false);
      expect(coerceToBoolean(undefined)).toBe(false);
      expect(coerceToBoolean({})).toBe(false);
    });
  });

  describe("coerceToStringArray", () => {
    it("should return array of strings filtered", () => {
      expect(coerceToStringArray(["a", "b", "c"])).toEqual(["a", "b", "c"]);
      expect(coerceToStringArray(["a", "", "c"])).toEqual(["a", "c"]);
      expect(coerceToStringArray(["a", 123, "c"])).toEqual(["a", "c"]);
    });

    it("should wrap single string in array", () => {
      expect(coerceToStringArray("single")).toEqual(["single"]);
      expect(coerceToStringArray("  trimmed  ")).toEqual(["trimmed"]);
    });

    it("should return empty array for invalid input", () => {
      expect(coerceToStringArray(null)).toEqual([]);
      expect(coerceToStringArray(undefined)).toEqual([]);
      expect(coerceToStringArray("")).toEqual([]);
      expect(coerceToStringArray("   ")).toEqual([]);
      expect(coerceToStringArray(123)).toEqual([]);
    });
  });
});
