import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

interface Props {
  title:       string;
  lastUpdated: string;
  children:    React.ReactNode;
}

export function LegalLayout({ title, lastUpdated, children }: Props) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <header className="border-b border-border/40 bg-background/60 backdrop-blur-xl">
        <div className="container mx-auto px-4 md:px-8 h-20 flex items-center justify-between">
          <Link href="/">
            <div className="font-bold text-xl tracking-tight text-foreground flex items-center gap-2 cursor-pointer">
              <div className="w-6 h-6 bg-primary rounded-full" />
              People, Padel, Places
            </div>
          </Link>
          <Link href="/">
            <Button variant="outline" size="sm" className="rounded-full gap-2 bg-transparent">
              <ChevronLeft className="h-4 w-4" />
              Back to site
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-8 py-16 md:py-24 max-w-3xl">
        <div className="mb-12">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-3">
            {title}
          </h1>
          <p className="text-muted-foreground text-sm">Last updated: {lastUpdated}</p>
        </div>

        <div className="space-y-5 text-muted-foreground leading-relaxed text-sm md:text-base">
          {children}
        </div>

        <div className="mt-12 pt-8 border-t border-border text-center">
          <Link href="/">
            <Button className="rounded-full px-8">Back to People, Padel, Places</Button>
          </Link>
        </div>
      </main>

      <footer className="border-t border-border bg-card/50 py-8 mt-8">
        <div className="container mx-auto px-4 md:px-8 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} People, Padel, Places · Dev AI Limited. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
