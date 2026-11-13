const categories = ['Ayoq kiyim','Triko','Djenper','Jacket','Ko‘ylak','Classic','Sport mahsulotlari','Aksesuar','Aralash'];
const names = ['Kundalik krossovka','Qishki etik','Classic tufli','Yumshoq triko','Issiq djenper','Minimal jacket','Klassik ko‘ylak','Sport kostyum','Bel sumka','Qishki shapka','Classic shim','Yengil kurtka','Ayollar etik','Basic futbolka','Sport sumka','Charm kamar','Kundalik loafer','Qalin sviter','Yomg‘irpo‘sh','Yengil kepka','Classic jaket','Polo ko‘ylak','Sport oyoq kiyim','Qo‘lqop','Kardigan','Yelka sumka','Uy shippagi','Qishki botinka','Oversize hoodie','Paypoq to‘plami','Ko‘zoynak','Sayohat sumkasi','Trening shim','Yengil krossovka','Triko to‘plami'];
const products = names.map((name, i) => ({ id: i + 1, name, category: categories[i % categories.length], krw: 18000 + i * 1700, uzs: 110000 + i * 9500 }));
const money = (n, c) => c === 'KR' ? '₩' + Number(n).toLocaleString('en-US') : Number(n).toLocaleString('en-US') + ' so‘m';
const price = (p, c) => c === 'KR' ? p.krw : p.uzs;
const btn = (text, data) => ({ text, callback_data: data });
const countryKeyboard = () => ({ inline_keyboard: [[btn('🇺🇿 O‘zbekiston — so‘m','home:UZ')],[btn('🇰🇷 Janubiy Koreya — won','home:KR')]] });
const homeKeyboard = c => ({ inline_keyboard: [[btn('🛍 Kategoriyalar','cats:'+c)],[btn('🌍 Mamlakatni almashtirish','country')]] });
function categoryKeyboard(c) {
  const rows = [];
  for (let i=0;i<categories.length;i+=2) rows.push([btn(categories[i],'cat:'+c+':'+i), ...(categories[i+1]?[btn(categories[i+1],'cat:'+c+':'+(i+1))]:[])]);
  rows.push([btn('⬅️ Bosh menyu','home:'+c)]);
  return { inline_keyboard: rows };
}
function productListKeyboard(c,i) {
  const rows = products.filter(p=>p.category===categories[i]).map(p=>[btn(p.name+' · '+money(price(p,c),c),'p:'+c+':'+p.id)]);
  rows.push([btn('⬅️ Kategoriyalar','cats:'+c)]);
  return { inline_keyboard: rows };
}
function productKeyboard(c,id) {
  return { inline_keyboard: [[btn('🛒 Buyurtma berish','buy:'+c+':'+id)],[btn('⬅️ Kategoriyalar','cats:'+c)]] };
}
async function telegram(method, token, body) {
  const r = await fetch('https://api.telegram.org/bot'+token+'/'+method,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
  const j = await r.json();
  if (!r.ok || !j.ok) throw new Error(j.description || 'Telegram API error');
  return j.result;
}
async function send(chatId,token,text,reply_markup) {
  return telegram('sendMessage',token,{chat_id:chatId,text,...(reply_markup?{reply_markup}:{})});
}
function customerInfo(raw) {
  const rows=String(raw||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean), obj={};
  for(const row of rows){const m=row.match(/^(ism|telefon|tel|manzil)\s*:\s*(.*)$/i);if(m)obj[m[1].toLowerCase()]=m[2].trim();}
  const plain=rows.filter(s=>!/^(ism|telefon|tel|manzil)\s*:/i.test(s));
  return {name:obj.ism||plain[0]||'',phone:obj.telefon||obj.tel||plain[1]||'',address:obj.manzil||plain.slice(2).join(', ')||''};
}
const clean = s => String(s||'-').replace(/[<>]/g,'');
export default async function handler(req,res) {
  const token=process.env.BOT_TOKEN;
  if(!token) return res.status(500).send('BOT_TOKEN is not configured');
  if(req.method==='GET' && req.query?.setup) {
    if(!process.env.BOT_SETUP_SECRET || req.query.setup!==process.env.BOT_SETUP_SECRET) return res.status(403).send('Forbidden');
    const secret=process.env.BOT_WEBHOOK_SECRET;
    if(!secret) return res.status(500).send('BOT_WEBHOOK_SECRET is not configured');
    const webhook=await telegram('setWebhook',token,{url:'https://primefitstorestarter.vercel.app/api/bot',secret_token:secret,allowed_updates:['message','callback_query']});
    await telegram('setMyCommands',token,{commands:[{command:'start',description:'PrimeFit do‘konini ochish'},{command:'catalog',description:'Mahsulotlar katalogi'},{command:'help',description:'Yordam'}]});
    return res.status(200).json({ok:true,webhook,message:'PrimeFit bot webhook ulandi'});
  }
  if(req.method!=='POST') return res.status(405).send('Method not allowed');
  if(req.headers['x-telegram-bot-api-secret-token']!==process.env.BOT_WEBHOOK_SECRET) return res.status(401).send('Unauthorized');
  try {
    const update=req.body||{}, msg=update.message, cb=update.callback_query;
    if(cb) {
      const chatId=cb.message?.chat?.id, messageId=cb.message?.message_id, data=String(cb.data||'');
      const [action,country,value]=data.split(':');
      if(action==='pf') {
        const adminId=process.env.ADMIN_TELEGRAM_ID||process.env.CHAT_ID;
        if(!adminId||String(cb.from?.id)!==String(adminId)) {
          await telegram('answerCallbackQuery',token,{callback_query_id:cb.id,text:'Bu amal faqat administrator uchun.',show_alert:true});
          return res.status(200).json({ok:true});
        }
        const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabaseUrl=process.env.SUPABASE_URL||'https://txdhpemtyzivroesohdh.supabase.co';
        if(!serviceKey) {
          await telegram('answerCallbackQuery',token,{callback_query_id:cb.id,text:'Server sozlamasi tugallanmagan: service role key kerak.',show_alert:true});
          return res.status(200).json({ok:true});
        }
        if(!['a','r'].includes(country)||! /^[0-9a-f-]{36}$/i.test(value||'')) {
          await telegram('answerCallbackQuery',token,{callback_query_id:cb.id,text:'Buyurtma ma’lumoti noto‘g‘ri.',show_alert:true});
          return res.status(200).json({ok:true});
        }
        const nextStatus=country==='a'?'approved':'rejected';
        const updated=await fetch(supabaseUrl+'/rest/v1/orders?id=eq.'+encodeURIComponent(value)+'&status=eq.under_review',{
          method:'PATCH',
          headers:{'Content-Type':'application/json','apikey':serviceKey,'Authorization':'Bearer '+serviceKey,'Prefer':'return=representation'},
          body:JSON.stringify({status:nextStatus,updated_at:new Date().toISOString()})
        });
        const rows=await updated.json();
        if(!updated.ok) throw new Error('Supabase order update failed: '+JSON.stringify(rows));
        if(!Array.isArray(rows)||!rows.length) {
          await telegram('answerCallbackQuery',token,{callback_query_id:cb.id,text:'Buyurtma topilmadi yoki avval ko‘rib chiqilgan.',show_alert:true});
          return res.status(200).json({ok:true});
        }
        const resultLabel=nextStatus==='approved'?'✅ TASDIQLANDI':'❌ RAD ETILDI';
        await telegram('editMessageCaption',token,{chat_id:chatId,message_id:messageId,caption:(cb.message?.caption||'PrimeFit buyurtmasi')+'\\n\\n'+resultLabel,reply_markup:{inline_keyboard:[]}});
        await telegram('answerCallbackQuery',token,{callback_query_id:cb.id,text:resultLabel});
        return res.status(200).json({ok:true,status:nextStatus});
      }
      await telegram('answerCallbackQuery',token,{callback_query_id:cb.id});
      if(action==='country') await telegram('editMessageText',token,{chat_id:chatId,message_id:messageId,text:'Buyurtma uchun mamlakatni tanlang:',reply_markup:countryKeyboard()});
      else if(action==='home') await telegram('editMessageText',token,{chat_id:chatId,message_id:messageId,text:'Assalomu alaykum! 👋\nPrimeFit do‘koniga xush kelibsiz.\n\nMamlakat: '+(country==='KR'?'Janubiy Koreya':'O‘zbekiston')+'\nBo‘limni tanlang:',reply_markup:homeKeyboard(country)});
      else if(action==='cats') await telegram('editMessageText',token,{chat_id:chatId,message_id:messageId,text:'📂 Mahsulot kategoriyasini tanlang:',reply_markup:categoryKeyboard(country)});
      else if(action==='cat') {
        const i=Number(value); if(!Number.isInteger(i)||!categories[i]) throw new Error('Category not found');
        await telegram('editMessageText',token,{chat_id:chatId,message_id:messageId,text:'📂 '+categories[i]+'\n\nMahsulotni tanlang:',reply_markup:productListKeyboard(country,i)});
      } else if(action==='p') {
        const p=products.find(x=>x.id===Number(value)); if(!p) throw new Error('Product not found');
        await telegram('editMessageText',token,{chat_id:chatId,message_id:messageId,text:'🛍 '+p.name+'\n\nKategoriya: '+p.category+'\nNarxi: '+money(price(p,country),country)+'\n\nMahsulot rasmlari va aniq tavsiflari keyin qo‘shiladi.',reply_markup:productKeyboard(country,p.id)});
      } else if(action==='buy') {
        const p=products.find(x=>x.id===Number(value)); if(!p) throw new Error('Product not found');
        await send(chatId,token,'📝 Buyurtma: '+p.name+'\nNarxi: '+money(price(p,country),country)+'\nMamlakat: '+country+'\n\nQuyidagi ma’lumotlarni bitta xabarda yuboring:\nIsm: ...\nTelefon: ...\nManzil: ...\n\nJavobni shu xabarga Reply qilib yuboring.');
      }
      return res.status(200).json({ok:true});
    }
    if(msg?.text) {
      const text=msg.text.trim(), chatId=msg.chat.id;
      if(/^\/(start|catalog)(@\w+)?/i.test(text)) {
        await send(chatId,token,'Assalomu alaykum! 👋\nPrimeFit do‘koniga xush kelibsiz.\n\nBuyurtma mamlakatini tanlang:',countryKeyboard());
        return res.status(200).json({ok:true});
      }
      if(/^\/help(@\w+)?/i.test(text)) {
        await send(chatId,token,'Yordam:\n/start — do‘konni ochish\n/catalog — katalog\n\nMahsulotni tanlang, “Buyurtma berish” tugmasini bosing va ism, telefon, manzilingizni yuboring.');
        return res.status(200).json({ok:true});
      }
      const prompt=msg.reply_to_message?.text||'', match=prompt.match(/📝 Buyurtma:\s*(.+)/);
      if(match) {
        const p=products.find(x=>x.name===match[1].trim()), c=prompt.includes('Mamlakat: KR')?'KR':'UZ', customer=customerInfo(text);
        if(!p) { await send(chatId,token,'Mahsulot topilmadi. /start orqali qayta boshlang.'); return res.status(200).json({ok:true}); }
        if(!customer.name||!customer.phone||!customer.address) { await send(chatId,token,'Ma’lumotlar to‘liq emas. Quyidagicha yuboring:\nIsm: ...\nTelefon: ...\nManzil: ...'); return res.status(200).json({ok:true}); }
        if(!process.env.CHAT_ID) throw new Error('CHAT_ID is not configured');
        const adminText='🛍 PRIMEFIT — YANGI BOT BUYURTMASI\n\n📦 Mahsulot: '+p.name+'\n📂 Kategoriya: '+p.category+'\n💰 Narx: '+money(price(p,c),c)+'\n🌍 Mamlakat: '+(c==='KR'?'Janubiy Koreya':'O‘zbekiston')+'\n\n👤 Ism: '+clean(customer.name)+'\n📞 Telefon: '+clean(customer.phone)+'\n📍 Manzil: '+clean(customer.address)+'\n\nTelegram ID: '+msg.from?.id;
        await send(process.env.CHAT_ID,token,adminText);
        await send(chatId,token,'✅ Buyurtmangiz qabul qilindi! Tez orada siz bilan bog‘lanamiz.');
      } else await send(chatId,token,'PrimeFit do‘konini ochish uchun /start yuboring.');
    }
    return res.status(200).json({ok:true});
  } catch(e) {
    console.error('PrimeFit bot:',e.message);
    return res.status(200).json({ok:true});
  }
}
