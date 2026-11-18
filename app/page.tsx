import { preload } from "react-dom";
import { shelfTag } from "./books";
import Cta from "./components/Cta";
import SiteNav from "./components/SiteNav";
import SplatHero from "./components/SplatHero";

const STILL = "/splat/still.webp";

export default function Home() {
  preload(STILL, { as: "image", fetchPriority: "high", type: "image/webp" });
  return (
    <>
      <SiteNav current="home" />
      <main id="main">
        <section className="hero" aria-labelledby="hero-title" data-splat="still">
          <div className="hero-media">
            {/* the posterised still: LCP image, and the whole hero under reduced motion or without WebGL */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={STILL} alt="Pixel-art scene seen from above at night: a small campfire in a forest clearing, embers and blue smoke rising through the trees." width={450} height={252} fetchPriority="high" decoding="async" />
          </div>
          <SplatHero />
          <div className="hero-shade" />
          <div className="hero-copy">
            <span className="tag">{shelfTag()}</span>
            <h1 className="display" id="hero-title"><span className="dim">Every rule your party needs.</span><span className="bright">Just keep it out of the fire.</span></h1>
            <p className="lead">The Core Rulebook and Hope &amp; Fear. Every page, searchable.</p>
            <Cta href="/resources">Daggerheart Resources</Cta>
          </div>
        </section>
      </main>
    </>
  );
}
