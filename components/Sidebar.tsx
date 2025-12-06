
import React, { useRef } from 'react';
import { Activity, StopCircle, FolderUp } from 'lucide-react';

interface SidebarProps {
  isModelLoaded: boolean;
  isAnalyzing: boolean;
  onImagesUpload: (files: FileList) => void;
  onStopAnalysis: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  isModelLoaded, 
  isAnalyzing, 
  onImagesUpload,
  onStopAnalysis,
}) => {
  const folderInputRef = useRef<HTMLInputElement>(null);

  return (
    <aside className="w-80 bg-slate-900 text-white flex flex-col h-screen fixed left-0 top-0 shadow-xl z-50">
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="bg-purple-600 p-2 rounded-lg">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">MediSkin AI</h1>
            <p className="text-xs text-slate-400">Automated Analysis</p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 flex flex-col justify-start overflow-y-auto">
        {/* Simple Dashboard Controls */}
        <div className="space-y-6 mt-10">
          <div className="text-center space-y-2">
             <h2 className="text-lg font-semibold text-slate-200">이미지 분석</h2>
             <p className="text-sm text-slate-400">폴더를 선택하여 분석을 시작하세요.</p>
          </div>

          <div className="space-y-3">
             <input
              type="file"
              // @ts-ignore
              webkitdirectory=""
              directory=""
              multiple
              className="hidden"
              ref={folderInputRef}
              onChange={(e) => e.target.files && onImagesUpload(e.target.files)}
            />
            
            <button 
              onClick={() => folderInputRef.current?.click()}
              disabled={!isModelLoaded || isAnalyzing}
              className={`w-full p-6 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all font-bold border ${
                !isModelLoaded 
                ? 'bg-slate-800 text-slate-600 border-slate-700 cursor-wait opacity-50'
                : isAnalyzing 
                    ? 'bg-slate-800 text-purple-400 border-purple-500/50' 
                    : 'bg-purple-600 hover:bg-purple-500 text-white border-purple-400 shadow-xl shadow-purple-900/30 transform hover:-translate-y-1'
              }`}
            >
              {isAnalyzing ? (
                 <>
                   <div className="w-8 h-8 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                   <span className="text-sm">분석 진행 중...</span>
                 </>
              ) : (
                <>
                  <FolderUp className="w-10 h-10" />
                  <span className="text-lg">폴더 업로드</span>
                </>
              )}
            </button>

            {isAnalyzing && (
              <button onClick={onStopAnalysis} className="w-full border border-red-500/50 text-red-400 hover:bg-red-500/10 p-3 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm">
                <StopCircle className="w-4 h-4" /> 분석 중단
              </button>
            )}
          </div>
          
          <div className="bg-slate-800 rounded-xl p-4 text-xs text-slate-400 leading-relaxed border border-slate-700">
             <strong className="text-slate-300 block mb-1">사용 안내:</strong>
             이미지 폴더를 업로드하면 자동으로 AI 분석이 시작됩니다. 분석 결과는 우측 대시보드에 실시간으로 표시됩니다.
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
