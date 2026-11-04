'use strict';
function emptyMiniLedgers(){return Array.from({length:3},(_,i)=>({name:'미니 가계부 '+(i+1),entries:[]}));}
let miniLedgers=emptyMiniLedgers(),miniBook=0,miniEditing=null;
function validateMiniLedgers(data){
 const books=data.version<4&&data.miniLedgers===undefined?emptyMiniLedgers():data.miniLedgers;
 if(!Array.isArray(books)||books.length!==3)throw Error('미니 가계부 백업은 3개여야 합니다.');
 return books.map(book=>{if(!book||typeof book.name!=='string'||!book.name.trim()||book.name.length>30||!Array.isArray(book.entries)||book.entries.length>100000)throw Error('미니 가계부 이름과 내역을 확인해 주세요.');const rows=book.entries.map(validateEntry);if(new Set(rows.map(r=>r.id)).size!==rows.length)throw Error('미니 가계부에 중복된 기록이 있습니다.');totals(rows);return {name:book.name.trim(),entries:rows};});
}
function saveMiniBook(index,book){
 if(!Number.isInteger(index)||index<0||index>2)throw Error('미니 가계부를 확인해 주세요.');
 commit(entries,{minis:miniLedgers.map((v,i)=>i===index?book:v)});
}
function renderMiniLedgers(){
 miniLedgers.forEach((book,i)=>{
  $('miniName'+i).textContent=book.name;const sum=totals(book.entries);
  for(const key of ['income','expense','balance'])$('mini'+key+i).textContent=storageBlocked?'—':money(sum[key])+'원';
  $('miniAdd'+i).disabled=$('miniRename'+i).disabled=storageBlocked;$('miniCount'+i).textContent='입출금 내역 '+book.entries.length+'건';
  const list=$('miniRows'+i);list.replaceChildren();if(!book.entries.length)list.append(node('li','입금 또는 출금을 기록해 보세요.','mini-empty'));
  for(const r of [...book.entries].sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id))){
   const row=node('li',undefined,'mini-row'),info=node('div'),buttons=node('div',undefined,'row-actions');
   info.append(node('span',r.date,'muted'),node('strong',(r.type==='income'?'입금 +':'출금 −')+money(r.amount)+'원',r.type));
   const edit=node('button','수정'),del=node('button','삭제');edit.disabled=del.disabled=storageBlocked;edit.setAttribute('aria-label',book.name+' '+r.date+' '+money(r.amount)+'원 수정');del.setAttribute('aria-label',book.name+' '+r.date+' '+money(r.amount)+'원 삭제');
   edit.onclick=()=>openMiniEntry(i,r);del.onclick=()=>ask('이 입출금 내역을 삭제할까요?',book.name+' · '+r.date+' · '+money(r.amount)+'원. 이 미니 가계부에서만 삭제합니다.',()=>{saveMiniBook(i,{...miniLedgers[i],entries:miniLedgers[i].entries.filter(v=>v.id!==r.id)});toast('미니 가계부 내역을 삭제했습니다.');});
   buttons.append(edit,del);row.append(info,buttons);list.append(row);
  }
 });
}
function openMiniEntry(index,entry){
 miniBook=index;miniEditing=entry?.id||null;const f=$('miniForm');f.reset();f.elements.type.value=entry?.type||'expense';f.elements.amount.value=entry?money(entry.amount):'';f.elements.date.value=entry?.date||today();$('miniEntryTitle').textContent=miniLedgers[index].name+' · '+(entry?'내역 수정':'입출금 기록');$('miniError').textContent='';$('miniDialog').showModal();f.elements.amount.focus();
}
function initMiniLedgers(){
 const grid=$('miniGrid');
 for(let i=0;i<3;i++){
  const card=node('article',undefined,'mini-card'),head=node('div',undefined,'mini-head'),title=node('h4');title.id='miniName'+i;
  const rename=node('button','이름 변경');rename.id='miniRename'+i;rename.onclick=()=>{miniBook=i;$('miniNameInput').value=miniLedgers[i].name;$('miniNameError').textContent='';$('miniNameDialog').showModal();$('miniNameInput').focus();};
  head.append(title,rename);const summary=node('dl',undefined,'mini-summary');
  for(const [key,label] of [['income','총입금'],['expense','총출금'],['balance','남은 잔액']]){const group=node('div',undefined,key),value=node('dd');value.id='mini'+key+i;group.append(node('dt',label),value);summary.append(group);}
  const add=node('button','＋ 입출금 기록','primary');add.id='miniAdd'+i;add.onclick=()=>openMiniEntry(i);
  const details=node('details'),caption=node('summary'),list=node('ul',undefined,'mini-rows');caption.id='miniCount'+i;list.id='miniRows'+i;details.append(caption,list);card.append(head,summary,add,details);grid.append(card);
 }
 const f=$('miniForm');f.elements.amount.oninput=()=>formatAmountInput(f.elements.amount);$('miniCancel').onclick=()=>$('miniDialog').close();
 f.onsubmit=e=>{e.preventDefault();try{const book=miniLedgers[miniBook];if(miniEditing&&!book.entries.some(v=>v.id===miniEditing))throw Error('이 내역이 다른 창에서 삭제되었습니다. 취소 후 목록을 확인해 주세요.');const r=validateEntry({id:miniEditing||(globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)),type:f.elements.type.value,amount:parseAmount(f.elements.amount.value),date:f.elements.date.value,category:'기타',memo:''});saveMiniBook(miniBook,{...book,entries:[...book.entries.filter(v=>v.id!==r.id),r]});$('miniDialog').close();toast(book.name+'에 저장했습니다.');}catch(err){$('miniError').textContent=err.message;}};
 $('miniNameCancel').onclick=()=>$('miniNameDialog').close();$('miniNameForm').onsubmit=e=>{e.preventDefault();try{saveMiniBook(miniBook,{...miniLedgers[miniBook],name:$('miniNameInput').value.trim()});$('miniNameDialog').close();toast('미니 가계부 이름을 변경했습니다.');}catch(err){$('miniNameError').textContent=err.message;}};
}
