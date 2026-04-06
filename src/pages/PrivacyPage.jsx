export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Privacy Policy</h1>
      <div className="text-gray-600 space-y-4">
        <p>Last updated: April 2026</p>
        <h2 className="text-xl font-semibold text-gray-900 mt-8">Data We Collect</h2>
        <p>We collect company name, email address, and billing information during signup. We do not collect personal data beyond what is necessary for the service.</p>
        <h2 className="text-xl font-semibold text-gray-900 mt-8">Data Storage</h2>
        <p>All data is stored on servers in the GCC region. Each business has a fully isolated database — your data is never mixed with other businesses.</p>
        <h2 className="text-xl font-semibold text-gray-900 mt-8">Data Export</h2>
        <p>You can export all your data at any time from Settings → Subscription → Request Data Export.</p>
        <h2 className="text-xl font-semibold text-gray-900 mt-8">Contact</h2>
        <p>Privacy inquiries: <a href="mailto:info@paperandpen.om" className="text-brand-500">info@paperandpen.om</a></p>
      </div>
    </div>
  );
}
