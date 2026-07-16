/* VanBerto's PWA Service Worker (offline-first, mas sempre atualizado quando há rede) */
const CACHE_VERSION = "vanbertos-v20";
const FONTS_CACHE = "vanbertos-fonts-v1";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./assets/logo-vanbertos.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k !== CACHE_VERSION && k !== FONTS_CACHE ? caches.delete(k) : null)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Navegação (abrir/recarregar a página): tenta sempre a rede primeiro, para nunca
  // ficar preso a uma versão antiga em cache. Só usa a cache se não houver ligação.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put("./index.html", copy));
          return res;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  // Google Fonts: cache-first num cache próprio e duradouro (não é limpo a cada versão)
  if (url.origin === "https://fonts.googleapis.com" || url.origin === "https://fonts.gstatic.com") {
    event.respondWith(
      caches.open(FONTS_CACHE).then((cache) =>
        cache.match(req).then((cached) => {
          if (cached) return cached;
          return fetch(req)
            .then((res) => {
              cache.put(req, res.clone());
              return res;
            })
            .catch(() => cached);
        })
      )
    );
    return;
  }

  // Só cachear same-origin
  if (url.origin !== self.location.origin) return;

  // CSS e JS mudam com frequência durante o desenvolvimento — rede primeiro, cache
  // só como reserva quando não há ligação. Assim, uma alteração feita no GitHub
  // aparece sempre que houver rede, e continua a funcionar offline com a última
  // versão conhecida.
  const isCodeAsset = req.destination === "style" || req.destination === "script";
  if (isCodeAsset) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Imagens e tipos de letra locais mudam pouco — cache-first, mais rápido e poupa dados.
  const isMedia = req.destination === "image" || req.destination === "font";
  if (isMedia) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req)
          .then((res) => {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
            return res;
          })
          .catch(() => cached);
      })
    );
  }
});
