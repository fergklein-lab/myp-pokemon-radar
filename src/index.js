const WATCHLIST = [
  'Charmander','Charmeleon','Charizard','Bulbasaur','Ivysaur','Venusaur',
  'Squirtle','Wartortle','Blastoise','Pichu','Pikachu','Raichu',
  'Dratini','Dragonair','Dragonite','Snubbull','Granbull','Munchlax','Snorlax',
  'Eevee','Vaporeon','Jolteon','Flareon','Espeon','Umbreon','Leafeon','Glaceon','Sylveon'
];
const CONDITIONS = ['NM', 'SP'];
const BASE = 'https://mypcards.com';

function norm(s='') {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
}
function brl(raw) {
  const s = raw.replace(/R\$\s*/i,'').replace(/\s/g,'');
  return Number(s.includes(',') ? s.replace(/\./g,'').replace(',','.') : s);
}
function money(v) {
  if (v == null || !Number.isFinite(v)) return '—';
  return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v);
}
function stripHtml(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ')
    .replace(/<br\s*\/?>/gi,'\n')
    .replace(/<\/tr>/gi,'\n')
    .replace(/<\/div>/gi,' ')
    .replace(/<[^>]+>/g,' ')
    .replace(/&nbsp;|&#160;/gi,' ')
    .replace(/&amp;/gi,'&')
    .replace(/&quot;|&#34;/gi,'"')
    .replace(/&#39;|&apos;/gi,"'")
    .replace(/\s+/g,' ')
    .trim();
}
function matchesWatch(title) {
  const n = norm(title);
  return WATCHLIST.some(x => new RegExp(`(^|[^a-z])${norm(x)}([^a-z]|$)`,'i').test(n));
}

export function parseLatestProducts(html) {
  const out = new Map();
  const re = /href=["']([^"']*\/pokemon\/produto\/(\d+)\/([^"'?#]+)[^"']*)["']/gi;
  let m;
  while ((m = re.exec(html))) {
    const id = Number(m[2]);
    const slug = decodeURIComponent(m[3]).replace(/[-_]+/g,' ');
    if (!matchesWatch(slug)) continue;
    let href = m[1];
    if (!href.startsWith('http')) href = new URL(href, BASE).href;
    out.set(id,{id,title:slug,url:href});
  }
  return [...out.values()];
}

function priceMatches(segment) {
  const vals=[]; const re=/R\$\s*([\d.]+(?:,\d{1,2})?|\d+(?:\.\d{1,2})?)/gi; let m;
  while((m=re.exec(segment))) { const v=brl(m[0]); if(Number.isFinite(v)&&v>0) vals.push(v); }
  return vals;
}

export function parseOffers(html) {
  const text = stripHtml(html);
  const offers=[];
  for (const condition of CONDITIONS) {
    const re = new RegExp(`\\b${condition}\\b`,'gi');
    let m;
    while((m=re.exec(text))) {
      const start=Math.max(0,m.index-90); const end=Math.min(text.length,m.index+260);
      const seg=text.slice(start,end);
      const vals=priceMatches(seg);
      if(!vals.length) continue;
      const localCondition = m.index-start;
      const after=seg.slice(localCondition);
      const afterVals=priceMatches(after);
      const price=afterVals.length ? afterVals[0] : vals[vals.length-1];
      const low=norm(seg);
      let variant='não informada';
      const labels=['reverse foil','reverse','foil','promo','holo','normal'];
      const found=labels.filter(x=>low.includes(x));
      if(found.length) variant=[...new Set(found)].join(', ');
      offers.push({condition,price,variant});
    }
  }
  const seen=new Set();
  return offers.filter(o=>{
    const k=`${o.condition}|${o.variant}|${o.price.toFixed(2)}`;
    if(seen.has(k)) return false; seen.add(k); return true;
  }).sort((a,b)=>a.price-b.price);
}

function valueAfterLabel(text,label) {
  const i=norm(text).indexOf(norm(label)); if(i<0) return null;
  const vals=priceMatches(text.slice(i,i+220)); return vals[0] ?? null;
}

export function parseHistory(html) {
  const text=stripHtml(html);
  const median=valueAfterLabel(text,'Mediana MYP');
  const last=valueAfterLabel(text,'Último Preço Vendido');
  let lastCondition=null;
  const li=norm(text).indexOf(norm('Último Preço Vendido'));
  if(li>=0){ const cm=text.slice(li,li+240).match(/\b(NM|SP|MP|DM)\b/i); if(cm) lastCondition=cm[1].toUpperCase(); }
  const obs=[];
  const dateRe=/\b\d{2}\/\d{2}\/\d{4}\b/g; let m; const positions=[];
  while((m=dateRe.exec(text))) positions.push({i:m.index,len:m[0].length});
  for(let x=0;x<positions.length;x++){
    const st=positions[x].i+positions[x].len;
    const en=x+1<positions.length?positions[x+1].i:Math.min(text.length,st+350);
    const vals=priceMatches(text.slice(st,en));
    if(vals.length>=3) obs.push(vals[2]);
    else if(vals.length) obs.push(vals[vals.length-1]);
  }
  return {median,last,lastCondition,observations:obs.filter(v=>v>0)};
}

function median(xs){const a=[...xs].sort((a,b)=>a-b);const n=a.length;if(!n)return null;return n%2?a[(n-1)/2]:(a[n/2-1]+a[n/2])/2;}
function removeOutliers(values){
  const xs=values.filter(v=>v>0); if(xs.length<5)return xs; const med=median(xs); const dev=xs.map(x=>Math.abs(x-med)); const mad=median(dev); if(!mad)return xs;
  const k=xs.filter(x=>Math.abs(0.6745*(x-med)/mad)<=3.5); return k.length?k:xs;
}
function percentile(values,p){const xs=[...values].sort((a,b)=>a-b);if(!xs.length)return null;if(xs.length===1)return xs[0];const k=(xs.length-1)*p;const f=Math.floor(k),c=Math.ceil(k);return f===c?xs[f]:xs[f]*(c-k)+xs[c]*(k-f);}
export function soldFloor(h,condition,points=5){
  let vals=[...h.observations]; if(h.last && (!vals.length || Math.abs(vals[0]-h.last)>.01)) vals.unshift(h.last);
  vals=removeOutliers(vals.slice(0,points)); if(!vals.length)return null; let floor=percentile(vals,.25);
  if(condition==='SP' && h.lastCondition==='NM') floor*=0.82;
  return Math.round(floor*100)/100;
}
function classify(d){if(d==null)return 'SEM REFERÊNCIA';if(d>=.40)return '🚨 URGENTE';if(d>=.30)return '🔥 EXCELENTE';if(d>=.20)return '🟢 BOA OPORTUNIDADE';if(d>=.15)return '👀 OBSERVAR';return 'IGNORAR';}

async function getText(url) {
  const r=await fetch(url,{headers:{'User-Agent':'MYP-Pokemon-Radar/0.3 (personal low-frequency monitor)','Accept-Language':'pt-BR,pt;q=0.9'}});
  if(!r.ok) throw new Error(`${r.status} ${url}`); return r.text();
}
async function tg(env,text) {
  if(!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return false;
  const r=await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({chat_id:env.TELEGRAM_CHAT_ID,text,disable_web_page_preview:false})});
  if(!r.ok) throw new Error(`Telegram ${r.status}`); return true;
}
function historyUrl(product){const u=new URL(product.url);u.pathname=u.pathname.replace('/produto/','/preco/');u.search='?dias=180';return u.href;}

async function inspectProduct(env,product,baseline) {
  const [productHtml,historyHtml]=await Promise.all([getText(product.url),getText(historyUrl(product))]);
  const offers=parseOffers(productHtml); const hist=parseHistory(historyHtml); const results=[];
  for(const condition of CONDITIONS){
    const comparable=offers.filter(o=>o.condition===condition).sort((a,b)=>a.price-b.price); if(!comparable.length) continue;
    const candidate=comparable[0]; const competitor=comparable[1]?.price ?? null; const sf=soldFloor(hist,condition,Number(env.SOLD_POINTS||5)); const refs=[sf,competitor].filter(v=>v&&v>0); const safe=refs.length?Math.min(...refs):null;
    const discount=safe&&candidate.price<safe?(safe-candidate.price)/safe:(safe?0:null);
    const key=`low:${product.id}:${condition}`; const prevRaw=await env.RADAR_KV.get(key); const prev=prevRaw?JSON.parse(prevRaw):null;
    const changed=!prev || candidate.price<Number(prev.price)-0.009;
    await env.RADAR_KV.put(key,JSON.stringify({price:candidate.price,variant:candidate.variant,seenAt:Date.now()}));
    const obs=removeOutliers(([hist.last,...hist.observations].filter(v=>v).slice(0,Number(env.SOLD_POINTS||5))));
    const belowAll=obs.length && candidate.price<Math.min(...obs);
    const confidence=(hist.observations.length>=5&&competitor!=null)?'alta':((hist.observations.length>=2||competitor!=null)?'média':'baixa');
    const score=discount==null?0:Math.min(100,Math.round(Math.max(0,Math.min(1,discount/.45))*90)+({alta:10,'média':5,baixa:0}[confidence]));
    const minDiscount=Number(env.ALERT_MIN_DISCOUNT||0.20);
    if(!baseline && changed && discount!=null && discount>=minDiscount){
      const profit=safe?Math.round((safe*(1-Number(env.SALE_FEE_RATE||.07))-candidate.price)*100)/100:null;
      const reason=[belowAll?`ABAIXO DE TODAS AS ${obs.length} OBSERVAÇÕES RECENTES`:null,sf?`piso vendido ${money(sf)}`:null,competitor?`concorrente ${money(competitor)}`:null,`${(discount*100).toFixed(1).replace('.',',')}% abaixo do valor seguro`].filter(Boolean).join('; ');
      const prevLine=prev&&Number(prev.price)>candidate.price?`\n🔻 Piso anterior: ${money(Number(prev.price))}`:'';
      const msg=`${classify(discount)} — ${score}/100\n\n🃏 ${product.title}\n📦 ${condition} · ${candidate.variant}\n\n💰 Oferta: ${money(candidate.price)}${prevLine}\n📉 Piso vendido: ${money(sf)}\n🛒 Menor concorrente: ${money(competitor)}\n🧮 Valor seguro: ${money(safe)}\n📊 Desconto: ${(discount*100).toFixed(1).replace('.',',')}%\n💵 Lucro líquido estimado*: ${money(profit)}\n🎯 Confiança: ${confidence}\n\n📝 ${reason}\n\n🔗 ${product.url}\n\n*Estimativa com taxa de 7%; não inclui frete/impostos.`;
      await tg(env,msg); results.push({product:product.id,condition,alert:true,discount});
    } else results.push({product:product.id,condition,alert:false,discount});
  }
  return results;
}

export async function scan(env) {
  const pages=Math.max(1,Math.min(3,Number(env.LATEST_PAGES||2))); const htmls=[];
  for(let p=1;p<=pages;p++) htmls.push(await getText(`${BASE}/pokemon?page=${p}`));
  const map=new Map(); for(const h of htmls) for(const p of parseLatestProducts(h)) map.set(p.id,p);
  const products=[...map.values()].slice(0,Math.max(1,Math.min(12,Number(env.MAX_PRODUCTS_PER_SCAN||10))));
  const baseline=(await env.RADAR_KV.get('baseline_done'))!=='1'; const out=[];
  for(const p of products){try{out.push(...await inspectProduct(env,p,baseline));}catch(e){out.push({product:p.id,error:String(e)})}}
  if(baseline){await env.RADAR_KV.put('baseline_done','1');await tg(env,`✅ MYP Pokémon Radar iniciado. Linha de base criada com ${products.length} produtos recentes; próximos ciclos passam a alertar oportunidades.`);}
  await env.RADAR_KV.put('last_scan',JSON.stringify({at:Date.now(),products:products.length,results:out.length,errors:out.filter(x=>x.error).length}));
  return {baseline,products:products.length,results:out};
}

export default {
  async scheduled(controller,env,ctx){ctx.waitUntil(scan(env));},
  async fetch(request,env){
    const url=new URL(request.url);
    if(url.pathname==='/health'){
      const last=await env.RADAR_KV.get('last_scan'); return Response.json({ok:true,service:'MYP Pokemon Radar',lastScan:last?JSON.parse(last):null,telegramConfigured:Boolean(env.TELEGRAM_BOT_TOKEN&&env.TELEGRAM_CHAT_ID)});
    }
    return new Response('MYP Pokemon Radar ativo. Use /health para status.',{headers:{'content-type':'text/plain; charset=utf-8'}});
  }
};
