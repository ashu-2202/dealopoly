"use client";

import Link from "next/link";
import { MarketingNav } from "../../_components/marketing-nav";
import { useState, useMemo } from "react";
import {
  CARD_CATALOGUE,
  TOTAL_CARDS_IN_DECK,
  COLOR_CONFIG,
  type CardColor,
  type CardType,
  type CardDefinition,
} from "@dealopoly/shared";
import { Card } from "../../_components/card";
import { BackButton } from "../../_components/back-button";

const TYPE_TABS: { label: string; value: CardType | "all"; count: number }[] = [
  { label: "All Cards", value: "all", count: TOTAL_CARDS_IN_DECK },
  {
    label: "Properties",
    value: "property",
    count: CARD_CATALOGUE.filter((c) => c.type === "property").reduce(
      (a, c) => a + c.count,
      0,
    ),
  },
  {
    label: "Wilds",
    value: "property-wild",
    count: CARD_CATALOGUE.filter((c) => c.type === "property-wild").reduce(
      (a, c) => a + c.count,
      0,
    ),
  },
  {
    label: "Actions",
    value: "action",
    count: CARD_CATALOGUE.filter((c) => c.type === "action").reduce(
      (a, c) => a + c.count,
      0,
    ),
  },
  {
    label: "Rent",
    value: "rent",
    count: CARD_CATALOGUE.filter((c) => c.type === "rent").reduce(
      (a, c) => a + c.count,
      0,
    ),
  },
  {
    label: "Money",
    value: "money",
    count: CARD_CATALOGUE.filter((c) => c.type === "money").reduce(
      (a, c) => a + c.count,
      0,
    ),
  },
];

const COLOR_FILTERS: { label: string; color: CardColor | "all" }[] = [
  { label: "All Colors", color: "all" },
  { label: "Brown", color: "brown" },
  { label: "Light Blue", color: "light-blue" },
  { label: "Pink", color: "pink" },
  { label: "Orange", color: "orange" },
  { label: "Red", color: "red" },
  { label: "Yellow", color: "yellow" },
  { label: "Green", color: "green" },
  { label: "Dark Blue", color: "dark-blue" },
  { label: "Railroad", color: "railroad" },
  { label: "Utility", color: "utility" },
];

