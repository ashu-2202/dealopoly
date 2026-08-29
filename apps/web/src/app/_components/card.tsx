import React from "react";
import type { CardDefinition } from "@dealopoly/shared";
import { COLOR_CONFIG } from "@dealopoly/shared";

export interface CardProps {
  card: CardDefinition;
  size?: "xs" | "sm" | "md" | "lg";
  isInteractive?: boolean;
  className?: string;
  onClick?: () => void;
}

export function Card({
  card,
  size = "md",
  isInteractive = true,
  className = "",
  onClick,
}: CardProps) {
  const primaryConfig = card.primaryColor
    ? COLOR_CONFIG[card.primaryColor]
    : undefined;
  const secondaryConfig = card.secondaryColor
    ? COLOR_CONFIG[card.secondaryColor]
    : undefined;

  const primaryHex = primaryConfig?.hex ?? "#0055A4";
  const secondaryHex = secondaryConfig?.hex;
  const isDarkText =
    primaryConfig?.textHex === "#111415" ||
    card.primaryColor === "yellow" ||
    card.primaryColor === "light-blue";

  return (
    <div
      onClick={onClick}
      style={
        {
          "--card-color": primaryHex,
          "--card-color-secondary": secondaryHex,
        } as React.CSSProperties
      }
      className={`monopoly-card monopoly-card--${size} ${
        isInteractive ? "monopoly-card--interactive" : ""
      } ${className}`}
    >
      {/* Texture Noise Overlay */}
      <div
        className="texture-overlay"
        style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1 }}
      />

      {/* Top Right Value Badge */}
      {card.value > 0 && (
        <div className="card-value-badge">
          <span>${card.value}M</span>
        </div>
      )}

      {/* ============================================================ */}
      {/* 1. PROPERTY CARD DESIGN (Matches uploaded reference photo)   */}
      {/* ============================================================ */}
      {card.type === "property" && (
        <>
          {/* Header Color Banner */}
          <div
            className={`card-header-banner ${
              isDarkText
                ? "card-header-banner--dark-text"
                : "card-header-banner--light-text"
            }`}
          >
            {/* Top Left Icon Circle */}
            <div className="card-icon-badge">
              <span
                className="material-symbols-outlined"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {card.icon || "location_city"}
              </span>
            </div>

            {/* Category Tag */}
            <div className="card-category-tag">
              <span>{card.tagline || "PROPERTY"}</span>
            </div>

            {/* Card Main Title */}
            <h3 className="card-title-text">{card.name}</h3>

            {/* Bottom Chevron Star Point Cutout */}
            <div className="card-header-star">
              <span
                className="material-symbols-outlined"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                star
              </span>
            </div>
          </div>

          {/* Center Rent Section */}
          <div className="card-rent-section">
            <div className="card-rent-title">
              <span>RENT</span>
            </div>
            <p className="card-rent-subtitle">
              Collect rent from the player who has this card in their hand.
            </p>

            {/* Rent Breakdown Table */}
            <div className="card-rent-table">
              {card.rentTiers?.map((tier) => (
                <div key={tier.setCount} className="rent-table-row">
                  <div className="rent-row-label">
                    <span>
                      {tier.setCount} {tier.setCount === 1 ? "SET" : "SETS"}
                    </span>
                    {tier.isComplete && (
                      <span className="rent-row-complete">(COMPLETE)</span>
                    )}
                  </div>
                  <div className="rent-row-icon">
                    <span
                      className="material-symbols-outlined"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      payments
                    </span>
                  </div>
                  <span className="rent-row-val">M{tier.rent}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Accent Divider */}
          <div className="card-center-divider">
            <span>◆</span>
          </div>

          {/* Bottom Set Size Bar & Cityscape Watermark */}
          <div className="card-bottom-bar">
            {/* Detailed City Skyline Silhouette */}
            <div
              className="card-skyline-watermark"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 160 50' fill='%239E9689'%3E%3Cpath d='M0,50 L0,36 L12,36 L12,24 L18,24 L18,14 L24,14 L24,50 L34,50 L34,18 L40,8 L46,18 L46,50 L64,50 L64,30 L74,30 L74,50 L92,50 L92,20 L102,20 L102,50 L118,50 L118,28 L128,28 L128,50 L144,50 L144,15 L150,5 L156,15 L156,50 Z'/%3E%3C/svg%3E\")",
              }}
            />

            <div className="card-set-size-wrap">
              <div className="card-set-size-circle">
                <span className="card-set-size-number">{card.setSize ?? 2}</span>
              </div>
              <div className="card-set-size-text">
                <strong>PROPERTY</strong>
                <small>SET SIZE</small>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ============================================================ */}
      {/* 2. PROPERTY WILD CARD DESIGN                                 */}
      {/* ============================================================ */}
      {card.type === "property-wild" && (
        <>
          <div
            className="card-header-banner"
            style={
              card.primaryColor === "all"
                ? {
                    background:
                      "linear-gradient(135deg, #8B4513 0%, #87CEEB 15%, #D83A8F 30%, #F28C28 45%, #ED1B24 60%, #FFDE00 75%, #008000 90%, #0055A4 100%)",
                    color: "#FFFFFF",
                  }
                : secondaryHex
                  ? {
                      background: `linear-gradient(135deg, ${primaryHex} 50%, ${secondaryHex} 50%)`,
                      color: "#FFFFFF",
                    }
                  : {
                      backgroundColor: primaryHex,
                      color: "#FFFFFF",
                    }
            }
          >
            <div className="card-category-tag">
              <span>{card.tagline || "PROPERTY WILD CARD"}</span>
            </div>
            <h3 className="card-title-text" style={{ color: "#FFFFFF" }}>
              {card.name}
            </h3>
          </div>

          <div className="card-rent-section">
            <div
              className="card-icon-badge"
              style={{
                position: "static",
                width: "48px",
                height: "48px",
                marginBottom: "8px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize: "26px",
                  color: primaryHex,
                  fontVariationSettings: "'FILL' 1",
                }}
              >
                {card.icon || "auto_awesome"}
              </span>
            </div>
            <p
              className="card-rent-subtitle"
              style={{ fontSize: "0.72rem", color: "#222", fontWeight: 500 }}
            >
              {card.description}
            </p>
          </div>

          <div
            className="card-bottom-bar"
            style={{ justifyContent: "center", textAlign: "center" }}
          >
            <span
              style={{
                fontFamily: "var(--mono)",
                fontSize: "0.62rem",
                fontWeight: 700,
                color: "#555",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Part of any matching set
            </span>
          </div>
        </>
      )}

      {/* ============================================================ */}
      {/* 3. ACTION CARD DESIGN                                        */}
      {/* ============================================================ */}
      {card.type === "action" && (
        <div className="card-action-frame">
          <div className="card-action-badge">{card.tagline || "ACTION"}</div>

          <div className="card-action-center">
            <div className="card-action-icon-circle">
              <span className="material-symbols-outlined">
                {card.icon || "handshake"}
              </span>
            </div>
            <h3 className="card-action-title">{card.name}</h3>
            <div className="card-action-desc-box">
              <p>{card.description}</p>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderTop: "1px solid rgba(0, 85, 164, 0.25)",
              paddingTop: "4px",
              fontFamily: "var(--mono)",
              fontSize: "0.65rem",
              color: "#555",
            }}
          >
            <span>BANK: ${card.value}M</span>
            <strong style={{ color: "#0055A4" }}>ACTION</strong>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 4. RENT CARD DESIGN                                          */}
      {/* ============================================================ */}
      {card.type === "rent" && (
        <div className="card-rent-frame">
          <div
            className="card-header-banner"
            style={
              card.primaryColor === "all"
                ? {
                    background:
                      "linear-gradient(135deg, #8B4513 0%, #87CEEB 15%, #D83A8F 30%, #F28C28 45%, #ED1B24 60%, #FFDE00 75%, #008000 90%, #0055A4 100%)",
                    color: "#FFFFFF",
                  }
                : secondaryHex
                  ? {
                      background: `linear-gradient(135deg, ${primaryHex} 50%, ${secondaryHex} 50%)`,
                      color: "#FFFFFF",
                    }
                  : {
                      backgroundColor: primaryHex,
                      color: "#FFFFFF",
                    }
            }
          >
            <div className="card-category-tag">
              <span>RENT</span>
            </div>
            <h3 className="card-title-text" style={{ color: "#FFFFFF" }}>
              {card.name}
            </h3>
          </div>

          <div className="card-action-center">
            <div
              className="card-icon-badge"
              style={{
                position: "static",
                width: "46px",
                height: "46px",
                marginBottom: "8px",
                background: "rgba(39, 166, 68, 0.15)",
                color: "#27A644",
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "24px", fontVariationSettings: "'FILL' 1" }}
              >
                payments
              </span>
            </div>
            <div className="card-action-desc-box" style={{ borderColor: "#27A644" }}>
              <p>{card.description}</p>
            </div>
          </div>

          <div
            className="card-bottom-bar"
            style={{ justifyContent: "center", textAlign: "center" }}
          >
            <span
              style={{
                fontFamily: "var(--mono)",
                fontSize: "0.62rem",
                fontWeight: 700,
                color: "#555",
              }}
            >
              Charge rent to players
            </span>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 5. MONEY CARD DESIGN                                         */}
      {/* ============================================================ */}
      {card.type === "money" && (
        <div className="card-money-frame">
          {/* Background Currency Pattern */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              opacity: 0.18,
              pointerEvents: "none",
              backgroundImage:
                "radial-gradient(#fff 1.5px, transparent 1.5px), radial-gradient(#fff 1.5px, transparent 1.5px)",
              backgroundSize: "14px 14px",
              backgroundPosition: "0 0, 7px 7px",
            }}
          />

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              position: "relative",
              zIndex: 3,
            }}
          >
            <span className="card-money-corner-val">${card.value}M</span>
            <span className="card-money-corner-val">${card.value}M</span>
          </div>

          <div className="card-money-center-seal">
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              attach_money
            </span>
            <strong>${card.value}M</strong>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              transform: "rotate(180deg)",
              position: "relative",
              zIndex: 3,
            }}
          >
            <span className="card-money-corner-val">${card.value}M</span>
            <span className="card-money-corner-val">${card.value}M</span>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 6. RULE CARD DESIGN                                          */}
      {/* ============================================================ */}
      {card.type === "rule" && (
        <div
          style={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            border: "2px solid #8C919D",
            borderRadius: "12px",
            padding: "10px",
            background: "rgba(255,255,255,0.85)",
            zIndex: 2,
          }}
        >
          <div
            style={{
              background: "#323536",
              color: "#FFFFFF",
              borderRadius: "8px",
              padding: "6px 8px",
              textAlign: "center",
            }}
          >
            <span
              style={{
                fontFamily: "var(--mono)",
                fontSize: "0.62rem",
                color: "#A8C8FF",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                fontWeight: 700,
              }}
            >
              QUICK REFERENCE
            </span>
            <h3
              style={{
                fontFamily: "var(--display)",
                fontSize: "0.85rem",
                fontWeight: 900,
                textTransform: "uppercase",
                marginTop: "2px",
              }}
            >
              Rules of Play
            </h3>
          </div>

          <div
            style={{
              margin: "auto 0",
              padding: "8px 0",
              fontSize: "0.68rem",
              lineHeight: 1.4,
              color: "#222",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            <p>
              <strong>1. Draw:</strong> Take 2 cards from deck.
            </p>
            <p>
              <strong>2. Play:</strong> Up to 3 cards per turn.
            </p>
            <p>
              <strong>3. Bank:</strong> Action and Money cards go to bank.
            </p>
            <p>
              <strong>4. Win:</strong> 3 complete property sets!
            </p>
          </div>

          <div
            style={{
              textAlign: "center",
              fontFamily: "var(--mono)",
              fontSize: "0.58rem",
              color: "#666",
              borderTop: "1px solid #CCC",
              paddingTop: "4px",
            }}
          >
            Monopoly Deal Official Deck
          </div>
        </div>
      )}
    </div>
  );
}
