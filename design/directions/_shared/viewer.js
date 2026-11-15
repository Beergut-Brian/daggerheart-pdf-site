window.HITS = [
  { s: "…HOPE AND FEAR <span class=hl>Hope</span> and Fear are currencies used by the players and the GM to represent the way fate turns…", c: "Ch 1 · Character Creation", p: 19 },
  { s: "…you can spend a <span class=hl>Hope</span> to add the Experience's modifier to the roll's result…", c: "Ch 1 · Character Creation", p: 21 },
  { s: "…Class <span class=hl>Hope</span> Feature: Each class has a special move they can make by spending 3 <span class=hl>Hope</span>…", c: "Ch 1 · Class", p: 28 },
  { s: "…Make a Scene: Spend 3 <span class=hl>Hope</span> to temporarily Distract a target within Close range…", c: "Ch 1 · Class (Bard)", p: 29 },
  { s: "…Evolution: Spend 3 <span class=hl>Hope</span> to transform into a Beastform without marking a Stress…", c: "Ch 1 · Class (Druid)", p: 31 }
];
window.CHAPTERS = [["Contents",4],["Introduction",5],["Ch 1 · Preparing for Adventure",12],["Ch 2 · Playing an Adventure",88],["Ch 3 · Running an Adventure",141],["Ch 4 · Adversaries and Environments",194],["Ch 5 · Campaign Frames",254],["Appendix",329]];
window.hitRows = (cls) => HITS.map(h => `<a class="${cls||'hit'}" href="#" aria-label="Page ${h.p}, ${h.c}"><div class="slot pv">p${h.p}</div><div><div class="sn">${h.s}</div><div class="mt">${h.c} · <b>p. ${h.p}</b></div></div></a>`).join('');
window.thumbs = (from, n, cur) => Array.from({length:n},(_,i)=>`<a class="th${from+i===cur?' cur':''}" href="#" aria-label="Page ${from+i}"><div class="slot tp"></div><span>${from+i}</span></a>`).join('');
window.chapterRows = (cur) => CHAPTERS.map(([t,p])=>`<a class="ch${t.startsWith(cur)?' cur':''}" href="#"><span>${t}</span><span class="muted">${p}</span></a>`).join('');
