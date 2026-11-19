import { chromium } from "playwright-core"; import http from "node:http"; import fs from "node:fs"; import path from "node:path";
const root = path.resolve("public"), types={".html":"text/html",".js":"text/javascript",".css":"text/css",".woff2":"font/woff2",".webp":"image/webp",".jpg":"image/jpeg",".png":"image/png"};
const server = http.createServer((q,s)=>{let u=decodeURIComponent(q.url.split("?")[0]); if(u==="/table"){s.writeHead(301,{location:"/table/"});return s.end();} if(u.endsWith("/"))u+="index.html"; const f=path.join(root,u); if(!fs.existsSync(f)){s.writeHead(404);return s.end();} s.writeHead(200,{"content-type":types[path.extname(f)]||"application/octet-stream"}); fs.createReadStream(f).pipe(s);});
await new Promise(r=>server.listen(0,r));
const browser = await chromium.launch({ executablePath: "/ms-playwright/chromium-1248/chrome-linux64/chrome", args:["--no-sandbox","--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist","--enable-blink-features=CanvasDrawElement"]});
for (const hash of process.argv.slice(2)) {
const ctx = await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:2}); const p=await ctx.newPage(); p.setDefaultTimeout(400000);
p.on("pageerror",e=>console.error("err",e.message));
await p.goto(`http://localhost:${server.address().port}/table/${hash}`);
await p.waitForFunction(()=>document.body.classList.contains("is-ready")&&window.__table,null,{timeout:400000});
console.log(hash, await p.evaluate(()=>{const t=__table; return {mode:t.mode, ratio:t.renderer.getPixelRatio(), surf:t.surfaces.list.filter(s=>/cover|note|screen|left/.test(s.id)).map(s=>[s.id,s.aw,s.ah,s.zoom,s.canvas2d?[s.canvas2d.width,s.canvas2d.height]:0].join(' '))}}));
await ctx.close();}
await browser.close(); server.close();
