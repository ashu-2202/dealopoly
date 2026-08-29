import { CardLoader } from "./_components/card-loader";

export default function RootLoading() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <CardLoader size="md" text="Loading…" />
    </div>
  );
}
