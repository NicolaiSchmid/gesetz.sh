import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "test", "production"]),
    GESETZE_PROXY_URL: z.string().url().optional(),
    GESETZE_PROXY_API_KEY: z.string().optional(),
  },
  clientPrefix: "PUBLIC_",
  client: {},
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV ?? "development",
    GESETZE_PROXY_URL: process.env.GESETZE_PROXY_URL,
    GESETZE_PROXY_API_KEY: process.env.GESETZE_PROXY_API_KEY,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
