<script>
// Panel: tema, navegación, menús, avisos, calendario semanal y Drive
(function(){
  const $=id=>document.getElementById(id);
  const h=(tag,props,...kids)=>{const e=document.createElement(tag);if(props)for(const k in props){if(k==="class")e.className=props[k];else if(k.startsWith("on"))e[k]=props[k];else if(k==="text")e.textContent=props[k];else if(k==="html")e.innerHTML=props[k];else e.setAttribute(k,props[k])}e.append(...kids.filter(Boolean));return e};
  const MES=["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
  const DCORTO=["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];
  const ymd=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
  const store={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};

  // ---- tema ----
  const root=document.documentElement, mqLight=matchMedia("(prefers-color-scheme: light)");
  const eff=()=>root.dataset.theme||(mqLight.matches?"light":"dark");
  function themeUI(){const t=eff();$("th-dark").setAttribute("aria-pressed",t==="dark");$("th-light").setAttribute("aria-pressed",t==="light");$("m-theme").setAttribute("aria-checked",t==="dark")}
  function setTheme(t){root.dataset.theme=t;store.set("tema",t);themeUI()}
  const saved=store.get("tema");if(saved==="dark"||saved==="light")root.dataset.theme=saved;
  themeUI();mqLight.addEventListener("change",themeUI);
  $("th-dark").onclick=()=>setTheme("dark");$("th-light").onclick=()=>setTheme("light");
  $("m-theme").onclick=()=>setTheme(eff()==="dark"?"light":"dark");

  // ---- navegación lateral ----
  const navBtns=[...document.querySelectorAll("#nav .nb")];
  navBtns.forEach(b=>b.onclick=()=>{navBtns.forEach(x=>x.setAttribute("aria-current",x===b));const t=$(b.dataset.go);if(t)t.scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"start"})});

  // ---- menús (perfil y avisos) ----
  let openPop=null;
  function place(pop,btn){const r=btn.getBoundingClientRect();pop.style.position="fixed";pop.style.top=(r.bottom+8)+"px";pop.style.right=Math.max(16,innerWidth-r.right)+"px"}
  function toggle(pop,btn,force){const show=force!==undefined?force:pop.hidden;
    if(openPop&&openPop.pop!==pop){openPop.pop.hidden=true;openPop.btn.setAttribute("aria-expanded","false");openPop=null}
    pop.hidden=!show;btn.setAttribute("aria-expanded",show);if(show){place(pop,btn);openPop={pop,btn}}else openPop=null}
  $("me").onclick=e=>{e.stopPropagation();toggle($("menu"),$("me"))};
  $("bell").onclick=e=>{e.stopPropagation();toggle($("notif"),$("bell"))};
  $("sideset").onclick=e=>{e.stopPropagation();toggle($("menu"),$("me"),true)};
  $("sideapps").onclick=e=>{e.stopPropagation();toggle($("menu"),$("me"),true);$("conexiones").scrollIntoView({block:"nearest"})};
  document.addEventListener("click",e=>{if(openPop&&!openPop.pop.contains(e.target))toggle(openPop.pop,openPop.btn,false)});
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&openPop){const b=openPop.btn;toggle(openPop.pop,b,false);b.focus()}});
  addEventListener("resize",()=>{if(openPop)place(openPop.pop,openPop.btn)});
  const vozSync=()=>$("m-voz").setAttribute("aria-checked",$("voz").getAttribute("aria-pressed"));
  $("m-voz").onclick=()=>{$("voz").click();vozSync()};$("voz").addEventListener("click",()=>setTimeout(vozSync,0));vozSync();
  $("m-perm").onclick=async()=>{try{const p=window.claude&&await window.claude.use("permissions");if(p)await p.manage()}catch(e){}};

  // ---- datos del tablero (los publica el script de pendientes) ----
  let tasks=[], projects=[];
  const today=()=>ymd(new Date());
  window.onBoard=d=>{tasks=d.tasks;projects=d.projects;renderBell();renderCal()};
  const pname=t=>{const p=projects.find(p=>p.id===t.projectId);return p?p.name:"General"};

  function renderBell(){
    const td=today();
    const items=tasks.filter(t=>!t.done&&((t.due&&t.due<=td)||t.urgent)).sort((a,b)=>(a.due||"9")<(b.due||"9")?-1:1);
    $("belln").hidden=!items.length;$("belln").textContent=items.length>9?"9+":items.length;
    $("bell").setAttribute("aria-label",items.length?"Avisos: "+items.length+" requieren atención":"Avisos");
    $("nlist").replaceChildren(...(items.length?items.map(t=>{
      const why=t.due&&t.due<td?h("span",{class:"bad",text:"Vencida"}):t.due===td?h("span",{text:"Vence hoy"}):h("span",{text:"Urgente"});
      return h("div",{class:"nitem"},h("b",{text:t.text}),h("span",null,document.createTextNode(pname(t)+" · "),why))}):[h("div",{class:"nempty",text:"Nada urgente ni vencido. Todo en orden."})]));
  }

  // ---- calendario semanal ----
  // events: eventos con hora (vendrán de Google Calendar cuando se conecte): {title, start:Date, end:Date}
  let events=[], calConnected=false;
  const monday=d=>{const x=new Date(d.getFullYear(),d.getMonth(),d.getDate());const k=(x.getDay()+6)%7;x.setDate(x.getDate()-k);return x};
  let wk=monday(new Date()), sel=today();
  const H0=6,H1=21,ROW=48;
  $("calprev").onclick=()=>{wk.setDate(wk.getDate()-7);renderCal()};
  $("calnext").onclick=()=>{wk.setDate(wk.getDate()+7);renderCal()};
  function weekDays(){return Array.from({length:7},(_,i)=>{const d=new Date(wk);d.setDate(wk.getDate()+i);return d})}
  function dayTasks(key){const td=today();return tasks.filter(t=>!t.done&&t.due===key).concat(key===td?tasks.filter(t=>!t.done&&t.due&&t.due<td):[])}
  let didScroll=false;
  function renderCal(){
    const ds=weekDays(), td=today(), a=ds[0], b=ds[6];
    const inWeek=ds.some(d=>ymd(d)===td);
    $("caltitle").textContent=inWeek?new Date().getDate()+" de "+MES[new Date().getMonth()]:a.getMonth()===b.getMonth()?a.getDate()+" – "+b.getDate()+" de "+MES[a.getMonth()]:a.getDate()+" "+MES[a.getMonth()].slice(0,3)+" – "+b.getDate()+" "+MES[b.getMonth()].slice(0,3);
    if(!ds.some(d=>ymd(d)===sel))sel=inWeek?td:ymd(a);
    const grid=$("days"), kids=[h("div",{class:"corner"})];
    ds.forEach((d,i)=>{const k=ymd(d), has=dayTasks(k).length||events.some(e=>ymd(e.start)===k);
      const b=h("button",{type:"button",class:"dh"+(k===td?" today":"")+(k===sel?" sel":""),"aria-pressed":String(k===sel),"aria-label":DCORTO[i]+" "+d.getDate()},h("span",{text:DCORTO[i]}),h("b",{text:String(d.getDate())}),h("i",{class:has?"has":""}));
      b.onclick=()=>{sel=k;renderCal()};kids.push(b)});
    // fila de tareas con fecha
    kids.push(h("div",{class:"adl",text:"Tareas"}));
    const ad=h("div",{class:"allday"});
    ds.forEach(d=>{const k=ymd(d), list=dayTasks(k), col=h("div",{class:"adc"});
      list.slice(0,3).forEach(t=>col.append(h("span",{class:"tchip"+(t.due<td?" late":t.urgent?" urg":""),title:pname(t)+" · "+t.text,text:t.text})));
      if(list.length>3)col.append(h("span",{class:"tchip more",text:"+"+(list.length-3)+" más"}));
      ad.append(col)});
    kids.push(ad);
    // horas
    const hrs=h("div",{class:"hours",id:"hours"});
    const lab=h("div");for(let x=H0;x<H1;x++)lab.append(h("div",{class:"hrow hl",style:"border:0",text:(x%12||12)+(x<12?" am":" pm")}));hrs.append(lab);
    ds.forEach(d=>{const k=ymd(d), col=h("div",{class:"hcol"});for(let x=H0;x<H1;x++)col.append(h("div",{class:"hrow"}));
      events.filter(e=>ymd(e.start)===k).forEach((e,j)=>{const s=e.start.getHours()+e.start.getMinutes()/60, en=e.end?e.end.getHours()+e.end.getMinutes()/60:s+1;
        const top=Math.max(0,(s-H0)*ROW), ht=Math.max(28,(Math.min(H1,en)-Math.max(H0,s))*ROW-4);
        col.append(h("div",{class:"ev"+(j%2?" alt":""),style:"top:"+top+"px;height:"+ht+"px"},document.createTextNode(e.title),h("small",{text:hm(e.start)+(e.end?" – "+hm(e.end):"")})))});
      if(k===td){const n=new Date(), y=(n.getHours()+n.getMinutes()/60-H0)*ROW;if(y>0&&y<(H1-H0)*ROW)col.append(h("div",{class:"nowline",style:"top:"+y+"px"}))}
      hrs.append(col)});
    kids.push(hrs);
    if(!calConnected)kids.push(h("div",{class:"calempty"},h("span",{html:"<b>Google Calendar aún no está conectado.</b> Aquí verás tus citas y visitas de obra con su hora."}),Object.assign(h("button",{type:"button",class:"chipbtn",text:"Cómo conectarlo"}),{onclick:e=>{e.stopPropagation();toggle($("menu"),$("me"),true);$("howto-cal").scrollIntoView({block:"nearest"})}})));
    grid.replaceChildren(...kids);
    if(!didScroll){didScroll=true;const n=new Date().getHours();hrs.scrollTop=Math.max(0,(Math.min(Math.max(n-1,7),H1-5)-H0)*ROW)}
    // agenda del día (celular)
    const ag=$("agenda"), list=[];
    events.filter(e=>ymd(e.start)===sel).sort((x,y)=>x.start-y.start).forEach(e=>list.push(h("div",{class:"ag ev"},h("time",{text:hm(e.start)}),h("span",{class:"agt",text:e.title}))));
    dayTasks(sel).forEach(t=>list.push(h("div",{class:"ag"+(t.urgent?" urg":"")},h("time",{text:t.due<td?"Vencida":"Tarea"}),h("span",{class:"agt",text:t.text+" · "+pname(t)}))));
    if(!list.length)list.push(h("div",{class:"note",text:"Sin tareas con fecha para este día."}));
    if(!calConnected)list.push(h("div",{class:"note",text:"Conecta Google Calendar para ver también tus citas."}));
    ag.replaceChildren(...list);
  }
  const hm=d=>{const x=d.getHours(),m=String(d.getMinutes()).padStart(2,"0");return (x%12||12)+":"+m+(x<12?" am":" pm")};
  renderCal();setInterval(renderCal,60000);

  // ---- Google Drive ----
  const DRIVE="Google Drive";
  let mcp=null, unwatch=null, searchCtl=null, lastFiles=null;
  const ago=s=>{if(!s)return"";const d=(Date.now()-new Date(s))/864e5;return d<1/24?"hace un momento":d<1?"hace "+Math.round(d*24)+" h":d<30?"hace "+Math.round(d)+" d":d<365?"hace "+Math.round(d/30)+" mes"+(Math.round(d/30)>1?"es":""):"hace más de un año"};
  const FOLDER='<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h3.8l2 2.5h7.2A2.5 2.5 0 0 1 21 10v7.5a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z"/></svg>';
  function kind(f){const m=f.mimeType||"",x=(f.fileExtension||(f.title||"").split(".").pop()||"").toUpperCase().slice(0,4);
    if(m.endsWith(".folder"))return["f-folder",null,"Carpeta"];
    if(m==="application/pdf")return["f-pdf","PDF","PDF"];
    if(m.startsWith("image/"))return["f-img","IMG","Imagen"];
    if(m.includes("document")||m.includes("word"))return["f-doc","DOC","Documento"];
    if(m.includes("spreadsheet")||m.includes("excel"))return["f-img","XLS","Hoja de cálculo"];
    if(m.includes("presentation"))return["f-pdf","PPT","Presentación"];
    if(m.startsWith("video/"))return["f-doc","VID","Video"];
    return["f-other",x||"ARCH","Archivo"]}
  function showFiles(list,note){
    const box=$("files");
    if(!list.length){box.replaceChildren(h("div",{class:"dstate",text:note||"No hay archivos para mostrar."}));return}
    box.replaceChildren(...list.slice(0,7).map(f=>{const [c,lbl,tn]=kind(f);
      const ic=h("span",{class:"ficon "+c});if(lbl)ic.textContent=lbl;else ic.innerHTML=FOLDER;
      return h("a",{class:"file",href:f.viewUrl||"https://drive.google.com",target:"_blank",rel:"noopener"},ic,
        h("span",{style:"min-width:0"},h("span",{class:"fname",text:f.title||"Sin nombre"}),h("span",{class:"fmeta",text:tn+" · modificado "+ago(f.modifiedTime)})),h("span",{class:"fgo",text:"↗"}))}));
  }
  const ERRD={
    server_not_connected:"<b>Google Drive no está conectado.</b> Agrégalo en claude.ai → Ajustes → Conectores.",
    needs_reauth:"<b>Tu conexión con Drive venció.</b> Vuelve a conectarlo en claude.ai → Ajustes → Conectores.",
    not_in_manifest:"<b>Drive está desactivado para esta página.</b> Actívalo en Perfil → Permisos de esta página.",
    selection_required:"<b>Tienes más de una cuenta de Drive.</b> Elige cuál usar en el aviso de Claude.",
    blocked_by_policy:"Tu organización no permite usar Drive aquí.",
    server_unavailable:"Drive no respondió. Toca Actualizar en un momento.",
    not_granted:"Abre el tablero dentro de Claude para ver tu Drive.",
    capability_disabled:"Abre el tablero dentro de Claude para ver tu Drive."};
  function driveErr(err){const c=err&&err.code;
    const st={server_not_connected:["Sin conectar","warn"],needs_reauth:["Reconectar","warn"],not_in_manifest:["Desactivado","off"]}[c]||["Con problemas","warn"];
    $("st-drive").textContent=st[0];$("st-drive").className="st "+st[1];
    const keep=c==="server_unavailable"||c==="upstream_error";
    if(!keep||!lastFiles)$("files").replaceChildren(h("div",{class:"dstate",html:ERRD[c]||"No se pudo leer Drive. Toca Actualizar para intentarlo de nuevo."}));
    else $("dwhen").textContent="No se pudo actualizar; mostrando lo último.";
  }
  function watchRecent(){
    if(unwatch)unwatch();
    unwatch=mcp.watchTool(DRIVE,"list_recent_files",{pageSize:8,excludeContentSnippets:true},ev=>{
      if($("dq").value.trim())return;
      if(ev.type==="error")return driveErr(ev.error);
      const p=ev.result.payload, files=p&&Array.isArray(p.files)?p.files:[];
      lastFiles=files;$("st-drive").textContent="Conectado";$("st-drive").className="st ok";
      showFiles(files,"Aún no hay archivos recientes.");
      const at=ev.result.cache?ev.result.cache.storedAt:Date.now();$("dwhen").textContent="Recientes · actualizado "+ago(new Date(at).toISOString());
    },{refetchInterval:5*60*1000});
  }
  let dt=null;
  $("dq").addEventListener("input",()=>{clearTimeout(dt);dt=setTimeout(searchDrive,450)});
  async function searchDrive(){
    if(!mcp)return;const q=$("dq").value.trim();
    if(searchCtl)searchCtl.abort();
    if(!q){showFiles(lastFiles||[]);$("dwhen").textContent="Recientes";return}
    searchCtl=new AbortController();const ctl=searchCtl;
    $("files").replaceChildren(h("div",{class:"skel"}),h("div",{class:"skel"}));
    try{const r=await mcp.callTool(DRIVE,"search_files",{query:"title contains '"+q.replace(/\\/g,"\\\\").replace(/'/g,"\\'")+"'",pageSize:8,excludeContentSnippets:true},{signal:ctl.signal,cache:{staleTime:60000}});
      if(ctl!==searchCtl)return;const p=r.payload;showFiles(p&&Array.isArray(p.files)?p.files:[],"No encontré archivos con «"+q+"».");$("dwhen").textContent="Resultados para «"+q+"»";
    }catch(err){if(err&&err.code==="cancelled")return;if(ctl===searchCtl)driveErr(err)}
  }
  $("drefresh").onclick=async()=>{if(!mcp)return;$("dq").value="";try{await mcp.invalidate(DRIVE,"list_recent_files")}catch(e){watchRecent()}};
  (async()=>{
    mcp=window.claude?await window.claude.use("mcp"):null;
    if(!mcp){$("files").replaceChildren(h("div",{class:"dstate",html:ERRD.not_granted}));$("st-drive").textContent="No disponible";return}
    watchRecent();
  })();
  (async()=>{const s=window.claude?await window.claude.use("sample"):null;$("st-ai").textContent=s?"Activo":"No disponible";$("st-ai").className="st "+(s?"ok":"off")})();
})();
</script>
