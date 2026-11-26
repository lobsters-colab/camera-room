// Offline support for 相機濾鏡暗房.
// Pages: network first (only good responses are cached). AI models and ONNX Runtime: cache first.
// Other files: network first, cache as fallback. Bump CACHE whenever model/ or ort/ files are replaced.
const CACHE = "darkroom-v8";
const SHELL = ["./", "index.html", "manifest.json", "icon-192.png", "icon-180.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("darkroom-") && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
const put = (req, r) => { if (r && r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return r; };
self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  // other apps in this repo (e.g. /fitness/) manage their own caching
  const base = new URL("./", self.location).pathname;
  if (!url.pathname.startsWith(base) || url.pathname.startsWith(base + "fitness/")) return;
  const rel = url.pathname.slice(base.length);
  if (rel.startsWith("model/") || rel.startsWith("ort/")) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => put(req, r))));
    return;
  }
  e.respondWith(fetch(req).then(r => put(req, r)).catch(() => caches.match(req).then(r => r || (req.mode === "navigate" ? caches.match("index.html") : Response.error()))));
});
