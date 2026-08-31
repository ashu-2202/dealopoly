"use client";

import Link from "next/link";
import { MarketingNav } from "../../_components/marketing-nav";
import { MarketingFooter } from "../../_components/marketing-footer";
import { useState, useMemo, useEffect } from "react";
import { createLeastCountDeck, type LeastCountCard, type Suit } from "@dealopoly/game-engine";
import { StandardCard } from "../../_components/standard-card";
import { BackButton } from "../../_components/back-button";

const SUIT_NAMES: Record<Suit, string> = {
  spades: "Spades",
  hearts: "Hearts",
  diamonds: "Diamonds",
  clubs: "Clubs",
};

const SUIT_ICONS: Record<Suit, string> = {
  spades: "♠",
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
};

function getRankDescription(rank: string, points: number) {
  if (rank === "K") {
    return {
      title: "King (The 0-Point Crown Jewel)",
      badge: "👑 0 PTS • ULTIMATE WINNER",
      strategy:
        "The King is the most powerful card in Lowdeck. Contributing 0 points to your total hand count, holding Kings allows you to declare a winning SHOW with minimal risk.",
      comboTip: "Can be discarded as a single card or as a matching pair (e.g., Two Kings).",
    };
  }
  if (rank === "A") {
    return {
      title: "Ace (1-Point Anchor)",
      badge: "⭐ 1 PT • ULTRA LOW",
      strategy:
        "Aces are critical for lowering your total hand points to the ≤ 5 SHOW threshold. Pair with Kings to stay nearly untouchable.",
      comboTip: "Can be combined in same-suit sequences (e.g. A-2-3) or dropped as multi-card rank pairs.",
    };
  }
  if (rank === "Q") {
    return {
      title: "Queen (12-Point Heavyweight)",
      badge: "⚠️ 12 PTS • HIGH PENALTY",
      strategy:
        "The highest point card in the deck (12 points). Discard or pair Queens early in the game to avoid catching a heavy penalty when an opponent calls SHOW.",
      comboTip: "Pair two Queens together to drop 24 points in a single turn!",
    };
  }
  if (rank === "J") {
    return {
      title: "Jack (11-Point Danger)",
      badge: "⚠️ 11 PTS • HIGH DANGER",
      strategy:
        "Holding 11 points, Jacks are second only to Queens in penalty weight. Prioritize discarding them or building runs.",
      comboTip: "Look to create sequence runs (e.g. 10-J-Q of same suit) to clear multiple high cards at once.",
    };
  }
  return {
    title: `${rank} of Lowdeck (${points} Points)`,
    badge: `${points} PTS • STANDARD PIP`,
    strategy: `Adds ${points} points to your hand total. Aim to pair matching ${rank}s or form consecutive same-suit runs to shed them efficiently.`,
    comboTip: `Pairs of ${rank}s or 3+ consecutive suited cards drop your hand count fast.`,
  };
}

