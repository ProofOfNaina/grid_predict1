import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('revealed');
          observer.unobserve(el);
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}

function RevealSection({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useScrollReveal();
  return (
    <div
      ref={ref}
      className={cn('reveal-section', className)}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

// Fake grid for the hero visual
function HeroGrid() {
  const statuses = [
    ['open', 'open', 'open', 'bet', 'open', 'open'],
    ['open', 'open', 'touched', 'open', 'open', 'open'],
    ['locked', 'locked', 'open', 'open', 'bet', 'open'],
    ['expired', 'expired', 'locked', 'open', 'open', 'open'],
  ];

  return (
    <div className="grid grid-cols-6 gap-1 w-full max-w-md">
      {statuses.flat().map((status, i) => (
        <div
          key={i}
          className={cn(
            'h-8 rounded-md border transition-all duration-500 animate-cell-reveal',
            status === 'open' && 'grid-cell-open',
            status === 'bet' && 'grid-cell-bet',
            status === 'locked' && 'grid-cell-locked',
            status === 'touched' && 'grid-cell-touched animate-pulse-glow',
            status === 'expired' && 'grid-cell-expired',
          )}
          style={{ animationDelay: `${i * 50 + 400}ms` }}
        />
      ))}
    </div>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 md:px-12 py-4 border-b border-border/50 bg-card/30 backdrop-blur-md fixed top-0 left-0 right-0 z-50 animate-fade-in">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-primary/15 border border-primary/30 flex items-center justify-center">
            <span className="text-primary font-bold text-xs font-mono">G</span>
          </div>
          <span className="font-bold text-sm tracking-tight">GridPredict</span>
        </div>
        <Link
          to="/app"
          className="text-xs font-semibold bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:shadow-[0_0_20px_hsl(var(--primary)/0.2)] active:scale-[0.97] transition-all"
        >
          Open App
        </Link>
      </nav>

      {/* Hero */}
      <section className="relative pt-28 pb-20 md:pt-36 md:pb-28 px-6 md:px-12">
        <div className="max-w-5xl mx-auto flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          <div className="flex-1 max-w-lg animate-fade-in-up">
            <div className="inline-flex items-center gap-2 text-[10px] font-mono text-muted-foreground bg-muted/50 rounded-full px-3 py-1 border border-border mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Built on Solana · Powered by Pyth
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-[2.75rem] font-extrabold tracking-tight leading-[1.1] mb-4 text-balance">
              Predict where SOL price lands on the grid
            </h1>
            <p className="text-muted-foreground text-sm md:text-base leading-relaxed mb-8 max-w-md">
              Pick a price range and time window. If SOL touches your cell, you win 4× your bet. Simple mechanics, real-time Pyth oracle data, on-chain settlement.
            </p>
            <div className="flex items-center gap-3">
              <Link
                to="/app"
                className="font-semibold text-sm bg-primary text-primary-foreground px-6 py-2.5 rounded-lg hover:shadow-[0_0_24px_hsl(var(--primary)/0.25)] active:scale-[0.97] transition-all"
              >
                Start Predicting
              </Link>
              <a
                href="#how-it-works"
                className="text-sm text-muted-foreground hover:text-foreground font-medium px-4 py-2.5 rounded-lg border border-border hover:border-muted-foreground/30 transition-all active:scale-[0.97]"
              >
                How it works
              </a>
            </div>
          </div>

          <div className="flex-1 flex justify-center animate-fade-in" style={{ animationDelay: '300ms' }}>
            <div className="relative">
              {/* Glow behind grid */}
              <div className="absolute -inset-8 bg-primary/5 rounded-3xl blur-3xl" />
              <div className="relative bg-card/60 border border-border rounded-xl p-5 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] font-mono text-muted-foreground">SOL/USD</span>
                  <span className="text-xs font-mono font-bold text-primary tabular-nums">$148.72</span>
                  <span className="text-[10px] text-primary font-mono">▲</span>
                </div>
                <HeroGrid />
                <div className="flex justify-between mt-3 text-[8px] font-mono text-muted-foreground/40 uppercase tracking-widest">
                  <span>0–5s</span>
                  <span>5–10s</span>
                  <span>10–15s</span>
                  <span>15–20s</span>
                  <span>20–25s</span>
                  <span>25–30s</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 md:py-28 px-6 md:px-12 border-t border-border/30">
        <div className="max-w-4xl mx-auto">
          <RevealSection>
            <p className="text-[10px] font-mono text-primary uppercase tracking-widest mb-3">Mechanics</p>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-12 max-w-md">
              Three steps to your prediction
            </h2>
          </RevealSection>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                title: 'Pick a cell',
                desc: 'The grid maps price ranges (vertical) against time windows (horizontal). Each cell represents a specific price-time zone in the next 30 seconds.',
              },
              {
                step: '02',
                title: 'Place your bet',
                desc: 'Wager SOL on your chosen cell. Bets lock 2 seconds before the time window starts. All bets are settled on-chain via the GridPredict program.',
              },
              {
                step: '03',
                title: 'Win 4× if touched',
                desc: 'If the live SOL price from Pyth oracle enters your cell\'s range during its time window, the cell is "touched" and you win 4× your wager.',
              },
            ].map((item, i) => (
              <RevealSection key={item.step} delay={i * 100}>
                <div className="bg-card/40 border border-border/60 rounded-xl p-5 h-full hover:border-muted-foreground/20 transition-all duration-300 group">
                  <span className="text-primary/40 font-mono font-bold text-2xl group-hover:text-primary/60 transition-colors">{item.step}</span>
                  <h3 className="font-bold text-base mt-3 mb-2 tracking-tight">{item.title}</h3>
                  <p className="text-muted-foreground text-xs leading-relaxed">{item.desc}</p>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* Grid states */}
      <section className="py-20 md:py-28 px-6 md:px-12 bg-card/20 border-t border-border/30">
        <div className="max-w-4xl mx-auto">
          <RevealSection>
            <p className="text-[10px] font-mono text-primary uppercase tracking-widest mb-3">Cell States</p>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-12 max-w-lg">
              Every cell has a lifecycle
            </h2>
          </RevealSection>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { name: 'Open', cls: 'grid-cell-open', desc: 'Accepting bets. Click to wager.' },
              { name: 'Locked', cls: 'grid-cell-locked', desc: 'Betting closed. Waiting for time window.' },
              { name: 'Touched', cls: 'grid-cell-touched', desc: 'Price hit this range. Winners!' },
              { name: 'Expired', cls: 'grid-cell-expired', desc: 'Time passed without a price hit.' },
            ].map((state, i) => (
              <RevealSection key={state.name} delay={i * 80}>
                <div className="flex items-start gap-3 bg-card/40 border border-border/50 rounded-lg p-4">
                  <div className={cn('w-8 h-8 rounded-md border shrink-0 mt-0.5', state.cls)} />
                  <div>
                    <div className="font-semibold text-sm mb-0.5">{state.name}</div>
                    <div className="text-muted-foreground text-xs leading-relaxed">{state.desc}</div>
                  </div>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* Tech stack */}
      <section className="py-20 md:py-28 px-6 md:px-12 border-t border-border/30">
        <div className="max-w-4xl mx-auto">
          <RevealSection>
            <p className="text-[10px] font-mono text-primary uppercase tracking-widest mb-3">Under the Hood</p>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-12 max-w-md">
              Transparent and verifiable
            </h2>
          </RevealSection>

          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { label: 'Solana', detail: 'Sub-second finality for instant bet settlement and payouts.' },
              { label: 'Pyth Network', detail: 'Real-time SOL/USD price feed directly from Pyth oracles.' },
              { label: 'Anchor Framework', detail: 'On-chain program with PDA-based state and vault management.' },
              { label: 'Keeper Bot', detail: 'Automated resolver watches prices and settles grids trustlessly.' },
            ].map((item, i) => (
              <RevealSection key={item.label} delay={i * 80}>
                <div className="flex items-start gap-3 py-3">
                  <span className="w-1 h-1 rounded-full bg-primary mt-2 shrink-0" />
                  <div>
                    <div className="font-semibold text-sm mb-0.5">{item.label}</div>
                    <div className="text-muted-foreground text-xs leading-relaxed">{item.detail}</div>
                  </div>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 md:py-28 px-6 md:px-12 border-t border-border/30">
        <RevealSection className="max-w-md mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-4">
            Ready to predict?
          </h2>
          <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
            Connect your Solana wallet and start placing predictions on the grid. Devnet SOL only — no real funds at risk.
          </p>
          <Link
            to="/app"
            className="inline-flex font-semibold text-sm bg-primary text-primary-foreground px-8 py-3 rounded-lg hover:shadow-[0_0_28px_hsl(var(--primary)/0.3)] active:scale-[0.97] transition-all"
          >
            Launch GridPredict
          </Link>
        </RevealSection>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/30 py-6 px-6 md:px-12">
        <div className="max-w-4xl mx-auto flex items-center justify-between text-[10px] text-muted-foreground/40 font-mono">
          <span>GridPredict · Devnet</span>
          <span>Built on Solana</span>
        </div>
      </footer>

      <style>{`
        .reveal-section {
          opacity: 0;
          transform: translateY(20px);
          filter: blur(4px);
          transition: opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1),
                      transform 0.7s cubic-bezier(0.16, 1, 0.3, 1),
                      filter 0.7s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .reveal-section.revealed {
          opacity: 1;
          transform: translateY(0);
          filter: blur(0);
        }
      `}</style>
    </div>
  );
}
