import { z } from "zod";
import { env } from "./env.js";

export type AppStage = "local" | "test" | "develop" | "qa" | "homo" | "production";

const schema = z.object({
  NODE_ENV: z.string().default("local"),
  APP_STAGE: z.enum(["local", "test", "develop", "qa", "homo", "production"]).default("local"),
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_ORGANIZATION_ID: z.string().optional(),
  OPENAI_PROJECT_ID: z.string().optional(),
});

const parsed = schema.parse(env);

export interface AppConfig {
  appStage: AppStage;
  isProd: boolean;
  isLocal: boolean;
  isTest: boolean;
  openai: {
    apiKey: string;
    organizationId?: string;
    projectId?: string;
  };
}

export const config: AppConfig = {
  appStage: parsed.APP_STAGE,
  isProd: parsed.APP_STAGE === "production",
  isLocal: parsed.APP_STAGE === "local",
  isTest: parsed.APP_STAGE === "test",
  openai: {
    apiKey: parsed.OPENAI_API_KEY,
    organizationId: parsed.OPENAI_ORGANIZATION_ID,
    projectId: parsed.OPENAI_PROJECT_ID,
  },
};

// Agregá tus propias variables tipadas acá a medida que las necesites
// (base de datos, servicios externos, feature flags, etc.).
