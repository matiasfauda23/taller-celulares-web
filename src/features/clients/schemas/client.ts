import { z } from "zod";
import type { CreateClientInput } from "@/lib/api/types";

// Mirrors CreateClientDto/UpdateClientDto (UpdateClientDto is just PartialType of the same
// fields) in taller-celulares-api exactly; NestJS remains the authority on these limits, this
// only gives the user feedback before a round trip.
export const clientSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(100, "First name must be at most 100 characters"),
  lastName: z.string().trim().min(1, "Last name is required").max(100, "Last name must be at most 100 characters"),
  phone: z.string().trim().min(1, "Phone is required").max(40, "Phone must be at most 40 characters"),
  email: z
    .union([z.literal(""), z.string().trim().max(254, "Email must be at most 254 characters").email("Enter a valid email address")])
    .optional(),
  address: z.string().trim().min(1, "Address is required").max(200, "Address must be at most 200 characters"),
  notes: z.string().trim().max(1000, "Notes must be at most 1000 characters").optional(),
});

export type ClientFormValues = z.infer<typeof clientSchema>;

/** Empty optional fields are omitted rather than sent as `""`, matching what the DTOs accept. */
export function toClientInput(values: ClientFormValues): CreateClientInput {
  return {
    firstName: values.firstName,
    lastName: values.lastName,
    phone: values.phone,
    address: values.address,
    ...(values.email ? { email: values.email } : {}),
    ...(values.notes ? { notes: values.notes } : {}),
  };
}
