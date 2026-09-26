import { getStore } from "@netlify/blobs";
import type { Config } from "@netlify/functions";
const allowed=["Xbox One","Xbox Series X","Nintendo Switch"];
const store=()=>getStore("game-vault",{consistency:"strong"});
const json=(data:any,status=200)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json"}});
async function all(){return (await store().get("collection",{type:"json"}))||[]}
async function save(g:any[]){await store().setJSON("collection",g)}
function clean(x:any){const o:any={};for(const k of ["title","platform","edition","coverUrl","summary","releaseDate","genre","esrb","upc","developer","publisher","localPlayers","onlinePlayers","notes"])o[k]=String(x?.[k]??"").trim();for(const k of ["localCoop","onlineCoop","splitScreen"])o[k]=!!x?.[k];o.edition=o.edition||"Standard";return o}
function key(g:any){return [g.title,g.platform,g.edition].map(x=>String(x||"").trim().toLowerCase()).join("|")}
export default async(req:Request)=>{
 const url=new URL(req.url), parts=url.pathname.split("/").filter(Boolean), id=parts[2]||"";
 let games=await all();
 if(url.pathname==="/api/restore"&&req.method==="POST"){const body=await req.json().catch(()=>null) as any;if(!body||!Array.isArray(body.games)||!["merge","replace"].includes(body.mode))return json({error:"Invalid backup."},400);const incoming=body.games.map((x:any)=>({...clean(x),id:String(x.id||crypto.randomUUID()),dateAdded:String(x.dateAdded||new Date().toISOString())})).filter((x:any)=>x.title&&allowed.includes(x.platform));if(body.mode==="replace"){const seen=new Set();games=incoming.filter((g:any)=>{const k=key(g);if(seen.has(k))return false;seen.add(k);return true})}else{const seen=new Set(games.map(key));for(const g of incoming)if(!seen.has(key(g))){seen.add(key(g));games.push(g)}}await save(games);return json({ok:true,count:games.length})}
 if(parts[0]!=="api"||parts[1]!=="games")return json({error:"Not found"},404);
 if(req.method==="GET")return json(games);
 if(req.method==="POST"){const g=clean(await req.json().catch(()=>({})));if(!g.title||!allowed.includes(g.platform))return json({error:"Title and supported platform are required."},400);if(games.some(x=>key(x)===key(g)))return json({error:"Already in your collection."},409);if(g.upc&&games.some(x=>x.upc&&x.upc===g.upc))return json({error:"A game with this UPC/barcode is already in your collection."},409);const row={...g,id:crypto.randomUUID(),dateAdded:new Date().toISOString()};games.push(row);await save(games);return json(row,201)}
 const i=games.findIndex((g:any)=>g.id===id);if(i<0)return json({error:"Game not found."},404);
 if(req.method==="PUT"){const g=clean(await req.json().catch(()=>({})));if(!g.title||!allowed.includes(g.platform))return json({error:"Title and supported platform are required."},400);if(games.some((x:any,n:number)=>n!==i&&key(x)===key(g)))return json({error:"Already in your collection."},409);if(g.upc&&games.some((x:any,n:number)=>n!==i&&x.upc&&x.upc===g.upc))return json({error:"A game with this UPC/barcode is already in your collection."},409);games[i]={...games[i],...g};await save(games);return json(games[i])}
 if(req.method==="DELETE"){games.splice(i,1);await save(games);return json({ok:true})}
 return json({error:"Method not allowed"},405)
};
export const config:Config={path:["/api/games","/api/games/*","/api/restore"]};