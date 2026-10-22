/* shim: emulates the Claude Dashboard runtime (dash.*) and theme tokens for GitHub Pages */
(function(){
var css=':root{--color-fg:#1f2933;--color-fg-muted:#5b6672;--color-bg:#ffffff;--color-panel:#f6f8f9;--color-border-line:#d9dfe3;--color-ok:#1d7a4a;--color-warn:#a8650a;--color-bad:#c0392b;'+
'--font-anthropic-sans:system-ui,-apple-system,"Segoe UI",sans-serif;--font-anthropic-serif:Georgia,serif;'+
'--cds-gap-xs:4px;--cds-gap-sm:8px;--cds-gap-md:14px;--cds-gap-lg:20px;--cds-gap-xl:32px;--cds-pad-xs:6px;--cds-pad-sm:10px;--cds-pad-md:14px;--cds-pad-lg:20px;--cds-pad-xl:32px;--cds-radius:10px;'+
'--cds-font-size-caption:.8125rem;--cds-font-size-body:.9375rem;--cds-font-size-heading:1.25rem;--cds-font-size-title:1.75rem;'+
'--cds-chart-grid:rgba(31,41,51,.09);--cds-chart-axis:#9aa5ae;--cds-chart-reference:#8b97a1;--cds-chart-muted:#c3ccd3;'+
'--cds-surface-popover:#ffffff;--cds-border:#d0d7dc;--cds-shadow-popover:0 8px 24px rgba(0,0,0,.16);--cds-dur-slow:.5s;--cds-ease-out:cubic-bezier(.2,.8,.2,1)}'+
'@media(prefers-color-scheme:dark){:root{--color-fg:#e8edf0;--color-fg-muted:#9aa7b1;--color-bg:#15191c;--color-panel:#1d2327;--color-border-line:#2f383e;--color-ok:#5fc08a;--color-warn:#e0a64a;--color-bad:#f08a7e;'+
'--cds-chart-grid:rgba(232,237,240,.1);--cds-chart-axis:#6b7780;--cds-chart-reference:#8b97a1;--cds-chart-muted:#4a555d;--cds-surface-popover:#242b30;--cds-border:#3a444b;--cds-shadow-popover:0 8px 24px rgba(0,0,0,.5)}}'+
'html,body{margin:0;background:var(--color-bg);color:var(--color-fg);font-family:var(--font-anthropic-sans)}#dash-root{padding:clamp(12px,2.2vw,28px)}';
var st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
var fns=[];
window.dash={
  colors:['#00908f','#e9806a','#3f78b5','#d9a22b','#8a6bb8','#4f9d69','#c4577a','#7b8794'],
  data:function(id){var d=(window.DATA||{})[id];return d?{status:'ok',data:d,columns:[],meta:{}}:{status:'missing',data:[],columns:[],meta:{}};},
  onData:function(f){fns.push(f);},
  refresh:function(){}, params:{}, setParams:function(){}, resetParams:function(){}, setLink:function(){}
};
function fire(){fns.forEach(function(f){try{f();}catch(e){console.error(e);}});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(fire,0);});else setTimeout(fire,0);
/* offline cache */
if('serviceWorker' in navigator&&location.protocol.indexOf('http')===0){window.addEventListener('load',function(){navigator.serviceWorker.register('sw.js').catch(function(){});});}
})();
