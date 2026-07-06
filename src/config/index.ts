import { z } from "zod";
import { env } from "./env.js";

export type AppStage = "local" | "test" | "develop" | "qa" | "homo" | "production";

const schema = z.object({
  NODE_ENV: z.string().default("development"),
  APP_STAGE: z.enum(["local", "test", "develop", "qa", "homo", "production"]).default("local"),
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_MODEL: z.string().default("gpt-4o"),
  ROUTE_AUTH_BASIC_USERNAME: z.string().default(""),
  ROUTE_AUTH_BASIC_PASSWORD: z.string().default(""),
});

const parsed = schema.parse(env);

export interface AppConfig {
  appStage: AppStage;
  isProd: boolean;
  openai: {
    apiKey: string;
    model: string;
  };
  routeAuth: {
    username: string;
    password: string;
  };
}

export const config: AppConfig = {
  appStage: parsed.APP_STAGE,
  isProd: parsed.APP_STAGE === "production",
  openai: {
    apiKey: parsed.OPENAI_API_KEY,
    model: parsed.OPENAI_MODEL,
  },
  routeAuth: {
    username: parsed.ROUTE_AUTH_BASIC_USERNAME,
    password: parsed.ROUTE_AUTH_BASIC_PASSWORD,
  },
};

// Para cualquier otro stage, comparé contra config.appStage directamente.
// Agregá tus propias variables tipadas acá a medida que las necesites
// (base de datos, servicios externos, feature flags, etc.).
