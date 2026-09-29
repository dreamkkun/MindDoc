"use client";

import { useEffect, useRef, useState } from "react";
import {
  Download,
  Eye,
  EyeOff,
  FileImage,
  FileText,
  ListTree,
  Maximize,
  MessageCircleQuestion,
  Minimize2,
  Network,
  Printer,
  Redo2,
  Sparkles,
  Undo2,
  Upload,
} from "lucide-react";
import { useMindmapStore } from "@/hooks/useMindmapStore";
import { exportMindmapAsImage, exportMindmapAsPdf, printMindmap } from "@/lib/exportMindmap";

interface HeaderToolbarProps {
  title: string;
  subtitle?: string;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onFitToScreen: () => void;
  onToggleFullscreen: () => void;
  onUpload: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export default function HeaderToolbar({
  title,
  subtitle,
  onExpandAll,
  onCollapseAll,
  onFitToScreen,
  onToggleFullscreen,
  onUpload,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: HeaderToolbarProps) {
  const root = useMindmapStore((s) => s.root);
  const annotations = useMindmapStore((s) => s.annotations);
  const viewMode = useMindmapStore((s) => s.viewMode);
  const setViewMode = useMindmapStore((s) => s.setViewMode);
  const [exportOpen, setExportOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!exportOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setExportOpen(false);
    };
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, [exportOpen]);

  const runExport = async (task: () => Promise<void> | void) => {
    setExportOpen(false);
    if (!root) return;
    setIsExporting(true);
    try {
      await task();
    } catch (err) {
      console.error("mindmap export failed", err);
      window.alert("내보내기에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setIsExporting(false);
    }
  };

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

        <div className="relative" ref={menuRef}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExportOpen((v) => !v);
            }}
            disabled={!root || isExporting}
            className="flex items-center gap-1 rounded-md border border-slate-600 bg-slate-700/80 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            {isExporting ? "내보내는 중..." : "내보내기"}
          </button>

          {exportOpen && (
            <div
              className="absolute right-0 top-full z-30 mt-1 w-44 overflow-hidden rounded-md border border-slate-700 bg-slate-800 py-1 text-sm shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-slate-200 hover:bg-slate-700"
                onClick={() => runExport(() => exportMindmapAsImage(root!, annotations, "png"))}
              >
                <FileImage className="h-3.5 w-3.5" /> PNG로 저장
              </button>
              <button
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-slate-200 hover:bg-slate-700"
                onClick={() => runExport(() => exportMindmapAsImage(root!, annotations, "jpeg"))}
              >
                <FileImage className="h-3.5 w-3.5" /> JPEG로 저장
              </button>
              <button
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-slate-200 hover:bg-slate-700"
                onClick={() => runExport(() => exportMindmapAsPdf(root!, annotations))}
              >
                <FileText className="h-3.5 w-3.5" /> PDF로 저장
              </button>
              <div className="my-1 border-t border-slate-700" />
              <button
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-slate-200 hover:bg-slate-700"
                onClick={() => runExport(() => printMindmap(root!, annotations))}
              >
                <Printer className="h-3.5 w-3.5" /> 인쇄 (미리보기)
              </button>
            </div>
          )}
        </div>

        <div className="flex overflow-hidden rounded-md border border-slate-600">
          <button
            onClick={() => setViewMode("canvas")}
            disabled={!root}
            title="마인드맵 보기"
            className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
              viewMode === "canvas" ? "bg-blue-600 text-white" : "bg-slate-700/80 text-slate-200 hover:bg-slate-600"
            }`}
          >
            <Network className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setViewMode("outline")}
            disabled={!root}
            title="목차 보기"
            className={`flex items-center gap-1 border-l border-slate-600 px-2.5 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
              viewMode === "outline" ? "bg-blue-600 text-white" : "bg-slate-700/80 text-slate-200 hover:bg-slate-600"
            }`}
          >
            <ListTree className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setViewMode("qna")}
            disabled={!root}
            title="Q&A 보기"
            className={`flex items-center gap-1 border-l border-slate-600 px-2.5 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
              viewMode === "qna" ? "bg-blue-600 text-white" : "bg-slate-700/80 text-slate-200 hover:bg-slate-600"
            }`}
          >
            <MessageCircleQuestion className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex overflow-hidden rounded-md border border-slate-600">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="실행 취소 (Ctrl+Z)"
            className="flex items-center gap-1 bg-slate-700/80 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Undo2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title="다시 실행 (Ctrl+Shift+Z)"
            className="flex items-center gap-1 border-l border-slate-600 bg-slate-700/80 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Redo2 className="h-3.5 w-3.5" />
          </button>
        </div>

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
