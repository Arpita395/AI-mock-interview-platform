import { generateObject } from "ai";
import { z } from "zod";
import { createOpenAI } from "@ai-sdk/openai";

const openrouter = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY!,
  baseURL: "https://openrouter.ai/api/v1",
});

export async function POST(request: Request) {
  const { sentence } = await request.json();

  try {
    const { object } = await generateObject({
      model: openrouter("openai/gpt-4o-mini"),
      schema: z.object({
        role: z.string(),
        type: z.string(),
        level: z.string(),
        techstack: z.string(),
        amount: z.string()
}),
      prompt: `
Extract:
- role
- type (technical, behavioural, mixed)
- level (junior, mid, senior)
- techstack
- amount

If a value is not present, return an empty string "".

Sentence:
"${sentence}"

Return JSON only.
`
    });

    return Response.json({ success: true, data: object });

  } catch (error) {
    console.log("PARSE ERROR:", error);
    return Response.json({ success: false, error: String(error) });
  }
}