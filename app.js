(function(){
'use strict';
const $=(s,r)=>(r||document).querySelector(s);
const $$=(s,r)=>Array.from((r||document).querySelectorAll(s));
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nf=d3.format(',.0f'), nf1=d3.format(',.1f');
const sum=a=>{let t=0;for(let i=0;i<a.length;i++)t+=a[i];return t;};
const baht=x=>{x=+x||0;return Math.abs(x)>=1e6?d3.format(',.2f')(x/1e6)+' ล้าน':nf(x);};
const bahtS=x=>{x=+x||0;return Math.abs(x)>=1e6?d3.format('.2f')(x/1e6)+'M':Math.abs(x)>=1e3?d3.format('.0f')(x/1e3)+'k':nf(x);};
const pct=(x,d)=>(x*100).toFixed(d==null?1:d)+'%';
const trunc=(t,n)=>t.length>n?t.slice(0,n-1)+'…':t;
const KEYS=['oq','ov','rq','rv','dq','dv','bq','bv'];
const S={tab:'overview',m:'v',unit:'',pc:'ALL',mode:'dis',view:'ALL',from:1,to:12,fy:null,q:'',active:true,sort:{k:'bv',d:-1},limit:80,detail:null};
let OFF=0,ABCF='A';
let ALLM=[],FYS=[],MON=[],AV=12,D=[],CATS=[],SYMS=[],PC=[],catBy={},symBy={},pcBy={},byId={},UNITS=[],ready=false,SIG='';
let anim='tab',animNow=null,animT=null;
const PREVK={};
const reduced=()=>!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
const colors=()=>dash.colors||[];
const col=i=>colors()[i%Math.max(1,colors().length)]||'var(--color-fg)';
const FLOW=[{k:'o',n:'ยกมา',c:7},{k:'r',n:'รับ',c:0},{k:'d',n:'จ่าย',c:1},{k:'b',n:'คงเหลือ',c:2}];
const fcol=k=>k==='o'?'var(--cds-chart-muted)':k==='r'?col(0):k==='d'?col(1):col(2);
const GR=()=>S.mode==='sym'?SYMS:CATS;
const gk=x=>S.mode==='sym'?x.sym:x.cat;
const gdef=x=>(S.mode==='sym'?symBy:catBy)[gk(x)];
const gshort=x=>{const g=gdef(x);return g?g.short:'';};
const unitTxt=()=>S.m==='q'?(S.unit||'หน่วย'):'บาท';
const fmtM=(x,m)=>(m||S.m)==='v'?baht(x):nf(x);

/* ---------- data ---------- */
function arr(a){if(typeof a==='string'){try{a=JSON.parse(a);}catch(e){a=[];}}return (a||[]).map(Number);}
function prep(){
  const ds=['items','cats','months','syms','pcats'].map(id=>dash.data(id));
  const msg=$('#hp-msg');
  if(ds.some(x=>['error','missing','declined','connect'].indexOf(x.status)>=0)){msg.hidden=false;msg.textContent='โหลดข้อมูลไม่สำเร็จ ลองรีเฟรชหน้าอีกครั้ง หรือแจ้งผู้ดูแลระบบ';return false;}
  if(ds.some(x=>x.status!=='ok')){msg.hidden=false;msg.innerHTML='<div class="hp-skel"></div><div class="hp-skel"></div><div class="hp-skel"></div>';return false;}
  msg.hidden=true;msg.textContent='';
  const d=ds[0],c=ds[1],m=ds[2],sy=ds[3],pc=ds[4];
  const sig=d.data.length+':'+m.data.filter(x=>+x.has===1||x.has===true).length+':'+m.data.length;
  if(ready&&sig===SIG)return true;
  SIG=sig;
  CATS=c.data.slice().sort((a,b)=>a.order-b.order);catBy={};CATS.forEach(x=>catBy[x.code]=x);
  SYMS=sy.data.slice().sort((a,b)=>a.order-b.order);symBy={};SYMS.forEach(x=>symBy[x.code]=x);
  PC=pc.data.slice().sort((a,b)=>a.order-b.order);pcBy={};PC.forEach(x=>pcBy[x.code]=x);
  ALLM=m.data.map(x=>Object.assign({},x,{has:x.has===true||x.has==='true'||+x.has===1,days:new Date(+String(x.ym).slice(0,4),+String(x.ym).slice(5,7),0).getDate()})).sort((a,b)=>a.m-b.m);
  FYS=Array.from(new Set(ALLM.map(x=>x.fy))).sort((a,b)=>a-b);
  D=d.data.map(r=>{const o=Object.assign({},r);o.id=+r.id;o.A={};KEYS.forEach(k=>{o.A[k]=arr(r[k]);});
    o.key=(r.label+' '+r.code+' '+r.strength).toLowerCase();o.gtxt=((catBy[r.cat]?catBy[r.cat].name:'')+' '+(symBy[r.sym]?symBy[r.sym].name:'')+' '+(pcBy[r.pcat]?pcBy[r.pcat].name:'')).toLowerCase();return o;});
  const cu={};D.forEach(x=>{cu[x.unit]=(cu[x.unit]||0)+1;});
  UNITS=Object.keys(cu).sort((a,b)=>cu[b]-cu[a]);
  if(!S.unit||UNITS.indexOf(S.unit)<0)S.unit=UNITS[0]||'';
  const hs=ALLM.filter(x=>x.has).map(x=>x.fy);
  if(!S.fy||FYS.indexOf(S.fy)<0)S.fy=hs.length?Math.max.apply(null,hs):FYS[FYS.length-1];
  applyFY(true);
  byId={};D.forEach(x=>byId[x.id]=x);
  ready=true;buildStatic();buildChips();
  return true;
}
function applyFY(reset){
  const fm=ALLM.filter(x=>x.fy===S.fy).sort((a,b)=>a.fm-b.fm);
  MON=fm;AV=0;while(AV<fm.length&&fm[AV].has)AV++;if(AV<1)AV=fm.length;
  const off=ALLM.indexOf(fm[0]);OFF=off;
  D.forEach(o=>{KEYS.forEach(k=>{o[k]=o.A[k].slice(off,off+fm.length);});});
  if(reset||S.to>AV||S.from>AV){S.from=1;S.to=AV;}
}
function setFY(fy){S.fy=fy;applyFY(true);}
const mlab=i=>MON[i]?MON[i].label:String(i+1);
const rangeLabel=()=>S.from===S.to?mlab(S.from-1):mlab(S.from-1)+' – '+mlab(S.to-1);
const days=()=>{let t=0;for(let i=S.from-1;i<S.to;i++)t+=MON[i].days;return t||30;};

/* ---------- aggregation ---------- */
function rateWin(){
  const g=OFF+S.to-1;let s=g,k=0;
  for(let i=g;i>=Math.max(0,g-2);i--){if(!ALLM[i]||!ALLM[i].has)break;s=i;k++;}
  return {s:s,e:g,k:Math.max(k,1)};
}
const rateNote=()=>{const k=rateWin().k;return 'อัตราจ่ายเฉลี่ย '+k+' เดือนล่าสุด'+(k<3?' (ยังไม่ครบ 3 เดือน ค่าอาจแกว่ง)':'');};
function agg(rows,m){
  m=m||S.m;const a=S.from-1,b=S.to-1;let o=0,r=0,d=0,bal=0;
  const w=rateWin();let dk=0,dayk=0;
  rows.forEach(x=>{const O=x['o'+m],R=x['r'+m],Dd=x['d'+m],B=x['b'+m],DA=x.A['d'+m];o+=O[a];for(let i=a;i<=b;i++){r+=R[i];d+=Dd[i];}bal+=B[b];for(let i=w.s;i<=w.e;i++)dk+=DA[i];});
  for(let i=w.s;i<=w.e;i++)dayk+=ALLM[i].days;
  return {o:o,r:r,d:d,b:bal,dk:dk,dayk:dayk||30,k:w.k};
}
function mser(rows,m){
  m=m||S.m;const out=[];
  for(let i=0;i<AV;i++){let o=0,r=0,d=0,b=0;rows.forEach(x=>{o+=x['o'+m][i];r+=x['r'+m][i];d+=x['d'+m][i];b+=x['b'+m][i];});out.push({o:o,r:r,d:d,b:b});}
  return out;
}
const dos=a=>a.dk>0?a.b/(a.dk/a.dayk):(a.b>0?Infinity:null);
const turn=a=>{const av=(a.o+a.b)/2;return av>0?a.d/av*365/days():null;};
const fdosH=v=>{const t=fdos(v);if(v==null||!isFinite(v))return t;const p=Math.min(1,v/240)*100;return '<span class="hp-dosw">'+t+'<span class="hp-dosb" title="แถบเทียบ: แดง < 30 วัน · เขียว 30–180 วัน · เหลือง > 180 วัน"><i style="left:'+p.toFixed(1)+'%"></i></span></span>';};
const fdos=v=>v==null?'—':!isFinite(v)?'ไม่มีการจ่าย':v>=1000?'> 999 วัน':nf(v)+' วัน';
function filt(o){
  return D.filter(x=>(!o.pc||S.pc==='ALL'||x.pcat===S.pc)&&(!o.view||S.view==='ALL'||gk(x)===S.view)&&(!o.unit||S.m!=='q'||!S.unit||x.unit===S.unit));
}
const scope=()=>filt({pc:1,view:1,unit:1});
function stat(x){
  const a=agg([x],'q'),ds=dos(a);
  if(a.b<=0&&a.d>0)return {k:'out',t:'หมดสต็อก',c:'b-bad',dos:ds};
  if(a.d>0&&ds<30)return {k:'low',t:'ใกล้หมด',c:'b-warn',dos:ds};
  if(a.d>0&&ds>180)return {k:'over',t:'ล้นสต็อก',c:'b-warn',dos:ds};
  if(a.d>0)return {k:'ok',t:'พอใช้',c:'b-ok',dos:ds};
  if(a.b>0)return {k:'idle',t:'ไม่เคลื่อนไหว',c:'b-mut',dos:ds};
  return {k:'none',t:'ไม่มีสต็อก',c:'b-mut',dos:null};
}
const hasAny=x=>{for(let i=0;i<AV;i++){if(x.oq[i]||x.rq[i]||x.dq[i]||x.bq[i]||x.ov[i]||x.rv[i]||x.dv[i]||x.bv[i])return true;}return false;};

/* ---------- ui helpers ---------- */
function cnt(key,val,fmt){return '<span class="cnt" data-key="'+key+'" data-fmt="'+fmt+'" data-to="'+val+'">'+(fmt==='b'?baht(val):nf(val))+'</span>';}
function tween(el,from,to,fmt,dur){
  const id=(el._tw=(el._tw||0)+1);const t0=performance.now();
  if(from===to)return;
  const step=t=>{if(el._tw!==id||!el.isConnected)return;const k=Math.min(1,(t-t0)/dur),e=1-Math.pow(1-k,3);el.textContent=fmt(from+(to-from)*e);if(k<1)requestAnimationFrame(step);else el.textContent=fmt(to);};
  requestAnimationFrame(step);
}
function countUps(){
  $$('#hp .cnt').forEach(el=>{
    const to=+el.dataset.to,key=el.dataset.key,fmt=el.dataset.fmt==='b'?baht:nf;
    let from=PREVK[key];PREVK[key]=to;
    if(!animNow||reduced())return;
    if(animNow==='tab'||from==null)from=0;
    tween(el,from,to,fmt,animNow==='tab'?600:400);
  });
}
function headline(host,tone,html){host.className='hp-headline '+tone;host.innerHTML='<i></i><div>'+html+'</div>';}
function kpi(l,n,s,sp){return '<div class="hp-kpi">'+(sp?'<span class="sp">'+sp+'</span>':'')+'<span class="l">'+l+'</span><span class="n">'+n+'</span><span class="s">'+s+'</span></div>';}
function hbars(host,list,max){
  max=max||d3.max(list,d=>d.val)||1;
  host.innerHTML=list.length?list.map((d,i)=>'<button class="hp-hb" '+d.attr+' data-tip="'+esc(d.tip||'')+'"><span class="hp-hb-l">'+esc(d.label)+'</span><span class="hp-hb-t"><i style="--i:'+i+';width:'+Math.max(1,d.val/max*100).toFixed(1)+'%;background:linear-gradient(90deg,'+(d.color||col(0))+',color-mix(in srgb,'+(d.color||col(0))+' 65%,transparent))"></i></span><span class="hp-hb-v">'+esc(d.vtxt)+'</span></button>').join(''):'<div class="hp-empty">ไม่มีข้อมูลในตัวกรองที่เลือก</div>';
}
function flowStrip(a,m){
  return '<div class="hp-flow">'+FLOW.map(f=>'<span style="--c:'+fcol(f.k)+'">'+f.n+'<b>'+fmtM(a[f.k],m)+'</b></span>').join('')+'</div>';
}

/* ---------- static controls ---------- */
function buildStatic(){
  const f=$('#hp-fy');
  if(f)f.innerHTML=FYS.slice().reverse().map(y=>'<button data-act="fy" data-y="'+y+'" aria-pressed="false">'+y+'</button>').join('');
  rebuildRange();
  $('#hp-unit').innerHTML=UNITS.map(u=>'<option value="'+esc(u)+'">'+esc(u)+'</option>').join('');
}
function rebuildRange(){
  const opt=(i)=>'<option value="'+(i+1)+'"'+(i>=AV?' disabled':'')+'>'+esc(MON[i].full+' '+MON[i].year)+(i>=AV?' (ยังไม่มีข้อมูล)':'')+'</option>';
  $('#hp-from').innerHTML=MON.map((_,i)=>opt(i)).join('');
  $('#hp-to').innerHTML=MON.map((_,i)=>opt(i)).join('');
  const f=MON[0],l=MON[AV-1];
  $('#hp-sub').textContent='ปีงบประมาณ '+S.fy+' · '+f.full+' '+f.year+' – '+l.full+' '+l.year+(AV<MON.length?' (มีข้อมูลถึงเดือนล่าสุด)':'')+' · '+nf(D.length)+' รายการในรายงาน · แหล่งข้อมูล: รายงานสรุปยอดคงเหลือเวชภัณฑ์ (ยกมา/รับ/จ่าย/คงเหลือ) รายเดือน';
  const yr=FYS.length>1?FYS[0]+'–'+FYS[FYS.length-1]:String(FYS[0]);
  ['#hp-fy-t','#hp-fy-e'].forEach(q=>{const e=$(q);if(e)e.textContent=yr;});
  const hl=ALLM.filter(x=>x.has).pop(),ft=$('#ft-last');if(ft&&hl)ft.textContent='(ข้อมูลล่าสุด: '+hl.full+' '+hl.year+')';
}
function buildChips(){
  const cnt={};D.forEach(x=>{cnt[x.pcat]=(cnt[x.pcat]||0)+1;});
  $('#hp-chips-p').innerHTML='<button class="hp-chip" data-act="pc" data-k="ALL" aria-pressed="false">ทุกหมวด ('+nf(D.length)+')</button>'+PC.map(p=>'<button class="hp-chip" data-act="pc" data-k="'+esc(p.code)+'" title="'+esc(p.name)+'" aria-pressed="false">'+esc(p.short)+' ('+nf(cnt[p.code]||0)+')</button>').join('');
  const used={};D.forEach(x=>{used[gk(x)]=1;});
  const gl=GR().filter(g=>used[g.code]&&g.code.indexOf('sup_')!==0),gs2=GR().filter(g=>used[g.code]&&g.code.indexOf('sup_')===0);
  $('#hp-chips-s').innerHTML=gs2.map(g=>'<button class="hp-chip" data-act="view" data-k="'+esc(g.code)+'" title="'+esc(g.name)+'" aria-pressed="false">'+esc(g.short)+'</button>').join('');
  $('#hp-chips-a').innerHTML='<button class="hp-chip" data-act="view" data-k="ALL" aria-pressed="false">ทุกกลุ่ม</button>'+gl.map(g=>'<button class="hp-chip" data-act="view" data-k="'+esc(g.code)+'" title="'+esc(g.name)+'" aria-pressed="false">'+esc(g.short)+'</button>').join('');
  $('#hp-la').textContent=S.mode==='sym'?'ยาตามอาการ / ข้อบ่งใช้':'กลุ่มโรค / คลินิก (ยา)';
}
function setMode(m){S.mode=m;S.view='ALL';S.limit=80;buildChips();}
function viewName(){if(S.view==='ALL')return 'ทุกกลุ่ม';const g=(S.mode==='sym'?symBy:catBy)[S.view];return g?g.short:S.view;}
function scopeName(){return (S.pc==='ALL'?'ทุกหมวด':pcBy[S.pc].short)+' · '+viewName();}
function syncControls(){
  $('#hp-from').value=S.from;$('#hp-to').value=S.to;
  $$('#hp-fy button').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.y===S.fy)));
  $$('#hp-quick button').forEach(b=>{const a=+b.dataset.a,e=Math.min(+b.dataset.b,AV);b.hidden=a>AV;b.setAttribute('aria-pressed',String(a===S.from&&e===S.to));});
  $$('#hp-metric button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.m===S.m)));
  $('#hp-unitg').hidden=S.m!=='q';$('#hp-unit').value=S.unit;
  $$('#hp-mode button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.m===S.mode)));
  $$('#hp-chips-p .hp-chip').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.k===S.pc)));
  $$('#hp-chips-a .hp-chip,#hp-chips-s .hp-chip').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.k===S.view)));
  $$('#hp-tabs button').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.t===S.tab)));
  $('#hp-act').setAttribute('aria-pressed',String(S.active));
  const rows=scope(),a=agg(rows);
  $('#hp-ctx').innerHTML='กำลังดู: <b>'+esc(scopeName())+'</b> · <b>'+esc(rangeLabel())+'</b> · '+(S.m==='q'?'ปริมาณหน่วย <b>'+esc(S.unit)+'</b>':'มูลค่า')+' · คงเหลือ <b>'+fmtM(a.b)+' '+unitTxt()+'</b> · '+cntTxt(rows)+(S.m==='q'?' <span class="hp-unitnote">(ปริมาณรวมได้เฉพาะรายการที่หน่วยนับเดียวกัน)</span>':'');
  ['overview','cats','groups','abc','items','alerts'].forEach(t=>{$('#hp-'+t).hidden=S.tab!==t;});
  heroRender(rows,a);
}
function heroRender(rows,a){
  const w=Math.min(420,Math.max(220,($('#hp-hero-n').clientWidth||320)));
  $('#hp-hero-n').innerHTML='<span class="l">'+esc(scopeName())+' · '+esc(rangeLabel())+' · คงเหลือ'+(S.m==='q'?' ('+esc(S.unit)+')':'')+'</span><span class="n">'+cnt('hero',a.b,S.m==='v'?'b':'n')+'<small>'+unitTxt()+'</small></span>'+flowStrip(a);
}

