import { Link } from 'react-router-dom';
export default function NotFoundPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center text-center px-4">
      <div>
        <div className="text-6xl mb-4">404</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Page not found</h1>
        <p className="text-gray-500 mb-6">The page you're looking for doesn't exist.</p>
        <Link to="/" className="px-6 py-3 bg-brand-500 text-white font-semibold rounded-xl hover:bg-brand-600">Go Home</Link>
      </div>
    </div>
  );
}
