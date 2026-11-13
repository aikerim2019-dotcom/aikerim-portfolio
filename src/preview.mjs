// A reading interface, not DRM: anything displayed by a browser can be captured.
let pdfLibrary;
async function pdfjs(){if(!pdfLibrary){pdfLibrary=await import('./vendor/pdfjs/pdf.min.mjs');pdfLibrary.GlobalWorkerOptions.workerSrc=new URL('./vendor/pdfjs/pdf.worker.min.mjs',import.meta.url).href;}return pdfLibrary;}
const make=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
export function createPreview(container){
 let disposed=false,pdf=null,loading=null,renderTask=null,pageNumber=1,renderVersion=0,image=null,zoom=1;
 const toolbar=make('div','portfolio-preview-toolbar'),previous=make('button','','←'),label=make('span'),next=make('button','','→'),smaller=make('button','','−'),bigger=make('button','','＋'),stage=make('div','portfolio-preview-stage'),status=make('p','portfolio-preview-status','Құжат ашылуда…');
 for(const [button,title] of [[previous,'Алдыңғы бет'],[next,'Келесі бет'],[smaller,'Кішірейту'],[bigger,'Үлкейту']]){button.type='button';button.setAttribute('aria-label',title);}
 status.setAttribute('role','status');toolbar.append(previous,label,next,smaller,bigger);container.replaceChildren(toolbar,status,stage);toolbar.hidden=true;
 async function draw(){
  const version=++renderVersion;renderTask?.cancel();renderTask=null;
  try{const available=Math.max(240,Math.min(1200,container.clientWidth-26)),ratio=Math.min(devicePixelRatio||1,2);let canvas=make('canvas');canvas.style.maxWidth='none';canvas.setAttribute('role','img');
   if(pdf){const page=await pdf.getPage(pageNumber);if(disposed||version!==renderVersion)return;const base=page.getViewport({scale:1}),scale=Math.min(available/base.width*zoom,Math.sqrt(8e6/(base.width*base.height))/ratio),viewport=page.getViewport({scale:scale*ratio});canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);canvas.style.width=(viewport.width/ratio)+'px';canvas.setAttribute('aria-label',pageNumber+' / '+pdf.numPages+' бет');stage.replaceChildren(canvas);renderTask=page.render({canvasContext:canvas.getContext('2d'),viewport});await renderTask.promise;
   }else if(image){const scale=Math.min(available/image.naturalWidth*zoom,Math.sqrt(8e6/(image.naturalWidth*image.naturalHeight))/ratio);canvas.width=Math.max(1,Math.round(image.naturalWidth*scale*ratio));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale*ratio));canvas.style.width=(canvas.width/ratio)+'px';canvas.setAttribute('aria-label','Фотосурет');canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);stage.replaceChildren(canvas);}
   if(disposed||version!==renderVersion)return;previous.hidden=next.hidden=!pdf;previous.disabled=pageNumber<=1;next.disabled=pageNumber>=(pdf?.numPages||1);label.textContent=pdf?pageNumber+' / '+pdf.numPages+' бет':'Фотосурет';toolbar.hidden=false;status.textContent='';
  }catch(e){if(!disposed&&version===renderVersion&&e.name!=='RenderingCancelledException')status.textContent='Құжатты көрсету мүмкін болмады. Бетті жаңартып көріңіз.';}
 }
 previous.onclick=()=>{if(pageNumber>1){pageNumber--;draw();}};next.onclick=()=>{if(pdf&&pageNumber<pdf.numPages){pageNumber++;draw();}};smaller.onclick=()=>{zoom=Math.max(.5,zoom-.25);draw();};bigger.onclick=()=>{zoom=Math.min(2,zoom+.25);draw();};
 return {async open(url,type){try{
  if(type==='application/pdf'){const library=await pdfjs();if(disposed)return;loading=library.getDocument({url,cMapUrl:new URL('./vendor/pdfjs/cmaps/',import.meta.url).href,cMapPacked:true,standardFontDataUrl:new URL('./vendor/pdfjs/standard_fonts/',import.meta.url).href,wasmUrl:new URL('./vendor/pdfjs/wasm/',import.meta.url).href,isEvalSupported:false});pdf=await loading.promise;if(disposed){await pdf.destroy();return;}}
  else if(type.startsWith('image/')){image=new Image();image.src=url;await image.decode();if(disposed)return;}
  else{status.textContent='Бұл файлдың алдын ала көрінісі әлі дайын емес. Кейінірек қайта көріңіз.';return;}
  await draw();
 }catch(e){if(!disposed)status.textContent='Құжат ашылмады. Интернет байланысын тексеріп, қайта көріңіз.';}},dispose(){disposed=true;renderVersion++;renderTask?.cancel();loading?.destroy()?.catch(()=>{});image=null;container.replaceChildren();}};
}
window.PortfolioPreview={create:createPreview};
