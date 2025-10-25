import { Wallet, Users, HandshakeIcon, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";

const steps = [
  {
    icon: Wallet,
    title: "Connect Your Wallet",
    description: "No bank account needed. Just your digital wallet to get started.",
    color: "text-primary"
  },
  {
    icon: Users,
    title: "Build Community Trust",
    description: "Earn trust scores through community vouching and successful transactions.",
    color: "text-secondary"
  },
  {
    icon: HandshakeIcon,
    title: "Request or Fund Loans",
    description: "Borrowers request microloans. Lenders fund them instantly on-chain.",
    color: "text-accent"
  },
  {
    icon: TrendingUp,
    title: "Grow Together",
    description: "Transparent repayments. Fair interest. Economic empowerment for all.",
    color: "text-primary"
  }
];

const HowItWorks = () => {
  return (
    <section className="py-20 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-4xl md:text-5xl font-bold">How AfriLend Works</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Four simple steps to financial inclusion
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, index) => (
            <Card key={index} className="p-6 space-y-4 hover:shadow-[var(--shadow-warm)] transition-all hover:scale-105 bg-card border-border">
              <div className="flex items-center justify-between">
                <div className={`p-3 rounded-xl bg-gradient-to-br from-${step.color.split('-')[1]}/20 to-${step.color.split('-')[1]}/5`}>
                  <step.icon className={`h-6 w-6 ${step.color}`} />
                </div>
                <div className="text-4xl font-bold text-muted/20">{index + 1}</div>
              </div>
              
              <h3 className="text-xl font-semibold">{step.title}</h3>
              <p className="text-muted-foreground">{step.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
