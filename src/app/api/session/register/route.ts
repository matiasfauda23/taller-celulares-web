import { createAuthMutationHandler } from "@/lib/session/auth-routes";

export const POST = createAuthMutationHandler({
  path: "/api/session/register",
  nestPath: "/auth/register",
  fields: ["ownerName", "email", "password", "workshopName", "workshopAddress"],
});
