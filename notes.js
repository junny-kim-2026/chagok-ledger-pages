'use strict';
let monthlyNotes={},noteMonth='',noteDirty=false,noteBase='',calculation=null;
function validateNotes(data){
 const source=data.version<3&&data.monthlyNotes===undefined?{}:data.monthlyNotes;
 if(!source||typeof source!=='object'||Array.isArray(source)||Object.keys(source).length>2412)throw Error('월별 메모 백업을 확인해 주세요.');
 const clean={};for(const [month,text] of Object.entries(source)){if(!jumpDate(month,'month')||typeof text!=='string'||text.length>10000)throw Error('메모는 올바른 월과 10,000자 이하의 내용이어야 합니다.');if(text)clean[month]=text;}return clean;
}
function renderNotes(){
 if(!noteDirty){noteBase=monthlyNotes[noteMonth]||'';$('monthNote').value=noteBase;}
 $('monthNote').disabled=storageBlocked;$('saveNote').disabled=storageBlocked;$('insertCalculation').disabled=storageBlocked||!calculation;
 $('noteCount').textContent=$('monthNote').value.length.toLocaleString('ko-KR')+' / 10,000자';
}
function saveMonthlyNote(){
 if(storageBlocked)throw Error('저장소를 확인할 수 없습니다. 위의 안내를 확인해 주세요.');
 if((monthlyNotes[noteMonth]||'')!==noteBase)throw Error('다른 창이나 백업 복원에서 이 달의 메모가 바뀌었습니다. 입력 내용을 복사한 뒤 ‘저장된 메모 불러오기’를 눌러 확인해 주세요.');
 const next={...monthlyNotes,[noteMonth]:$('monthNote').value};commit(entries,{notes:next});noteDirty=false;renderNotes();$('noteStatus').textContent='메모를 저장했습니다.';
}
function changeNoteMonth(next){
 if(!jumpDate(next,'month')){ $('noteMonth').value=noteMonth;$('noteStatus').textContent='1900년부터 2100년 사이의 월을 선택해 주세요.';return;}
 try{if(noteDirty)saveMonthlyNote();noteMonth=next;$('noteMonth').value=next;renderNotes();$('noteStatus').textContent='선택한 달의 메모입니다.';}catch(err){$('noteMonth').value=noteMonth;$('noteStatus').textContent=err.message;}
}
// Parse arithmetic directly; never evaluate JavaScript supplied by an input.
function calculateExpression(source){
 if(typeof source!=='string'||source.length>200)throw Error('계산식은 200자 이하로 입력해 주세요.');
 const s=source.replaceAll('×','*').replaceAll('÷','/').replaceAll('−','-');let pos=0;
 const skip=()=>{while(/\s/.test(s[pos]||'')&&pos<s.length)pos++;};
 function primary(){skip();if(s[pos]==='+'||s[pos]==='-'){const sign=s[pos++];return (sign==='-'?-1:1)*primary();}if(s[pos]==='('){pos++;const value=expression();skip();if(s[pos++]!==')')throw Error('괄호를 확인해 주세요.');return value;}
 const match=s.slice(pos).match(/^(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?|^\.\d+/);if(!match)throw Error('숫자와 +, −, ×, ÷, 괄호로 입력해 주세요.');pos+=match[0].length;return Number(match[0].replaceAll(',',''));}
 function term(){let value=primary();skip();while(s[pos]==='*'||s[pos]==='/'){const op=s[pos++],right=primary();if(op==='/'&&right===0)throw Error('0으로 나눌 수 없습니다.');value=op==='*'?value*right:value/right;skip();}return value;}
 function expression(){let value=term();skip();while(s[pos]==='+'||s[pos]==='-'){const op=s[pos++],right=term();value=op==='+'?value+right:value-right;skip();}return value;}
 const value=expression();skip();if(pos!==s.length)throw Error('계산식의 숫자와 기호를 확인해 주세요.');if(!Number.isFinite(value)||Math.abs(value)>999999999999)throw Error('계산 결과는 ±999,999,999,999 이내여야 합니다.');return Number(value.toFixed(8));
}
function initNotes(){
 noteMonth=today().slice(0,7);$('noteMonth').value=noteMonth;
 $('monthNote').oninput=()=>{noteDirty=true;$('noteStatus').textContent='작성 중 · 메모 저장을 눌러 주세요.';renderNotes();};
 $('saveNote').onclick=()=>{try{saveMonthlyNote();}catch(err){$('noteStatus').textContent=err.message;}};
 $('noteMonth').onchange=e=>changeNoteMonth(e.target.value);
 $('notePrev').onclick=()=>changeNoteMonth(shiftDate(noteMonth+'-01','month',-1).slice(0,7));$('noteNext').onclick=()=>changeNoteMonth(shiftDate(noteMonth+'-01','month',1).slice(0,7));
 $('reloadNote').onclick=()=>ask('저장된 메모를 불러올까요?','아직 저장하지 않은 이 달의 입력은 사라집니다.',()=>{load();if(storageBlocked)throw Error('저장소를 확인할 수 없습니다. 입력 내용은 유지됩니다.');noteDirty=false;renderNotes();$('noteStatus').textContent='저장된 메모를 불러왔습니다.';});
 window.addEventListener('beforeunload',e=>{if(noteDirty){e.preventDefault();e.returnValue='';}});
 $('calcExpression').oninput=()=>{calculation=null;$('calcResult').textContent='';$('insertCalculation').disabled=true;};
 $('calculator').onsubmit=e=>{e.preventDefault();try{const expression=$('calcExpression').value.trim(),value=calculateExpression(expression);calculation=expression+' = '+new Intl.NumberFormat('ko-KR',{maximumFractionDigits:8}).format(value);$('calcResult').textContent=calculation;}catch(err){calculation=null;$('calcResult').textContent=err.message;}$('insertCalculation').disabled=storageBlocked||!calculation;};
 $('insertCalculation').onclick=()=>{if(!calculation||storageBlocked)return;const field=$('monthNote'),next=field.value+(field.value?'\n':'')+calculation;if(next.length>10000){$('noteStatus').textContent='메모가 10,000자를 넘어 추가할 수 없습니다.';return;}field.value=next;field.oninput();field.focus();};
}
