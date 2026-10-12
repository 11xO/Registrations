/* ═══════════════════════════════════════════════════════
   مشوارك أدمن - Service Worker
   ═══════════════════════════════════════════════════════ */

const CACHE_NAME = 'mishwarak-admin-v1';
const CACHE_FILES = [
    './',
    './index.html',
    './logo.png',
    './manifest.json',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap'
];

// تثبيت الـ SW
self.addEventListener('install', (event) => {
    console.log('🔧 SW: Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('📦 SW: Caching files');
                return cache.addAll(CACHE_FILES).catch(err => {
                    console.log('⚠️ SW: بعض الملفات مش اتخزنت:', err);
                });
            })
            .then(() => self.skipWaiting())
    );
});

// تنشيط الـ SW
self.addEventListener('activate', (event) => {
    console.log('✅ SW: Activated');
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME)
                    .map(key => {
                        console.log('🗑️ SW: Removing old cache:', key);
                        return caches.delete(key);
                    })
            );
        }).then(() => self.clients.claim())
    );
});

// اعتراض الطلبات
self.addEventListener('fetch', (event) => {
    // تجاهل طلبات Firebase
    if(event.request.url.includes('firebase') ||
       event.request.url.includes('firebaseio') ||
       event.request.url.includes('googleapis.com')) {
        return;
    }
    
    // جرّب من الكاش الأول
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if(response){
                    // رجّع من الكاش + حدّث في الخلفية
                    fetch(event.request).then(freshResponse => {
                        if(freshResponse && freshResponse.status === 200){
                            caches.open(CACHE_NAME).then(cache => {
                                cache.put(event.request, freshResponse);
                            });
                        }
                    }).catch(() => {});
                    return response;
                }
                
                // مفيش في الكاش — هات من الشبكة
                return fetch(event.request).then(response => {
                    if(!response || response.status !== 200 || response.type !== 'basic'){
                        return response;
                    }
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseClone);
                    });
                    return response;
                }).catch(() => {
                    // لو مفيش نت، رجّع صفحة رئيسية
                    if(event.request.mode === 'navigate'){
                        return caches.match('./index.html');
                    }
                });
            })
    );
});

// إشعارات Push (مستقبلية)
self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : {};
    const title = data.title || 'مشوارك أدمن';
    const options = {
        body: data.body || 'عندك طلب جديد',
        icon: './logo.png',
        badge: './logo.png',
        vibrate: [200, 100, 200],
        data: data.url || './'
    };
    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// الضغط على الإشعار
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data || './')
    );
});