"use client";

import { Eye, EyeOff, Maximize, Minimize2, Sparkles, Upload } from "lucide-react";

interface HeaderToolbarProps {
  title: string;
  subtitle?: string;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onFitToScreen: () => void;
  onToggleFullscreen: () => void;
  onUpload: () => void;
}

export default function HeaderToolbar({
  title,
  subtitle,
  onExpandAll,
  onCollapseAll,
  onFitToScreen,
  onToggleFullscreen,
  onUpload,
}: HeaderToolbarProps) {
  return (
    <header className="z-20 flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-700 bg-slate-800/90 px-5 py-3 backdrop-blur">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5 rounded border border-blue-500/30 bg-blue-500/20 px-2.5 py-1 text-xs font-semibold text-blue-400">
          <Sparkles className="h-3.5 w-3.5" /> MindDoc AI
        </span>
        <div>
          <h1 className="text-base font-bold leading-tight text-white md:text-lg">{title}</h1>
          {subtitle && <p className="text-[11px] text-slate-400">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onUpload}
          className="flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-500"
        >
          <Upload className="h-3.5 w-3.5" />
          업로드
        </button>
        <button
          onClick={onExpandAll}
          className="flex items-center gap-1 rounded-md border border-slate-600 bg-slate-700/80 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-600"
        >
          <Eye className="h-3.5 w-3.5" />
          전체 펼치기
        </button>
        <button
          onClick={onCollapseAll}
          className="flex items-center gap-1 rounded-md border border-slate-600 bg-slate-700/80 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-600"
        >
          <EyeOff className="h-3.5 w-3.5" />
          전체 접기
        </button>
        <button
          onClick={onFitToScreen}
          className="flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-500"
        >
          <Minimize2 className="h-3.5 w-3.5" />
          화면 꽉 채우기
        </button>
        <button
          onClick={onToggleFullscreen}
          className="flex items-center gap-1 rounded-md border border-slate-600 bg-slate-700/80 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-600"
        >
          <Maximize className="h-3.5 w-3.5" />
          전체화면
        </button>
      </div>
    </header>
  );
}
