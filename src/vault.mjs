const ITERATIONS=310000;
const encode=value=>new TextEncoder().encode(value);
const to64=value=>{let s='';for(const n of new Uint8Array(value))s+=String.fromCharCode(n);return btoa(s);};
const from64=value=>Uint8Array.from(atob(value),c=>c.charCodeAt(0));
const random=n=>crypto.getRandomValues(new Uint8Array(n));
function passwordOK(value){if(typeof value!=='string'||value.length<10||value.length>128)throw Error('Құпиясөз 10–128 таңбадан тұруы керек.');}
function recoveryValue(value){const result=String(value).replace(/[-\s]/g,'').toUpperCase();if(!/^[A-F0-9]{40}$/.test(result))throw Error('Қалпына келтіру кодын толық енгізіңіз.');return result;}
function recoveryCode(){return [...random(20)].map(n=>n.toString(16).padStart(2,'0')).join('').toUpperCase().match(/.{5}/g).join('-');}
async function aes(raw){return crypto.subtle.importKey('raw',raw,'AES-GCM',false,['encrypt','decrypt']);}
async function derive(secret,salt){const key=await crypto.subtle.importKey('raw',encode(secret),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:ITERATIONS,hash:'SHA-256'},key,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);}
async function encrypt(key,bytes,aad){const iv=random(12),ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:encode(aad)},key,bytes);return {iv:to64(iv),ciphertext:to64(ciphertext)};}
async function decrypt(key,value,aad){if(!value||typeof value.iv!=='string'||typeof value.ciphertext!=='string'||value.ciphertext.length>8192)throw Error('Сақталған кіру дерегі жарамсыз.');return new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:from64(value.iv),additionalData:encode(aad)},key,from64(value.ciphertext)));}
async function wrap(secret,master,aad){const salt=random(16),key=await derive(secret,salt);return {salt:to64(salt),...await encrypt(key,master,aad)};}
function valid(record,scope){if(!record||record.version!==1||record.iterations!==ITERATIONS||record.scope!==scope||!record.password||!record.recovery||!record.data)throw Error('Бұл браузердегі кіру дерегі сәйкес келмейді. GitHub кілті арқылы кіріңіз.');}
async function masterFrom(record,secret,kind,scope){valid(record,scope);const value=record[kind];try{return await decrypt(await derive(secret,from64(value.salt)),value,scope+'|'+kind);}catch{throw Error(kind==='password'?'Құпиясөз дұрыс емес.':'Қалпына келтіру коды дұрыс емес.');}}
async function tokenFrom(record,master,scope){try{return new TextDecoder().decode(await decrypt(await aes(master),record.data,scope+'|token'));}catch{throw Error('Сақталған байланыс дерегін ашу мүмкін болмады. GitHub кілті арқылы кіріңіз.');}}
export async function seal(token,password,scope){
 passwordOK(password);if(typeof token!=='string'||!token||token.length>4096)throw Error('GitHub байланысы табылмады.');const master=random(32),code=recoveryCode();
 try{const record={version:1,iterations:ITERATIONS,scope,createdAt:new Date().toISOString(),data:await encrypt(await aes(master),encode(token),scope+'|token'),password:await wrap(password,master,scope+'|password'),recovery:await wrap(recoveryValue(code),master,scope+'|recovery')};return {record,recoveryCode:code};}finally{master.fill(0);}
}
export async function unlock(record,password,scope){const master=await masterFrom(record,password,'password',scope);try{return await tokenFrom(record,master,scope);}finally{master.fill(0);}}
export async function reset(record,code,password,scope){passwordOK(password);const master=await masterFrom(record,recoveryValue(code),'recovery',scope);try{return await seal(await tokenFrom(record,master,scope),password,scope);}finally{master.fill(0);}}
// Replace only the encrypted GitHub token; retain password and recovery wrappers.
export async function rebind(record,password,token,scope){
 if(typeof token!=='string'||!token||token.length>4096)throw Error('Жаңа GitHub кілтін енгізіңіз.');
 const master=await masterFrom(record,password,'password',scope);
 try{return {...record,data:await encrypt(await aes(master),encode(token),scope+'|token')};}finally{master.fill(0);}
}