export default function MonodealCardCataloguePage() {
  const [selectedType, setSelectedType] = useState<CardType | "all">("all");
  const [selectedColor, setSelectedColor] = useState<CardColor | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCard, setActiveCard] = useState<CardDefinition | null>(null);

  const filteredCards = useMemo(() => {
    return CARD_CATALOGUE.filter((card) => {
      // Type filter
      if (selectedType !== "all" && card.type !== selectedType) {
        return false;
      }
      // Color filter
      if (selectedColor !== "all") {
        const isExactColor = card.primaryColor === selectedColor;
        const isSecondaryColor =
          "secondaryColor" in card && card.secondaryColor === selectedColor;
        if (!isExactColor && !isSecondaryColor) {
          return false;
        }
      }
      // Search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = card.name.toLowerCase().includes(query);
        const matchesDesc = card.description?.toLowerCase().includes(query);
        const matchesColor = card.primaryColor?.toLowerCase().includes(query);
        if (!matchesName && !matchesDesc && !matchesColor) {
          return false;
        }
      }
      return true;
    });
  }, [selectedType, selectedColor, searchQuery]);

  const totalFilteredCopies = useMemo(() => {
    return filteredCards.reduce((acc, c) => acc + c.count, 0);
  }, [filteredCards]);

  return (
    <div className="catalogue-page">
      {/* Monodeal Navigation */}
      <MarketingNav game="monodeal" activeTab="cards" />

      {/* Main Container */}
      <main className="catalogue-container">
        {/* Page Title & Stats */}
        <section className="catalogue-header">
          <div className="catalogue-header-copy">
            <BackButton fallbackUrl="/monodeal" label="Back to Monodeal" variant="subtle" style={{ marginBottom: "10px" }} />
            <h1>Monodeal Card Catalogue</h1>
            <p>
              Explore the complete 110-card deck with authentic color schemes,
              rent multipliers, and card mechanics matching the classic game.
            </p>
          </div>

          <div className="catalogue-stats-box">
            <div>
              <div className="catalogue-stat-val catalogue-stat-val--blue">
                {totalFilteredCopies}
              </div>
              <div className="catalogue-stat-lbl">Cards Shown</div>
            </div>
            <div className="catalogue-stat-divider" />
            <div>
              <div className="catalogue-stat-val catalogue-stat-val--green">
                {filteredCards.length}
              </div>
              <div className="catalogue-stat-lbl">Unique Types</div>
            </div>
            <div className="catalogue-stat-divider" />
            <div>
              <div className="catalogue-stat-val" style={{ color: "var(--tertiary)" }}>
                110
              </div>
              <div className="catalogue-stat-lbl">Total Deck</div>
            </div>
          </div>
        </section>

        {/* Category Tabs */}
        <div className="catalogue-tabs" role="tablist">
          {TYPE_TABS.map((tab) => {
            const isActive = selectedType === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setSelectedType(tab.value)}
                className={`catalogue-tab-btn ${
                  isActive ? "catalogue-tab-btn--active" : ""
                }`}
                role="tab"
                aria-selected={isActive}
              >
                <span>{tab.label}</span>
                <span className="catalogue-tab-count">{tab.count}</span>
              </button>
            );
          })}
        </div>

        {/* Filters Toolbar */}
        <div className="catalogue-toolbar">
          {/* Color Chips */}
          <div className="catalogue-colors">
            {COLOR_FILTERS.map((f) => {
              const isSelected = selectedColor === f.color;
              const config =
                f.color !== "all" ? COLOR_CONFIG[f.color] : undefined;
              return (
                <button
                  key={f.color}
                  onClick={() => setSelectedColor(f.color)}
                  className={`catalogue-color-chip ${
                    isSelected ? "catalogue-color-chip--active" : ""
                  }`}
                >
                  {config && (
                    <span
                      className="color-dot"
                      style={{ backgroundColor: config.hex }}
                    />
                  )}
                  <span>{f.label}</span>
                </button>
              );
            })}
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
              placeholder="Search cards, rent, effects..."
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
        {filteredCards.length === 0 ? (
          <div className="catalogue-empty">
            <span className="material-symbols-outlined catalogue-empty-icon">
              sentiment_dissatisfied
            </span>
            <h3>No cards matched your filter</h3>
            <p style={{ color: "var(--muted)", marginTop: "4px" }}>
              Try clearing your search query or choosing another color/category.
            </p>
          </div>
        ) : (
          <div className="catalogue-grid">
            {filteredCards.map((card) => (
              <article key={card.id} className="catalogue-card-container">
                {/* Visual Dealopoly Card */}
                <Card
                  card={card}
                  size="md"
                  isInteractive
                  onClick={() => setActiveCard(card)}
                />

                {/* Card Meta Footer */}
                <div className="catalogue-card-footer">
                  <span className="catalogue-copy-badge">
                    {card.count} {card.count === 1 ? "copy" : "copies"}
                  </span>
                  <span className="catalogue-value-badge">
                    {card.value > 0 ? `$${card.value}M Bank` : "No $ Value"}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {/* Card Inspection Modal */}
      {activeCard && (
        <div
          className="card-modal-backdrop"
          onClick={() => setActiveCard(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="card-modal-box"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setActiveCard(null)}
              className="card-modal-close"
              aria-label="Close modal"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            <div style={{ transform: "scale(1.15)", transformOrigin: "center" }}>
              <Card card={activeCard} size="lg" />
            </div>
            <div className="card-modal-details">
              <h2>{activeCard.name}</h2>
              <div className="card-modal-tags">
                <span className="badge badge--blue">{activeCard.type.toUpperCase()}</span>
                {activeCard.primaryColor && (
                  <span className="badge badge--green">{activeCard.primaryColor.toUpperCase()}</span>
                )}
                <span className="badge badge--amber">{activeCard.count} copies in deck</span>
              </div>
              <p style={{ color: "var(--on-surface-variant)", lineHeight: 1.6, margin: 0 }}>
                {activeCard.description || "Standard property card used to form complete color sets."}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
