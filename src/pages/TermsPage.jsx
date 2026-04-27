export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
      <p className="text-sm text-gray-500 mb-10">Last updated: 14 April 2026 · Governed by the laws of the Sultanate of Oman.</p>

      <div className="prose prose-gray max-w-none text-gray-600 space-y-4">
        <p>
          These Terms of Service ("Terms") govern your access to and use of Paper &amp; Pen ERP
          (the "Service") operated by Paper and Pen Company LLC ("we", "us", "our"), a company
          registered in the Sultanate of Oman. By creating an account or using the Service,
          you agree to be bound by these Terms. If you do not agree, do not use the Service.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mt-8">1. The Service</h2>
        <p>
          Paper &amp; Pen ERP is a cloud-based, multi-tenant business management platform for
          small and mid-sized businesses in the GCC. Core features (Sales &amp; Invoicing) are
          available free of charge. Additional modules (Inventory, HR &amp; Payroll, Accounting,
          Manufacturing, Reports) are available as paid add-ons.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mt-8">2. Accounts</h2>
        <p>
          You must provide accurate information when creating an account and keep it up to date.
          You are responsible for maintaining the confidentiality of your login credentials and
          for all activity under your account. Notify us immediately of any unauthorized use at
          <a href="/#contact" className="text-brand-500">our contact form</a>.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mt-8">3. Free Plan and Paid Modules</h2>
        <p>
          The Sales &amp; Invoicing plan is free of charge for as long as you use it and does not
          require a credit card. If you enable any paid module, a 14-day free trial applies. A
          card is captured for verification (0.100 OMR authorization refunded immediately) at the
          start of the trial and charged on a recurring monthly or annual basis after the trial
          unless you cancel. Prices are displayed in OMR and exclusive of any applicable taxes.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mt-8">4. Cancellation and Refunds</h2>
        <p>
          You may cancel any paid subscription at any time from within your workspace settings.
          Monthly subscriptions cancel at the end of the current billing period; annual
          subscriptions are not refundable for unused time except where required by law. The
          free plan remains available after cancellation of paid modules.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mt-8">5. Your Data</h2>
        <p>
          All data you submit remains yours. Each workspace is provisioned with an isolated
          database; we do not mix tenants or share data between customers. You can export your
          data at any time from your workspace settings. We will return or delete your data
          within 30 days of account termination, except where retention is required by law.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mt-8">6. Acceptable Use</h2>
        <p>
          You agree not to: (a) use the Service for illegal activity; (b) reverse-engineer,
          disrupt, or probe it; (c) resell or sublicense access; (d) upload malware, illegal
          content, or others' copyrighted material; or (e) attempt to circumvent security or
          access other tenants' data. We may suspend or terminate accounts that violate this
          section.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mt-8">7. Service Availability</h2>
        <p>
          We aim for high availability but do not guarantee uninterrupted access. The Service is
          provided "as is" without warranties of any kind to the fullest extent permitted by law.
          Planned maintenance will be communicated in advance when possible.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mt-8">8. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by applicable law, our total liability to you for any
          claim arising out of the Service is limited to the amount you paid us in the 12 months
          preceding the claim. We are not liable for indirect, incidental, or consequential damages.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mt-8">9. Changes</h2>
        <p>
          We may update these Terms from time to time. Material changes will be announced via
          email or in the product at least 14 days before taking effect. Continued use of the
          Service after the effective date constitutes acceptance.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mt-8">10. Governing Law</h2>
        <p>
          These Terms are governed by the laws of the Sultanate of Oman. Any dispute shall be
          submitted to the exclusive jurisdiction of the courts of Muscat.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mt-8">11. Contact</h2>
        <p>
          Paper and Pen Company LLC, Muscat, Sultanate of Oman.<br />
          General enquiries: <a href="/#contact" className="text-brand-500">our contact form</a><br />
          Legal notices: <a href="/#contact" className="text-brand-500">our contact form</a>
        </p>
      </div>
    </div>
  );
}
