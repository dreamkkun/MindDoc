"use client";

import { useEffect, useRef, useState } from "react";
import { nanoid } from "nanoid";
import { FilePlus2, Sparkles, Upload } from "lucide-react";
import { useMindmapStore } from "@/hooks/useMindmapStore";
import HeaderToolbar from "@/components/common/HeaderToolbar";
import UploadModal from "@/components/modal/UploadModal";
import D3Mindmap, { type D3MindmapHandle } from "@/components/canvas/D3Mindmap";
import OutlineView from "@/components/views/OutlineView";
import QnaView from "@/components/views/QnaView";
import type { MindmapNode } from "@/types/mindmap";

const SAMPLE_DATA: MindmapNode = {
  id: "root-1",
  name: "지능형 시스템의 개념",
  color: "#3b82f6",
  children: [
    {
      id: "node-1-1",
      name: "1. 정의 및 핵심 용어",
      color: "#06b6d4",
      children: [
        { id: "node-1-1-1", name: "AI 기반 환경 인식 및 적응 컴퓨터 시스템", children: [] },
        { id: "node-1-1-2", name: "에이전트(Agent)와 환경(Environment)", children: [] },
      ],
    },
    {
      id: "node-1-2",
      name: "2. 지능형 시스템의 유형",
      color: "#10b981",
      children: [
        {
          id: "node-1-2-1",
          name: "반응형 에이전트",
          children: [
            { id: "node-1-2-1-1", name: "규칙 기반 의사결정", children: [] },
            { id: "node-1-2-1-2", name: "실시간 센서 입력 처리", children: [] },
          ],
        },
        { id: "node-1-2-2", name: "학습형 에이전트", children: [] },
        { id: "node-1-2-3", name: "목표 기반 에이전트", children: [] },
      ],
    },
    {
      id: "node-1-3",
      name: "3. 응용 분야",
      color: "#f59e0b",
      children: [
        { id: "node-1-3-1", name: "자율주행 시스템", children: [] },
        { id: "node-1-3-2", name: "추천 시스템", children: [] },
        { id: "node-1-3-3", name: "자연어 처리", children: [] },
      ],
    },
    {
      id: "node-1-4",
      name: "4. 한계와 과제",
      color: "#f43f5e",
      children: [
        { id: "node-1-4-1", name: "설명 가능성 문제", children: [] },
        { id: "node-1-4-2", name: "데이터 편향", children: [] },
      ],
    },
  ],
};

export default function Home() {
  const root = useMindmapStore((s) => s.root);
  const setRoot = useMindmapStore((s) => s.setRoot);
  const viewMode = useMindmapStore((s) => s.viewMode);
  const expandAll = useMindmapStore((s) => s.expandAll);
  const collapseAll = useMindmapStore((s) => s.collapseAll);
  const undo = useMindmapStore((s) => s.undo);
  const redo = useMindmapStore((s) => s.redo);
  const canUndo = useMindmapStore((s) => s.history.length > 0);
  const canRedo = useMindmapStore((s) => s.future.length > 0);
  const mindmapRef = useRef<D3MindmapHandle>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      const modifier = event.ctrlKey || event.metaKey;
      if (!modifier) return;
      const key = event.key.toLowerCase();
      if (key === "z" && event.shiftKey) {
        event.preventDefault();
        redo();
      } else if (key === "z") {
        event.preventDefault();
        undo();
      } else if (key === "y") {
        event.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  if (!root) {
    return (
      <div className="relative flex h-screen w-screen flex-col items-center justify-center overflow-hidden bg-slate-900 px-6 text-center text-slate-100">
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox="0 0 1440 900"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <g className="opacity-[0.16]" fill="none" strokeWidth="1.5">
            <path d="M720,450 Q910,510 1100,450" stroke="#3b82f6" />
            <path d="M720,450 Q812,627 989,719" stroke="#06b6d4" />
            <path d="M720,450 Q660,640 720,830" stroke="#10b981" />
            <path d="M720,450 Q543,542 451,719" stroke="#f59e0b" />
            <path d="M720,450 Q530,390 340,450" stroke="#f43f5e" />
            <path d="M720,450 Q628,273 451,181" stroke="#8b5cf6" />
            <path d="M720,450 Q780,260 720,70" stroke="#ec4899" />
            <path d="M720,450 Q897,358 989,181" stroke="#3b82f6" />
          </g>
          <g className="opacity-[0.22]">
            <circle cx="720" cy="450" r="7" fill="#3b82f6" />
            <circle cx="1100" cy="450" r="4" fill="#3b82f6" />
            <circle cx="989" cy="719" r="4" fill="#06b6d4" />
            <circle cx="720" cy="830" r="4" fill="#10b981" />
            <circle cx="451" cy="719" r="4" fill="#f59e0b" />
            <circle cx="340" cy="450" r="4" fill="#f43f5e" />
            <circle cx="451" cy="181" r="4" fill="#8b5cf6" />
            <circle cx="720" cy="70" r="4" fill="#ec4899" />
            <circle cx="989" cy="181" r="4" fill="#3b82f6" />
          </g>
        </svg>

        <div className="relative">
          <span className="mb-4 flex items-center gap-1.5 rounded border border-blue-500/30 bg-blue-500/20 px-3 py-1.5 text-sm font-semibold text-blue-400">
            <Sparkles className="h-4 w-4" /> MindDoc AI
          </span>
          <h1 className="mb-2 max-w-lg text-2xl font-bold text-white md:text-3xl">
            문서를 마인드맵으로 정리하세요
          </h1>
          <p className="mb-8 max-w-md text-sm text-slate-400">
            강의 자료나 문서를 업로드하면 AI가 핵심 개념을 계층 구조로 정리합니다. 빈 마인드맵부터 직접 만들 수도
            있어요.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => setUploadOpen(true)}
              className="flex items-center gap-2 rounded-md bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600"
            >
              <Upload className="h-4 w-4" /> 문서 업로드
            </button>
            <button
              onClick={() => setRoot({ id: nanoid(), name: "새 마인드맵", color: "#3b82f6", children: [] })}
              className="flex items-center gap-2 rounded-md border border-slate-600 bg-slate-800 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-700"
            >
              <FilePlus2 className="h-4 w-4" /> 새로 만들기
            </button>
          </div>
          <button
            onClick={() => setRoot(SAMPLE_DATA)}
            className="mt-6 text-sm text-slate-400 underline-offset-2 hover:text-slate-200 hover:underline"
          >
            예제로 살펴보기
          </button>
        </div>
        <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-slate-900 text-slate-100">
      <HeaderToolbar
        title={root?.name ?? "MindDoc AI"}
        subtitle="노드 클릭 시 접기/펼치기 · 더블클릭 수정 · 휠 줌 및 드래그 이동"
        onExpandAll={expandAll}
        onCollapseAll={collapseAll}
        onFitToScreen={() => mindmapRef.current?.fitToScreen()}
        onToggleFullscreen={handleToggleFullscreen}
        onUpload={() => setUploadOpen(true)}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
      />
      <main className="relative w-full flex-1">
        {viewMode === "outline" && root ? (
          <OutlineView root={root} />
        ) : viewMode === "qna" && root ? (
          <QnaView root={root} />
        ) : (
          <D3Mindmap ref={mindmapRef} />
        )}
      </main>
      <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} />
    </div>
  );
}
