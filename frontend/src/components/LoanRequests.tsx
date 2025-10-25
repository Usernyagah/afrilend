import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { MapPin, Clock, Target } from "lucide-react";

const loans = [
  {
    name: "Amara O.",
    location: "Lagos, Nigeria",
    amount: "$500",
    purpose: "Expand food stall inventory",
    funded: 75,
    trustScore: 92,
    timeLeft: "3 days",
    image: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400&h=400&fit=crop"
  },
  {
    name: "Kwame D.",
    location: "Accra, Ghana",
    amount: "$350",
    purpose: "Purchase sewing equipment",
    funded: 45,
    trustScore: 88,
    timeLeft: "5 days",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop"
  },
  {
    name: "Fatima M.",
    location: "Nairobi, Kenya",
    amount: "$750",
    purpose: "Start mobile produce business",
    funded: 60,
    trustScore: 95,
    timeLeft: "2 days",
    image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop"
  }
];

const LoanRequests = () => {
  return (
    <section className="py-20 px-4 bg-muted/30">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-4xl md:text-5xl font-bold">Featured Loan Requests</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Support entrepreneurs across Africa and earn fair returns
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loans.map((loan, index) => (
            <Card key={index} className="overflow-hidden hover:shadow-[var(--shadow-warm)] transition-all hover:scale-105 bg-card">
              {/* Borrower Image */}
              <div className="relative h-48 overflow-hidden">
                <img 
                  src={loan.image} 
                  alt={loan.name}
                  className="w-full h-full object-cover"
                />
                <Badge className="absolute top-4 right-4 bg-accent text-accent-foreground">
                  Trust Score: {loan.trustScore}
                </Badge>
              </div>
              
              <div className="p-6 space-y-4">
                {/* Borrower Info */}
                <div>
                  <h3 className="text-xl font-semibold mb-2">{loan.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {loan.location}
                  </div>
                </div>
                
                {/* Loan Purpose */}
                <div className="flex items-start gap-2">
                  <Target className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                  <p className="text-sm">{loan.purpose}</p>
                </div>
                
                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold">{loan.amount}</span>
                    <span className="text-muted-foreground">{loan.funded}% funded</span>
                  </div>
                  <Progress value={loan.funded} className="h-2" />
                </div>
                
                {/* Time Left */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {loan.timeLeft} left
                </div>
                
                {/* CTA */}
                <Button className="w-full">
                  Fund This Loan
                </Button>
              </div>
            </Card>
          ))}
        </div>
        
        <div className="text-center mt-12">
          <Button variant="outline" size="lg" className="hover:bg-secondary hover:text-secondary-foreground hover:border-secondary">
            View All Loan Requests
          </Button>
        </div>
      </div>
    </section>
  );
};

export default LoanRequests;
