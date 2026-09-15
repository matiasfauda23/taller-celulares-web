import { describe, expect, it } from "vitest";
import { loginSchema, registerSchema } from "@/features/auth/schemas/auth";

describe("loginSchema", () => {
  it("accepts a valid login and normalizes the email", () => {
    const result = loginSchema.safeParse({ email: "  Ana@Example.com  ", password: "anything" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe("ana@example.com");
  });

  it("rejects an invalid email", () => {
    const result = loginSchema.safeParse({ email: "not-an-email", password: "anything" });
    expect(result.success).toBe(false);
  });

  it("rejects an empty password", () => {
    const result = loginSchema.safeParse({ email: "ana@example.com", password: "" });
    expect(result.success).toBe(false);
  });
});

describe("registerSchema", () => {
  const valid = {
    ownerName: "Ana Perez",
    email: "ana@example.com",
    password: "correct horse battery",
    workshopName: "Taller Central",
    workshopAddress: "Av Siempre Viva 123",
  };

  it("accepts a valid registration", () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it("trims names and normalizes the email", () => {
    const result = registerSchema.safeParse({ ...valid, ownerName: "  Ana Perez  ", email: "  ANA@EXAMPLE.COM  " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.ownerName).toBe("Ana Perez");
      expect(result.data.email).toBe("ana@example.com");
    }
  });

  it("rejects an owner name shorter than 2 characters", () => {
    expect(registerSchema.safeParse({ ...valid, ownerName: "A" }).success).toBe(false);
  });

  it("rejects a password shorter than 12 characters", () => {
    expect(registerSchema.safeParse({ ...valid, password: "short" }).success).toBe(false);
  });

  it("rejects a password longer than 128 characters", () => {
    expect(registerSchema.safeParse({ ...valid, password: "a".repeat(129) }).success).toBe(false);
  });

  it("rejects a workshop address shorter than 5 characters", () => {
    expect(registerSchema.safeParse({ ...valid, workshopAddress: "Av 1" }).success).toBe(false);
  });

  it("rejects a missing required field", () => {
    const withoutWorkshopName: Partial<typeof valid> = { ...valid };
    delete withoutWorkshopName.workshopName;
    expect(registerSchema.safeParse(withoutWorkshopName).success).toBe(false);
  });
});
