export type RiskLevel = 'Baixo' | 'Médio' | 'Alto';

export type AttentionCategory =
  | 'Multa'
  | 'Prazo'
  | 'Cláusula Abusiva'
  | 'Ambiguidade'
  | 'Falta de Contexto'
  | 'Obrigação'
  | string;

export interface AttentionPoint {
  categoria: AttentionCategory;
  titulo: string;
  explicacao: string;
  trechoRelacionado?: string;
}

export interface ClauseAnalysisResult {
  resumoLinhas: string[];
  nivelRisco: RiskLevel;
  justificativaRisco: string;
  possuiAmbiguidadeOuFaltaContexto: boolean;
  observacaoContexto: string;
  pontosAtencao: AttentionPoint[];
  perguntaParaNegociar: string;
  avisoLegal: string;
}

export interface HistoryEntry {
  id: string;
  createdAt: string;
  durationSeconds: number;
  clauseText: string;
  result: ClauseAnalysisResult;
}

export interface SampleClause {
  id: string;
  titulo: string;
  tipoContrato: string;
  previaRisco: string;
  texto: string;
}

export const SAMPLE_CLAUSES: SampleClause[] = [
  {
    id: 'rescisao-multa-alta',
    titulo: 'Fidelidade e Multa Rescisória Assimétrica',
    tipoContrato: 'Prestação de Serviços B2B',
    previaRisco: 'Multa elevada e renovação automática',
    texto: `CLÁUSULA OITAVA – DO PRAZO E RESCISÃO: O presente contrato vigorará pelo prazo determinado de 24 (vinte e quatro) meses, renovando-se automaticamente por iguais períodos caso o CONTRATANTE não manifeste intenção de não renovar mediante notificação escrita enviada com antecedência mínima de 90 (noventa) dias do término. Na hipótese de rescisão antecipada por iniciativa do CONTRATANTE, incidirá multa compensatória não reembolsável equivalente a 80% (oitenta por cento) do valor total das mensalidades vincendas até o fim do período vigente, além da perda imediata dos valores já pagos. A CONTRATADA poderá rescindir o presente instrumento a qualquer tempo, sem ônus, mediante simples aviso com 5 (cinco) dias de antecedência.`,
  },
  {
    id: 'ambiguidade-anexo-ausente',
    titulo: 'Reajuste e Escopo com Referência Ausente',
    tipoContrato: 'Desenvolvimento de Software',
    previaRisco: 'Falta de contexto e termos vagos',
    texto: `CLÁUSULA QUARTA – DOS SERVIÇOS ADICIONAIS E REAJUSTE: Quaisquer solicitações que extrapolem o escopo previsto no Anexo II serão cobradas à parte conforme a Tabela de Horas vigente da CONTRATADA, devendo ser pagas em prazo razoável após a emissão do relatório técnico. Os valores previstos na Cláusula Terceira poderão ser reajustados periodicamente a exclusivo critério da CONTRATADA sempre que houver variação relevante nos custos operacionais ou de infraestrutura.`,
  },
  {
    id: 'locacao-equilibrada',
    titulo: 'Devolução do Imóvel e Aviso Prévio Padrão',
    tipoContrato: 'Locação Residencial',
    previaRisco: 'Equilibrada com prazo claro',
    texto: `CLÁUSULA DÉCIMA SEGUNDA – DA DEVOLUÇÃO E VISTORIA: Findo o prazo da locação ou em caso de desocupação após os primeiros 12 (doze) meses de vigência, o LOCATÁRIO poderá devolver o imóvel sem incidência de multa, desde que comunique o LOCADOR por escrito com antecedência mínima de 30 (trinta) dias. O imóvel deverá ser entregue nas mesmas condições de conservação registradas no Laudo de Vistoria Inicial, ressalvado o desgaste natural decorrente do uso normal do bem.`,
  },
  {
    id: 'confidencialidade-eterna',
    titulo: 'Confidencialidade e Penalidade sem Limite',
    tipoContrato: 'Acordo de Confidencialidade (NDA)',
    previaRisco: 'Prazo perpétuo e dano pré-fixado',
    texto: `CLÁUSULA QUINTA – DAS PENALIDADES POR QUEBRA DE SIGILO: O RECEPTOR compromete-se a manter absoluto sigilo sobre quaisquer informações técnicas ou comerciais reveladas pela PARTE REVELADORA por prazo indeterminado, mesmo após o encerramento da relação comercial. O descumprimento de qualquer obrigação prevista nesta cláusula, ainda que por culpa leve de terceiros ou prepostos, sujeitará o RECEPTOR ao pagamento imediato de multa não compensatória no valor de R$ 250.000,00 (duzentos e cinquenta mil reais) por ocorrência, sem prejuízo de indenização suplementar por perdas e danos.`,
  },
];
