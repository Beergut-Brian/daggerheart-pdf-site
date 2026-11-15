import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="vstate">
      <p>No book by that name on the shelf.</p>
      <Link className="pill small" href="/resources">Back to Daggerheart Resources</Link>
    </main>
  );
}
