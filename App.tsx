import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { 
  Upload, Download, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, 
  Type, Layers, Settings, RotateCcw, RotateCw, Plus, Minus, Trash2, FileText,
  ArrowUpDown, Save, FilePlus, Trash
} from 'lucide-react';
import { Cut, Template, AppSettings } from './types';
import { saveMarkedPdf } from './services/pdfService';
import { TemplateOverlay } from './components/TemplateOverlay';
import { CutMarker } from './components/CutMarker';

// Worker setup for react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// LocalStorage Key
const STORAGE_KEY_TEMPLATES = 'cutmark_templates';

// Default Template
const DEFAULT_TEMPLATE: Template = {
  id: 'default',
  name: '標準5行',
  rowCount: 5,
  xPosition: 0.07, // 7% from left
  rowPositions: [0.0872, 0.2525, 0.4179, 0.5832, 0.7485],
};

const DEFAULT_SETTINGS: AppSettings = {
  fontSize: 12,
  useWhiteBackground: false,
  backgroundPadding: 4,
  nextNumber: 1,
  branchChar: null,
  autoIncrement: true,
  minDigits: 3,
  textOutlineWidth: 2,
};

export default function App() {
  // --- State ---
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  
  const [cuts, setCuts] = useState<Cut[]>([]);
  // Use ref to track cuts for drag operations to avoid stale closures
  const cutsRef = useRef(cuts);
  cutsRef.current = cuts;

  const [history, setHistory] = useState<Cut[][]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Template Management
  const [templates, setTemplates] = useState<Template[]>([DEFAULT_TEMPLATE]);
  const [template, setTemplate] = useState<Template>(DEFAULT_TEMPLATE);
  
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  
  const [mode, setMode] = useState<'edit' | 'template'>('edit');
  const [selectedCutId, setSelectedCutId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  // --- Effects ---

  // Load templates from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY_TEMPLATES);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTemplates(parsed);
          setTemplate(parsed[0]);
        }
      } catch (e) {
        console.error("Failed to load templates", e);
      }
    }
  }, []);

  // Save templates to local storage whenever they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_TEMPLATES, JSON.stringify(templates));
  }, [templates]);

  // --- History Management ---
  const pushHistory = useCallback((newCuts: Cut[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newCuts);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setCuts(newCuts);
  }, [history, historyIndex]);

  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setCuts(history[newIndex]);
    } else if (historyIndex === 0) {
      setHistoryIndex(-1);
      setCuts([]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setCuts(history[newIndex]);
    }
  };

  // --- Logic ---
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setPdfFile(file);
      setCuts([]);
      setHistory([]);
      setHistoryIndex(-1);
      setCurrentPage(1);
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    const file = e.dataTransfer.files?.[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
      setCuts([]);
      setHistory([]);
      setHistoryIndex(-1);
      setCurrentPage(1);
    }
  };

  const getNextLabel = (): string => {
    let numStr = settings.nextNumber.toString();
    // Pad with leading zeros based on minDigits
    numStr = numStr.padStart(settings.minDigits, '0');

    if (settings.branchChar) {
      // Return with newline for stacking
      return `${numStr}\n${settings.branchChar}`;
    }
    return numStr;
  };

  const incrementCounter = () => {
    if (!settings.autoIncrement) return;

    if (settings.branchChar) {
      // Increment Branch (A -> B -> C)
      const nextChar = String.fromCharCode(settings.branchChar.charCodeAt(0) + 1);
      setSettings(s => ({ ...s, branchChar: nextChar }));
    } else {
      // Increment Number
      setSettings(s => ({ ...s, nextNumber: s.nextNumber + 1 }));
    }
  };

  const addCut = (x: number, y: number) => {
    const newCut: Cut = {
      id: crypto.randomUUID(),
      pageIndex: currentPage - 1,
      x,
      y,
      label: getNextLabel(),
      isBranch: !!settings.branchChar,
    };
    
    pushHistory([...cuts, newCut]);
    incrementCounter();
  };

  // --- Cut Dragging Logic ---
  const updateCutPosition = (id: string, x: number, y: number) => {
    setCuts(prev => prev.map(c => c.id === id ? { ...c, x, y } : c));
  };

  const handleCutDragEnd = () => {
    // Commit the current state to history after drag ends
    // Use ref to get the most up-to-date state including the drag updates
    pushHistory(cutsRef.current);
  };

  const handlePageClick = (e: React.MouseEvent) => {
    if (mode === 'template') return;
    if (!pdfContainerRef.current) return;

    const rect = pdfContainerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    // Safety check for bounds
    if (x >= 0 && x <= 1 && y >= 0 && y <= 1) {
      addCut(x, y);
    }
  };

  const handleRowSnap = (rowIndex: number) => {
    if (rowIndex >= template.rowPositions.length) return;
    const y = template.rowPositions[rowIndex];
    const x = template.xPosition;
    addCut(x, y);
  };

  const distributeRows = () => {
    if (template.rowCount <= 2) return;
    
    const newPositions = [...template.rowPositions];
    const first = newPositions[0];
    const last = newPositions[template.rowCount - 1];
    
    // Safety check
    if (typeof first !== 'number' || typeof last !== 'number') return;

    const step = (last - first) / (template.rowCount - 1);

    for (let i = 1; i < template.rowCount - 1; i++) {
      newPositions[i] = first + (step * i);
    }
    
    setTemplate(t => ({ ...t, rowPositions: newPositions }));
  };

  // Template CRUD
  const handleTemplateChange = (id: string) => {
    const selected = templates.find(t => t.id === id);
    if (selected) {
      setTemplate(selected);
    }
  };

  const saveCurrentTemplate = () => {
    // Update existing in array
    setTemplates(prev => prev.map(t => t.id === template.id ? template : t));
    alert('テンプレートを上書き保存しました');
  };

  const saveAsNewTemplate = () => {
    const name = window.prompt("新しいテンプレート名を入力してください", `${template.name} のコピー`);
    if (!name) return;

    const newTemplate: Template = {
      ...template,
      id: crypto.randomUUID(),
      name: name,
    };

    setTemplates(prev => [...prev, newTemplate]);
    setTemplate(newTemplate);
  };

  const deleteTemplate = () => {
    if (templates.length <= 1) {
      alert("最後のテンプレートは削除できません");
      return;
    }
    if (!window.confirm(`テンプレート「${template.name}」を削除しますか？`)) return;

    const newTemplates = templates.filter(t => t.id !== template.id);
    setTemplates(newTemplates);
    setTemplate(newTemplates[0]);
  };

  const deleteCut = (id: string) => {
    const newCuts = cuts.filter(c => c.id !== id);
    pushHistory(newCuts);
    if (selectedCutId === id) setSelectedCutId(null);
  };

  const handleExport = async () => {
    if (!pdfFile) return;
    const arrayBuffer = await pdfFile.arrayBuffer();
    const modifiedPdfBytes = await saveMarkedPdf(arrayBuffer, cuts, settings);
    
    const blob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `marked_${pdfFile.name}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Keyboard Shortcuts ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if input focused
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;

      if (e.key >= '1' && e.key <= '9') {
        const index = parseInt(e.key) - 1;
        handleRowSnap(index);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        if (e.shiftKey) redo();
        else undo();
        e.preventDefault();
      }
      if (e.key === 'ArrowRight') setCurrentPage(p => Math.min(numPages, p + 1));
      if (e.key === 'ArrowLeft') setCurrentPage(p => Math.max(1, p - 1));
      
      // Enter key for next page
      if (e.key === 'Enter') {
        e.preventDefault();
        setCurrentPage(p => Math.min(numPages, p + 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cuts, history, historyIndex, numPages, template, settings, currentPage]); // Heavy dependency array but necessary for closure freshness

  // --- Render Helpers ---
  const currentCuts = (cuts || []).filter(c => c.pageIndex === currentPage - 1);

  return (
    <div className="flex flex-col h-screen bg-gray-100 text-gray-800 font-sans overflow-hidden">
      {/* Top Bar */}
      <div className="bg-slate-800 text-white p-3 flex items-center justify-between shadow-md z-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 font-bold text-lg">
            <Layers className="text-blue-400" />
            CutMark PDF
          </div>
          <div className="h-6 w-px bg-slate-600 mx-2" />
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-sm transition-colors">
            <Upload size={16} /> PDFを開く
          </button>
          <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
          
          {pdfFile && (
             <div className="flex items-center gap-2 ml-4">
               <button onClick={undo} disabled={historyIndex <= -1} className="p-1.5 hover:bg-slate-700 rounded disabled:opacity-30"><RotateCcw size={18} /></button>
               <button onClick={redo} disabled={historyIndex >= history.length - 1} className="p-1.5 hover:bg-slate-700 rounded disabled:opacity-30"><RotateCw size={18} /></button>
             </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex bg-slate-700 rounded-lg p-0.5">
             <button 
                onClick={() => setMode('edit')} 
                className={`px-3 py-1 rounded-md text-sm transition-colors ${mode === 'edit' ? 'bg-blue-500 text-white font-medium' : 'text-slate-300 hover:text-white'}`}
             >
                番号入力
             </button>
             <button 
                onClick={() => setMode('template')} 
                className={`px-3 py-1 rounded-md text-sm transition-colors ${mode === 'template' ? 'bg-orange-500 text-white font-medium' : 'text-slate-300 hover:text-white'}`}
             >
                枠設定
             </button>
          </div>

          <button 
            onClick={handleExport}
            disabled={!pdfFile}
            className="flex items-center gap-2 px-4 py-1.5 bg-green-600 hover:bg-green-500 disabled:bg-slate-700 disabled:text-slate-500 rounded font-medium text-sm transition-colors shadow-sm"
          >
            <Download size={16} /> 保存
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Preview Area */}
        <div 
          className={`flex-1 relative overflow-auto flex flex-col items-center p-4 transition-colors ${
            isDragging ? 'bg-blue-100 border-4 border-blue-400 border-dashed' : 'bg-gray-200'
          }`}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {!pdfFile ? (
            <div className={`m-auto text-center ${isDragging ? 'text-blue-500' : 'text-gray-400'}`}>
              <Upload size={64} className={`mx-auto mb-4 ${isDragging ? 'opacity-100 scale-110' : 'opacity-50'} transition-all`} />
              <p className="text-xl">
                {isDragging ? 'ここにドロップして開く' : <>PDFファイルをドラッグ＆ドロップ<br/>または「PDFを開く」から読み込んでください</>}
              </p>
              <p className="mt-4 text-xs text-gray-500">
                読み込んだPDFはこのブラウザ内だけで処理されサーバーには送信されません
              </p>
            </div>
          ) : (
            <>
              {/* PDF Wrapper */}
              <div 
                className="relative shadow-lg transition-transform duration-200 ease-out border border-gray-300 bg-white"
                style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}
              >
                <Document
                  file={pdfFile}
                  onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                  loading={<div className="w-[595px] h-[842px] flex items-center justify-center bg-white text-gray-400">Loading...</div>}
                >
                  <div 
                     ref={pdfContainerRef}
                     className="relative pdf-page-container cursor-crosshair"
                     onClick={handlePageClick}
                  >
                    <Page 
                      pageNumber={currentPage} 
                      width={595} // A4 width in points roughly, react-pdf handles scaling
                      renderTextLayer={false} 
                      renderAnnotationLayer={false} 
                    />

                    {/* Overlay Logic */}
                    {mode === 'template' ? (
                       <TemplateOverlay template={template} onChange={setTemplate} />
                    ) : (
                       currentCuts.map(cut => (
                         <CutMarker 
                           key={cut.id} 
                           cut={cut} 
                           settings={settings}
                           isSelected={selectedCutId === cut.id}
                           onSelect={setSelectedCutId}
                           onDelete={deleteCut}
                           onUpdatePosition={updateCutPosition}
                           onDragEnd={handleCutDragEnd}
                           containerRef={pdfContainerRef}
                         />
                       ))
                    )}
                  </div>
                </Document>
              </div>

              {/* Floating Zoom Controls */}
              <div className="fixed bottom-6 left-6 bg-white rounded-lg shadow-lg p-2 flex gap-2 z-40 border border-gray-200">
                 <button onClick={() => setScale(s => Math.max(0.5, s - 0.1))} className="p-2 hover:bg-gray-100 rounded"><ZoomOut size={20} /></button>
                 <span className="flex items-center justify-center w-12 font-mono text-sm">{Math.round(scale * 100)}%</span>
                 <button onClick={() => setScale(s => Math.min(3, s + 0.1))} className="p-2 hover:bg-gray-100 rounded"><ZoomIn size={20} /></button>
              </div>

              {/* Pagination */}
              <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-40">
                <div className="bg-slate-800 text-white rounded-full shadow-xl px-4 py-2 flex items-center gap-4">
                  <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className="p-1 hover:bg-slate-700 rounded-full disabled:opacity-30"
                  >
                    <ChevronLeft />
                  </button>
                  <span className="font-medium whitespace-nowrap">Page {currentPage} / {numPages}</span>
                  <button 
                    onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))}
                    disabled={currentPage >= numPages}
                    className="p-1 hover:bg-slate-700 rounded-full disabled:opacity-30"
                  >
                    <ChevronRight />
                  </button>
                </div>
                <span className="text-[10px] font-medium text-slate-500 bg-white/80 px-2 py-0.5 rounded border border-gray-200 shadow-sm backdrop-blur">
                  ← → / Enter でページ移動
                </span>
              </div>
            </>
          )}
        </div>

        {/* Right Sidebar (Settings & Tools) */}
        <div className="w-80 bg-white border-l border-gray-200 flex flex-col shadow-xl z-20">
          
          {/* Section: Row Snapper (Always visible for ease of access) */}
          <div className="p-4 border-b border-gray-100 bg-slate-50">
            <h3 className="text-xs font-bold text-slate-500 uppercase mb-3 tracking-wider flex items-center gap-2">
              <Type size={14}/> 行スナップ入力
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: template.rowCount }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => handleRowSnap(i)}
                  disabled={!pdfFile || mode === 'template'}
                  className="h-12 bg-white border border-gray-200 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 rounded-md font-bold text-lg shadow-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <p className="text-xs text-center text-gray-400 mt-2">キーボードの 1〜{template.rowCount} でも入力可能</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            
            {/* Section: Counter Control */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Settings size={16} /> 番号設定
              </h3>
              
              <div className="space-y-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                <div className="flex justify-between items-center">
                  <label className="text-sm text-gray-600">次の番号</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      value={settings.nextNumber}
                      onChange={(e) => setSettings({...settings, nextNumber: parseInt(e.target.value) || 1})}
                      className="w-16 p-1 text-right border rounded text-lg font-bold"
                    />
                  </div>
                </div>

                {/* Digit Count Selector */}
                <div className="flex justify-between items-center">
                  <label className="text-sm text-gray-600">桁数</label>
                  <div className="flex bg-gray-200 rounded p-0.5">
                    <button
                      onClick={() => setSettings({ ...settings, minDigits: 3 })}
                      className={`px-3 py-1 text-xs rounded transition-colors ${settings.minDigits === 3 ? 'bg-white shadow text-gray-800 font-bold' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      3桁
                    </button>
                    <button
                      onClick={() => setSettings({ ...settings, minDigits: 4 })}
                      className={`px-3 py-1 text-xs rounded transition-colors ${settings.minDigits === 4 ? 'bg-white shadow text-gray-800 font-bold' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      4桁
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-600">A-B分け</label>
                  <button 
                    onClick={() => {
                       if (settings.branchChar) {
                          // Turn off, increment parent
                          setSettings(s => ({ ...s, branchChar: null, nextNumber: s.nextNumber + 1 }));
                       } else {
                          // Turn on
                          setSettings(s => ({ ...s, branchChar: 'A' }));
                       }
                    }}
                    className={`px-3 py-1 rounded text-xs font-bold transition-colors ${settings.branchChar ? 'bg-indigo-500 text-white' : 'bg-gray-200 text-gray-500'}`}
                  >
                    {settings.branchChar ? `ON (${settings.branchChar})` : 'OFF'}
                  </button>
                </div>

                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={settings.autoIncrement} 
                    onChange={e => setSettings({...settings, autoIncrement: e.target.checked})}
                    className="rounded text-blue-500"
                  />
                  入力時に自動進行する
                </label>
              </div>
            </div>

            {/* Section: Style */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">表示スタイル</h3>
              <div className="space-y-4">
                 <div>
                    <div className="flex justify-between text-sm mb-1 text-gray-600">
                       <span>文字サイズ</span>
                       <span>{settings.fontSize}px</span>
                    </div>
                    <input 
                       type="range" min="12" max="72" 
                       value={settings.fontSize}
                       onChange={e => setSettings({...settings, fontSize: parseInt(e.target.value)})}
                       className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                 </div>

                 {/* Outline Width Slider */}
                 <div>
                    <div className="flex justify-between text-sm mb-1 text-gray-600">
                       <span>白フチ (縁取り)</span>
                       <span>{settings.textOutlineWidth}px</span>
                    </div>
                    <input 
                       type="range" min="0" max={settings.fontSize} 
                       value={settings.textOutlineWidth}
                       onChange={e => setSettings({...settings, textOutlineWidth: parseInt(e.target.value)})}
                       className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                 </div>
                 
                 <div className="space-y-2">
                   <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-sm text-gray-600">白座布団 (背景)</span>
                      <div className={`w-10 h-5 rounded-full p-0.5 transition-colors ${settings.useWhiteBackground ? 'bg-green-500' : 'bg-gray-300'}`}>
                         <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${settings.useWhiteBackground ? 'translate-x-5' : 'translate-x-0'}`} />
                         <input 
                            type="checkbox" className="hidden"
                            checked={settings.useWhiteBackground}
                            onChange={e => setSettings({...settings, useWhiteBackground: e.target.checked})}
                         />
                      </div>
                   </label>
                   
                   {settings.useWhiteBackground && (
                      <div className="bg-gray-50 rounded-md p-2 border border-gray-100 animate-in fade-in slide-in-from-top-1 duration-200">
                         <div className="flex justify-between mb-1 text-xs text-gray-500">
                            <span>余白サイズ</span>
                            <span>{settings.backgroundPadding}px</span>
                         </div>
                         <input 
                            type="range" min="0" max="20" 
                            value={settings.backgroundPadding}
                            onChange={e => setSettings({...settings, backgroundPadding: parseInt(e.target.value)})}
                            className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-500"
                         />
                      </div>
                   )}
                 </div>
              </div>
            </div>

            {/* Section: Template Config */}
            <div>
               <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center justify-between">
                 <span>テンプレート設定</span>
                 <span className="text-xs font-normal text-orange-600 bg-orange-100 px-2 py-0.5 rounded">
                   {mode === 'template' ? '編集中' : '読取のみ'}
                 </span>
               </h3>
               
               <div className="space-y-3">
                  {/* Template Selector */}
                  <select 
                    value={template.id}
                    onChange={(e) => handleTemplateChange(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded text-sm bg-white"
                  >
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>

                  <div className="grid grid-cols-3 gap-2">
                     <button
                        onClick={saveCurrentTemplate}
                        className="col-span-1 py-1.5 bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 rounded text-xs flex flex-col items-center justify-center gap-1"
                        title="現在選択中のテンプレートを上書き保存"
                     >
                       <Save size={14} /> 保存
                     </button>
                     <button
                        onClick={saveAsNewTemplate}
                        className="col-span-1 py-1.5 bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 rounded text-xs flex flex-col items-center justify-center gap-1"
                        title="新しい名前で保存"
                     >
                       <FilePlus size={14} /> 別名保存
                     </button>
                     <button
                        onClick={deleteTemplate}
                        disabled={templates.length <= 1}
                        className="col-span-1 py-1.5 bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 rounded text-xs flex flex-col items-center justify-center gap-1 disabled:opacity-50"
                        title="現在のテンプレートを削除"
                     >
                       <Trash size={14} /> 削除
                     </button>
                  </div>

                  <hr className="border-gray-100 my-2" />

                  <div className="flex items-center justify-between">
                     <span className="text-sm text-gray-600">行数</span>
                     <div className="flex items-center border rounded">
                        <button 
                           onClick={() => {
                              const newCount = Math.max(1, template.rowCount - 1);
                              setTemplate(t => ({...t, rowCount: newCount, rowPositions: t.rowPositions.slice(0, newCount)}));
                           }}
                           className="px-2 py-1 hover:bg-gray-100 text-gray-600"
                        >
                           <Minus size={14}/>
                        </button>
                        <span className="px-2 w-8 text-center text-sm font-medium">{template.rowCount}</span>
                        <button 
                           onClick={() => {
                              const newCount = Math.min(9, template.rowCount + 1);
                              // Add new row below the last one or at bottom
                              const lastY = template.rowPositions[template.rowPositions.length - 1] || 0;
                              setTemplate(t => ({...t, rowCount: newCount, rowPositions: [...t.rowPositions, Math.min(0.95, lastY + 0.15)]}));
                           }}
                           className="px-2 py-1 hover:bg-gray-100 text-gray-600"
                        >
                           <Plus size={14}/>
                        </button>
                     </div>
                  </div>

                  {/* Distribute Button */}
                   <button
                    onClick={distributeRows}
                    disabled={template.rowCount <= 2}
                    className="w-full py-1.5 border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-blue-600 rounded text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="1行目と最終行の間を等間隔に配置します"
                  >
                    <ArrowUpDown size={14} /> 縦位置を均等配置
                  </button>
                  
                  {mode !== 'template' && (
                     <button 
                       onClick={() => setMode('template')}
                       className="w-full py-2 border border-dashed border-orange-300 bg-orange-50 text-orange-600 rounded hover:bg-orange-100 text-sm flex items-center justify-center gap-2"
                     >
                        <Settings size={14} /> 位置を調整する
                     </button>
                  )}
                  {mode === 'template' && (
                     <p className="text-xs text-gray-500 leading-relaxed">
                        画面上の赤線（横位置）と青線（各行の縦位置）をドラッグして、用紙の枠に合わせてください。変更内容は「保存」ボタンで記録されます。
                     </p>
                  )}
               </div>
            </div>

          </div>
          
          <div className="p-4 border-t border-gray-200 text-center text-xs text-gray-400">
             CutMark PDF v1.0.0<br/>Copyright (c) 2025 stechdrive<br/>このツールはブラウザ内でのみ処理を行い<br/>読み込んだPDFや保存したテンプレートが<br/>サーバーに送信されることはありません
          </div>
        </div>
      </div>
    </div>
  );
}