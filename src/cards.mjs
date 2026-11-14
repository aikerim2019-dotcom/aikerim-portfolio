export const sectionTitles={home:'Басты бет',about:'Мен туралы',experience:'Педагогикалық тәжірибе',materials:'Әдістемелік қор',projects:'Менің жобаларым',documents:'Құжаттар қоры',learning:'Студенттің оқу қоржыны',achievements:'Жетістіктер',students:'Студенттер жетістіктері',contact:'Байланыс'};
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function cardMarkup(id,card){
 if(!/^custom-[a-z0-9-]+$/.test(id)||!sectionTitles[card.section])return '';
 return `<article class="custom-portfolio-card" data-item-id="${escape(id)}" data-custom-item="${escape(id)}"><div class="custom-card-heading"><h3>${escape(card.title)}</h3>${card.year?`<span class="custom-card-year">${escape(card.year)}</span>`:''}</div>${card.subtitle?`<p class="custom-card-subtitle">${escape(card.subtitle)}</p>`:''}${card.description?`<p class="custom-card-description">${escape(card.description)}</p>`:''}<details class="item-attachments" data-item-attachments="${escape(id)}"><summary class="item-summary"><span>Материалдар</span><span class="item-count" aria-live="polite">0 файл</span></summary><div class="item-files" aria-live="polite"></div><p class="item-empty">Осы ұяшыққа бірнеше құжат пен фото қосуға болады.</p><div class="item-actions"><a class="item-upload item-batch-upload" data-item-kind="files" data-batch-upload href="#">＋ Бірнеше файл қосу</a><a class="item-upload" data-item-kind="files" href="#">＋ Құжаттар қосу</a><a class="item-upload item-photo-upload" data-item-kind="photos" href="#">＋ Фотолар қосу</a></div><details class="item-instructions"><summary>Қосу және басқару</summary><p>Бір немесе бірнеше файлды осы терезеден таңдаңыз да, «Жүктеу» арқылы сақтаңыз.</p><a data-item-manage href="#">Осы ұяшықты басқару</a></details></details></article>`;
}
if(typeof window!=='undefined'){
 function sync(items){
  let changed=false;
  for(const old of document.querySelectorAll('[data-custom-item]'))if(!items[old.dataset.customItem]?.custom){old.remove();changed=true;}
  for(const [id,card] of Object.entries(items)){
   if(!card.custom)continue;const slot=document.querySelector('[data-custom-cards="'+CSS.escape(card.section)+'"]');if(!slot)continue;
   const old=document.querySelector('[data-custom-item="'+CSS.escape(id)+'"]'),signature=JSON.stringify(card);if(old?.dataset.cardSignature===signature)continue;
   const template=document.createElement('template');template.innerHTML=cardMarkup(id,card);const node=template.content.firstElementChild;if(!node)continue;node.dataset.cardSignature=signature;if(old?.querySelector('.item-attachments')?.open)node.querySelector('.item-attachments').open=true;if(old)old.replaceWith(node);else slot.append(node);changed=true;
  }
  if(changed)document.dispatchEvent(new CustomEvent('portfolio-cards-rendered'));
 }
 window.PortfolioCards={sync};
 document.addEventListener('portfolio-items-changed',event=>sync(event.detail));
 const existing=window.PortfolioAdmin?.itemDefinitions;if(existing&&Object.keys(existing).length)sync(existing);
}

