import { Agent, fetch as undiciFetch, type Dispatcher } from "undici";
import type { OllamaFetch } from "./ollama-llm-client";

type DispatchingFetch = (
  url: string,
  init: { method: "POST"; headers: Record<string, string>; body: string; dispatcher: Dispatcher },
) => Promise<Response>;

type AgentFactory = (options: { headersTimeout: number; bodyTimeout: number }) => Dispatcher;

const withoutTimeouts: AgentFactory = (options) => new Agent(options);

export const createOllamaFetch = (
  dispatchingFetch: DispatchingFetch,
  createAgent: AgentFactory = withoutTimeouts,
): OllamaFetch => {
  const dispatcher = createAgent({ headersTimeout: 0, bodyTimeout: 0 });

  return (url, init) => dispatchingFetch(url, { ...init, dispatcher });
};

export const createUndiciOllamaFetch = (): OllamaFetch =>
  createOllamaFetch((url, init) => undiciFetch(url, init) as unknown as Promise<Response>);
