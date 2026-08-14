import puppeteer from 'puppeteer-core'
const B='http://localhost:4173'
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--disable-dev-shm-usage']})
console.log('  vw    hero h   img loaded              natural   rendered  overflow  h1/CTA visible')
for (const [w,h] of [[320,568],[360,740],[375,667],[390,844],[414,896],[768,1024],[1024,768],[1440,900],[1920,1080]]) {
  const p=await b.newPage(); const errs=[]
  p.on('pageerror',e=>errs.push(e.message))
  await p.setViewport({width:w,height:h,isMobile:w<780,hasTouch:w<780,deviceScaleFactor:2})
  await p.goto(B+'/',{waitUntil:'networkidle2',timeout:60000})
  await new Promise(r=>setTimeout(r,1600))
  const d=await p.evaluate(()=>{
    const hero=document.querySelector('.home-hero')
    const img=document.querySelector('.hero-poster')
    const h1=document.querySelector('.home-hero h1')
    const cta=document.querySelector('.hero-buttons .button')
    const vis=el=>{if(!el)return false;const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&r.top<window.innerHeight&&r.bottom>0}
    return {
      heroH: Math.round(hero?.getBoundingClientRect().height||0),
      src: (img?.currentSrc||'').split('/').pop(),
      nat: img?`${img.naturalWidth}x${img.naturalHeight}`:'-',
      rend: img?`${Math.round(img.getBoundingClientRect().width)}x${Math.round(img.getBoundingClientRect().height)}`:'-',
      overflow: document.documentElement.scrollWidth>window.innerWidth,
      docW: document.documentElement.scrollWidth, winW: window.innerWidth,
      h1: vis(h1), cta: vis(cta),
      h1Text: (h1?.innerText||'').slice(0,28).replace(/\n/g,' ')
    }
  })
  console.log(`  ${String(w).padEnd(5)} ${String(d.heroH).padEnd(7)} ${d.src.padEnd(23)} ${d.nat.padEnd(9)} ${d.rend.padEnd(9)} ${(d.overflow?'YES '+d.docW+'>'+d.winW:'no').padEnd(9)} ${d.h1?'h1':'--'}/${d.cta?'cta':'---'}  ${errs.length?'ERR':''}`)
  await p.close()
}
await b.close()
