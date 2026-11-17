import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Copy,
  Check,
  Download,
  Clock,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Info,
  Trash2,
  RotateCcw,
  Search,
  ChevronRight,
  HelpCircle,
} from 'lucide-react';
import {
  ClauseAnalysisResult,
  HistoryEntry,
  SAMPLE_CLAUSES,
  SampleClause,
} from './types';
import { exportAnalysisToPdf } from './utils/pdfExport';

type ThemeMode = 'auto' | 'light' | 'dark';

const STORAGE_KEY_HISTORY = 'analisador_clausulas_historico_v1';
const STORAGE_KEY_THEME = 'analisador_clausulas_tema_v1';

export default function App() {
  const [clauseText, setClauseText] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<ClauseAnalysisResult | null>(null);

  // Chronometer state (in seconds)
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const timerIntervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  // Copy feedback state
  const [copied, setCopied] = useState<boolean>(false);

  // Category filter for attention points
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');

  // History state
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_HISTORY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [historySearch, setHistorySearch] = useState<string>('');

  // Theme state with automatic system dark mode detection
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_THEME) as ThemeMode | null;
      if (saved === 'light' || saved === 'dark' || saved === 'auto') {
        return saved;
      }
    } catch {
      // ignore storage errors
    }
    return 'auto';
  });

  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      const shouldBeDark =
        themeMode === 'dark' || (themeMode === 'auto' && mediaQuery.matches);
      if (shouldBeDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    applyTheme();
    try {
      localStorage.setItem(STORAGE_KEY_THEME, themeMode);
    } catch {
      // ignore storage errors
    }

    const listener = () => {
      if (themeMode === 'auto') {
        applyTheme();
      }
    };

    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, [themeMode]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));
    } catch {
      // ignore storage errors
    }
  }, [history]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current !== null) {
        window.clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  const startChronometer = () => {
    if (timerIntervalRef.current !== null) {
      window.clearInterval(timerIntervalRef.current);
    }
    startTimeRef.current = performance.now();
    setElapsedSeconds(0);
    timerIntervalRef.current = window.setInterval(() => {
      const now = performance.now();
      setElapsedSeconds((now - startTimeRef.current) / 1000);
    }, 40);
  };

  const stopChronometer = (): number => {
    if (timerIntervalRef.current !== null) {
      window.clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    const finalSeconds = Math.max(
      0.05,
      (performance.now() - startTimeRef.current) / 1000
    );
    setElapsedSeconds(finalSeconds);
    return finalSeconds;
  };

  const handleAnalyze = async (customText?: string) => {
    const textToAnalyze = (customText ?? clauseText).trim();
    if (textToAnalyze.length < 10) {
      setErrorMessage(
        'Cole um trecho de contrato com pelo menos 10 caracteres antes de clicar em Analisar.'
      );
      return;
    }

    setErrorMessage(null);
    setIsAnalyzing(true);
    setSelectedCategory('Todos');
    startChronometer();

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clauseText: textToAnalyze }),
      });

      const data = await response.json();
      const duration = stopChronometer();

      if (!response.ok) {
        setErrorMessage(
          data.error ||
            'Ocorreu um erro ao analisar a cláusula. Tente novamente.'
        );
        setIsAnalyzing(false);
        return;
      }

      const analysisResult: ClauseAnalysisResult = {
        resumoLinhas: Array.isArray(data.resumoLinhas)
          ? data.resumoLinhas.slice(0, 3)
          : [String(data.resumoLinhas || '')],
        nivelRisco: data.nivelRisco || 'Médio',
        justificativaRisco: data.justificativaRisco || '',
        possuiAmbiguidadeOuFaltaContexto: Boolean(
          data.possuiAmbiguidadeOuFaltaContexto
        ),
        observacaoContexto: data.observacaoContexto || '',
        pontosAtencao: Array.isArray(data.pontosAtencao)
          ? data.pontosAtencao
          : [],
        perguntaParaNegociar: data.perguntaParaNegociar || '',
        avisoLegal: 'Não substitui um advogado.',
      };

      setResult(analysisResult);

      const newEntry: HistoryEntry = {
        id: `${Date.now()}`,
        createdAt: new Date().toLocaleString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        }),
        durationSeconds: duration,
        clauseText: textToAnalyze,
        result: analysisResult,
      };

      setHistory((prev) => [newEntry, ...prev.slice(0, 14)]);
    } catch {
      stopChronometer();
      setErrorMessage(
        'Falha de conexão com o servidor de análise. Verifique sua internet e tente novamente.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSelectSample = (sample: SampleClause) => {
    setClauseText(sample.texto);
    setErrorMessage(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReset = () => {
    setClauseText('');
    setResult(null);
    setErrorMessage(null);
    setElapsedSeconds(0);
    setSelectedCategory('Todos');
  };

  const formatCopyText = (): string => {
    if (!result) return '';
    const lines: string[] = [
      '=== ANALISADOR DE CLÁUSULAS ===',
      `Tempo de análise: ${elapsedSeconds.toFixed(2)}s`,
      `Nível de Risco: ${result.nivelRisco.toUpperCase()}`,
      `Justificativa: ${result.justificativaRisco}`,
      '',
      '1. RESUMO EM ATÉ 3 LINHAS:',
      ...result.resumoLinhas.map((l, i) => `   ${i + 1}) ${l}`),
      '',
      '2. CONTEXTO E AMBIGUIDADE:',
      `   ${result.observacaoContexto}`,
      '',
      `3. PONTOS DE ATENÇÃO (${result.pontosAtencao.length}):`,
      ...result.pontosAtencao.map(
        (p, i) =>
          `   ${i + 1}) [${p.categoria}] ${p.titulo}: ${p.explicacao}${
            p.trechoRelacionado ? ` (Trecho: "${p.trechoRelacionado}")` : ''
          }`
      ),
    ];

    if (result.perguntaParaNegociar) {
      lines.push(
        '',
        '4. SUGESTÃO PARA NEGOCIAR:',
        `   ${result.perguntaParaNegociar}`
      );
    }

    lines.push(
      '',
      '-----------------------------------------',
      'Aviso: Não substitui um advogado.'
    );

    return lines.join('\n');
  };

  const handleCopyResult = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(formatCopyText());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      // Fallback copy method for restricted iframes
      const textarea = document.createElement('textarea');
      textarea.value = formatCopyText();
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    }
  };

  const handleExportPdf = () => {
    if (!result) return;
    exportAnalysisToPdf(clauseText, result, elapsedSeconds);
  };

  const handleLoadFromHistory = (entry: HistoryEntry) => {
    setClauseText(entry.clauseText);
    setResult(entry.result);
    setElapsedSeconds(entry.durationSeconds);
    setErrorMessage(null);
    setSelectedCategory('Todos');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleClearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEY_HISTORY);
    } catch {
      // ignore
    }
  };

  const categories = result
    ? [
        'Todos',
        ...Array.from(new Set(result.pontosAtencao.map((p) => p.categoria))),
      ]
    : ['Todos'];

  const filteredPoints = result
    ? selectedCategory === 'Todos'
      ? result.pontosAtencao
      : result.pontosAtencao.filter((p) => p.categoria === selectedCategory)
    : [];

  const filteredHistory = history.filter(
    (item) =>
      item.clauseText.toLowerCase().includes(historySearch.toLowerCase()) ||
      item.result.nivelRisco.toLowerCase().includes(historySearch.toLowerCase())
  );

  const wordCount = clauseText.trim()
    ? clauseText.trim().split(/\s+/).length
    : 0;
  const charCount = clauseText.length;

  const getRiskMeta = (risk: ClauseAnalysisResult['nivelRisco']) => {
    if (risk === 'Alto') {
      return {
        label: 'Risco Alto',
        textClass: 'text-red-700 dark:text-red-400',
        surfaceClass:
          'bg-red-50/70 dark:bg-red-950/30 border-red-200 dark:border-red-900/60',
        Icon: ShieldAlert,
      };
    }
    if (risk === 'Baixo') {
      return {
        label: 'Risco Baixo',
        textClass: 'text-emerald-700 dark:text-emerald-400',
        surfaceClass:
          'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/60',
        Icon: ShieldCheck,
      };
    }
    return {
      label: 'Risco Médio',
      textClass: 'text-amber-700 dark:text-amber-400',
      surfaceClass:
        'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60',
      Icon: AlertTriangle,
    };
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-150">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-8 px-4 sm:px-8 py-3.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#analisador"
          className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0 font-display"
        >
          Analisador de Cláusulas
        </a>

        {/* Zone 2: 4 concise single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-400">
          <a
            href="#analisador"
            className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0"
          >
            Analisador
          </a>
          <a
            href="#exemplos"
            className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0"
          >
            Exemplos Práticos
          </a>
          <a
            href="#historico"
            className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0"
          >
            Histórico
          </a>
          <a
            href="#criterios"
            className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0"
          >
            Critérios de Revisão
          </a>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center shrink-0">
          {result ? (
            <button
              type="button"
              onClick={handleExportPdf}
              className="px-4 py-2 text-xs sm:text-sm font-medium text-white bg-slate-900 dark:bg-blue-600 rounded-lg hover:bg-slate-800 dark:hover:bg-blue-500 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Exportar PDF
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleSelectSample(SAMPLE_CLAUSES[0])}
              className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Carregar Exemplo
            </button>
          )}
        </div>
      </header>

      {/* Permanent Legal Disclaimer Bar + Workspace Controls */}
      <div className="bg-slate-100/80 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-8 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
            <span>
              <strong className="font-semibold text-slate-800 dark:text-slate-200">
                Não substitui um advogado.
              </strong>{' '}
              Ferramenta informativa para tradução de cláusulas em linguagem simples.
            </span>
          </div>

          {/* Automatic / Manual Dark Mode Segmented Control */}
          <div className="flex items-center justify-between sm:justify-end gap-3">
            <span className="text-slate-500 dark:text-slate-400 whitespace-nowrap">
              Tema:
            </span>
            <div
              role="group"
              aria-label="Seleção de tema"
              className="inline-flex items-center p-0.5 bg-slate-200/80 dark:bg-slate-800 rounded-md"
            >
              <button
                type="button"
                onClick={() => setThemeMode('auto')}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  themeMode === 'auto'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Automático
              </button>
              <button
                type="button"
                onClick={() => setThemeMode('light')}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  themeMode === 'light'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Claro
              </button>
              <button
                type="button"
                onClick={() => setThemeMode('dark')}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  themeMode === 'dark'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Escuro
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <main
        id="analisador"
        className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6 sm:py-10 space-y-12"
      >
        {/* Intro Header */}
        <section className="max-w-3xl space-y-2">
          <h1
            className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 font-display"
            style={{ textWrap: 'balance' }}
          >
            Entenda qualquer cláusula contratual antes de assinar
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
            Cole um trecho de contrato abaixo e clique em{' '}
            <strong className="font-medium text-slate-800 dark:text-slate-200">
              Analisar
            </strong>
            . Você receberá um resumo em até 3 linhas simples, os pontos de
            atenção sobre multas, prazos e ambiguidades, e a avaliação do nível
            de risco.
          </p>
        </section>

        {/* Primary 2-Column Workspace Split */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
          {/* Left Column: Contract Clause Input */}
          <div className="lg:col-span-5 flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4 pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <label
                htmlFor="clause-textarea"
                className="text-sm font-semibold text-slate-900 dark:text-slate-100"
              >
                Trecho do Contrato
              </label>

              {/* Unboxed metadata with typographic separator */}
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                <span>{wordCount} palavras</span>
                <span aria-hidden="true">·</span>
                <span>{charCount} caracteres</span>
              </div>
            </div>

            <div className="flex-1 flex flex-col mt-4">
              <textarea
                id="clause-textarea"
                value={clauseText}
                onChange={(e) => {
                  setClauseText(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Cole aqui a cláusula ou parágrafo do contrato (ex.: cláusula de multa rescisória, prazo de fidelidade, renovação automática, confidencialidade ou reajuste)..."
                rows={11}
                className="w-full flex-1 min-h-[240px] resize-y rounded-lg bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 px-3.5 py-3 text-sm sm:text-base text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500 leading-relaxed"
              />
            </div>

            {errorMessage && (
              <div
                role="alert"
                className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs sm:text-sm text-red-700 dark:text-red-300 flex items-start gap-2.5"
              >
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Quick Sample Selector Bar */}
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
                <span>Testar com exemplo real:</span>
                {clauseText.length > 0 && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-medium cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Limpar texto
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SAMPLE_CLAUSES.map((sample, idx) => (
                  <button
                    key={sample.id}
                    type="button"
                    onClick={() => handleSelectSample(sample)}
                    className="px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    0{idx + 1}. {sample.tipoContrato}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Bar + Chronometer */}
            <div className="mt-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => handleAnalyze()}
                disabled={isAnalyzing}
                className="flex-1 min-h-[44px] px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 dark:bg-blue-600 dark:hover:bg-blue-500 rounded-lg transition-colors flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                <span>{isAnalyzing ? 'Analisando Cláusula...' : 'Analisar'}</span>
              </button>

              {/* Chronometer Display */}
              <div
                aria-live="polite"
                title="Cronômetro do tempo de análise"
                className="min-h-[44px] px-3.5 py-2 rounded-lg bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-800 flex items-center justify-center gap-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-mono tabular-nums shrink-0"
              >
                <Clock className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <span>Tempo: {elapsedSeconds.toFixed(2)}s</span>
              </div>
            </div>
          </div>

          {/* Right Column: Analysis Report Viewport */}
          <div className="lg:col-span-7 flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6">
            {/* State 1: Loading Skeleton */}
            {isAnalyzing && (
              <div className="flex-1 flex flex-col justify-between space-y-6 animate-pulse py-2">
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div className="h-5 w-48 bg-slate-200 dark:bg-slate-800 rounded" />
                    <div className="h-5 w-28 bg-slate-200 dark:bg-slate-800 rounded font-mono tabular-nums" />
                  </div>
                  <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2.5">
                    <div className="h-4 w-36 bg-slate-200 dark:bg-slate-800 rounded" />
                    <div className="h-3.5 w-full bg-slate-200 dark:bg-slate-800 rounded" />
                    <div className="h-3.5 w-4/5 bg-slate-200 dark:bg-slate-800 rounded" />
                  </div>
                  <div className="space-y-2.5 pt-2">
                    <div className="h-4 w-52 bg-slate-200 dark:bg-slate-800 rounded" />
                    <div className="h-3.5 w-full bg-slate-200 dark:bg-slate-800 rounded" />
                    <div className="h-3.5 w-11/12 bg-slate-200 dark:bg-slate-800 rounded" />
                    <div className="h-3.5 w-3/4 bg-slate-200 dark:bg-slate-800 rounded" />
                  </div>
                  <div className="space-y-3 pt-2">
                    <div className="h-4 w-44 bg-slate-200 dark:bg-slate-800 rounded" />
                    <div className="h-16 w-full bg-slate-100 dark:bg-slate-800/60 rounded-lg" />
                    <div className="h-16 w-full bg-slate-100 dark:bg-slate-800/60 rounded-lg" />
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                  <span>Processando leitura jurídica em linguagem simples...</span>
                  <span>{elapsedSeconds.toFixed(2)}s</span>
                </div>
              </div>
            )}

            {/* State 2: Empty State */}
            {!isAnalyzing && !result && (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-12 px-4">
                <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 mb-4">
                  <FileText className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 font-display">
                  Nenhum trecho analisado ainda
                </h2>
                <p className="mt-1.5 max-w-md text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Cole uma cláusula contratual ao lado e clique em{' '}
                  <strong className="font-medium text-slate-800 dark:text-slate-200">
                    Analisar
                  </strong>
                  , ou selecione um exemplo prático para ver o resumo em até 3
                  linhas, os pontos de atenção e o nível de risco.
                </p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const sample = SAMPLE_CLAUSES[0];
                      setClauseText(sample.texto);
                      handleAnalyze(sample.texto);
                    }}
                    className="min-h-[42px] px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Analisar Exemplo de Multa Alta
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const sample = SAMPLE_CLAUSES[1];
                      setClauseText(sample.texto);
                      handleAnalyze(sample.texto);
                    }}
                    className="min-h-[42px] px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Testar Cláusula Ambígua
                  </button>
                </div>
                <p className="mt-8 text-xs text-slate-500 dark:text-slate-400">
                  Aviso permanente: Não substitui um advogado.
                </p>
              </div>
            )}

            {/* State 3: Populated Analysis Result */}
            {!isAnalyzing && result && (
              <div className="flex-1 flex flex-col justify-between space-y-6">
                <div className="space-y-6">
                  {/* Report Top Header + Action Buttons */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 font-display">
                        Diagnóstico da Cláusula
                      </h2>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                        <span>Concluído em {elapsedSeconds.toFixed(2)}s</span>
                        <span aria-hidden="true">·</span>
                        <span>{result.pontosAtencao.length} pontos mapeados</span>
                      </div>
                    </div>

                    {/* Copy & PDF Export Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCopyResult}
                        className="min-h-[40px] px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        {copied ? (
                          <>
                            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            <span>Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span>Copiar Resultado</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleExportPdf}
                        className="min-h-[40px] px-3.5 py-2 text-xs sm:text-sm font-medium text-white bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        <span>Baixar PDF</span>
                      </button>
                    </div>
                  </div>

                  {/* (3) Nível de Risco + Justificativa Curta */}
                  {(() => {
                    const riskMeta = getRiskMeta(result.nivelRisco);
                    const RiskIcon = riskMeta.Icon;
                    return (
                      <div
                        className={`p-4 rounded-lg border ${riskMeta.surfaceClass}`}
                      >
                        <div className="flex items-center gap-2">
                          <RiskIcon
                            className={`w-5 h-5 shrink-0 ${riskMeta.textClass}`}
                          />
                          <span
                            className={`text-sm sm:text-base font-bold ${riskMeta.textClass}`}
                          >
                            Nível de Risco: {result.nivelRisco}
                          </span>
                        </div>
                        <p className="mt-1.5 text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                          {result.justificativaRisco}
                        </p>
                      </div>
                    );
                  })()}

                  {/* (1) Resumo em até 3 linhas, em linguagem simples */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        01. Resumo em Linguagem Simples (até 3 linhas)
                      </h3>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                        {result.resumoLinhas.length}/3 linhas
                      </span>
                    </div>
                    <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-2">
                      {result.resumoLinhas.slice(0, 3).map((linha, index) => (
                        <p
                          key={index}
                          className="text-sm sm:text-base text-slate-800 dark:text-slate-200 leading-relaxed"
                        >
                          <span className="font-mono text-xs text-slate-400 dark:text-slate-500 mr-2 tabular-nums">
                            {index + 1}.
                          </span>
                          {linha}
                        </p>
                      ))}
                    </div>
                  </div>

                  {/* Ambiguity / Context Verification Rule */}
                  {result.observacaoContexto && (
                    <div
                      className={`p-4 rounded-lg border ${
                        result.possuiAmbiguidadeOuFaltaContexto
                          ? 'bg-amber-50/60 dark:bg-amber-950/25 border-amber-200 dark:border-amber-900/60'
                          : 'bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">
                        <HelpCircle className="w-4 h-4 text-slate-600 dark:text-slate-400 shrink-0" />
                        <span>
                          {result.possuiAmbiguidadeOuFaltaContexto
                            ? 'Atenção: Trecho com Ambiguidade ou Falta de Contexto'
                            : 'Verificação de Contexto'}
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                        {result.observacaoContexto}
                      </p>
                    </div>
                  )}

                  {/* (2) Pontos de Atenção */}
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        02. Pontos de Atenção ({filteredPoints.length})
                      </h3>

                      {/* Interactive Category Filter Buttons */}
                      {categories.length > 2 && (
                        <div
                          role="group"
                          aria-label="Filtrar pontos de atenção por categoria"
                          className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/90 rounded-lg"
                        >
                          {categories.map((cat) => (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => setSelectedCategory(cat)}
                              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                                selectedCategory === cat
                                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                              }`}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {filteredPoints.length === 0 ? (
                      <p className="text-sm text-slate-600 dark:text-slate-400 py-4">
                        Nenhum ponto de atenção específico registrado nesta
                        categoria.
                      </p>
                    ) : (
                      <div className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg">
                        {filteredPoints.map((pt, index) => (
                          <div key={index} className="p-4 space-y-1.5">
                            {/* Unboxed metadata header */}
                            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                              <span className="font-semibold text-slate-700 dark:text-slate-300">
                                {pt.categoria}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono tabular-nums">
                                Item 0{index + 1}
                              </span>
                            </div>

                            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {pt.titulo}
                            </h4>

                            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                              {pt.explicacao}
                            </p>

                            {pt.trechoRelacionado && (
                              <p className="pt-1 text-xs text-slate-500 dark:text-slate-400 italic">
                                Trecho citado: &ldquo;{pt.trechoRelacionado}&rdquo;
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Practical Negotiation Suggestion */}
                  {result.perguntaParaNegociar && (
                    <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1">
                      <h3 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">
                        03. O que perguntar ou negociar antes de assinar
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                        {result.perguntaParaNegociar}
                      </p>
                    </div>
                  )}
                </div>

                {/* Mandatory Legal Notice Footer Inside Card */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-slate-600 dark:text-slate-400">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Aviso Legal: Não substitui um advogado.
                  </span>
                  <span>
                    Recomenda-se revisão jurídica profissional antes de assinar
                    documentos vinculantes.
                  </span>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Exemplos Práticos Section */}
        <section
          id="exemplos"
          className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 font-display">
                Exemplos Práticos para Testar
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                Selecione um trecho realista abaixo para carregar e analisar
                instantaneamente.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SAMPLE_CLAUSES.map((sample, idx) => (
              <div
                key={sample.id}
                className="flex flex-col justify-between p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
              >
                <div className="space-y-2">
                  {/* Unboxed metadata with separator */}
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-mono tabular-nums">0{idx + 1}</span>
                    <span aria-hidden="true">·</span>
                    <span>{sample.tipoContrato}</span>
                    <span aria-hidden="true">·</span>
                    <span>{sample.previaRisco}</span>
                  </div>

                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    {sample.titulo}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
                    {sample.texto}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => handleSelectSample(sample)}
                    className="text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer"
                  >
                    Apenas colar no campo
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setClauseText(sample.texto);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                      handleAnalyze(sample.texto);
                    }}
                    className="px-3.5 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-md transition-colors inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <span>Analisar agora</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Histórico Recente Section */}
        <section
          id="historico"
          className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 font-display">
                Histórico de Análises Recentes
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                Salvo localmente no seu navegador para consulta rápida.
              </p>
            </div>

            {history.length > 0 && (
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="Filtrar histórico..."
                    className="pl-8 pr-3 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleClearHistory}
                  className="px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Limpar</span>
                </button>
              </div>
            )}
          </div>

          {history.length === 0 ? (
            <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Suas cláusulas analisadas aparecerão aqui com o tempo de execução e
              o nível de risco correspondente.
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Nenhum item encontrado para &ldquo;{historySearch}&rdquo;.
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-200 dark:divide-slate-800">
              {filteredHistory.map((item) => (
                <div
                  key={item.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                      <span className="font-sans font-semibold text-slate-800 dark:text-slate-200">
                        Risco {item.result.nivelRisco}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{item.createdAt}</span>
                      <span aria-hidden="true">·</span>
                      <span>{item.durationSeconds.toFixed(2)}s</span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 truncate">
                      {item.clauseText}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleLoadFromHistory(item)}
                    className="px-3 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 self-start sm:self-center cursor-pointer"
                  >
                    Reabrir Análise
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Critérios de Revisão e Transparência Section */}
        <section
          id="criterios"
          className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-4"
        >
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 font-display">
            Diretrizes de Transparência e Segurança
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                01. Sem invenção de contexto
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Se a cláusula mencionar anexos ausentes, tabelas externas ou
                termos vagos como &ldquo;prazo razoável&rdquo;, o analisador
                aponta a falta de contexto em vez de supor valores.
              </p>
            </div>
            <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                02. Sem citação duvidosa de leis
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Priorizamos explicar o impacto financeiro e prático da cláusula
                em português claro, evitando citar números de artigos de lei sem
                certeza.
              </p>
            </div>
            <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                03. Não substitui um advogado
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                O diagnóstico serve como triagem inicial para facilitar a leitura
                de contratos cotidianos. Sempre consulte um advogado para
                decisões jurídicas.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Quiet Footer with Mandatory Legal Disclaimer */}
      <footer className="mt-12 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 sm:px-8 py-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span>Analisador de Cláusulas — Leitura contratual simplificada</span>
          <span className="font-medium text-slate-700 dark:text-slate-300">
            Aviso obrigatório: Não substitui um advogado.
          </span>
        </div>
      </footer>
    </div>
  );
}
