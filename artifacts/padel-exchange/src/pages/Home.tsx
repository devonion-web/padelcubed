import { useRef } from "react";
import { Link } from "wouter";
import { motion, useInView } from "framer-motion";
import { RegistrationForm } from "@/components/RegistrationForm";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

import { CheckCircle2, Users, Network, TrendingUp, ChevronRight } from "lucide-react";

// For realistic placeholder imagery in the absence of a real image, we will use a CSS gradient overlay
// combined with the generated hero image if it's available.
import heroImage from "@/assets/hero-court.jpg";

function FadeIn({ children, delay = 0, className = "" }: { children: React.ReactNode, delay?: number, className?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.8, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function Home() {
  const scrollToForm = () => {
    document.getElementById("register")?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToHow = () => {
    document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground overflow-x-hidden">
      {/* Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/60 backdrop-blur-xl">
        <div className="container mx-auto px-4 md:px-8 h-20 flex items-center justify-between">
          <div className="font-sans font-bold text-xl tracking-tight text-foreground flex items-center gap-2">
            <div className="w-6 h-6 bg-primary rounded-full" />
            The Padel Exchange
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <button onClick={scrollToHow} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              How it works
            </button>
            <a href="#who" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Who it's for
            </a>
            <a href="#faq" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              FAQ
            </a>
          </nav>
          <Button onClick={scrollToForm} className="rounded-full px-6 text-sm font-semibold">
            Apply
          </Button>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative min-h-[100dvh] flex items-center pt-20">
          <div className="absolute inset-0 z-0">
            {/* Background Image / Overlay */}
            <div 
              className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-40"
              style={{ backgroundImage: `url(${heroImage})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/50 to-transparent" />
          </div>

          <div className="container relative z-10 mx-auto px-4 md:px-8 pt-12 md:pt-24 pb-20">
            <div className="max-w-4xl">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              >
                <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-8 backdrop-blur-sm">
                  <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse" />
                  Join 120+ founders already on the list
                </div>
                <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tighter text-foreground leading-[1.05] mb-8">
                  Trade ideas, energy <br className="hidden md:block" />
                  <span className="text-muted-foreground">and the occasional smash.</span>
                </h1>
                <p className="text-xl md:text-2xl text-muted-foreground font-medium max-w-2xl mb-10 leading-relaxed">
                  A founders' padel community in the City. Because the best networking doesn't happen at a networking event.
                </p>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <Button size="lg" onClick={scrollToForm} className="rounded-full px-8 h-14 text-base font-semibold w-full sm:w-auto group">
                    Register your interest
                    <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                  <Button variant="outline" size="lg" onClick={scrollToHow} className="rounded-full px-8 h-14 text-base font-semibold w-full sm:w-auto bg-transparent border-muted-foreground/30 hover:bg-white/5">
                    How it works
                  </Button>
                </div>
              </motion.div>
            </div>
          </div>
          
          {/* Scroll Indicator */}
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            transition={{ delay: 1.5, duration: 1 }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-muted-foreground"
          >
            <span className="text-xs tracking-widest uppercase font-medium">Scroll</span>
            <div className="h-12 w-[1px] bg-gradient-to-b from-muted-foreground/50 to-transparent" />
          </motion.div>
        </section>

        {/* Ethos Section */}
        <section className="py-24 md:py-32 border-t border-border/50 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3" />
          <div className="container mx-auto px-4 md:px-8 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <FadeIn>
                <h2 className="text-3xl md:text-5xl font-medium tracking-tight leading-tight text-foreground">
                  An exchange is where people trade. Here we trade perspectives, introductions, energy and a good game.
                </h2>
                <div className="mt-12 h-1 w-24 bg-primary mx-auto rounded-full" />
              </FadeIn>
            </div>
          </div>
        </section>

        {/* Why Join Section */}
        <section className="py-24 md:py-32 bg-card/30 border-y border-border/50">
          <div className="container mx-auto px-4 md:px-8">
            <FadeIn>
              <div className="mb-16">
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Why we built this</h2>
                <p className="text-lg text-muted-foreground max-w-2xl">The typical London networking scene is tired. We wanted something active, curated, and genuinely valuable.</p>
              </div>
            </FadeIn>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {[
                {
                  icon: Users,
                  title: "A true peer circle",
                  desc: "We curate heavily. You'll play alongside other founders, CEOs, and senior leaders navigating similar challenges."
                },
                {
                  icon: Network,
                  title: "Exchange, don't pitch",
                  desc: "Leave the slide deck at home. This is about building genuine relationships over sport, not hard selling."
                },
                {
                  icon: CheckCircle2,
                  title: "All levels welcome",
                  desc: "Never held a racket? No problem. Ex-tennis pro? We've got matches for you. We grade and pair accordingly."
                },
                {
                  icon: TrendingUp,
                  title: "Get off the desk",
                  desc: "Building a company is a sedentary sport. Get out of the office, get moving, and clear your head."
                }
              ].map((card, i) => (
                <FadeIn key={i} delay={i * 0.1}>
                  <div className="group h-full p-8 rounded-3xl border border-border bg-card/50 hover:bg-card hover:border-primary/50 transition-all duration-300">
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 text-primary group-hover:scale-110 transition-transform">
                      <card.icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-xl font-semibold mb-3 text-foreground">{card.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{card.desc}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="py-24 md:py-32">
          <div className="container mx-auto px-4 md:px-8">
            <FadeIn>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-16">How the exchange works</h2>
            </FadeIn>

            <div className="grid md:grid-cols-4 gap-8">
              {[
                { step: "01", title: "Register interest", desc: "Fill out the short form below to join the waitlist. We review every application." },
                { step: "02", title: "We match you", desc: "Based on your industry, seniority and padel level, we curate games of 4." },
                { step: "03", title: "Reserve your spot", desc: "When a game matches your profile, you'll receive an invite. First come, first served." },
                { step: "04", title: "Turn up & play", desc: "Meet at the court, play for 60-90 minutes, and grab a coffee or drink after." }
              ].map((item, i) => (
                <FadeIn key={i} delay={i * 0.1} className="relative">
                  {i < 3 && <div className="hidden md:block absolute top-8 left-16 right-0 h-[1px] bg-border" />}
                  <div className="relative z-10 flex flex-col items-start">
                    <div className="text-5xl font-bold text-muted/50 mb-6 font-mono">{item.step}</div>
                    <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                    <p className="text-muted-foreground">{item.desc}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* Who it's for */}
        <section id="who" className="py-24 md:py-32 bg-primary text-primary-foreground relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay pointer-events-none" />
          <div className="container mx-auto px-4 md:px-8 relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <FadeIn>
                <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-8">Who is this for?</h2>
                <p className="text-xl md:text-2xl font-medium leading-relaxed opacity-90">
                  Founders, operators, and senior leaders working in and around the City of London. It's for the intellectually curious who want to expand their network horizontally — outside their immediate industry bubble — while breaking a sweat.
                </p>
              </FadeIn>
            </div>
          </div>
        </section>

        {/* Form Section */}
        <section id="register" className="py-24 md:py-32 relative">
          <div className="absolute top-1/4 left-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] -translate-x-1/2" />
          <div className="container mx-auto px-4 md:px-8 relative z-10">
            <div className="max-w-3xl mx-auto">
              <FadeIn>
                <div className="text-center mb-12">
                  <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">Request Access</h2>
                  <p className="text-lg text-muted-foreground">
                    Join the waitlist. We approve new members weekly to ensure the community remains balanced and high-quality.
                  </p>
                </div>
              </FadeIn>
              
              <FadeIn delay={0.2}>
                <RegistrationForm />
              </FadeIn>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="py-24 md:py-32 border-t border-border/50 bg-card/20">
          <div className="container mx-auto px-4 md:px-8">
            <div className="max-w-3xl mx-auto">
              <FadeIn>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-12 text-center">Frequently asked questions</h2>
              </FadeIn>
              
              <FadeIn delay={0.2}>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="item-1" className="border-border">
                    <AccordionTrigger className="text-lg hover:text-primary transition-colors">Do I need to be good at padel?</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground text-base">
                      Not at all. We have members who play competitively and members who have never stepped on a court. We organise matches based on skill level so everyone gets a fair, enjoyable game.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-2" className="border-border">
                    <AccordionTrigger className="text-lg hover:text-primary transition-colors">What is the cost?</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground text-base">
                      Joining the community and waitlist is free. You only pay when you play. Court costs and balls are split equally among the 4 players, typically around £15-£25 per person depending on the venue and time.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-3" className="border-border">
                    <AccordionTrigger className="text-lg hover:text-primary transition-colors">Where do you play?</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground text-base">
                      We primarily use courts in and around central London / the City (e.g., Stratford, Canary Wharf, Earls Court). Venues are specified when game invitations are sent out.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-4" className="border-border">
                    <AccordionTrigger className="text-lg hover:text-primary transition-colors">Who exactly is in the community?</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground text-base">
                      Venture-backed founders, agency owners, managing directors, partners, and C-suite executives. We actively balance the community across tech, finance, professional services and creative industries.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-5" className="border-border">
                    <AccordionTrigger className="text-lg hover:text-primary transition-colors">How is my data used?</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground text-base">
                      Strictly for organising games and community communication. We never sell data to third parties. We hate spam as much as you do.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </FadeIn>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-12 md:py-16">
        <div className="container mx-auto px-4 md:px-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div>
              <div className="font-bold text-xl tracking-tight text-foreground flex items-center gap-2 mb-2">
                <div className="w-5 h-5 bg-primary rounded-full" />
                The Padel Exchange
              </div>
              <p className="text-muted-foreground text-sm">Trade ideas, energy and the occasional smash.</p>
            </div>
            
            <div className="flex gap-6 text-sm font-medium">
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Email us</a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">LinkedIn</a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</a>
            </div>
          </div>
          
          <div className="mt-12 pt-8 border-t border-border text-sm text-muted-foreground flex flex-col md:flex-row justify-between items-center gap-4">
            <p>&copy; {new Date().getFullYear()} The Padel Exchange. All rights reserved.</p>
            <p className="text-xs opacity-50">London, UK</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
