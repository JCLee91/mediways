// Service Worker placeholder
// 현재 PWA 기능을 사용하지 않으므로 빈 파일로 유지
self.addEventListener('install', (event) => {
  // Skip waiting
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Claim clients
  event.waitUntil(clients.claim());
});

// No caching or offline functionality
