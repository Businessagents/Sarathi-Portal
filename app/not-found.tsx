import Link from "next/link";

export default function NotFound() {
  return (
    <main className="not-found-page">
      <span>UNOFFICIAL PROTOTYPE, DUMMY DATA ONLY</span>
      <h1>This demo page does not exist.</h1>
      <p>No government record was searched. Return to the start of the synthetic LL-to-DL journey.</p>
      <Link className="primary-link" href="/">Start a fresh demo</Link>
    </main>
  );
}
