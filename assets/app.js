'use strict';

const $=id=>document.getElementById(id);
const state={index:null,category:null,categoryCode:'',groups:[],shown:0,pageSize:24,pendingCode:''};
const aliases={
  code:['刀號／組合編號','刀號'],name:['刀具名稱'],series:['系列'],material:['可加工材質'],operation:['加工方式'],
  diameter:['外徑 mm','刀徑 d mm','刀徑 D mm','刀體直徑 D mm'],length:['刃長 CL mm','刃長 l mm','刃長 L mm','刃長'],flutes:['刃數','刃數 z','齒數 T'],
  vcMin:['人工覆寫Vc最小','Vc 最低 m/min','Vc 最小 m/min','Vc 最小'],vcMid:['Vc 建議 m/min'],vcMax:['人工覆寫Vc最大','Vc 最高 m/min','Vc 最大 m/min','Vc 最大'],
  feedMode:['進給模式'],feedMin:['人工覆寫進給最小','進給最低','進給最小'],feedMid:['進給建議'],feedMax:['人工覆寫進給最大','進給最高','進給最大'],
  rpmMin:['RPM 最低(換算)','RPM 最小'],rpmMid:['RPM 建議'],rpmMax:['RPM 最高(換算)','RPM 最大','RPM'],fMin:['F 最小 mm/min'],fMid:['F 建議 mm/min'],fMax:['F 最大 mm/min'],
  ap:['Ap','Ap mm','切深 ap 建議 mm'],ae:['Ae','Ae mm'],pitch:['螺距 Pitch mm','牙距 Pitch mm'],coolant:['冷卻方式','冷卻孔'],status:['校正狀態','確認狀態','參數來源類型','數據狀態']
};
const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const num=v=>v===''||v===null||v===undefined?null:(Number.isFinite(Number(v))?Number(v):null);
const fmt=(v,d=3)=>Number.isFinite(v)?v.toLocaleString('zh-TW',{maximumFractionDigits:d}):'';
const normalize=v=>String(v??'').trim().toUpperCase().replace(/[\s_-]+/g,'');
const idx=(headers,names)=>{for(const n of names){const i=headers.indexOf(n);if(i>=0)return i}return-1};
const indexes=headers=>Object.fromEntries(Object.entries(aliases).map(([k,n])=>[k,idx(headers,n)]));
const get=(row,i)=>i>=0&&i<row.length?row[i]:'';
const effective=(row,headers,names)=>{for(const n of names){const i=headers.indexOf(n),v=get(row,i);if(i>=0&&v!==''&&v!==null)return v}return''};
const range=(a,b,mid=null)=>{const values=[a,mid,b].filter(v=>v!==null);if(!values.length)return '';return values.length===1?fmt(values[0]):`${fmt(values[0])}～${fmt(values.at(-1))}`};

async function loadIndex(){
  const [ir,vr]=await Promise.all([fetch('data/catalog-index.json',{cache:'no-store'}),fetch('data/version.json',{cache:'no-store'})]);
  if(!ir.ok)throw new Error('找不到目錄索引');state.index=await ir.json();const version=await vr.json();
  $('versionText').textContent=`資料 V${version.version}｜${Number(version.totalRows).toLocaleString()} 筆加工情境`;renderCategories();
}
function renderCategories(){
  $('categoryGrid').innerHTML=state.index.categories.map(x=>`<button class="category-card" data-code="${x.code}"><strong>${x.code} ${esc(x.name)}</strong><span>${x.series.length.toLocaleString()} 個系列</span><em>${Number(x.rows).toLocaleString()} 筆加工情境</em></button>`).join('');
  document.querySelectorAll('.category-card').forEach(b=>b.addEventListener('click',()=>selectCategory(b.dataset.code)));
}
async function selectCategory(code,toolCode=''){
  const meta=state.index.categories.find(x=>x.code===code);if(!meta)return;
  $('selector').hidden=false;$('backCategory').hidden=false;$('categoryGrid').hidden=true;$('categoryCode').textContent=`官方分類 ${code}`;$('categoryTitle').textContent=meta.name;$('resultSummary').textContent=`正在載入 ${meta.name}…`;
  if(state.categoryCode!==code){const response=await fetch(meta.file,{cache:'no-store'});if(!response.ok)throw new Error(`無法載入 ${meta.name}`);state.category=await response.json();state.categoryCode=code;fillFilters();}
  reset(false);$('toolQuery').value=toolCode;state.pendingCode=toolCode;search();$('selector').scrollIntoView({behavior:'smooth',block:'start'});
}
function fillFilters(){const m=indexes(state.category.headers);fillSelect('material',[...new Set(state.category.rows.map(r=>get(r,m.material)).filter(Boolean))].sort(),'全部材質');fillSelect('series',[...new Set(state.category.rows.map(r=>get(r,m.series)).filter(Boolean))].sort(),'全部系列');fillSelect('operation',[...new Set(state.category.rows.map(r=>get(r,m.operation)).filter(Boolean))].sort(),'全部方式')}
function fillSelect(id,values,first){$(id).innerHTML=`<option value="">${first}</option>`+values.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('')}

