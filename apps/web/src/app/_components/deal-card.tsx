type DealCardProps = {
  color: "green" | "blue" | "orange" | "pink" | "wild" | "money";
  title: string;
  subtitle?: string;
  value?: string;
  compact?: boolean;
};
export function DealCard({
  color,
  title,
  subtitle,
  value,
  compact = false,
}: DealCardProps) {
  return (
    <article
      className={`deal-card deal-card--${color}${compact ? " deal-card--compact" : ""}`}
    >
      <small>
        {subtitle ??
          (color === "money"
            ? "BANK"
            : color === "wild"
              ? "WILD PROPERTY"
              : "PROPERTY")}
      </small>
      <strong>{title}</strong>
      {value && <span className="card-value">{value}</span>}
      <i />
    </article>
  );
}
