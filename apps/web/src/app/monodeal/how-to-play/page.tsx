"use client";

import React, { useState } from "react";
import Link from "next/link";
import { MarketingNav } from "../../_components/marketing-nav";
import { MarketingFooter } from "../../_components/marketing-footer";
import { BackButton } from "../../_components/back-button";
import { Card } from "../../_components/card";
import { CARD_CATALOGUE, type CardDefinition } from "@dealopoly/shared";

export default function MonodealHowToPlayPage() {
  const [activeSetTab, setActiveSetTab] = useState<"brown" | "dark-blue" | "railroad" | "green">("brown");
  const [activeZoneTab, setActiveZoneTab] = useState<"bank" | "properties" | "action">("bank");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Card Lookups
  const cardMediterranean = CARD_CATALOGUE.find((c) => c.id === "prop-mediterranean-avenue")!;
  const cardBaltic = CARD_CATALOGUE.find((c) => c.id === "prop-baltic-avenue")!;
  const cardMayfair = CARD_CATALOGUE.find((c) => c.id === "prop-mayfair")!;
  const cardParkLane = CARD_CATALOGUE.find((c) => c.id === "prop-park-lane")!;
  const cardRail1 = CARD_CATALOGUE.find((c) => c.id === "prop-reading-railroad")!;
  const cardRail2 = CARD_CATALOGUE.find((c) => c.id === "prop-pennsylvania-railroad")!;
  const cardRail3 = CARD_CATALOGUE.find((c) => c.id === "prop-b-and-o-railroad")!;
  const cardRail4 = CARD_CATALOGUE.find((c) => c.id === "prop-short-line")!;
  const cardGreen1 = CARD_CATALOGUE.find((c) => c.id === "prop-regent-street")!;
  const cardGreen2 = CARD_CATALOGUE.find((c) => c.id === "prop-oxford-street")!;
  const cardGreen3 = CARD_CATALOGUE.find((c) => c.id === "prop-bond-street")!;

  const cardMoney5M = CARD_CATALOGUE.find((c) => c.id === "money-5m")!;
  const cardMoney2M = CARD_CATALOGUE.find((c) => c.id === "money-2m")!;
  const cardDealBreaker = CARD_CATALOGUE.find((c) => c.id === "action-deal-breaker")!;
  const cardJustSayNo = CARD_CATALOGUE.find((c) => c.id === "action-just-say-no")!;
  const cardPassGo = CARD_CATALOGUE.find((c) => c.id === "action-pass-go")!;
  const cardSlyDeal = CARD_CATALOGUE.find((c) => c.id === "action-sly-deal")!;
  const cardDebtCollector = CARD_CATALOGUE.find((c) => c.id === "action-debt-collector")!;
  const cardRentWild = CARD_CATALOGUE.find((c) => c.id === "rent-wild") || CARD_CATALOGUE.find((c) => c.type === "rent")!;

  const toggleFaq = (idx: number) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  return (
    <div className="marketing-page" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <MarketingNav game="monodeal" activeTab="how-to-play" />

      <main style={{ flex: 1, paddingBottom: "80px" }}>
        {/* HERO SECTION */}
        <section className="how-hero-section shell" style={{ textAlign: "center", padding: "48px 16px 36px" }}>
          <div style={{ maxWidth: "800px", margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
              <BackButton fallbackUrl="/monodeal" label="Back to Monodeal" variant="subtle" />
            </div>

            <div className="how-hero-pill">
              <span>🎮 Beginner's Visual Guide</span>
            </div>

            <h1 className="how-hero-title">
              How to Play <span className="glow-word">Monodeal</span>
            </h1>

            <p className="how-hero-lede">
              Learn the fast-paced property trading card game where properties change hands, debt collectors knock,
              and sneaky moves win the day! Master the game in <strong>3 minutes</strong> with this simple visual guide.
            </p>

            <div className="how-stats-ribbon">
              <div className="how-stat-chip">
                <span className="material-symbols-outlined">timer</span>
                <span><strong>15 Mins</strong> per game</span>
              </div>
              <div className="how-stat-chip">
                <span className="material-symbols-outlined">groups</span>
                <span><strong>2 to 5</strong> Players</span>
              </div>
              <div className="how-stat-chip">
                <span className="material-symbols-outlined">emoji_events</span>
                <span><strong>3 Sets</strong> to Win</span>
              </div>
            </div>
          </div>
        </section>

        {/* STEP 1 */}
        <section className="how-step-section shell" style={{ marginTop: "24px" }}>
          <div className="how-step-card glass-panel">
            <div className="how-step-header">
              <div className="how-step-badge">STEP 1</div>
              <div>
                <h2>The Big Goal: Complete 3 Property Sets!</h2>
                <p>The first player to complete <strong>3 full property sets</strong> in front of them wins instantly.</p>
              </div>
            </div>

            <div className="how-info-banner">
              <span className="material-symbols-outlined" style={{ color: "#38bdf8", fontSize: "28px" }}>
                info
              </span>
              <div>
                <strong>How do you know when a set is complete?</strong>
                <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: "0.92rem" }}>
                  Look at the bottom right of any Property card. The circle tells you the <strong>Set Size</strong> (the exact number of cards needed to complete that color set).
                </p>
              </div>
            </div>

            {/* Interactive Property Set Tabs */}
            <div className="how-sets-container">
              <div className="how-tabs-bar" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeSetTab === "brown"}
                  className={`how-tab-btn ${activeSetTab === "brown" ? "active" : ""}`}
                  onClick={() => setActiveSetTab("brown")}
                >
                  <span className="color-dot" style={{ backgroundColor: "#92400e" }} />
                  <span>Brown (2 Cards)</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeSetTab === "dark-blue"}
                  className={`how-tab-btn ${activeSetTab === "dark-blue" ? "active" : ""}`}
                  onClick={() => setActiveSetTab("dark-blue")}
                >
                  <span className="color-dot" style={{ backgroundColor: "#1e3a8a" }} />
                  <span>Dark Blue (2 Cards)</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeSetTab === "railroad"}
                  className={`how-tab-btn ${activeSetTab === "railroad" ? "active" : ""}`}
                  onClick={() => setActiveSetTab("railroad")}
                >
                  <span className="color-dot" style={{ backgroundColor: "#475569" }} />
                  <span>Railroad (4 Cards)</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeSetTab === "green"}
                  className={`how-tab-btn ${activeSetTab === "green" ? "active" : ""}`}
                  onClick={() => setActiveSetTab("green")}
                >
                  <span className="color-dot" style={{ backgroundColor: "#15803d" }} />
                  <span>Green (3 Cards)</span>
                </button>
              </div>

              <div className="how-set-display">
                {activeSetTab === "brown" && (
                  <div className="how-cards-row-wrapper">
                    <div className="how-cards-row">
                      <Card card={cardMediterranean} size="md" />
                      <Card card={cardBaltic} size="md" />
                    </div>
                    <div className="how-set-caption">
                      <span className="how-check-icon">✓</span>
                      <div>
                        <strong>Complete Brown Set (2 of 2 Cards)</strong>
                        <p>Brown and Dark Blue only need 2 cards each to make a full set, making them rapid win conditions!</p>
                      </div>
                    </div>
                  </div>
                )}

                {activeSetTab === "dark-blue" && (
                  <div className="how-cards-row-wrapper">
                    <div className="how-cards-row">
                      <Card card={cardMayfair} size="md" />
                      <Card card={cardParkLane} size="md" />
                    </div>
                    <div className="how-set-caption">
                      <span className="how-check-icon">✓</span>
                      <div>
                        <strong>Complete Dark Blue Set (2 of 2 Cards)</strong>
                        <p>Dark Blue is the highest rent tier in the game ($8M full rent!).</p>
                      </div>
                    </div>
                  </div>
                )}

                {activeSetTab === "railroad" && (
                  <div className="how-cards-row-wrapper">
                    <div className="how-cards-row">
                      <Card card={cardRail1} size="md" />
                      <Card card={cardRail2} size="md" />
                      <Card card={cardRail3} size="md" />
                      <Card card={cardRail4} size="md" />
                    </div>
                    <div className="how-set-caption">
                      <span className="how-check-icon">✓</span>
                      <div>
                        <strong>Complete Railroad Set (4 of 4 Cards)</strong>
                        <p>Railroads require all 4 stations to be fully completed.</p>
                      </div>
                    </div>
                  </div>
                )}

                {activeSetTab === "green" && (
                  <div className="how-cards-row-wrapper">
                    <div className="how-cards-row">
                      <Card card={cardGreen1} size="md" />
                      <Card card={cardGreen2} size="md" />
                      <Card card={cardGreen3} size="md" />
                    </div>
                    <div className="how-set-caption">
                      <span className="how-check-icon">✓</span>
                      <div>
                        <strong>Complete Green Set (3 of 3 Cards)</strong>
                        <p>Most colored sets (Green, Red, Yellow, Orange, Pink, Light Blue) require 3 cards to complete.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="how-win-banner">
              <span className="material-symbols-outlined" style={{ fontSize: "32px", color: "#facc15" }}>
                workspace_premium
              </span>
              <div>
                <strong>Winning Formula:</strong> Have any 3 complete colored sets on your table at the same time and you win the game on the spot!
              </div>
            </div>
          </div>
        </section>

        {/* STEP 2 */}
        <section className="how-step-section shell" style={{ marginTop: "36px" }}>
          <div className="how-step-card glass-panel">
            <div className="how-step-header">
              <div className="how-step-badge">STEP 2</div>
              <div>
                <h2>Your Turn Loop: Draw 2, Play Up to 3 Actions</h2>
                <p>Turns are fast and furious. Every turn consists of 3 clear phases:</p>
              </div>
            </div>

            <div className="how-turn-phases-grid">
              <div className="how-phase-box">
                <div className="how-phase-num">1</div>
                <h3>Draw Cards</h3>
                <p>Pick up <strong>2 cards</strong> from the Draw Pile (or 5 if your hand is empty at the start).</p>
              </div>

              <div className="how-phase-box">
                <div className="how-phase-num">2</div>
                <h3>Play 1 to 3 Cards</h3>
                <p>Put properties down, bank money, charge rent, or unleash action cards to disrupt rivals.</p>
              </div>

              <div className="how-phase-box">
                <div className="how-phase-num">3</div>
                <h3>End Your Turn</h3>
                <p>If you have more than 7 cards in hand, discard down to 7. Pass the turn to the next player!</p>
              </div>
            </div>
          </div>
        </section>

        {/* STEP 3 */}
        <section className="how-step-section shell" style={{ marginTop: "36px" }}>
          <div className="how-step-card glass-panel">
            <div className="how-step-header">
              <div className="how-step-badge">STEP 3</div>
              <div>
                <h2>Where Can You Play Cards?</h2>
                <p>You have 3 dedicated play zones on your table:</p>
              </div>
            </div>

            <div className="how-zones-tabs-bar">
              <button
                type="button"
                className={`how-zone-tab ${activeZoneTab === "bank" ? "active" : ""}`}
                onClick={() => setActiveZoneTab("bank")}
              >
                <span className="material-symbols-outlined">payments</span>
                <span>1. Bank Vault</span>
              </button>
              <button
                type="button"
                className={`how-zone-tab ${activeZoneTab === "properties" ? "active" : ""}`}
                onClick={() => setActiveZoneTab("properties")}
              >
                <span className="material-symbols-outlined">domain</span>
                <span>2. Property Sets</span>
              </button>
              <button
                type="button"
                className={`how-zone-tab ${activeZoneTab === "action" ? "active" : ""}`}
                onClick={() => setActiveZoneTab("action")}
              >
                <span className="material-symbols-outlined">bolt</span>
                <span>3. Center Action Pile</span>
              </button>
            </div>

            <div className="how-zone-content">
              {activeZoneTab === "bank" && (
                <div className="how-zone-layout">
                  <div className="how-zone-cards">
                    <Card card={cardMoney5M} size="md" />
                    <Card card={cardMoney2M} size="md" />
                  </div>
                  <div className="how-zone-text">
                    <h3>🏦 Your Bank Vault</h3>
                    <p>
                      Play Money cards or Action cards directly into your Bank.
                      <strong>Important Rule:</strong> Whenever other players demand rent or debts from you, you can <strong>ONLY</strong> pay them from your Bank Vault or active Property sets on the table. You can never pay out of your hidden hand!
                    </p>
                  </div>
                </div>
              )}

              {activeZoneTab === "properties" && (
                <div className="how-zone-layout">
                  <div className="how-zone-cards">
                    <Card card={cardMediterranean} size="md" />
                    <Card card={cardBaltic} size="md" />
                  </div>
                  <div className="how-zone-text">
                    <h3>🏢 Property Sets Field</h3>
                    <p>
                      Lay down single properties and wildcards face up in front of you. Match colors together to build full sets. Full sets are immune to normal steals (except for the mighty Deal Breaker!).
                    </p>
                  </div>
                </div>
              )}

              {activeZoneTab === "action" && (
                <div className="how-zone-layout">
                  <div className="how-zone-cards">
                    <Card card={cardDealBreaker} size="md" />
                    <Card card={cardRentWild} size="md" />
                  </div>
                  <div className="how-zone-text">
                    <h3>⚡ Center Action Pile</h3>
                    <p>
                      Play powerful Action cards into the center table to attack opponents: steal sets with <em>Deal Breaker</em>, snatch single properties with <em>Sly Deal</em>, collect rent from everyone, or block attacks with <em>Just Say No</em>!
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* FAQ SECTION */}
        <section className="how-step-section shell" style={{ marginTop: "36px" }}>
          <div className="how-step-card glass-panel">
            <div className="how-step-header">
              <div className="how-step-badge">FAQ</div>
              <div>
                <h2>Frequently Asked Questions</h2>
                <p>Quick answers to common gameplay situations.</p>
              </div>
            </div>

            <div className="how-faq-list">
              <div className={`how-faq-item ${openFaq === 1 ? "open" : ""}`}>
                <button type="button" className="how-faq-question" onClick={() => toggleFaq(1)}>
                  <span>Can I give change when paying rent?</span>
                  <span className="material-symbols-outlined">
                    {openFaq === 1 ? "expand_less" : "expand_more"}
                  </span>
                </button>
                {openFaq === 1 && (
                  <div className="how-faq-answer">
                    <strong>No change is ever given!</strong> If you owe $2M and you only have a $5M card in your Bank, you must hand over the entire $5M card.
                  </div>
                )}
              </div>

              <div className={`how-faq-item ${openFaq === 2 ? "open" : ""}`}>
                <button type="button" className="how-faq-question" onClick={() => toggleFaq(2)}>
                  <span>Can Just Say No be played at any time?</span>
                  <span className="material-symbols-outlined">
                    {openFaq === 2 ? "expand_less" : "expand_more"}
                  </span>
                </button>
                {openFaq === 2 && (
                  <div className="how-faq-answer">
                    <strong>Yes!</strong> You can play a Just Say No card from your hand at any moment to cancel any action card targeted at you.
                  </div>
                )}
              </div>

              <div className={`how-faq-item ${openFaq === 3 ? "open" : ""}`}>
                <button type="button" className="how-faq-question" onClick={() => toggleFaq(3)}>
                  <span>Can an opponent steal a card from a completed set?</span>
                  <span className="material-symbols-outlined">
                    {openFaq === 3 ? "expand_less" : "expand_more"}
                  </span>
                </button>
                {openFaq === 3 && (
                  <div className="how-faq-answer">
                    Completed sets are safe from cards like <em>Sly Deal</em> and <em>Forced Deal</em>. The <strong>ONLY</strong> card in the whole game that can touch a full set is the mighty <strong>Deal Breaker</strong> (which steals the entire set at once!).
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* CTA BANNER */}
        <section className="how-cta-section shell" style={{ marginTop: "40px", textAlign: "center" }}>
          <div className="how-cta-card">
            <h2>Ready to Deal?</h2>
            <p>Jump right in against smart AI bots or create a private room for friends.</p>
            <div className="how-cta-buttons">
              <Link href="/game?mode=bot&game=monodeal" className="button button--primary" style={{ padding: "12px 24px", fontSize: "1rem" }}>
                <span className="material-symbols-outlined">smart_toy</span>
                Play Practice vs Bots
              </Link>
              <Link href="/lobby?game=monodeal" className="button button--secondary" style={{ padding: "12px 24px", fontSize: "1rem" }}>
                <span className="material-symbols-outlined">groups</span>
                Create Multiplayer Room
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <MarketingFooter game="monodeal" />
    </div>
  );
}
