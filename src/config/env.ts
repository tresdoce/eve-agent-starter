export interface EnvType {
  NODE_ENV: string;
  APP_STAGE: string;
  OPENAI_API_KEY: string;
  OPENAI_ORGANIZATION_ID: string;
  OPENAI_PROJECT_ID: string;
}

const getEnvVariables = (): Partial<EnvType> => ({
  NODE_ENV: process.env.NODE_ENV,
  APP_STAGE: process.env.APP_STAGE,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_ORGANIZATION_ID: process.env.OPENAI_ORGANIZATION_ID,
  OPENAI_PROJECT_ID: process.env.OPENAI_PROJECT_ID,
});

export const env: Partial<EnvType> = getEnvVariables();
