import Link from "next/link";
import { Brand } from "./brand";

export interface MarketingFooterProps {
  game?: "arcade" | "monodeal" | "lowdeck";
}

export function MarketingFooter({ game = "arcade" }: MarketingFooterProps) {
  return (
    <footer className="marketing-footer">
      <div className="shell" style={{ position: "relative", zIndex: 5, width: "100%" }}>
        <div className="footer-inner">
          <div className="footer-brand-wrap">
            <Brand game={game} />
            <span className="footer-version">v1.2.0</span>
          </div>

          <nav className="footer-links" aria-label="Footer navigation">
            {game === "arcade" ? (
              <>
                <Link href="/#games">🎮 Arcade Games</Link>
                <Link href="/monodeal">🃏 Monodeal</Link>
                <Link href="/lowdeck">🎯 Lowdeck</Link>
                <Link href="/lobby">Lobby</Link>
              </>
            ) : game === "monodeal" ? (
              <>
                <Link href="/monodeal">🃏 Monodeal Hub</Link>
                <Link href="/monodeal/cards">Card Catalogue</Link>
                <Link href="/monodeal/how-to-play">How to Play</Link>
                <Link href="/monodeal/rules">Official Rules</Link>
                <Link href="/" style={{ color: "#38bdf8" }}>← Arcade Hub</Link>
              </>
            ) : (
              <>
                <Link href="/lowdeck">🎯 Lowdeck Hub</Link>
                <Link href="/lowdeck/cards">Deck Cards (52)</Link>
                <Link href="/lowdeck/how-to-play">How to Play</Link>
                <Link href="/lowdeck/rules">Official Rules</Link>
                <Link href="/" style={{ color: "#facc15" }}>← Arcade Hub</Link>
              </>
            )}
          </nav>
        </div>

        <div style={{ textAlign: "center", marginTop: "16px", fontSize: "0.78rem", color: "#64748b" }}>
          © 2026 Dealopoly Arcade • The Real-Time Multiplayer Card Platform
        </div>
      </div>
    </footer>
  );
}
