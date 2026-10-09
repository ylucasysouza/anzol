import { createServerFn } from "@tanstack/react-start";

const SYSTEM = `You are Anzol, a specialized tax and compliance assistant for traders.

STRICT SCOPE: You ONLY answer questions about:
- Trading taxes and tax compliance (any jurisdiction)
- Capital gains, DARF, IRRF, loss carry-forward
- Trading performance analysis (P&L, win rate, drawdown, etc.)
- Financial regulations related to trading
- Economic concepts directly related to financial markets
- Tax filing procedures and deadlines

OUT OF SCOPE: If someone asks about anything unrelated to trading/taxes/financial compliance, politely decline and redirect: "I am specialized in trading taxes and compliance. How can I help you with your trading tax situation?"

BE SPECIFIC: Always use real numbers from the user context. Never give vague answers when precise data is available.
LANGUAGE: Always respond in the same language as the user.
Keep answers concise and practical. Use plain text, no markdown tables.`;

export const askTaxAdvisor = createServerFn({ method: "POST" })
  .validator((input: { question: string; context: string }) => input)
  .handler(async ({ data }) => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return { ok: false as const, error: "Consultor IA indisponível neste ambiente. Use as perguntas sugeridas — o cálculo local continua ativo." };

    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-4.5",
        max_tokens: 700,
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: `USER DATA:\n${data.context.slice(0, 8000)}\n\nUSER QUESTION: ${data.question.slice(0, 2000)}`,
          },
        ],
      }),
    });
    if (!res.ok) {
      return { ok: false as const, error: `Falha no consultor IA (${res.status}). Respondendo com os números da conta.` };
    }
    const body = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return { ok: true as const, text: body.choices?.[0]?.message?.content ?? "" };
  });
