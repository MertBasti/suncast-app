
const CACHE_NAME = "suncast-v6";

const APP_FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./manifest.json",
  "./icon-192.png",
"./icon-512.png"
];

// Dateien bei der Installation speichern
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(APP_FILES);
    })
  );

  self.skipWaiting();
});

// Alte Cache-Versionen entfernen
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(names => {
      return Promise.all(
        names
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    })
  );

  self.clients.claim();
});

// Gespeicherte Dateien offline bereitstellen
self.addEventListener("fetch", event => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Wetter-APIs immer über das Netzwerk abrufen
  if (url.hostname.includes("open-meteo.com")) {
    return;
  }

  // Nur eigene App-Dateien aus dem Cache laden
  if (url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok) {
          const copy = response.clone();

          event.waitUntil(
            caches.open(CACHE_NAME).then(cache => {
              return cache.put(request, copy);
            })
          );
        }

        return response;
      })
      .catch(() => caches.match(request))
  );
});