/* ---------- charts ---------- */
function flowChart(host,a,m){
  const W=Math.max(300,host.clientWidth||520),RH=40,H=4*RH+16;
  const top=Math.max(a.o+a.r,a.o,a.b,1);
  const lw=W<520?70:90,rm=W<520?78:110;
  const x=d3.scaleLinear([0,top*1.02],[lw,W-rm]);
  const steps=[{k:'o',a:0,b:a.o,v:a.o,l:'ยกมา'},{k:'r',a:a.o,b:a.o+a.r,v:a.r,l:'+ รับ'},{k:'d',a:a.o+a.r-a.d,b:a.o+a.r,v:a.d,l:'− จ่าย'},{k:'b',a:0,b:a.b,v:a.b,l:'= คงเหลือ'}];
  let s='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="การไหลของสต็อก">';
  steps.forEach((st,i)=>{
    const y=i*RH+6,bh=RH-14,x0=x(st.a),x1=x(st.b);
    s+='<g data-tip="'+esc(st.l+'\n'+fmtM(st.v,m)+' '+(m==='q'?(S.unit||''):'บาท'))+'"><rect x="0" y="'+y+'" width="'+W+'" height="'+bh+'" fill="transparent"/>'+
      '<text class="hp-ax" x="'+(lw-8)+'" y="'+(y+bh/2+4)+'" text-anchor="end" style="fill:var(--color-fg);font-weight:600">'+st.l+'</text>'+
      '<rect class="hp-bar" style="--i:'+i+';fill:'+fcol(st.k)+'" x="'+x0.toFixed(1)+'" y="'+y+'" width="'+Math.max(2,x1-x0).toFixed(1)+'" height="'+bh+'" rx="4"/>'+
      '<text class="hp-ax" x="'+(Math.max(x0,x1)+6).toFixed(1)+'" y="'+(y+bh/2+4)+'" style="fill:var(--color-fg);font-weight:600">'+fmtM(st.v,m)+'</text></g>';
    if(i===1||i===2){const nx=x(i===1?a.o+a.r:a.o+a.r-a.d);s+='<line x1="'+nx.toFixed(1)+'" x2="'+nx.toFixed(1)+'" y1="'+(y+bh)+'" y2="'+(y+RH)+'" style="stroke:var(--cds-chart-axis)" stroke-dasharray="2 3"/>';}
  });
  const dl=a.b-a.o,pc2=a.o>0?Math.abs(dl)/a.o:null,un=m==='q'?' '+(S.unit||''):' บาท';
  const sum2=a.o+a.r+a.d+a.b===0?'ไม่มีความเคลื่อนไหวในช่วงนี้':'ช่วงนี้ <b style="color:'+fcol('r')+'">รับ '+fmtM(a.r,m)+'</b> · <b style="color:'+fcol('d')+'">จ่าย '+fmtM(a.d,m)+'</b>'+un+' → '+(a.r>a.d?'รับมากกว่าจ่าย ':a.r<a.d?'จ่ายมากกว่ารับ ':'รับเท่ากับจ่าย ')+'คงเหลือ<b>'+(dl>0?'เพิ่มขึ้น ▲ ':dl<0?'ลดลง ▼ ':'เท่าเดิม ')+(dl?fmtM(Math.abs(dl),m)+un:'')+(pc2!=null&&dl?' ('+pct(pc2,0)+' ของยอดยกมา)':'')+'</b>';
  host.innerHTML='<p class="hp-sum2">'+sum2+'</p>'+s+'</svg>';
}
function trendChart(host,ser,m){
  const n=ser.length,W=Math.max(300,host.clientWidth||600),H=270;
  const mx=d3.max(ser,d=>Math.max(d.r,d.d,d.b))||1;
  const y=d3.scaleLinear([0,mx*1.18],[H-28,14]).nice(),ticks=y.ticks(5);
  const lm=Math.max.apply(null,ticks.map(t=>nf(t).length))*6.6+14;
  const span=W-8-lm,used=Math.min(span,n*150),st=lm+(span-used)/2;
  const x=d3.scaleBand(d3.range(n),[st,st+used]).padding(.28);
  const ib=d3.scaleBand(['r','d'],[0,x.bandwidth()]).padding(.12);
  let s='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="ยอดรับ จ่าย คงเหลือรายเดือน">';
  ticks.forEach(t=>{s+='<line x1="'+lm+'" x2="'+(W-8)+'" y1="'+y(t)+'" y2="'+y(t)+'" style="stroke:var(--cds-chart-grid)"/><text class="hp-ax" x="'+(lm-6)+'" y="'+(y(t)+4)+'" text-anchor="end">'+(m==='v'?bahtS(t):nf(t))+'</text>';});
  ser.forEach((d,i)=>{
    const inr=i+1>=S.from&&i+1<=S.to;
    ['r','d'].forEach((k,j)=>{
      const bx=x(i)+ib(k),bh=Math.max(0,y(0)-y(d[k]));
      s+='<rect class="hp-bar" data-i="'+i+'" style="--i:'+(i*2+j)+';fill:'+fcol(k)+';opacity:'+(inr?1:.3)+'" x="'+bx.toFixed(1)+'" y="'+y(d[k]).toFixed(1)+'" width="'+ib.bandwidth().toFixed(1)+'" height="'+bh.toFixed(1)+'" rx="4"/>';
      if(d[k]>0&&n<=3)s+='<text class="hp-ax" x="'+(bx+ib.bandwidth()/2).toFixed(1)+'" y="'+(y(d[k])-5).toFixed(1)+'" text-anchor="middle">'+(m==='v'?bahtS(d[k]):nf(d[k]))+'</text>';
    });
    s+='<text class="hp-ax" x="'+(x(i)+x.bandwidth()/2).toFixed(1)+'" y="'+(H-8)+'" text-anchor="middle">'+esc(MON[i].short)+'</text>';
  });
  const pts=ser.map((d,i)=>[x(i)+x.bandwidth()/2,y(d.b)]);
  if(n>1)s+='<path class="hp-line" pathLength="1" d="'+d3.line()(pts)+'" fill="none" style="stroke:'+fcol('b')+'" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>';
  const mxI=ser.reduce((m2,d,i)=>d.b>ser[m2].b?i:m2,0);
  pts.forEach((p,i)=>{const lab=n<=4||i===0||i===n-1||i===mxI;s+='<circle class="hp-dot" style="--i:'+i+';fill:'+fcol('b')+'" cx="'+p[0].toFixed(1)+'" cy="'+p[1].toFixed(1)+'" r="4"/>'+(lab?'<text class="hp-ax" x="'+p[0].toFixed(1)+'" y="'+(p[1]-9).toFixed(1)+'" text-anchor="middle" style="fill:var(--color-fg);font-weight:600">'+(m==='v'?bahtS(ser[i].b):nf(ser[i].b))+'</text>':'');});
  const step=x.step();
  ser.forEach((d,i)=>{
    const tip=[MON[i].full+' '+MON[i].year,'ยกมา: '+fmtM(d.o,m),'รับ: '+fmtM(d.r,m),'จ่าย: '+fmtM(d.d,m),'คงเหลือ: '+fmtM(d.b,m)].join('\n');
    s+='<rect x="'+(x(i)-(step-x.bandwidth())/2).toFixed(1)+'" y="0" width="'+step.toFixed(1)+'" height="'+(H-20)+'" fill="transparent" data-tip="'+esc(tip)+'"/>';
  });
  host.innerHTML=s+'</svg>';
}

