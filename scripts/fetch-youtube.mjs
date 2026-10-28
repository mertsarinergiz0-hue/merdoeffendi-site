// YouTube kanalının son videolarını videos.json dosyasına yazar.
// GitHub Actions içinde çalışır (youtube.yml). Yerelde: node scripts/fetch-youtube.mjs
import { readFile, writeFile } from "node:fs/promises";

const HANDLE = "merdoeffendi";
const FILE = "videos.json";
const MAX = 12;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const HEADERS = {
  "user-agent": UA,
  "accept-language": "tr-TR,tr;q=0.9,en;q=0.8",
  cookie: "SOCS=CAI; CONSENT=YES+1",
};

const decode = (s) =>
  s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
   .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'");

async function getText(url) {
  const r = await fetch(url, { headers: HEADERS, redirect: "follow" });
  if (!r.ok) throw new Error(`${url} -> HTTP ${r.status}`);
  return r.text();
}

async function readOld() {
  try { return JSON.parse(await readFile(FILE, "utf8")); } catch { return {}; }
}

async function findChannelId() {
  const urls = [
    `https://www.youtube.com/@${HANDLE}`,
    `https://www.youtube.com/c/${HANDLE}`,
    `https://www.youtube.com/user/${HANDLE}`,
    `https://www.youtube.com/${HANDLE}`,
  ];
  for (const u of urls) {
    try {
      const html = await getText(u);
      const m =
        html.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[\w-]{22})"/) ||
        html.match(/"externalId":"(UC[\w-]{22})"/) ||
        html.match(/<meta itemprop="identifier" content="(UC[\w-]{22})"/) ||
        html.match(/"channelId":"(UC[\w-]{22})"/);
      if (m) { console.log(`Kanal kimliği bulundu (${u}): ${m[1]}`); return m[1]; }
      console.log(`Kimlik bulunamadı: ${u}`);
    } catch (e) {
      console.log(`Deneme başarısız: ${e.message}`);
    }
  }
  throw new Error("Kanal kimliği bulunamadı");
}

function parseFeed(xml) {
  const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((m) => m[1]);
  return entries.slice(0, MAX).map((e) => {
    const g = (re) => { const m = e.match(re); return m ? decode(m[1]) : ""; };
    const id = g(/<yt:videoId>([^<]+)<\/yt:videoId>/);
    return {
      id,
      title: g(/<title>([^<]*)<\/title>/),
      published: g(/<published>([^<]+)<\/published>/),
      thumb: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      url: `https://www.youtube.com/watch?v=${id}`,
    };
  }).filter((v) => /^[\w-]{11}$/.test(v.id));
}

const old = await readOld();
try {
  const channelId = old.channelId || (await findChannelId());
  const xml = await getText(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`);
  let videos = parseFeed(xml);
  if (videos.length === 0 && (old.videos || []).length > 0) {
    console.log("::warning::Akış boş geldi, eski liste korunuyor.");
    videos = old.videos;
  }
  const out = {
    updated: new Date().toISOString().slice(0, 10),
    channelId,
    channelUrl: `https://www.youtube.com/channel/${channelId}`,
    videos,
  };
  await writeFile(FILE, JSON.stringify(out, null, 2) + "\n");
  console.log(`${videos.length} video yazıldı.`);
} catch (e) {
  console.log(`::error::YouTube güncellemesi başarısız: ${e.message}`);
  process.exitCode = 1;
}
