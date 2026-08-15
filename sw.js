/* Minimal service worker.
 *
 * Chromium requires a fetch handler before it will fire beforeinstallprompt,
 * so this exists mainly to make the page installable. It caches the shell so
 * the Home Screen icon still opens something useful when offline.
 */
var CACHE = 'share-test-v1';
var SHELL = [
  './',
  'index.html',
  'styles.css',
  'share.js',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-512-maskable.png',
  'icons/apple-touch-icon.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(SHELL.map(function (path) {
        return new URL(path, self.registration.scope).href;
      }));
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (key) {
        return key !== CACHE;
      }).map(function (key) {
        return caches.delete(key);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;
  // Network first so edits show up immediately while testing, cache as fallback.
  event.respondWith(
    fetch(event.request).then(function (response) {
      var copy = response.clone();
      caches.open(CACHE).then(function (cache) {
        cache.put(event.request, copy);
      });
      return response;
    }).catch(function () {
      return caches.match(event.request).then(function (hit) {
        return hit || caches.match(new URL('index.html', self.registration.scope).href);
      });
    })
  );
});
