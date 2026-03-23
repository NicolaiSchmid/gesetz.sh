import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

function normalizeEnvValue(value: string | undefined) {
  return value === "" ? undefined : value;
}

export const env = envSchema.parse({
  NODE_ENV: normalizeEnvValue(process.env.NODE_ENV),
});
