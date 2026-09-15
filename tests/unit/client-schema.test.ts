import { describe, expect, it } from "vitest";
import { clientSchema, toClientInput } from "@/features/clients/schemas/client";

const valid = {
  firstName: "Ana",
  lastName: "Perez",
  phone: "555-0100",
  address: "Av Siempre Viva 123",
};

describe("clientSchema", () => {
  it("accepts the minimum required fields with optional email/notes omitted", () => {
    expect(clientSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts a fully populated client", () => {
    const result = clientSchema.safeParse({ ...valid, email: "ana@example.com", notes: "Prefers WhatsApp" });
    expect(result.success).toBe(true);
  });

  it("accepts an empty email as not provided", () => {
    expect(clientSchema.safeParse({ ...valid, email: "" }).success).toBe(true);
  });

  it("rejects an invalid email", () => {
    expect(clientSchema.safeParse({ ...valid, email: "not-an-email" }).success).toBe(false);
  });

  it("rejects a missing required field", () => {
    const withoutFirstName: Partial<typeof valid> = { ...valid };
    delete withoutFirstName.firstName;
    expect(clientSchema.safeParse(withoutFirstName).success).toBe(false);
  });

  it("rejects fields exceeding the DTO's length limits", () => {
    expect(clientSchema.safeParse({ ...valid, firstName: "a".repeat(101) }).success).toBe(false);
    expect(clientSchema.safeParse({ ...valid, lastName: "a".repeat(101) }).success).toBe(false);
    expect(clientSchema.safeParse({ ...valid, phone: "1".repeat(41) }).success).toBe(false);
    expect(clientSchema.safeParse({ ...valid, address: "a".repeat(201) }).success).toBe(false);
    expect(clientSchema.safeParse({ ...valid, notes: "a".repeat(1001) }).success).toBe(false);
  });

  it("rejects an empty required field", () => {
    expect(clientSchema.safeParse({ ...valid, address: "  " }).success).toBe(false);
  });
});

describe("toClientInput", () => {
  it("omits empty optional fields instead of sending them as empty strings", () => {
    const input = toClientInput({ ...valid, email: "", notes: "" });
    expect(input).toEqual(valid);
    expect(input).not.toHaveProperty("email");
    expect(input).not.toHaveProperty("notes");
  });

  it("includes optional fields when provided", () => {
    const input = toClientInput({ ...valid, email: "ana@example.com", notes: "VIP" });
    expect(input).toEqual({ ...valid, email: "ana@example.com", notes: "VIP" });
  });
});