function reverseLookup(){
  const q=normalize($('reverseInput').value);if(!q){$('reverseResults').hidden=true;return}
  const found=state.index.tools.filter(x=>normalize(x[1]).includes(q)).slice(0,80);$('reverseResults').hidden=false;
  $('reverseResults').innerHTML=found.length?found.map(x=>`<button class="lookup-item" data-category="${x[0]}" data-code="${esc(x[1])}"><b>${esc(x[1])}</b><small>${x[0]} ${esc(x[2])}｜${esc(x[3])}</small></button>`).join(''):'查無相符刀號。';
  document.querySelectorAll('.lookup-item').forEach(b=>b.addEventListener('click',()=>selectCategory(b.dataset.category,b.dataset.code)));
}
function search(){
  if(!state.category)return;const m=indexes(state.category.headers),material=$('material').value,series=$('series').value,operation=$('operation').value,q=normalize($('toolQuery').value),diameter=num($('diameter').value),length=num($('cutLength').value);
  const rows=state.category.rows.filter(r=>{if(material&&get(r,m.material)!==material)return false;if(series&&get(r,m.series)!==series)return false;if(operation&&get(r,m.operation)!==operation)return false;if(q&&!normalize(get(r,m.code)).includes(q))return false;if(diameter!==null){const d=num(get(r,m.diameter));if(d!==null&&Math.abs(d-diameter)>.001)return false}if(length!==null){const l=num(get(r,m.length));if(l!==null&&l<length)return false}return true});
  const grouped=new Map();for(const row of rows){const code=String(get(row,m.code)||'未標示刀號');if(!grouped.has(code))grouped.set(code,[]);grouped.get(code).push(row)}
  state.groups=[...grouped.entries()].sort((a,b)=>a[0].localeCompare(b[0],'zh-Hant'));state.shown=0;$('results').innerHTML='';
  $('resultSummary').innerHTML=`找到 <b>${state.groups.length.toLocaleString()}</b> 個刀號，共 <b>${rows.length.toLocaleString()}</b> 筆材質 × 加工方式情境。`+(q&&state.groups.length===1?'<span class="summary-tip">已展開全部情境，請往下核對參數。</span>':'');showMore();
}
function calculated(row,m){
  const h=state.category.headers,d=num($('diameter').value)||num(get(row,m.diameter)),cap=num($('maxRpm').value),vcMin=num(effective(row,h,aliases.vcMin)),vcMid=num(effective(row,h,aliases.vcMid)),vcMax=num(effective(row,h,aliases.vcMax));let rpmMin=num(get(row,m.rpmMin)),rpmMid=num(get(row,m.rpmMid)),rpmMax=num(get(row,m.rpmMax));
  if(d){if(rpmMin===null&&vcMin!==null)rpmMin=1000*vcMin/(Math.PI*d);if(rpmMid===null&&vcMid!==null)rpmMid=1000*vcMid/(Math.PI*d);if(rpmMax===null&&vcMax!==null)rpmMax=1000*vcMax/(Math.PI*d)}if(cap){rpmMin=rpmMin===null?null:Math.min(rpmMin,cap);rpmMid=rpmMid===null?null:Math.min(rpmMid,cap);rpmMax=rpmMax===null?null:Math.min(rpmMax,cap)}
  const feedMin=num(effective(row,h,aliases.feedMin)),feedMid=num(effective(row,h,aliases.feedMid)),feedMax=num(effective(row,h,aliases.feedMax)),mode=String(get(row,m.feedMode)),z=num(get(row,m.flutes));let fMin=num(get(row,m.fMin)),fMid=num(get(row,m.fMid)),fMax=num(get(row,m.fMax));const calcF=(rpm,feed)=>rpm===null||feed===null?null:(mode.toLowerCase().includes('fz')&&z?rpm*z*feed:((mode.toLowerCase().includes('fr')||mode.toLowerCase().includes('rev'))?rpm*feed:null));if(cap){fMin=calcF(rpmMin,feedMin)??fMin;fMid=calcF(rpmMid,feedMid)??fMid;fMax=calcF(rpmMax,feedMax)??fMax}return{vcMin,vcMid,vcMax,rpmMin,rpmMid,rpmMax,feedMin,feedMid,feedMax,fMin,fMid,fMax,mode};
}
function showMore(){const m=indexes(state.category.headers),end=Math.min(state.groups.length,state.shown+state.pageSize);for(let i=state.shown;i<end;i++)$('results').insertAdjacentHTML('beforeend',renderGroup(state.groups[i],m));state.shown=end;$('loadMore').hidden=state.shown>=state.groups.length;bindDetails()}
function renderGroup([code,rows],m){
  const first=rows[0],materials=new Set(rows.map(r=>get(r,m.material)).filter(Boolean)),ops=new Set(rows.map(r=>get(r,m.operation)).filter(Boolean)),autoOpen=state.groups.length===1?' open':'';
  return `<details class="tool-group"${autoOpen}><summary><div><h3>${esc(code)}</h3><p>${esc(get(first,m.name))}</p></div><div class="group-stats"><span>${esc(get(first,m.series))}</span><b>${rows.length} 筆情境</b><small>${materials.size} 種材質 × ${ops.size} 種方式</small></div></summary><div class="scenario-wrap"><div class="scenario-note">每一列都是同一刀號在特定「材質 × 加工方式」下的對應參數，不是重複刀具。</div><div class="scenario-table"><div class="scenario-row scenario-head"><span>材質</span><span>加工方式</span><span>Vc m/min</span><span>進給</span><span>RPM</span><span>F mm/min</span><span>Ap / Ae</span></div>${rows.map(r=>renderScenario(r,m)).join('')}</div></div></details>`;
}
function renderScenario(row,m){const c=calculated(row,m),ap=get(row,m.ap),ae=get(row,m.ae),status=get(row,m.status);return `<div class="scenario-row"><span data-label="材質"><b>${esc(get(row,m.material)||'—')}</b></span><span data-label="加工方式">${esc(get(row,m.operation)||'—')}</span><span data-label="Vc">${range(c.vcMin,c.vcMax,c.vcMid)||'—'}</span><span data-label="進給">${range(c.feedMin,c.feedMax,c.feedMid)||'—'}<small>${esc(c.mode)}</small></span><span data-label="RPM">${range(c.rpmMin,c.rpmMax,c.rpmMid)||'—'}</span><span data-label="F">${range(c.fMin,c.fMax,c.fMid)||'—'}</span><span data-label="Ap / Ae">${ap!==''?`Ap ${esc(ap)}`:'—'}${ae!==''?` / Ae ${esc(ae)}`:''}${status?`<small>${esc(status)}</small>`:''}</span></div>`}
function bindDetails(){}
function reset(clear=true){['material','series','operation'].forEach(id=>$(id).value='');['diameter','cutLength','toolQuery','maxRpm'].forEach(id=>$(id).value='');$('results').innerHTML='';$('resultSummary').textContent='請設定條件，或直接按查詢瀏覽本分類。';$('loadMore').hidden=true;if(clear)state.groups=[]}

$('reverseButton').addEventListener('click',reverseLookup);$('reverseInput').addEventListener('keydown',e=>{if(e.key==='Enter')reverseLookup()});$('searchButton').addEventListener('click',search);$('resetButton').addEventListener('click',()=>reset());$('loadMore').addEventListener('click',showMore);$('backCategory').addEventListener('click',()=>{$('selector').hidden=true;$('categoryGrid').hidden=false;$('backCategory').hidden=true;window.scrollTo({top:$('categoryGrid').offsetTop-100,behavior:'smooth'})});$('backTop').addEventListener('click',()=>window.scrollTo({top:0,behavior:'smooth'}));window.addEventListener('scroll',()=>$('backTop').classList.toggle('show',scrollY>500));
loadIndex().catch(error=>{$('versionText').textContent='資料載入失敗';$('categoryGrid').innerHTML=`<p>${esc(error.message)}</p>`});
