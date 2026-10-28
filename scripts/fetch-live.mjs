// Kick kanalının canlı olup olmadığını live.json dosyasına yazar.
// GitHub Actions içinde çalışır (live.yml).
import { readFile, writeFile } from "node:fs/promises";

const SLUG = "merdoeffendi";
const FILE = "live.json";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

async function readOld() {
  try { return JSON.parse(await readFile(FILE, "utf8")); } catch { return {}; }
}

async function check() {
  const r = await fetch(`https://kick.com/api/v2/channels/${SLUG}`, {
    headers: { "user-agent": UA, accept: "application/json" },
  });
  if (!r.ok) throw new Error(`Kick yanıtı: HTTP ${r.status}`);
  const j = await r.json();
  return { live: !!j.livestream, title: j.livestream?.session_title ?? "" };
}

const old = await readOld();
let next;
try {
  const s = await check();
  next = { ok: true, live: s.live, title: s.title, checked: new Date().toISOString() };
  console.log("Kick durumu:", s.live ? "canlı" : "kapalı");
} catch (e) {
  console.log(`::warning::Kick okunamadı: ${e.message}`);
  next = { ok: false, live: null, title: "", checked: new Date().toISOString() };
}

// Gereksiz commit olmasın: sadece durum değişince ya da canlıyken yaz.
const changed = old.ok !== next.ok || old.live !== next.live || old.title !== next.title;
if (changed || next.live === true) {
  await writeFile(FILE, JSON.stringify(next, null, 2) + "\n");
}
