import { Button } from "@/components/ui/button";
import { ArrowRight, Users, TrendingUp } from "lucide-react";

const Hero = () => {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-[image:var(--gradient-hero)]" />
      
      {/* Decorative circles */}
      <div className="absolute top-20 right-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 left-20 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-pulse delay-1000" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border shadow-sm">
            <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
            <span className="text-sm font-medium">Powered by Hedera DLT</span>
          </div>
          
          {/* Main Heading */}
          <h1 className="text-5xl md:text-7xl font-bold leading-tight">
            Empowering Africa's{" "}
            <span className="bg-clip-text text-transparent bg-[image:var(--gradient-sunset)]">
              Unbanked
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
            Connect community lenders with everyday borrowers through peer-to-peer microloans. 
            No banks. No middlemen. Just trust, transparency, and opportunity.
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button size="lg" className="text-lg px-8 py-6 shadow-[var(--shadow-warm)] hover:scale-105 transition-transform">
              Request a Loan
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 py-6 hover:bg-secondary hover:text-secondary-foreground hover:border-secondary transition-all">
              Fund Borrowers
              <TrendingUp className="ml-2 h-5 w-5" />
            </Button>
          </div>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-8 pt-12 max-w-2xl mx-auto">
            <div className="space-y-2">
              <div className="text-3xl md:text-4xl font-bold text-primary">$2.5M+</div>
              <div className="text-sm text-muted-foreground">Loans Funded</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl md:text-4xl font-bold text-secondary">15K+</div>
              <div className="text-sm text-muted-foreground">Active Borrowers</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl md:text-4xl font-bold text-accent">98%</div>
              <div className="text-sm text-muted-foreground">Repayment Rate</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
