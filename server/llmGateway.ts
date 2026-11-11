import type { Response } from 'express';

export const AVAILABLE_MODELS = [
  { id: 'remote-magpie/workbuddy-2/deepseek-v4.1-flash', label: 'DeepSeek V4.1 Flash · 极速犀利 (3s)' },
  { id: 'remote-magpie/antigravity/gemini-4-argon', label: 'Gemini 4 Argon · 深度拆解' },
  { id: 'remote-magpie/antigravity/gemini-3.8-flash', label: 'Gemini 3.8 Flash · 均衡稳定' },
];

const GATEWAY_URL = process.env.MAGPIE_GATEWAY_URL || 'http://127.0.0.1:3425/v1/chat/completions';

function buildFallbackChain(preferred?: string): string[] {
  const defaults = AVAILABLE_MODELS.map((m) => m.id);
  if (preferred && defaults.includes(preferred)) {
    return [preferred, ...defaults.filter((x) => x !== preferred)];
  }
  return defaults;
}

export async function callLlmJson<T>(opts: {
  system: string;
  user: string;
  preferredModel?: string;
  temperature?: number;
  timeoutMs?: number;
}): Promise<{ data: T; modelUsed: string }> {
  const models = buildFallbackChain(opts.preferredModel);
  const timeoutMs = opts.timeoutMs ?? 45000;
  let lastErr: unknown;

  for (const model of models) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeoutMs);
      const res = await fetch(GATEWAY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: ctrl.signal,
        body: JSON.stringify({
          model,
          temperature: opts.temperature ?? 0.35,
          messages: [
            {
              role: 'system',
              content:
                opts.system +
                '\n\nCRITICAL: Output ONLY valid raw JSON. Do NOT wrap in ```json markdown fences or add commentary before/after the JSON.',
            },
            { role: 'user', content: opts.user },
          ],
        }),
      });
      clearTimeout(timer);

      if (!res.ok) {
        throw new Error(`Gateway HTTP ${res.status} on ${model}`);
      }
      const payload = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      let raw = payload.choices?.[0]?.message?.content?.trim() || '';
      raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      const firstBrace = raw.search(/[\[{]/);
      const lastBrace = Math.max(raw.lastIndexOf('}'), raw.lastIndexOf(']'));
      if (firstBrace >= 0 && lastBrace > firstBrace) {
        raw = raw.slice(firstBrace, lastBrace + 1);
      }
      const parsed = JSON.parse(raw) as T;
      return { data: parsed, modelUsed: model };
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('All local gateway models failed');
}

export async function streamLlmMarkdown(opts: {
  system: string;
  user: string;
  preferredModel?: string;
  temperature?: number;
  res: Response;
  metaPayload?: Record<string, unknown>;
}): Promise<void> {
  const { res } = opts;
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');

  if (opts.metaPayload) {
    res.write(`data: ${JSON.stringify({ type: 'meta', ...opts.metaPayload })}\n\n`);
  }

  const models = buildFallbackChain(opts.preferredModel);
  let succeeded = false;

  for (const model of models) {
    try {
      const upstream = await fetch(GATEWAY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          stream: true,
          temperature: opts.temperature ?? 0.45,
          messages: [
            { role: 'system', content: opts.system },
            { role: 'user', content: opts.user },
          ],
        }),
      });

      if (!upstream.ok || !upstream.body) {
        continue;
      }

      res.write(`data: ${JSON.stringify({ type: 'model', model })}\n\n`);
      const reader = upstream.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let emittedAny = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const jsonStr = trimmed.slice(5).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const chunk = JSON.parse(jsonStr) as {
              choices?: Array<{ delta?: { content?: string } }>;
            };
            const delta = chunk.choices?.[0]?.delta?.content;
            if (delta) {
              emittedAny = true;
              res.write(`data: ${JSON.stringify({ type: 'delta', text: delta })}\n\n`);
            }
          } catch {
            // ignore partial line parse errors
          }
        }
      }

      if (emittedAny) {
        succeeded = true;
        break;
      }
    } catch {
      // try next fallback model
    }
  }

  if (!succeeded) {
    res.write(
      `data: ${JSON.stringify({
        type: 'error',
        message: '本地模型网关暂时繁忙，请稍后重试或切换右上角模型引擎。',
      })}\n\n`
    );
  }
  res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
  res.end();
}
