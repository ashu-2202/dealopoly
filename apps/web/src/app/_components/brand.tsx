import Link from "next/link";

export function Brand({ className = "brand" }: { className?: string }) {
  return (
    <Link className={className} href="/" aria-label="Dealopoly home">
      <span
        className="material-symbols-outlined"
        style={{ fontVariationSettings: "'FILL' 1" }}
      >
        playing_cards
      </span>
      <span>dealopoly</span>
    </Link>
  );
}
