import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  fetchAnalyticsOverview,
  fetchAnalyticsTrends,
  fetchAnalyticsOutcomes,
  downloadAnalyticsCsv,
} from "../lib/conversation-api";
import {
  AnalyticsOverview,
  AnalyticsTrendsResponse,
  AnalyticsOutcomesResponse,
} from "../types";

describe("Phase 7: Frontend Analytics & CSV Export Integration", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("should fetch overview metrics with date range parameters", async () => {
    const mockOverview: AnalyticsOverview = {
      total_sessions: 14,
      completed_sessions: 11,
      failed_sessions: 1,
      incomplete_sessions: 2,
      completion_rate: 78.6,
      average_duration_seconds: 142.5,
      start_date: "2026-10-01",
      end_date: "2026-10-29",
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockOverview,
    } as Response);

    const result = await fetchAnalyticsOverview({
      startDate: "2026-10-01",
      endDate: "2026-10-29",
    });

    expect(result).not.toBeNull();
    expect(result?.total_sessions).toBe(14);
    expect(result?.completion_rate).toBe(78.6);
    expect(result?.average_duration_seconds).toBe(142.5);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(
        "/api/v1/analytics/overview?start_date=2026-10-01&end_date=2026-10-29"
      ),
      expect.any(Object)
    );
  });

  it("should fetch daily trends data points", async () => {
    const mockTrends: AnalyticsTrendsResponse = {
      trends: [
        {
          date: "2026-10-28",
          total: 8,
          completed: 6,
          failed: 1,
          incomplete: 1,
        },
        {
          date: "2026-10-29",
          total: 6,
          completed: 5,
          failed: 0,
          incomplete: 1,
        },
      ],
      total_period_sessions: 14,
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockTrends,
    } as Response);

    const result = await fetchAnalyticsTrends({
      startDate: "2026-10-28",
      endDate: "2026-10-29",
    });

    expect(result).not.toBeNull();
    expect(result?.trends.length).toBe(2);
    expect(result?.trends[0].total).toBe(8);
    expect(result?.total_period_sessions).toBe(14);
  });

  it("should fetch call outcomes distribution breakdown", async () => {
    const mockOutcomes: AnalyticsOutcomesResponse = {
      outcomes: [
        {
          status: "COMPLETED",
          label: "Completed Successfully",
          count: 11,
          percentage: 78.6,
        },
        {
          status: "FAILED",
          label: "Call Failed / Error",
          count: 1,
          percentage: 7.1,
        },
        {
          status: "IN_PROGRESS",
          label: "Active / In Progress",
          count: 2,
          percentage: 14.3,
        },
      ],
      total_sessions: 14,
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockOutcomes,
    } as Response);

    const result = await fetchAnalyticsOutcomes();
    expect(result).not.toBeNull();
    expect(result?.outcomes.length).toBe(3);
    expect(result?.outcomes[0].status).toBe("COMPLETED");
    expect(result?.outcomes[0].percentage).toBe(78.6);
  });

  it("should trigger CSV download and extract filename correctly", async () => {
    const mockBlob = new Blob(["Session ID,Status\n1,COMPLETED"], {
      type: "text/csv",
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: (h: string) => {
          if (h.toLowerCase() === "content-disposition") {
            return 'attachment; filename="voxora_analytics_export_20261029.csv"';
          }
          return null;
        },
      },
      blob: async () => mockBlob,
    } as unknown as Response);

    const mockAnchor = {
      href: "",
      download: "",
      click: vi.fn(),
    };
    const mockDocument = {
      createElement: vi.fn().mockReturnValue(mockAnchor),
      body: {
        appendChild: vi.fn(),
        removeChild: vi.fn(),
      },
    };
    const mockWindow = {
      URL: {
        createObjectURL: vi.fn().mockReturnValue("blob:http://localhost/test-blob"),
        revokeObjectURL: vi.fn(),
      },
    };

    const originalWindow = global.window;
    const originalDocument = global.document;

    global.window = mockWindow as unknown as Window & typeof globalThis;
    global.document = mockDocument as unknown as Document;

    try {
      const res = await downloadAnalyticsCsv({
        startDate: "2026-10-01",
        endDate: "2026-10-29",
      });

      expect(res.success).toBe(true);
      expect(res.filename).toBe("voxora_analytics_export_20261029.csv");
      expect(mockAnchor.click).toHaveBeenCalled();
    } finally {
      global.window = originalWindow;
      global.document = originalDocument;
    }
  });

  it("should handle backend outage gracefully without crashing", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network connection failed"));

    const overview = await fetchAnalyticsOverview();
    expect(overview).toBeNull();

    const trends = await fetchAnalyticsTrends();
    expect(trends).toBeNull();

    const outcomes = await fetchAnalyticsOutcomes();
    expect(outcomes).toBeNull();

    const downloadRes = await downloadAnalyticsCsv();
    expect(downloadRes.success).toBe(false);
    expect(downloadRes.error).toContain("Network connection failed");
  });
});

describe("Phase 7: Analytics Duration Formatting and Helpers", () => {
  const formatDuration = (seconds: number): string => {
    if (!seconds || seconds <= 0) return "0s";
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  };

  it("should format durations accurately into minutes and seconds", () => {
    expect(formatDuration(0)).toBe("0s");
    expect(formatDuration(45)).toBe("45s");
    expect(formatDuration(60)).toBe("1m 0s");
    expect(formatDuration(125)).toBe("2m 5s");
    expect(formatDuration(3600)).toBe("60m 0s");
  });
});

