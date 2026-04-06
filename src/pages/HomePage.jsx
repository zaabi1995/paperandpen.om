import HeroSection from '@/components/sections/HeroSection';
import LanguageShowcaseSection from '@/components/sections/LanguageShowcaseSection';
import PricingSection from '@/components/sections/PricingSection';
import ModuleShowcaseSection from '@/components/sections/ModuleShowcaseSection';
import CompareSection from '@/components/sections/CompareSection';
import TrustSection from '@/components/sections/TrustSection';
import ErrorBoundary from '@/components/ErrorBoundary';
export default function HomePage() {
  return (
    <>
      <ErrorBoundary fallback={<section className="px-6 py-16 text-center text-sm text-ink-400">The hero section is temporarily unavailable.</section>}>
        <HeroSection />
      </ErrorBoundary>
      <LanguageShowcaseSection />
      <ModuleShowcaseSection />
      <PricingSection />
      <CompareSection />
      <TrustSection />
    </>
  );
}
