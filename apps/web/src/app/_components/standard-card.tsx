"use client";

import React from "react";
import type { LeastCountCard, Suit } from "@dealopoly/game-engine";

interface StandardCardProps {
  card?: LeastCountCard;
  isSelected?: boolean;
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
  faceDown?: boolean;
  showPointsBadge?: boolean;
  disabled?: boolean;
  className?: string;
}

const SUIT_SYMBOLS: Record<Suit, string> = {
  spades: "♠",
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
};

const SUIT_COLORS: Record<Suit, string> = {
  spades: "#38bdf8",
  hearts: "#f43f5e",
  diamonds: "#fb7185",
  clubs: "#a78bfa",
};

export const StandardCard: React.FC<StandardCardProps> = ({
  card,
  isSelected = false,
  onClick,
  size = "md",
  faceDown = false,
  showPointsBadge = true,
  disabled = false,
  className = "",
}) => {
  if (faceDown || !card) {
    return (
      <div
        className={`standard-card standard-card--facedown standard-card--${size} ${className}`}
        onClick={disabled ? undefined : onClick}
      >
        <div className="standard-card-back-pattern">
          <span className="standard-card-back-logo">LC</span>
        </div>
      </div>
    );
  }

  const { suit, rank, points } = card;
  const isRed = suit === "hearts" || suit === "diamonds";
  const suitSymbol = SUIT_SYMBOLS[suit] || "♠";
  const suitColor = SUIT_COLORS[suit] || "#38bdf8";
  const isKing = rank === "K";

  return (
    <div
      className={`standard-card standard-card--${size} ${isRed ? "standard-card--red" : "standard-card--black"} ${
        isSelected ? "standard-card--selected" : ""
      } ${disabled ? "standard-card--disabled" : ""} ${className}`}
      onClick={disabled ? undefined : onClick}
      role="button"
      tabIndex={disabled ? -1 : 0}
      style={{ "--suit-color": suitColor } as React.CSSProperties}
    >
      {/* Top Left Index */}
      <div className="standard-card-index standard-card-index--top">
        <span className="standard-card-rank">{rank}</span>
        <span className="standard-card-suit">{suitSymbol}</span>
      </div>

      {/* Center Suit Art & Character Motif */}
      <div className="standard-card-center-art">
        <span className="standard-card-large-suit">{suitSymbol}</span>
        {isKing && <span className="standard-card-special-icon">👑</span>}
        {rank === "Q" && <span className="standard-card-special-icon">👸</span>}
        {rank === "J" && <span className="standard-card-special-icon">🃏</span>}
        {rank === "A" && <span className="standard-card-special-icon">⭐</span>}
      </div>

      {/* Bottom Right Inverted Index */}
      <div className="standard-card-index standard-card-index--bottom">
        <span className="standard-card-rank">{rank}</span>
        <span className="standard-card-suit">{suitSymbol}</span>
      </div>

      {/* Value Badge */}
      {showPointsBadge && (
        <div className={`standard-card-points-badge ${isKing ? "standard-card-points-badge--king" : ""}`}>
          {isKing ? "0 PTS" : `${points} PTS`}
        </div>
      )}

      {/* Selected Indicator */}
      {isSelected && <div className="standard-card-selected-glow" />}
    </div>
  );
};
