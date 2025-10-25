import { Card } from "@/components/ui/card";
import { Globe, Shield, Zap, Heart } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Powered by Hedera's low-fee, high-speed DLT. Loans funded in seconds, not days.",
    gradient: "from-primary/20 to-primary/5"
  },
  {
    icon: Shield,
    title: "Transparent & Secure",
    description: "All transactions recorded on-chain. No hidden fees. Complete audit trail.",
    gradient: "from-secondary/20 to-secondary/5"
  },
  {
    icon: Globe,
    title: "Global Access",
    description: "Lenders worldwide can fund African entrepreneurs. Borderless financial inclusion.",
    gradient: "from-accent/20 to-accent/5"
  },
  {
    icon: Heart,
    title: "Community First",
    description: "Built on trust scores and community vouching. No collateral required.",
    gradient: "from-primary/20 to-primary/5"
  }
];

const Impact = () => {
  return (
    <section className="py-20 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-4xl md:text-5xl font-bold">
            Why <span className="bg-clip-text text-transparent bg-[image:var(--gradient-sunset)]">AfriLend</span>?
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Turning financial exclusion into financial empowerment
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="p-8 space-y-4 hover:shadow-[var(--shadow-warm)] transition-all bg-card border-border">
              <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${feature.gradient}`}>
                <feature.icon className="h-8 w-8 text-foreground" />
              </div>
              
              <h3 className="text-2xl font-semibold">{feature.title}</h3>
              <p className="text-muted-foreground text-lg">{feature.description}</p>
            </Card>
          ))}
        </div>
        
        {/* Call to Action Box */}
        <Card className="mt-16 p-12 text-center space-y-6 bg-[image:var(--gradient-sunset)] border-0 text-white">
          <h3 className="text-3xl md:text-4xl font-bold">
            Ready to Make an Impact?
          </h3>
          <p className="text-lg opacity-90 max-w-2xl mx-auto">
            Join thousands of lenders and borrowers building a more inclusive financial future for Africa.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <button className="px-8 py-4 bg-white text-primary rounded-lg font-semibold hover:scale-105 transition-transform shadow-lg">
              Get Started Today
            </button>
            <button className="px-8 py-4 bg-white/10 backdrop-blur-sm border-2 border-white text-white rounded-lg font-semibold hover:bg-white/20 transition-all">
              Learn More
            </button>
          </div>
        </Card>
      </div>
    </section>
  );
};

export default Impact;
