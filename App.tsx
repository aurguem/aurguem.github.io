
import React, { useState, useRef, useEffect } from 'react';
import { AlertTriangle, CheckCircle2, Files, X, BarChart2, Terminal, Lightbulb, AlertCircle } from 'lucide-react';

import Sidebar from './components/Sidebar';
import KPICard from './components/KPICard';
import { DistributionChart, CountBarChart } from './components/AnalysisCharts';
import { loadModelFromUrl, analyzeImage } from './services/aiService';
import { AnalysisResult, DashboardStats } from './types';
import { KOREAN_LABELS, CLASS_COLORS, MODEL_URL } from './constants';

const App: React.FC = () => {
  const [session, setSession] = useState<any | null>(null);
  const [isModelLoading, setIsModelLoading] = useState(true); // Start as loading
  const [loadingProgress, setLoadingProgress] = useState(0); 
  const [loadingDetail, setLoadingDetail] = useState("초기화 중...");
  const [modelError, setModelError] = useState<string | null>(null);
  
  // Default Settings (Step 2 hidden from user)
  const preprocessing = 'normalize_0_1';
  const inputLayout = 'NHWC';
  const colorSpace = 'RGB';
  const customLabels: string[] = []; // Use default
  const forceSoftmax = false;
  const useCenterCrop = false;
  const sharpeningFactor = 1.0;

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<AnalysisResult | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalScanned: 0,
    issuesFound: 0,
    distribution: {}
  });

  const stopAnalysisRef = useRef(false);

  // Auto-Load Model on Mount
  useEffect(() => {
    const initModel = async () => {
        try {
            console.log("Starting Auto-Load from:", MODEL_URL);
            setLoadingDetail("서버에서 모델 다운로드 중...");
            const loadedSession = await loadModelFromUrl(MODEL_URL, (progress, detail) => {
                setLoadingProgress(Math.min(99, Math.round(progress * 100)));
                setLoadingDetail(detail);
            });
            setSession(loadedSession);
            setLoadingProgress(100);
            setLoadingDetail("준비 완료!");
        } catch (err: any) {
            console.error(err);
            setModelError(err.message || "모델 자동 로드 실패. CORS 문제이거나 파일이 없습니다.");
        } finally {
            setTimeout(() => setIsModelLoading(false), 1000);
        }
    };
    initModel();
  }, []);

  const updateStats = (newResult: AnalysisResult) => {
    setStats(prev => {
      const isIssue = newResult.diagnosis !== 'Normal' && newResult.koreanLabel !== '정상';
      const newDist = { ...prev.distribution };
      const labelKey = newResult.koreanLabel;
      newDist[labelKey] = (newDist[labelKey] || 0) + 1;
      return {
        totalScanned: prev.totalScanned + 1,
        issuesFound: prev.issuesFound + (isIssue ? 1 : 0),
        distribution: newDist
      };
    });
  };

  const handleImagesUpload = async (files: FileList) => {
    if (!session) return;
    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) { alert("이미지 파일이 없습니다."); return; }

    setIsAnalyzing(true);
    stopAnalysisRef.current = false;
    
    for (let i = 0; i < imageFiles.length; i++) {
      if (stopAnalysisRef.current) break;
      try {
        const result = await analyzeImage(
            session, 
            imageFiles[i], 
            preprocessing, 
            customLabels,
            colorSpace,
            forceSoftmax,
            useCenterCrop,
            sharpeningFactor,
            inputLayout
        );
        setResults(prev => [result, ...prev]);
        updateStats(result);
        await new Promise(resolve => setTimeout(resolve, 30));
      } catch (err) {
        console.error(`Error analyzing ${imageFiles[i].name}`, err);
      }
    }
    setIsAnalyzing(false);
  };

  const handleStopAnalysis = () => {
    stopAnalysisRef.current = true;
    setIsAnalyzing(false);
  };

  const isLowConfidence = results.length > 0 && results[0].confidence < 0.4;
  const isBiasDetected = results.length >= 5 && results.every(r => r.diagnosis === results[0].diagnosis);

  return (
    <div className="flex bg-slate-50 min-h-screen font-sans text-slate-900">
      <Sidebar 
        isModelLoaded={!!session} 
        isAnalyzing={isAnalyzing}
        onImagesUpload={handleImagesUpload}
        onStopAnalysis={handleStopAnalysis}
      />

      <main className="ml-80 flex-1 p-8 overflow-y-auto h-screen">
        <header className="mb-8">
          <h2 className="text-2xl font-bold text-slate-800">MediSkin 대시보드</h2>
          <p className="text-slate-500">AI 의료 이미지 자동 분석 시스템</p>
        </header>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <KPICard title="총 분석 이미지" value={stats.totalScanned} icon={<Files className="w-6 h-6 text-purple-600" />} colorClass="bg-purple-50" />
          <KPICard title="정상 소견" value={stats.distribution['정상'] || 0} icon={<CheckCircle2 className="w-6 h-6 text-green-600" />} colorClass="bg-green-50" />
          <KPICard 
            title="질환 의심" value={stats.issuesFound} icon={<AlertTriangle className="w-6 h-6 text-red-600" />} colorClass="bg-red-50"
            trend={stats.totalScanned > 0 ? `${((stats.issuesFound / stats.totalScanned) * 100).toFixed(1)}% 비율` : undefined}
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-6">질환별 분포</h3>
            <DistributionChart stats={stats} />
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-6">검출 건수</h3>
            <CountBarChart stats={stats} />
          </div>
        </div>

        {/* Live Log */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col gap-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-800">실시간 분석 로그</h3>
            </div>
            {isBiasDetected && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                    <div>
                        <h4 className="text-sm font-bold text-red-800">⚠️ 결과 쏠림 감지</h4>
                        <p className="text-xs text-red-700 mt-1">모든 이미지가 동일하게 분류되고 있습니다.</p>
                    </div>
                </div>
            )}
            {isLowConfidence && !isBiasDetected && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-start gap-3">
                    <Lightbulb className="w-5 h-5 text-orange-500 mt-0.5 shrink-0" />
                    <div>
                        <h4 className="text-sm font-bold text-orange-800">확신도가 낮습니다</h4>
                        <p className="text-xs text-orange-700 mt-1">이미지 품질을 확인해주세요.</p>
                    </div>
                </div>
            )}
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-6 py-4 font-medium">이미지</th>
                  <th className="px-6 py-4 font-medium">파일명</th>
                  <th className="px-6 py-4 font-medium">분석 결과</th>
                  <th className="px-6 py-4 font-medium">확신도</th>
                  <th className="px-6 py-4 font-medium">시간</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {results.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">분석 대기 중...</td></tr>
                ) : (
                  results.slice(0, 50).map((result) => {
                    const color = CLASS_COLORS[result.koreanLabel] || '#64748b';
                    return (
                        <tr key={result.id} className="hover:bg-purple-50/30 transition-colors cursor-pointer" onClick={() => setSelectedResult(result)}>
                        <td className="px-6 py-3">
                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
                             {result.thumbnailUrl && <img src={result.thumbnailUrl} alt="t" className="w-full h-full object-cover" />}
                            </div>
                        </td>
                        <td className="px-6 py-3 font-medium text-slate-700">{result.fileName}</td>
                        <td className="px-6 py-3">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: `${color}20`, color: color }}>
                            {result.koreanLabel}
                            </span>
                        </td>
                        <td className="px-6 py-3">
                            <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${result.confidence * 100}%`, backgroundColor: color }} />
                            </div>
                            <span className="text-xs text-slate-500 font-mono">{(result.confidence * 100).toFixed(1)}%</span>
                            </div>
                        </td>
                        <td className="px-6 py-3 text-slate-400 text-xs">{new Date(result.timestamp).toLocaleTimeString()}</td>
                        </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Full Screen Loading Overlay for Auto-Load */}
      {isModelLoading && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[999] flex items-center justify-center">
          <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center max-w-md text-center w-full mx-6">
            <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-6" />
            <h3 className="text-2xl font-bold text-slate-800 mb-2">MediSkin AI 초기화 중</h3>
            <p className="text-slate-500 mb-6">AI 진단 모델을 서버에서 다운로드하고 있습니다.<br/>잠시만 기다려주세요.</p>
            
            {modelError ? (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl w-full text-sm text-left">
                    <p className="font-bold mb-1 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> 오류 발생</p>
                    {modelError}
                    <button onClick={() => window.location.reload()} className="mt-3 w-full bg-red-100 hover:bg-red-200 text-red-800 py-2 rounded-lg font-medium transition-colors">
                        페이지 새로고침
                    </button>
                </div>
            ) : (
                <div className="w-full space-y-2">
                    <div className="flex justify-between text-xs font-medium text-slate-500">
                        <span>진행률</span>
                        <span>{loadingProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                        <div className="bg-purple-600 h-3 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(147,51,234,0.5)]" style={{ width: `${loadingProgress}%` }} />
                    </div>
                    <p className="text-xs text-purple-500 mt-2 font-mono">{loadingDetail}</p>
                </div>
            )}
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedResult && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={() => setSelectedResult(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
              <div className="flex gap-4">
                <div className="w-20 h-20 rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
                  {selectedResult.thumbnailUrl && <img src={selectedResult.thumbnailUrl} alt="t" className="w-full h-full object-cover" />}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">{selectedResult.fileName}</h3>
                  <div className="flex items-center gap-2 mt-2">
                     <span className="text-sm text-slate-500 font-medium">최종 판정:</span>
                     <span className="text-sm font-bold" style={{ color: CLASS_COLORS[selectedResult.koreanLabel] }}>{selectedResult.koreanLabel}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedResult(null)}><X className="w-6 h-6 text-slate-400" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                <section>
                    <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2"><BarChart2 className="w-4 h-4 text-purple-500" /> 상세 확신도 분석</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {selectedResult.probabilities.map((prob, idx) => {
                            const label = KOREAN_LABELS[idx];
                            return (
                                <div key={idx} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="font-semibold text-slate-700">{label}</span>
                                        <span className="font-mono text-slate-600 font-bold">{(prob * 100).toFixed(2)}%</span>
                                    </div>
                                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                                        <div className="h-full rounded-full" style={{ width: `${prob * 100}%`, backgroundColor: CLASS_COLORS[label] || '#94a3b8' }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>
                <section className="bg-slate-900 rounded-xl p-5 text-slate-300 font-mono text-xs">
                    <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2"><Terminal className="w-4 h-4 text-green-400" /> Raw Output (Index)</h4>
                    <div className="overflow-hidden border border-slate-700 rounded-lg">
                        <table className="w-full text-left">
                            <thead className="bg-slate-800 text-slate-400"><tr><th className="px-4 py-2">Index</th><th className="px-4 py-2">Prob</th></tr></thead>
                            <tbody className="divide-y divide-slate-800">
                                {selectedResult.probabilities.map((prob, idx) => (
                                    <tr key={idx}><td className="px-4 py-2">{idx}</td><td className="px-4 py-2">{prob.toFixed(6)}</td></tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
