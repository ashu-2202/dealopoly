import Link from "next/link";

export function Brand({
  className = "brand",
  game,
}: {
  className?: string;
  game?: "arcade" | "monodeal" | "lowdeck";
}) {
  return (
    <Link className={className} href="/" aria-label="Dealopoly Arcade home" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
      <span
        className="material-symbols-outlined"
        style={{ fontVariationSettings: "'FILL' 1", color: "var(--primary)" }}
      >
        playing_cards
      </span>
      <span style={{ fontWeight: 900 }}>dealopoly <span style={{ opacity: 0.7, fontSize: "0.85em", fontWeight: 700 }}>arcade</span></span>
    </Link>
  );
}
