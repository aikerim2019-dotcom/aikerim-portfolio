(()=>{
 const form=document.querySelector('#contact-message-form'),status=document.querySelector('#contact-form-status'),submit=document.querySelector('#contact-send');let busy=false;
 form.onsubmit=async event=>{
  event.preventDefault();if(busy||!form.reportValidity())return;
  const data=new FormData(form);if(String(data.get('_honey')||'').trim()){status.textContent='Хабарламаны жіберу мүмкін болмады.';return;}
  busy=true;submit.disabled=true;submit.textContent='Жіберілуде…';status.classList.remove('error');status.textContent='Хабарлама пошта қызметіне жіберілуде…';
  try{
   const name=String(data.get('name')||'').trim(),email=String(data.get('email')||'').trim(),subject=String(data.get('subject')||'').trim(),message=String(data.get('message')||'').trim();if(!name||!email||!subject||!message)throw Error('Барлық өрісті толтырыңыз.');
   const response=await fetch(form.action,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({name,email,message,_subject:'Портфолио: '+subject,_replyto:email,_template:'table',subject})});
   const result=await response.json();const activation=/activat|confirm|verification|verify/i.test(String(result.message||''));if(!activation&&(!response.ok||(result.success!==true&&result.success!=='true')))throw Error('Пошта қызметі хабарламаны қабылдамады. Қайта көріңіз немесе «Пошта бағдарламасымен хат жазу» сілтемесін қолданыңыз.');status.textContent=activation?'Пошта қызметін алғаш рет іске қосу үшін сайт иесі поштасына келген растау сілтемесін басуы қажет. Расталғаннан кейін хабарламаны қайта жіберіңіз.':'Хабарлама пошта қызметіне қабылданды. Жауап сіз көрсеткен поштаға жіберіледі.';if(!activation)form.reset();
  }catch(e){status.textContent=e instanceof TypeError?'Байланыс үзілді. Хабарлама сақталған жоқ. Қайта көріңіз немесе тікелей пошта сілтемесін қолданыңыз.':e.message;status.classList.add('error');}
  finally{busy=false;submit.disabled=false;submit.textContent='Хабарламаны жіберу';}
 };
})();
