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
const S={tgt:60,ordAll:false,excl:false,grAll:false,tab:'overview',m:'v',unit:'',pc:'ALL',mode:'dis',view:'ALL',from:1,to:12,fy:null,q:'',active:true,sort:{k:'bv',d:-1},limit:80,detail:null};
let OFF=0,ABCF='A';
let ALLM=[],FYS=[],MON=[],AV=12,D=[],CATS=[],SYMS=[],PC=[],catBy={},symBy={},pcBy={},byId={},UNITS=[],ready=false,SIG='';
let anim='tab',animNow=null,animT=null;
const PREVK={};
let MOTION_OFF=false;try{MOTION_OFF=localStorage.getItem('stock-motion')==='off';}catch(e){}
const reduced=()=>MOTION_OFF||!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
const PAL=['var(--pl0)','var(--pl1)','var(--pl2)','var(--pl3)','var(--pl4)','var(--pl5)','var(--pl6)','var(--pl7)'];
const colors=()=>PAL;
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
const fdosH=v=>{const t=fdos(v);if(v==null||!isFinite(v))return t;const M=TH.over*4/3,p=Math.min(1,v/M)*100,lp=(TH.low/M*100).toFixed(1),op=(TH.over/M*100).toFixed(1);return '<span class="hp-dosw">'+t+'<span class="hp-dosb" style="background:linear-gradient(90deg,var(--color-bad) 0 '+lp+'%,var(--color-ok) '+lp+'% '+op+'%,var(--color-warn) '+op+'% 100%)" title="แถบเทียบ: แดง < '+TH.low+' วัน · เขียว '+TH.low+'–'+TH.over+' วัน · เหลือง > '+TH.over+' วัน"><i style="left:'+p.toFixed(1)+'%"></i></span></span>';};
const fdos=v=>v==null?'—':!isFinite(v)?'ไม่มีการจ่าย':v>=1000?'> 999 วัน':nf(v)+' วัน';
function filt(o){
  return D.filter(x=>(!S.excl||!DQ[x.id])&&(!o.pc||S.pc==='ALL'||x.pcat===S.pc)&&(!o.view||S.view==='ALL'||gk(x)===S.view)&&(!o.unit||S.m!=='q'||!S.unit||x.unit===S.unit));
}
const scope=()=>filt({pc:1,view:1,unit:1});
function stat(x){
  const a=agg([x],'q'),ds=dos(a);
  if(a.b<=0&&a.d>0)return {k:'out',t:'หมดสต็อก',c:'b-bad',dos:ds};
  if(a.d>0&&ds<TH.low)return {k:'low',t:'ใกล้หมด',c:'b-warn',dos:ds};
  if(a.d>0&&ds>TH.over)return {k:'over',t:'ล้นสต็อก',c:'b-warn',dos:ds};
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
    tween(el,from,to,fmt,animNow==='tab'?1400:500);
    if(animNow==='data'&&from!==to){el.classList.remove('hp-flash');void el.offsetWidth;el.classList.add('hp-flash');}
  });
}
function headline(host,tone,html){host.className='hp-headline '+tone;host.innerHTML='<i></i><div>'+html+'</div>';}
function kpi(l,n,s,sp){return '<div class="hp-kpi">'+(sp?'<span class="sp">'+sp+'</span>':'')+'<span class="l">'+l+'</span><span class="n">'+n+'</span><span class="s">'+s+'</span></div>';}
function hbarsHtml(list,max){
  max=max||d3.max(list,d=>d.val)||1;
  return list.length?list.map((d,i)=>'<button class="hp-hb" '+d.attr+' data-tip="'+esc(d.tip||'')+'"><span class="hp-hb-l">'+(d.warn?'<b class="hp-wm" title="ราคาต่อหน่วยน่าสงสัย">!</b> ':'')+esc(d.label)+'</span><span class="hp-hb-t"><i style="--i:'+i+';width:'+Math.max(1,d.val/max*100).toFixed(1)+'%;background:linear-gradient(90deg,'+(d.color||col(0))+',color-mix(in srgb,'+(d.color||col(0))+' 65%,transparent))"></i></span><span class="hp-hb-v">'+esc(d.vtxt)+'</span></button>').join(''):'<div class="hp-empty">ไม่มีข้อมูลในตัวกรองที่เลือก</div>';
}
function hbars(host,list,max){host.innerHTML=hbarsHtml(list,max);}
function lgd(items){return '<div class="hp-lg">'+items.map(i=>'<span'+(i[2]?' class="ln"':'')+' style="--c:'+i[1]+'">'+i[0]+'</span>').join('')+'</div>';}
function pairBars(list){
  const mx=d3.max(list,d=>Math.max(d.b,d.d))||1;
  return list.length?list.map((d,i)=>'<button class="hp-pb" '+d.attr+' data-tip="'+esc(d.tip||'')+'"><span class="hp-hb-l">'+(d.warn?'<b class="hp-wm">!</b> ':'')+esc(d.label)+'</span><span class="hp-pb-t"><i style="--i:'+i+';width:'+Math.max(.6,d.b/mx*100).toFixed(1)+'%;background:'+fcol('b')+'"></i><i class="d" style="--i:'+i+';width:'+Math.max(.6,d.d/mx*100).toFixed(1)+'%;background:'+fcol('d')+'"></i></span><span class="hp-pb-v"><b>'+fmtM(d.b)+'</b><small>จ่าย '+fmtM(d.d)+'</small></span></button>').join(''):'<div class="hp-empty">ไม่มีข้อมูล</div>';
}
const isSupG=g=>g.code.indexOf('sup_')===0;
function spark(x){
  const v=[];for(let i=0;i<AV;i++)v.push(x.bv[i]);if(v.length<2)return '';
  const mx=Math.max.apply(null,v),mn=Math.min.apply(null,v),W=68,H=22,sx=i=>2+i*(W-4)/(v.length-1),sy=y=>mx===mn?H/2:H-3-(y-mn)/(mx-mn)*(H-6);
  const up=v[v.length-1]>=v[0];
  return '<svg class="hp-sp" viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'"><path d="'+v.map((y,i)=>(i?'L':'M')+sx(i).toFixed(1)+' '+sy(y).toFixed(1)).join('')+'" fill="none" stroke="'+(up?fcol('r'):fcol('d'))+'" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="'+sx(v.length-1).toFixed(1)+'" cy="'+sy(v[v.length-1]).toFixed(1)+'" r="2.4" fill="'+(up?fcol('r'):fcol('d'))+'"/></svg>';
}
const tmKind=ds=>(ds==null||!isFinite(ds))?'':ds<TH.low?'low':ds>TH.over?'over':'ok';
const tmGl=ds=>{const k=tmKind(ds);return k==='low'?'✕ ':k==='over'?'! ':k==='ok'?'✓ ':'';};
const tmOv=(ds,n,w,hh)=>{const k=tmKind(ds);return (k==='low'||k==='over')?'<rect x="'+n.x0+'" y="'+n.y0+'" width="'+w+'" height="'+hh+'" rx="8" fill="url(#'+(k==='low'?'tmLow':'tmOver')+')" pointer-events="none"/>':'';};
function treemap(host,gs){
  const W=Math.max(300,host.clientWidth||600),H=W<520?300:340;
  const data=gs.filter(o=>o.a.b>0);if(!data.length){host.innerHTML='<div class="hp-empty">ไม่มียอดคงเหลือในตัวกรองนี้</div>';return;}
  const root=d3.hierarchy({children:data}).sum(d=>d.a?d.a.b:0).sort((p,q)=>q.value-p.value);
  d3.treemap().size([W,H]).paddingInner(3).round(true)(root);
  const zc=o=>{const ds=dos(o.a);if(ds==null||!isFinite(ds))return '#7d8a99';return ds<TH.low?'var(--color-bad)':ds>TH.over?'var(--color-warn)':'var(--color-ok)';};
  let s='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="แผนที่สต็อกตามกลุ่ม ขนาด = มูลค่าคงเหลือ">'+'<defs><pattern id="tmLow" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="3.5" cy="3.5" r="1.3" fill="#fff" fill-opacity=".55"/></pattern><pattern id="tmOver" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="3" height="8" fill="#fff" fill-opacity=".26"/></pattern></defs>';
  root.leaves().forEach((n,i)=>{const o=n.data,w=n.x1-n.x0,hh=n.y1-n.y0,ds=dos(o.a);
    s+='<g class="hp-tmg" style="--i:'+i+'" data-act="view" data-k="'+esc(o.g.code)+'" data-tip="'+esc(o.g.name+'\nคงเหลือ '+fmtM(o.a.b)+' '+unitTxt()+'\nจ่าย '+fmtM(o.a.d)+'\nวันที่พอใช้ '+fdos(ds))+'" style="cursor:pointer"><rect x="'+n.x0+'" y="'+n.y0+'" width="'+w+'" height="'+hh+'" rx="8" style="fill:'+zc(o)+';opacity:.82"'+(isSupG(o.g)?' stroke="var(--color-fg)" stroke-dasharray="4 3" fill-opacity=".9"':'')+'/>'+tmOv(ds,n,w,hh);
    if(w>64&&hh>34)s+='<text x="'+(n.x0+8)+'" y="'+(n.y0+19)+'" class="hp-tml">'+tmGl(ds)+esc(trunc(o.g.short,Math.max(4,Math.floor(w/9))))+'</text><text x="'+(n.x0+8)+'" y="'+(n.y0+35)+'" class="hp-tmv">'+fmtM(o.a.b)+'</text>';
    s+='</g>';});
  host.innerHTML=s+'</svg>';
}
function sankey(host){
  const rows=filt({view:1,unit:1});const W=Math.max(300,host.clientWidth||640),H=W<520?300:340,lm=W<520?58:78,rm=W<520?92:122,nw=14;
  const P=PC.map(p=>{const rs=rows.filter(x=>x.pcat===p.code);const a=agg(rs,'v');return {p:p,a:a};}).filter(o=>o.a.o+o.a.r>0);
  const tO=sum(P.map(o=>o.a.o)),tR=sum(P.map(o=>o.a.r)),tD=sum(P.map(o=>o.a.d)),tB=sum(P.map(o=>o.a.b));
  const tot=tO+tR;if(!tot){host.innerHTML='<div class="hp-empty">ไม่มียอดให้แสดง</div>';return;}
  const gap=8,ky=(H-gap*Math.max(P.length,2)-8)/tot;
  const xL=lm,xM=lm+(W-lm-rm)/2-nw/2,xR=W-rm-nw;
  let y=4;const L={};['o','r'].forEach(k=>{const v=k==='o'?tO:tR;L[k]={y0:y,h:v*ky,cur:y};y+=v*ky+gap*2;});
  y=4;P.forEach(o=>{o.y0=y;o.h=(o.a.o+o.a.r)*ky;o.inc=y;o.out=y;y+=o.h+gap;});
  const R={};y=4;[['d',tD],['b',tB]].forEach(([k,v])=>{R[k]={y0:y,h:v*ky,cur:y};y+=v*ky+gap*2;});
  let pn=0;const rib=(x1,a0,a1,x2,b0,b1,c,tip)=>{const xm=(x1+x2)/2;const pt=(!reduced()&&(a1-a0)>2.5)?(function(){const ya=(a0+a1)/2,yb=(b0+b1)/2,d='M'+x1+' '+ya+' C'+xm+' '+ya+','+xm+' '+yb+','+x2+' '+yb,n=pn++,du=(3.2+(n%5)*.45).toFixed(2);return [0,1].map(j=>'<circle class="sk-p" r="2.2"><animateMotion dur="'+du+'s" begin="-'+((n*.7+j*du/2)%du).toFixed(2)+'s" repeatCount="indefinite" path="'+d+'"/></circle>').join('');})():'';return '<path class="hp-rib" d="M'+x1+' '+a0+' C'+xm+' '+a0+','+xm+' '+b0+','+x2+' '+b0+' L'+x2+' '+b1+' C'+xm+' '+b1+','+xm+' '+a1+','+x1+' '+a1+' Z" style="fill:'+c+'" data-tip="'+esc(tip)+'"/>'+pt;};
  let s='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="แผนภาพการไหลของมูลค่า ยกมาและรับ ผ่านแต่ละหมวด ไปสู่จ่ายและคงเหลือ">';
  P.forEach(o=>{
    [['o',o.a.o,fcol('o')],['r',o.a.r,fcol('r')]].forEach(([k,v,c])=>{if(v<=0)return;const hh=v*ky;s+=rib(xL+nw,L[k].cur,L[k].cur+hh,xM,o.inc,o.inc+hh,c,(k==='o'?'ยกมา':'รับ')+' → '+o.p.short+'\n'+baht(v)+' บาท');L[k].cur+=hh;o.inc+=hh;});
    [['d',o.a.d,fcol('d')],['b',o.a.b,fcol('b')]].forEach(([k,v,c])=>{if(v<=0)return;const hh=v*ky;s+=rib(xM+nw,o.out,o.out+hh,xR,R[k].cur,R[k].cur+hh,c,o.p.short+' → '+(k==='d'?'จ่าย':'คงเหลือ')+'\n'+baht(v)+' บาท');R[k].cur+=hh;o.out+=hh;});
  });
  [['o','ยกมา',tO,fcol('o')],['r','รับ',tR,fcol('r')]].forEach(([k,t,v,c])=>{s+='<rect x="'+xL+'" y="'+L[k].y0+'" width="'+nw+'" height="'+Math.max(2,L[k].h)+'" rx="3" style="fill:'+c+'"/><text class="hp-ax" x="'+(xL-6)+'" y="'+(L[k].y0+Math.min(L[k].h/2,14)+4)+'" text-anchor="end" style="fill:var(--color-fg);font-weight:600">'+t+'</text><text class="hp-ax" x="'+(xL-6)+'" y="'+(L[k].y0+Math.min(L[k].h/2,14)+18)+'" text-anchor="end">'+bahtS(v)+'</text>';});
  let ly=-99;
  P.forEach(o=>{s+='<rect x="'+xM+'" y="'+o.y0+'" width="'+nw+'" height="'+Math.max(2,o.h)+'" rx="3" style="fill:'+pcCol(o.p.code)+'" data-act="pc" data-k="'+esc(o.p.code)+'" data-tip="'+esc(o.p.name+'\nยกมา+รับ '+baht(o.a.o+o.a.r)+' บาท\nจ่าย '+baht(o.a.d)+' · คงเหลือ '+baht(o.a.b))+'"/>';
    let yy=o.y0+Math.max(2,o.h)/2+4;if(yy-ly<15)yy=ly+15;ly=yy;
    s+='<text class="hp-ax hp-halo" x="'+(xM+nw+6)+'" y="'+yy.toFixed(1)+'" style="font-weight:600;fill:var(--color-fg)">'+esc(o.p.short)+(W<520?'':' '+bahtS(o.a.o+o.a.r))+'</text>';});
  [['d','จ่าย',tD,fcol('d')],['b','คงเหลือ',tB,fcol('b')]].forEach(([k,t,v,c])=>{s+='<rect x="'+xR+'" y="'+R[k].y0+'" width="'+nw+'" height="'+Math.max(2,R[k].h)+'" rx="3" style="fill:'+c+'"/><text class="hp-ax" x="'+(xR+nw+6)+'" y="'+(R[k].y0+Math.min(R[k].h/2,14)+4)+'" style="fill:var(--color-fg);font-weight:600">'+t+'</text><text class="hp-ax" x="'+(xR+nw+6)+'" y="'+(R[k].y0+Math.min(R[k].h/2,14)+18)+'">'+bahtS(v)+'</text>';});
  host.innerHTML=s+'</svg>';
}
function heatmap(host){
  const rows=filt({view:1,unit:1}),n=MON.length;
  const data=PC.map(p=>{const rs=rows.filter(x=>x.pcat===p.code);const arr=[];for(let i=0;i<n;i++){let d=0;rs.forEach(x=>{d+=x.dv[i];});arr.push(d);}return {p:p,arr:arr,n:rs.length};}).filter(o=>o.n>0);
  const mx=d3.max(data,o=>d3.max(o.arr.slice(0,AV)))||1;
  let h='<div class="hp-hm" style="--n:'+n+'"><span></span>'+MON.map((m,i)=>'<span class="hp-hmh'+(i<AV?'':' off')+'">'+esc(m.short)+'</span>').join('');
  data.forEach((o,r)=>{h+='<span class="hp-hml"><i class="pcd" style="--c:'+pcCol(o.p.code)+'"></i>'+esc(o.p.short)+'</span>'+o.arr.map((v,i)=>i<AV?'<span class="hp-hmc" style="--rc:'+pcCol(o.p.code)+';--a:'+(v>0?(.12+.88*Math.sqrt(v/mx)).toFixed(2):0)+';--i:'+(r*n+i)+'" data-tip="'+esc(o.p.name+' · '+MON[i].full+' '+MON[i].year+'\nจ่าย '+baht(v)+' บาท')+'">'+(v>0?bahtS(v):'–')+'</span>':'<span class="hp-hmc off">·</span>').join('');});
  host.innerHTML=h+'</div>';
}
function aggPrev(rows,m){const len=S.to-S.from+1,f=S.from-len;if(f<1)return null;const sf=S.from,st=S.to;S.from=f;S.to=f+len-1;let r;try{r=agg(rows,m);}finally{S.from=sf;S.to=st;}return r;}
const dlt=(c,p)=>(p==null||!p)?'':' · <span class="dl '+(c>=p?'dl-up':'dl-dn')+'">'+(c>=p?'▲ +':'▼ −')+pct(Math.abs(c-p)/p,0)+'</span> เทียบช่วงก่อนหน้า';
const PCC=['var(--pl0)','var(--pl1)','var(--pl2)','var(--pl4)','var(--pl7)','var(--pl3)'];
const pcCol=code=>{const i=PC.findIndex(p=>p.code===code);return PCC[(i<0?0:i)%PCC.length];};
const pcd=x=>'<i class="pcd" style="--c:'+pcCol(x.pcat)+'"></i>';
const pcode=x=>{const p=pcBy[x.pcat];return p?p.short:'';};
function orderCalc(){
  const rows=filt({pc:1,view:1});
  const L=rows.map(x=>{const aq=agg([x],'q'),av=agg([x],'v'),st=stat(x);const rate=aq.dk/aq.dayk;const need=rate>0?Math.max(0,Math.ceil(S.tgt*rate-aq.b)):0;const pk=+x.mpack>1?+x.mpack:0;const pr=x._p||null;
    return {x:x,st:st,q:aq,v:av,rate:rate,need:need,pk:pk,boxes:pk?Math.ceil(need/pk):null,val:(pr&&!DQ[x.id])?need*pr:null,bad:!!DQ[x.id],tier:st.k==='out'?1:st.k==='low'?2:(aq.d>0&&isFinite(st.dos)&&st.dos<S.tgt&&need>0)?3:0};}).filter(o=>o.tier&&(o.need>0||o.tier===1));
  L.sort((p,q)=>p.tier-q.tier||(p.tier===1?q.v.d-p.v.d:p.st.dos-q.st.dos));
  return L;
}
function orderTable(L){return L.map(o=>[pcode(o.x),o.x.label,o.x.code,o.x.unit,o.st.t,o.q.b,Math.round(o.rate*30*10)/10,isFinite(o.st.dos)?Math.round(o.st.dos):'',o.need,o.boxes==null?'':o.boxes,o.val==null?'':Math.round(o.val),o.bad?'ราคาน่าสงสัย ตรวจก่อนสั่ง':'']);}
const ORD_H=['หมวด','รายการ','รหัส','หน่วย','สถานะ','คงเหลือ','จ่ายเฉลี่ย/เดือน','พอใช้(วัน)','แนะนำสั่ง(หน่วย)','≈หน่วยบรรจุ','มูลค่าโดยประมาณ(บาท)','หมายเหตุ'];
function dlCsv(name,hd,rows){
  const q=v=>'"'+String(v==null?'':v).replace(/"/g,'""')+'"';
  const t='\ufeff'+[hd].concat(rows).map(r=>r.map(q).join(',')).join('\r\n');
  try{const b=new Blob([t],{type:'text/csv;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500);return true;}catch(e){return false;}
}
function renderOrder(){
  const L=orderCalc(),show=S.ordAll?L:L.filter(o=>o.tier<3);
  const n1=L.filter(o=>o.tier===1).length,n2=L.filter(o=>o.tier===2).length,n3=L.filter(o=>o.tier===3).length;
  const tv=sum(show.map(o=>o.val||0)),nb=show.filter(o=>o.bad).length;
  headline($('#od-head'),n1?'bad':n2?'warn':'ok','<span class="hp-hl-t">รายการที่ควรสั่งซื้อ · '+esc(scopeName())+' · ยอดสิ้นเดือน '+esc(mlab(S.to-1))+'</span> <b class="up-bad">เร่งด่วน '+n1+' รายการ</b> (หมดสต็อกแต่ยังมีการจ่าย) · <b>ใกล้หมด '+n2+' รายการ</b>'+(n3?' · วางแผนสั่ง '+n3+' รายการ':'')+' · ประมาณการสั่งซื้อรวม <b>'+baht(tv)+' บาท</b>'+(nb?' (ยังไม่รวม '+nb+' รายการที่ราคาน่าสงสัย)':''));
  $('#od-ctl').innerHTML='<span class="hp-note">สั่งให้พอใช้</span><div class="hp-seg">'+[30,45,60,90].map(d=>'<button data-act="ordtgt" data-k="'+d+'" aria-pressed="'+(S.tgt===d)+'">'+d+' วัน</button>').join('')+'</div><button class="hp-chip" data-act="ordall" aria-pressed="'+S.ordAll+'">รวมรายการวางแผนสั่ง ('+n3+')</button><span class="hp-grow"></span><button class="hp-btn" data-act="ordcopy">คัดลอก (วางใน Excel)</button><button class="hp-btn" data-act="ordcsv">ดาวน์โหลด CSV</button><button class="hp-btn" data-act="print">พิมพ์</button>';
  $('#od-n').textContent='ปริมาณแนะนำ = (อัตราจ่ายเฉลี่ยต่อวัน × '+S.tgt+' วัน) − คงเหลือ ปัดขึ้น · '+rateNote()+' · เป็นข้อเสนอเริ่มต้นสำหรับเภสัชกรพิจารณา ยังไม่คำนึงถึงใบสั่งซื้อที่กำลังเข้า ระยะเวลารอของ วันหมดอายุ หรือโควตา · ยาสนับสนุนขอรับจากหน่วยงานอื่น ไม่ใช่การจัดซื้อเอง';
  const tn={1:['เร่งด่วน','b-bad'],2:['ใกล้หมด','b-warn'],3:['วางแผน','b-ok']};
  let t='<table><thead><tr><th>รายการ</th><th>หมวด</th><th>ระดับ</th><th>คงเหลือ</th><th>จ่ายเฉลี่ย/เดือน</th><th>พอใช้</th><th>แนะนำสั่ง</th><th>≈ หน่วยบรรจุ</th><th>มูลค่าโดยประมาณ</th></tr></thead><tbody>';
  show.forEach(o=>{const x=o.x;t+='<tr data-act="detail" data-id="'+x.id+'"><td class="nm">'+pcd(x)+esc(x.label)+dqBadge(x)+'<small>'+esc(x.code)+' · หน่วย '+esc(x.unit)+'</small></td><td>'+esc(pcode(x))+'</td><td><span class="hp-badge '+tn[o.tier][1]+'">'+tn[o.tier][0]+'</span></td><td>'+nf(o.q.b)+'</td><td>'+nf1(o.rate*30)+'</td><td>'+fdosH(o.st.dos)+'</td><td><b>'+nf(o.need)+'</b></td><td>'+(o.boxes==null?'—':nf(o.boxes)+' <small class="hp-mut">× '+nf(o.pk)+'</small>')+'</td><td>'+(o.val==null?'<span class="hp-mut">'+(o.bad?'ตรวจราคา':'—')+'</span>':nf(o.val)+' <small class="hp-mut">บาท</small>')+'</td></tr>';});
  $('#od-tbl').innerHTML=show.length?t+'</tbody></table>':'<div class="hp-empty">ไม่มีรายการที่ต้องสั่งตามเกณฑ์ในตัวกรองนี้</div>';
  const info=filt({pc:1,view:1}).map(x=>({x:x,v:agg([x],'v'),st:stat(x)})).filter(o=>o.st.k==='over'||o.st.k==='idle').sort((p,q)=>q.v.b-p.v.b).slice(0,8);
  $('#od-over').innerHTML=info.length?hbarsHtml(info.map(o=>({label:o.x.label,val:o.v.b,vtxt:baht(o.v.b)+' บาท · '+(o.st.k==='idle'?'ไม่เคลื่อนไหว':'ล้นสต็อก'),color:fcol('d'),warn:!!DQ[o.x.id],attr:'data-act="detail" data-id="'+o.x.id+'"',tip:o.x.label}))):'<div class="hp-empty">ไม่พบรายการล้นสต็อก/ไม่เคลื่อนไหว</div>';
  ORD_CACHE=show;
}
let ORD_CACHE=[];
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
  {const ao=$('#hp-asof');if(ao){const lm=MON[AV-1];ao.textContent=lm?'ยอดสิ้นเดือน '+lm.full+' '+lm.year+' (มีข้อมูล '+AV+' เดือนในปีงบนี้)':'—';}}
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
function scopeName(){return (S.pc==='ALL'?'ทุกหมวด':pcBy[S.pc].short)+' · '+viewName()+(S.excl?' · ไม่รวมรายการราคาน่าสงสัย':'');}
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
  {const ex=$('#hp-excl');if(ex){ex.setAttribute('aria-pressed',String(S.excl));$('#hp-excl-n').textContent=Object.keys(DQ).length;}}
  const rows=scope(),a=agg(rows);
  $('#hp-ctx').innerHTML='กำลังดู: <b>'+esc(scopeName())+'</b> · <b>'+esc(rangeLabel())+'</b> · '+(S.m==='q'?'ปริมาณหน่วย <b>'+esc(S.unit)+'</b>':'มูลค่า')+' · คงเหลือ <b>'+fmtM(a.b)+' '+unitTxt()+'</b> · '+cntTxt(rows)+(S.m==='q'?' <span class="hp-unitnote">(ปริมาณรวมได้เฉพาะรายการที่หน่วยนับเดียวกัน)</span>':'');
  ['overview','order','cats','groups','abc','items','alerts'].forEach(t=>{$('#hp-'+t).hidden=S.tab!==t;});
  heroRender(rows,a);
}
function tankHtml(a){
  const tot=a.o+a.r,lvl=tot>0?Math.max(.04,Math.min(1,a.b/tot)):0,pc=Math.round(lvl*100);
  const ni=a.r>0&&tot>0?Math.max(1,Math.min(6,Math.round(a.r/tot*8))):0,no=a.d>0&&tot>0?Math.max(1,Math.min(6,Math.round(a.d/tot*8))):0;
  let dr='';for(let i=0;i<ni;i++)dr+='<circle class="hp-dr" cx="'+(56+(i%3)*4)+'" cy="12" r="3" style="--dl:'+(i*.28).toFixed(2)+'s;fill:'+fcol('r')+'"/>';
  let dd='';for(let i=0;i<no;i++)dd+='<circle class="hp-do" cx="'+(104+(i%2)*3)+'" cy="136" r="3" style="--dl:'+(i*.3).toFixed(2)+'s;fill:'+fcol('d')+'"/>';
  const W='M-30 8 q15 -9 30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 V140 H-30Z';
  return '<div class="hp-tank" role="img" aria-label="ถังสต็อก คงเหลือ '+pc+'% ของที่มีในช่วง (ยกมา+รับ)"><svg viewBox="0 0 120 160"><defs><clipPath id="hpTc"><rect x="30" y="30" width="60" height="110" rx="10"/></clipPath></defs>'+
    '<path d="M60 4 V30" stroke="var(--color-border-line)" stroke-width="5" fill="none" stroke-linecap="round"/>'+
    '<path d="M90 128 H104 V140" stroke="var(--color-border-line)" stroke-width="5" fill="none" stroke-linecap="round"/>'+
    '<g clip-path="url(#hpTc)"><g class="hp-liq" style="--lvl:'+(animNow&&!reduced()?0:lvl)+'" data-lvl="'+lvl+'"><g transform="translate(30 30)"><path class="hp-w2" d="'+W+'" style="fill:'+fcol('b')+';opacity:.35"/><path class="hp-w1" d="'+W+'" style="fill:'+fcol('b')+';opacity:.85"/></g>'+
    '<circle class="hp-bub" cx="46" cy="130" r="2.2" style="--dl:0s"/><circle class="hp-bub" cx="62" cy="132" r="1.6" style="--dl:1.1s"/><circle class="hp-bub" cx="76" cy="128" r="2" style="--dl:2s"/></g></g>'+
    '<rect x="30" y="30" width="60" height="110" rx="10" fill="none" stroke="var(--color-fg-muted)" stroke-width="2"/><path d="M38 40 V120" stroke="#fff" stroke-opacity=".5" stroke-width="3" stroke-linecap="round"/>'+
    dr+dd+'<text x="60" y="92" text-anchor="middle" class="hp-tpc">'+pc+'%</text></svg><span class="hp-tcap">คงเหลือ ÷ (ยกมา+รับ)</span></div>';
}
function liqGo(){requestAnimationFrame(()=>requestAnimationFrame(()=>{$$('#hp .hp-liq').forEach(g=>g.style.setProperty('--lvl',g.dataset.lvl));}));}
function critMark(){$$('#hp .hp-kpi.crit').forEach(k=>k.classList.remove('crit'));$$('#hp .hp-kpi').forEach(k=>{const l=k.querySelector('.l'),n=k.querySelector('.n');if(l&&n&&/^หมดสต็อก/.test(l.textContent)&&parseFloat(n.textContent.replace(/,/g,''))>0)k.classList.add('crit');});}
function heroRender(rows,a){
  const w=Math.min(420,Math.max(220,($('#hp-hero-n').clientWidth||320)));
  $('#hp-hero-n').innerHTML=tankHtml(a)+'<div class="hp-hn-t"><span class="l">'+esc(scopeName())+' · '+esc(rangeLabel())+' · คงเหลือ'+(S.m==='q'?' ('+esc(S.unit)+')':'')+'</span><span class="n">'+cnt('hero',a.b,S.m==='v'?'b':'n')+'<small>'+unitTxt()+'</small></span>'+flowStrip(a)+'</div>';
}

/* ---------- charts ---------- */
function flowChart(host,a,m){
  const W=Math.max(300,host.clientWidth||520),RH=W<520?46:54,H=4*RH+16;
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
  let cmp='';if(PREV&&PREV.d>0&&S.from===S.to){const dd2=(a.d-PREV.d)/PREV.d;cmp='<br><span class="hp-mut">เทียบเดือนก่อน: จ่าย '+(dd2>=0?'▲ +':'▼ ')+pct(Math.abs(dd2),0)+' ('+fmtM(PREV.d,m)+(m==='q'?' '+(S.unit||''):' บาท')+')</span>';}
  const dl=a.b-a.o,pc2=a.o>0?Math.abs(dl)/a.o:null,un=m==='q'?' '+(S.unit||''):' บาท';
  const sum2=a.o+a.r+a.d+a.b===0?'ไม่มีความเคลื่อนไหวในช่วงนี้':'ช่วงนี้ <b style="color:'+fcol('r')+'">รับ '+fmtM(a.r,m)+'</b> · <b style="color:'+fcol('d')+'">จ่าย '+fmtM(a.d,m)+'</b>'+un+' → '+(a.r>a.d?'รับมากกว่าจ่าย ':a.r<a.d?'จ่ายมากกว่ารับ ':'รับเท่ากับจ่าย ')+'คงเหลือ<b>'+(dl>0?'เพิ่มขึ้น ▲ ':dl<0?'ลดลง ▼ ':'เท่าเดิม ')+(dl?fmtM(Math.abs(dl),m)+un:'')+(pc2!=null&&dl?' ('+pct(pc2,0)+' ของยอดยกมา)':'')+'</b>';
  host.innerHTML='<p class="hp-sum2">'+sum2+cmp+'</p>'+s+'</svg>';
}
function trendChart(host,ser,m){
  const AVn=ser.length,n=Math.max(MON.length,AVn),W=Math.max(300,host.clientWidth||600),H=270;
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
    s+='<text class="hp-ax" x="'+(x(i)+x.bandwidth()/2).toFixed(1)+'" y="'+(H-8)+'" text-anchor="middle" style="font-weight:600;fill:var(--color-fg)">'+esc(MON[i].short)+'</text>';
  });
  for(let i=AVn;i<n;i++){s+='<rect x="'+(x(i)+x.bandwidth()*.2).toFixed(1)+'" y="'+(y(0)-3).toFixed(1)+'" width="'+(x.bandwidth()*.6).toFixed(1)+'" height="3" rx="1.5" style="fill:var(--cds-chart-grid)"/><text class="hp-ax" x="'+(x(i)+x.bandwidth()/2).toFixed(1)+'" y="'+(H-8)+'" text-anchor="middle" style="opacity:.45">'+esc(MON[i]?MON[i].short:'')+'</text>';}
  const pts=ser.map((d,i)=>[x(i)+x.bandwidth()/2,y(d.b)]);
  if(AVn>1)s+='<path class="hp-line" pathLength="1" d="'+d3.line()(pts)+'" fill="none" style="stroke:'+fcol('b')+'" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>';
  const mxI=ser.reduce((m2,d,i)=>d.b>ser[m2].b?i:m2,0);
  pts.forEach((p,i)=>{const lab=AVn<=4||i===0||i===AVn-1||i===mxI;s+='<circle class="hp-dot" style="--i:'+i+';fill:'+fcol('b')+'" cx="'+p[0].toFixed(1)+'" cy="'+p[1].toFixed(1)+'" r="4"/>'+(lab?'<text class="hp-ax" x="'+p[0].toFixed(1)+'" y="'+(p[1]-9).toFixed(1)+'" text-anchor="middle" style="fill:var(--color-fg);font-weight:600">'+(m==='v'?bahtS(ser[i].b):nf(ser[i].b))+'</text>':'');});
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
  let h='<table><thead><tr><th>หมวดสินค้า</th><th>รายการ (เคลื่อนไหว / ทั้งหมด)</th><th>ยกมา</th><th>รับ</th><th>จ่าย</th><th>คงเหลือ</th><th>สัดส่วนคงเหลือ</th><th>วันที่พอใช้</th></tr></thead><tbody>';
  const tot=agg(rows);
  PC.forEach(p=>{
    const rs=rows.filter(x=>x.pcat===p.code),a=agg(rs);
    h+='<tr data-act="pc" data-k="'+esc(p.code)+'"'+(S.pc===p.code?' class="sel"':'')+'><td title="'+esc(p.name)+'"><i class="pcd" style="--c:'+pcCol(p.code)+'"></i>'+esc(p.name)+'</td><td>'+nf(nAct(rs))+' <small class="hp-mut">/ '+nf(rs.length)+'</small></td>'+flowCells(a)+'<td>'+(tot.b?pct(a.b/tot.b,1):'—')+'</td><td>'+fdosH(dos(a))+'</td></tr>';
  });
  h+='<tr class="tot"><td>รวม</td><td>'+nf(nAct(rows))+' <small class="hp-mut">/ '+nf(rows.length)+'</small></td>'+flowCells(tot)+'<td>100%</td><td>'+fdosH(dos(tot))+'</td></tr></tbody></table>';
  host.innerHTML=h;
}

/* ---------- overview ---------- */
function renderOverview(){
  const rows=scope(),a=agg(rows),m=S.m,ser=mser(rows),dd=dos(a),tn=turn(a);
  const act=rows.filter(x=>agg([x],'q').d>0);
  const idleV=sum(rows.filter(x=>stat(x).k==='idle').map(x=>agg([x],'v').b));
  const out=rows.filter(x=>stat(x).k==='out').length,low=rows.filter(x=>stat(x).k==='low').length;
  {const ov=rows.filter(x=>stat(x).k==='over'),ovV=sum(ov.map(x=>agg([x],'v').b));
   const tile=(ic,c,n,t,sub)=>'<button class="hp-gc" style="border-top:3px solid '+c+'" data-act="tab" data-t="order"><span class="t">'+ic+' '+t+'</span><span class="v">'+nf(n)+' <small class="hp-mut">รายการ</small></span><span class="tp">'+sub+'</span></button>';
   $('#ov-glance').innerHTML='<h2 class="hp-gh">สรุปวันนี้ อ่านใน 10 วินาที</h2><div class="hp-grid">'+tile('✕','var(--color-bad)',out,'ต้องสั่งเร่งด่วน','หมดสต็อกแต่ยังมีการจ่าย · กดเพื่อดูรายการสั่งซื้อ')+tile('!','var(--color-warn)',low,'ใกล้หมด','พอใช้ไม่ถึง '+TH.low+' วัน')+tile('◆','var(--cds-chart-muted)',ov.length,'ล้นสต็อก','พอใช้เกิน '+TH.over+' วัน · มูลค่าคงเหลือ '+baht(ovV)+' บาท · ชะลอการสั่ง')+'</div>';}
  const diff=a.o+a.r-a.d-a.b;
  headline($('#ov-head'),out>0?'bad':'info','<span class="hp-hl-t">'+esc(scopeName())+' · '+esc(rangeLabel())+'</span> ยกมา <b>'+fmtM(a.o)+'</b> + รับ <b>'+fmtM(a.r)+'</b> − จ่าย <b>'+fmtM(a.d)+'</b> = คงเหลือ <b>'+fmtM(a.b)+'</b> '+unitTxt()+(dd!=null?' · สต็อกพอใช้ประมาณ <b>'+fdos(dd)+'</b> ตาม'+rateNote():'')+(out?' · <b class="up-bad">หมดสต็อกแต่ยังมีการจ่าย '+out+' รายการ</b>':'')+(Math.abs(diff)>0.5?' · <b class="up-bad">ตรวจสมการไม่ลงตัว '+nf(diff)+'</b>':''));
  const pa=aggPrev(rows,m);
  $('#ov-kpis').innerHTML=FLOW.map(f=>kpi(f.n+(f.k==='o'?' (ต้นช่วง)':f.k==='b'?' (ปลายช่วง)':' (รวมในช่วง)'),cnt('k'+f.k,a[f.k],m==='v'?'b':'n')+' <small>'+unitTxt()+'</small>',f.k==='o'?'ยอดยกมาเดือน '+esc(mlab(S.from-1)):f.k==='b'?'ยอดสิ้นเดือน '+esc(mlab(S.to-1)):nf(rows.filter(x=>{const q=agg([x],m);return q[f.k]>0;}).length)+' รายการที่มี'+f.n+(f.k==='o'?'':dlt(a[f.k],pa&&pa[f.k])))).join('');
  $('#ov-kpis2').innerHTML=
    kpi('วันที่สต็อกพอใช้',dd==null?'—':!isFinite(dd)?'—':cnt('dos',Math.round(dd),'n')+' <small>วัน</small>','คงเหลือ ÷ อัตราจ่ายต่อวัน · '+rateNote())+
    kpi('อัตราหมุนเวียน',tn==null?'—':nf1(tn)+' <small>ครั้ง/ปี</small>','จ่าย ÷ สต็อกเฉลี่ย ปรับเป็นต่อปี')+
    kpi('หมดสต็อก / ใกล้หมด',nf(out)+' <small>/ '+nf(low)+' รายการ</small>','หมดสต็อกแต่ยังจ่าย / พอใช้ไม่ถึง '+TH.low+' วัน')+
    kpi('ไม่เคลื่อนไหวแต่มีของ',baht(idleV)+' <small>บาท</small>','มูลค่าคงเหลือของรายการที่ไม่มีการจ่ายในช่วง');
  $('#ov-wf-h').textContent='ยกมา + รับ − จ่าย = คงเหลือ ('+(m==='v'?'มูลค่า':'ปริมาณ '+S.unit)+')';
  $('#ov-wf-n').textContent='ความยาวแท่งเทียบกันในหน่วยเดียวกัน · '+rangeLabel();
  PREV=S.from>1?ser[S.from-2]||null:null;
  flowChart($('#ov-wf'),a,m);
  $('#ov-trend-h').textContent='รับ จ่าย และคงเหลือรายเดือน';
  $('#ov-trend-n').textContent=AV<MON.length?'กรอบ '+MON.length+' เดือนของปีงบ · มีข้อมูล '+AV+' เดือน (เดือนที่เหลือเป็นช่องว่าง รอข้อมูลถัดไป) · แท่ง = รับ/จ่ายในเดือน เส้น = คงเหลือสิ้นเดือน':'แท่ง = รับ/จ่ายในเดือน เส้น = คงเหลือสิ้นเดือน · แท่งจาง = เดือนนอกช่วงที่เลือก';
  trendChart($('#ov-trend'),ser,m);
  $('#ov-trend-lg').innerHTML='<span style="--c:'+fcol('r')+'">รับ</span><span style="--c:'+fcol('d')+'">จ่าย</span><span class="ln" style="--c:'+fcol('b')+'">คงเหลือสิ้นเดือน</span>';
  $('#ov-pc-n').textContent='หน่วย: '+unitTxt()+' · แถบใต้วันที่พอใช้: แดง < '+TH.low+' · เขียว '+TH.low+'–'+TH.over+' · เหลือง > '+TH.over+' วัน · ตามตัวกรองกลุ่มโรค'+(S.m==='q'?' และหน่วยนับ '+S.unit:'')+'ที่เลือก · กดแถวเพื่อกรองเฉพาะหมวดนั้น';
  pcTable($('#ov-pc'));
  // groups
  const base=filt({pc:1,unit:1});
  const gsAll=GR().map(g=>{const rs=base.filter(x=>gk(x)===g.code);return {g:g,a:agg(rs),n:rs.length};}).filter(o=>o.n>0&&(o.a.b>0||o.a.d>0)).sort((p,q)=>q.a.b-p.a.b);
  const gs=gsAll.filter(o=>!isSupG(o.g)),gsS=gsAll.filter(o=>isSupG(o.g));
  $('#ov-grp-h').textContent='คงเหลือตามกลุ่ม'+(S.mode==='sym'?'อาการ':'โรค')+' (ยา)';
  $('#ov-grp-n').textContent='แท่งหนา = คงเหลือ · แท่งบาง = จ่ายในช่วง · กดเพื่อเลือกกลุ่ม'+(gsS.length?' · กลุ่มวัสดุ/เวชภัณฑ์มิใช่ยาดูในแท็บเทียบกลุ่ม':'');
  $('#ov-grp').innerHTML=lgd([['คงเหลือ',fcol('b')],['จ่ายในช่วง',fcol('d')]])+pairBars(gs.slice(0,8).map(o=>({label:o.g.short,b:o.a.b,d:o.a.d,attr:'data-act="view" data-k="'+esc(o.g.code)+'"',tip:o.g.name+'\nคงเหลือ '+fmtM(o.a.b)+' '+unitTxt()+'\nจ่าย '+fmtM(o.a.d)+'\nรับ '+fmtM(o.a.r)})));
  const top=rows.map(x=>({x:x,a:agg([x])})).filter(o=>o.a.b>0).sort((p,q)=>q.a.b-p.a.b).slice(0,10);
  $('#ov-top-h').textContent='10 รายการที่คงเหลือสูงสุด ('+(m==='v'?'มูลค่า':'ปริมาณ '+S.unit)+')';
  hbars($('#ov-top'),top.map(o=>({label:o.x.label,val:o.a.b,vtxt:fmtM(o.a.b)+' · จ่าย '+fmtM(o.a.d),color:col(1),warn:!!DQ[o.x.id],attr:'data-act="detail" data-id="'+o.x.id+'"',tip:o.x.label+(DQ[o.x.id]?'\n! ราคาต่อหน่วยน่าสงสัย':'')+'\nคงเหลือ '+fmtM(o.a.b)+' '+unitTxt()+'\nจ่าย '+fmtM(o.a.d)+'\nวันที่พอใช้ '+fdos(dos(o.a))})));
}

/* ---------- cats ---------- */
function renderCats(){
  const rows=filt({view:1}),m=S.m;
  const tv=agg(rows,'v');
  headline($('#ct-head'),'info','<span class="hp-hl-t">แยกตามหมวดสินค้า · '+esc(rangeLabel())+'</span> มูลค่าคงเหลือรวม <b>'+baht(tv.b)+' บาท</b> จ่ายในช่วง <b>'+baht(tv.d)+' บาท</b> รับ <b>'+baht(tv.r)+' บาท</b> · กลุ่ม: '+esc(viewName()));
  sankey($('#ct-sk'));heatmap($('#ct-hm'));renderRace();
  $('#ct-cards').innerHTML=PC.map((p,i)=>{
    const rs=rows.filter(x=>x.pcat===p.code),a=agg(rs,'v');
    const uq={};rs.forEach(x=>{const q=agg([x],'q');const u=uq[x.unit]=uq[x.unit]||{o:0,r:0,d:0,b:0};u.o+=q.o;u.r+=q.r;u.d+=q.d;u.b+=q.b;});
    const us=Object.keys(uq).filter(u=>uq[u].b>0||uq[u].d>0||uq[u].r>0).sort((x,y)=>uq[y].b-uq[x].b).slice(0,3);
    const empty=rs.length===0;
    return '<button class="hp-gc" style="--i:'+i+';border-top:4px solid '+pcCol(p.code)+';--pcc:'+pcCol(p.code)+'" data-act="pc" data-k="'+esc(p.code)+'" data-tip="'+esc(p.name+'\nกดเพื่อกรองเฉพาะหมวดนี้')+'"><span class="t">'+esc(p.name)+'</span>'+
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
  const gsA=GR().map(g=>{const rs=base.filter(x=>gk(x)===g.code);return {g:g,rs:rs,a:agg(rs),n:rs.length,na:nAct(rs)};}).filter(o=>o.n>0).sort((p,q)=>q.a.b-p.a.b);
  const dr=gsA.filter(o=>!isSupG(o.g)),su=gsA.filter(o=>isSupG(o.g));
  const topG=dr[0]||su[0];
  headline($('#gr-head'),'info','<span class="hp-hl-t">เทียบกลุ่ม'+(S.mode==='sym'?'อาการ':'โรค')+' · '+esc(S.pc==='ALL'?'ทุกหมวด':pcBy[S.pc].short)+' · '+esc(rangeLabel())+'</span> '+(topG&&all.b?'กลุ่มที่คงเหลือมากสุด: <b>'+esc(topG.g.short)+'</b> '+fmtM(topG.a.b)+' '+unitTxt()+' ('+pct(topG.a.b/all.b,0)+')':'ไม่มีข้อมูลในตัวกรองนี้'));
  $('#gr-tm-n').textContent='ขนาดพื้นที่ = '+(m==='v'?'มูลค่า':'ปริมาณ '+S.unit)+'คงเหลือ · สี = วันที่สต็อกพอใช้ (แดง < '+TH.low+' · เขียว '+TH.low+'–'+TH.over+' · เหลือง > '+TH.over+' · เทา = ไม่มีการจ่าย) · กรอบประ = กลุ่มวัสดุ/เวชภัณฑ์มิใช่ยา · กดเพื่อเลือกกลุ่ม';
  treemap($('#gr-tm'),gsA);
  $('#gr-bars-h').textContent='คงเหลือและจ่ายออกตามกลุ่ม'+(S.mode==='sym'?'อาการ':'โรค');
  $('#gr-n').textContent=(m==='v'?'มูลค่า (บาท)':'ปริมาณหน่วย '+S.unit)+' · แยกกลุ่มยากับกลุ่มวัสดุ/เวชภัณฑ์มิใช่ยา เพราะเทียบกันตรง ๆ ไม่ได้ · กดเพื่อเลือกกลุ่ม';
  const lim=S.grAll?1e9:12;
  const sect=(t,L,tot)=>L.length?'<h3 class="hp-sh">'+t+' <span class="hp-mut">'+L.length+' กลุ่ม · คงเหลือรวม '+fmtM(tot.b)+' '+unitTxt()+'</span></h3>'+pairBars(L.slice(0,lim).map(o=>({label:o.g.short,b:o.a.b,d:o.a.d,attr:'data-act="view" data-k="'+esc(o.g.code)+'"',tip:o.g.name+'\nคงเหลือ '+fmtM(o.a.b)+'\nจ่าย '+fmtM(o.a.d)}))):'';
  $('#gr-bars').innerHTML=(gsA.length?lgd([['คงเหลือ (แท่งหนา)',fcol('b')],['จ่ายในช่วง (แท่งบาง)',fcol('d')]]):'')+sect('กลุ่ม'+(S.mode==='sym'?'อาการ':'โรค')+' (ยา)',dr,agg(dr.reduce((a,o)=>a.concat(o.rs),[])))+sect('กลุ่มวัสดุ / เวชภัณฑ์มิใช่ยา',su,agg(su.reduce((a,o)=>a.concat(o.rs),[])))+((dr.length>12||su.length>12)?'<button class="hp-btn" data-act="grall">'+(S.grAll?'แสดงเฉพาะ 12 อันดับแรก':'แสดงทุกกลุ่ม')+'</button>':'')+(gsA.length?'':'<div class="hp-empty">ไม่มีข้อมูล</div>');
  $('#gr-tn').textContent='หน่วย: '+unitTxt()+' · ตามหมวดที่เลือก ('+(S.pc==='ALL'?'ทุกหมวด':pcBy[S.pc].name)+') · วันที่พอใช้ = คงเหลือ ÷ อัตราจ่ายต่อวัน (แดง < '+TH.low+' · เขียว '+TH.low+'–'+TH.over+' · เหลือง > '+TH.over+' วัน) · กดแถวเพื่อเลือกกลุ่ม';
  const row=o=>'<tr data-act="view" data-k="'+esc(o.g.code)+'"'+(S.view===o.g.code?' class="sel"':'')+'><td title="'+esc(o.g.name)+'">'+esc(o.g.name)+'</td><td>'+nf(o.na)+' <small class="hp-mut">/ '+nf(o.n)+'</small></td>'+flowCells(o.a)+'<td>'+(all.b?pct(o.a.b/all.b,1):'—')+'</td><td>'+fdosH(dos(o.a))+'</td></tr>';
  const subT=(t,L)=>{const rs=L.reduce((a,o)=>a.concat(o.rs),[]),a=agg(rs);return '<tr class="sub"><td>'+t+'</td><td>'+nf(nAct(rs))+' <small class="hp-mut">/ '+nf(rs.length)+'</small></td>'+flowCells(a)+'<td>'+(all.b?pct(a.b/all.b,1):'—')+'</td><td>'+fdosH(dos(a))+'</td></tr>';};
  let h='<table><thead><tr><th>กลุ่ม</th><th>รายการ (เคลื่อนไหว / ทั้งหมด)</th><th>ยกมา</th><th>รับ</th><th>จ่าย</th><th>คงเหลือ</th><th>สัดส่วนคงเหลือ</th><th>วันที่พอใช้</th></tr></thead><tbody>';
  if(dr.length)h+=subT('รวมกลุ่ม'+(S.mode==='sym'?'อาการ':'โรค')+' (ยา)',dr)+dr.map(row).join('');
  if(su.length)h+=subT('รวมกลุ่มวัสดุ / เวชภัณฑ์มิใช่ยา',su)+su.map(row).join('');
  h+='<tr class="tot"><td>รวมทั้งหมด</td><td>'+nf(nAct(base))+' <small class="hp-mut">/ '+nf(base.length)+'</small></td>'+flowCells(all)+'<td>100%</td><td>'+fdosH(dos(all))+'</td></tr></tbody></table>';
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
let DQ={},DQU={},PREV=null;
const PIECE=['ชิ้น','คู่','อัน','เม็ด','แคปซูล','ซอง'];
function dqCalc(){
  DQ={};DQU={};const a=S.from-1,b=S.to-1;
  const pr=x=>{for(let i=b;i>=a;i--){const P=[['bq','bv'],['dq','dv'],['rq','rv'],['oq','ov']];for(let j=0;j<P.length;j++){if(x[P[j][0]][i]>0&&x[P[j][1]][i]>0)return x[P[j][1]][i]/x[P[j][0]][i];}}return null;};
  const g={},gu={};D.forEach(x=>{x._p=pr(x);if(x._p){(g[x.pcat+'|'+x.unit]=g[x.pcat+'|'+x.unit]||[]).push(x._p);(gu[x.unit]=gu[x.unit]||[]).push(x._p);}});
  D.forEach(x=>{
    const r=[];
    if(x._p&&x._p>=200&&!/Adenosine|Filgrastim/i.test(x.label)){const L=(g[x.pcat+'|'+x.unit]||[]).length>=5?g[x.pcat+'|'+x.unit]:gu[x.unit]||[];const m=d3.median(L);
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
  const totB=sum(R.all.map(o=>o.bv)),totN=nAct(rows);
  const Nact=by.N.filter(o=>isAct(o.x)),Nempty=by.N.length-Nact.length;by.N=Nact;
  const risk=by.A.filter(o=>o.st.k==='out'||o.st.k==='low');
  const overCN=sum(by.C.concat(by.N).filter(o=>o.st.k==='over'||o.st.k==='idle').map(o=>o.bv));
  headline($('#ab-head'),risk.length?'bad':'info','<span class="hp-hl-t">ABC ตามมูลค่าจ่าย · '+esc(scopeName())+' · '+esc(rangeLabel())+'</span> กลุ่ม A มี <b>'+by.A.length+'</b> รายการ ('+(totN?pct(by.A.length/totN,0):'—')+' ของรายการทั้งหมด) แต่คิดเป็น 80% ของมูลค่าจ่าย'+(risk.length?' · <b class="up-bad">กลุ่ม A ที่หมด/ใกล้หมด '+risk.length+' รายการ</b>':' · กลุ่ม A ไม่มีรายการหมด/ใกล้หมด')+' · มูลค่าคงเหลือที่ล้นสต็อก/ไม่เคลื่อนไหวในกลุ่ม C และไม่มีการจ่าย <b>'+baht(overCN)+' บาท</b>');
  $('#ab-cards').innerHTML=['A','B','C','N'].map((k,i)=>{const L=by[k],dv=sum(L.map(o=>o.dv)),bv=sum(L.map(o=>o.bv)),a={b:bv,dk:sum(L.map(o=>o.v.dk)),dayk:L.length?L[0].v.dayk:30};
    return '<button class="hp-gc" style="--i:'+i+';border-top:3px solid '+ABCC[k]()+'" data-act="abcf" data-k="'+k+'" data-tip="'+esc(ABCN[k]+'\nกดเพื่อดูรายการ')+'"><span class="t">'+esc(ABCN[k])+'</span><span class="v">'+nf(L.length)+' <small class="hp-mut">รายการ ('+(totN?pct(L.length/totN,0):'—')+' ของรายการที่เคลื่อนไหว)</small></span><span class="fl"><span>มูลค่าจ่าย</span><span>'+baht(dv)+' บาท'+(R.tot?' ('+pct(dv/R.tot,0)+')':'')+'</span><span>มูลค่าคงเหลือ</span><span>'+baht(bv)+' บาท'+(totB?' ('+pct(bv/totB,0)+')':'')+'</span><span>วันที่พอใช้ (มูลค่า)</span><span>'+(k==='N'?'—':fdos(dos(a)))+'</span></span>'+(k==='N'&&Nempty?'<span class="hp-mut" style="font-size:.72rem">ยังมีอีก '+nf(Nempty)+' รายการที่ว่างทั้งช่วง (ไม่นับ)</span>':'')+'</button>';}).join('');
  $('#ab-pn').textContent='จัดชั้นตามมูลค่าที่จ่ายในช่วง '+rangeLabel()+' (ไม่ขึ้นกับตัวเลือกมูลค่า/ปริมาณ) · เรียงจากมูลค่าจ่ายมากไปน้อย แกนตั้ง = สัดส่วนสะสมของมูลค่าจ่าย · เส้นประ = 80% และ 95% · ความสูงแท่งใช้สเกลรากที่สอง (เพื่อให้เห็นรายการเล็ก) · ควรเลือกช่วง 3–12 เดือนเพื่อให้การจัดชั้นนิ่ง (ตอนนี้ช่วงสั้นอาจจัดชั้นต่างไปเมื่อมีข้อมูลมากขึ้น)';
  paretoChart($('#ab-par'),R.act);
  $('#ab-lg').innerHTML=['A','B','C'].map(k=>'<span style="--c:'+ABCC[k]()+'">'+k+'</span>').join('');
  $('#ab-seg').innerHTML=['A','B','C','N'].map(k=>'<button data-act="abcf" data-k="'+k+'" aria-pressed="'+(ABCF===k)+'">'+(k==='N'?'ไม่จ่าย':k)+' ('+by[k].length+')</button>').join('');
  const L=by[ABCF].slice().sort((p,q)=>ABCF==='N'?q.bv-p.bv:p.rank-q.rank);
  $('#ab-th').textContent='รายการชั้น '+(ABCF==='N'?'ไม่มีการจ่าย':ABCF)+' ('+nf(L.length)+')';
  $('#ab-tn').textContent=(ABCF==='A'?'รายการที่ควรดูแลใกล้ชิดที่สุด: ตรวจจุดสั่งซื้อและไม่ให้ขาด':ABCF==='C'?'รายการมูลค่าจ่ายต่ำ ลดความถี่ตรวจนับ/สั่งซื้อได้ แต่ระวังล้นสต็อก':ABCF==='N'?'มีรายการในรายงานแต่ไม่จ่ายเลย เรียงตามมูลค่าคงเหลือ':'')+' · กดแถวเพื่อดูรายเดือน · แสดงสูงสุด 100 รายการ';
  let h='<table><thead><tr><th>ชื่อ / ความแรง</th><th>หมวด</th><th>อันดับ</th><th>หน่วย</th><th>จ่าย</th><th>% สะสม</th><th>คงเหลือ</th><th>วันที่พอใช้</th><th>สถานะ</th></tr></thead><tbody>';
  L.slice(0,100).forEach(o=>{const x=o.x;h+='<tr data-act="detail" data-id="'+x.id+'"><td class="nm">'+pcd(x)+esc(x.label)+dqBadge(x)+'<small>'+esc(x.code)+'</small></td><td>'+esc(pcBy[x.pcat]?pcBy[x.pcat].short:'')+'</td><td>'+(o.rank?nf(o.rank):'—')+'</td><td class="u">'+esc(x.unit)+'</td><td>'+nf(o.q.d)+'<small>'+nf(o.dv)+' บาท</small></td><td>'+(o.cum==null?'—':pct(o.cum,1))+'</td><td>'+nf(o.q.b)+'<small>'+nf(o.bv)+' บาท</small></td><td>'+fdosH(o.st.dos)+'</td><td><span class="hp-badge '+o.st.c+'">'+o.st.t+'</span></td></tr>';});
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
  act.forEach((o,i)=>{const bh=Math.max(2,(H-28-12)*Math.sqrt(o.dv/act[0].dv)*.4);s+='<rect x="'+(x(o.rank)-bw/2).toFixed(1)+'" y="'+(H-28-bh).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+bh.toFixed(1)+'" style="fill:'+ABCC[o.cls]()+';opacity:.5"/>';});
  ['A','B','C'].forEach(k=>{const seg=act.filter(o=>o.cls===k);if(!seg.length)return;const pts=seg.map(o=>[x(o.rank),y(o.cum)]);const f=seg[0].rank>1?[[x(seg[0].rank-1),y(act[seg[0].rank-2].cum)]]:[[x(1),y(0)]];
    s+='<path class="hp-line" pathLength="1" d="'+d3.line()(f.concat(pts))+'" fill="none" style="stroke:'+ABCC[k]()+'" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>';});
  const step=(W-lm-12)/Math.max(1,n-1);
  act.forEach(o=>{s+='<rect x="'+(x(o.rank)-step/2).toFixed(1)+'" y="0" width="'+step.toFixed(1)+'" height="'+(H-24)+'" fill="transparent" data-tip="'+esc('อันดับ '+o.rank+' · '+o.x.label+'\nชั้น '+o.cls+' · มูลค่าจ่าย '+nf(o.dv)+' บาท\nสะสม '+pct(o.cum,1))+'"/>';});
  s+='<text class="hp-ax" x="'+((lm+W-12)/2)+'" y="'+(H-6)+'" text-anchor="middle">อันดับรายการ (1 = จ่ายเป็นมูลค่าสูงสุด) · แท่ง = มูลค่าจ่ายของรายการ (สเกลรากที่สอง)</text></svg>';
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
  let h='<table><thead><tr>'+th('label','ชื่อ / ความแรง')+th('pcat','หมวด')+th('cat','กลุ่ม')+th('unit','หน่วย')+'<th>ABC</th>'+th('oq','ยกมา')+th('rq','รับ')+th('dq','จ่าย')+th('bq','คงเหลือ')+th('dos','วันที่พอใช้')+th('st','สถานะ')+(AV>=2?'<th>แนวโน้มคงเหลือ</th>':'')+'</tr></thead><tbody>';
  list.slice(0,S.limit).forEach(o=>{
    const x=o.x,pcn=pcBy[x.pcat];
    h+='<tr data-act="detail" data-id="'+x.id+'"><td class="nm">'+pcd(x)+esc(x.label)+dqBadge(x)+'<small>'+esc(x.code)+'</small></td><td>'+esc(pcn?pcn.short:'')+'</td><td>'+esc(gshort(x))+'</td><td class="u">'+esc(x.unit)+'</td><td>'+(abcm[x.id]?'<span class="hp-badge" style="color:'+ABCC[abcm[x.id].cls]()+'">'+(abcm[x.id].cls==='N'?'-':abcm[x.id].cls)+'</span>':'')+'</td>'+
      ['o','r','d','b'].map(f=>'<td>'+nf(o[f+'q'])+'<small>'+nf(o[f+'v'])+'</small></td>').join('')+'<td>'+fdosH(o.st.dos)+'</td><td><span class="hp-badge '+o.st.c+'">'+o.st.t+'</span></td>'+(AV>=2?'<td>'+spark(x)+'</td>':'')+'</tr>';
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
  headline($('#al-head'),out.length?'bad':'ok','ควรเร่งดู: <b>'+out.length+'</b> รายการหมดสต็อกแต่ยังมีการจ่าย · <b>'+low.length+'</b> รายการพอใช้ไม่ถึง '+TH.low+' วัน · <b>'+over.length+'</b> รายการล้นสต็อก · <b>'+idle.length+'</b> รายการไม่เคลื่อนไหว');
  $('#al-h').textContent='สต็อกเสี่ยงและข้อสังเกต · '+scopeName()+' · '+rangeLabel();
  $('#al-n').textContent='ตัวชี้วัดคำนวณจาก'+' ('+rateNote()+(rateWin().k<3?' ยาที่จ่ายเป็นรอบหรือสั่งเป็นล็อตอาจถูกจัดผิด':'')+') ผลที่ได้เป็นสัญญาณให้ตรวจสอบต่อ ไม่ใช่ข้อสรุป'+' · เกณฑ์: ใกล้หมด < '+TH.low+' วัน, ล้นสต็อก > '+TH.over+' วัน, ไม่เคลื่อนไหว = มีของแต่ไม่จ่ายเลยในช่วง';
  const sm=[];
  sm.push(['bad','หมดสต็อกแต่ยังมีการจ่าย',out.length+' รายการ (เป็นยอดสิ้นเดือน '+mlab(S.to-1)+' ควรเทียบกับการสั่งซื้อที่กำลังเข้า)']);
  sm.push(['warn','พอใช้ไม่ถึง '+TH.low+' วัน',low.length+' รายการ']);
  sm.push(['warn','ล้นสต็อก (พอใช้เกิน '+TH.over+' วัน)',over.length+' รายการ มูลค่าคงเหลือรวม '+baht(overV)+' บาท']);
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
  h+=sec('พอใช้ไม่ถึง '+TH.low+' วัน','คงเหลือหารด้วยอัตราจ่ายต่อวันของช่วงที่เลือก เรียงจากน้อยไปมาก',lim(low).map(o=>alertCard('ใกล้หมด','b-warn',o.x,'คงเหลือ <b>'+nf(o.q.b)+' '+esc(o.x.unit)+'</b> พอใช้ประมาณ <b>'+nf(o.st.dos)+' วัน</b> (อัตราจ่ายเฉลี่ย '+nf(o.q.dk/o.q.dayk*30)+' '+esc(o.x.unit)+'/เดือน)')),low.length);
  h+=sec('ล้นสต็อก (พอใช้เกิน '+TH.over+' วัน)','มีการจ่ายแต่คงเหลือมากเมื่อเทียบกับอัตราจ่าย เรียงตามมูลค่าคงเหลือ อาจเป็นยาสั่งเป็นล็อตหรือใช้ตามฤดูกาล',lim(over).map(o=>alertCard('ล้นสต็อก','b-warn',o.x,'คงเหลือ <b>'+nf(o.q.b)+' '+esc(o.x.unit)+'</b> ('+nf(o.v.b)+' บาท) พอใช้ประมาณ <b>'+(isFinite(o.st.dos)?nf(o.st.dos)+' วัน':'—')+'</b> จ่าย '+nf(o.q.d)+' ในช่วง')),over.length);
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
  else if(a==='replay'){}
  else if(a==='motion'){MOTION_OFF=!MOTION_OFF;try{localStorage.setItem('stock-motion',MOTION_OFF?'off':'on');}catch(x){}motionSync();return;}
  else if(a==='excl'){S.excl=!S.excl;S.limit=80;}
  else if(a==='ordtgt'){S.tgt=+el.dataset.k;}
  else if(a==='ordall'){S.ordAll=!S.ordAll;}
  else if(a==='ordcopy'){copyText([ORD_H].concat(orderTable(ORD_CACHE)).map(r=>r.join('\t')).join('\n'),el);return;}
  else if(a==='ordcsv'){const ok=dlCsv('รายการสั่งซื้อแนะนำ-'+mlab(S.to-1).replace(/\s/g,'')+'.csv',ORD_H,orderTable(ORD_CACHE));if(!ok)copyText([ORD_H].concat(orderTable(ORD_CACHE)).map(r=>r.join('\t')).join('\n'),el);return;}
  else if(a==='method'){const f=$('#hp-methods');if(f){f.open=true;f.scrollIntoView({behavior:reduced()?'auto':'smooth',block:'start'});}return;}
  else if(a==='grall'){S.grAll=!S.grAll;}
  else if(a==='abcf'){ABCF=el.dataset.k;S.tab='abc';}
  else if(a==='togactive'){S.active=!S.active;}
  anim=(a==='tab'||a==='fy'||a==='replay')?'tab':'data';go();
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
  morphSnap();
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
  else if(S.tab==='order')renderOrder();
  countUps();liqGo();critMark();tabInd();thSync();ovMore();takeaways();glossPass();topBtn();morphApply();fxPass();
}
function redraw(){go();
  if(S.tab==='overview')renderOverview();else if(S.tab==='cats')renderCats();else if(S.tab==='groups')renderGroups();else if(S.tab==='abc')renderAbc();else if(S.tab==='items')renderItems();else if(S.tab==='order')renderOrder();else if(S.tab==='alerts')renderAlerts();
  countUps();liqGo();critMark();tabInd();thSync();ovMore();takeaways();glossPass();topBtn();morphApply();fxPass();}


/* ---- race: อันดับ 10 อันดับแรกรายเดือน + แถบเลื่อน + เล่นย้อนดู ---- */
let rcT=null;const RC={i:-1,k:'d',N:10};
function renderRace(){
  const host=$('#ct-race');if(!host)return;clearInterval(rcT);rcT=null;
  const rows=scope(),n=AV,key=RC.k==='d'?'dv':'bv';
  if(RC.i<0||RC.i>=n)RC.i=n-1;
  const fr=[];for(let i=0;i<n;i++){fr.push(rows.map(x=>({x:x,v:+x[key][i]||0})).filter(o=>o.v>0).sort((a,b)=>b.v-a.v).slice(0,RC.N));}
  const ids={};fr.forEach(f=>f.forEach(o=>{ids[o.x.id]=o.x;}));
  const mx=Math.max(1,...fr.map(f=>f.length?f[0].v:0));
  const col=RC.k==='d'?fcol('d'):fcol('b');
  const idl=Object.keys(ids);
  $('#rc-n').textContent=n>1?'เลื่อนแถบหรือกดเล่น เพื่อดูว่ายาตัวไหนขึ้นหรือตกอันดับในแต่ละเดือน · ความยาวแท่งใช้สเกลเดียวกันทุกเดือน':'ตอนนี้มีข้อมูล 1 เดือน จึงยังเลื่อนย้อนดูไม่ได้ · เมื่อมีเดือนถัดไปจะเล่นย้อนดูการขึ้นลงของอันดับได้';
  host.innerHTML='<div class="rc-ctl"><div class="hp-seg" role="group" aria-label="เกณฑ์จัดอันดับ"><button data-rk="d" aria-pressed="'+(RC.k==='d')+'">จ่าย (บาท)</button><button data-rk="b" aria-pressed="'+(RC.k==='b')+'">คงเหลือ (บาท)</button></div>'+
    '<button class="hp-btn" id="rc-play"'+(n>1?'':' disabled')+'>▶ เล่น</button><input type="range" id="rc-sl" min="0" max="'+Math.max(0,n-1)+'" value="'+RC.i+'"'+(n>1?'':' disabled')+' aria-label="เลือกเดือน"><span class="rc-m" id="rc-m"></span></div>'+
    lgd(PC.map(p=>[p.short,pcCol(p.code)]))+'<div class="rc-box" id="rc-box" style="height:'+(RC.N*30)+'px">'+idl.map(id=>{const x=ids[id];return '<div class="rc-row" data-id="'+esc(id)+'" style="--o:0;--y:'+RC.N+';--w:0;--rc:'+pcCol(x.pcat)+'"><span class="l" title="'+esc(x.label)+'">'+esc(x.label)+'</span><span class="t"><i></i></span><span class="v"></span></div>';}).join('')+'</div>';
  const box=$('#rc-box'),els={};$$('.rc-row',box).forEach(e=>{els[e.dataset.id]=e;});
  const show=i=>{
    RC.i=i;const f=fr[i]||[],pf=i>0?fr[i-1]:null,pr={};if(pf)pf.forEach((o,r)=>{pr[o.x.id]=r;});
    const inn={};f.forEach((o,r)=>{inn[o.x.id]=1;const e=els[o.x.id];e.style.setProperty('--y',r);e.style.setProperty('--o',1);e.style.setProperty('--w',(o.v/mx*100).toFixed(1));
      let d='';if(pf){if(pr[o.x.id]==null)d='<small class="rc-up">ใหม่</small>';else if(pr[o.x.id]>r)d='<small class="rc-up">▲'+(pr[o.x.id]-r)+'</small>';else if(pr[o.x.id]<r)d='<small class="rc-dn">▼'+(r-pr[o.x.id])+'</small>';}
      e.querySelector('.v').innerHTML=bahtS(o.v)+d;});
    Object.keys(els).forEach(id=>{if(!inn[id]){els[id].style.setProperty('--o',0);els[id].style.setProperty('--y',RC.N);}});
    $('#rc-m').textContent=mlab(i);const sl=$('#rc-sl');if(sl)sl.value=i;};
  show(RC.i);
  $$('[data-rk]',host).forEach(b=>b.addEventListener('click',()=>{RC.k=b.dataset.rk;renderRace();}));
  const pb=$('#rc-play'),sl=$('#rc-sl');
  const stop=()=>{clearInterval(rcT);rcT=null;if(pb)pb.textContent='▶ เล่น';};
  if(pb)pb.addEventListener('click',()=>{if(rcT){stop();return;}if(RC.i>=n-1)show(0);pb.textContent='⏸ หยุด';
    rcT=setInterval(()=>{if(!host.isConnected){stop();return;}if(RC.i>=n-1){stop();return;}show(RC.i+1);},reduced()?1400:1100);});
  if(sl)sl.addEventListener('input',()=>{stop();show(+sl.value);});
}

/* ---- morph: แท่ง/แผนที่ treemap เลื่อนไหลจากค่าเดิมไปค่าใหม่เมื่อกรอง/กดเลือก ---- */
let MSNAP=null,MTS=0;
function mKey(e,kind){const host=e.closest('[id]');const row=e.closest('.hp-hb,.hp-pb,.hp-tmg');
  const k=row?(row.getAttribute('data-k')||(row.querySelector('.hp-hb-l')||{}).textContent||''):'';
  const idx=e.parentElement?Array.prototype.indexOf.call(e.parentElement.children,e):0;
  return kind+'|'+(host?host.id:'')+'|'+k+'|'+idx;}
function morphSnap(){
  if(reduced()||!ready)return;const t=Date.now();if(MSNAP&&t-MTS<120)return;MTS=t;const m={};
  $$('#hp .hp-hb-t i, #hp .hp-pb-t i').forEach(e=>{const w=e.style.width;if(w)m[mKey(e,'b')]=w;});
  $$('#hp .hp-tmg rect').forEach(r=>{const g=r.closest('.hp-tmg');m[mKey(r,'t')+g.dataset.k]=[+r.getAttribute('x'),+r.getAttribute('y'),+r.getAttribute('width'),+r.getAttribute('height')];});
  MSNAP=Object.keys(m).length?m:null;}
function morphApply(){
  const rt=$('#hp');if(!MSNAP||reduced()||!rt||rt.classList.contains('go'))return;const m=MSNAP;
  const todo=[];
  $$('#hp .hp-hb-t i, #hp .hp-pb-t i').forEach(e=>{const w1=e.style.width;if(!w1)return;const k=mKey(e,'b');const w0=m[k]!=null?m[k]:(Object.keys(m).some(q=>q.indexOf('b|'+((e.closest('[id]')||{}).id||'')+'|')===0)?'0%':null);
    if(w0!=null&&w0!==w1){e.style.transition='none';e.style.animation='none';e.style.width=w0;todo.push(()=>{e.style.transition='width .9s cubic-bezier(.2,.8,.2,1)';e.style.width=w1;});}});
  $$('#hp .hp-tmg rect').forEach(r=>{const g=r.closest('.hp-tmg');const o=m[mKey(r,'t')+g.dataset.k];const n=[+r.getAttribute('x'),+r.getAttribute('y'),+r.getAttribute('width'),+r.getAttribute('height')];
    g.style.animation='none';r.style.transformBox='fill-box';r.style.transformOrigin='0 0';
    if(o&&(o[0]!==n[0]||o[1]!==n[1]||o[2]!==n[2]||o[3]!==n[3])){r.style.transition='none';r.style.transform='translate('+(o[0]-n[0])+'px,'+(o[1]-n[1])+'px) scale('+(o[2]/n[2]).toFixed(4)+','+(o[3]/n[3]).toFixed(4)+')';
      const tx=g.querySelectorAll('text');tx.forEach(x=>{x.style.opacity=0;});
      todo.push(()=>{r.style.transition='transform .85s cubic-bezier(.2,.8,.2,1)';r.style.transform='none';tx.forEach(x=>{x.style.transition='opacity .5s .55s';x.style.opacity=1;});});}
    else if(!o&&Object.keys(m).some(q=>q.indexOf('t|')===0)){r.style.transition='none';r.style.transform='scale(.4)';r.style.opacity=0;todo.push(()=>{r.style.transition='transform .7s cubic-bezier(.2,.8,.2,1),opacity .5s';r.style.transform='none';r.style.opacity='';});}});
  if(todo.length){void rt.offsetWidth;requestAnimationFrame(()=>requestAnimationFrame(()=>todo.forEach(f=>f())));}
}
/* ---- sankey: กดเส้นเพื่อล็อกและดูตัวเลข ---- */
document.addEventListener('click',e=>{
  const rb=e.target.closest&&e.target.closest('#hp .hp-rib');const host=$('#ct-sk');if(!host)return;
  if(!rb){if(e.target.closest&&e.target.closest('#ct-sk .sk-info'))return;if(host.contains(e.target))return;return;}
  const svg=rb.ownerSVGElement,was=rb.classList.contains('sel');
  $$('.hp-rib.sel',host).forEach(x=>x.classList.remove('sel'));
  let inf=$('.sk-info',host);if(!inf){inf=document.createElement('div');inf.className='sk-info';inf.setAttribute('role','status');host.appendChild(inf);}
  if(was){svg.classList.remove('has-sel');inf.hidden=true;}
  else{rb.classList.add('sel');svg.classList.add('has-sel');inf.hidden=false;inf.textContent=(rb.getAttribute('data-tip')||'').replace(/\n/g,' · ')+'  (กดอีกครั้งเพื่อยกเลิก)';}
});

/* ---- คำอธิบายศัพท์ (i), ข้อสรุปหนึ่งประโยคใต้กราฟ, ปุ่มกลับขึ้นบน ---- */
const GL={
 'วันที่สต็อกพอใช้':()=>'ถ้ายังจ่ายในอัตราเดิม ยาที่เหลือจะพอใช้อีกกี่วัน\n= คงเหลือ ÷ ปริมาณจ่ายเฉลี่ยต่อวัน\nน้อยกว่า '+TH.low+' วัน = ใกล้หมด · มากกว่า '+TH.over+' วัน = ล้นสต็อก',
 'อัตราหมุนเวียน':()=>'สต็อกถูกใช้ไปและเติมใหม่กี่รอบต่อปี\nสูง = ของหมุนเร็ว · ต่ำ = ของนอนนาน',
 'ABC':()=>'จัดยาเป็น 3 ชั้นตามมูลค่าที่จ่าย\nA = กลุ่มเล็กที่คิดเป็น 80% ของมูลค่า ต้องดูใกล้ชิดที่สุด\nB = ถัดไปจนถึง 95% · C = ที่เหลือ',
 'ยกมา':()=>'ยอดคงเหลือตอนต้นเดือน (ยกจากสิ้นเดือนก่อน)',
 'รับ':()=>'ยาที่รับเข้าคลังในช่วงที่เลือก',
 'จ่าย':()=>'ยาที่จ่ายออกจากคลังในช่วงที่เลือก',
 'คงเหลือ':()=>'ยอดที่เหลือในคลังตอนสิ้นช่วง\n= ยกมา + รับ − จ่าย',
 'ล้นสต็อก':()=>'มีของมากเกินที่ใช้: พอใช้นานกว่า '+TH.over+' วัน ควรชะลอการสั่ง',
 'ไม่เคลื่อนไหว':()=>'มีของเหลือในคลังแต่ไม่มีการจ่ายเลยในช่วงที่เลือก',
 'Sankey':()=>'อ่านจากซ้ายไปขวา: ยกมา/รับ → หมวด → จ่าย/คงเหลือ\nแถบกว้าง = มูลค่ามาก · กดเส้นเพื่อล็อกดูตัวเลข',
 'Treemap':()=>'ขนาดกล่อง = มูลค่าคงเหลือ\nสี = พอใช้กี่วัน (แดงน้อย · เขียวพอดี · เหลืองเกิน)',
 'Heatmap':()=>'ยิ่งสีเข้ม = เดือนนั้นจ่ายมาก',
 'พาเรโต':()=>'กราฟสะสม: ยาไม่กี่ตัวแรกคิดเป็นมูลค่าจ่ายส่วนใหญ่'
};
function glossPass(){
  $$('#hp .hp-kpi .l, #hp .hp-card>h2, #hp .hp-gc .t, #hp th').forEach(e=>{
    if(e.querySelector('.gl'))return;
    const t=(e.textContent||'').trim();let k=null;
    const f=t.split(/[\s(·]/)[0];
    if(GL[f])k=f;else Object.keys(GL).forEach(g=>{if(!k&&g.length>3&&t.indexOf(g)>=0)k=g;});
    if(!k)return;
    const b=document.createElement('button');b.type='button';b.className='gl';b.textContent='i';b.setAttribute('aria-label','อธิบายคำว่า '+k);
    b.dataset.tip='คำอธิบาย: '+k+'\n'+GL[k]();e.appendChild(b);});
}
function takeaways(){
  const rows=filt({view:1,unit:1});
  const P=PC.map(p=>{const rs=rows.filter(x=>x.pcat===p.code);return {p:p,a:agg(rs,'v')};}).filter(o=>o.a.o+o.a.r>0);
  const tot=sum(P.map(o=>o.a.o+o.a.r)),tD=sum(P.map(o=>o.a.d));
  const sk=$('#sk-t');
  if(sk){if(!tot)sk.textContent='';else{const top=P.slice().sort((a,b)=>(b.a.o+b.a.r)-(a.a.o+a.a.r))[0];
    sk.innerHTML='สรุป: <b>'+esc(top.p.name)+'</b> เป็นหมวดที่มีมูลค่ามากที่สุด ('+pct((top.a.o+top.a.r)/tot,0)+' ของยกมา+รับ) · จ่ายออกไป '+pct(tD/tot,0)+' ของทั้งหมด ที่เหลือคือคงเหลือในคลัง';}}
  const hm=$('#hm-t');
  if(hm){if(AV<2)hm.textContent='สรุป: มีข้อมูลเดือนเดียว ยังเทียบรายเดือนไม่ได้';else{
    let best=null;P.forEach(o=>{const rs=rows.filter(x=>x.pcat===o.p.code);for(let i=0;i<AV;i++){const v=sum(rs.map(x=>+x.dv[i]||0));if(!best||v>best.v)best={v:v,i:i,n:o.p.name};}});
    hm.innerHTML=best&&best.v>0?'สรุป: จ่ายสูงสุดในเดือน <b>'+esc(mlab(best.i))+'</b> หมวด <b>'+esc(best.n)+'</b> ('+baht(best.v)+' บาท)':'';}}
  const rc=$('#rc-t');
  if(rc){const k=RC.k==='d'?'dv':'bv';const arr=rows.map(x=>({x:x,v:+x[k][Math.min(RC.i<0?AV-1:RC.i,AV-1)]||0})).sort((a,b)=>b.v-a.v);const tt=sum(arr.map(o=>o.v));
    rc.innerHTML=arr.length&&tt>0?'สรุป: <b>'+esc(arr[0].x.label)+'</b> สูงสุด คิดเป็น '+pct(arr[0].v/tt,0)+' ของ'+(RC.k==='d'?'มูลค่าจ่าย':'มูลค่าคงเหลือ')+'ในเดือน '+esc(mlab(Math.min(RC.i<0?AV-1:RC.i,AV-1))):'';}
}
document.addEventListener('click',e=>{if(e.target.closest&&e.target.closest('.gl')){e.stopPropagation();e.preventDefault();}},true);
function topBtn(){
  if($('#fx-top'))return;const b=document.createElement('button');b.id='fx-top';b.type='button';b.textContent='↑';b.setAttribute('aria-label','กลับขึ้นบนสุด');b.hidden=true;
  b.addEventListener('click',()=>window.scrollTo({top:0,behavior:reduced()?'auto':'smooth'}));
  const r=$('#hp');if(r)r.appendChild(b);
  const u=()=>{b.hidden=(window.scrollY||document.documentElement.scrollTop)<700;};window.addEventListener('scroll',u,{passive:true});u();}
window.addEventListener('beforeprint',()=>{$$('#hp details').forEach(d=>{d.dataset.po=d.open?'1':'0';d.open=true;});});
window.addEventListener('afterprint',()=>{$$('#hp details').forEach(d=>{if(d.dataset.po==='0')d.open=false;});});
let ovInit=false;
function ovMore(){const d=$('#ov-more');if(!d||ovInit)return;ovInit=true;if(window.innerWidth<760)d.open=false;}
/* ---- fx: ลูกเล่น animation เพิ่มเติม (ปิดอัตโนมัติเมื่อผู้ใช้ตั้งลดการเคลื่อนไหว) ---- */
let fxIO=null,fxInit=false;
function fxOnce(){
  if(fxInit||reduced())return;fxInit=true;
  const root=$('#hp');if(!root)return;
  const bar=document.createElement('div');bar.className='fx-prog';bar.setAttribute('aria-hidden','true');root.prepend(bar);
  const upd=()=>{const h=document.documentElement,m=h.scrollHeight-h.clientHeight;bar.style.transform='scaleX('+(m>0?Math.min(1,(window.scrollY||h.scrollTop)/m):0)+')';};
  window.addEventListener('scroll',upd,{passive:true});upd();
  const hero=$('.hp-hero',root);
  if(hero){const w=document.createElement('div');w.className='fx-pills';w.setAttribute('aria-hidden','true');
    for(let i=0;i<7;i++){const e=document.createElement('i');e.style.cssText='--x:'+(8+i*13)+'%;--s:'+(0.7+((i*37)%5)/10)+';--d:'+(9+(i*5)%7)+'s;--dl:'+(-i*1.7)+'s;--c:'+(['a','b','c'][i%3]);w.appendChild(e);}
    hero.prepend(w);setTimeout(()=>w.classList.add('off'),16000);}
  if(window.matchMedia&&matchMedia('(hover:hover) and (pointer:fine)').matches){
    root.addEventListener('pointermove',e=>{
      const t=e.target.closest&&e.target.closest('.hp-kpi,.hp-card');if(!t)return;
      const r=t.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;
      t.style.setProperty('--mx',x+'px');t.style.setProperty('--my',y+'px');
      if(t.classList.contains('hp-kpi')){t.style.setProperty('--ry',((x/r.width-.5)*8).toFixed(2)+'deg');t.style.setProperty('--rx',((.5-y/r.height)*6).toFixed(2)+'deg');}
    },{passive:true});
    root.addEventListener('pointerout',e=>{const t=e.target.closest&&e.target.closest('.hp-kpi');if(t&&!t.contains(e.relatedTarget)){t.style.setProperty('--ry','0deg');t.style.setProperty('--rx','0deg');}},{passive:true});
  }
}
function fxPass(){
  if(reduced())return;fxOnce();
  $$('#hp .hp-rib').forEach((e,i)=>e.style.setProperty('--ri',i));
  $$('#hp table tbody tr').forEach((e,i)=>{if(i<40)e.style.setProperty('--ti',i);});
  if(!('IntersectionObserver' in window))return;
  if(fxIO)fxIO.disconnect();
  fxIO=new IntersectionObserver(es=>es.forEach(en=>{if(en.isIntersecting){en.target.classList.remove('rv0');en.target.classList.add('rvin');fxIO.unobserve(en.target);}}),{rootMargin:'0px 0px -8% 0px'});
  const vh=window.innerHeight||800;
  $$('#hp .hp-card').forEach(c=>{c.classList.remove('rv0','rvin');if(c.getBoundingClientRect().top>vh*0.95){c.classList.add('rv0');fxIO.observe(c);}});
}
let TH={low:30,over:180};
try{const t=JSON.parse(localStorage.getItem('stock-th')||'null');if(t&&t.low>=1&&t.low<=365&&t.over>t.low&&t.over<=1000)TH={low:Math.round(t.low),over:Math.round(t.over)};}catch(e){}
function tabBadge(){const b=$('#hp-tabs button[data-t=order]');if(!b)return;let n=0;try{filt({pc:1,view:1}).forEach(x=>{const k=stat(x).k;if(k==='out'||k==='low')n++;});}catch(e){}let t=b.querySelector('.tb');if(!t){t=document.createElement('b');t.className='tb';t.setAttribute('aria-hidden','true');b.appendChild(t);}t.textContent=n>99?'99+':String(n);t.hidden=!n;b.setAttribute('aria-label','สั่งซื้อวันนี้ '+n+' รายการ');}
function pdate(){const e=$('#hp-pdate');if(e)try{e.textContent=new Date().toLocaleDateString('th-TH',{day:'numeric',month:'long',year:'numeric'});}catch(x){}}
window.addEventListener('beforeprint',pdate);
function motionSync(){const r=$('#hp');if(r)r.classList.toggle('nomo',MOTION_OFF);const b=$('#hp .hp-keyb [data-act=motion]');if(b){b.setAttribute('aria-pressed',String(!MOTION_OFF));b.textContent=MOTION_OFF?'การเคลื่อนไหว: ปิด':'การเคลื่อนไหว: เปิด';}}
function thSync(){motionSync();pdate();tabBadge();$$('[data-th]').forEach(e=>{e.textContent=TH[e.dataset.th];});const a=$('#th-low'),b=$('#th-over');if(a&&document.activeElement!==a)a.value=TH.low;if(b&&document.activeElement!==b)b.value=TH.over;}
document.addEventListener('change',e=>{const id=e.target.id;if(id!=='th-low'&&id!=='th-over')return;
  let lo=+$('#th-low').value,ov=+$('#th-over').value;if(!(lo>=1&&lo<=365))lo=30;if(!(ov>lo&&ov<=1000))ov=Math.max(lo+1,180);
  TH={low:Math.round(lo),over:Math.round(ov)};try{localStorage.setItem('stock-th',JSON.stringify(TH));}catch(x){}anim='data';go();});
document.addEventListener('click',e=>{if(e.target.id==='th-reset'){TH={low:30,over:180};try{localStorage.removeItem('stock-th');}catch(x){}anim='data';go();}});
let lastW=window.innerWidth,rzT=null;
window.addEventListener('resize',()=>{tabInd();clearTimeout(rzT);rzT=setTimeout(()=>{if(!ready||window.innerWidth===lastW)return;lastW=window.innerWidth;anim=null;redraw();},180);});
window.addEventListener('orientationchange',()=>{setTimeout(()=>{lastW=-1;window.dispatchEvent(new Event('resize'));},250);});
document.addEventListener('touchstart',e=>{const t=$('#hp-tip');if(t&&!(e.target.closest&&e.target.closest('[data-tip]')))t.hidden=true;},{passive:true});
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('#hp-ftog');if(!b)return;const f=$('#hp-filters'),o=!f.classList.contains('open');f.classList.toggle('open',o);b.setAttribute('aria-expanded',String(o));b.querySelector('span').textContent=o?'ซ่อนตัวกรอง ▴':'ตัวกรอง ▾';});
dash.onData(render);
})();
