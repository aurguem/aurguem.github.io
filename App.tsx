
import React, { useState, useRef, useEffect } from 'react';
import { AlertTriangle, CheckCircle2, Files, X, BarChart2, Terminal, Lightbulb, AlertCircle, Stethoscope, FileText, Info } from 'lucide-react';

import Sidebar from './components/Sidebar';
import KPICard from './components/KPICard';
import { DistributionChart, CountBarChart } from './components/AnalysisCharts';
import { loadModelFromUrl, analyzeImage } from './services/aiService';
import { AnalysisResult, DashboardStats } from './types';
import { KOREAN_LABELS, CLASS_COLORS, MODEL_URL, DISEASE_DESCRIPTIONS, DISEASE_LABELS } from './constants';

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

  const getConfidenceInfo = (score: number) => {
    if (score >= 0.8) return { label: '높음', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' };
    if (score >= 0.5) return { label: '중간', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' };
    return { label: '낮음', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' };
  };

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

      {/* Detail Modal: Medical Report Format */}
      {selectedResult && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={() => setSelectedResult(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50">
                <div className="flex items-center gap-2 text-slate-800">
                    <Stethoscope className="w-6 h-6 text-purple-600" />
                    <h3 className="text-xl font-bold">피부질환 분석 결과</h3>
                </div>
                <button onClick={() => setSelectedResult(null)}><X className="w-6 h-6 text-slate-400 hover:text-slate-600" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* 1. Image & Diagnosis */}
                <div className="flex flex-col md:flex-row gap-6">
                    <div className="w-full md:w-1/3 aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shadow-inner">
                        {selectedResult.thumbnailUrl && <img src={selectedResult.thumbnailUrl} alt="Analyzed" className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 space-y-6">
                        {/* 1. 진단명 */}
                        <div>
                            <span className="text-sm font-bold text-slate-400 block mb-1">1. 진단명 (Diagnosis)</span>
                            <div className="text-3xl font-bold" style={{ color: CLASS_COLORS[selectedResult.koreanLabel] }}>
                                {selectedResult.koreanLabel}
                            </div>
                            <div className="text-slate-400 text-sm font-medium mt-1">({selectedResult.diagnosis})</div>
                        </div>
                        
                        {/* 2. 확신도 */}
                        <div>
                            <span className="text-sm font-bold text-slate-400 block mb-1">2. 확신도 (Confidence)</span>
                            <div className="flex items-center gap-3">
                                {(() => {
                                    const confInfo = getConfidenceInfo(selectedResult.confidence);
                                    return (
                                        <span className={`px-3 py-1 rounded-full text-sm font-bold border ${confInfo.bg} ${confInfo.color} ${confInfo.border}`}>
                                            {confInfo.label} ({(selectedResult.confidence * 100).toFixed(1)}%)
                                        </span>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                </div>

                <hr className="border-slate-100" />

                {/* 3. 시각적 근거 */}
                <div>
                    <span className="text-sm font-bold text-slate-400 block mb-2 flex items-center gap-2">
                        <FileText className="w-4 h-4" /> 3. 시각적 근거 (Visual Evidence)
                    </span>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-slate-700 leading-relaxed font-medium">
                        {(() => {
                            const index = DISEASE_LABELS.indexOf(selectedResult.diagnosis);
                            return index !== -1 ? DISEASE_DESCRIPTIONS[index] : "분석된 특징 정보가 없습니다.";
                        })()}
                    </div>
                </div>

                {/* 4. 주의사항 */}
                <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 flex gap-3">
                    <Info className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                    <div>
                        <h4 className="text-sm font-bold text-orange-800 mb-1">4. 주의사항 (Disclaimer)</h4>
                        <p className="text-xs text-orange-700 leading-relaxed">
                            이 결과는 AI의 시각적 패턴 분석에 기반한 것으로, <strong>의학적 진단이 아닙니다.</strong><br/>
                            정확한 진단과 치료를 위해서는 반드시 피부과 전문의를 방문하여 상담받으시기 바랍니다.
                        </p>
                    </div>
                </div>

                {/* Supplementary: Detailed Charts (Collapsed or Secondary) */}
                <div className="pt-4">
                    <details className="group">
                        <summary className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-500 hover:text-purple-600 transition-colors">
                            <BarChart2 className="w-4 h-4" /> 상세 수치 데이터 보기
                        </summary>
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 pl-4 border-l-2 border-slate-100">
                             {selectedResult.probabilities.map((prob, idx) => {
                                const label = KOREAN_LABELS[idx];
                                const isMax = idx === DISEASE_LABELS.indexOf(selectedResult.diagnosis);
                                return (
                                    <div key={idx} className={`flex justify-between text-xs ${isMax ? 'font-bold text-slate-800' : 'text-slate-500'}`}>
                                        <span>{label}</span>
                                        <span>{(prob * 100).toFixed(1)}%</span>
                                    </div>
                                );
                            })}
                        </div>
                    </details>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;