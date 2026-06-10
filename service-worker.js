/* bukken-calc Service Worker
 * cache-first 戦略（同一オリジンの静的アセットのみ）
 * 外部CDN（html2canvas / jsPDF / Google Fonts）はキャッシュせずネットワーク優先
 * 更新時は CACHE_NAME のバージョン番号を上げる
 */
const CACHE_NAME = 'bukken-calc-v1';

const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

// インストール: 静的アセットを事前キャッシュ
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// 有効化: 古いキャッシュを削除
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// フェッチ: 同一オリジンのGETのみ cache-first。外部CDNは介入せずブラウザ既定（ネットワーク）に任せる
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // 外部CDNはキャッシュしない

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          // 正常レスポンスのみ動的キャッシュ
          if (response && response.ok && response.type === 'basic') {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached); // オフライン時はキャッシュ（無ければ失敗）
    })
  );
});
