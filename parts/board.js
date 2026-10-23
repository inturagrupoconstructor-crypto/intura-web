<script>
(function(){
  const $=id=>document.getElementById(id);
  const h=(tag,props,...kids)=>{const e=document.createElement(tag);if(props)for(const k in props){if(k==="class")e.className=props[k];else if(k.startsWith("on"))e[k]=props[k];else if(k==="text")e.textContent=props[k];else if(k==="html")e.innerHTML=props[k];else e.setAttribute(k,props[k])}e.append(...kids.filter(Boolean));return e};
  const MESES=["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
  const DIAS=["domingo","lunes","martes","miércoles","jueves","viernes","sábado"];
  const now=new Date();
  $("today").textContent=DIAS[now.getDay()]+" "+now.getDate()+" "+MESES[now.getMonth()];
  const todayStr=()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")};
  const fmtDue=s=>{const [y,m,d]=s.split("-").map(Number);return d+" "+MESES[m-1]};
  const CHECK='<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5l3.2 3L13 4.5"/></svg>';
  const CHEV='<svg class="chev" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 2l4 4-4 4"/></svg>';

  // estado local de vista (por dispositivo)
  let openSet=new Set(), showDone=new Set();
  try{openSet=new Set(JSON.parse(localStorage.getItem("open")||"[]"))}catch(e){}
  const saveOpen=()=>{try{localStorage.setItem("open",JSON.stringify([...openSet]))}catch(e){}};
  // grupos desplegados (por defecto todos plegados, para ver el resumen)
  let gOpen=new Set();
  try{gOpen=new Set(JSON.parse(localStorage.getItem("gopen")||"[]"))}catch(e){}
  const saveG=()=>{try{localStorage.setItem("gopen",JSON.stringify([...gOpen]))}catch(e){}};
  const plural=(n,one,many)=>n+" "+(n===1?one:many);
  function groupToggle(key,name,summary,has){
    const open=gOpen.has(key);
    const b=h("button",{type:"button",class:"gtoggle","aria-expanded":String(open),html:CHEV});
    b.append(h("span",{class:"gname",text:name}),h("span",{class:"gcount"+(has?" has":""),text:summary}));
    b.onclick=()=>{open?gOpen.delete(key):gOpen.add(key);saveG();render()};
    return h("h2",null,b);
  }
  // avatar: la capa de la cabeza usa la misma imagen
  function cheer(){window.HUD&&HUD.pulse()}

  let db=null, groups=[], projects=[], tasks=[], ready={g:false,p:false,t:false};
  let urgent=false, armed=null, editing=null, editProj=null, editGroup=null, addingProj=null, addingGroup=false;

  function arm(key){armed=key;render();setTimeout(()=>{if(armed===key){armed=null;render()}},3000)}
  function notice(msg,err){$("notice").textContent=msg||"";$("notice").hidden=!msg;$("notice").classList.toggle("err",!!err)}
  async function run(p,msg){try{await p;notice("")}catch(e){notice((e&&e.code==="quota_exceeded")?"Tienes demasiados elementos guardados. Borra algunas tareas hechas.":msg+" Revisa tu conexión e inténtalo de nuevo.",true)}}
  const C=name=>db.collection(name);

  $("txt").addEventListener("input",()=>{$("addbtn").disabled=!$("txt").value.trim()||!db});
  $("urg").addEventListener("click",()=>{urgent=!urgent;$("urg").setAttribute("aria-pressed",urgent)});
  $("form").addEventListener("submit",e=>{e.preventDefault();
    const text=$("txt").value.trim();if(!text||!db)return;
    const projectId=$("proj").value||null;
    if(projectId){openSet.add(projectId);saveOpen();const pr=projects.find(p=>p.id===projectId);if(pr)gOpen.add(pr.groupId)}else gOpen.add("general");
    saveG();cheer();
    addTask(text,projectId,urgent,$("due").value||null);
    $("txt").value="";$("due").value="";urgent=false;$("urg").setAttribute("aria-pressed","false");$("addbtn").disabled=true;$("txt").focus();
  });
  function addTask(text,projectId,urg,due){run(C("tareas").add({text,projectId,urgent:!!urg,due,done:false,doneAt:null,createdAt:Date.now()}),"No se pudo guardar la tarea.")}

  const byCreated=(a,b)=>(a.createdAt||0)-(b.createdAt||0);
  function sortPending(a,b){
    if(!!b.urgent-!!a.urgent) return !!b.urgent-!!a.urgent;
    if(a.due&&b.due&&a.due!==b.due) return a.due<b.due?-1:1;
    if(!!a.due!==!!b.due) return a.due?-1:1;
    return byCreated(a,b);
  }

  function taskItem(t){
    const li=h("li",{class:"task"+(t.done?" done":"")+(t.urgent&&!t.done?" urg":"")});
    const c=h("button",{class:"check",type:"button","aria-label":t.done?"Marcar como pendiente":"Marcar como hecha",html:t.done?CHECK:""});
    c.onclick=()=>{if(!t.done)cheer();run(C("tareas").doc(t.id).update({done:!t.done,doneAt:t.done?null:Date.now()}),"No se pudo actualizar la tarea.")};
    const body=h("div",{class:"body"});
    if(editing===t.id){
      const inp=h("input",{class:"edit",id:"edit-"+t.id});inp.value=t.text;
      const save=()=>{if(editing!==t.id)return;editing=null;const v=inp.value.trim();if(v&&v!==t.text)run(C("tareas").doc(t.id).update({text:v}),"No se pudo guardar el cambio.");render()};
      inp.onkeydown=e=>{if(e.key==="Enter")save();if(e.key==="Escape"){editing=null;render()}};inp.onblur=save;
      body.append(inp);setTimeout(()=>inp.focus(),0);
    }else{
      const tx=h("div",{class:"text",text:t.text,title:"Toca para editar"});tx.onclick=()=>{if(!t.done){editing=t.id;render()}};body.append(tx);
    }
    const meta=h("div",{class:"meta"});
    if(t.urgent&&!t.done)meta.append(h("span",{class:"urgtag",text:"Urgente"}));
    if(t.due&&!t.done){const late=t.due<todayStr(),isT=t.due===todayStr();meta.append(h("span",{class:late||isT?"late":"",text:late?"Vencida · "+fmtDue(t.due):isT?"Vence hoy":"Para el "+fmtDue(t.due)}))}
    if(t.done&&t.doneAt){const d=new Date(t.doneAt);meta.append(h("span",{text:"Hecha el "+d.getDate()+" "+MESES[d.getMonth()]}))}
    if(meta.childNodes.length)body.append(meta);
    const k="t:"+t.id;
    const del=h("button",{type:"button",class:"del"+(armed===k?" confirm":""),"aria-label":"Borrar tarea",text:armed===k?"¿Borrar?":"✕"});
    del.onclick=()=>{if(armed===k){armed=null;run(C("tareas").doc(t.id).delete(),"No se pudo borrar la tarea.")}else arm(k)};
    li.append(c,body,del);return li;
  }

  function taskBlock(key,list,placeholder,projectId){
    const pend=list.filter(t=>!t.done).sort(sortPending), done=list.filter(t=>t.done).sort((a,b)=>(b.doneAt||0)-(a.doneAt||0));
    const box=h("div",{style:"display:grid;gap:8px"});
    if(pend.length)box.append(h("ul",null,...pend.map(taskItem)));
    else box.append(h("div",{class:"hint",text:"Sin tareas pendientes."}));
    if(placeholder!==null){
      const f=h("form",{class:"inline",autocomplete:"off"});const inp=h("input",{id:"add-"+key,placeholder:placeholder,maxlength:"300","aria-label":placeholder});
      f.append(inp,h("button",{class:"ghost",type:"submit",text:"Agregar"}));
      f.onsubmit=e=>{e.preventDefault();const v=inp.value.trim();if(!v)return;inp.value="";addTask(v,projectId,false,null)};
      box.append(f);
    }
    if(done.length){
      const open=showDone.has(key);
      const tg=h("button",{type:"button",class:"ghost donetoggle",text:(open?"Ocultar hechas":"Ver hechas")+" ("+done.length+")"});
      tg.onclick=()=>{open?showDone.delete(key):showDone.add(key);render()};box.append(tg);
      if(open){
        box.append(h("ul",null,...done.map(taskItem)));
        const ck="clear:"+key;const cl=h("button",{type:"button",class:"ghost "+(armed===ck?"armed":"danger"),text:armed===ck?"¿Borrar "+done.length+" hechas? Toca de nuevo":"Borrar hechas"});
        cl.onclick=async()=>{if(armed!==ck)return arm(ck);armed=null;for(const t of done){try{await C("tareas").doc(t.id).delete()}catch(e){notice("No se pudieron borrar todas las tareas hechas.",true);break}}};
        cl.style.justifySelf="start";box.append(cl);
      }
    }
    return box;
  }

  function projectCard(p){
    const list=tasks.filter(t=>t.projectId===p.id), pend=list.filter(t=>!t.done).length, open=openSet.has(p.id);
    const card=h("section",{class:"proj"+(open?" open":"")});
    const tg=h("button",{type:"button",class:"ptoggle","aria-expanded":String(open),html:CHEV});
    tg.append(h("span",{class:"pname",text:p.name}),h("span",{class:"pcount"+(pend?" has":""),text:pend?pend+" pendiente"+(pend>1?"s":""):"al día"}));
    tg.onclick=()=>{open?openSet.delete(p.id):openSet.add(p.id);saveOpen();render()};
    const more=h("button",{type:"button",class:"ghost","aria-label":"Editar proyecto",text:"⋯"});more.onclick=()=>{editProj=editProj===p.id?null:p.id;render()};
    card.append(h("div",{class:"phead"},tg,more));
    if(editProj===p.id){
      const inp=h("input",{id:"pname-"+p.id,"aria-label":"Nombre del proyecto"});inp.value=p.name;
      const sel=h("select",{class:"chip","aria-label":"Mover a grupo"});groups.forEach(g=>{const o=h("option",{value:g.id,text:"Grupo: "+g.name});if(g.id===p.groupId)o.selected=true;sel.append(o)});
      const save=h("button",{type:"button",class:"ghost",text:"Guardar"});
      save.onclick=()=>{const v=inp.value.trim();const upd={};if(v&&v!==p.name)upd.name=v;if(sel.value!==p.groupId)upd.groupId=sel.value;editProj=null;if(Object.keys(upd).length)run(C("proyectos").doc(p.id).update(upd),"No se pudo guardar el proyecto.");render()};
      inp.onkeydown=e=>{if(e.key==="Enter")save.onclick()};
      const k="p:"+p.id;
      const del=h("button",{type:"button",class:"ghost "+(armed===k?"armed":"danger"),text:armed===k?(list.length?"¿Borrar con sus "+list.length+" tareas?":"¿Borrar proyecto?"):"Borrar proyecto"});
      del.onclick=async()=>{if(armed!==k)return arm(k);armed=null;editProj=null;try{for(const t of list)await C("tareas").doc(t.id).delete();await C("proyectos").doc(p.id).delete()}catch(e){notice("No se pudo borrar el proyecto. Revisa tu conexión.",true)}};
      card.append(h("div",{class:"pedit"},inp,sel,save,del));
    }
    if(open)card.append(h("div",{class:"pbody"},taskBlock(p.id,list,"Agregar tarea a "+p.name+"…",p.id)));
    return card;
  }

  function groupSection(g){
    const gopen=gOpen.has(g.id);
    const sec=h("section",{class:"group"+(gopen?" open":"")});
    const projs=projects.filter(p=>p.groupId===g.id).sort(byCreated);
    const gpend=tasks.filter(t=>!t.done&&projs.some(p=>p.id===t.projectId)).length;
    const title=editGroup===g.id?null:groupToggle(g.id,g.name,plural(projs.length,"proyecto","proyectos")+" · "+(gpend?plural(gpend,"pendiente","pendientes"):"al día"),gpend>0);
    const acts=h("div",{class:"acts"});
    const addP=h("button",{type:"button",class:"ghost",text:"+ Proyecto"});addP.onclick=()=>{addingProj=addingProj===g.id?null:g.id;if(addingProj){gOpen.add(g.id);saveG()}render()};
    const ed=h("button",{type:"button",class:"ghost","aria-label":"Editar grupo",text:"⋯"});ed.onclick=()=>{editGroup=editGroup===g.id?null:g.id;render()};
    acts.append(addP,ed);
    const head=h("div",{class:"ghead"});
    if(editGroup===g.id){
      const inp=h("input",{id:"gname-"+g.id,"aria-label":"Nombre del grupo"});inp.value=g.name;
      const save=h("button",{type:"button",class:"ghost",text:"Guardar"});
      save.onclick=()=>{const v=inp.value.trim();editGroup=null;if(v&&v!==g.name)run(C("grupos").doc(g.id).update({name:v}),"No se pudo renombrar el grupo.");render()};
      inp.onkeydown=e=>{if(e.key==="Enter")save.onclick()};
      const k="g:"+g.id, nt=tasks.filter(t=>projs.some(p=>p.id===t.projectId)).length;
      const del=h("button",{type:"button",class:"ghost "+(armed===k?"armed":"danger"),text:armed===k?(projs.length?"¿Borrar grupo, "+projs.length+" proyectos y "+nt+" tareas?":"¿Borrar grupo?"):"Borrar grupo"});
      del.onclick=async()=>{if(armed!==k)return arm(k);armed=null;editGroup=null;try{for(const p of projs){for(const t of tasks.filter(t=>t.projectId===p.id))await C("tareas").doc(t.id).delete();await C("proyectos").doc(p.id).delete()}await C("grupos").doc(g.id).delete()}catch(e){notice("No se pudo borrar el grupo. Revisa tu conexión.",true)}};
      head.append(h("div",{class:"inline",style:"flex:1"},inp,save,del));
    }else head.append(title,acts);
    sec.append(head);
    if(addingProj===g.id){
      const f=h("form",{class:"inline",autocomplete:"off"});const inp=h("input",{id:"newproj-"+g.id,placeholder:"Nombre del proyecto nuevo","aria-label":"Nombre del proyecto nuevo",maxlength:"120"});
      f.append(inp,h("button",{class:"ghost",type:"submit",text:"Crear"}));
      f.onsubmit=async e=>{e.preventDefault();const v=inp.value.trim();if(!v)return;addingProj=null;render();
        try{const ref=await C("proyectos").add({name:v,groupId:g.id,createdAt:Date.now()});openSet.add(ref.id);saveOpen();render()}catch(e){notice("No se pudo crear el proyecto.",true)}};
      sec.append(f);setTimeout(()=>{const el=$("newproj-"+g.id);if(el&&document.activeElement!==el)el.focus()},0);
    }
    if(!gopen)return sec;
    if(projs.length)projs.forEach(p=>sec.append(projectCard(p)));
    else if(addingProj!==g.id)sec.append(h("div",{class:"hint",text:"Aún no hay proyectos. Toca “+ Proyecto” para crear el primero."}));
    return sec;
  }

  // ---- Asistente: saludo hablado, voz y preguntas ----
  const clock=()=>{const d=new Date();$("clock").textContent=String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0")};clock();setInterval(clock,20000);
  let voiceOn=true;try{voiceOn=localStorage.getItem("voz")!=="no"}catch(e){}
  const vozUI=()=>{$("voz").setAttribute("aria-pressed",voiceOn);$("vozlbl").textContent=voiceOn?"Voz activada":"Voz apagada";$("vozwave").style.opacity=voiceOn?1:.2};vozUI();
  const synth=window.speechSynthesis;let voice=null;
  function pickVoice(){if(!synth)return;const vs=synth.getVoices().filter(v=>/^es/i.test(v.lang));
    voice=["es-CO","es-MX","es-US","es-419","es-ES"].map(l=>vs.find(v=>v.lang.replace("_","-")===l)).find(Boolean)||vs[0]||null}
  if(synth){pickVoice();synth.onvoiceschanged=pickVoice}
  function speak(text,force){
    if(!synth||(!voiceOn&&!force))return false;
    try{synth.cancel();const u=new SpeechSynthesisUtterance(text);u.lang=voice?voice.lang:"es-CO";if(voice)u.voice=voice;u.rate=1.02;u.pitch=.85;
      u.onstart=()=>HUD.talk(true);u.onend=u.onerror=()=>HUD.talk(false);synth.speak(u);return true}catch(e){return false}
  }
  // escribe el texto letra por letra mientras las barras de voz se mueven
  let typing=0;
  function typeInto(el,text,numHi){
    const id=++typing;el.textContent="";const caret=h("span",{class:"caret"});
    if(matchMedia("(prefers-reduced-motion: reduce)").matches){fill(el,text,numHi);return}
    HUD.talk(true);let i=0;
    (function step(){if(id!==typing)return;i=Math.min(text.length,i+1+(Math.random()<.3?1:0));fill(el,text.slice(0,i),numHi);el.append(caret);
      if(i<text.length)setTimeout(step,28+Math.random()*30);else setTimeout(()=>{if(id===typing){caret.remove();if(!(synth&&synth.speaking))HUD.talk(false)}},700)})();
  }
  function fill(el,text,numHi){el.textContent="";if(!numHi){el.textContent=text;return}
    text.split(/(\d+)/).forEach((p,k)=>el.append(k%2?h("span",{class:"num",text:p}):document.createTextNode(p)))}

  let greeted=false, lastGreet="";
  function greeting(n){
    const hr=new Date().getHours(), saludo=hr<12?"Buenos días":hr<19?"Buenas tardes":"Buenas noches";
    return n===0?saludo+", ingeniero. No hay pendientes; todo está al día.":saludo+", ingeniero. Hay "+n+" pendiente"+(n>1?"s":"")+".";
  }
  function bubble(n){
    const urg=tasks.filter(t=>!t.done&&t.urgent).length, late=tasks.filter(t=>!t.done&&t.due&&t.due<todayStr()).length, hoy=tasks.filter(t=>!t.done&&t.due===todayStr()).length;
    const st=[h("span",{class:"on",html:"<b id=\"n\">"+n+"</b> pendiente"+(n===1?"":"s")})];
    if(urg)st.push(h("span",{class:"warn",text:urg+" urgente"+(urg>1?"s":"")}));
    if(late)st.push(h("span",{class:"warn",text:late+" vencida"+(late>1?"s":"")}));
    if(hoy)st.push(h("span",{class:"on",text:hoy+" vence"+(hoy>1?"n":"")+" hoy"}));
    $("stats").replaceChildren(...st);
    if(!(ready.g&&ready.p&&ready.t))return;
    const msg=greeting(n);if(msg===lastGreet)return;lastGreet=msg;
    if(!greeted){greeted=true;typeInto($("say"),msg,true);speak(msg)}else fill($("say"),msg,true);
  }
  $("voz").onclick=()=>{voiceOn=!voiceOn;try{localStorage.setItem("voz",voiceOn?"si":"no")}catch(e){}vozUI();if(voiceOn)speak(lastGreet||$("say").textContent);else if(synth)synth.cancel()};
  $("hud").onclick=()=>{HUD.pulse();speak(lastGreet||$("say").textContent,true)};

  // preguntas sobre las obras: Claude lee los datos del tablero y devuelve respuesta + ids de tareas
  let sample=null, askCtl=null, ansIds=null;
  $("q").addEventListener("input",()=>{$("askbtn").disabled=!$("q").value.trim()||!!askCtl});
  $("aclose").onclick=()=>{if(askCtl)askCtl.abort();$("answer").hidden=true;ansIds=null;typing++;HUD.think(false);HUD.talk(false)};
  function boardData(){
    const known=new Set(projects.map(p=>p.id));
    const tk=t=>{const o={id:t.id,tarea:t.text,estado:t.done?"hecha":"pendiente"};if(t.urgent&&!t.done)o.urgente=true;if(t.due)o.fecha_limite=t.due;if(t.done&&t.doneAt)o.hecha_el=new Date(t.doneAt).toISOString().slice(0,10);return o};
    const list=arr=>{const p=arr.filter(t=>!t.done).sort(sortPending),d=arr.filter(t=>t.done).sort((a,b)=>(b.doneAt||0)-(a.doneAt||0)).slice(0,12);return p.concat(d).map(tk)};
    return {grupos:groups.slice().sort(byCreated).map(g=>({grupo:g.name,proyectos:projects.filter(p=>p.groupId===g.id).sort(byCreated).map(p=>({proyecto:p.name,tareas:list(tasks.filter(t=>t.projectId===p.id))}))})),
      generales:list(tasks.filter(t=>!t.projectId||!known.has(t.projectId)))};
  }
  const ERR={not_granted:"No tengo permiso para usar Claude en esta página. Puedes activarlo en los permisos del artefacto.",sampling_disabled:"Claude no está disponible en esta cuenta.",rate_limited:"Demasiadas preguntas seguidas. Espera un momento e inténtalo otra vez.",session_expired:"Tu sesión expiró. Vuelve a iniciar sesión en Claude.",invalid_json:"No entendí bien la respuesta. Inténtalo de nuevo con otras palabras.",refused:"No puedo responder esa pregunta. Prueba a preguntarlo de otra forma."};
  $("ask").addEventListener("submit",async e=>{e.preventDefault();
    const q=$("q").value.trim();if(!q||!sample||askCtl)return;
    askCtl=new AbortController();const ctl=askCtl;$("askbtn").disabled=true;
    $("answer").hidden=false;$("aq").textContent="› "+q;$("atext").classList.remove("err");$("atext").textContent="Analizando tus obras…";ansIds=null;$("alist").replaceChildren();
    HUD.think(true);
    const d=new Date();
    const prompt="Eres el asistente personal del Ing. Daniel, ingeniero civil, al estilo de JARVIS: preciso, sereno y breve. Le hablas de \"ingeniero\".\n"+
      "Hoy es "+DIAS[d.getDay()]+" "+todayStr()+".\n"+
      "Responde su pregunta usando SOLO los datos de su tablero de pendientes (abajo). Si nombra una obra o proyecto, emparéjalo aunque lo escriba distinto, abreviado o sin tildes. Si no existe, dilo y menciona los proyectos más parecidos. No inventes tareas.\n"+
      "Responde SOLO con JSON con esta forma: {\"respuesta\":\"1 a 3 frases en español\",\"tareas\":[\"id\",...]}. En \"tareas\" pon los ids de las tareas que responden la pregunta (máximo 20, pendientes primero; incluye hechas solo si pregunta por lo hecho).\n\n"+
      "PREGUNTA: "+q+"\n\nTABLERO:\n"+JSON.stringify(boardData());
    try{
      const r=await sample.json(prompt,{signal:ctl.signal,modelTier:"quick"});
      if(ctl!==askCtl)return;
      const txt=String((r&&r.respuesta)||"Listo, ingeniero.");
      const ids=Array.isArray(r&&r.tareas)?r.tareas.map(String).filter(id=>tasks.some(t=>t.id===id)):[];
      ansIds=ids;HUD.think(false);typeInto($("atext"),txt,false);speak(txt);render();
      $("q").value="";
    }catch(err){
      HUD.think(false);
      if(err&&err.code==="cancelled")return;
      $("atext").classList.add("err");$("atext").textContent=ERR[err&&err.code]||"No pude consultar en este momento. Revisa tu conexión e inténtalo de nuevo.";
      if(err&&(err.code==="not_granted"||err.code==="sampling_disabled"))$("ask").hidden=true;
    }finally{if(ctl===askCtl)askCtl=null;$("askbtn").disabled=!$("q").value.trim()}
  });
  function renderAnswer(){
    if(!ansIds)return;
    const pname=t=>{const p=projects.find(p=>p.id===t.projectId);return p?p.name:"General"};
    const items=ansIds.map(id=>tasks.find(t=>t.id===id)).filter(Boolean).map(t=>{const li=taskItem(t);let m=li.querySelector(".meta");if(!m){m=h("div",{class:"meta"});li.querySelector(".body").append(m)}m.prepend(h("span",{class:"pj",text:pname(t)}));return li});
    $("alist").replaceChildren(...items);
  }
  function render(){
    if(!db)return;
    // conservar lo que se está escribiendo y el foco
    const board=$("board"), vals={}, act=document.activeElement&&document.activeElement.id;
    board.querySelectorAll("input[id]").forEach(i=>vals[i.id]=i.value);
    const pendAll=tasks.filter(t=>!t.done).length;$("n").textContent=pendAll;bubble(pendAll);

    // selector de proyecto
    const sel=$("proj"), cur=sel.value;sel.replaceChildren(h("option",{value:"",text:"General"}));
    groups.slice().sort(byCreated).forEach(g=>{const ps=projects.filter(p=>p.groupId===g.id).sort(byCreated);if(!ps.length)return;
      const og=h("optgroup",{label:g.name});ps.forEach(p=>og.append(h("option",{value:p.id,text:p.name})));sel.append(og)});
    sel.value=[...sel.options].some(o=>o.value===cur)?cur:"";

    const kids=[];
    const known=new Set(projects.map(p=>p.id));
    const general=tasks.filter(t=>!t.projectId||!known.has(t.projectId));
    if(general.length){
      const go=gOpen.has("general"), gp=general.filter(t=>!t.done).length;
      const sec=h("section",{class:"group"+(go?" open":"")},h("div",{class:"ghead"},groupToggle("general","Generales",gp?plural(gp,"pendiente","pendientes"):"al día",gp>0)));
      if(go)sec.append(taskBlock("general",general,null,null));kids.push(sec);
    }
    groups.slice().sort(byCreated).forEach(g=>kids.push(groupSection(g)));
    if(!groups.length&&!general.length)kids.push(h("div",{class:"empty",html:"<b>Tu tablero está vacío.</b>Escribe una tarea arriba, o crea un grupo para organizar tus proyectos."}));

    // nuevo grupo
    if(addingGroup){
      const f=h("form",{class:"inline",autocomplete:"off"});const inp=h("input",{id:"newgroup",placeholder:"Nombre del grupo (ej. Otros proyectos)","aria-label":"Nombre del grupo nuevo",maxlength:"80"});
      const cancel=h("button",{type:"button",class:"ghost",text:"Cancelar"});cancel.onclick=()=>{addingGroup=false;render()};
      f.append(inp,h("button",{class:"ghost",type:"submit",text:"Crear"}),cancel);
      f.onsubmit=e=>{e.preventDefault();const v=inp.value.trim();if(!v)return;addingGroup=false;run(C("grupos").add({name:v,createdAt:Date.now()}).then(ref=>{gOpen.add(ref.id);saveG();render()}),"No se pudo crear el grupo.");render()};
      kids.push(f);setTimeout(()=>{const el=$("newgroup");if(el&&document.activeElement!==el)el.focus()},0);
    }else{const b=h("button",{type:"button",class:"ghost newgroup",text:"+ Nuevo grupo de proyectos"});b.onclick=()=>{addingGroup=true;render()};kids.push(b)}

    board.replaceChildren(...kids);
    renderAnswer();
    for(const id in vals){const el=$(id);if(el&&!id.startsWith("edit-")&&!id.startsWith("pname-")&&!id.startsWith("gname-"))el.value=vals[id];else if(el&&vals[id]!==undefined&&(id.startsWith("pname-")||id.startsWith("gname-")))el.value=vals[id]}
    if(act){const el=$(act);if(el&&el.tagName==="INPUT"){el.focus();try{el.setSelectionRange(el.value.length,el.value.length)}catch(e){}}}
  }

  (async()=>{
    db=window.claude?await window.claude.use("db"):null;
    if(!db){notice("Abre este tablero con tu cuenta de Claude para ver y guardar tus tareas.",true);return}
    $("addbtn").disabled=!$("txt").value.trim();
    window.claude.use("sample").then(sm=>{if(sm){sample=sm;$("ask").hidden=false}});
    const sub=(name,key,setter)=>C(name).onSnapshot(s=>{setter(s.docs.map(d=>Object.assign({id:d.id},d.data())));ready[key]=true;
      if(ready.g&&ready.p&&ready.t)notice("");render()},()=>notice("Se perdió la conexión con tus tareas. Recarga la página.",true));
    sub("grupos","g",v=>groups=v);sub("proyectos","p",v=>projects=v);sub("tareas","t",v=>tasks=v);
  })();
})();
</script>