export default function LowdeckCardCataloguePage() {
  const [selectedSuit, setSelectedSuit] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCard, setActiveCard] = useState<LeastCountCard | null>(null);

  // Single 52-card standard deck (unique cards)
  const uniqueDeck = useMemo(() => {
    const doubleDeck = createLeastCountDeck(1);
    const seen = new Set<string>();
    return doubleDeck.filter((c) => {
      const key = `${c.rank}-${c.suit}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, []);

  const filteredCards = useMemo(() => {
    return uniqueDeck.filter((c) => {
      // Suit filter
      if (selectedSuit !== "all" && c.suit !== selectedSuit) return false;

      // Category filter
      if (selectedCategory === "kings" && c.rank !== "K") return false;
      if (selectedCategory === "aces" && c.rank !== "A") return false;
      if (selectedCategory === "face" && !["K", "Q", "J"].includes(c.rank)) return false;
      if (selectedCategory === "high" && c.points < 10) return false;
      if (selectedCategory === "low" && c.points > 5) return false;

      // Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const suitName = SUIT_NAMES[c.suit].toLowerCase();
        const rankStr = c.rank.toLowerCase();
        return rankStr.includes(query) || suitName.includes(query) || `${c.points}`.includes(query);
      }
      return true;
    });
  }, [uniqueDeck, selectedSuit, selectedCategory, searchQuery]);

  // Keyboard shortcut ESC to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveCard(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="catalogue-page">
      {/* Lowdeck Navigation */}
      <MarketingNav game="lowdeck" activeTab="cards" />

      {/* Main Container */}
      <main className="catalogue-container">
        {/* Page Title & Stats */}
        <section className="catalogue-header">
          <div className="catalogue-header-copy">
            <BackButton fallbackUrl="/lowdeck" label="Back to Lowdeck" variant="subtle" style={{ marginBottom: "10px" }} />
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <span style={{ fontSize: "1.4rem" }}>👑</span>
              <span style={{ fontFamily: "var(--mono)", fontSize: "0.85rem", fontWeight: 700, color: "#facc15", letterSpacing: "0.08em" }}>
                OFFICIAL 52-CARD DECK • 3D EMBOSSED
              </span>
            </div>
            <h1>Lowdeck Card Catalogue</h1>
            <p>
              Inspect the complete 52-card suit deck with authentic 3D embossed vintage card art and custom Lowdeck rules: <strong>King = 0 pts</strong> (the golden jackpot), <strong>Ace = 1 pt</strong>, <strong>Jack = 11 pts</strong>, <strong>Queen = 12 pts</strong>. Click any card to inspect its full stats and strategy.
            </p>
          </div>

          <div className="catalogue-stats-box">
            <div>
              <div className="catalogue-stat-val catalogue-stat-val--blue">
                {filteredCards.length}
              </div>
              <div className="catalogue-stat-lbl">Cards Shown</div>
            </div>
            <div className="catalogue-stat-divider" />
            <div>
              <div className="catalogue-stat-val catalogue-stat-val--green">
                {selectedSuit === "all" ? "4 Suits" : SUIT_NAMES[selectedSuit as Suit]}
              </div>
              <div className="catalogue-stat-lbl">Active Suit</div>
            </div>
            <div className="catalogue-stat-divider" />
            <div>
              <div className="catalogue-stat-val" style={{ color: "#facc15" }}>
                0 PTS
              </div>
              <div className="catalogue-stat-lbl">King Value</div>
            </div>
          </div>
        </section>

        {/* Filter Toolbars */}
        <div className="catalogue-toolbar" style={{ margin: "16px 0 20px" }}>
          {/* Suit Filter Buttons */}
          <div className="catalogue-colors">
            {[
              { id: "all", label: "All Suits (52)" },
              { id: "spades", label: "♠ Spades (13)" },
              { id: "hearts", label: "♥ Hearts (13)" },
              { id: "diamonds", label: "♦ Diamonds (13)" },
              { id: "clubs", label: "♣ Clubs (13)" },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedSuit(s.id)}
                className={`catalogue-color-chip ${selectedSuit === s.id ? "catalogue-color-chip--active" : ""}`}
                style={{ padding: "6px 14px" }}
              >
                <span>{s.label}</span>
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="catalogue-search-wrap">
            <span className="material-symbols-outlined catalogue-search-icon">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search rank (K, Q, A, 7) or suit..."
              className="catalogue-search-input"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="catalogue-search-clear"
                aria-label="Clear search"
              >
                <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                  close
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Category Chips */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "28px" }}>
          {[
            { id: "all", label: "All Cards" },
            { id: "kings", label: "👑 Kings (0 Pts)" },
            { id: "aces", label: "⭐ Aces (1 Pt)" },
            { id: "face", label: "🎭 Face Cards (K, Q, J)" },
            { id: "low", label: "🟢 Low Range (≤ 5 Pts)" },
            { id: "high", label: "🔴 High Danger (10–12 Pts)" },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`button ${selectedCategory === cat.id ? "button--primary" : "button--secondary"}`}
              style={{ padding: "6px 14px", fontSize: "0.82rem", borderRadius: "999px" }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Card Gallery Grid */}
        <div
          className="catalogue-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
            gap: "24px",
            justifyItems: "center",
          }}
        >
          {filteredCards.map((card) => {
            const isKing = card.rank === "K";
            return (
              <article
                key={`${card.rank}-${card.suit}`}
                className="catalogue-card-container"
                onClick={() => setActiveCard(card)}
                style={{
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  padding: "12px",
                  background: "rgba(18, 24, 38, 0.6)",
                  border: isKing ? "1px solid rgba(250, 204, 21, 0.4)" : "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "16px",
                  backdropFilter: "blur(8px)",
                  transition: "all 0.2s ease",
                }}
              >
                <StandardCard
                  card={card}
                  size="md"
                  showPointsBadge={true}
                />
                <div className="catalogue-card-footer" style={{ marginTop: "12px", textAlign: "center" }}>
                  <div style={{ fontWeight: 800, fontSize: "0.92rem", color: "#f8fafc", marginBottom: "2px" }}>
                    {card.rank} of {SUIT_NAMES[card.suit]}
                  </div>
                  <span
                    className="catalogue-value-badge"
                    style={{
                      color: isKing ? "#facc15" : card.points <= 5 ? "#4ade80" : "#fb7185",
                      fontSize: "0.78rem",
                      fontWeight: 800,
                    }}
                  >
                    {isKing ? "👑 0 POINTS" : `${card.points} POINTS`}
                  </span>
                </div>
              </article>
            );
          })}
        </div>

        {filteredCards.length === 0 && (
          <div style={{ textAlign: "center", padding: "64px 20px", color: "var(--muted)" }}>
            <span className="material-symbols-outlined" style={{ fontSize: "48px", opacity: 0.5, marginBottom: "12px" }}>
              search_off
            </span>
            <h3>No matching Lowdeck cards found</h3>
            <p>Try adjusting your search query or suit filters above.</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <MarketingFooter game="lowdeck" />

      {/* Card Inspection Modal */}
      {activeCard && (
        <div
          className="modal-overlay"
          onClick={() => setActiveCard(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(4, 8, 15, 0.85)",
            backdropFilter: "blur(12px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
        >
          <div
            className="modal-card-detail"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "linear-gradient(145deg, #111827 0%, #0b1120 100%)",
              border: "1.5px solid rgba(212, 163, 75, 0.4)",
              borderRadius: "24px",
              padding: "36px",
              maxWidth: "760px",
              width: "100%",
              boxShadow: "0 24px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(212, 163, 75, 0.2)",
              display: "grid",
              gridTemplateColumns: "220px 1fr",
              gap: "36px",
              alignItems: "center",
              position: "relative",
            }}
          >
            {/* Close Button */}
            <button
              onClick={() => setActiveCard(null)}
              className="button button--icon"
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                background: "rgba(255, 255, 255, 0.08)",
                borderRadius: "50%",
              }}
              aria-label="Close inspection modal"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            {/* Left: High-Res 3D Card Display */}
            <div style={{ display: "flex", justifyContent: "center", filter: "drop-shadow(0 16px 32px rgba(0,0,0,0.7))" }}>
              <StandardCard
                card={activeCard}
                size="lg"
                showPointsBadge={true}
              />
            </div>

            {/* Right: Card Details & Strategy */}
            <div>
              {(() => {
                const info = getRankDescription(activeCard.rank, activeCard.points);
                return (
                  <>
                    <div style={{ display: "inline-block", background: "rgba(212, 163, 75, 0.15)", border: "1px solid rgba(212, 163, 75, 0.4)", padding: "4px 12px", borderRadius: "999px", color: "#facc15", fontFamily: "var(--mono)", fontSize: "0.78rem", fontWeight: 800, marginBottom: "12px" }}>
                      {info.badge}
                    </div>

                    <h2 style={{ fontSize: "1.8rem", fontWeight: 900, color: "#f8fafc", marginBottom: "6px" }}>
                      {activeCard.rank} of {SUIT_NAMES[activeCard.suit]} {SUIT_ICONS[activeCard.suit]}
                    </h2>

                    <p style={{ color: "var(--muted)", fontSize: "0.95rem", lineHeight: 1.6, marginBottom: "20px" }}>
                      {info.strategy}
                    </p>

                    <div style={{ background: "rgba(255, 255, 255, 0.04)", borderRadius: "14px", padding: "16px", border: "1px solid rgba(255, 255, 255, 0.06)", marginBottom: "24px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 800, color: "#38bdf8", fontSize: "0.85rem", marginBottom: "6px" }}>
                        <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>psychology</span>
                        COMBINATION TIP
                      </div>
                      <div style={{ fontSize: "0.88rem", color: "#cbd5e1", lineHeight: 1.5 }}>
                        {info.comboTip}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "12px" }}>
                      <Link href="/game?mode=bot&game=least_count" className="button button--primary" style={{ flex: 1, justifyContent: "center" }}>
                        <span className="material-symbols-outlined">play_arrow</span>
                        Practice in Bot Game
                      </Link>
                      <button onClick={() => setActiveCard(null)} className="button button--secondary">
                        Done
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
