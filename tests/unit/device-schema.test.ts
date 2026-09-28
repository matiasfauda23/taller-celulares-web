import { describe, expect, it } from "vitest";
import { deviceSchema, toDeviceInput } from "@/features/devices/schemas/device";

const CLIENT_ID = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";
const OTHER_CLIENT_ID = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

const valid = {
  clientId: CLIENT_ID,
  brand: "Acme",
  model: "Phone X",
  physicalCondition: "Screen cracked",
};

describe("deviceSchema", () => {
  it("accepts the minimum required fields with serial number and color omitted", () => {
    expect(deviceSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts a fully populated device", () => {
    const result = deviceSchema.safeParse({ ...valid, serialNumber: "SN-123", color: "Negro" });
    expect(result.success).toBe(true);
  });

  it("rejects a clientId that is not a UUID, so the form cannot send a raw select value", () => {
    expect(deviceSchema.safeParse({ ...valid, clientId: "" }).success).toBe(false);
    expect(deviceSchema.safeParse({ ...valid, clientId: "not-a-uuid" }).success).toBe(false);
    expect(deviceSchema.safeParse({ ...valid, clientId: OTHER_CLIENT_ID }).success).toBe(true);
  });

  it("rejects missing required fields", () => {
    for (const field of ["brand", "model", "physicalCondition"] as const) {
      const without: Partial<typeof valid> = { ...valid };
      delete without[field];
      expect(deviceSchema.safeParse(without).success).toBe(false);
    }
  });

  it("rejects an empty required field after trimming", () => {
    expect(deviceSchema.safeParse({ ...valid, brand: "   " }).success).toBe(false);
    expect(deviceSchema.safeParse({ ...valid, model: "   " }).success).toBe(false);
    expect(deviceSchema.safeParse({ ...valid, physicalCondition: "   " }).success).toBe(false);
  });

  it("rejects fields exceeding the DTO's length limits", () => {
    expect(deviceSchema.safeParse({ ...valid, brand: "a".repeat(101) }).success).toBe(false);
    expect(deviceSchema.safeParse({ ...valid, model: "a".repeat(101) }).success).toBe(false);
    expect(deviceSchema.safeParse({ ...valid, serialNumber: "a".repeat(101) }).success).toBe(false);
    expect(deviceSchema.safeParse({ ...valid, color: "a".repeat(61) }).success).toBe(false);
    expect(deviceSchema.safeParse({ ...valid, physicalCondition: "a".repeat(1001) }).success).toBe(false);
  });

  it("accepts the exact maximum lengths", () => {
    expect(deviceSchema.safeParse({ ...valid, brand: "a".repeat(100), model: "a".repeat(100) }).success).toBe(true);
  });
});

describe("toDeviceInput", () => {
  it("omits empty optional fields instead of sending empty strings", () => {
    const input = toDeviceInput({ ...valid, serialNumber: "", color: "" });
    expect(input).toEqual(valid);
    expect(input).not.toHaveProperty("serialNumber");
    expect(input).not.toHaveProperty("color");
  });

  it("includes optional fields when provided", () => {
    const input = toDeviceInput({ ...valid, serialNumber: "SN-123", color: "Negro" });
    expect(input).toEqual({ ...valid, serialNumber: "SN-123", color: "Negro" });
  });
});
