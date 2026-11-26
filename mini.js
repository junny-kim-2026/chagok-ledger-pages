'use strict';
function emptyMiniLedgers(){return Array.from({length:6},(_,i)=>({name:'미니 가계부 '+(i+1),entries:[]}));}
let miniLedgers=emptyMiniLedgers(),miniBook=0,miniEditing=null;
const miniMonths=Array(6).fill('');
function miniSelectedMonth(index){return miniMonths[index]||today().slice(0,7);}
function miniMonthBalance(rows,month){return periodBalance(rows,'month',month+'-01');}
function selectMiniMonth(index,month){if(!validDate(month+'-01'))return;miniMonths[index]=month;renderMiniLedgers();}
function validateMiniLedgers(data){
 let books=data.version<4&&data.miniLedgers===undefined?emptyMiniLedgers():data.miniLedgers;
 if(Array.isArray(books)&&((data.version===4&&books.length===3)||(data.version===5&&books.length===4)))books=[...books,...emptyMiniLedgers().slice(books.length)];
 if(!Array.isArray(books)||books.length!==6)throw Error('미니 가계부 백업은 6개여야 합니다.');
 return books.map(book=>{if(!book||typeof book.name!=='string'||!book.name.trim()||book.name.length>30||!Array.isArray(book.entries)||book.entries.length>100000)throw Error('미니 가계부 이름과 내역을 확인해 주세요.');const rows=book.entries.map(validateEntry);if(new Set(rows.map(r=>r.id)).size!==rows.length)throw Error('미니 가계부에 중복된 기록이 있습니다.');totals(rows);return {name:book.name.trim(),entries:rows};});
}
function saveMiniBook(index,book){
 if(!Number.isInteger(index)||index<0||index>5)throw Error('미니 가계부를 확인해 주세요.');
 commit(entries,{minis:miniLedgers.map((v,i)=>i===index?book:v)});
}
function renderMiniLedgers(){
 miniLedgers.forEach((book,i)=>{
  $('miniName'+i).textContent=book.name;const month=miniSelectedMonth(i),sum=miniMonthBalance(book.entries,month),rows=periodRows(book.entries,'month',month+'-01');
  $('miniMonth'+i).value=month;$('miniopening'+i).textContent=storageBlocked?'—':money(sum.opening)+'원';
  $('miniPrev'+i).disabled=month==='1900-01';$('miniNext'+i).disabled=month==='2100-12';
  for(const key of ['income','expense','balance'])$('mini'+key+i).textContent=storageBlocked?'—':money(sum[key])+'원';
  $('miniAdd'+i).disabled=$('miniRename'+i).disabled=storageBlocked;$('miniCount'+i).textContent=Number(month.slice(5))+'월 수입·지출 내역 '+rows.length+'건';
  const list=$('miniRows'+i);list.replaceChildren();if(!rows.length)list.append(node('li','이번 달 기록이 없어요. 지난달 잔액은 그대로 이어져요.','mini-empty'));
  for(const r of [...rows].sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id))){
   const row=node('li',undefined,'mini-row'),info=node('div'),buttons=node('div',undefined,'row-actions');
   info.append(node('span',r.date,'muted'),node('strong',(r.type==='income'?'입금 +':'출금 −')+money(r.amount)+'원',r.type));
   info.append(node('p',r.memo||'내역 설명 없음','mini-description'));
   const edit=node('button','수정'),del=node('button','삭제');edit.disabled=del.disabled=storageBlocked;edit.setAttribute('aria-label',book.name+' '+r.date+' '+money(r.amount)+'원 수정');del.setAttribute('aria-label',book.name+' '+r.date+' '+money(r.amount)+'원 삭제');
   edit.onclick=()=>openMiniEntry(i,r);del.onclick=()=>ask('이 입출금 내역을 삭제할까요?',book.name+' · '+r.date+' · '+money(r.amount)+'원. 이 미니 가계부에서만 삭제합니다.',()=>{saveMiniBook(i,{...miniLedgers[i],entries:miniLedgers[i].entries.filter(v=>v.id!==r.id)});toast('미니 가계부 내역을 삭제했습니다.');});
   buttons.append(edit,del);row.append(info,buttons);list.append(row);
  }
 });
}
function openMiniEntry(index,entry){
 miniBook=index;miniEditing=entry?.id||null;const f=$('miniForm');f.reset();f.elements.type.value=entry?.type||'expense';f.elements.amount.value=entry?money(entry.amount):'';f.elements.date.value=entry?.date||(miniSelectedMonth(index)===today().slice(0,7)?today():miniSelectedMonth(index)+'-01');f.elements.memo.value=entry?.memo||'';$('miniEntryTitle').textContent=miniLedgers[index].name+' · '+(entry?'내역 수정':'입출금 기록');$('miniError').textContent='';$('miniDialog').showModal();if(entry)f.elements.amount.focus();else $('miniEntryTitle').focus();
}
function initMiniLedgers(){
 const grid=$('miniGrid');
 for(let i=0;i<6;i++){
  const card=node('article',undefined,'mini-card'),head=node('div',undefined,'mini-head'),title=node('h4');title.id='miniName'+i;
  const rename=node('button','이름 변경');rename.id='miniRename'+i;rename.onclick=()=>{miniBook=i;$('miniNameInput').value=miniLedgers[i].name;$('miniNameError').textContent='';$('miniNameDialog').showModal();$('miniNameInput').focus();};
  head.append(title,rename);
  const picker=node('div',undefined,'mini-month-picker'),prev=node('button','❮'),next=node('button','❯'),label=node('label','조회할 월'),input=node('input'),current=node('button','이번 달');
  input.id='miniMonth'+i;input.type='month';input.min='1900-01';input.max='2100-12';input.setAttribute('aria-label','미니 가계부 '+(i+1)+' 조회할 월');
  input.onchange=()=>{if(validDate(input.value+'-01'))selectMiniMonth(i,input.value);else{toast('조회할 월을 선택해 주세요.');renderMiniLedgers();}};
  prev.id='miniPrev'+i;next.id='miniNext'+i;prev.setAttribute('aria-label','이전 달');next.setAttribute('aria-label','다음 달');
  prev.onclick=()=>selectMiniMonth(i,shiftDate(miniSelectedMonth(i)+'-01','month',-1).slice(0,7));next.onclick=()=>selectMiniMonth(i,shiftDate(miniSelectedMonth(i)+'-01','month',1).slice(0,7));current.onclick=()=>selectMiniMonth(i,today().slice(0,7));
  label.append(input);picker.append(prev,label,next,current);
  const summary=node('dl',undefined,'mini-summary');
  for(const [key,label] of [['opening','전월 이월금'],['income','이번 달 수입'],['expense','이번 달 지출'],['balance','월말 잔액']]){const group=node('div',undefined,key),value=node('dd');value.id='mini'+key+i;group.append(node('dt',label),value);summary.append(group);}
  const add=node('button','＋ 입출금 기록','primary');add.id='miniAdd'+i;add.onclick=()=>openMiniEntry(i);
  const details=node('details'),caption=node('summary'),list=node('ul',undefined,'mini-rows');caption.id='miniCount'+i;list.id='miniRows'+i;details.append(caption,list);card.append(head,picker,summary,node('p','월말 잔액 = 전월 이월금 + 이번 달 수입 − 지출','mini-carry-help'),add,details);grid.append(card);
 }
 const f=$('miniForm');f.elements.amount.oninput=()=>formatAmountInput(f.elements.amount);$('miniCancel').onclick=()=>$('miniDialog').close();
 f.onsubmit=e=>{e.preventDefault();try{const book=miniLedgers[miniBook];if(miniEditing&&!book.entries.some(v=>v.id===miniEditing))throw Error('이 내역이 다른 창에서 삭제되었습니다. 취소 후 목록을 확인해 주세요.');const r=validateEntry({id:miniEditing||(globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)),type:f.elements.type.value,amount:parseAmount(f.elements.amount.value),date:f.elements.date.value,category:'기타',memo:f.elements.memo.value.trim()});saveMiniBook(miniBook,{...book,entries:[...book.entries.filter(v=>v.id!==r.id),r]});miniMonths[miniBook]=r.date.slice(0,7);renderMiniLedgers();$('miniDialog').close();toast(book.name+'에 저장했습니다.');}catch(err){$('miniError').textContent=err.message;}};
 $('miniNameCancel').onclick=()=>$('miniNameDialog').close();$('miniNameForm').onsubmit=e=>{e.preventDefault();try{saveMiniBook(miniBook,{...miniLedgers[miniBook],name:$('miniNameInput').value.trim()});$('miniNameDialog').close();toast('미니 가계부 이름을 변경했습니다.');}catch(err){$('miniNameError').textContent=err.message;}};
}
