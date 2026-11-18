import Link from "next/link";

const BookIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 6.5C10.5 5.3 8.2 4.75 4 4.75v13.5c4.2 0 6.5.55 8 1.75 1.5-1.2 3.8-1.75 8-1.75V4.75c-4.2 0-6.5.55-8 1.75z" />
    <path d="M12 6.5V20" />
  </svg>
);

/** The site's primary button: icon box on the left, fill slides right on hover and focus (styles in base.css). */
export default function Cta({ href, children, small, label }: { href: string; children: React.ReactNode; small?: boolean; label?: string }) {
  return (
    <Link className={small ? "cta cta--sm" : "cta"} href={href} aria-label={label}>
      <span className="cta-icon" aria-hidden="true">{BookIcon}</span>
      {children}
    </Link>
  );
}
