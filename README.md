# MERDOEFFENDİ sitesi

Tek sayfalık, ücretsiz GitHub Pages sitesi.

## Nasıl çalışır
- `index.html` sitenin kendisi. Ayarlar dosyanın başındaki `CONFIG` bölümünde.
- `.github/workflows/youtube.yml` her 3 saatte bir YouTube kanalının son videolarını `videos.json` dosyasına yazar. Yeni video yüklenince sitede kendiliğinden görünür.
- `.github/workflows/live.yml` her 5 dakikada bir Kick yayın durumunu `live.json` dosyasına yazar.
- GitHub zamanlı görevleri birkaç dakika gecikebilir. Sitedeki durum anlık değil, yaklaşık.

## Bağış bağlantısı
`index.html` içinde `donateUrl` değerine oyunfor ya da bynogame bağış sayfanın adresini yaz.

## Elle çalıştırma
Repo sayfasında Actions sekmesinden iki görevi de "Run workflow" ile hemen çalıştırabilirsin.
