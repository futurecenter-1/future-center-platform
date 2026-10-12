const CACHE_NAME = 'future-center-shell-v17';
const APP_SHELL = ['./', './index.html', './styles.css', './styles.css?v=mobile-qa-20261013c', './styles.css?v=mobile-qa-20261013c', './config.js', './app.js', './app.js?v=mobile-qa-20261013c', './manifest.json', './icons/fc-icon.svg', './icons/future-center-original-256.jpg', './icons/future-center-180.png', './icons/future-center-192.png', './icons/future-center-512.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Network-first keeps app code and settings fresh; cached shell is a fallback only.
  event.respondWith(fetch(request).then(response => {
    if (response && response.ok && (request.mode === 'navigate' || APP_SHELL.some(path => url.pathname.endsWith(path.replace('./',''))))) {
      const copy = response.clone(); caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
    }
    return response;
  }).catch(async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (request.mode === 'navigate') return (await caches.match('./index.html')) || Response.error();
    return Response.error();
  }));
});