/* ---------- tables ---------- */
function flowCells(a,m,withDos){
  return '<td>'+fmtM(a.o,m)+'</td><td>'+fmtM(a.r,m)+'</td><td>'+fmtM(a.d,m)+'</td><td><b>'+fmtM(a.b,m)+'</b></td>';
}
function pcTable(host){
  const rows=filt({view:1,unit:1});
  let h='<table><thead><tr><th>หมวดสินค้า</th><th>รายการ (เคลื่อนไหว / ทั้งหมด)</th><th></th><th>ยกมา</th><th>รับ</th><th>จ่าย</th><th>คงเหลือ</th><th>สัดส่วนคงเหลือ</th><th>วันที่พอใช้</th></tr></thead><tbody>';
  const tot=agg(rows);
  PC.forEach(p=>{
    const rs=rows.filter(x=>x.pcat===p.code),a=agg(rs);
    h+='<tr data-act="pc" data-k="'+esc(p.code)+'"'+(S.pc===p.code?' class="sel"':'')+'><td title="'+esc(p.name)+'">'+esc(p.name)+'</td><td>'+nf(nAct(rs))+' <small class="hp-mut">/ '+nf(rs.length)+'</small></td><td class="u">'+unitTxt()+'</td>'+flowCells(a)+'<td>'+(tot.b?pct(a.b/tot.b,1):'—')+'</td><td>'+fdosH(dos(a))+'</td></tr>';
  });
  h+='<tr class="tot"><td>รวม</td><td>'+nf(nAct(rows))+' <small class="hp-mut">/ '+nf(rows.length)+'</small></td><td class="u">'+unitTxt()+'</td>'+flowCells(tot)+'<td>100%</td><td>'+fdosH(dos(tot))+'</td></tr></tbody></table>';
  host.innerHTML=h;
}

/* ---------- overview ---------- */
function renderOverview(){
  const rows=scope(),a=agg(rows),m=S.m,ser=mser(rows),dd=dos(a),tn=turn(a);
  const act=rows.filter(x=>agg([x],'q').d>0);
  const idleV=sum(rows.filter(x=>stat(x).k==='idle').map(x=>agg([x],'v').b));
  const out=rows.filter(x=>stat(x).k==='out').length,low=rows.filter(x=>stat(x).k==='low').length;
  const diff=a.o+a.r-a.d-a.b;
  headline($('#ov-head'),out>0?'bad':'info','<span class="hp-hl-t">'+esc(scopeName())+' · '+esc(rangeLabel())+'</span> ยกมา <b>'+fmtM(a.o)+'</b> + รับ <b>'+fmtM(a.r)+'</b> − จ่าย <b>'+fmtM(a.d)+'</b> = คงเหลือ <b>'+fmtM(a.b)+'</b> '+unitTxt()+(dd!=null?' · สต็อกพอใช้ประมาณ <b>'+fdos(dd)+'</b> ตาม'+rateNote():'')+(out?' · <b class="up-bad">หมดสต็อกแต่ยังมีการจ่าย '+out+' รายการ</b>':'')+(Math.abs(diff)>0.5?' · <b class="up-bad">ตรวจสมการไม่ลงตัว '+nf(diff)+'</b>':''));
  $('#ov-kpis').innerHTML=FLOW.map(f=>kpi(f.n+(f.k==='o'?' (ต้นช่วง)':f.k==='b'?' (ปลายช่วง)':' (รวมในช่วง)'),cnt('k'+f.k,a[f.k],m==='v'?'b':'n')+' <small>'+unitTxt()+'</small>',f.k==='o'?'ยอดยกมาเดือน '+esc(mlab(S.from-1)):f.k==='b'?'ยอดสิ้นเดือน '+esc(mlab(S.to-1)):nf(rows.filter(x=>{const q=agg([x],m);return q[f.k]>0;}).length)+' รายการที่มี'+f.n)).join('');
  $('#ov-kpis2').innerHTML=
    kpi('วันที่สต็อกพอใช้',dd==null?'—':!isFinite(dd)?'—':cnt('dos',Math.round(dd),'n')+' <small>วัน</small>','คงเหลือ ÷ อัตราจ่ายต่อวัน · '+rateNote())+
    kpi('อัตราหมุนเวียน',tn==null?'—':nf1(tn)+' <small>ครั้ง/ปี</small>','จ่าย ÷ สต็อกเฉลี่ย ปรับเป็นต่อปี')+
    kpi('หมดสต็อก / ใกล้หมด',nf(out)+' <small>/ '+nf(low)+' รายการ</small>','หมดสต็อกแต่ยังจ่าย / พอใช้ไม่ถึง 30 วัน')+
    kpi('ไม่เคลื่อนไหวแต่มีของ',baht(idleV)+' <small>บาท</small>','มูลค่าคงเหลือของรายการที่ไม่มีการจ่ายในช่วง');
  $('#ov-wf-h').textContent='ยกมา + รับ − จ่าย = คงเหลือ ('+(m==='v'?'มูลค่า':'ปริมาณ '+S.unit)+')';
  $('#ov-wf-n').textContent='ความยาวแท่งเทียบกันในหน่วยเดียวกัน · '+rangeLabel();
  flowChart($('#ov-wf'),a,m);
  $('#ov-trend-h').textContent='รับ จ่าย และคงเหลือรายเดือน';
  $('#ov-trend-n').textContent=AV<2?'มีข้อมูล 1 เดือน ('+mlab(0)+') เส้นแนวโน้มจะแสดงเมื่อเพิ่มข้อมูลเดือนถัดไป · แท่ง = รับ/จ่ายในเดือน เส้น = คงเหลือสิ้นเดือน':'แท่ง = รับ/จ่ายในเดือน เส้น = คงเหลือสิ้นเดือน · แท่งจาง = เดือนนอกช่วงที่เลือก';
  trendChart($('#ov-trend'),ser,m);
  $('#ov-trend-lg').innerHTML='<span style="--c:'+fcol('r')+'">รับ</span><span style="--c:'+fcol('d')+'">จ่าย</span><span class="ln" style="--c:'+fcol('b')+'">คงเหลือสิ้นเดือน</span>';
  $('#ov-pc-n').textContent='ตามตัวกรองกลุ่มโรค'+(S.m==='q'?' และหน่วยนับ '+S.unit:'')+'ที่เลือก · กดแถวเพื่อกรองเฉพาะหมวดนั้น';
  pcTable($('#ov-pc'));
  // groups
  const base=filt({pc:1,unit:1});
  const gs=GR().map(g=>{const rs=base.filter(x=>gk(x)===g.code);return {g:g,a:agg(rs),n:rs.length};}).filter(o=>o.n>0&&(o.a.b>0||o.a.d>0)).sort((p,q)=>q.a.b-p.a.b);
  $('#ov-grp-h').textContent='คงเหลือตามกลุ่ม'+(S.mode==='sym'?'อาการ':'โรค');
  $('#ov-grp-n').textContent='แท่ง = คงเหลือ · ตัวเลขท้ายแถว = คงเหลือ / จ่ายในช่วง · กดเพื่อเลือกกลุ่ม';
  hbars($('#ov-grp'),gs.slice(0,12).map(o=>({label:o.g.short,val:o.a.b,vtxt:fmtM(o.a.b)+' / '+fmtM(o.a.d),color:col(0),attr:'data-act="view" data-k="'+esc(o.g.code)+'"',tip:o.g.name+'\nคงเหลือ '+fmtM(o.a.b)+' '+unitTxt()+'\nจ่าย '+fmtM(o.a.d)+'\nรับ '+fmtM(o.a.r)})));
  const top=rows.map(x=>({x:x,a:agg([x])})).filter(o=>o.a.b>0).sort((p,q)=>q.a.b-p.a.b).slice(0,10);
  $('#ov-top-h').textContent='10 รายการที่คงเหลือสูงสุด ('+(m==='v'?'มูลค่า':'ปริมาณ '+S.unit)+')';
  hbars($('#ov-top'),top.map(o=>({label:o.x.label,val:o.a.b,vtxt:fmtM(o.a.b)+' · จ่าย '+fmtM(o.a.d),color:col(1),attr:'data-act="detail" data-id="'+o.x.id+'"',tip:o.x.label+'\nคงเหลือ '+fmtM(o.a.b)+' '+unitTxt()+'\nจ่าย '+fmtM(o.a.d)+'\nวันที่พอใช้ '+fdos(dos(o.a))})));
}

