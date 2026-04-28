export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const apiKey = process.env.GEMINI_API_KEY || req.headers['x-api-key'];
  if (!apiKey) {
    return res.status(401).json({ error: { message: 'APIキーが設定されていません。' } });
  }

  const { system, messages, max_tokens } = req.body;

  // Anthropic形式 → Gemini形式に変換
  const contents = messages.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }));

  const geminiBody = {
    contents,
    generationConfig: { maxOutputTokens: max_tokens || 2000 },
  };
  if (system) {
    geminiBody.system_instruction = { parts: [{ text: system }] };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(geminiBody),
  });

  const data = await response.json();

  if (!response.ok) {
    return res.status(response.status).json({
      error: { message: data.error?.message || 'Gemini APIエラー' },
    });
  }

  // Gemini形式 → Anthropic形式に変換して返す
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return res.status(200).json({ content: [{ type: 'text', text }] });
}
