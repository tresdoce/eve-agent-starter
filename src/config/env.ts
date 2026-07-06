export interface EnvType {
  NODE_ENV: string;
  APP_STAGE: string;
  OPENAI_API_KEY: string;
  OPENAI_MODEL: string;
  OPENAI_REASONING_EFFORT: string;
  ROUTE_AUTH_BASIC_USERNAME: string;
  ROUTE_AUTH_BASIC_PASSWORD: string;
}

const getEnvVariables = (): Partial<EnvType> => ({
  NODE_ENV: process.env.NODE_ENV,
  APP_STAGE: process.env.APP_STAGE,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_MODEL: process.env.OPENAI_MODEL,
  OPENAI_REASONING_EFFORT: process.env.OPENAI_REASONING_EFFORT,
  ROUTE_AUTH_BASIC_USERNAME: process.env.ROUTE_AUTH_BASIC_USERNAME,
  ROUTE_AUTH_BASIC_PASSWORD: process.env.ROUTE_AUTH_BASIC_PASSWORD,
});

export const env: Partial<EnvType> = getEnvVariables();
