import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { question } = await req.json()

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are Aimoro AI, an expert sourcing assistant. Your job:
- Analyze suppliers and compare Alibaba vs AliExpress
- Explain sourcing risks and help ecommerce founders
- Help users negotiate pricing and recommend suppliers
- Provide sourcing advice

Keep responses concise and professional.`,
        },
        {
          role: 'user',
          content: question,
        },
      ],
    })

    return NextResponse.json({ answer: completion.choices[0].message.content })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to get response' }, { status: 500 })
  }
}
