/* VOID KEEP — arcade score server (zero dependencies) */
'use strict';
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const PORT=+(process.env.PORT||3000);
const DATA_DIR=process.env.DATA_DIR||'/data';
const FILE=path.join(DATA_DIR,'scores.json');
const MAX_BODY=64*1024;
const MAX_SCORES=20000;

let scores=[];
try{
  if(fs.existsSync(FILE)){
    const j=JSON.parse(fs.readFileSync(FILE,'utf8'));
    if(Array.isArray(j))scores=j.filter(e=>e&&typeof e==='object'&&typeof e.name==='string');
  }
}catch(e){console.error('load scores failed:',e.message);scores=[];}
if(process.env.VK_WIPE==='1'){
  scores=[];
  try{fs.mkdirSync(DATA_DIR,{recursive:true});fs.rmSync(FILE,{force:true});console.log('VK_WIPE=1 — score storage wiped');}
  catch(e){console.error('wipe failed:',e.message);}
}

let saveT=null;
function saveNow(){
  try{
    fs.mkdirSync(DATA_DIR,{recursive:true});
    const tmp=FILE+'.tmp';
    fs.writeFileSync(tmp,JSON.stringify(scores));
    fs.renameSync(tmp,FILE);
  }catch(e){console.error('save failed:',e.message);}
}
function persist(){
  if(saveT)return;
  saveT=setTimeout(()=>{saveT=null;saveNow();},250);
}

const num=(v,lo,hi)=>{const n=Math.round(Number(v));return Number.isFinite(n)&&n>=lo&&n<=hi?n:null;};
function cleanName(v){
  if(typeof v!=='string')return '';
  let s=v.replace(/[\u0000-\u001f\u007f]/g,'');
  try{s=s.replace(/[^\p{L}\p{N} _.\-]/gu,'');}catch(e){s=s.replace(/[^a-zA-Z0-9 _.\-]/g,'');}
  return s.replace(/\s+/g,' ').trim().slice(0,16);
}

const rl=new Map();
function rateOk(ip){
  const now=Date.now();
  let e=rl.get(ip);
  if(!e){e={last:0,hour:[]};rl.set(ip,e);}
  e.hour=e.hour.filter(t=>t>now-3600e3);
  if(now-e.last<8000||e.hour.length>=40)return false;
  e.last=now;e.hour.push(now);
  if(rl.size>20000){for(const[k,v]of rl)if(!v.hour.length)rl.delete(k);}
  return true;
}

const byScore=(a,b)=>b.score-a.score||b.wave-a.wave||b.kills-a.kills||a.date-b.date;
const pub=e=>({name:e.name,score:e.score,wave:e.wave,kills:e.kills,time:e.time,date:e.date});

const server=http.createServer((req,res)=>{
  let u;try{u=new URL(req.url,'http://localhost');}catch(e){return bad(400);}
  const ip=req.headers['x-forwarded-for']?String(req.headers['x-forwarded-for']).split(',')[0].trim():String(req.socket.remoteAddress||'');
  function bad(code,obj){res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(obj||{error:'bad request'}));}
  function json(code,obj){res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(obj));}

  if(req.method==='GET'){
    if(u.pathname==='/healthz')return json(200,{ok:true,game:'VOID KEEP'});
    if(u.pathname==='/debug'){
      let m='';
      try{
        const lines=fs.readFileSync('/proc/self/mountinfo','utf8').split('\n').filter(l=>l.split('\t')[1]==='/data');
        m=lines.length?lines.map(l=>{const p=l.split('\t');return p[4]||p[3];}).join(' | '):'no /data mount (overlay)';
      }catch(e){m='err:'+e.message;}
      let st=null;try{st=fs.statSync(FILE);}catch(e){}
      return json(200,{dataDir:DATA_DIR,fileExists:!!st,size:st?st.size:null,mount:m,mem:process.memoryUsage().heapUsed});
    }
    if(u.pathname==='/'){
      let html;try{html=fs.readFileSync(path.join(__dirname,'public','index.html'));}catch(e){return json(500,{error:'game missing'});}
      res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache'});
      return res.end(html);
    }
    if(u.pathname==='/api/leaderboard'){
      const limit=num(u.searchParams.get('limit'),1,50)||10;
      const top=[...scores].sort(byScore).slice(0,limit).map((e,i)=>({rank:i+1,name:e.name,score:e.score,wave:e.wave,kills:e.kills,time:e.time,date:e.date}));
      return json(200,{top});
    }
    if(u.pathname==='/api/stats'){
      const names=new Set(scores.map(e=>String(e.name).toLowerCase()));
      const best=scores.length?[...scores].sort(byScore)[0]:null;
      const bestWave=scores.reduce((m,e)=>Math.max(m,e.wave),0);
      return json(200,{
        games:scores.length,players:names.size,
        totalKills:scores.reduce((s,e)=>s+(e.kills|0),0),
        bestScore:best?best.score:0,best:best?pub(best):null,bestWave,
        recent:[...scores].sort((a,b)=>b.date-a.date).slice(0,8).map(pub)
      });
    }
    if(u.pathname==='/api/mine'){
      const nm=cleanName(u.searchParams.get('name'));
      if(!nm)return json(400,{error:'bad name'});
      const mine=scores.filter(e=>String(e.name).toLowerCase()===nm.toLowerCase()).sort(byScore);
      if(!mine.length)return json(200,{games:0,best:null,totalScore:0,rank:null});
      const all=[...scores].sort(byScore);
      let rank=null;
      for(let i=0;i<all.length;i++)if(all[i]===mine[0]){rank=i+1;break;}
      return json(200,{games:mine.length,best:pub(mine[0]),totalScore:mine.reduce((s,e)=>s+e.score,0),rank});
    }
    return json(404,{error:'not found'});
  }

  if(req.method==='POST'&&u.pathname==='/api/score'){
    if(!rateOk(ip))return json(429,{error:'slow down, king'});
    let body='';
    req.on('data',c=>{body+=c;if(body.length>MAX_BODY){req.destroy();}});
    req.on('end',()=>{
      let j;try{j=JSON.parse(body||'{}');}catch(e){return json(400,{error:'bad json'});}
      const name=cleanName(j.name);
      const score=num(j.score,0,9999999),kills=num(j.kills,0,9999),wave=num(j.wave,1,999),time=num(j.time,0,86400);
      if(!name)return json(400,{error:'name required'});
      if(score===null||kills===null||wave===null||time===null)return json(400,{error:'bad payload'});
      const e={name,score,kills,wave,time,id:crypto.randomUUID(),date:Date.now()};
      scores.push(e);
      if(scores.length>MAX_SCORES)scores=[...scores].sort(byScore).slice(0,15000);
      persist();
      const all=[...scores].sort(byScore);
      const rank=all.indexOf(e)+1;
      const top=all.slice(0,5).map((x,i)=>({rank:i+1,name:x.name,score:x.score,wave:x.wave,kills:x.kills}));
      return json(200,{ok:true,rank,top});
    });
    return;
  }
  res.writeHead(405,{'Content-Type':'application/json'});res.end('{"error":"method not allowed"}');
});
server.listen(PORT,'0.0.0.0',()=>console.log('VOID KEEP arcade listening on :'+PORT+' data='+FILE));
process.on('SIGTERM',()=>{saveNow();process.exit(0);});
process.on('SIGINT',()=>{saveNow();process.exit(0);});
