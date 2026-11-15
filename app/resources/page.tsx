import type { Metadata } from "next";
import Link from "next/link";
import { books, bookMeta } from "../books";

export const metadata: Metadata = { title: "Daggerheart Resources — High Sodium Gaming" };

export default function Resources() {
  return (
    <div className="res-page">
      <div className="art" aria-hidden="true">
        <picture>
          <source srcSet="/art/crystal-cluster.avif" type="image/avif" />
          <img src="/art/crystal-cluster.webp" alt="" width={900} height={900} />
        </picture>
      </div>
      <header className="res-head">
        <Link className="back" href="/">
          <svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6" /></svg>High Sodium Gaming
        </Link>
        <h1>Daggerheart Resources</h1>
      </header>
      <main id="main">
        <div className="books">
          {books.map((b, i) => (
            <Link key={b.slug} className={`book ${i === 0 ? "main" : "side"}`} href={`/resources/${b.slug}`} aria-label={`Open ${b.title}, ${b.pages} pages`}>
              <picture>
                <source srcSet={`/covers/${b.cover}.avif`} type="image/avif" />
                <img className="cover" src={`/covers/${b.cover}.webp`} alt="" width={760} height={984} />
              </picture>
              <div style={{ display: "grid", gap: "var(--s3)" }}>
                <h2>{b.title}</h2>
                <p className="sub">{b.subtitle}</p>
                <p className="meta">{bookMeta(b)}</p>
                <span className="pill small">Open</span>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