/* ---------- cats ---------- */
function renderCats(){
  const rows=filt({view:1}),m=S.m;
  const tv=agg(rows,'v');
  headline($('#ct-head'),'info','<span class="hp-hl-t">แยกตามหมวดสินค้า · '+esc(rangeLabel())+'</span> มูลค่าคงเหลือรวม <b>'+baht(tv.b)+' บาท</b> จ่ายในช่วง <b>'+baht(tv.d)+' บาท</b> รับ <b>'+baht(tv.r)+' บาท</b> · กลุ่ม: '+esc(viewName()));
  $('#ct-cards').innerHTML=PC.map((p,i)=>{
    const rs=rows.filter(x=>x.pcat===p.code),a=agg(rs,'v');
    const uq={};rs.forEach(x=>{const q=agg([x],'q');const u=uq[x.unit]=uq[x.unit]||{o:0,r:0,d:0,b:0};u.o+=q.o;u.r+=q.r;u.d+=q.d;u.b+=q.b;});
    const us=Object.keys(uq).filter(u=>uq[u].b>0||uq[u].d>0||uq[u].r>0).sort((x,y)=>uq[y].b-uq[x].b).slice(0,3);
    const empty=rs.length===0;
    return '<button class="hp-gc" style="--i:'+i+';border-top:3px solid '+col(i)+'" data-act="pc" data-k="'+esc(p.code)+'" data-tip="'+esc(p.name+'\nกดเพื่อกรองเฉพาะหมวดนี้')+'"><span class="t">'+esc(p.name)+'</span>'+
      (empty?'<span class="hp-mut">ไม่มีรายการในรายงานช่วงนี้</span>':'<span class="v">'+baht(a.b)+' <small class="hp-mut">บาท คงเหลือ</small></span><span class="fl"><span>ยกมา</span><span>'+baht(a.o)+'</span><span>รับ</span><span>'+baht(a.r)+'</span><span>จ่าย</span><span>'+baht(a.d)+'</span></span><span class="tp">'+nf(nAct(rs))+' จาก '+nf(rs.length)+' รายการที่เคลื่อนไหว'+(us.length?' · คงเหลือ: '+us.map(u=>esc(u)+' '+nf(uq[u].b)).join(' · '):'')+'</span>')+'</button>';}).join('');
  $('#ct-n').textContent='ปริมาณแสดงแยกตามหน่วยนับ (รวมข้ามหน่วยไม่ได้) · มูลค่าเป็นบาท · แสดงหน่วยนับที่มีความเคลื่อนไหวหรือมียอดคงเหลือ · กลุ่ม: '+viewName()+' · '+rangeLabel();
  let h='<table><thead><tr><th>หมวดสินค้า</th><th>หน่วยนับ</th><th>รายการทั้งหมด</th><th>ยกมา</th><th>รับ</th><th>จ่าย</th><th>คงเหลือ</th><th>ยกมา (บาท)</th><th>รับ (บาท)</th><th>จ่าย (บาท)</th><th>คงเหลือ (บาท)</th></tr></thead><tbody>';
  PC.forEach(p=>{
    const rs=rows.filter(x=>x.pcat===p.code);
    if(!rs.length){h+='<tr><td>'+esc(p.name)+'</td><td colspan="10" class="hp-mut">ไม่มีรายการในรายงานช่วงนี้</td></tr>';return;}
    const byU={};rs.forEach(x=>{(byU[x.unit]=byU[x.unit]||[]).push(x);});
    const us=Object.keys(byU).map(u=>({u:u,q:agg(byU[u],'q'),v:agg(byU[u],'v'),n:byU[u].length})).filter(o=>o.q.o||o.q.r||o.q.d||o.q.b||o.v.o||o.v.r||o.v.d||o.v.b).sort((x,y)=>y.v.b-x.v.b);
    const sv=agg(rs,'v');
    h+='<tr class="sub"><td>'+esc(p.name)+'</td><td class="u">รวมทุกหน่วย</td><td>'+nf(rs.length)+'</td><td colspan="4" class="hp-mut" style="text-align:left">ปริมาณรวมข้ามหน่วยไม่ได้ ดูรายหน่วยด้านล่าง</td><td>'+nf(sv.o)+'</td><td>'+nf(sv.r)+'</td><td>'+nf(sv.d)+'</td><td>'+nf(sv.b)+'</td></tr>';
    us.forEach(o=>{h+='<tr><td></td><td>'+esc(o.u)+'</td><td>'+nf(o.n)+'</td><td>'+nf(o.q.o)+'</td><td>'+nf(o.q.r)+'</td><td>'+nf(o.q.d)+'</td><td><b>'+nf(o.q.b)+'</b></td><td>'+nf(o.v.o)+'</td><td>'+nf(o.v.r)+'</td><td>'+nf(o.v.d)+'</td><td>'+nf(o.v.b)+'</td></tr>';});
  });
  const t=agg(rows,'v');
  h+='<tr class="tot"><td>รวมทุกหมวด</td><td class="u">มูลค่าเท่านั้น</td><td>'+nf(rows.length)+'</td><td colspan="4"></td><td>'+nf(t.o)+'</td><td>'+nf(t.r)+'</td><td>'+nf(t.d)+'</td><td>'+nf(t.b)+'</td></tr></tbody></table>';
  $('#ct-tbl').innerHTML=h;
}

/* ---------- groups ---------- */
function renderGroups(){
  const base=filt({pc:1,unit:1}),m=S.m;
  const all=agg(base);
  const gs=GR().map(g=>{const rs=base.filter(x=>gk(x)===g.code);return {g:g,rs:rs,a:agg(rs),n:rs.length,na:nAct(rs)};}).filter(o=>o.n>0).sort((p,q)=>q.a.b-p.a.b);
  const topG=gs[0];
  headline($('#gr-head'),'info','<span class="hp-hl-t">เทียบกลุ่ม'+(S.mode==='sym'?'อาการ':'โรค')+' · '+esc(S.pc==='ALL'?'ทุกหมวด':pcBy[S.pc].short)+' · '+esc(rangeLabel())+'</span> '+(topG&&all.b?'กลุ่มที่คงเหลือมากสุด: <b>'+esc(topG.g.short)+'</b> '+fmtM(topG.a.b)+' '+unitTxt()+' ('+pct(topG.a.b/all.b,0)+')':'ไม่มีข้อมูลในตัวกรองนี้'));
  $('#gr-bars-h').textContent='คงเหลือและจ่ายออกตามกลุ่ม'+(S.mode==='sym'?'อาการ':'โรค');
  $('#gr-n').textContent='แท่งสี 1 = คงเหลือ · แท่งสี 2 = จ่ายในช่วง · '+(m==='v'?'มูลค่า (บาท)':'ปริมาณหน่วย '+S.unit)+' · กดเพื่อเลือกกลุ่ม';
  const mx=d3.max(gs,o=>Math.max(o.a.b,o.a.d))||1;
  const host=$('#gr-bars');
  host.innerHTML=gs.length?gs.map((o,i)=>'<div style="display:grid;gap:2px;margin-bottom:6px"><button class="hp-hb" data-act="view" data-k="'+esc(o.g.code)+'" data-tip="'+esc(o.g.name+'\nคงเหลือ '+fmtM(o.a.b)+'\nจ่าย '+fmtM(o.a.d))+'"><span class="hp-hb-l">'+esc(o.g.short)+'</span><span class="hp-hb-t"><i style="--i:'+i+';width:'+Math.max(1,o.a.b/mx*100).toFixed(1)+'%;background:'+fcol('b')+'"></i></span><span class="hp-hb-v">'+fmtM(o.a.b)+'</span></button><button class="hp-hb" data-act="view" data-k="'+esc(o.g.code)+'"><span class="hp-hb-l hp-mut">จ่าย</span><span class="hp-hb-t"><i style="--i:'+i+';width:'+Math.max(1,o.a.d/mx*100).toFixed(1)+'%;background:'+fcol('d')+'"></i></span><span class="hp-hb-v hp-mut">'+fmtM(o.a.d)+'</span></button></div>').join(''):'<div class="hp-empty">ไม่มีข้อมูล</div>';
  $('#gr-tn').textContent='ตามหมวดที่เลือก ('+(S.pc==='ALL'?'ทุกหมวด':pcBy[S.pc].name)+')'+(m==='q'?' หน่วยนับ '+S.unit:'')+' · วันที่พอใช้ = คงเหลือ ÷ อัตราจ่ายต่อวัน · กดแถวเพื่อเลือกกลุ่ม';
  let h='<table><thead><tr><th>กลุ่ม</th><th>รายการ (เคลื่อนไหว / ทั้งหมด)</th><th></th><th>ยกมา</th><th>รับ</th><th>จ่าย</th><th>คงเหลือ</th><th>สัดส่วนคงเหลือ</th><th>วันที่พอใช้</th></tr></thead><tbody>';
  gs.forEach(o=>{h+='<tr data-act="view" data-k="'+esc(o.g.code)+'"'+(S.view===o.g.code?' class="sel"':'')+'><td title="'+esc(o.g.name)+'">'+esc(o.g.name)+'</td><td>'+nf(o.na)+' <small class="hp-mut">/ '+nf(o.n)+'</small></td><td class="u">'+unitTxt()+'</td>'+flowCells(o.a)+'<td>'+(all.b?pct(o.a.b/all.b,1):'—')+'</td><td>'+fdosH(dos(o.a))+'</td></tr>';});
  h+='<tr class="tot"><td>รวม</td><td>'+nf(nAct(base))+' <small class="hp-mut">/ '+nf(base.length)+'</small></td><td class="u">'+unitTxt()+'</td>'+flowCells(all)+'<td>100%</td><td>'+fdosH(dos(all))+'</td></tr></tbody></table>';
  $('#gr-tbl').innerHTML=h;
}

