export interface EnvType {
  NODE_ENV: string;
  APP_STAGE: string;
  OPENAI_API_KEY: string;
}

const getEnvVariables = (): Partial<EnvType> => ({
  NODE_ENV: process.env.NODE_ENV,
  APP_STAGE: process.env.APP_STAGE,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
});

export const env: Partial<EnvType> = getEnvVariables();
