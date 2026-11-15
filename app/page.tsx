import Link from "next/link";
import SaltHero from "./components/SaltHero";

export default function Home() {
  return (
    <main id="main" className="hero">
      <span className="glow" aria-hidden="true" />
      <div className="stack">
        <h1 className="wm" aria-label="High Sodium Gaming">
          <span className="l l1">HIGH</span> <span className="l l2">SODIUM</span> <span className="l l3">GAMING</span>
        </h1>
        <p className="tag">Rules, close at hand. Salt to taste.</p>
        <Link className="pill" href="/resources">Daggerheart Resources</Link>
      </div>
      <SaltHero />
    </main>
  );
}
