import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

const SYSTEM_INSTRUCTION = `Você é um especialista em leitura e tradução de cláusulas contratuais para linguagem simples e acessível em português brasileiro.
Sua tarefa é analisar o trecho de contrato enviado pelo usuário e devolver um diagnóstico estruturado, claro e objetivo.

Siga rigorosamente estas regras obrigatórias:
1. RESUMO EM ATÉ 3 LINHAS: Explique o que a cláusula diz na prática, sem juridiquês, em no máximo 3 linhas curtas (máximo de 3 frases diretas).
2. PONTOS DE ATENÇÃO: Liste os principais pontos de atenção encontrados no trecho, classificando cada um em:
   - "Multa" (penalidades financeiras, juros, retenções, taxas de rescisão)
   - "Prazo" (datas limites, aviso prévio, renovação automática, vigência, fidelidade)
   - "Cláusula Abusiva" (desequilíbrio evidente entre as partes, renúncia de direitos básicos, alterações unilaterais sem aviso)
   - "Ambiguidade" (termos vagos como "prazo razoável", "a critério exclusivo", "custos adicionais" não especificados, dupla interpretação)
   - "Falta de Contexto" (referências a outras cláusulas, anexos, tabelas ou condições que não estão presentes no trecho colado)
   - "Obrigação" (deveres importantes ou restrições que exigem cuidado)
3. NÍVEL DE RISCO ("Baixo", "Médio" ou "Alto") COM JUSTIFICATIVA CURTA:
   - "Baixo": Cláusula padrão, clara, equilibrada e previsível para ambas as partes.
   - "Médio": Contém prazos rígidos, multas moderadas, ambiguidades relevantes ou depende de informações ausentes no trecho.
   - "Alto": Contém multas pesadas/desproporcionais, renovação automática punitiva, poder unilateral excessivo, forte indício de abusividade ou grave omissão que pode gerar prejuízo.
4. REGRA CONTRA INVENÇÃO (AMBIGUIDADE E FALTA DE CONTEXTO):
   - Se o trecho for ambíguo, incompleto ou fizer referência a outros itens/anexos não fornecidos, DIGA ISSO EXPLICITAMENTE tanto no campo "observacaoContexto" quanto nos pontos de atenção. NUNCA invente valores, prazos ou interpretações que não estejam escritos no texto.
5. REGRA SOBRE ARTIGOS DE LEI:
   - NÃO cite números de artigos de lei (ex.: "Art. 51 do CDC" ou "Art. 412 do Código Civil") a menos que tenha absoluta certeza e seja estritamente indispensável. Prefira explicar o princípio jurídico em linguagem simples (ex.: "no direito brasileiro, multas costumam ser limitadas ao valor da obrigação principal" ou "cláusulas que permitem mudança unilateral de preço costumam ser questionadas").`;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "1mb" }));

  app.post("/api/analyze", async (req, res) => {
    try {
      const { clauseText } = req.body;

      if (!clauseText || typeof clauseText !== "string" || clauseText.trim().length < 10) {
        return res.status(400).json({
          error: "Por favor, cole um trecho de contrato com pelo menos 10 caracteres para realizar a análise.",
        });
      }

      const trimmedText = clauseText.trim().slice(0, 12000);

      const response = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: `Analise o seguinte trecho de contrato:\n\n"""\n${trimmedText}\n"""`,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.LOW,
          },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              resumoLinhas: {
                type: Type.ARRAY,
                items: {
                  type: Type.STRING,
                },
                description:
                  "Resumo da cláusula em linguagem simples, contendo entre 1 e 3 linhas curtas e diretas (máximo de 3 itens).",
              },
              nivelRisco: {
                type: Type.STRING,
                description: "Nível de risco da cláusula. Deve ser exatamente 'Baixo', 'Médio' ou 'Alto'.",
              },
              justificativaRisco: {
                type: Type.STRING,
                description: "Justificativa curta e direta (1 a 2 frases) explicando o motivo do nível de risco atribuído.",
              },
              possuiAmbiguidadeOuFaltaContexto: {
                type: Type.BOOLEAN,
                description:
                  "Verdadeiro se o trecho for ambíguo, vago, truncado ou depender de outras cláusulas/anexos não informados.",
              },
              observacaoContexto: {
                type: Type.STRING,
                description:
                  "Explicação clara caso falte contexto ou haja ambiguidade no trecho. Se o trecho for completo e claro, indique brevemente que os elementos essenciais estão presentes.",
              },
              pontosAtencao: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    categoria: {
                      type: Type.STRING,
                      description:
                        "Categoria do ponto: 'Multa', 'Prazo', 'Cláusula Abusiva', 'Ambiguidade', 'Falta de Contexto' ou 'Obrigação'.",
                    },
                    titulo: {
                      type: Type.STRING,
                      description: "Título curto e direto do ponto de atenção.",
                    },
                    explicacao: {
                      type: Type.STRING,
                      description:
                        "Explicação em linguagem simples sobre o impacto prático deste ponto para quem assina.",
                    },
                    trechoRelacionado: {
                      type: Type.STRING,
                      description:
                        "Citação curta do trecho exato do contrato que gerou este alerta (ou vazio se for sobre algo omitido).",
                    },
                  },
                  required: ["categoria", "titulo", "explicacao", "trechoRelacionado"],
                },
                description: "Lista de pontos de atenção identificados na cláusula (entre 1 e 6 pontos).",
              },
              perguntaParaNegociar: {
                type: Type.STRING,
                description:
                  "Uma sugestão prática de pergunta ou ajuste que o usuário pode fazer à outra parte antes de assinar.",
              },
            },
            required: [
              "resumoLinhas",
              "nivelRisco",
              "justificativaRisco",
              "possuiAmbiguidadeOuFaltaContexto",
              "observacaoContexto",
              "pontosAtencao",
              "perguntaParaNegociar",
            ],
          },
        },
      });

      const rawText = (response.text ?? "{}").trim();
      const parsed = JSON.parse(rawText);

      // Normalize risk level
      const normalizedRisk =
        parsed.nivelRisco === "Alto" || parsed.nivelRisco === "Médio" || parsed.nivelRisco === "Baixo"
          ? parsed.nivelRisco
          : String(parsed.nivelRisco || "").toLowerCase().includes("alt")
          ? "Alto"
          : String(parsed.nivelRisco || "").toLowerCase().includes("baix")
          ? "Baixo"
          : "Médio";

      const resumoLinhas = Array.isArray(parsed.resumoLinhas)
        ? parsed.resumoLinhas.slice(0, 3).map((l: unknown) => String(l).trim()).filter(Boolean)
        : [String(parsed.resumoLinhas || "Não foi possível gerar o resumo.")];

      return res.json({
        resumoLinhas,
        nivelRisco: normalizedRisk,
        justificativaRisco: String(parsed.justificativaRisco || ""),
        possuiAmbiguidadeOuFaltaContexto: Boolean(parsed.possuiAmbiguidadeOuFaltaContexto),
        observacaoContexto: String(parsed.observacaoContexto || ""),
        pontosAtencao: Array.isArray(parsed.pontosAtencao) ? parsed.pontosAtencao : [],
        perguntaParaNegociar: String(parsed.perguntaParaNegociar || ""),
        avisoLegal: "Não substitui um advogado.",
      });
    } catch (error: unknown) {
      console.error("Erro na análise Gemini:", error);
      const errMsg = error instanceof Error ? error.message : String(error);

      if (errMsg.includes("API_KEY_INVALID") || errMsg.includes("PERMISSION_DENIED") || errMsg.includes("403")) {
        return res.status(403).json({
          error:
            "Chave da API do Gemini inválida ou sem permissão. Verifique sua chave no painel Settings > Secrets do AI Studio.",
        });
      }

      if (errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("429")) {
        return res.status(429).json({
          error:
            "Limite de requisições atingido (429). Aguarde alguns instantes ou utilize uma chave com faturamento ativo em Settings > Secrets.",
        });
      }

      return res.status(500).json({
        error: "Não foi possível concluir a análise da cláusula no momento. Tente novamente em instantes.",
      });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
  });
}

startServer();
