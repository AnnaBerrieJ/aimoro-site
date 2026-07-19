import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

interface Message { role: 'user' | 'assistant'; content: string }

export async function POST(req: NextRequest) {
  try {
    const { messages }: { messages: Message[] } = await req.json()

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are Aimoro AI, an expert sourcing assistant for ecommerce founders. You help with:
- Finding and evaluating suppliers on Alibaba and AliExpress
- Comparing supplier quality, pricing, and risk
- Negotiation strategies and scripts
- Spotting red flags and avoiding fraud
- MOQ, shipping, and delivery advice

Keep responses concise, structured, and practical. Use bullet points and short paragraphs. Do not use markdown headers.`,
        },
        ...messages,
      ],
    })

    return NextResponse.json({ answer: completion.choices[0].message.content })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to get response' }, { status: 500 })
  }
}
