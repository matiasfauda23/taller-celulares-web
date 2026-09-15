import { createAuthMutationHandler } from "@/lib/session/auth-routes";

export const POST = createAuthMutationHandler({
  path: "/api/session/login",
  nestPath: "/auth/login",
  fields: ["email", "password"],
});
