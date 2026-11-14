export const homeFields=[
 ['badge','Кәсіби мәртебе',250],['name','Аты-жөніңіз',180],['intro','Өзіңіз туралы мәтін',3000],
 ['materials','Бірінші батырманың мәтіні',80],['contact','Екінші батырманың мәтіні',80],
 ['experienceValue','Жалпы еңбек өтілі — мәні',80],['experienceLabel','Жалпы еңбек өтілі — атауы',150],
 ['teachingValue','Педагогикалық өтілі — мәні',80],['teachingLabel','Педагогикалық өтілі — атауы',150],
 ['trainingValue','Тренингтер — мәні',100],['trainingLabel','Тренингтер — атауы',150]
];
export function normalizeHome(value){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Басты бет дерегі жарамсыз.');
 const result={};for(const [key,label,max] of homeFields){if(!Object.hasOwn(value,key))continue;if(typeof value[key]!=='string'||!value[key].trim()||value[key].length>max)throw Error(label+': 1–'+max+' таңба енгізіңіз.');result[key]=value[key].trim();}return result;
}
const escape=value=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderHome(html,values){
 for(const [key,value] of Object.entries(normalizeHome(values))){const pattern=new RegExp('(<([a-z][a-z0-9]*)\\b[^>]*\\bdata-home-text="'+key+'"[^>]*>)[\\s\\S]*?(</\\2>)','i');if(!pattern.test(html))throw Error('Басты бет өрісі табылмады: '+key);html=html.replace(pattern,(_,open,tag,close)=>open+escape(value)+close);}return html;
}
