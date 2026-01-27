import { Header } from "@/components/landing/Header";
import { HeroSection } from "@/components/landing/HeroSection";
import { BenefitsSection } from "@/components/landing/BenefitsSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { ExamTypesSection } from "@/components/landing/ExamTypesSection";
import { Footer } from "@/components/landing/Footer";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <HeroSection />
        <BenefitsSection />
        <HowItWorksSection />
        <ExamTypesSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
