const CACHE_NAME = "checkin-pwa-v2";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((c) => c.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k !== CACHE_NAME ? caches.delete(k) : null)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);

  // 只处理同源请求
  if (url.origin !== self.location.origin) return;

  // index.html：网络优先（更新更快），失败再走缓存
  if (url.pathname.endsWith("/index.html") || url.pathname.endsWith("/")) {
    e.respondWith((async () => {
      try {
        const fresh = await fetch(req, { cache: "no-store" });
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, fresh.clone());
        return fresh;
      } catch {
        const cached = await caches.match(req);
        return cached || caches.match("./index.html");
      }
    })());
    return;
  }

  // 其它：缓存优先
  e.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    const fresh = await fetch(req);
    const cache = await caches.open(CACHE_NAME);
    cache.put(req, fresh.clone());
    return fresh;
  })());
});
