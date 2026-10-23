<script>
// Holograma: anillos HUD que giran alrededor de un casco de obra en malla de alambre.
// HUD.talk(true/false) mueve las barras de voz, HUD.think(true/false) acelera los anillos, HUD.pulse() lanza una onda.
(function(){
  const cv=document.getElementById("hud"), ctx=cv.getContext("2d");
  const calm=matchMedia("(prefers-reduced-motion: reduce)").matches;
  const CY="255,122,48";
  let S=0, dpr=1, talking=false, thinking=false, amp=0, spin=0, scanY=0, waves=[], last=0;
  const bars=Array.from({length:72},()=>0);
  // puntos dentro de la cúpula (coordenadas unitarias), fijos para que no "bailen"
  let seed=7; const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
  const dots=[]; while(dots.length<170){const x=rnd()*2-1,y=-rnd();if(x*x+y*y<1)dots.push({x,y,p:rnd()*6.28})}
  function size(){const r=cv.getBoundingClientRect();dpr=Math.min(2,window.devicePixelRatio||1);S=r.width;cv.width=Math.round(S*dpr);cv.height=Math.round(S*dpr)}
  new ResizeObserver(()=>{size();if(calm)draw(0)}).observe(cv);size();

  const a=(al)=>"rgba("+CY+","+al+")";
  function ring(r,w,al){ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.lineWidth=w;ctx.strokeStyle=a(al);ctx.stroke()}
  function arcs(r,w,rot,segs,al){ctx.lineWidth=w;ctx.strokeStyle=a(al);for(const [s,l] of segs){ctx.beginPath();ctx.arc(0,0,r,rot+s,rot+s+l);ctx.stroke()}}

  function helmet(R,t){
    const h=R*.58, ry=h*.8, rx=h*.66, base=h*.2, sway=calm?0:Math.sin(t*.45)*.32;
    ctx.save();
    ctx.shadowColor=a(.9);ctx.shadowBlur=10;
    // ala del casco: elipse en perspectiva
    ctx.beginPath();ctx.ellipse(0,base,h*1.04,h*.17,0,0,Math.PI*2);ctx.lineWidth=1.6;ctx.strokeStyle=a(.85);ctx.stroke();
    ctx.beginPath();ctx.ellipse(0,base+h*.05,h*.98,h*.13,0,0,Math.PI);ctx.lineWidth=1;ctx.strokeStyle=a(.4);ctx.stroke();
    // contorno de la cúpula
    ctx.beginPath();ctx.ellipse(0,base,rx,ry,0,Math.PI,Math.PI*2);ctx.lineWidth=1.8;ctx.strokeStyle=a(.95);ctx.stroke();
    // banda inferior
    ctx.beginPath();ctx.ellipse(0,base-h*.1,rx*.99,h*.11,0,0,Math.PI);ctx.lineWidth=1.2;ctx.strokeStyle=a(.6);ctx.stroke();
    // meridianos (giran con el balanceo) y la cresta central doble
    for(let i=-3;i<=3;i++){
      const th=i*.42+sway, c=Math.cos(th);if(c<=0.05)continue;
      const x=Math.sin(th)*rx, w=Math.abs(Math.sin(th))*rx;
      ctx.beginPath();
      for(let k=0;k<=20;k++){const ph=k/20*Math.PI/2;const yy=base-Math.cos(ph)*ry;const xx=Math.sin(th)*rx*Math.sin(ph);k?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy)}
      const ridge=i===0;ctx.lineWidth=ridge?2.2:1;ctx.strokeStyle=a(ridge?.95:.25+.45*c);ctx.stroke();
      if(ridge){for(const off of [-.07,.07]){ctx.beginPath();for(let k=1;k<=19;k++){const ph=k/20*Math.PI/2;const yy=base-Math.cos(ph)*ry*1.03;const xx=Math.sin(th+off)*rx*Math.sin(ph);k>1?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy)}ctx.lineWidth=1;ctx.strokeStyle=a(.55);ctx.stroke()}}
      void x;void w;
    }
    // paralelos
    for(const f of [.35,.62,.84]){const yy=base-f*ry, rr=rx*Math.sqrt(1-f*f);ctx.beginPath();ctx.ellipse(0,yy,rr,rr*.16,0,0,Math.PI);ctx.lineWidth=.9;ctx.strokeStyle=a(.3);ctx.stroke()}
    ctx.shadowBlur=0;
    // puntos titilando dentro de la cúpula
    for(const d of dots){const tw=calm?.5:.5+.5*Math.sin(t*2.2+d.p);ctx.fillStyle=a(.12+.5*tw*tw);ctx.fillRect(d.x*rx*.92-.6,base+d.y*ry*.92-.6,1.3,1.3)}
    // línea de escaneo recortada a la cúpula
    if(!calm){ctx.save();ctx.beginPath();ctx.ellipse(0,base,rx,ry,0,Math.PI,Math.PI*2);ctx.lineTo(-rx,base);ctx.clip();
      const y=base-ry+((scanY%1))*ry;const g=ctx.createLinearGradient(0,y-14,0,y+2);g.addColorStop(0,a(0));g.addColorStop(1,a(thinking?.55:.32));ctx.fillStyle=g;ctx.fillRect(-rx,y-14,rx*2,16);ctx.restore()}
    ctx.restore();
  }

  function draw(t){
    const R=S*.47;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,S,S);ctx.translate(S/2,S/2);
    const g=ctx.createRadialGradient(0,0,R*.1,0,0,R);g.addColorStop(0,a(.16));g.addColorStop(.6,a(.04));g.addColorStop(1,a(0));ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,R,0,7);ctx.fill();
    ctx.globalCompositeOperation="lighter";
    // anillo exterior con marcas, como un transportador
    ctx.save();ctx.rotate(spin*.18);
    for(let i=0;i<120;i++){const L=i%10===0?R*.06:i%5===0?R*.035:R*.018;const an=i/120*Math.PI*2;ctx.beginPath();ctx.moveTo(Math.cos(an)*R,Math.sin(an)*R);ctx.lineTo(Math.cos(an)*(R-L),Math.sin(an)*(R-L));ctx.lineWidth=i%10===0?1.4:.8;ctx.strokeStyle=a(i%10===0?.7:.32);ctx.stroke()}
    ctx.restore();
    // arcos segmentados que giran en sentidos opuestos
    arcs(R*.88,3,-spin*.5,[[0,.9],[1.2,.35],[1.75,1.3],[3.4,.55],[4.3,1.4]],thinking?.85:.6);
    arcs(R*.83,1.2,spin*.9,[[.3,2.2],[2.9,.4],[3.6,2.1]],.45);
    ctx.save();ctx.rotate(spin*1.4);ctx.setLineDash([2,6]);ring(R*.79,1,.5);ctx.restore();
    // corchetes de mira
    ctx.save();ctx.rotate(-spin*.25);arcs(R*.74,2.4,0,[[-.35,.7],[Math.PI-.35,.7]],.75);ctx.restore();
    ring(R*.6,1,.35);
    // barras de voz alrededor del casco
    for(let i=0;i<bars.length;i++){
      const target=talking?amp*(.35+.65*Math.abs(Math.sin(i*1.7+t*9)*Math.sin(i*.6-t*5.3))):thinking?.18*(.5+.5*Math.sin(i*.5-t*6)):.04;
      bars[i]+=(target-bars[i])*(calm?1:.25);
      const an=i/bars.length*Math.PI*2-Math.PI/2, r0=R*.62, r1=r0+R*.02+bars[i]*R*.15;
      ctx.beginPath();ctx.moveTo(Math.cos(an)*r0,Math.sin(an)*r0);ctx.lineTo(Math.cos(an)*r1,Math.sin(an)*r1);ctx.lineWidth=1.6;ctx.strokeStyle=a(.35+bars[i]*1.2);ctx.stroke();
    }
    // ondas de "tarea completada"
    waves=waves.filter(w=>t-w<1.2);for(const w of waves){const k=(t-w)/1.2;ring(R*(.6+.42*k),2*(1-k)+.5,.8*(1-k))}
    ctx.globalCompositeOperation="source-over";
    helmet(R,t);
    // marcadores de texto del HUD
    ctx.font="500 "+Math.max(8,R*.055)+"px 'IBM Plex Mono',monospace";ctx.fillStyle=a(.6);ctx.textAlign="center";
    ctx.fillText(thinking?"ANALIZANDO":talking?"TRANSMITIENDO":"EN LÍNEA",0,R*.47);
  }

  function loop(ms){const t=ms/1000,dt=Math.min(.05,t-(last||t));last=t;
    spin+=dt*(thinking?2.6:.6);scanY+=dt*(thinking?.9:.32);
    if(talking)amp+=((.55+.45*Math.random())-amp)*.3;else amp*=.9;
    draw(t);requestAnimationFrame(loop)}
  if(calm)draw(0);else requestAnimationFrame(loop);

  window.HUD={talk(v){talking=!!v;if(calm)draw(0)},think(v){thinking=!!v;if(calm)draw(0)},pulse(){if(!calm)waves.push(performance.now()/1000)}};
})();
</script>
