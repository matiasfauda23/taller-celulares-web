import { z } from "zod";

// Field limits mirror LoginDto/RegisterDto in taller-celulares-api exactly (email trimmed and
// lowercased, password length only enforced at register — login just checks presence, since
// NestJS's own IsString is the authority there and a UX-side length limit would leak nothing
// useful about a login attempt).
const email = z.string().trim().toLowerCase().max(254, "Email must be at most 254 characters").email("Enter a valid email address");

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password is required"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  ownerName: z.string().trim().min(2, "Owner name must be at least 2 characters").max(100, "Owner name must be at most 100 characters"),
  email,
  password: z.string().min(12, "Password must be at least 12 characters").max(128, "Password must be at most 128 characters"),
  workshopName: z.string().trim().min(2, "Workshop name must be at least 2 characters").max(120, "Workshop name must be at most 120 characters"),
  workshopAddress: z.string().trim().min(5, "Workshop address must be at least 5 characters").max(200, "Workshop address must be at most 200 characters"),
});

export type RegisterFormValues = z.infer<typeof registerSchema>;
