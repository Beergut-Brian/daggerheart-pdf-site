import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { bookBySlug, books } from "../../books";
import Reader from "../../components/reader/Reader";
import type { OutlineItem } from "../../lib/search";

export const dynamicParams = false;
export function generateStaticParams() { return books.map((b) => ({ slug: b.slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const b = bookBySlug((await params).slug);
  return { title: b ? `${b.title} — High Sodium Gaming` : "Not found" };
}

export default async function BookPage({ params }: { params: Promise<{ slug: string }> }) {
  const book = bookBySlug((await params).slug);
  if (!book) notFound();
  const outline: OutlineItem[] | null = book.outline
    ? (JSON.parse(fs.readFileSync(path.join(process.cwd(), "app", "outlines", book.outline), "utf8")) as OutlineItem[])
    : null;
  return <Reader book={book} staticOutline={outline} />;
}

