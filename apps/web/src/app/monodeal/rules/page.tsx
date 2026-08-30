"use client";

import React, { useState } from "react";
import Link from "next/link";
import { MarketingNav } from "../../_components/marketing-nav";
import { MarketingFooter } from "../../_components/marketing-footer";
import { BackButton } from "../../_components/back-button";
import { Card } from "../../_components/card";
import { CARD_CATALOGUE } from "@dealopoly/shared";

type RuleCategory =
  | "general"
  | "payment"
  | "property"
  | "action"
  | "justsayno"
  | "dealbreaker"
  | "rent"
  | "house";

interface TabConfig {
  id: RuleCategory;
  label: string;
  shortLabel: string;
  icon: string;
}

const RULE_TABS: TabConfig[] = [
  { id: "general", label: "General Rules", shortLabel: "General", icon: "menu_book" },
  { id: "payment", label: "Payments & Bank", shortLabel: "Payment", icon: "payments" },
  { id: "property", label: "Properties & Wilds", shortLabel: "Properties", icon: "domain" },
  { id: "action", label: "Action Cards", shortLabel: "Actions", icon: "bolt" },
  { id: "justsayno", label: "Just Say No", shortLabel: "Just Say No", icon: "shield" },
  { id: "dealbreaker", label: "Deal Breaker", shortLabel: "Deal Breaker", icon: "gavel" },
  { id: "rent", label: "Rent & Multipliers", shortLabel: "Rent", icon: "request_quote" },
  { id: "house", label: "Houses & Hotels", shortLabel: "Houses/Hotels", icon: "apartment" },
];

export default function MonodealRulesPage() {
  const [activeTab, setActiveTab] = useState<RuleCategory>("general");

  const cardOldKent = CARD_CATALOGUE.find((c) => c.id === "prop-mediterranean-avenue") || CARD_CATALOGUE.find((c) => c.primaryColor === "brown")!;
  const cardMayfair = CARD_CATALOGUE.find((c) => c.id === "prop-mayfair")!;
  const cardWildMulti = CARD_CATALOGUE.find((c) => c.id === "wild-multicolor")!;
  const cardMoney10M = CARD_CATALOGUE.find((c) => c.id === "money-10m")!;
  const cardDealBreaker = CARD_CATALOGUE.find((c) => c.id === "action-deal-breaker")!;
  const cardJustSayNo = CARD_CATALOGUE.find((c) => c.id === "action-just-say-no")!;
  const cardSlyDeal = CARD_CATALOGUE.find((c) => c.id === "action-sly-deal")!;
  const cardDebtCollector = CARD_CATALOGUE.find((c) => c.id === "action-debt-collector")!;
  const cardDoubleRent = CARD_CATALOGUE.find((c) => c.id === "action-double-the-rent")!;
  const cardHouse = CARD_CATALOGUE.find((c) => c.id === "action-house")!;
  const cardHotel = CARD_CATALOGUE.find((c) => c.id === "action-hotel")!;

  return (
    <div className="marketing-page" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <MarketingNav game="monodeal" activeTab="rules" />

      <main style={{ flex: 1, paddingBottom: "80px" }}>
        <section className="rules-hero-section shell" style={{ textAlign: "center", padding: "40px 16px 28px" }}>
          <div style={{ maxWidth: "840px", margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "14px" }}>
              <BackButton fallbackUrl="/monodeal" label="Back to Monodeal" variant="subtle" />
            </div>

            <div className="how-hero-pill">
              <span>📖 Official Monodeal Rulebook</span>
            </div>

            <h1 className="how-hero-title">
              Official <span className="glow-word">Monodeal Rules</span>
            </h1>

            <p className="how-hero-lede">
              Explore official rules, card interactions, payments, and strategy tips broken down into clear, searchable categories.
            </p>
          </div>

          {/* Category Tabs */}
          <div className="rules-tabs-wrapper">
            <div className="rules-tabs-bar" role="tablist" aria-label="Monodeal Rule Categories">
              {RULE_TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveTab(tab.id)}
                    className={`rules-nav-tab ${isActive ? "active" : ""}`}
                  >
                    <span className="material-symbols-outlined rules-tab-icon">{tab.icon}</span>
                    <span className="rules-tab-text-full">{tab.label}</span>
                    <span className="rules-tab-text-short">{tab.shortLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Tab Content Section */}
        <section className="shell" style={{ marginTop: "16px" }}>
          {activeTab === "general" && (
            <div className="rules-tab-content">
              <div className="rules-card-container">
                <div className="rule-box">
                  <h3>🎯 Winning Condition</h3>
                  <p>
                    The first player to collect <strong>3 complete property sets</strong> of different colors in front of them wins the game.
                  </p>
                </div>
                <div className="rule-box">
                  <h3>🔄 The Turn Loop</h3>
                  <p>
                    1. <strong>Draw 2 cards</strong> (or 5 if starting with 0 cards).<br />
                    2. <strong>Play up to 3 cards</strong> on your turn (properties, money, actions).<br />
                    3. <strong>Discard to 7 cards</strong> at the end of your turn if holding more.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "payment" && (
            <div className="rules-tab-content">
              <div className="rules-card-container">
                <div className="rule-box">
                  <h3>💵 Bank Vault & Payments</h3>
                  <p>
                    Payments must be made from cards in play (Bank Vault or active Properties). You can never pay out of your hidden hand!
                  </p>
                </div>
                <div className="rule-box">
                  <h3>🚫 No Change Given</h3>
                  <p>
                    If you owe $2M and only have a $5M card in your bank, you must give the full $5M. No change is returned.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "property" && (
            <div className="rules-tab-content">
              <div className="rules-card-container">
                <div className="rule-box">
                  <h3>🏢 Property Sets & Wildcards</h3>
                  <p>
                    Group properties by color to complete full sets. Multicolor wilds can represent any property color.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "action" && (
            <div className="rules-tab-content">
              <div className="rules-card-container">
                <div className="rule-box">
                  <h3>⚡ Action Cards</h3>
                  <p>
                    Action cards can be played to charge rent, steal properties, demand debt, or pass GO to draw 2 extra cards.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "justsayno" && (
            <div className="rules-tab-content">
              <div className="rules-card-container">
                <div className="rule-box">
                  <h3>🛡️ Just Say No</h3>
                  <p>
                    Play anytime from your hand to cancel an action card played against you (even on an opponent's turn!).
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "dealbreaker" && (
            <div className="rules-tab-content">
              <div className="rules-card-container">
                <div className="rule-box">
                  <h3>🔨 Deal Breaker</h3>
                  <p>
                    Steal a complete property set from any player. This is the only card capable of stealing a completed set!
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "rent" && (
            <div className="rules-tab-content">
              <div className="rules-card-container">
                <div className="rule-box">
                  <h3>💰 Rent & Multipliers</h3>
                  <p>
                    Charge rent on any property color you own. Play Double The Rent to multiply the rent fee by 2x!
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "house" && (
            <div className="rules-tab-content">
              <div className="rules-card-container">
                <div className="rule-box">
                  <h3>🏠 Houses & Hotels</h3>
                  <p>
                    Add a House (+$3M rent) or Hotel (+$4M rent) to any completed set (except Railroads & Utilities).
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* CTA Banner */}
        <section className="shell" style={{ marginTop: "40px", textAlign: "center" }}>
          <div className="how-cta-card">
            <h2>Ready to Play Monodeal?</h2>
            <p>Jump right into a game against smart AI bots or create a private room for friends.</p>
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
