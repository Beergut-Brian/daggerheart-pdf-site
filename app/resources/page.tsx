import type { Metadata } from "next";
import Link from "next/link";
import { books, bookMeta } from "../books";
import Cta from "../components/Cta";
import SiteNav from "../components/SiteNav";

export const metadata: Metadata = { title: "Daggerheart Resources — High Sodium Gaming" };

export default function Resources() {
  // 1 book: cover beside its text. 2: two columns. 3+: compact grid, covers are the links.
  const layout = books.length === 1 ? "shelf--one" : books.length >= 3 ? "shelf--many" : "";
  const compact = books.length >= 3;
  return (
    <>
      <SiteNav current="resources" />
      <div className="res-glow" aria-hidden="true">
        <picture>
          <source type="image/avif" srcSet="/img/hero-campfire-1200.avif" />
          <img src="/img/hero-campfire-1200.webp" alt="" width={1200} height={672} />
        </picture>
      </div>
      <main id="main" className="res-main">
        <header className="res-head">
          <span className="tag">{books.length} {books.length === 1 ? "book" : "books"}</span>
          <h1 className="display"><span className="dim">Daggerheart</span>{" "}<span className="bright">Resources</span></h1>
        </header>
        <ul className={`shelf ${layout}`.trim()} aria-label="Books">
          {books.map((b) => (
            <li key={b.slug} className="book">
              <Link
                className="cover"
                href={`/resources/${b.slug}`}
                {...(compact ? { "aria-label": `Open ${b.title}, ${b.pages} pages` } : { "aria-hidden": true, tabIndex: -1 })}
              >
                <picture>
                  <source type="image/avif" srcSet={`/covers/${b.cover}.avif`} />
                  <img src={`/covers/${b.cover}.webp`} alt="" width={760} height={984} />
                </picture>
              </Link>
              <div className="book-body">
                <h2>{b.title}</h2>
                {!compact && <p>{b.subtitle}</p>}
                <span className="meta">{bookMeta(b)}</span>
              </div>
              {!compact && <Cta small href={`/resources/${b.slug}`} label={`Open ${b.title}, ${b.pages} pages`}>Open</Cta>}
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
