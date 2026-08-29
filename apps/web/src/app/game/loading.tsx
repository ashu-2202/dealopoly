import { CardLoader } from "../_components/card-loader";

export default function GameLoading() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <CardLoader size="md" text="Dealing cards…" />
    </div>
  );
}
