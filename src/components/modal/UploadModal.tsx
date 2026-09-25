"use client";

import { useCallback, useRef, useState } from "react";
import { Loader2, UploadCloud, X } from "lucide-react";
import { useMindmapStore } from "@/hooks/useMindmapStore";

// Vercel's Node.js serverless functions hard-cap the request body at 4.5MB.
const MAX_FILE_SIZE = 4 * 1024 * 1024;
const ALLOWED_EXTENSIONS = [".pdf", ".txt", ".md"];

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
}

function fileExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot === -1 ? "" : filename.slice(dot).toLowerCase();
}

function validateFile(file: File): string | null {
  if (!ALLOWED_EXTENSIONS.includes(fileExtension(file.name))) {
    return "지원하지 않는 파일 형식입니다. (.pdf, .txt, .md)";
  }
  if (file.size > MAX_FILE_SIZE) {
    return "파일 용량은 4MB를 초과할 수 없습니다.";
  }
  return null;
}

export default function UploadModal({ open, onClose }: UploadModalProps) {
  const setRoot = useMindmapStore((s) => s.setRoot);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const uploadFile = useCallback(
    async (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      setError(null);
      setIsLoading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("maxDepth", "4");
        const res = await fetch("/api/generate-mindmap", { method: "POST", body: formData });
        if (res.status === 413) {
          setError("파일 용량은 4MB를 초과할 수 없습니다.");
          return;
        }
        const json = await res.json();
        if (!res.ok || !json.success) {
          setError(json.error ?? "마인드맵 생성에 실패했습니다.");
          return;
        }
        setRoot(json.data);
        onClose();
      } catch {
        setError("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
      } finally {
        setIsLoading(false);
      }
    },
    [setRoot, onClose],
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={() => !isLoading && onClose()}
    >
      <div
        className="relative w-full max-w-lg rounded-xl border border-slate-700 bg-slate-800 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute right-4 top-4 text-slate-400 hover:text-white disabled:opacity-40"
          onClick={onClose}
          disabled={isLoading}
          aria-label="닫기"
        >
          <X size={18} />
        </button>
        <h2 className="mb-1 text-lg font-bold text-white">문서 업로드</h2>
        <p className="mb-4 text-xs text-slate-400">
          PDF, TXT, MD 파일을 업로드하면 AI가 핵심 개념을 마인드맵으로 정리합니다. (최대 4MB)
        </p>

        <div
          className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-10 text-center transition ${
            isDragging ? "border-blue-500 bg-blue-500/10" : "border-slate-600"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) uploadFile(file);
          }}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
        >
          <UploadCloud className="h-8 w-8 text-slate-500" />
          <p className="text-sm text-slate-300">파일을 드래그하거나 클릭하여 업로드</p>
          <p className="text-xs text-slate-500">.pdf · .txt · .md (최대 4MB)</p>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.txt,.md"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadFile(file);
              e.target.value = "";
            }}
          />
        </div>

        {error && (
          <div className="mt-3 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
            {error}
          </div>
        )}

        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-slate-900/85 backdrop-blur">
            <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
            <p className="text-sm text-slate-300">문서를 분석하고 마인드맵을 생성하는 중...</p>
          </div>
        )}
      </div>
    </div>
  );
}
