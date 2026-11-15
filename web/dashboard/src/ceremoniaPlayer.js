/**
 * Ceremonia Player — private dashboard panel.
 * Editable simulation persisted in this browser; JSON export/import for backup.
 * No public route or guest-facing component.
 */
const KEY = "boda:ceremonia-player:v1";
const defaults = { duration:630, turns:5.8, speed:15, meetings:[.23,.47,.73,.94] };
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
const fmt=s=>String(Math.floor(s/60)).padStart(2,"0")+":"+String(Math.floor(s%60)).padStart(2,"0");
function load(){
  try { const v=JSON.parse(localStorage.getItem(KEY)); return { ...defaults,...v,meetings:Array.isArray(v?.meetings)?v.meetings:defaults.meetings }; }
  catch { return {...defaults}; }
}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
export function renderCeremoniaPlayer(host){
  if(!host || host.dataset.mounted==="yes") return;
  host.dataset.mounted="yes";
  let config=load(),elapsed=0,playing=false,last=0,frameId=0;
  host.innerHTML=`
  <div class="dashboard-section-heading"><div><p class="dashboard-eyebrow">Ceremonia · simulación privada</p><h2>🐚 Ceremonia Player</h2></div></div>
  <p>Dos caracoles independientes entrelazados. Las trayectorias y los encuentros son provisionales, pendientes de ensayo.</p>
  <div style="max-width:760px;margin:auto">
  <svg data-stage viewBox="0 0 360 340" role="img" aria-label="Trayectorias animadas de David y Aydé" style="display:block;width:100%;background:#f8f5ef;border-radius:14px">
   <text x="180" y="23" text-anchor="middle" fill="#475569" font-size="12">TORRE · LAGO DE CHAPALA</text>
   <path d="M73 49 Q5 102 20 252" stroke="#3b82f6" stroke-width="29" opacity=".2" fill="none"/>
   <path d="M287 49 Q355 102 340 252" stroke="#16a34a" stroke-width="29" opacity=".2" fill="none"/>
   <text x="26" y="65" fill="#2563eb" font-size="12">FR</text><text x="320" y="65" fill="#15803d" font-size="12">ES</text>
   <circle cx="180" cy="172" r="125" stroke="#94a3b8" stroke-dasharray="4 5" fill="none"/>
   <g data-paths></g><g data-people></g>
   <text x="180" y="328" text-anchor="middle" fill="#64748b" font-size="10">Invitados alrededor · Pierre en el sector FR</text>
  </svg>
  <div style="display:flex;justify-content:space-between;gap:12px;margin:12px 0"><span>🔵 David · 🟠 Aydé</span><strong data-clock>00:00</strong></div>
  <input data-scrub aria-label="Tiempo" type="range" min="0" max="630" value="0" step="1" style="width:100%">
  <div style="display:flex;flex-wrap:wrap;gap:8px;margin:12px 0">
   <button type="button" class="dashboard-button" data-play>▶ Reproducir</button>
   <button type="button" class="dashboard-button" data-reset>↺ Inicio</button>
   <button type="button" class="dashboard-button" data-back>−30 s</button>
   <button type="button" class="dashboard-button" data-next>+30 s</button>
  </div>
  <div style="display:flex;flex-wrap:wrap;gap:16px;margin:12px 0">
   <label>Duración <select data-duration><option value="600">10:00</option><option value="630">10:30</option><option value="660">11:00</option></select></label>
   <label>Vueltas <input data-turns type="number" min="3" max="10" step=".1" style="width:70px"></label>
   <label>Velocidad <select data-speed><option value="1">×1</option><option value="5">×5</option><option value="15">×15</option><option value="30">×30</option></select></label>
  </div>
  <h3>Encuentros / hitos de ensayo</h3>
  <p style="font-size:13px">Pulsa un hito para ir a ese momento. Puedes añadir o eliminar marcas; son tiempos de referencia, no cruces geométricos verificados.</p>
  <div data-milestones></div>
  <div style="display:flex;gap:8px;flex-wrap:wrap;margin:12px 0">
   <button type="button" class="dashboard-button" data-add>+ Marcar tiempo actual</button>
   <button type="button" class="dashboard-button" data-export>↓ Exportar JSON</button>
   <label class="dashboard-button" style="cursor:pointer">↑ Importar JSON <input data-import type="file" accept="application/json,.json" hidden></label>
  </div>
  <p data-status role="status" style="font-size:12px;color:#64748b">Guardado local en este navegador. Exporta JSON para conservar y compartir la configuración.</p>
  </div>`;
  const q=s=>host.querySelector(s),ns="http://www.w3.org/2000/svg";
  const el=(tag,attrs,parent)=>{const n=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);parent.appendChild(n);return n};
  let paths=[],dots=[],traces=[];
  function point(w,t){
    const a=(w===0?Math.PI:0)+(w===0?1:-1)*Math.PI*2*config.turns*t;
    const r=110*Math.pow(1-t,.9),cx=180+(w===0?-18:18)*(1-t);
    return {x:cx+r*Math.cos(a),y:172+r*Math.sin(a)};
  }
  function build(){
    q("[data-paths]").replaceChildren();q("[data-people]").replaceChildren();
    paths=[0,1].map(w=>Array.from({length:901},(_,i)=>point(w,i/900)));
    traces=[];dots=[];
    paths.forEach((p,w)=>{
      const color=w?"#d97706":"#3b82f6";
      const d=p.map((v,i)=>(i?"L":"M")+v.x.toFixed(2)+" "+v.y.toFixed(2)).join(" ");
      el("path",{d,fill:"none",stroke:color,"stroke-width":"1.6","stroke-opacity":".36"},q("[data-paths]"));
      traces.push(el("path",{fill:"none",stroke:color,"stroke-width":"3"},q("[data-paths]")));
      const g=el("g",{},q("[data-people]"));el("circle",{r:"9",fill:color,"fill-opacity":".22"},g);el("circle",{r:"5",fill:color,stroke:"white","stroke-width":"1.5"},g);
      el("text",{x:"11",y:"-11",fill:color,"font-size":"12","font-weight":"bold"},g).textContent=w?"Aydé":"David";dots.push(g);
    });
    draw();
  }
  function draw(){
    elapsed=clamp(elapsed,0,config.duration);const idx=Math.round(elapsed/config.duration*900);
    paths.forEach((p,w)=>{traces[w].setAttribute("d",p.slice(0,idx+1).map((v,i)=>(i?"L":"M")+v.x.toFixed(2)+" "+v.y.toFixed(2)).join(" "));const v=p[idx];dots[w].setAttribute("transform",`translate(${v.x} ${v.y})`)});
    q("[data-clock]").textContent=fmt(elapsed);q("[data-scrub]").value=String(Math.round(elapsed));
    if(elapsed>=config.duration&&playing)stop();
  }
  function save(){localStorage.setItem(KEY,JSON.stringify(config));q("[data-status]").textContent="Configuración guardada en este navegador. Exporta JSON como copia de seguridad."}
  function stop(){playing=false;cancelAnimationFrame(frameId);q("[data-play]").textContent="▶ Reproducir";last=0}
  function tick(ts){if(!playing)return;if(last)elapsed+=(ts-last)/1000*config.speed;last=ts;draw();if(playing)frameId=requestAnimationFrame(tick)}
  function milestones(){
    const parent=q("[data-milestones]");parent.replaceChildren();
    [...config.meetings].sort((a,b)=>a-b).forEach((t,i)=>{
      const row=document.createElement("div");row.style.cssText="display:flex;align-items:center;gap:8px;margin:6px 0";
      const go=document.createElement("button");go.type="button";go.className="dashboard-button";go.textContent=`✦ ${fmt(t*config.duration)}`;go.addEventListener("click",()=>{elapsed=t*config.duration;draw()});
      const del=document.createElement("button");del.type="button";del.textContent="×";del.setAttribute("aria-label","Eliminar marca");del.addEventListener("click",()=>{config.meetings=config.meetings.filter(v=>v!==t);save();milestones()});
      row.append(go,del);parent.append(row);
    });
  }
  q("[data-duration]").value=String(config.duration);q("[data-turns]").value=String(config.turns);q("[data-speed]").value=String(config.speed);q("[data-scrub]").max=String(config.duration);
  q("[data-play]").addEventListener("click",()=>{if(playing){stop();return}if(elapsed>=config.duration)elapsed=0;playing=true;last=0;q("[data-play]").textContent="Ⅱ Pausa";frameId=requestAnimationFrame(tick)});
  q("[data-reset]").addEventListener("click",()=>{elapsed=0;draw()});
  q("[data-back]").addEventListener("click",()=>{elapsed-=30;draw()});
  q("[data-next]").addEventListener("click",()=>{elapsed+=30;draw()});
  q("[data-scrub]").addEventListener("input",e=>{elapsed=Number(e.target.value);last=0;draw()});
  q("[data-duration]").addEventListener("change",e=>{const fraction=elapsed/config.duration;config.duration=Number(e.target.value);elapsed=fraction*config.duration;q("[data-scrub]").max=String(config.duration);save();milestones();draw()});
  q("[data-turns]").addEventListener("change",e=>{config.turns=clamp(Number(e.target.value)||defaults.turns,3,10);e.target.value=String(config.turns);save();build()});
  q("[data-speed]").addEventListener("change",e=>{config.speed=Number(e.target.value);save()});
  q("[data-add]").addEventListener("click",()=>{const t=elapsed/config.duration;if(!config.meetings.some(v=>Math.abs(v-t)<.005)){config.meetings.push(t);save();milestones()}});
  q("[data-export]").addEventListener("click",()=>{const blob=new Blob([JSON.stringify({version:1,...config},null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="ceremonia-player.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)});
  q("[data-import]").addEventListener("change",async e=>{const file=e.target.files?.[0];if(!file)return;try{const value=JSON.parse(await file.text());if(![600,630,660].includes(value.duration)||!Number.isFinite(value.turns)||value.turns<3||value.turns>10||![1,5,15,30].includes(value.speed)||!Array.isArray(value.meetings)||value.meetings.some(x=>typeof x!=="number"||x<0||x>1)||value.meetings.length>100)throw Error("Archivo no válido");stop();config={duration:value.duration,turns:value.turns,speed:value.speed,meetings:value.meetings};elapsed=0;q("[data-duration]").value=String(config.duration);q("[data-turns]").value=String(config.turns);q("[data-speed]").value=String(config.speed);q("[data-scrub]").max=String(config.duration);save();milestones();build()}catch(err){q("[data-status]").textContent="No se pudo importar: "+esc(err.message)}e.target.value=""});
  milestones();build();
}
