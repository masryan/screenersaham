// menu-search.js — kotak "Cari menu" di sidebar (#sidebarNav / #tabs).
// Pasang SETELAH extras.js di index.html:  <script src="menu-search.js"></script>
// Tidak mengubah app.js. Pintasan: tekan "/" untuk fokus, ↑/↓ memilih, Enter membuka, Esc menghapus.
// (Ctrl+K sudah dipakai palet perintah milik extras.js, jadi tidak dipakai di sini.)
// Sub-tab ikut dicari: Trader Tools (ExtrasAPI.tabs/go) dan Quant Hub (QuantHubAPI.tabs/go: Dashboard, Bandarmology, BPJS, BSJP, dst.).
(function(){
"use strict";
const tabs=document.getElementById("tabs");
if(!tabs||document.getElementById("menuSearchBox")) return;

// Kata kunci tambahan supaya menu ketemu lewat sinonim. Format: [regex terhadap "label data-tab", "kata kunci"]. Silakan tambah sendiri.
const ALIAS=[
  [/quant/i,"bsjp quant hub"],
  [/brokersum|broker summary/i,"net asing beli jual broker"],
  [/target/i,"bandar target harga"],
  [/eps|entry price/i,"entry price scanner"],
  [/brokerstalker|stalker/i,"broker pantau"],
  [/kraken|orca/i,"flow aliran dana"],
  [/smartpick|smart pick/i,"area demand throwback retest sinyal"],
  [/screener|fundamental/i,"filter saring scan"],
  [/rekap/i,"ringkasan preset"],
  [/bagger/i,"multibagger skor"],
  [/sektoral/i,"sektor industri"],
  [/cariticker|cari ticker/i,"emiten saham kode"],
  [/watchlist/i,"favorit pantauan"],
  [/portfolio|portofolio/i,"transaksi posisi"],
  [/chart|grafik/i,"candle harga"],
  [/panduan/i,"bantuan help cara pakai"],
  [/dashboard/i,"ringkasan"],
  [/backtest/i,"uji strategi"]
];

const css=document.createElement("style");
css.textContent=`
#menuSearchBox{position:relative;margin:0 0 8px;padding:0 2px}
#menuSearchBox input{width:100%;box-sizing:border-box;padding:8px 30px 8px 30px;border-radius:10px;border:1px solid var(--border,#374151);
  background:color-mix(in srgb, currentColor 6%, transparent);color:inherit;font:inherit;font-size:12.5px;outline:none}
#menuSearchBox input:focus{border-color:var(--teal,#14b8a6)}
#menuSearchBox .ms-ico{position:absolute;left:11px;top:17px;transform:translateY(-50%);font-size:12px;opacity:.6;pointer-events:none}
#menuSearchBox .ms-clr{position:absolute;right:8px;top:17px;transform:translateY(-50%);border:0;background:none;color:inherit;opacity:.6;cursor:pointer;font-size:14px;display:none;padding:2px 4px}
#menuSearchBox.has-q .ms-clr{display:block}
#menuSearchBox .ms-empty{display:none;padding:8px 4px 2px;font-size:12px;color:var(--muted,#9ca3af)}
#menuSearchBox.no-hit .ms-empty{display:block}
#menuSearchBox .ms-sub{margin-top:6px}
#menuSearchBox .ms-sub-h{font-size:10.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;opacity:.6;padding:4px 6px}
#menuSearchBox .ms-sub button{display:block;width:100%;text-align:left;border:0;background:none;color:inherit;font:inherit;font-size:12.5px;padding:7px 10px;border-radius:8px;cursor:pointer}
#menuSearchBox .ms-sub button:hover{background:color-mix(in srgb, currentColor 8%, transparent)}
#sidebarNav.collapsed #menuSearchBox{display:none}
#tabs .ms-hide{display:none!important}
.ms-hit{outline:2px solid var(--teal,#14b8a6);outline-offset:-2px;border-radius:8px}
`;
document.head.appendChild(css);

const box=document.createElement("div");
box.id="menuSearchBox";
box.innerHTML=`<span class="ms-ico">🔍</span><input type="search" id="menuSearchInput" placeholder="Cari menu…  ( / )" autocomplete="off" spellcheck="false" aria-label="Cari menu"><button type="button" class="ms-clr" aria-label="Hapus pencarian">✕</button><div class="ms-sub" id="menuSearchSub"></div><div class="ms-empty">Tidak ada menu yang cocok.</div>`;
tabs.parentNode.insertBefore(box,tabs);
const input=box.querySelector("input"), clr=box.querySelector(".ms-clr"), subBox=box.querySelector("#menuSearchSub");

const norm=s=>String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9\s]/g," ").replace(/\s+/g," ").trim();
const items=()=>[...tabs.querySelectorAll(".tab-btn")];
const textOf=b=>{ const raw=(b.textContent||"")+" "+(b.dataset.tab||"")+" "+(b.getAttribute("title")||"")+" "+(b.getAttribute("aria-label")||"");
  const extra=ALIAS.filter(a=>a[0].test(raw)).map(a=>a[1]).join(" "); return norm(raw+" "+extra); };

let saved=null, hits=[], cur=-1;   // hits = [{el,label,go}]; saved = grup yang aslinya diciutkan (dipulihkan saat pencarian dihapus)

