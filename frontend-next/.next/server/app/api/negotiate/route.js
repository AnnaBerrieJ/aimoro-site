"use strict";(()=>{var e={};e.id=632,e.ids=[632],e.modules={20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},57147:e=>{e.exports=require("fs")},13685:e=>{e.exports=require("http")},95687:e=>{e.exports=require("https")},87561:e=>{e.exports=require("node:fs")},84492:e=>{e.exports=require("node:stream")},72477:e=>{e.exports=require("node:stream/web")},71017:e=>{e.exports=require("path")},85477:e=>{e.exports=require("punycode")},12781:e=>{e.exports=require("stream")},57310:e=>{e.exports=require("url")},73837:e=>{e.exports=require("util")},71267:e=>{e.exports=require("worker_threads")},59796:e=>{e.exports=require("zlib")},57637:(e,t,r)=>{r.r(t),r.d(t,{originalPathname:()=>g,patchFetch:()=>x,requestAsyncStorage:()=>l,routeModule:()=>d,serverHooks:()=>m,staticGenerationAsyncStorage:()=>c});var o={};r.r(o),r.d(o,{POST:()=>u});var i=r(49303),a=r(88716),s=r(60670),n=r(87070);let p=new(r(54214)).ZP({apiKey:process.env.OPENAI_API_KEY});async function u(e){try{let{supplier:t,targetPrice:r,orderQty:o,deliveryDays:i,notes:a}=await e.json(),s=await p.chat.completions.create({model:"gpt-4o-mini",messages:[{role:"system",content:`You are Aimoro AI, drafting a negotiation email from a buyer to a supplier on Alibaba/AliExpress.
Write a polite, professional, and firm message that:
- references the supplier's current listing
- states the buyer's target price, order quantity, and delivery timeline as a clear ask
- gives the supplier a reason to agree (order volume, potential for repeat business, etc.)
- ends with a clear call to action requesting a reply

Keep it under 200 words. Output only the message text, ready to copy and send, with no commentary before or after it.`},{role:"user",content:`Supplier: ${t.name} on ${t.platform}
Listed unit price: $${t.unit_price}
Listed MOQ: ${t.minimum_order_quantity}
Listed delivery: ${t.delivery_days} days
Rating: ${t.rating}, Verified: ${!!t.verified}

My target unit price: $${r}
My order quantity: ${o}
My target delivery: ${i} days
Additional notes: ${a||"none"}`}]});return n.NextResponse.json({message:s.choices[0].message.content})}catch(e){return console.error(e),n.NextResponse.json({error:"Failed to generate draft"},{status:500})}}let d=new i.AppRouteRouteModule({definition:{kind:a.x.APP_ROUTE,page:"/api/negotiate/route",pathname:"/api/negotiate",filename:"route",bundlePath:"app/api/negotiate/route"},resolvedPagePath:"/sessions/zealous-nice-lovelace/mnt/aimoro-smart-sourcing/frontend-next/app/api/negotiate/route.ts",nextConfigOutput:"standalone",userland:o}),{requestAsyncStorage:l,staticGenerationAsyncStorage:c,serverHooks:m}=d,g="/api/negotiate/route";function x(){return(0,s.patchFetch)({serverHooks:m,staticGenerationAsyncStorage:c})}}};var t=require("../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),o=t.X(0,[948,880],()=>r(57637));module.exports=o})();