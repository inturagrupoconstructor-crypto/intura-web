<script>
// SOLO VISTA PREVIA LOCAL: datos de ejemplo
(function(){const td=new Date();const d=n=>{const x=new Date(td);x.setDate(x.getDate()+n);return x.toISOString().slice(0,10)};
const data={grupos:[{id:"g1",name:"Proyectos de ejemplo",createdAt:1}],proyectos:[{id:"p1",name:"Obra Ejemplo A",groupId:"g1",createdAt:1},{id:"p2",name:"Obra Ejemplo B",groupId:"g1",createdAt:2}],
tareas:Array.from({length:13},(_,i)=>({id:"t"+i,text:"Tarea de ejemplo "+(i+1),projectId:i<7?"p1":"p2",urgent:i%5===0,due:i===2?d(-3):i===3?d(0):i===4?d(1):i===6?d(2):null,done:false,createdAt:i}))};
const col=n=>({onSnapshot(cb){setTimeout(()=>cb({docs:data[n].map(x=>({id:x.id,data:()=>x}))}),300)},doc(){return{update:async()=>{},delete:async()=>{}}},add:async()=>({id:"x"})});
const sample=async()=>({text:""});sample.json=async()=>{await new Promise(r=>setTimeout(r,1500));return{respuesta:"Ingeniero, en Obra Ejemplo A tiene 7 pendientes; 2 son urgentes.",tareas:["t0","t1","t5"]}};
const files=[{title:"Ejemplo carpeta",mimeType:"application/vnd.google-apps.folder",modifiedTime:d(-2)},{title:"Ejemplo plano.pdf",mimeType:"application/pdf",modifiedTime:d(-5)},{title:"Ejemplo foto.jpg",mimeType:"image/jpeg",modifiedTime:d(-9)}];
const mcp={watchTool(s,t,i,hd){setTimeout(()=>hd({type:"data",result:{payload:{files}}}),600);return()=>{}},callTool:async()=>({payload:{files}}),invalidate:async()=>{}};
window.claude={use:async n=>n==="db"?{collection:col}:n==="sample"?sample:n==="mcp"?mcp:null};})();
</script>