/* ---------- items ---------- */
function itemRows(){
  const rows=filt({pc:1,view:1});const q=S.q.trim().toLowerCase();
  let list=rows.map(x=>{const aq=agg([x],'q'),av=agg([x],'v'),st=stat(x);return {x:x,oq:aq.o,rq:aq.r,dq:aq.d,bq:aq.b,ov:av.o,rv:av.r,dv:av.d,bv:av.b,st:st,dos:st.dos==null?-1:(isFinite(st.dos)?st.dos:1e9)};});
  if(S.active)list=list.filter(o=>o.oq||o.rq||o.dq||o.bq||o.ov||o.rv||o.dv||o.bv);
  if(q)list=list.filter(o=>o.x.key.indexOf(q)>=0||o.x.gtxt.indexOf(q)>=0);
  const k=S.sort.k,dr=S.sort.d;
  const gv=o=>k==='label'?o.x.label.toLowerCase():k==='pcat'?(pcBy[o.x.pcat]?pcBy[o.x.pcat].order:99):k==='cat'?(gdef(o.x)?gdef(o.x).order:99):k==='unit'?o.x.unit:k==='st'?o.st.k:o[k];
  list.sort((a,b)=>{const A=gv(a),B=gv(b);return (A<B?-1:A>B?1:0)*dr;});
  return list;
}
function isAct(x){const a=S.from-1,b=S.to-1;if(x.oq[a]||x.ov[a]||x.bq[b]||x.bv[b])return true;for(let i=a;i<=b;i++){if(x.rq[i]||x.dq[i]||x.rv[i]||x.dv[i])return true;}return false;}
const nAct=rows=>rows.filter(isAct).length;
const cntTxt=rows=>'มีสต็อก/เคลื่อนไหว '+nf(nAct(rows))+' จาก '+nf(rows.length)+' รายการ';
let DQ={},DQU={};
const PIECE=['ชิ้น','คู่','อัน','เม็ด','แคปซูล','ซอง'];
function dqCalc(){
  DQ={};DQU={};const a=S.from-1,b=S.to-1;
  const pr=x=>{for(let i=b;i>=a;i--){const P=[['bq','bv'],['dq','dv'],['rq','rv'],['oq','ov']];for(let j=0;j<P.length;j++){if(x[P[j][0]][i]>0&&x[P[j][1]][i]>0)return x[P[j][1]][i]/x[P[j][0]][i];}}return null;};
  const g={},gu={};D.forEach(x=>{x._p=pr(x);if(x._p){(g[x.pcat+'|'+x.unit]=g[x.pcat+'|'+x.unit]||[]).push(x._p);(gu[x.unit]=gu[x.unit]||[]).push(x._p);}});
  D.forEach(x=>{
    const r=[];
    if(x._p&&x._p>=200){const L=(g[x.pcat+'|'+x.unit]||[]).length>=5?g[x.pcat+'|'+x.unit]:gu[x.unit]||[];const m=d3.median(L);
      if(L.length>=5&&m>0&&x._p>=30*m)r.push({k:'price',ratio:x._p/m,txt:'ราคาต่อหน่วย '+nf(x._p)+' บาท สูงกว่ารายการหน่วย "'+x.unit+'" ในหมวดเดียวกันราว '+nf(x._p/m)+' เท่า (มัธยฐาน '+nf1(m)+' บาท) หน่วยนับหรือปริมาณอาจบันทึกเป็นกล่อง/แพ็ก'});}
    if(/^box$/i.test(x.form||'')&&PIECE.indexOf(x.unit)>=0)DQU[x.id]=({k:'unit',ratio:0,txt:'ประเภท (TYPE) ในรายงานเป็น Box แต่หน่วยนับเป็น "'+x.unit+'" ปริมาณอาจนับเป็นกล่อง ทำให้ปริมาณและราคาต่อหน่วยคลาดเคลื่อน'});
    if(r.length)DQ[x.id]={reasons:r,ratio:Math.max.apply(null,r.map(z=>z.ratio)),price:x._p};
  });
}
const dqBadge=x=>DQ[x.id]?' <span class="hp-badge b-warn" title="'+esc(DQ[x.id].reasons.map(z=>z.txt).join(' / '))+'">ตรวจข้อมูล</span>':'';
function abcCalc(rows){
  const L=rows.map(x=>{const v=agg([x],'v'),q=agg([x],'q'),st=stat(x);return {x:x,dv:v.d,bv:v.b,v:v,q:q,st:st};});
  const act=L.filter(o=>o.dv>0).sort((p,q)=>q.dv-p.dv);const tot=sum(act.map(o=>o.dv));let cum=0;const map={};
  act.forEach((o,i)=>{const before=tot?cum/tot:0;cum+=o.dv;o.rank=i+1;o.cum=tot?cum/tot:0;o.cls=before<0.8?'A':before<0.95?'B':'C';map[o.x.id]=o;});
  const none=L.filter(o=>!(o.dv>0));none.forEach(o=>{o.cls='N';o.rank=null;o.cum=null;map[o.x.id]=o;});
  return {act:act,none:none,tot:tot,map:map,all:act.concat(none)};
}
const ABCC={A:()=>col(1),B:()=>col(3),C:()=>col(7),N:()=>'var(--cds-chart-muted)'};
const ABCN={A:'A · มูลค่าจ่ายสูง (สะสม 80%)',B:'B · ปานกลาง (80–95%)',C:'C · ต่ำ (95–100%)',N:'ไม่มีการจ่ายในช่วง'};
function renderAbc(){
  const rows=filt({pc:1,view:1}),R=abcCalc(rows);
  const by={A:[],B:[],C:[],N:R.none};R.act.forEach(o=>by[o.cls].push(o));
  const totB=sum(R.all.map(o=>o.bv)),totN=rows.length;
  const risk=by.A.filter(o=>o.st.k==='out'||o.st.k==='low');
  const overCN=sum(by.C.concat(by.N).filter(o=>o.st.k==='over'||o.st.k==='idle').map(o=>o.bv));
  headline($('#ab-head'),risk.length?'bad':'info','<span class="hp-hl-t">ABC ตามมูลค่าจ่าย · '+esc(scopeName())+' · '+esc(rangeLabel())+'</span> กลุ่ม A มี <b>'+by.A.length+'</b> รายการ ('+(totN?pct(by.A.length/totN,0):'—')+' ของรายการทั้งหมด) แต่คิดเป็น 80% ของมูลค่าจ่าย'+(risk.length?' · <b class="up-bad">กลุ่ม A ที่หมด/ใกล้หมด '+risk.length+' รายการ</b>':' · กลุ่ม A ไม่มีรายการหมด/ใกล้หมด')+' · มูลค่าคงเหลือที่ล้นสต็อก/ไม่เคลื่อนไหวในกลุ่ม C และไม่มีการจ่าย <b>'+baht(overCN)+' บาท</b>');
  $('#ab-cards').innerHTML=['A','B','C','N'].map((k,i)=>{const L=by[k],dv=sum(L.map(o=>o.dv)),bv=sum(L.map(o=>o.bv)),a={b:bv,dk:sum(L.map(o=>o.v.dk)),dayk:L.length?L[0].v.dayk:30};
    return '<button class="hp-gc" style="--i:'+i+';border-top:3px solid '+ABCC[k]()+'" data-act="abcf" data-k="'+k+'" data-tip="'+esc(ABCN[k]+'\nกดเพื่อดูรายการ')+'"><span class="t">'+esc(ABCN[k])+'</span><span class="v">'+nf(L.length)+' <small class="hp-mut">รายการ ('+(totN?pct(L.length/totN,0):'—')+')</small></span><span class="fl"><span>มูลค่าจ่าย</span><span>'+baht(dv)+' บาท'+(R.tot?' ('+pct(dv/R.tot,0)+')':'')+'</span><span>มูลค่าคงเหลือ</span><span>'+baht(bv)+' บาท'+(totB?' ('+pct(bv/totB,0)+')':'')+'</span><span>วันที่พอใช้ (มูลค่า)</span><span>'+(k==='N'?'—':fdos(dos(a)))+'</span></span></button>';}).join('');
  $('#ab-pn').textContent='จัดชั้นตามมูลค่าที่จ่ายในช่วง '+rangeLabel()+' (ไม่ขึ้นกับตัวเลือกมูลค่า/ปริมาณ) · เรียงจากมูลค่าจ่ายมากไปน้อย แกนตั้ง = สัดส่วนสะสมของมูลค่าจ่าย · เส้นประ = 80% และ 95% · ควรเลือกช่วง 3–12 เดือนเพื่อให้การจัดชั้นนิ่ง (ตอนนี้ช่วงสั้นอาจจัดชั้นต่างไปเมื่อมีข้อมูลมากขึ้น)';
  paretoChart($('#ab-par'),R.act);
  $('#ab-lg').innerHTML=['A','B','C'].map(k=>'<span style="--c:'+ABCC[k]()+'">'+k+'</span>').join('');
  $('#ab-seg').innerHTML=['A','B','C','N'].map(k=>'<button data-act="abcf" data-k="'+k+'" aria-pressed="'+(ABCF===k)+'">'+(k==='N'?'ไม่จ่าย':k)+' ('+by[k].length+')</button>').join('');
  const L=by[ABCF].slice().sort((p,q)=>ABCF==='N'?q.bv-p.bv:p.rank-q.rank);
  $('#ab-th').textContent='รายการชั้น '+(ABCF==='N'?'ไม่มีการจ่าย':ABCF)+' ('+nf(L.length)+')';
  $('#ab-tn').textContent=(ABCF==='A'?'รายการที่ควรดูแลใกล้ชิดที่สุด: ตรวจจุดสั่งซื้อและไม่ให้ขาด':ABCF==='C'?'รายการมูลค่าจ่ายต่ำ ลดความถี่ตรวจนับ/สั่งซื้อได้ แต่ระวังล้นสต็อก':ABCF==='N'?'มีรายการในรายงานแต่ไม่จ่ายเลย เรียงตามมูลค่าคงเหลือ':'')+' · กดแถวเพื่อดูรายเดือน · แสดงสูงสุด 100 รายการ';
  let h='<table><thead><tr><th>ชื่อ / ความแรง</th><th>หมวด</th><th>อันดับ</th><th>หน่วย</th><th>จ่าย</th><th>% สะสม</th><th>คงเหลือ</th><th>วันที่พอใช้</th><th>สถานะ</th></tr></thead><tbody>';
  L.slice(0,100).forEach(o=>{const x=o.x;h+='<tr data-act="detail" data-id="'+x.id+'"><td class="nm">'+esc(x.label)+dqBadge(x)+'<small>'+esc(x.code)+'</small></td><td>'+esc(pcBy[x.pcat]?pcBy[x.pcat].short:'')+'</td><td>'+(o.rank?nf(o.rank):'—')+'</td><td class="u">'+esc(x.unit)+'</td><td>'+nf(o.q.d)+'<small>'+nf(o.dv)+' บาท</small></td><td>'+(o.cum==null?'—':pct(o.cum,1))+'</td><td>'+nf(o.q.b)+'<small>'+nf(o.bv)+' บาท</small></td><td>'+fdosH(o.st.dos)+'</td><td><span class="hp-badge '+o.st.c+'">'+o.st.t+'</span></td></tr>';});
  $('#ab-tbl').innerHTML=L.length?h+'</tbody></table>':'<div class="hp-empty">ไม่มีรายการ</div>';
}
function paretoChart(host,act){
  const n=act.length;if(n<2){host.innerHTML='<div class="hp-empty">มีรายการที่จ่ายน้อยเกินกว่าจะแสดงกราฟ</div>';return;}
  const W=Math.max(300,host.clientWidth||600),H=260,lm=44;
  const x=d3.scaleLinear([1,n],[lm,W-12]),y=d3.scaleLinear([0,1],[H-28,12]);
  let s='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="กราฟพาเรโตมูลค่าจ่าย">';
  [0,.25,.5,.75,1].forEach(t=>{s+='<line x1="'+lm+'" x2="'+(W-12)+'" y1="'+y(t)+'" y2="'+y(t)+'" style="stroke:var(--cds-chart-grid)"/><text class="hp-ax" x="'+(lm-6)+'" y="'+(y(t)+4)+'" text-anchor="end">'+Math.round(t*100)+'%</text>';});
  [.8,.95].forEach(t=>{s+='<line x1="'+lm+'" x2="'+(W-12)+'" y1="'+y(t)+'" y2="'+y(t)+'" style="stroke:var(--cds-chart-reference)" stroke-dasharray="5 4"/>';});
  const bw=Math.max(1.5,Math.min(14,(W-lm-12)/n*.7));
  act.forEach((o,i)=>{const bh=Math.max(1,(H-28-12)*(o.dv/act[0].dv)*.35);s+='<rect x="'+(x(o.rank)-bw/2).toFixed(1)+'" y="'+(H-28-bh).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+bh.toFixed(1)+'" style="fill:'+ABCC[o.cls]()+';opacity:.5"/>';});
  ['A','B','C'].forEach(k=>{const seg=act.filter(o=>o.cls===k);if(!seg.length)return;const pts=seg.map(o=>[x(o.rank),y(o.cum)]);const f=seg[0].rank>1?[[x(seg[0].rank-1),y(act[seg[0].rank-2].cum)]]:[[x(1),y(0)]];
    s+='<path class="hp-line" pathLength="1" d="'+d3.line()(f.concat(pts))+'" fill="none" style="stroke:'+ABCC[k]()+'" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>';});
  const step=(W-lm-12)/Math.max(1,n-1);
  act.forEach(o=>{s+='<rect x="'+(x(o.rank)-step/2).toFixed(1)+'" y="0" width="'+step.toFixed(1)+'" height="'+(H-24)+'" fill="transparent" data-tip="'+esc('อันดับ '+o.rank+' · '+o.x.label+'\nชั้น '+o.cls+' · มูลค่าจ่าย '+nf(o.dv)+' บาท\nสะสม '+pct(o.cum,1))+'"/>';});
  s+='<text class="hp-ax" x="'+((lm+W-12)/2)+'" y="'+(H-6)+'" text-anchor="middle">อันดับรายการ (1 = จ่ายเป็นมูลค่าสูงสุด) · แท่ง = มูลค่าจ่ายของรายการ (สเกลสัมพัทธ์)</text></svg>';
  host.innerHTML=s;
}
function renderItems(){
  const list=itemRows();
  const abcm=abcCalc(filt({pc:1,view:1})).map;
  const cs={out:0,low:0,over:0,idle:0};list.forEach(o=>{if(cs[o.st.k]!=null)cs[o.st.k]++;});
  headline($('#dr-head'),cs.out?'bad':'info','<span class="hp-hl-t">'+esc(scopeName())+'</span> พบ '+nf(list.length)+' รายการ · หมดสต็อก <b class="up-bad">'+cs.out+'</b> · ใกล้หมด <b class="up-bad">'+cs.low+'</b> · ล้นสต็อก <b>'+cs.over+'</b> · ไม่เคลื่อนไหว <b>'+cs.idle+'</b> · กดหัวคอลัมน์เพื่อเรียง');
  $('#dr-h').textContent='รายการทั้งหมด · '+scopeName();
  $('#dr-n').textContent=rangeLabel()+' · แต่ละช่องบนคือปริมาณ (หน่วยของรายการ) ล่างคือมูลค่า (บาท) · กดแถวเพื่อดูรายเดือน';
  const th=(k,t)=>'<th><button data-act="sort" data-k="'+k+'">'+t+(S.sort.k===k?(S.sort.d<0?' ▼':' ▲'):'')+'</button></th>';
  let h='<table><thead><tr>'+th('label','ชื่อ / ความแรง')+th('pcat','หมวด')+th('cat','กลุ่ม')+th('unit','หน่วย')+'<th>ABC</th>'+th('oq','ยกมา')+th('rq','รับ')+th('dq','จ่าย')+th('bq','คงเหลือ')+th('dos','วันที่พอใช้')+th('st','สถานะ')+'</tr></thead><tbody>';
  list.slice(0,S.limit).forEach(o=>{
    const x=o.x,pcn=pcBy[x.pcat];
    h+='<tr data-act="detail" data-id="'+x.id+'"><td class="nm">'+esc(x.label)+dqBadge(x)+'<small>'+esc(x.code)+'</small></td><td>'+esc(pcn?pcn.short:'')+'</td><td>'+esc(gshort(x))+'</td><td class="u">'+esc(x.unit)+'</td><td>'+(abcm[x.id]?'<span class="hp-badge" style="color:'+ABCC[abcm[x.id].cls]()+'">'+(abcm[x.id].cls==='N'?'-':abcm[x.id].cls)+'</span>':'')+'</td>'+
      ['o','r','d','b'].map(f=>'<td>'+nf(o[f+'q'])+'<small>'+nf(o[f+'v'])+'</small></td>').join('')+'<td>'+fdosH(o.st.dos)+'</td><td><span class="hp-badge '+o.st.c+'">'+o.st.t+'</span></td></tr>';
  });
  h+='</tbody></table>';
  $('#dr-tbl').innerHTML=list.length?h:'<div class="hp-empty">ไม่พบรายการ</div>';
  $('#dr-more').innerHTML=list.length>S.limit?'<button class="hp-btn" data-act="more">แสดงเพิ่ม (อีก '+nf(list.length-S.limit)+' รายการ)</button><span class="hp-note">แสดง '+S.limit+' จาก '+nf(list.length)+' รายการ</span>':'';
}

