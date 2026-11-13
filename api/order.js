export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const token = process.env.BOT_TOKEN;
  const chatId = process.env.CHAT_ID;
  if (!token || !chatId) return res.status(500).json({ error: 'BOT_TOKEN yoki CHAT_ID sozlanmagan' });
  try {
    const { country, name, phone, address, items, total, currency } = req.body || {};
    if (!name || !phone || !address || !Array.isArray(items) || !items.length) return res.status(400).json({ error: 'Buyurtma ma’lumotlari to‘liq emas' });
    const lines = items.map((item, i) => `${i + 1}. ${item.name} — ${Number(item.price).toLocaleString('en-US')}`).join('\n');
    const message = `🛍 PRIMEFIT — YANGI BUYURTMA\n\n🌍 Mamlakat: ${country === 'KR' ? 'Janubiy Koreya' : country === 'UZ' ? 'O‘zbekiston' : country || '-'}\n👤 Ism: ${name}\n📞 Telefon: ${phone}\n📍 Manzil: ${address}\n\n📦 Mahsulotlar:\n${lines}\n\n💰 Jami: ${Number(total || 0).toLocaleString('en-US')} ${currency || ''}`;
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message })
    });
    const result = await response.json();
    if (!response.ok || !result.ok) return res.status(502).json({ error: 'Telegramga yuborishda xatolik' });
    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: 'Server xatoligi' });
  }
}
