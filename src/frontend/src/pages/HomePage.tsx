import React from 'react';
import { Link } from '@tanstack/react-router';
import { Radar, Search, TrendingUp, Bookmark, Sparkles, ArrowRight, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';

const FEATURES = [
  {
    icon: Search,
    title: 'Smart Search',
    description: 'Filter by language, topic, and star count to find exactly what you need.',
  },
  {
    icon: TrendingUp,
    title: 'Trending Now',
    description: 'Discover the hottest new repositories created in the last 7 days.',
  },
  {
    icon: Sparkles,
    title: 'AI Analysis',
    description: 'Get instant insights on why a project is interesting — tech stack, purpose, and popularity.',
  },
  {
    icon: Bookmark,
    title: 'Bookmarks',
    description: 'Save repositories you love and revisit them anytime.',
  },
];

export default function HomePage() {
  return (
    <div className="min-h-[calc(100vh-3.5rem-5rem)]">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/40">
        {/* Background grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(oklch(0.72 0.19 155) 1px, transparent 1px),
              linear-gradient(90deg, oklch(0.72 0.19 155) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
          }}
        />

        <div className="container mx-auto px-4 py-20 relative">
          <div className="max-w-3xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-mono text-primary mb-6">
              <Terminal className="w-3 h-3" />
              GitHub Project Discovery
            </div>

            {/* Headline */}
            <h1 className="font-mono font-bold text-4xl md:text-5xl text-foreground mb-4 leading-tight">
              Radar for the{' '}
              <span className="text-primary relative">
                best repos
                <span className="absolute -bottom-1 left-0 right-0 h-px bg-primary/40" />
              </span>
            </h1>

            <p className="text-muted-foreground text-lg mb-8 leading-relaxed max-w-xl mx-auto">
              Discover trending GitHub projects, get AI-powered insights, and bookmark your favorites — all in one place.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/trending">
                <Button className="font-mono bg-primary text-primary-foreground hover:bg-primary/90 shadow-neon px-6 h-11">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  View Trending
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link to="/search">
                <Button variant="outline" className="font-mono border-border hover:border-primary hover:text-primary px-6 h-11">
                  <Search className="w-4 h-4 mr-2" />
                  Search Repos
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16 max-w-5xl">
        <div className="text-center mb-10">
          <h2 className="font-mono font-bold text-2xl text-foreground mb-2">
            Everything you need to{' '}
            <span className="text-primary">explore GitHub</span>
          </h2>
          <p className="text-sm text-muted-foreground">
            Powerful tools to find, analyze, and save the best open-source projects.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="bg-card border border-border rounded-lg p-5 card-glow"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mb-3">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-mono font-semibold text-sm text-foreground mb-1.5">{title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Terminal-style CTA */}
      <section className="container mx-auto px-4 pb-16 max-w-3xl">
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-secondary/50 border-b border-border">
            <div className="w-3 h-3 rounded-full bg-destructive/60" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
            <div className="w-3 h-3 rounded-full bg-primary/60" />
            <span className="ml-2 text-xs font-mono text-muted-foreground">repo-radar ~ terminal</span>
          </div>
          <div className="p-5 font-mono text-sm space-y-1.5">
            <p className="text-muted-foreground">
              <span className="text-primary">$</span> repo-radar --discover
            </p>
            <p className="text-foreground/80">
              <span className="text-primary">›</span> Scanning GitHub for trending repositories...
            </p>
            <p className="text-foreground/80">
              <span className="text-primary">›</span> Analyzing tech stacks and popularity signals...
            </p>
            <p className="text-foreground/80">
              <span className="text-primary">›</span> Ready. <span className="text-primary">20 trending repos</span> found this week.
            </p>
            <div className="pt-2">
              <Link to="/trending">
                <Button size="sm" className="font-mono bg-primary text-primary-foreground hover:bg-primary/90 shadow-neon text-xs">
                  <Radar className="w-3.5 h-3.5 mr-1.5" />
                  Launch Radar
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