/* ---------- detail ---------- */
function renderDetail(){
  const host=$('#hp-detail');const x=S.detail!=null?byId[S.detail]:null;
  if(!x){host.hidden=true;host.innerHTML='';return;}
  host.hidden=false;host.className='hp-detail';
  const aq=agg([x],'q'),av=agg([x],'v'),st=stat(x),c=catBy[x.cat],pcn=pcBy[x.pcat];
  host.innerHTML='<div class="hp-dh"><div><div class="hp-lab">'+esc(pcn?pcn.name:'')+' · กลุ่มโรค: '+esc(c?c.name:x.cat)+' · อาการ: '+esc(symBy[x.sym]?symBy[x.sym].name:'')+'</div><h2>'+esc(x.label)+'</h2><div class="hp-note">รหัส '+esc(x.code)+' · หน่วยนับ: '+esc(x.unit||'—')+(x.form?' · รูปแบบ: '+esc(x.form):'')+(+x.mpack?' · ขนาดบรรจุ: '+nf(+x.mpack):'')+'</div>'+(DQ[x.id]?'<div class="hp-note"><span class="hp-badge b-warn">ตรวจข้อมูล</span> '+esc(DQ[x.id].reasons.map(z=>z.txt).join(' · '))+'</div>':'')+(DQU[x.id]?'<div class="hp-note">หมายเหตุ: '+esc(DQU[x.id].txt)+'</div>':'')+'</div><div class="hp-inl"><span class="hp-badge '+st.c+'">'+st.t+'</span><button class="hp-btn" data-act="close">ปิด</button></div></div>'+
    '<div class="hp-kpis">'+FLOW.map(f=>kpi(f.n+' ('+esc(rangeLabel())+')',nf(aq[f.k])+' <small>'+esc(x.unit)+'</small>',nf(av[f.k])+' บาท')).join('')+kpi('วันที่สต็อกพอใช้',fdos(st.dos),'ราคาต่อหน่วยเฉลี่ย '+(aq.b>0?nf1(av.b/aq.b):aq.d>0?nf1(av.d/aq.d):'—')+' บาท')+'</div>'+
    '<div class="hp-svg" id="dt-chart" style="min-height:230px"></div><div class="hp-tw" style="max-height:none" id="dt-tbl"></div>';
  const ser=[];for(let i=0;i<AV;i++)ser.push({o:x.oq[i],r:x.rq[i],d:x.dq[i],b:x.bq[i]});
  trendChart($('#dt-chart'),ser,'q');
  const rowsT=[['ยกมา','o'],['รับ','r'],['จ่าย','d'],['คงเหลือ','b']];
  let t='<table><thead><tr><th style="text-align:left">รายการ</th>'+MON.slice(0,AV).map(o=>'<th>'+esc(o.short)+'</th>').join('')+'</tr></thead><tbody>';
  rowsT.forEach(r=>{t+='<tr><td style="text-align:left">'+r[0]+' ('+esc(x.unit)+')</td>'+x[r[1]+'q'].slice(0,AV).map((v,i)=>'<td'+(i+1>=S.from&&i+1<=S.to?'':' class="hp-mut"')+'>'+nf(v)+'</td>').join('')+'</tr>';});
  rowsT.forEach(r=>{t+='<tr><td style="text-align:left">'+r[0]+' (บาท)</td>'+x[r[1]+'v'].slice(0,AV).map((v,i)=>'<td'+(i+1>=S.from&&i+1<=S.to?'':' class="hp-mut"')+'>'+nf(v)+'</td>').join('')+'</tr>';});
  $('#dt-tbl').innerHTML=t+'</tbody></table>';
}

