import { HttpError } from './errors';

// A second way to run the assistant, for providers with a free tier. Google Gemini and
// Groq both speak the OpenAI chat-completions format, so one small loop covers both.

/** The part of an SDK tool this loop needs: its name, schema and the function to run. */
export interface RunnableTool {
  name: string;
  description?: string;
  input_schema: unknown;
  run: (input: Record<string, unknown>) => unknown;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: { id: string; type: 'function'; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
}

interface Provider {
  name: string;
  url: string;
  key: string;
  model: string;
  /** Tried in order when the main model is overloaded or out of free quota. */
  fallbacks: string[];
}

/** Whichever free provider has a key set. AI_MODEL overrides the default model for it. */
export function freeProvider(): Provider | null {
  const model = process.env.AI_MODEL?.trim();
  if (process.env.GEMINI_API_KEY) {
    return { name: 'Gemini', url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', key: process.env.GEMINI_API_KEY, model: model || 'gemini-3.8-flash', fallbacks: ['gemini-3.7-flash', 'gemini-3.5-flash-lite'] };
  }
  if (process.env.GROQ_API_KEY) {
    return { name: 'Groq', url: 'https://api.groq.com/openai/v1/chat/completions', key: process.env.GROQ_API_KEY, model: model || 'llama-3.3-70b-versatile', fallbacks: ['openai/gpt-oss-120b'] };
  }
  return null;
}

const MAX_ROUNDS = 8;

/** Asks the model, runs whatever tools it calls, and repeats until it answers in words. */
export async function runFreeAssistant(provider: Provider, system: string, history: { role: 'user' | 'assistant'; content: string }[], tools: RunnableTool[]): Promise<string> {
  const messages: ChatMessage[] = [{ role: 'system', content: system }, ...history];
  const toolDefs = tools.map((t) => ({ type: 'function' as const, function: { name: t.name, description: t.description ?? '', parameters: t.input_schema } }));

  // Free tiers get busy. A busy or exhausted model is retried once, then swapped for the next one.
  const models = [provider.model, ...provider.fallbacks.filter((m) => m !== provider.model)];
  let current = 0;
  const post = (model: string) =>
    fetch(provider.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${provider.key}` },
      body: JSON.stringify({ model, messages, tools: toolDefs, tool_choice: 'auto' }),
      signal: AbortSignal.timeout(45_000),
    });
  const busy = (status: number) => status === 429 || status === 500 || status === 503 || status === 404;

  for (let round = 0; round < MAX_ROUNDS; round++) {
    let res = await post(models[current]);
    if (res.status === 503 || res.status === 500) {
      await new Promise((r) => setTimeout(r, 1500));
      res = await post(models[current]);
    }
    while (busy(res.status) && current < models.length - 1) {
      console.warn(`Assistant (${provider.name}): ${models[current]} answered ${res.status}, trying ${models[current + 1]}.`);
      current += 1;
      res = await post(models[current]);
    }

    if (!res.ok) {
      const detail = (await res.text().catch(() => '')).slice(0, 300);
      console.error(`Assistant (${provider.name}) error ${res.status}: ${detail}`);
      if (res.status === 401 || res.status === 403) throw new HttpError(503, 'The assistant is not set up correctly. Ask your admin to check the AI key on the server.');
      if (res.status === 429) throw new HttpError(429, 'The assistant has reached its free limit for now. Try again in a minute.');
      if (res.status === 404) throw new HttpError(503, 'The assistant is set to a model that is no longer available. Ask your admin to update AI_MODEL on the server.');
      throw new HttpError(502, 'The assistant could not answer just now. Please try again.');
    }

    const data = (await res.json()) as { choices?: { message?: ChatMessage }[] };
    const message = data.choices?.[0]?.message;
    if (!message) throw new HttpError(502, 'The assistant could not answer just now. Please try again.');

    const calls = message.tool_calls ?? [];
    if (!calls.length) return (message.content ?? '').trim();

    messages.push({ role: 'assistant', content: message.content ?? null, tool_calls: calls });
    // Every call gets an answer, even a failed one, or the next request is rejected.
    for (const call of calls) {
      const tool = tools.find((t) => t.name === call.function.name);
      let result: string;
      try {
        if (!tool) throw new Error(`Unknown tool ${call.function.name}`);
        const input = call.function.arguments ? JSON.parse(call.function.arguments) : {};
        result = String(await tool.run(input));
      } catch (err) {
        result = JSON.stringify({ error: err instanceof Error ? err.message : 'Tool failed' });
      }
      messages.push({ role: 'tool', tool_call_id: call.id, content: result });
    }
  }
  return '';
}

/** One plain completion, no tools: used for summaries. Falls through the same model list when one is busy. */
export async function freeComplete(provider: Provider, system: string, user: string): Promise<string> {
  const models = [provider.model, ...provider.fallbacks.filter((m) => m !== provider.model)];
  let lastStatus = 0;
  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await fetch(provider.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${provider.key}` },
        body: JSON.stringify({ model, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
        signal: AbortSignal.timeout(60_000),
      });
      if (res.ok) {
        const data = (await res.json()) as { choices?: { message?: { content?: string | null } }[] };
        const text = data.choices?.[0]?.message?.content?.trim();
        if (text) return text;
        break;
      }
      lastStatus = res.status;
      console.warn(`Summary (${provider.name}): ${model} answered ${res.status}.`);
      if (res.status === 401 || res.status === 403) throw new HttpError(503, 'The AI key on the server was rejected.');
      if (res.status !== 503 && res.status !== 500) break;
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
  throw new HttpError(502, `The AI model could not be reached (${lastStatus}).`);
}
