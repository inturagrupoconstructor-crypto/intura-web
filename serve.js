const http=require("http"),fs=require("fs"),path=require("path");
const T={".html":"text/html; charset=utf-8",".jpg":"image/jpeg",".png":"image/png",".txt":"text/plain; charset=utf-8"};
http.createServer((q,s)=>{const u=new URL(q.url,"http://x");
 if(q.method==="POST"&&u.pathname==="/save"){const n=u.searchParams.get("n").replace(/[^a-z0-9.-]/gi,"");let b="";q.on("data",c=>b+=c);q.on("end",()=>{fs.mkdirSync(path.join(__dirname,"iconos-png"),{recursive:true});fs.writeFileSync(path.join(__dirname,"iconos-png",n),Buffer.from(b,"base64"));s.end("ok")});return}
 let p=decodeURIComponent(u.pathname);if(p=="/")p="/preview.html";const f=path.join(__dirname,p);fs.readFile(f,(e,d)=>{if(e){s.writeHead(404);return s.end()}s.writeHead(200,{"Content-Type":T[path.extname(f)]||"application/octet-stream"});s.end(d)})}).listen(5175);
