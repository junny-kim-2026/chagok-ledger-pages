'use strict';
(()=>{
 const button=document.getElementById('installApp'),status=document.getElementById('installStatus');
 let promptEvent=null,ready=false,waiting=false;
 const standalone=()=>window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
 function updateStatus(){
  const title=document.querySelector('.install-panel strong');
  title.textContent=standalone()?'차곡 가계부 앱':'휴대폰에 차곡 가계부 설치';
  button.hidden=!promptEvent||standalone();
  status.textContent=waiting?'새 버전이 준비됐어요. 기록을 저장한 뒤 가계부 창을 모두 닫고 다시 열어 주세요.':ready?(navigator.onLine?'오프라인 준비 완료 · 인터넷 없이도 기록할 수 있어요.':'인터넷 없이 사용 중 · 기록은 이 기기에 저장돼요.'):'처음 준비할 때는 인터넷 연결이 필요해요.';
 }
 window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();promptEvent=event;updateStatus();});
 button.addEventListener('click',async()=>{
  if(!promptEvent)return;
  const event=promptEvent;promptEvent=null;button.hidden=true;
  try{await event.prompt();await event.userChoice;}catch{status.textContent='브라우저 메뉴에서 홈 화면에 추가를 선택해 주세요.';}
 });
 window.addEventListener('appinstalled',()=>{promptEvent=null;updateStatus();});
 window.addEventListener('online',updateStatus);window.addEventListener('offline',updateStatus);
 if(!('serviceWorker' in navigator)||!['https:','http:'].includes(location.protocol)){
  status.textContent='앱 설치는 인터넷 사이트 주소에서 이용할 수 있어요.';return;
 }
 updateStatus();
 navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'}).then(registration=>{
  waiting=!!registration.waiting;
  registration.addEventListener('updatefound',()=>{
   const worker=registration.installing;if(!worker)return;
   worker.addEventListener('statechange',()=>{if(worker.state==='installed'){waiting=!!navigator.serviceWorker.controller;updateStatus();}});
  });
  navigator.serviceWorker.ready.then(()=>{ready=true;updateStatus();});
  updateStatus();
 }).catch(()=>{status.textContent='오프라인 준비를 마치지 못했어요. 인터넷에 연결해서 사용해 주세요.';});
})();
