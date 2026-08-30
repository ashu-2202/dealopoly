"use client";

import Link from "next/link";
import { MarketingNav } from "../../_components/marketing-nav";
import { useState, useMemo } from "react";
import { createLeastCountDeck, type LeastCountCard } from "@dealopoly/game-engine";
import { StandardCard } from "../../_components/standard-card";
import { BackButton } from "../../_components/back-button";

export default function LowdeckCardCataloguePage() {
  const [selectedSuit, setSelectedSuit] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const leastCountDeck = useMemo(() => createLeastCountDeck(2), []);

  const filteredCards = useMemo(() => {
    return leastCountDeck.filter((c) => {
      if (selectedSuit !== "all" && c.suit !== selectedSuit) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return c.rank.toLowerCase().includes(query) || c.suit.toLowerCase().includes(query);
      }
      return true;
    });
  }, [leastCountDeck, selectedSuit, searchQuery]);

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
            <h1>Lowdeck Card Catalogue</h1>
            <p>
              Explore the complete 52-card suit deck with customized Lowdeck point values: King = 0 pts (winner!), Ace = 1 pt, Jack = 11 pts, Queen = 12 pts.
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
                {selectedSuit === "all" ? "4 Suits" : "1 Suit"}
              </div>
              <div className="catalogue-stat-lbl">Active Suit</div>
            </div>
            <div className="catalogue-stat-divider" />
            <div>
              <div className="catalogue-stat-val" style={{ color: "var(--tertiary)" }}>
                52
              </div>
              <div className="catalogue-stat-lbl">Standard Deck</div>
            </div>
          </div>
        </section>

        {/* Suit Filter Toolbar */}
        <div className="catalogue-toolbar" style={{ margin: "16px 0 24px" }}>
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
              placeholder="Search rank (K, Q, A, 7)..."
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

        {/* Card Gallery Grid */}
        <div className="catalogue-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "20px" }}>
          {filteredCards.map((card) => (
            <article key={card.instanceId} className="catalogue-card-container" style={{ alignItems: "center" }}>
              <StandardCard
                card={card}
                size="md"
                showPointsBadge
              />
              <div className="catalogue-card-footer" style={{ marginTop: "8px" }}>
                <span className="catalogue-value-badge" style={{ color: card.rank === "K" ? "#facc15" : "#38bdf8" }}>
                  {card.rank === "K" ? "👑 0 PTS" : `${card.points} PTS`}
                </span>
              </div>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
