export default function DemoCaseLoading() {
  return (
    <main className="case-loading" aria-busy="true">
      <div className="loading-line" />
      <div className="loading-block" />
      <span>Opening synthetic demo case…</span>
    </main>
  );
}
