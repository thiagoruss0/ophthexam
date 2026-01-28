import { describe, it, expect } from "vitest";
import {
  ExamTypeSchema,
  AiAnalysisRecordSchema,
  AnalysisRequestSchema,
  validateAiResponse,
  isBilateralResponse,
  getQualityScoreFromResponse,
  getDiagnosisFromResponse,
  getRecommendationsFromResponse,
} from "@/types/ai-analysis";

describe("ExamTypeSchema", () => {
  it("should accept valid exam types", () => {
    expect(ExamTypeSchema.parse("oct_macular")).toBe("oct_macular");
    expect(ExamTypeSchema.parse("oct_nerve")).toBe("oct_nerve");
    expect(ExamTypeSchema.parse("retinography")).toBe("retinography");
  });

  it("should reject invalid exam types", () => {
    expect(() => ExamTypeSchema.parse("unknown")).toThrow();
  });
});

describe("AiAnalysisRecordSchema", () => {
  it("should parse valid record", () => {
    const result = AiAnalysisRecordSchema.parse({
      id: "123e4567-e89b-12d3-a456-426614174000",
      exam_id: "123e4567-e89b-12d3-a456-426614174001",
      analyzed_at: "2024-01-15T10:30:00Z",
      quality_score: "boa",
      findings: { test: "data" },
      biomarkers: null,
      measurements: null,
      diagnosis: ["Normal"],
      recommendations: ["Retorno anual"],
      risk_classification: null,
      optic_nerve_analysis: null,
      retinography_analysis: null,
      model_used: "gemini-2.5-pro",
      raw_response: {},
    });
    expect(result.id).toBe("123e4567-e89b-12d3-a456-426614174000");
    expect(result.diagnosis).toEqual(["Normal"]);
  });
});

describe("AnalysisRequestSchema", () => {
  it("should parse valid request", () => {
    const result = AnalysisRequestSchema.parse({
      examId: "123e4567-e89b-12d3-a456-426614174000",
      examType: "oct_macular",
      eye: "both",
      imageUrls: ["https://example.com/image.jpg"],
    });
    expect(result.examType).toBe("oct_macular");
    expect(result.eye).toBe("both");
  });

  it("should require at least one image", () => {
    expect(() =>
      AnalysisRequestSchema.parse({
        examId: "123e4567-e89b-12d3-a456-426614174000",
        examType: "oct_macular",
        eye: "od",
        imageUrls: [],
      })
    ).toThrow("At least one image");
  });
});

describe("validateAiResponse", () => {
  it("should validate oct_macular response", () => {
    const result = validateAiResponse("oct_macular", {
      quality: { score: "boa" },
    });
    expect(result.success).toBe(true);
  });

  it("should validate oct_nerve response", () => {
    const result = validateAiResponse("oct_nerve", {
      quality: { score: "moderada" },
    });
    expect(result.success).toBe(true);
  });

  it("should validate retinography response", () => {
    const result = validateAiResponse("retinography", {
      quality: { score: "ruim" },
    });
    expect(result.success).toBe(true);
  });

  it("should fail for invalid response", () => {
    const result = validateAiResponse("oct_macular", {
      quality: { score: "invalid" },
    });
    expect(result.success).toBe(false);
  });
});

describe("isBilateralResponse", () => {
  it("should return true for bilateral response", () => {
    expect(isBilateralResponse({ bilateral: true, od: {}, oe: {} })).toBe(true);
  });

  it("should return false for single eye response", () => {
    expect(isBilateralResponse({ quality: { score: "boa" } })).toBe(false);
  });

  it("should return false for null/undefined", () => {
    expect(isBilateralResponse(null)).toBe(false);
    expect(isBilateralResponse(undefined)).toBe(false);
  });

  it("should return false for non-object", () => {
    expect(isBilateralResponse("string")).toBe(false);
    expect(isBilateralResponse(123)).toBe(false);
  });
});

describe("getQualityScoreFromResponse", () => {
  it("should extract quality from single eye response", () => {
    expect(
      getQualityScoreFromResponse({ quality: { score: "boa" } })
    ).toBe("boa");
  });

  it("should handle bilateral with same quality", () => {
    expect(
      getQualityScoreFromResponse({
        bilateral: true,
        od: { quality: { score: "boa" } },
        oe: { quality: { score: "boa" } },
      })
    ).toBe("boa");
  });

  it("should handle bilateral with different quality", () => {
    const result = getQualityScoreFromResponse({
      bilateral: true,
      od: { quality: { score: "boa" } },
      oe: { quality: { score: "moderada" } },
    });
    expect(result).toContain("OD:");
    expect(result).toContain("OE:");
  });

  it("should return null for missing quality", () => {
    expect(getQualityScoreFromResponse({})).toBeNull();
    expect(getQualityScoreFromResponse(null)).toBeNull();
  });
});

describe("getDiagnosisFromResponse", () => {
  it("should extract primary diagnosis", () => {
    const result = getDiagnosisFromResponse({
      diagnosis: { primary: "Normal" },
    });
    expect(result).toEqual(["Normal"]);
  });

  it("should include secondary diagnoses", () => {
    const result = getDiagnosisFromResponse({
      diagnosis: {
        primary: "DMRI seca",
        secondary: ["Drusen", "Alteração EPR"],
      },
    });
    expect(result).toEqual(["DMRI seca", "Drusen", "Alteração EPR"]);
  });

  it("should filter empty strings", () => {
    const result = getDiagnosisFromResponse({
      diagnosis: {
        primary: "Normal",
        secondary: ["", "Valid", "  "],
      },
    });
    expect(result).toEqual(["Normal", "Valid"]);
  });

  it("should return empty array for missing diagnosis", () => {
    expect(getDiagnosisFromResponse({})).toEqual([]);
    expect(getDiagnosisFromResponse(null)).toEqual([]);
  });
});

describe("getRecommendationsFromResponse", () => {
  it("should extract recommendations array", () => {
    const result = getRecommendationsFromResponse({
      recommendations: ["Retorno em 6 meses", "Campimetria"],
    });
    expect(result).toEqual(["Retorno em 6 meses", "Campimetria"]);
  });

  it("should filter empty recommendations", () => {
    const result = getRecommendationsFromResponse({
      recommendations: ["Valid", "", "  ", "Another"],
    });
    expect(result).toEqual(["Valid", "Another"]);
  });

  it("should return empty array for non-array", () => {
    expect(getRecommendationsFromResponse({ recommendations: "string" })).toEqual([]);
    expect(getRecommendationsFromResponse({})).toEqual([]);
  });
});
