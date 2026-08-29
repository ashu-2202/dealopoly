"use client";

import React from "react";
import { Card, CardBack } from "./card";
import type { CardDefinition } from "@dealopoly/shared";

export interface CardLoaderProps {
  /** Size of the loader cards */
  size?: "sm" | "md" | "lg";
  /** Optional text shown below the loader */
  text?: string;
  /** Additional className on the root wrapper */
  className?: string;
}

/**
 * Three representative Dealopoly cards used in the loader animation.
 * Each card type has a different visual style so the loader looks rich.
 */
const LOADER_CARDS: CardDefinition[] = [
  {
    id: "loader-action",
    name: "Deal Breaker",
    type: "action",
    value: 5,
    count: 1,
    tagline: "ACTION",
    description: "Steal a complete set of properties from any player.",
    icon: "handshake",
  },
  {
    id: "loader-property",
    name: "Mayfair",
    type: "property",
    primaryColor: "dark-blue",
    value: 4,
    count: 1,
    setSize: 2,
    rentTiers: [
      { setCount: 1, rent: 3 },
      { setCount: 2, rent: 8, isComplete: true },
    ],
    tagline: "PROPERTY",
    icon: "location_city",
  },
  {
    id: "loader-money",
    name: "5M",
    type: "money",
    value: 5,
    count: 1,
  },
];

/**
 * A reusable rotating card loader for the Dealopoly app.
 *
 * Renders 3 stacked Dealopoly cards that rotate (Y-axis flip) independently
 * with a staggered delay, creating a cascading shuffle/flip effect.
 *
 * Usage:
 *   <CardLoader />
 *   <CardLoader size="sm" text="Loading game…" />
 *   <CardLoader size="lg" />
 */
export function CardLoader({ size = "md", text, className = "" }: CardLoaderProps) {
  return (
    <div className={`card-loader card-loader--${size} ${className}`} role="status" aria-label="Loading">
      <div className="card-loader__stack">
        {LOADER_CARDS.map((card, index) => (
          <div
            key={card.id}
            className="card-loader__card-wrapper"
            style={
              {
                "--loader-index": index,
                "--loader-rotate": `${(index - 1) * 15}deg`,
                zIndex: LOADER_CARDS.length - index,
              } as React.CSSProperties
            }
          >
            <div className="card-loader__flipper">
              {/* Front: the actual Dealopoly card */}
              <div className="card-loader__face card-loader__face--front">
                <Card card={card} size="sm" isInteractive={false} />
              </div>
              {/* Back: Official Dealopoly card back */}
              <div className="card-loader__face card-loader__face--back">
                <CardBack size="sm" isInteractive={false} />
              </div>
            </div>
          </div>
        ))}
      </div>
      {text && <p className="card-loader__text">{text}</p>}
      {/* Visually hidden live text for screen readers */}
      <span className="sr-only">Loading…</span>
    </div>
  );
}
