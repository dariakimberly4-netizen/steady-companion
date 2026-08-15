const CACHE='steady-companion-v4';
const CORE=['./','./index.html','./manifest.webmanifest','./flexible-medicine.js'];

self.addEventListener('install',event=>{
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)));
});

self.addEventListener('activate',event=>{
  event.waitUntil(Promise.all([
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))),
    self.clients.claim()
  ]));
});

async function withMedicinePatch(response){
  if(!response)return response;
  const html=await response.text();
  const patched=html.includes('flexible-medicine.js')
    ? html
    : html.replace('</body>','<script src="./flexible-medicine.js"></script></body>');
  const headers=new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.set('content-type','text/html; charset=utf-8');
  return new Response(patched,{status:response.status,statusText:response.statusText,headers});
}

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  const isAppPage=event.request.mode==='navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('/index.html');

  if(isAppPage){
    event.respondWith(
      fetch(event.request)
        .then(async response=>{
          const copy=response.clone();
          caches.open(CACHE).then(cache=>cache.put(event.request,copy));
          return withMedicinePatch(response);
        })
        .catch(async()=>{
          const cached=await caches.match(event.request) || await caches.match('./index.html');
          return withMedicinePatch(cached);
        })
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response=>{
        const copy=response.clone();
        caches.open(CACHE).then(cache=>cache.put(event.request,copy));
        return response;
      })
      .catch(()=>caches.match(event.request))
  );
});
