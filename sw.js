'use strict';
// Change this version whenever any shell asset changes. Do not cache user backups.
const CACHE='chagok-app-shell-20261126-v3';
const ASSETS=['./','./index.html','./style.css?v=20261126-total-edit','./notes.js?v=20261104-mini-four','./mini.js?v=20261126-total-edit','./app.js?v=20261126-year-list','./install.js?v=20261125-app','./favicon.svg','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./icons/apple-touch-icon.png'];
const URLS=new Set(ASSETS.map(path=>new URL(path,self.registration.scope).href));
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{
 for(const key of await caches.keys())if(key.startsWith('chagok-app-shell-')&&key!==CACHE)await caches.delete(key);
 await self.clients.claim();
})());});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin||!url.href.startsWith(self.registration.scope))return;
 if(request.mode==='navigate'){
  // Serve a complete, matching shell version; updates activate after existing windows close.
  if(url.pathname!==new URL('./',self.registration.scope).pathname&&url.pathname!==new URL('./index.html',self.registration.scope).pathname)return;
  event.respondWith(caches.open(CACHE).then(async cache=>(await cache.match('./index.html'))||fetch(request)));return;
 }
 if(URLS.has(url.href))event.respondWith(caches.open(CACHE).then(async cache=>(await cache.match(request))||fetch(request)));
});
