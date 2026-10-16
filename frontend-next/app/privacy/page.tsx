import type { Metadata } from 'next'
import { LegalPage } from '@/components/legal/LegalPage'
import { CONTACT_EMAIL } from '@/lib/agent'

export const metadata: Metadata = { title: 'Privacy Policy · AIMORO' }

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="October 16, 2026">
      <p>This policy explains what personal information AIMORO collects on aimoro.co, why we collect it and how we look after it.</p>

      <section>
        <h2>What we collect</h2>
        <ul>
          <li><strong>Account details:</strong> your name, email address, phone or WhatsApp number, island and delivery address.</li>
          <li><strong>Your requests:</strong> product descriptions, links and photos you upload, quantities and budgets.</li>
          <li><strong>Orders and payments:</strong> quotes, invoices and payment status. If you pay by card, your card details are handled by our payment provider and never stored by us.</li>
          <li><strong>Messages:</strong> emails you send us.</li>
        </ul>
      </section>

      <section>
        <h2>How we use it</h2>
        <ul>
          <li>To find and buy the products you request, prepare quotes and invoices, and deliver your orders.</li>
          <li>To send you updates about your requests by email, and by WhatsApp if you have given us your number.</li>
          <li>To answer your questions and keep your account secure.</li>
        </ul>
        <p>We do not sell your personal information, and we do not use it for third-party advertising.</p>
      </section>

      <section>
        <h2>Who we share it with</h2>
        <p>We share it only with the people and services needed to complete your order: shipping and delivery partners (your name, phone and delivery address), our payment provider, our email provider, and the hosting service that runs this website. Suppliers do not receive your personal details.</p>
      </section>

      <section>
        <h2>How we protect it</h2>
        <p>Your password is stored in scrambled (hashed) form, so nobody, including us, can read it. Only you and the AIMORO team can see your requests, and access to our systems is restricted.</p>
      </section>

      <section>
        <h2>How long we keep it</h2>
        <p>We keep your account and order records while your account is open and as long as needed for accounting and to resolve any issues. You can ask us to delete your account at any time.</p>
      </section>

      <section>
        <h2>Your choices</h2>
        <p>You can ask to see, correct or delete your personal information by emailing <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
      </section>

      <section>
        <h2>Changes</h2>
        <p>If we change this policy, we will update the date at the top of this page.</p>
      </section>
    </LegalPage>
  )
}
