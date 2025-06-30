const CACHE_NAME = 'djr-gaji-cache-v1';
// Ini daftar semua file penting di web lo yang mau disimpen
const urlsToCache = [
  '/',
  '/index.html',
  '/admin.html',
  '/karyawan.html',
  '/firebase-config.js',
  '/js/app.js',
  '/js/admin.js',
  '/js/employee.js',
  '/js/security.js',
  '/assets/img/djrtenda.png',
  '/assets/img/icon-192x192.png',
  '/assets/img/icon-512x512.png',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
];

// Proses instalasi service worker dan caching file
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Kalau ada request, coba cari di cache dulu sebelum ke internet
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request);
      })
  );
});
