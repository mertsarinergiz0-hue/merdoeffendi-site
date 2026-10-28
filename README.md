# MERDOEFFENDİ sitesi

Tek sayfalık, ücretsiz GitHub Pages sitesi.

## Nasıl çalışır
- `index.html` sitenin kendisi. Ayarlar dosyanın başındaki `CONFIG` bölümünde.
- `.github/workflows/youtube.yml` günde bir kez YouTube kanalının son videolarını `videos.json` dosyasına yazar. Yeni video yüklenince en geç ertesi gün sitede görünür.
- `.github/workflows/live.yml` yarım saatte bir Kick yayın durumunu `live.json` dosyasına yazar.
- GitHub zamanlı görevleri birkaç dakika gecikebilir. Sitedeki durum anlık değil, yaklaşık.

## Bağış bağlantısı
`index.html` içindeki `donateUrl` değeri bynogame bağış sayfana bağlı: https://donate.bynogame.com/merdoeffendi

## Elle çalıştırma
Repo sayfasında Actions sekmesinden iki görevi de "Run workflow" ile hemen çalıştırabilirsin.
