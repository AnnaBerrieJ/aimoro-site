import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { supplier, targetPrice, orderQty, deliveryDays, notes, templatePrompt } = await req.json()

    const styleInstruction = templatePrompt
      ? templatePrompt
      : `Write a polite, professional, and firm message that references the supplier's listing, states the buyer's target terms as a clear ask, gives a reason to agree, and ends with a call to action.`

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are Aimoro AI, drafting a negotiation email from a buyer to a supplier on Alibaba/AliExpress.
${styleInstruction}

Keep it under 200 words. Output only the message text, ready to copy and send, with no commentary before or after it.`,
        },
        {
          role: 'user',
          content: `Supplier: ${supplier.name} on ${supplier.platform}
Listed unit price: $${supplier.unit_price}
Listed MOQ: ${supplier.minimum_order_quantity}
Listed delivery: ${supplier.delivery_days} days
Rating: ${supplier.rating}, Verified: ${Boolean(supplier.verified)}

My target unit price: $${targetPrice}
My order quantity: ${orderQty}
My target delivery: ${deliveryDays} days
Additional context: ${notes || 'none'}`,
        },
      ],
    })

    return NextResponse.json({ message: completion.choices[0].message.content })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to generate draft' }, { status: 500 })
  }
}
