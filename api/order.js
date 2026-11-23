export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const token = process.env.BOT_TOKEN;
  const chatId = process.env.CHAT_ID;
  if (!token || !chatId) return res.status(500).json({ error: 'Telegram sozlamalari topilmadi' });
  try {
    const { country, name, phone, address, items, total, currency, receiptUrl, orderId } = req.body || {};
    if (!name || !phone || !address || !Array.isArray(items) || !items.length || !receiptUrl || !orderId) {
      return res.status(400).json({ error: 'Buyurtma yoki chek ma’lumotlari to‘liq emas' });
    }
    if (!/^https:\/\//i.test(receiptUrl)) return res.status(400).json({ error: 'Chek havolasi noto‘g‘ri' });
    const lines = items.map((item, i) => {
      const qty = Math.max(1, Number(item.quantity) || 1);
      return (i + 1) + '. ' + String(item.name || 'Mahsulot') +
        '\n   🏷 Ichki kod: ' + String(item.internal_code || 'Kiritilmagan') +
        (item.description ? '\n   📝 Tavsif: ' + String(item.description) : '') +
        (item.color ? '\n   🎨 Rang: ' + String(item.color) : '') +
        (item.size ? '\n   📏 O‘lcham: ' + String(item.size) : '') +
        '\n   🔢 Soni: ' + qty +
        '\n   💵 Narxi: ' + (Number(item.price) * qty).toLocaleString('en-US');
    }).join('\n\n');
    const customer = '🌍 Mamlakat: ' + (country === 'KR' ? 'Janubiy Koreya' : 'O‘zbekiston') +
      '\n👤 Ism: ' + name + '\n📞 Telefon: ' + phone + '\n📍 Manzil: ' + address;
    const detailText = '📦 PRIMEFIT — BUYURTMA TARKIBI\nBuyurtma: ' + orderId +
      '\n\n' + lines + '\n\n💰 Jami: ' + Number(total || 0).toLocaleString('en-US') + ' ' + (currency || '');
    const captionFull = '🧾 PRIMEFIT — YANGI BUYURTMA\n\nBuyurtma: ' + orderId +
      '\n' + customer + '\n\n' + lines +
      '\n\n💰 Jami: ' + Number(total || 0).toLocaleString('en-US') + ' ' + (currency || '');
    const caption = captionFull.length <= 1024 ? captionFull :
      '🧾 PRIMEFIT — YANGI BUYURTMA\nBuyurtma: ' + orderId + '\n' + customer +
      '\n\nMahsulotlar tafsiloti alohida xabarda yuborildi.';
    const response = await fetch('https://api.telegram.org/bot' + token + '/sendPhoto', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        photo: receiptUrl,
        caption,
        reply_markup: { inline_keyboard: [[
          { text: '✅ Tasdiqlash', callback_data: 'pf:a:' + orderId },
          { text: '❌ Rad etish', callback_data: 'pf:r:' + orderId }
        ]] }
      })
    });
    const result = await response.json();
    if (!response.ok || !result.ok) return res.status(502).json({ error: 'Chekni Telegramga yuborib bo‘lmadi' });
    if (captionFull.length > 1024) {
      const detailResponse = await fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: detailText })
      });
      const detailResult = await detailResponse.json();
      if (!detailResponse.ok || !detailResult.ok) return res.status(502).json({ error: 'Buyurtma tafsilotlarini Telegramga yuborib bo‘lmadi' });
    }
    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: 'Server xatoligi' });
  }
}
