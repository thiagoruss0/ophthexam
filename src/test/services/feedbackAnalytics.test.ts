import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase client
const mockSupabaseFrom = vi.fn();
const mockSupabaseRpc = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => mockSupabaseFrom(table),
    rpc: (fn: string, params?: any) => mockSupabaseRpc(fn, params),
  },
}));

import {
  fetchFeedbackStats,
  fetchAccuracyByExamType,
  analyzeDiagnosisAccuracy,
  generateLearningInsights,
  fetchValidationMetrics,
  exportTrainingData,
  generateImprovementSuggestions,
  type FeedbackStats,
  type AccuracyByExamType,
  type DiagnosisAccuracy,
  type LearningInsights,
  type ValidationMetrics,
} from "@/services/feedbackAnalytics";

describe("feedbackAnalytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchFeedbackStats", () => {
    it("should return zeros for empty data", async () => {
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      const result = await fetchFeedbackStats();

      expect(result).toEqual({
        totalFeedbacks: 0,
        avgRating: 0,
        correctRate: 0,
        partialRate: 0,
        incorrectRate: 0,
        referenceCasesCount: 0,
      });
    });

    it("should calculate stats correctly", async () => {
      const mockData = [
        { overall_rating: 5, accuracy_rating: "correct", is_reference_case: true },
        { overall_rating: 4, accuracy_rating: "correct", is_reference_case: false },
        { overall_rating: 3, accuracy_rating: "partially_correct", is_reference_case: false },
        { overall_rating: 2, accuracy_rating: "incorrect", is_reference_case: false },
      ];

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      });

      const result = await fetchFeedbackStats();

      expect(result.totalFeedbacks).toBe(4);
      expect(result.avgRating).toBe(3.5);
      expect(result.correctRate).toBe(50); // 2/4
      expect(result.partialRate).toBe(25); // 1/4
      expect(result.incorrectRate).toBe(25); // 1/4
      expect(result.referenceCasesCount).toBe(1);
    });

    it("should handle null ratings", async () => {
      const mockData = [
        { overall_rating: null, accuracy_rating: "correct", is_reference_case: false },
        { overall_rating: 4, accuracy_rating: null, is_reference_case: false },
      ];

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      });

      const result = await fetchFeedbackStats();

      expect(result.totalFeedbacks).toBe(2);
      expect(result.avgRating).toBe(4); // Only one valid rating
    });

    it("should throw on error", async () => {
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: null, error: new Error("DB Error") }),
      });

      await expect(fetchFeedbackStats()).rejects.toThrow();
    });
  });

  describe("fetchAccuracyByExamType", () => {
    it("should group accuracy by exam type", async () => {
      const mockData = [
        { accuracy_rating: "correct", exams: { exam_type: "oct_macular" } },
        { accuracy_rating: "correct", exams: { exam_type: "oct_macular" } },
        { accuracy_rating: "incorrect", exams: { exam_type: "oct_nerve" } },
        { accuracy_rating: "partially_correct", exams: { exam_type: "oct_nerve" } },
      ];

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      });

      const result = await fetchAccuracyByExamType();

      expect(result).toHaveLength(2);
      
      const macularStats = result.find(r => r.examType === "oct_macular");
      expect(macularStats?.correct).toBe(2);
      expect(macularStats?.correctRate).toBe(100);

      const nerveStats = result.find(r => r.examType === "oct_nerve");
      expect(nerveStats?.incorrect).toBe(1);
      expect(nerveStats?.partial).toBe(1);
    });

    it("should handle missing exam type", async () => {
      const mockData = [
        { accuracy_rating: "correct", exams: null },
        { accuracy_rating: "correct", exams: { exam_type: "oct_macular" } },
      ];

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      });

      const result = await fetchAccuracyByExamType();

      expect(result).toHaveLength(1);
      expect(result[0].examType).toBe("oct_macular");
    });
  });

  describe("analyzeDiagnosisAccuracy", () => {
    it("should count correct and removed diagnoses", async () => {
      const mockData = [
        { diagnosis_correct: ["Glaucoma", "DMRI"], diagnosis_removed: ["Catarata"] },
        { diagnosis_correct: ["Glaucoma"], diagnosis_removed: ["Glaucoma"] },
        { diagnosis_correct: null, diagnosis_removed: ["DMRI"] },
      ];

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      });

      const result = await analyzeDiagnosisAccuracy();

      const glaucomaStats = result.find(r => r.diagnosis === "Glaucoma");
      expect(glaucomaStats?.correctCount).toBe(2);
      expect(glaucomaStats?.removedCount).toBe(1);
      expect(glaucomaStats?.accuracy).toBeCloseTo(66.67, 1);
    });

    it("should sort by total occurrences", async () => {
      const mockData = [
        { diagnosis_correct: ["A", "A", "A"], diagnosis_removed: ["B"] },
        { diagnosis_correct: ["B", "B"], diagnosis_removed: ["A"] },
      ];

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      });

      const result = await analyzeDiagnosisAccuracy();

      // A has 4 total (3 correct + 1 removed), B has 3 total
      expect(result[0].diagnosis).toBe("A");
    });
  });

  describe("generateLearningInsights", () => {
    it("should generate insights from feedback", async () => {
      const mockData = [
        {
          diagnosis_removed: ["False Positive 1", "False Positive 1"],
          diagnosis_added: ["Missed Diagnosis"],
          quality_feedback: "disagree",
          case_difficulty: "hard",
          pathology_tags: ["retina", "macula"],
        },
        {
          diagnosis_removed: ["False Positive 2"],
          diagnosis_added: ["Missed Diagnosis", "Another Missed"],
          quality_feedback: "agree",
          case_difficulty: "easy",
          pathology_tags: ["retina"],
        },
      ];

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      });

      const result = await generateLearningInsights();

      expect(result.mostMissedDiagnoses[0].diagnosis).toBe("False Positive 1");
      expect(result.mostMissedDiagnoses[0].missCount).toBe(2);
      
      expect(result.mostAddedDiagnoses[0].diagnosis).toBe("Missed Diagnosis");
      expect(result.mostAddedDiagnoses[0].addCount).toBe(2);

      expect(result.qualityDisagreementRate).toBe(50);
      
      expect(result.avgDifficultyRating["hard"]).toBe(1);
      expect(result.avgDifficultyRating["easy"]).toBe(1);

      expect(result.topPathologyTags[0].tag).toBe("retina");
      expect(result.topPathologyTags[0].count).toBe(2);
    });

    it("should handle empty data", async () => {
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      const result = await generateLearningInsights();

      expect(result.mostMissedDiagnoses).toEqual([]);
      expect(result.mostAddedDiagnoses).toEqual([]);
      expect(result.qualityDisagreementRate).toBe(0);
    });
  });

  describe("fetchValidationMetrics", () => {
    it("should calculate validation metrics", async () => {
      const mockData = [
        {
          raw_response: {
            _validation: { isValid: true, warnings: [] },
          },
          analyzed_at: "2024-01-15T10:00:00Z",
        },
        {
          raw_response: {
            _validation: { isValid: true, warnings: ["[field1]: error"] },
          },
          analyzed_at: "2024-01-15T11:00:00Z",
        },
        {
          raw_response: {
            _validation: { isValid: false, warnings: ["[field1]: error", "[field2]: missing"] },
          },
          analyzed_at: "2024-01-16T10:00:00Z",
        },
      ];

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: mockData, error: null }),
          }),
        }),
      });

      const result = await fetchValidationMetrics();

      expect(result.totalValidations).toBe(3);
      expect(result.successRate).toBeCloseTo(66.67, 1);
      expect(result.commonWarnings[0].field).toBe("field1");
      expect(result.commonWarnings[0].count).toBe(2);
    });

    it("should handle missing validation data", async () => {
      const mockData = [
        { raw_response: null, analyzed_at: "2024-01-15T10:00:00Z" },
        { raw_response: { other_field: "data" }, analyzed_at: "2024-01-15T11:00:00Z" },
      ];

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: mockData, error: null }),
          }),
        }),
      });

      const result = await fetchValidationMetrics();

      expect(result.totalValidations).toBe(0);
      expect(result.successRate).toBe(0);
    });
  });

  describe("exportTrainingData", () => {
    it("should export reference cases with minimum rating", async () => {
      const mockData = [
        {
          exam_id: "exam-1",
          diagnosis_correct: ["Glaucoma"],
          diagnosis_added: null,
          pathology_tags: ["nervo"],
          case_difficulty: "moderate",
          overall_rating: 5,
          teaching_notes: "Good example",
          exams: {
            exam_type: "oct_nerve",
            exam_images: [{ image_url: "https://example.com/img.jpg" }],
            ai_analysis: [{ findings: { test: "data" } }],
          },
        },
      ];

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockResolvedValue({ data: mockData, error: null }),
          }),
        }),
      });

      const result = await exportTrainingData(4);

      expect(result).toHaveLength(1);
      expect(result[0].exam_type).toBe("oct_nerve");
      expect(result[0].images).toHaveLength(1);
    });
  });

  describe("generateImprovementSuggestions", () => {
    it("should generate suggestions based on patterns", async () => {
      // Mock generateLearningInsights
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [
            {
              diagnosis_removed: ["False Positive", "False Positive", "False Positive"],
              diagnosis_added: ["Missed", "Missed", "Missed"],
              quality_feedback: "disagree",
              case_difficulty: null,
              pathology_tags: [],
            },
          ],
          error: null,
        }),
      });

      const result = await generateImprovementSuggestions();

      expect(result.length).toBeGreaterThan(0);
      expect(result.some(s => s.includes("False Positive"))).toBe(true);
      expect(result.some(s => s.includes("Missed"))).toBe(true);
    });
  });
});
