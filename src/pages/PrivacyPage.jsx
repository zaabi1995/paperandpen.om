export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
      <p className="text-sm text-gray-500 mb-10">Last updated: 14 April 2026</p>

      <div className="prose prose-gray max-w-none text-gray-600 space-y-4">
        <p>
          Paper and Pen Company LLC ("we", "us") respects your privacy. This policy explains
          what we collect, how we use it, and your rights. It applies to anyone who visits
          <a href="https://paperandpen.om" className="text-brand-500"> paperandpen.om</a> or uses Paper &amp; Pen ERP.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mt-8">Information We Collect</h2>
        <p><strong>Account data:</strong> company name, owner name, email address, phone number (if provided).</p>
        <p><strong>Billing data:</strong> collected only if you enable a paid module. Card details are processed by our payment partner Paymob (Oman) and tokenized, we never see or store your full card number.</p>
        <p><strong>Usage data:</strong> basic logs (IP address, browser, request timestamps) used for security and troubleshooting. We do not use third-party advertising or cross-site tracking.</p>
        <p><strong>Your business data:</strong> everything you enter into your workspace (clients, invoices, products, etc.) belongs to you. We process it only to operate the Service on your behalf.</p>

        <h2 className="text-xl font-semibold text-gray-900 mt-8">How We Use Your Information</h2>
        <ul className="list-disc pl-6">
          <li>To provide and operate the Service (sign-in, workspace provisioning, notifications).</li>
          <li>To send essential account emails (welcome, password reset, sign-in codes, billing receipts).</li>
          <li>To communicate about product updates (you can opt out of non-essential messages).</li>
          <li>To comply with legal obligations and protect the Service from abuse.</li>
        </ul>

        <h2 className="text-xl font-semibold text-gray-900 mt-8">Where Your Data Is Stored</h2>
        <p>
          All data is stored on servers located in the GCC region. Each workspace has a fully
          isolated database, your data is never mixed with other businesses. Backups are
          encrypted at rest and retained for 30 days.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mt-8">Who We Share Data With</h2>
        <p>We do not sell your data. We share only the minimum necessary with trusted service providers, under contract:</p>
        <ul className="list-disc pl-6">
          <li><strong>Paymob</strong>, to process card payments for paid modules.</li>
          <li><strong>Dardasha</strong>, to send WhatsApp sign-in codes and notifications, only if you opt in.</li>
          <li><strong>Hostinger</strong>, infrastructure hosting in the region.</li>
        </ul>
        <p>
          We may also disclose information if required by a lawful order from Omani authorities
          or to protect the rights, property, or safety of Paper &amp; Pen, our users, or the public.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mt-8">Your Rights</h2>
        <p>You can at any time:</p>
        <ul className="list-disc pl-6">
          <li><strong>Access</strong> or <strong>export</strong> all your workspace data from Settings → Subscription → Request Data Export.</li>
          <li><strong>Correct</strong> your account information from within your profile.</li>
          <li><strong>Delete</strong> your workspace. We will erase or anonymize your data within 30 days, except where retention is required by law (for example, tax records).</li>
          <li><strong>Withdraw consent</strong> for non-essential communications via the unsubscribe link in every email.</li>
        </ul>

        <h2 className="text-xl font-semibold text-gray-900 mt-8">Cookies and Local Storage</h2>
        <p>
          We use only essential cookies and browser local storage to keep you signed in, remember
          your language choice, and secure your session. We do not use tracking cookies or
          third-party advertising cookies.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mt-8">Security</h2>
        <p>
          All traffic is encrypted with TLS. Passwords are hashed with bcrypt. Per-tenant
          database isolation prevents cross-tenant access. We follow reasonable industry
          practices but no system is 100% secure, please report any concerns to
          <a href="mailto:security@paperandpen.om" className="text-brand-500"> security@paperandpen.om</a>.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mt-8">Children</h2>
        <p>
          Paper &amp; Pen ERP is a business tool and is not intended for children under 18. We do
          not knowingly collect data from minors.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mt-8">Changes</h2>
        <p>
          We will notify you by email and announce in-product at least 14 days before any
          material change to this policy. Continued use after the effective date constitutes
          acceptance.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mt-8">Contact</h2>
        <p>
          Paper and Pen Company LLC, Muscat, Sultanate of Oman.<br />
          Privacy inquiries: <a href="mailto:privacy@paperandpen.om" className="text-brand-500">privacy@paperandpen.om</a>
        </p>
      </div>
    </div>
  );
}
