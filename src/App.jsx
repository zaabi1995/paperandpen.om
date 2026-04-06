import { BrowserRouter, Routes, Route } from 'react-router-dom';
import I18nProvider from '@/i18n/I18nProvider';
import HomePage from '@/pages/HomePage';
import SignupPage from '@/pages/SignupPage';
import LoginPage from '@/pages/LoginPage';
import TermsPage from '@/pages/TermsPage';
import PrivacyPage from '@/pages/PrivacyPage';
import NotFoundPage from '@/pages/NotFoundPage';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ErrorBoundary from '@/components/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <I18nProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/*" element={
              <div className="min-h-screen flex flex-col">
                <Navbar />
                <main className="flex-1">
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/terms" element={<TermsPage />} />
                    <Route path="/privacy" element={<PrivacyPage />} />
                    <Route path="*" element={<NotFoundPage />} />
                  </Routes>
                </main>
                <Footer />
              </div>
            } />
          </Routes>
        </BrowserRouter>
      </I18nProvider>
    </ErrorBoundary>
  );
}
