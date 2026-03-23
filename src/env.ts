import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  GESETZE_PROXY_URL: z.string().url().optional(),
  GESETZE_PROXY_API_KEY: z.string().optional(),
});

function normalizeEnvValue(value: string | undefined) {
  return value === "" ? undefined : value;
}

export const env = envSchema.parse({
  NODE_ENV: normalizeEnvValue(process.env.NODE_ENV),
  GESETZE_PROXY_URL: normalizeEnvValue(process.env.GESETZE_PROXY_URL),
  GESETZE_PROXY_API_KEY: normalizeEnvValue(process.env.GESETZE_PROXY_API_KEY),
});
