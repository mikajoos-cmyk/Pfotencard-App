const CACHE_NAME = 'pfotencard-cache-v1';
const urlsToCache = ['/', '/index.html', '/index.css'];

self.addEventListener('install', event => {
    event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache)));
});

self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET' || event.request.url.includes('/api/')) {
        return; // API-Anfragen nicht aus dem Cache bedienen
    }
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request);
        })
    );
});

// ==========================================================
// === FINALE LOGIK FÜR DIE HINTERGRUND-SYNCHRONISATION ===
// ==========================================================

self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-queued-requests') {
        console.log('[Service Worker] Sync event received!');
        event.waitUntil(syncQueuedRequests());
    }
});

async function syncQueuedRequests() {
    const db = await openDB();
    const tx = db.transaction('queued-requests', 'readonly');
    const store = tx.objectStore('queued-requests');
    const queuedRequests = await store.getAll();

    console.log('[Service Worker] Found requests to sync:', queuedRequests);

    return Promise.all(queuedRequests.map(req =>
        fetch(req.url, {
            method: req.method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${req.token}`,
            },
            body: req.body ? JSON.stringify(req.body) : null,
        })
        .then(response => {
            if (response.ok) {
                console.log(`[Service Worker] Request ${req.id} sent successfully, deleting from queue.`);
                return deleteQueuedRequestFromDB(req.id);
            } else {
                console.error(`[Service Worker] Server error for request ${req.id}, will retry later.`, response);
            }
        })
        .catch(error => {
            console.error(`[Service Worker] Network error for request ${req.id}, will retry later.`, error);
        })
    ));
}

// --- IndexedDB-Helfer direkt im Service Worker ---
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('pfotencard-db', 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('queued-requests')) {
                db.createObjectStore('queued-requests', { autoIncrement: true, keyPath: 'id' });
            }
        };
    });
}

async function deleteQueuedRequestFromDB(id) {
    const db = await openDB();
    const tx = db.transaction('queued-requests', 'readwrite');
    await tx.objectStore('queued-requests').delete(id);
    return tx.done;
}