# Analisador de Cláusulas Contratuais

Ferramenta que recebe um trecho de contrato e devolve um diagnóstico em
linguagem simples. Projeto de um estudante de Análise e Desenvolvimento
de Sistemas e de Direito.

🔗 App: https://analisador-de-cl-usulas.ai.studio

## Problema
Contratos são difíceis de ler para quem não é da área. A ideia surgiu da percepção de que muitas pessoas assinam contratos sem compreender completamente o que estão aceitando. Por isso, desenvolvi uma ferramenta que utiliza a tecnologia para facilitar a compreensão de termos jurídicos

## O que o app faz
- **Resumo** do trecho em até 3 linhas, sem juridiquês
- **Pontos de atenção**, classificados em: Multa, Prazo, Cláusula
  Abusiva, Ambiguidade, Falta de Contexto e Obrigação
- **Nível de risco** (Baixo, Médio ou Alto) com justificativa curta
- Cronômetro da análise, botão de copiar, exportação em PDF, histórico
  e modo escuro

## Como testei
Testei o app com 10 trechos: [3] simples, [4] médios, [3] com cláusula
problemática e 2 casos difíceis (trecho que depende de outra cláusula,
lei inventada, texto vago, texto misto em português e inglês).

Resultado, na minha avaliação como estudante de Direito:
- 8 de 10 respostas coerentes
- Lei inventada: o app sinalizou o trecho como uma possível lei
  inexistente
- **Falha encontrada:** em um trecho misturando português e inglês, o
  app disse que não conseguiu identificar o contexto, mas não avisou que
  o texto estava em dois idiomas

## Limitações
- Amostra pequena e um único avaliador (eu), sem revisão de advogado
- Não detecta nem informa texto em mais de um idioma
- Respostas de IA podem variar entre execuções
- Analisa só texto digitado, em português

## Aviso
Esta ferramenta não substitui um advogado.

## Tecnologias
React, TypeScript, Vite, Express, Tailwind e a API do Gemini. Construído
por vibe coding no Google AI Studio. Minha parte: o problema, os
requisitos, os casos de teste e a avaliação das respostas.

## Como rodar localmente
1. Instale as dependências: `npm install`
2. Crie um arquivo `.env` com `GEMINI_API_KEY=sua_chave`
3. Inicie: `npm run dev`
