import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import HowItWorks from "@/components/HowItWorks";
import LoanRequests from "@/components/LoanRequests";
import Impact from "@/components/Impact";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <Hero />
      <HowItWorks />
      <LoanRequests />
      <Impact />
      <Footer />
    </div>
  );
};

export default Index;
