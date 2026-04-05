import HeroSection from '@/components/sections/HeroSection';
import LanguageShowcaseSection from '@/components/sections/LanguageShowcaseSection';
import PricingSection from '@/components/sections/PricingSection';
import ModuleShowcaseSection from '@/components/sections/ModuleShowcaseSection';
import CompareSection from '@/components/sections/CompareSection';
import TrustSection from '@/components/sections/TrustSection';
export default function HomePage() {
  return (
    <>
      <HeroSection />
      <LanguageShowcaseSection />
      <ModuleShowcaseSection />
      <PricingSection />
      <CompareSection />
      <TrustSection />
    </>
  );
}
