import { z } from "zod";
import { env } from "./env.js";

export type AppStage = "local" | "test" | "develop" | "qa" | "homo" | "production";

const schema = z.object({
  NODE_ENV: z.string().default("development"),
  APP_STAGE: z.enum(["local", "test", "develop", "qa", "homo", "production"]).default("local"),
  OPENAI_API_KEY: z.string().min(1),
});

const parsed = schema.parse(env);

export interface AppConfig {
  appStage: AppStage;
  openai: {
    apiKey: string;
  };
}

export const config: AppConfig = {
  appStage: parsed.APP_STAGE,
  openai: {
    apiKey: parsed.OPENAI_API_KEY,
  },
};

// Comparé contra config.appStage donde haga falta (ej: config.appStage === "production").
// Agregá tus propias variables tipadas acá a medida que las necesites
// (base de datos, servicios externos, feature flags, etc.).