/* ---------- alerts ---------- */
function alertCard(badge,cls,x,text){
  return '<article class="hp-al sv-'+cls.slice(2)+'"><div class="hp-al-h"><span class="hp-badge '+cls+'">'+badge+'</span><b>'+esc(x.label)+'</b><span class="hp-mut">'+esc(pcBy[x.pcat]?pcBy[x.pcat].short:'')+' · '+esc(gshort(x))+'</span></div><p>'+text+'</p><div class="sp"><button class="hp-btn" data-act="detail" data-id="'+x.id+'">ดูรายเดือน</button></div></article>';
}
function renderAlerts(){
  const rows=filt({pc:1,view:1});
  const info=rows.map(x=>({x:x,q:agg([x],'q'),v:agg([x],'v'),st:stat(x)}));
  const out=info.filter(o=>o.st.k==='out').sort((p,q)=>q.v.d-p.v.d);
  const low=info.filter(o=>o.st.k==='low').sort((p,q)=>p.st.dos-q.st.dos);
  const over=info.filter(o=>o.st.k==='over').sort((p,q)=>q.v.b-p.v.b);
  const idle=info.filter(o=>o.st.k==='idle').sort((p,q)=>q.v.b-p.v.b);
  const sup=info.filter(o=>o.x.pcat==='sup'&&(o.v.r>0||o.v.d>0||o.v.b>0)).sort((p,q)=>q.v.d-p.v.d);
  const mism=info.filter(o=>Math.abs(o.q.o+o.q.r-o.q.d-o.q.b)>0.01||Math.abs(o.v.o+o.v.r-o.v.d-o.v.b)>1);
  const neg=info.filter(o=>o.q.b<0||o.v.b<0||o.q.d<0||o.q.r<0);
  const blankV=info.filter(o=>o.q.b>0&&o.v.b===0);
  const dq=info.filter(o=>DQ[o.x.id]).sort((p,q)=>DQ[q.x.id].ratio-DQ[p.x.id].ratio);
  const idleV=sum(idle.map(o=>o.v.b)),overV=sum(over.map(o=>o.v.b));
  headline($('#al-head'),out.length?'bad':'ok','ควรเร่งดู: <b>'+out.length+'</b> รายการหมดสต็อกแต่ยังมีการจ่าย · <b>'+low.length+'</b> รายการพอใช้ไม่ถึง 30 วัน · <b>'+over.length+'</b> รายการล้นสต็อก · <b>'+idle.length+'</b> รายการไม่เคลื่อนไหว');
  $('#al-h').textContent='สต็อกเสี่ยงและข้อสังเกต · '+scopeName()+' · '+rangeLabel();
  $('#al-n').textContent='ตัวชี้วัดคำนวณจาก'+' ('+rateNote()+(rateWin().k<3?' ยาที่จ่ายเป็นรอบหรือสั่งเป็นล็อตอาจถูกจัดผิด':'')+') ผลที่ได้เป็นสัญญาณให้ตรวจสอบต่อ ไม่ใช่ข้อสรุป'+' · เกณฑ์: ใกล้หมด < 30 วัน, ล้นสต็อก > 180 วัน, ไม่เคลื่อนไหว = มีของแต่ไม่จ่ายเลยในช่วง';
  const sm=[];
  sm.push(['bad','หมดสต็อกแต่ยังมีการจ่าย',out.length+' รายการ (เป็นยอดสิ้นเดือน '+mlab(S.to-1)+' ควรเทียบกับการสั่งซื้อที่กำลังเข้า)']);
  sm.push(['warn','พอใช้ไม่ถึง 30 วัน',low.length+' รายการ']);
  sm.push(['warn','ล้นสต็อก (พอใช้เกิน 180 วัน)',over.length+' รายการ มูลค่าคงเหลือรวม '+baht(overV)+' บาท']);
  sm.push(['info','มีของแต่ไม่เคลื่อนไหว',idle.length+' รายการ มูลค่ารวม '+baht(idleV)+' บาท ควรทบทวนวันหมดอายุและความจำเป็น']);
  sm.push([dq.length?'warn':'ok','ราคาต่อหน่วย/หน่วยนับที่ควรตรวจ',dq.length?dq.length+' รายการ (ดูส่วนแรกด้านล่าง) ตัวเลขปริมาณและวัน/สต็อกของรายการเหล่านี้อาจคลาดเคลื่อน':'ไม่พบรายการที่ราคาต่อหน่วยหรือหน่วยนับผิดปกติตามเกณฑ์']);
  const nU=info.filter(o=>DQU[o.x.id]).length;
  if(nU)sm.push(['info','ประเภท Box แต่หน่วยนับเป็นชิ้น/คู่ (สัญญาณรอง)',nU+' รายการ ส่วนใหญ่ราคาต่อชิ้นปกติ ดูหมายเหตุในหน้ารายละเอียดของรายการ']);
  sm.push([mism.length||neg.length?'bad':'ok','ตรวจความถูกต้องของข้อมูล',mism.length?mism.length+' รายการสมการ ยกมา+รับ−จ่าย≠คงเหลือ':'สมการ ยกมา + รับ − จ่าย = คงเหลือ ลงตัวทุกรายการ'+(neg.length?' · ยอดติดลบ '+neg.length+' รายการ':' · ไม่พบยอดติดลบ')+(blankV.length?' · มีของแต่มูลค่าเป็นว่าง/0 '+blankV.length+' รายการ':'')]);
  $('#al-sum').innerHTML=sm.map(a=>'<div class="hp-in '+(a[0]==='info'?'':a[0])+'"><i></i><div><b>'+a[1]+'</b> · '+a[2]+'</div></div>').join('');
  const sec=(t,n,items,cnt)=>'<div class="hp-card"><h2>'+t+' <span class="hp-mut">('+(cnt!=null?cnt:items.length)+')</span></h2><p class="hp-note">'+n+'</p>'+(items.length?'<div class="hp-grid w2">'+items.join('')+'</div>':'<div class="hp-empty">ไม่พบรายการตามเกณฑ์ในตัวกรองนี้</div>')+'</div>';
  const lim=a=>a.slice(0,12);
  let h='';
  h+=sec('ข้อมูลที่ควรตรวจ: ราคาต่อหน่วยและหน่วยนับ','ตรวจอัตโนมัติจากราคาต่อหน่วยตั้งแต่ 200 บาทและสูงกว่ามัธยฐานของรายการหน่วยเดียวกันในหมวดเดียวกันตั้งแต่ 30 เท่า (รายการที่ประเภทเป็น Box แต่หน่วยนับเป็นชิ้น/คู่ ไม่ถือเป็นข้อมูลผิดโดยตรง สรุปแยกไว้ด้านบน) · เป็นสัญญาณให้ผู้ดูแลคลังตรวจกับต้นฉบับ ไม่ใช่ข้อสรุป · ยาราคาสูงจริง (เช่น ฝังคุมกำเนิด) อาจติดเกณฑ์ได้',lim(dq).map(o=>alertCard('ตรวจข้อมูล','b-warn',o.x,esc(DQ[o.x.id].reasons.map(z=>z.txt).join(' · '))+' · คงเหลือ '+nf(o.q.b)+' '+esc(o.x.unit)+' ('+nf(o.v.b)+' บาท)')),dq.length);
  h+=sec('หมดสต็อกแต่ยังมีการจ่าย','คงเหลือสิ้นช่วงเป็น 0 แต่มีการจ่ายออกในช่วง เรียงตามมูลค่าที่จ่าย ตรวจว่ากำลังรอสั่ง/รอรับหรือควรเร่งจัดซื้อ',lim(out).map(o=>alertCard('หมดสต็อก','b-bad',o.x,'จ่ายในช่วง <b>'+nf(o.q.d)+' '+esc(o.x.unit)+'</b> ('+nf(o.v.d)+' บาท) · รับเข้า '+nf(o.q.r)+' · ยกมา '+nf(o.q.o)+' · คงเหลือ <b>0</b>')),out.length);
  h+=sec('พอใช้ไม่ถึง 30 วัน','คงเหลือหารด้วยอัตราจ่ายต่อวันของช่วงที่เลือก เรียงจากน้อยไปมาก',lim(low).map(o=>alertCard('ใกล้หมด','b-warn',o.x,'คงเหลือ <b>'+nf(o.q.b)+' '+esc(o.x.unit)+'</b> พอใช้ประมาณ <b>'+nf(o.st.dos)+' วัน</b> (อัตราจ่ายเฉลี่ย '+nf(o.q.dk/o.q.dayk*30)+' '+esc(o.x.unit)+'/เดือน)')),low.length);
  h+=sec('ล้นสต็อก (พอใช้เกิน 180 วัน)','มีการจ่ายแต่คงเหลือมากเมื่อเทียบกับอัตราจ่าย เรียงตามมูลค่าคงเหลือ อาจเป็นยาสั่งเป็นล็อตหรือใช้ตามฤดูกาล',lim(over).map(o=>alertCard('ล้นสต็อก','b-warn',o.x,'คงเหลือ <b>'+nf(o.q.b)+' '+esc(o.x.unit)+'</b> ('+nf(o.v.b)+' บาท) พอใช้ประมาณ <b>'+(isFinite(o.st.dos)?nf(o.st.dos)+' วัน':'—')+'</b> จ่าย '+nf(o.q.d)+' ในช่วง')),over.length);
  h+=sec('มีของแต่ไม่เคลื่อนไหว','ไม่มีการจ่ายในช่วงที่เลือก เรียงตามมูลค่าคงเหลือ ใช้ประกอบการทบทวนวันหมดอายุ ความจำเป็นของรายการ และการแลกเปลี่ยนยากับหน่วยงานอื่น',lim(idle).map(o=>alertCard('ไม่เคลื่อนไหว','b-mut',o.x,'คงเหลือ <b>'+nf(o.q.b)+' '+esc(o.x.unit)+'</b> มูลค่า <b>'+nf(o.v.b)+' บาท</b> · รับเข้า '+nf(o.q.r))),idle.length);
  h+=sec('ยาสนับสนุน: รับและจ่าย','ยาที่ได้รับสนับสนุนจากโครงการ (เช่น HIV วัณโรค) ตรวจว่ารับและจ่ายสอดคล้องกัน มูลค่าคงเหลือของยากลุ่มนี้อาจไม่ถูกบันทึกในคลัง',lim(sup).map(o=>alertCard('สนับสนุน','b-mut',o.x,'รับ <b>'+nf(o.q.r)+'</b> จ่าย <b>'+nf(o.q.d)+'</b> คงเหลือ <b>'+nf(o.q.b)+' '+esc(o.x.unit)+'</b> · มูลค่ารับ/จ่าย '+nf(o.v.r)+' / '+nf(o.v.d)+' บาท')),sup.length);
  if(mism.length||neg.length){h+=sec('ข้อมูลที่ควรตรวจ','สมการไม่ลงตัวหรือยอดติดลบ',lim(mism.concat(neg)).map(o=>alertCard('ตรวจข้อมูล','b-bad',o.x,'ยกมา '+nf(o.q.o)+' + รับ '+nf(o.q.r)+' − จ่าย '+nf(o.q.d)+' ≠ คงเหลือ '+nf(o.q.b))),mism.length+neg.length);}
  $('#al-body').innerHTML=h;
}

