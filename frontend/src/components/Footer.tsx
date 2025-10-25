import { Heart } from "lucide-react";

const Footer = () => {
  return (
    <footer className="py-12 px-4 border-t border-border bg-muted/20">
      <div className="container mx-auto max-w-6xl">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div className="space-y-4">
            <h3 className="text-xl font-bold bg-clip-text text-transparent bg-[image:var(--gradient-sunset)]">
              AfriLend
            </h3>
            <p className="text-sm text-muted-foreground">
              Empowering Africa's unbanked through peer-to-peer microloans on Hedera.
            </p>
          </div>
          
          <div className="space-y-3">
            <h4 className="font-semibold">For Borrowers</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">Request a Loan</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Build Trust Score</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Success Stories</a></li>
            </ul>
          </div>
          
          <div className="space-y-3">
            <h4 className="font-semibold">For Lenders</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-secondary transition-colors">Browse Loans</a></li>
              <li><a href="#" className="hover:text-secondary transition-colors">How It Works</a></li>
              <li><a href="#" className="hover:text-secondary transition-colors">Impact Reports</a></li>
            </ul>
          </div>
          
          <div className="space-y-3">
            <h4 className="font-semibold">Company</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-accent transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-accent transition-colors">Contact</a></li>
              <li><a href="#" className="hover:text-accent transition-colors">Hedera Integration</a></li>
            </ul>
          </div>
        </div>
        
        <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © 2025 AfriLend. Powered by Hedera DLT.
          </p>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            Built with <Heart className="h-4 w-4 text-primary fill-primary" /> for Africa 🌍
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
