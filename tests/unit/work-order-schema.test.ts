import { describe, expect, it } from "vitest";
import {
  toWorkOrderInput,
  toWorkOrderStatusInput,
  toWorkOrderUpdateInput,
  workOrderSchema,
  workOrderStatusSchema,
  workOrderUpdateSchema,
} from "@/features/work-orders/schemas/work-order";

const DEVICE_ID = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";

const valid = {
  deviceId: DEVICE_ID,
  reportedIssue: "Screen does not turn on",
};

describe("workOrderSchema", () => {
  it("accepts the minimum required fields with every optional field omitted", () => {
    const result = workOrderSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.diagnosis).toBeUndefined();
      expect(result.data.receivedAt).toBeUndefined();
    }
  });

  it("rejects a deviceId that is not a UUID", () => {
    expect(workOrderSchema.safeParse({ ...valid, deviceId: "" }).success).toBe(false);
    expect(workOrderSchema.safeParse({ ...valid, deviceId: "not-a-uuid" }).success).toBe(false);
  });

  it("rejects a missing or blank reported issue", () => {
    expect(workOrderSchema.safeParse({ deviceId: DEVICE_ID }).success).toBe(false);
    expect(workOrderSchema.safeParse({ ...valid, reportedIssue: "   " }).success).toBe(false);
  });

  it("rejects reported issue and notes beyond the DTO's length limit", () => {
    expect(workOrderSchema.safeParse({ ...valid, reportedIssue: "a".repeat(2001) }).success).toBe(false);
    expect(workOrderSchema.safeParse({ ...valid, notes: "a".repeat(2001) }).success).toBe(false);
    expect(workOrderSchema.safeParse({ ...valid, notes: "a".repeat(2000) }).success).toBe(true);
  });

  it("coerces the amount inputs to numbers and rejects negatives", () => {
    const result = workOrderSchema.safeParse({ ...valid, estimatedBudget: "1500.50", finalPrice: "2000" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.estimatedBudget).toBe(1500.5);
      expect(result.data.finalPrice).toBe(2000);
    }
    expect(workOrderSchema.safeParse({ ...valid, estimatedBudget: "-1" }).success).toBe(false);
  });

  it("accepts an explicit null amount and omits it from the input", () => {
    const result = workOrderSchema.safeParse({ ...valid, estimatedBudget: null });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(toWorkOrderInput(result.data)).not.toHaveProperty("estimatedBudget");
    }
  });

  it("converts a datetime-local value to ISO and leaves an empty date undefined", () => {
    const filled = workOrderSchema.safeParse({ ...valid, estimatedAt: "2026-03-04T15:30" });
    expect(filled.success).toBe(true);
    if (filled.success) {
      expect(filled.data.estimatedAt).toBe(new Date("2026-03-04T15:30").toISOString());
    }

    const empty = workOrderSchema.safeParse({ ...valid, estimatedAt: "" });
    expect(empty.success).toBe(true);
    if (empty.success) {
      expect(empty.data.estimatedAt).toBeUndefined();
    }
  });

  it("rejects a date that is not the datetime-local format", () => {
    expect(workOrderSchema.safeParse({ ...valid, receivedAt: "2026-03-04" }).success).toBe(false);
    expect(workOrderSchema.safeParse({ ...valid, receivedAt: "04/03/2026 15:30" }).success).toBe(false);
  });
});

describe("toWorkOrderInput", () => {
  it("omits empty optional fields instead of sending them as empty strings", () => {
    const parsed = workOrderSchema.parse({ ...valid, diagnosis: "", workPerformed: "", notes: "" });
    const input = toWorkOrderInput(parsed);
    expect(input).toEqual(valid);
    expect(input).not.toHaveProperty("diagnosis");
    expect(input).not.toHaveProperty("workPerformed");
    expect(input).not.toHaveProperty("notes");
    expect(input).not.toHaveProperty("receivedAt");
  });

  it("sends the amounts as numbers, not the decimal strings NestJS returns", () => {
    const parsed = workOrderSchema.parse({ ...valid, estimatedBudget: "1500.50", finalPrice: "2000.00" });
    const input = toWorkOrderInput(parsed);
    expect(input.estimatedBudget).toBe(1500.5);
    expect(input.finalPrice).toBe(2000);
    expect(typeof input.estimatedBudget).toBe("number");
    expect(typeof input.finalPrice).toBe("number");
  });
});

describe("workOrderUpdateSchema", () => {
  it("allows editing with no field changed beyond the optional set", () => {
    const result = workOrderUpdateSchema.safeParse({ diagnosis: "Cracked panel" });
    expect(result.success).toBe(true);
  });

  it("never accepts deviceId, receivedAt or status, which the edit endpoint excludes", () => {
    const result = workOrderUpdateSchema.safeParse({
      diagnosis: "Cracked panel",
      deviceId: DEVICE_ID,
      receivedAt: "2026-03-04T15:30",
      status: "READY",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("deviceId");
      expect(result.data).not.toHaveProperty("receivedAt");
      expect(result.data).not.toHaveProperty("status");
    }
  });

  it("rejects an out-of-range amount", () => {
    expect(workOrderUpdateSchema.safeParse({ finalPrice: "-1" }).success).toBe(false);
  });
});

describe("toWorkOrderUpdateInput", () => {
  it("omits absent fields so a partial edit never nulls a column", () => {
    const parsed = workOrderUpdateSchema.parse({ diagnosis: "Cracked panel" });
    const input = toWorkOrderUpdateInput(parsed);
    expect(input).toEqual({ diagnosis: "Cracked panel" });
    expect(input).not.toHaveProperty("workPerformed");
    expect(input).not.toHaveProperty("finalPrice");
  });
});

describe("workOrderStatusSchema", () => {
  it("accepts every status the backend allows", () => {
    for (const status of ["RECEIVED", "DIAGNOSING", "WAITING_PARTS", "REPAIRING", "READY", "DELIVERED", "CANCELLED"]) {
      expect(workOrderStatusSchema.safeParse({ status }).success).toBe(true);
    }
  });

  it("rejects a status outside the lifecycle", () => {
    expect(workOrderStatusSchema.safeParse({ status: "SHIPPED" }).success).toBe(false);
    expect(workOrderStatusSchema.safeParse({}).success).toBe(false);
  });

  it("sends only the status to the status endpoint", () => {
    expect(toWorkOrderStatusInput({ status: "DELIVERED" })).toEqual({ status: "DELIVERED" });
  });
});
