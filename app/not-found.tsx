import Cta from "./components/Cta";
import SiteNav from "./components/SiteNav";

export default function NotFound() {
  return (
    <>
      <SiteNav current="resources" />
      <main id="main" className="vstate vstate-page">
        <p className="display">No book by that name on the shelf.</p>
        <Cta small href="/resources">Daggerheart Resources</Cta>
      </main>
    </>
  );
}
