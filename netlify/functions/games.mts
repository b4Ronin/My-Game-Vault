import { getStore } from "@netlify/blobs";
import type { Config } from "@netlify/functions";
import imports from "../../game-imports.json";
const allowed=["Xbox One","Xbox Series X","Nintendo Switch","PlayStation 5"];
const store=()=>getStore("game-vault",{consistency:"strong"});
const json=(data:any,status=200,headers:Record<string,string>={})=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json",...headers}});
async function all(){let games:any[]=(await store().get("collection",{type:"json"}))||[];let changed=false;for(const raw of (imports as any).games||[]){const g={...clean(raw),id:String(raw.id||crypto.randomUUID()),dateAdded:String(raw.dateAdded||new Date().toISOString())};if(!g.title||!allowed.includes(g.platform))continue;const i=games.findIndex((x:any)=>key(x)===key(g)||(g.upc&&x.upc&&x.upc===g.upc));if(i<0){games.push(g);changed=true}else{const merged={...games[i],...g,id:games[i].id||g.id,dateAdded:games[i].dateAdded||g.dateAdded};if(JSON.stringify(merged)!==JSON.stringify(games[i])){games[i]=merged;changed=true}}}if(changed)await save(games);return games}
async function save(g:any[]){await store().setJSON("collection",g)}
function clean(x:any){const o:any={};for(const k of ["title","platform","edition","coverUrl","imageFile","summary","releaseDate","genre","esrb","upc","developer","publisher","localPlayers","onlinePlayers","notes","seriesXEnhancements","backwardCompatibility","dlcPhysical","metadataSourceId"])o[k]=String(x?.[k]??"").trim();for(const k of ["localCoop","onlineCoop","splitScreen"])o[k]=!!x?.[k];o.physical=true;o.edition=o.edition||"Standard";return o}
function key(g:any){return [g.title,g.platform,g.edition].map(x=>String(x||"").trim().toLowerCase()).join("|")}
const enc=new TextEncoder();
async function sessionValue(){const secret=Netlify.env.get("SESSION_SECRET")||"";const key=await crypto.subtle.importKey("raw",enc.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);const sig=await crypto.subtle.sign("HMAC",key,enc.encode("my-game-vault-session"));return Array.from(new Uint8Array(sig)).map(b=>b.toString(16).padStart(2,"0")).join("")}
function cookie(req:Request,name:string){const raw=req.headers.get("cookie")||"";return raw.split(";").map(x=>x.trim()).find(x=>x.startsWith(name+"="))?.slice(name.length+1)||""}
async function canWrite(req:Request){const api=Netlify.env.get("GAME_VAULT_API_KEY")||"";const auth=req.headers.get("authorization")||"";if(api&&auth===`Bearer ${api}`)return true;const s=Netlify.env.get("SESSION_SECRET");return !!s&&cookie(req,"mgv_session")===await sessionValue()}
export default async(req:Request)=>{
 const url=new URL(req.url),parts=url.pathname.split("/").filter(Boolean),id=parts[2]||"";
 if(url.pathname==="/api/auth"&&req.method==="POST"){const body=await req.json().catch(()=>({})) as any;const expected=Netlify.env.get("APP_PASSWORD")||"";if(!expected||String(body.password||"")!==expected)return json({error:"Incorrect password."},401);return json({ok:true},200,{"set-cookie":`mgv_session=${await sessionValue()}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000`})}
 if(url.pathname==="/api/auth"&&req.method==="DELETE")return json({ok:true},200,{"set-cookie":"mgv_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0"});
 let games=await all();
 if(url.pathname==="/api/restore"&&req.method==="POST"){if(!await canWrite(req))return json({error:"Authentication required."},401);const body=await req.json().catch(()=>null) as any;if(!body||!Array.isArray(body.games)||!["merge","replace"].includes(body.mode))return json({error:"Invalid backup."},400);const incoming=body.games.map((x:any)=>({...clean(x),id:String(x.id||crypto.randomUUID()),dateAdded:String(x.dateAdded||new Date().toISOString())})).filter((x:any)=>x.title&&allowed.includes(x.platform));if(body.mode==="replace"){const seen=new Set();games=incoming.filter((g:any)=>{const k=key(g);if(seen.has(k))return false;seen.add(k);return true})}else{const seen=new Set(games.map(key));for(const g of incoming)if(!seen.has(key(g))){seen.add(key(g));games.push(g)}}await save(games);return json({ok:true,count:games.length})}
 if(parts[0]!=="api"||parts[1]!=="games")return json({error:"Not found"},404);
 if(req.method==="GET")return json(games);
 if(!await canWrite(req))return json({error:"Authentication required."},401);
 if(req.method==="POST"){const g=clean(await req.json().catch(()=>({})));if(!g.title||!allowed.includes(g.platform))return json({error:"Title and supported platform are required."},400);if(games.some(x=>key(x)===key(g)))return json({error:"Already in your collection."},409);if(g.upc&&games.some(x=>x.upc&&x.upc===g.upc))return json({error:"A game with this UPC/barcode is already in your collection."},409);const row={...g,id:crypto.randomUUID(),dateAdded:new Date().toISOString()};games.push(row);await save(games);return json(row,201)}
 const i=games.findIndex((g:any)=>g.id===id);if(i<0)return json({error:"Game not found."},404);
 if(req.method==="PUT"){const g=clean(await req.json().catch(()=>({})));if(!g.title||!allowed.includes(g.platform))return json({error:"Title and supported platform are required."},400);if(games.some((x:any,n:number)=>n!==i&&key(x)===key(g)))return json({error:"Already in your collection."},409);if(g.upc&&games.some((x:any,n:number)=>n!==i&&x.upc&&x.upc===g.upc))return json({error:"A game with this UPC/barcode is already in your collection."},409);games[i]={...games[i],...g};await save(games);return json(games[i])}
 if(req.method==="DELETE"){games.splice(i,1);await save(games);return json({ok:true})}
 return json({error:"Method not allowed"},405)
};
export const config:Config={path:["/api/games","/api/games/*","/api/restore","/api/auth"]};