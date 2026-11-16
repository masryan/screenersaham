/* theme-picker.js — pilihan palet tema (disimpan di localStorage "ihsg_palette").
   Terpisah dari mode terang/gelap (tombol Gelap/Terang yang sudah ada). */
(function(){
  var KEY="ihsg_palette";
  var PALETTES=[
    {id:"indigo",nm:"Indigo",ds:"Bawaan, profesional",g:"linear-gradient(135deg,#4C5BFF,#6D3DF5)"},
    {id:"zamrud",nm:"Zamrud",ds:"Hijau-teal, tenang",g:"linear-gradient(135deg,#0E9F6E,#0B7A8A)"},
    {id:"samudra",nm:"Samudra",ds:"Biru laut",g:"linear-gradient(135deg,#0284C7,#2563EB)"},
    {id:"senja",nm:"Senja",ds:"Jingga ke mawar",g:"linear-gradient(135deg,#EA580C,#DB2777)"},
    {id:"ametis",nm:"Ametis",ds:"Ungu-magenta",g:"linear-gradient(135deg,#9333EA,#C026D3)"},
    {id:"grafit",nm:"Grafit",ds:"Netral, minim warna",g:"linear-gradient(135deg,#475569,#1E293B)"}
  ];
  function get(){try{return localStorage.getItem(KEY)||"indigo"}catch(e){return "indigo"}}
  function apply(id){
    var r=document.documentElement;
    if(id==="indigo")r.removeAttribute("data-palette");else r.setAttribute("data-palette",id);
    try{localStorage.setItem(KEY,id)}catch(e){}
    var meta=document.querySelector('meta[name="theme-color"]');
    if(meta){var ink=getComputedStyle(r).getPropertyValue("--ink").trim();if(ink)meta.setAttribute("content",ink)}
  }
  function build(){
    var actions=document.querySelector(".header-actions");
    if(!actions||document.getElementById("tpBtn"))return;
    var wrap=document.createElement("div");wrap.className="tp-wrap";
    var btn=document.createElement("button");
    btn.type="button";btn.id="tpBtn";btn.className="btn btn-outline";
    btn.setAttribute("aria-haspopup","true");btn.setAttribute("aria-expanded","false");
    btn.innerHTML='<span aria-hidden="true">\uD83C\uDFA8</span> Tema';
    var pop=document.createElement("div");
    pop.className="tp-pop";pop.id="tpPop";pop.setAttribute("role","radiogroup");pop.setAttribute("aria-label","Pilih tema warna");
    pop.innerHTML='<div class="tp-ttl">Tema warna</div>'+PALETTES.map(function(p){
      return '<button type="button" class="tp-opt" role="radio" data-p="'+p.id+'" aria-checked="false">'+
        '<span class="tp-sw" style="background:'+p.g+'"></span>'+
        '<span><div class="tp-nm">'+p.nm+'</div><div class="tp-ds">'+p.ds+'</div></span>'+
        '<span class="tp-chk" aria-hidden="true">\u2713</span></button>';
    }).join("");
    wrap.appendChild(btn);document.body.appendChild(pop);
    var anchor=document.getElementById("themeToggleBtn");
    actions.insertBefore(wrap,anchor||actions.firstChild);
    function mark(){var cur=get();pop.querySelectorAll(".tp-opt").forEach(function(o){o.setAttribute("aria-checked",o.dataset.p===cur?"true":"false")})}
    function close(){pop.classList.remove("on");btn.setAttribute("aria-expanded","false")}
    btn.addEventListener("click",function(e){e.stopPropagation();var on=pop.classList.toggle("on");btn.setAttribute("aria-expanded",on?"true":"false");mark()});
    pop.addEventListener("click",function(e){
      e.stopPropagation();var o=e.target.closest(".tp-opt");if(!o)return;
      apply(o.dataset.p);mark();
    });
    document.addEventListener("click",close);
    document.addEventListener("keydown",function(e){if(e.key==="Escape"){close();btn.focus()}});
    mark();
  }
  apply(get());
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",build);else build();
})();