/* ---------- search / summary ---------- */
function matches(q,lim){q=q.trim().toLowerCase();if(!q)return [];return D.filter(x=>x.key.indexOf(q)>=0).sort((a,b)=>sum(b.bv)-sum(a.bv)).slice(0,lim||10);}
function showRes(box,q){
  const m=matches(q);
  if(!q.trim()){box.hidden=true;box.innerHTML='';return;}
  box.hidden=false;
  box.innerHTML=m.length?m.map(x=>'<button data-act="detail" data-id="'+x.id+'"><span>'+esc(x.label)+'</span><small>'+esc(pcBy[x.pcat]?pcBy[x.pcat].short:'')+' · คงเหลือ '+nf(x.bv[S.to-1])+' บาท</small></button>').join(''):'<div class="hp-empty">ไม่พบรายการ</div>';
}
function buildSummary(){
  const rows=filt({pc:1,view:1}),av=agg(rows,'v');
  const L=['สรุปคลังยาและเวชภัณฑ์ \"'+scopeName()+'\" ช่วง '+rangeLabel()+' (ปีงบประมาณ '+S.fy+') รพ.กรงปินัง',
    'มูลค่า (บาท): ยกมา '+nf(av.o)+' + รับ '+nf(av.r)+' − จ่าย '+nf(av.d)+' = คงเหลือ '+nf(av.b),
    'วันที่สต็อกพอใช้ (ตามมูลค่า) '+fdos(dos(av))+' · อัตราหมุนเวียน '+(turn(av)==null?'—':nf1(turn(av))+' ครั้ง/ปี')];
  PC.forEach(p=>{const a=agg(rows.filter(x=>x.pcat===p.code),'v');L.push(p.name+': ยกมา '+nf(a.o)+' รับ '+nf(a.r)+' จ่าย '+nf(a.d)+' คงเหลือ '+nf(a.b));});
  const st=rows.map(stat);L.push('หมดสต็อกแต่ยังจ่าย '+st.filter(s=>s.k==='out').length+' · ใกล้หมด '+st.filter(s=>s.k==='low').length+' · ล้นสต็อก '+st.filter(s=>s.k==='over').length+' · ไม่เคลื่อนไหว '+st.filter(s=>s.k==='idle').length+' รายการ');
  return L.join('\n');
}
function copyText(t,btn){
  const o=btn.textContent;
  const done=()=>{btn.textContent='คัดลอกแล้ว ✓';setTimeout(()=>{btn.textContent=o;},1800);};
  const fb=()=>{try{const ta=document.createElement('textarea');ta.value=t;ta.style.cssText='position:fixed;opacity:0';document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();done();}catch(e){btn.textContent='คัดลอกไม่ได้';setTimeout(()=>{btn.textContent=o;},1800);}};
  try{if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t).then(done,fb);else fb();}catch(e){fb();}
}
function renderFbar(){
  const f=$('#hp-fbar');if(!f)return;
  const ch=[];
  if(S.pc!=='ALL')ch.push('<span class="hp-fc">หมวด: <b>'+esc(pcBy[S.pc].short)+'</b><button data-act="fclr" data-w="pc" aria-label="ล้างตัวกรองหมวด">×</button></span>');
  if(S.view!=='ALL')ch.push('<span class="hp-fc">กลุ่ม: <b>'+esc(viewName())+'</b><button data-act="fclr" data-w="view" aria-label="ล้างตัวกรองกลุ่ม">×</button></span>');
  if(S.from!==1||S.to!==AV)ch.push('<span class="hp-fc">ช่วง: <b>'+esc(rangeLabel())+'</b><button data-act="fclr" data-w="range" aria-label="ล้างช่วงเวลา">×</button></span>');
  f.hidden=!ch.length;
  f.innerHTML=ch.length?'<span class="hp-note">กำลังกรอง:</span>'+ch.join('')+(ch.length>1?'<button class="hp-btn" data-act="fclr" data-w="all">ล้างทั้งหมด</button>':''):'';
}

/* ---------- events ---------- */
function go(){render();}
document.addEventListener('click',e=>{
  const root=$('#hp');if(!root||!root.contains(e.target))return;
  const gres=$('#hp-gres');
  if(!e.target.closest('.hp-gs'))gres.hidden=true;
  const el=e.target.closest('[data-act]');if(!el)return;
  const a=el.dataset.act;
  if(a==='tab'){S.tab=el.dataset.t;}
  else if(a==='pc'){S.pc=el.dataset.k;S.limit=80;if(el.closest('#ct-cards,#ov-pc,#ct-tbl'))S.tab=S.tab==='cats'?'overview':S.tab;}
  else if(a==='view'){S.view=el.dataset.k;S.limit=80;if(el.closest('#gr-bars,#gr-tbl,#ov-grp'))S.tab='overview';}
  else if(a==='mode'){setMode(el.dataset.m);}
  else if(a==='copy'){copyText(buildSummary(),el);return;}
  else if(a==='print'){try{window.print();}catch(err){}return;}
  else if(a==='fclr'){const w=el.dataset.w;if(w==='pc'||w==='all')S.pc='ALL';if(w==='view'||w==='all')S.view='ALL';if(w==='range'||w==='all'){S.from=1;S.to=AV;}S.limit=80;}
  else if(a==='metric'){S.m=el.dataset.m;}
  else if(a==='quick'){S.from=+el.dataset.a;S.to=Math.min(+el.dataset.b,AV);}
  else if(a==='fy'){setFY(+el.dataset.y);rebuildRange();}
  else if(a==='detail'){S.detail=+el.dataset.id;gres.hidden=true;$('#hp-gs').value='';render();const d=$('#hp-detail');if(d&&d.scrollIntoView)d.scrollIntoView({block:'nearest'});return;}
  else if(a==='close'){S.detail=null;}
  else if(a==='sort'){const k=el.dataset.k;S.sort=S.sort.k===k?{k:k,d:-S.sort.d}:{k:k,d:(k==='label'||k==='pcat'||k==='cat'||k==='unit'||k==='st')?1:-1};}
  else if(a==='more'){S.limit+=120;}
  else if(a==='abcf'){ABCF=el.dataset.k;S.tab='abc';}
  else if(a==='togactive'){S.active=!S.active;}
  anim=(a==='tab'||a==='fy')?'tab':'data';go();
});
document.addEventListener('change',e=>{
  if(e.target.id==='hp-from'){S.from=+e.target.value;if(S.to<S.from)S.to=S.from;anim='data';go();}
  if(e.target.id==='hp-to'){S.to=+e.target.value;if(S.from>S.to)S.from=S.to;anim='data';go();}
  if(e.target.id==='hp-unit'){S.unit=e.target.value;anim='data';go();}
});
document.addEventListener('input',e=>{
  if(e.target.id==='hp-gs')showRes($('#hp-gres'),e.target.value);
  else if(e.target.id==='hp-q'){S.q=e.target.value;S.limit=80;renderItems();}
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){$('#hp-gres').hidden=true;}});
document.addEventListener('mousemove',e=>{
  const root=$('#hp'),t=$('#hp-tip');if(!root||!t)return;
  const el=e.target.closest&&e.target.closest('[data-tip]');
  if(!el||!root.contains(el)||!el.dataset.tip){t.hidden=true;return;}
  const lines=el.dataset.tip.split('\n');t.innerHTML='<b>'+esc(lines[0])+'</b>'+(lines.length>1?'<br>'+lines.slice(1).map(esc).join('<br>'):'');
  t.hidden=false;
  const rb=root.getBoundingClientRect();
  let x=e.clientX-rb.left+14,y=e.clientY-rb.top+16;
  const w=t.offsetWidth,h=t.offsetHeight;
  if(x+w>rb.width-4)x=Math.max(4,e.clientX-rb.left-w-14);
  if(y+h>root.scrollHeight)y=Math.max(4,y-h-30);
  t.style.left=x+'px';t.style.top=y+'px';
});
document.addEventListener('scroll',()=>{const t=$('#hp-tip');if(t)t.hidden=true;},true);

/* ---------- main ---------- */
function tabInd(){
  const nav=$('#hp-tabs');if(!nav)return;const b=nav.querySelector('[aria-selected=true]');if(!b)return;
  nav.style.setProperty('--tx',b.offsetLeft+'px');nav.style.setProperty('--tw',b.offsetWidth+'px');
}
function render(){
  if(!prep())return;
  const rt=$('#hp');
  if(rt){const p=colors();['a','b','c','d'].forEach((k,i)=>rt.style.setProperty('--hp-'+k,p[i]||'var(--color-fg)'));
    if(anim==='tab'){rt.classList.add('go');clearTimeout(animT);animT=setTimeout(()=>rt.classList.remove('go'),2200);}}
  animNow=anim;anim=null;
  dqCalc();
  syncControls();renderFbar();
  renderDetail();
  if(S.tab==='overview')renderOverview();
  else if(S.tab==='cats')renderCats();
  else if(S.tab==='groups')renderGroups();
  else if(S.tab==='abc')renderAbc();
  else if(S.tab==='items')renderItems();
  else if(S.tab==='alerts')renderAlerts();
  countUps();tabInd();
}
function redraw(){go();
  if(S.tab==='overview')renderOverview();else if(S.tab==='cats')renderCats();else if(S.tab==='groups')renderGroups();else if(S.tab==='abc')renderAbc();else if(S.tab==='items')renderItems();else if(S.tab==='alerts')renderAlerts();
  countUps();tabInd();}
let lastW=window.innerWidth,rzT=null;
window.addEventListener('resize',()=>{tabInd();clearTimeout(rzT);rzT=setTimeout(()=>{if(!ready||window.innerWidth===lastW)return;lastW=window.innerWidth;anim=null;redraw();},180);});
window.addEventListener('orientationchange',()=>{setTimeout(()=>{lastW=-1;window.dispatchEvent(new Event('resize'));},250);});
document.addEventListener('touchstart',e=>{const t=$('#hp-tip');if(t&&!(e.target.closest&&e.target.closest('[data-tip]')))t.hidden=true;},{passive:true});
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('#hp-ftog');if(!b)return;const f=$('#hp-filters'),o=!f.classList.contains('open');f.classList.toggle('open',o);b.setAttribute('aria-expanded',String(o));b.querySelector('span').textContent=o?'ซ่อนตัวกรอง ▴':'ตัวกรอง ▾';});
dash.onData(render);
})();
