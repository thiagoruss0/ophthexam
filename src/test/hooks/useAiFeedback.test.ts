import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock Supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(),
          })),
          maybeSingle: vi.fn(),
        })),
      })),
      insert: vi.fn(),
      update: vi.fn(() => ({
        eq: vi.fn(),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(),
      })),
    })),
    rpc: vi.fn(),
  },
}));

// Mock toast
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

import { renderHook, act } from "@testing-library/react";
import { useAiFeedback, useExamsWithoutFeedback } from "@/hooks/useAiFeedback";
import { supabase } from "@/integrations/supabase/client";

describe("useAiFeedback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("initial state", () => {
    it("should have correct initial values", () => {
      const { result } = renderHook(() => useAiFeedback());
      
      expect(result.current.feedback).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSubmitting).toBe(false);
      expect(result.current.hasFeedback).toBe(false);
    });
  });

  describe("fetchFeedback", () => {
    it("should fetch feedback successfully", async () => {
      const mockFeedback = {
        id: "feedback-1",
        exam_id: "exam-1",
        doctor_id: "doctor-1",
        overall_rating: 4,
        accuracy_rating: "correct",
      };

      const maybeSingleMock = vi.fn().mockResolvedValue({
        data: mockFeedback,
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: maybeSingleMock,
            }),
          }),
        }),
      } as any);

      const { result } = renderHook(() => useAiFeedback());

      await act(async () => {
        await result.current.fetchFeedback("exam-1", "doctor-1");
      });

      expect(supabase.from).toHaveBeenCalledWith("ai_feedback");
      expect(result.current.feedback).toEqual(mockFeedback);
      expect(result.current.hasFeedback).toBe(true);
    });

    it("should handle fetch error gracefully", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
                error: new Error("Database error"),
              }),
            }),
          }),
        }),
      } as any);

      const { result } = renderHook(() => useAiFeedback());

      await act(async () => {
        await result.current.fetchFeedback("exam-1", "doctor-1");
      });

      expect(consoleSpy).toHaveBeenCalled();
      expect(result.current.feedback).toBeNull();
      
      consoleSpy.mockRestore();
    });

    it("should set loading state during fetch", async () => {
      let resolvePromise: (value: any) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockReturnValue(pendingPromise),
            }),
          }),
        }),
      } as any);

      const { result } = renderHook(() => useAiFeedback());

      act(() => {
        result.current.fetchFeedback("exam-1", "doctor-1");
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolvePromise!({ data: null, error: null });
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("submitFeedback", () => {
    it("should submit feedback successfully", async () => {
      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: null }),
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
      } as any);

      const { result } = renderHook(() => useAiFeedback());

      let success: boolean = false;
      await act(async () => {
        success = await result.current.submitFeedback({
          exam_id: "exam-1",
          doctor_id: "doctor-1",
          overall_rating: 5,
        });
      });

      expect(success).toBe(true);
    });

    it("should return false on submit error", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: new Error("Insert failed") }),
      } as any);

      const { result } = renderHook(() => useAiFeedback());

      let success: boolean = true;
      await act(async () => {
        success = await result.current.submitFeedback({
          exam_id: "exam-1",
          doctor_id: "doctor-1",
          overall_rating: 3,
        });
      });

      expect(success).toBe(false);
      consoleSpy.mockRestore();
    });
  });

  describe("updateFeedback", () => {
    it("should update feedback successfully", async () => {
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      } as any);

      const { result } = renderHook(() => useAiFeedback());

      let success: boolean = false;
      await act(async () => {
        success = await result.current.updateFeedback("feedback-1", {
          overall_rating: 4,
        });
      });

      expect(success).toBe(true);
    });

    it("should return false on update error", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: new Error("Update failed") }),
        }),
      } as any);

      const { result } = renderHook(() => useAiFeedback());

      let success: boolean = true;
      await act(async () => {
        success = await result.current.updateFeedback("feedback-1", {
          overall_rating: 2,
        });
      });

      expect(success).toBe(false);
      consoleSpy.mockRestore();
    });
  });

  describe("deleteFeedback", () => {
    it("should delete feedback successfully", async () => {
      vi.mocked(supabase.from).mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      } as any);

      const { result } = renderHook(() => useAiFeedback());

      let success: boolean = false;
      await act(async () => {
        success = await result.current.deleteFeedback("feedback-1");
      });

      expect(success).toBe(true);
      expect(result.current.feedback).toBeNull();
    });

    it("should return false on delete error", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      vi.mocked(supabase.from).mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: new Error("Delete failed") }),
        }),
      } as any);

      const { result } = renderHook(() => useAiFeedback());

      let success: boolean = true;
      await act(async () => {
        success = await result.current.deleteFeedback("feedback-1");
      });

      expect(success).toBe(false);
      consoleSpy.mockRestore();
    });
  });
});

describe("useExamsWithoutFeedback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should have initial count of 0", () => {
    const { result } = renderHook(() => useExamsWithoutFeedback(undefined));
    
    expect(result.current.count).toBe(0);
    expect(result.current.isLoading).toBe(false);
  });

  it("should not fetch if doctorProfileId is undefined", async () => {
    const { result } = renderHook(() => useExamsWithoutFeedback(undefined));

    await act(async () => {
      await result.current.fetchCount();
    });

    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("should fetch count when doctorProfileId is provided", async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: 5,
      error: null,
    } as any);

    const { result } = renderHook(() => useExamsWithoutFeedback("doctor-123"));

    await act(async () => {
      await result.current.fetchCount();
    });

    expect(supabase.rpc).toHaveBeenCalledWith("count_exams_without_feedback", {
      doctor_profile_id: "doctor-123",
    });
    expect(result.current.count).toBe(5);
  });

  it("should handle fetch error gracefully", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: new Error("RPC error"),
    } as any);

    const { result } = renderHook(() => useExamsWithoutFeedback("doctor-123"));

    await act(async () => {
      await result.current.fetchCount();
    });

    expect(consoleSpy).toHaveBeenCalled();
    expect(result.current.count).toBe(0);
    
    consoleSpy.mockRestore();
  });
});
