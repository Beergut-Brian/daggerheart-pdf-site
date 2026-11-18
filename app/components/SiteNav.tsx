import Link from "next/link";
import { books } from "../books";

/** The floating light pill nav. `current` marks the active top-level link. */
export default function SiteNav({ current }: { current: "home" | "resources" }) {
  return (
    <header className="site-nav">
      <nav className="nav-pill" aria-label="Main">
        <Link className="wordmark" href="/"><span className="mark" aria-hidden="true">HSG</span>High Sodium Gaming</Link>
        <ul className="nav-links">
          <li className="nav-home"><Link href="/" aria-current={current === "home" ? "page" : undefined}>Home</Link></li>
          <li><Link href="/resources" aria-current={current === "resources" ? "page" : undefined}>Daggerheart Resources</Link></li>
          <li className="nav-divider" aria-hidden="true" />
          {books.map((b) => (
            <li key={b.slug} className="nav-books"><Link href={`/resources/${b.slug}`}>{b.navLabel}</Link></li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
