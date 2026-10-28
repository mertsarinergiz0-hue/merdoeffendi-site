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

const note = (m) => console.log(`::notice::${m}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const decode = (s) =>
  s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
   .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'");
const norm = (s) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ı/g, "i").toLowerCase();

async function getText(url) {
  const r = await fetch(url, { headers: HEADERS, redirect: "follow" });
  if (!r.ok) throw new Error(`${url} -> HTTP ${r.status}`);
  return r.text();
}

async function readOld() {
  try { return JSON.parse(await readFile(FILE, "utf8")); } catch { return {}; }
}

// Kanal sayfasından kimliği bulur ve kanal adının gerçekten bu kanal olduğunu doğrular.
async function findChannel() {
  const urls = [
    `https://www.youtube.com/@${HANDLE}`,
    `https://www.youtube.com/c/${HANDLE}`,
    `https://www.youtube.com/user/${HANDLE}`,
    `https://www.youtube.com/${HANDLE}`,
  ];
  const patterns = [
    ["canonical", /<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[\w-]{22})"/],
    ["externalId", /"externalId":"(UC[\w-]{22})"/],
    ["identifier", /<meta itemprop="identifier" content="(UC[\w-]{22})"/],
    ["channelId", /"channelId":"(UC[\w-]{22})"/],
  ];
  for (const u of urls) {
    try {
      const html = await getText(u);
      const title = decode((html.match(/<meta property="og:title" content="([^"]*)"/) || [, ""])[1]);
      for (const [name, re] of patterns) {
        const m = html.match(re);
        if (!m) continue;
        note(`Sayfa ${u} | desen ${name} | kimlik ${m[1]} | başlık "${title}"`);
        // @kullanıcıadı sayfasının kendi canonical adresi o kanalın kimliğidir; ayrıca ad kontrolü yap.
        const trusted = (name === "canonical" && u.includes("/@")) || norm(title).includes("merdo");
        if (trusted) return { id: m[1], title };
        note(`Kanalla eşleşmedi, bu kimlik kullanılmayacak: ${m[1]}`);
        break;
      }
    } catch (e) {
      note(`Deneme başarısız: ${e.message}`);
    }
  }
  throw new Error("Doğrulanmış kanal kimliği bulunamadı");
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

// Yedek: kanalın Videolar sayfasını okur (tarih bilgisi vermez).
async function scrapeVideos(channelId) {
  const html = await getText(`https://www.youtube.com/channel/${channelId}/videos`);
  const seen = new Set();
  const out = [];
  const re = /"videoRenderer":\{"videoId":"([\w-]{11})"[\s\S]*?"title":\{"runs":\[\{"text":"((?:[^"\\]|\\.)*)"/g;
  for (const m of html.matchAll(re)) {
    if (seen.has(m[1])) continue;
    seen.add(m[1]);
    let title = m[2];
    try { title = JSON.parse(`"${m[2]}"`); } catch {}
    out.push({
      id: m[1],
      title,
      published: "",
      thumb: `https://i.ytimg.com/vi/${m[1]}/hqdefault.jpg`,
      url: `https://www.youtube.com/watch?v=${m[1]}`,
    });
    if (out.length >= MAX) break;
  }
  return out;
}

async function getVideos(channelId) {
  const feed = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  for (let i = 1; i <= 3; i++) {
    try {
      const videos = parseFeed(await getText(feed));
      note(`Akıştan ${videos.length} video okundu`);
      return videos;
    } catch (e) {
      note(`Akış denemesi ${i} başarısız: ${e.message}`);
      if (i < 3) await sleep(4000);
    }
  }
  const videos = await scrapeVideos(channelId);
  note(`Yedek yöntemle ${videos.length} video okundu`);
  return videos;
}

const old = await readOld();
try {
  let channelId = old.channelId;
  if (!channelId) channelId = (await findChannel()).id;
  let videos = await getVideos(channelId);
  if (videos.length === 0 && (old.videos || []).length > 0) {
    console.log("::warning::Liste boş geldi, eski liste korunuyor.");
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
