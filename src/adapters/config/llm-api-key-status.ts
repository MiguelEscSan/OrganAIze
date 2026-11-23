export const isLlmApiKeyConfigured = (): boolean => Boolean(process.env.LLM_API_KEY?.trim());
