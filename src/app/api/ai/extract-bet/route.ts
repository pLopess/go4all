import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: NextRequest) {
  try {
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ error: 'A imagem do cupom é obrigatória' }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `Você é um assistente especializado em ler cupons e prints de apostas esportivas (Betano, Bet365, etc).
Analise a imagem anexa e extraia exatamente as seguintes informações no formato JSON:
- "title": O mercado e a seleção principal da aposta resumida (ex: "Equador vence" ou "Mais de 2.5 Gols - Brasil")
- "odd": O valor numérico da odd final daquele bilhete (ex: 1.85). Se não encontrar, retorne 1.00.
- "description": Um resumo muito breve do que é a aposta e os times envolvidos.
- "home_team": Nome do time da casa (se possível identificar). Retorne string vazia se não achar.
- "away_team": Nome do time visitante (se possível identificar). Retorne string vazia se não achar.

IMPORTANTE: Retorne APENAS um JSON válido. Não inclua textos explicativos nem formatação markdown.
Exemplo de Saída:
{"title": "Equador - Vencedor", "odd": 1.85, "description": "Vitória seca do Equador contra Curaçao no tempo regulamentar", "home_team": "Equador", "away_team": "Curaçao"}
`;

    // Processamento do Base64 da imagem
    // O prefixo normalmente é "data:image/jpeg;base64,/9j/4AAQ..."
    const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
    
    // Tentativa de deduzir o mimetype pelo prefixo, fallback para jpeg
    let mimeType = 'image/jpeg';
    if (imageBase64.startsWith('data:image/png')) mimeType = 'image/png';
    else if (imageBase64.startsWith('data:image/webp')) mimeType = 'image/webp';

    const imageParts = [
      {
        inlineData: {
          data: base64Data,
          mimeType
        }
      }
    ];

    const result = await model.generateContent([prompt, ...imageParts]);
    const responseText = result.response.text();
    
    // Parse JSON seguro
    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const data = JSON.parse(cleanJson);

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('OCR Error:', error);
    return NextResponse.json({ error: 'Falha ao processar imagem. Preencha manualmente ou tente um print mais claro.' }, { status: 500 });
  }
}
