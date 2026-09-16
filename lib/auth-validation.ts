import { z } from "zod";

export const registrationSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
  password: z.string().min(8).max(128),
  displayName: z.string().trim().min(1).max(100),
  timeZone: z.string().trim().min(1).max(64).default("UTC"),
});

export type RegistrationInput = z.infer<typeof registrationSchema>;