function openGroups(){
  if(saved) return; saved=[];
  tabs.querySelectorAll(".tab-group.collapsed").forEach(g=>{ saved.push(g); g.classList.remove("collapsed"); });
}
function restoreGroups(){
  if(!saved) return;
  saved.forEach(g=>g.classList.add("collapsed")); saved=null;
}
function mark(i){
  hits.forEach(h=>h.el.classList.remove("ms-hit")); cur=i;
  if(hits[i]){ hits[i].el.classList.add("ms-hit"); if(hits[i].el.scrollIntoView) hits[i].el.scrollIntoView({block:"nearest"}); }
}
// Sumber sub-tab: tiap sumber = {title, api}. api.tabs() -> [[id,label],...], api.go(id) membuka.
const SUB_SOURCES=[
  {title:"🛠️ Trader Tools", api:()=>window.ExtrasAPI},
  {title:"⚡ Quant Hub",     api:()=>window.QuantHubAPI}
];
function subTabs(tokens){
  const out=[];
  SUB_SOURCES.forEach(src=>{
    const api=src.api(); if(!api||typeof api.tabs!=="function"||typeof api.go!=="function") return;
    let list=[]; try{ list=api.tabs(); }catch(e){}
    const head=norm(src.title);
    const found=list.filter(t=>{ const n=norm(t[1])+" "+head; return tokens.every(k=>n.includes(k)); });
    if(found.length) out.push({title:src.title,api,items:found});
  });
  return out;
}
function apply(){
  const q=norm(input.value), tokens=q?q.split(" "):[];
  box.classList.toggle("has-q",!!q);
  hits=[]; subBox.innerHTML="";
  const all=items();
  all.forEach(b=>{ b.classList.remove("ms-hit","ms-hide"); });
  tabs.querySelectorAll(".tab-group").forEach(g=>g.classList.remove("ms-hide"));
  if(!tokens.length){ restoreGroups(); box.classList.remove("no-hit"); cur=-1; return; }
  openGroups();
  all.forEach(b=>{
    if(getComputedStyle(b).display==="none") return;          // disembunyikan aplikasi sendiri (mis. WS Debug di luar Mode Lanjutan): biarkan
    const ok=tokens.every(k=>textOf(b).includes(k));
    if(ok) hits.push({el:b,label:norm((b.querySelector(".tab-label")||b).textContent),go:()=>b.click()}); else b.classList.add("ms-hide");
  });
  tabs.querySelectorAll(".tab-group").forEach(g=>{ if(!hits.some(h=>g.contains(h.el))) g.classList.add("ms-hide"); });
  const subs=subTabs(tokens);
  subs.forEach(src=>{
    const h=document.createElement("div"); h.className="ms-sub-h"; h.textContent=src.title; subBox.appendChild(h);
    src.items.forEach(t=>{ const bt=document.createElement("button"); bt.type="button"; bt.textContent=t[1]; subBox.appendChild(bt);
      const go=()=>{ clear(); src.api.go(t[0]); const sb=document.getElementById("sidebarNav"); if(sb) sb.classList.remove("nav-open"); };
      bt.addEventListener("click",go); hits.push({el:bt,label:norm(t[1]),go}); });
  });
  box.classList.toggle("no-hit",!hits.length);
  // hasil terbaik: label diawali kata pertama > label memuat kata pertama > sisanya
  const first=tokens[0], rank=h=>h.label.startsWith(first)?0:h.label.includes(first)?1:2;
  hits.sort((a,b)=>rank(a)-rank(b)); mark(hits.length?0:-1);
}
function clear(){ input.value=""; apply(); }

input.addEventListener("input",apply);
clr.addEventListener("click",()=>{ clear(); input.focus(); });
input.addEventListener("keydown",e=>{
  if(e.key==="Escape"){ if(input.value) clear(); else input.blur(); e.stopPropagation(); }
  else if(e.key==="ArrowDown"&&hits.length){ e.preventDefault(); mark((cur+1)%hits.length); }
  else if(e.key==="ArrowUp"&&hits.length){ e.preventDefault(); mark((cur-1+hits.length)%hits.length); }
  else if(e.key==="Enter"&&hits[cur]){ e.preventDefault(); const h=hits[cur]; input.blur(); if(h.el.classList.contains("tab-btn")) clear(); h.go(); }
});
// klik hasil menu: pulihkan dulu status grup supaya expandGroupForActiveTab() milik app.js yang menentukan grup aktif
tabs.addEventListener("click",e=>{ if(input.value&&e.target.closest(".tab-btn")) clear(); },true);
document.addEventListener("keydown",e=>{
  const t=e.target, typing=t&&(/^(input|textarea|select)$/i.test(t.tagName)||t.isContentEditable);
  if(e.key==="/"&&!typing&&!e.ctrlKey&&!e.metaKey&&!e.altKey){
    e.preventDefault();
    const sb=document.getElementById("sidebarNav"); if(sb&&sb.classList.contains("collapsed")){ const tg=document.getElementById("sidebarToggleBtn"); if(tg) tg.click(); }
    input.focus(); input.select();
  }
});
// menu yang ditambahkan script lain belakangan (mis. Trader Tools, Pattern Scan) ikut tersaring
new MutationObserver(()=>{ if(input.value) apply(); }).observe(tabs,{childList:true,subtree:true});
})();
