import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchYield, fetchExchangeRate } from "./market-data";

function makeYahooResponse(timestamps: number[], closes: (number | null)[]) {
  return {
    chart: {
      result: [{ timestamp: timestamps, indicators: { quote: [{ close: closes }] } }],
      error: null,
    },
  };
}

const TIMESTAMPS_7 = [
  1714521600, 1714608000, 1714694400, 1714780800, 1714867200, 1714953600,
  1715040000,
];
const VALUES_7 = [4.42, 4.45, 4.48, 4.51, 4.49, 4.52, 4.51];

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("fetchYield", () => {
  it("returns 7 date-value pairs on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(makeYahooResponse(TIMESTAMPS_7, VALUES_7)),
      })
    );
    const result = await fetchYield();
    expect(result.data).toHaveLength(7);
    expect(result.data[0]).toHaveProperty("date");
    expect(result.data[0]).toHaveProperty("value");
    expect(result.error).toBeUndefined();
  });

  it("returns error object without throwing on network failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Network error"))
    );
    const result = await fetchYield();
    expect(result.data).toHaveLength(0);
    expect(result.error).toBeDefined();
  });

  it("returns error object without throwing on non-ok response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 429 })
    );
    const result = await fetchYield();
    expect(result.data).toHaveLength(0);
    expect(result.error).toBeDefined();
  });
});

describe("fetchExchangeRate", () => {
  it("returns 7 date-value pairs on success", async () => {
    const rates = [1380, 1375, 1382, 1378, 1385, 1383, 1388];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve(makeYahooResponse(TIMESTAMPS_7, rates)),
      })
    );
    const result = await fetchExchangeRate();
    expect(result.data).toHaveLength(7);
    expect(result.error).toBeUndefined();
  });

  it("returns error object without throwing on failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("timeout"))
    );
    const result = await fetchExchangeRate();
    expect(result.data).toHaveLength(0);
    expect(result.error).toBeDefined();
  });
});
