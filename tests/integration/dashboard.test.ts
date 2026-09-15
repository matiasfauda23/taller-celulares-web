import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/nest-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/nest-client")>();
  return { ...actual, callNestApi: vi.fn() };
});

const { callNestApi } = await import("@/lib/api/nest-client");
const { getDashboardData } = await import("@/features/dashboard/api/get-dashboard");

function page(total: number, data: unknown[] = []) {
  return { data, meta: { page: 1, limit: data.length || 1, total } };
}

beforeEach(() => {
  vi.mocked(callNestApi).mockReset();
});

describe("getDashboardData", () => {
  it("reads each active/non-archived total from meta.total of the real list endpoints", async () => {
    vi.mocked(callNestApi).mockImplementation(async ({ path, query }) => {
      if (path === "/clients") return { status: 200, body: page(12) };
      if (path === "/devices") return { status: 200, body: page(30) };
      if (path === "/work-orders" && query?.status === "READY") return { status: 200, body: page(4) };
      if (path === "/work-orders") return { status: 200, body: page(50, [{ id: "1" }]) };
      throw new Error(`unexpected call: ${path}`);
    });

    const result = await getDashboardData("token");

    expect(result.activeClients).toEqual({ status: "ok", total: 12 });
    expect(result.activeDevices).toEqual({ status: "ok", total: 30 });
    expect(result.totalWorkOrders).toEqual({ status: "ok", total: 50 });
    expect(result.readyWorkOrders).toEqual({ status: "ok", total: 4 });
  });

  it("uses page=1 and valid limits, and the existing status filter for READY orders", async () => {
    vi.mocked(callNestApi).mockResolvedValue({ status: 200, body: page(0) });
    await getDashboardData("token");

    expect(callNestApi).toHaveBeenCalledWith(expect.objectContaining({ path: "/clients", query: { page: 1, limit: 1 } }));
    expect(callNestApi).toHaveBeenCalledWith(expect.objectContaining({ path: "/devices", query: { page: 1, limit: 1 } }));
    expect(callNestApi).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/work-orders", query: { page: 1, limit: 1, status: "READY" } }),
    );
    expect(callNestApi).toHaveBeenCalledWith(expect.objectContaining({ path: "/work-orders", query: { page: 1, limit: 5 } }));
  });

  it("reuses a single work-orders read for both the total and the reception-order section", async () => {
    vi.mocked(callNestApi).mockImplementation(async ({ path, query }) => {
      if (path === "/work-orders" && query?.status === "READY") return { status: 200, body: page(0) };
      if (path === "/work-orders") return { status: 200, body: page(0) };
      return { status: 200, body: page(0) };
    });
    await getDashboardData("token");

    const workOrderCalls = vi.mocked(callNestApi).mock.calls.filter(([request]) => request.path === "/work-orders");
    expect(workOrderCalls).toHaveLength(2); // one for the READY filter, one (limit=5) for total + recent rows
  });

  it("runs the four reads in parallel rather than sequentially", async () => {
    const order: string[] = [];
    vi.mocked(callNestApi).mockImplementation(async ({ path, query }) => {
      const label = query?.status === "READY" ? "work-orders:READY" : String(path);
      order.push(`start:${label}`);
      await new Promise((resolve) => setTimeout(resolve, 5));
      order.push(`end:${label}`);
      return { status: 200, body: page(0) };
    });

    await getDashboardData("token");

    // If the calls were sequential, every "end" would appear before the next "start".
    const firstEndIndex = order.findIndex((entry) => entry.startsWith("end:"));
    const startsBeforeFirstEnd = order.slice(0, firstEndIndex).filter((entry) => entry.startsWith("start:")).length;
    expect(startsBeforeFirstEnd).toBeGreaterThan(1);
  });

  it("fails one metric independently without turning a healthy metric into a false 0", async () => {
    vi.mocked(callNestApi).mockImplementation(async ({ path, query }) => {
      if (path === "/devices") return { status: 500, body: undefined };
      if (path === "/clients") return { status: 200, body: page(7) };
      if (path === "/work-orders" && query?.status === "READY") return { status: 200, body: page(2) };
      return { status: 200, body: page(9, [{ id: "1" }]) };
    });

    const result = await getDashboardData("token");

    expect(result.activeDevices).toEqual({
      status: "error",
      error: { statusCode: 500, code: "INTERNAL_ERROR", message: "Internal server error", path: "/devices" },
    });
    expect(result.activeClients).toEqual({ status: "ok", total: 7 });
    expect(result.readyWorkOrders).toEqual({ status: "ok", total: 2 });
    expect(result.totalWorkOrders).toEqual({ status: "ok", total: 9 });
  });

  it("reports a network failure as an error without affecting the other metrics", async () => {
    vi.mocked(callNestApi).mockImplementation(async ({ path, query }) => {
      if (path === "/clients") throw new Error("fetch failed");
      if (path === "/devices") return { status: 200, body: page(3) };
      if (path === "/work-orders" && query?.status === "READY") return { status: 200, body: page(1) };
      return { status: 200, body: page(5, []) };
    });

    const result = await getDashboardData("token");

    expect(result.activeClients).toEqual({
      status: "error",
      error: { statusCode: 502, code: "UPSTREAM_UNAVAILABLE", message: "The upstream service is unavailable", path: "/clients" },
    });
    expect(result.activeDevices).toEqual({ status: "ok", total: 3 });
  });

  it("reports an empty reception-order section only after a successful, empty list", async () => {
    vi.mocked(callNestApi).mockImplementation(async ({ path, query }) => {
      if (path === "/work-orders" && query?.status === "READY") return { status: 200, body: page(0) };
      if (path === "/work-orders") return { status: 200, body: page(0, []) };
      return { status: 200, body: page(0) };
    });

    const result = await getDashboardData("token");
    expect(result.recentOrders).toEqual({ status: "ok", data: [] });
  });

  it("marks the reception-order section as an error (not an empty list) when the read fails", async () => {
    vi.mocked(callNestApi).mockImplementation(async ({ path, query }) => {
      if (path === "/work-orders" && query?.status !== "READY") return { status: 503, body: undefined };
      return { status: 200, body: page(0) };
    });

    const result = await getDashboardData("token");
    expect(result.recentOrders.status).toBe("error");
    expect(result.totalWorkOrders.status).toBe("error");
  });
});
