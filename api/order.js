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
    const lines = items.map((item, i) => (i + 1) + '. ' + String(item.name || 'Mahsulot') + ' — ' + Number(item.price).toLocaleString('en-US')).join('\n');
    const caption = '🧾 PRIMEFIT — TO‘LOV CHEKI\n\nBuyurtma: ' + orderId +
      '\n🌍 Mamlakat: ' + (country === 'KR' ? 'Janubiy Koreya' : 'O‘zbekiston') +
      '\n👤 Ism: ' + name + '\n📞 Telefon: ' + phone + '\n📍 Manzil: ' + address +
      '\n\n📦 Mahsulotlar:\n' + lines +
      '\n\n💰 Jami: ' + Number(total || 0).toLocaleString('en-US') + ' ' + (currency || '');
    const response = await fetch('https://api.telegram.org/bot' + token + '/sendPhoto', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        photo: receiptUrl,
        caption
      })
    });
    const result = await response.json();
    if (!response.ok || !result.ok) return res.status(502).json({ error: 'Chekni Telegramga yuborib bo‘lmadi' });
    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: 'Server xatoligi' });
  }
}
