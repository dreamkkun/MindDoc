import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { del } from "@vercel/blob";
import { extractTextFromBuffer } from "@/lib/pdf";
import { generateMindmapTree } from "@/lib/gemini";
import { generateMindmapTreeWithClaude } from "@/lib/claude";
import type { AIMindmapNode } from "@/lib/aiTypes";
import type { MindmapNode } from "@/types/mindmap";
import { ALLOWED_EXTENSIONS } from "@/lib/uploadLimits";

export const runtime = "nodejs";
// AI generation (plus a retry on failure) can take a while, especially for
// larger documents or Claude with thinking enabled; 60s was cutting it too
// close and produced real 60s timeouts on production. Vercel's Fluid Compute
// (default for new projects) supports up to 300s on Hobby.
export const maxDuration = 150;

const MIN_TEXT_LENGTH = 20;

type AiProvider = "claude" | "gemini";

function resolveProvider(): AiProvider | null {
  const configured = process.env.AI_PROVIDER?.toLowerCase();
  if (configured === "claude" || configured === "gemini") return configured;
  if (process.env.ANTHROPIC_API_KEY) return "claude";
  if (process.env.GEMINI_API_KEY) return "gemini";
  return null;
}

function generateTree(provider: AiProvider, sourceText: string, maxDepth: number): Promise<AIMindmapNode> {
  return provider === "claude"
    ? generateMindmapTreeWithClaude(sourceText, maxDepth)
    : generateMindmapTree(sourceText, maxDepth);
}

function attachIds(node: AIMindmapNode, depth = 0): MindmapNode {
  return {
    id: nanoid(),
    name: node.name,
    color: node.color,
    depth,
    children: node.children?.map((child) => attachIds(child, depth + 1)) ?? [],
  };
}

function fileExtension(pathname: string): string {
  const dot = pathname.lastIndexOf(".");
  return dot === -1 ? "" : pathname.slice(dot).toLowerCase();
}

/** The file was uploaded client-side straight to Vercel Blob; only fetch URLs we issued. */
function isTrustedBlobUrl(url: string): boolean {
  try {
    const { hostname, protocol } = new URL(url);
    return protocol === "https:" && hostname.endsWith(".public.blob.vercel-storage.com");
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  let payload: { blobUrl?: unknown; maxDepth?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "요청 본문을 읽을 수 없습니다." }, { status: 400 });
  }

  const { blobUrl } = payload;
  const maxDepth = Math.min(6, Math.max(1, Number(payload.maxDepth) || 4));

  if (typeof blobUrl !== "string" || !isTrustedBlobUrl(blobUrl)) {
    return NextResponse.json({ success: false, error: "유효하지 않은 파일 URL입니다." }, { status: 400 });
  }

  const extension = fileExtension(new URL(blobUrl).pathname);
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return NextResponse.json(
      { success: false, error: "지원하지 않는 파일 형식입니다. (.pdf, .txt, .md)" },
      { status: 400 },
    );
  }

  const provider = resolveProvider();
  if (!provider) {
    return NextResponse.json(
      { success: false, error: "AI 제공자가 설정되지 않았습니다. GEMINI_API_KEY 또는 ANTHROPIC_API_KEY를 설정하세요." },
      { status: 500 },
    );
  }

  let buffer: Buffer;
  try {
    const fileRes = await fetch(blobUrl);
    if (!fileRes.ok) throw new Error(`blob fetch responded ${fileRes.status}`);
    buffer = Buffer.from(await fileRes.arrayBuffer());
  } catch {
    return NextResponse.json({ success: false, error: "업로드된 파일을 불러오지 못했습니다." }, { status: 502 });
  } finally {
    // Best-effort cleanup - we already have the bytes we need in `buffer`.
    del(blobUrl).catch(() => {});
  }

  const mimeType = extension === ".pdf" ? "application/pdf" : "text/plain";

  let sourceText: string;
  try {
    sourceText = await extractTextFromBuffer(buffer, mimeType);
  } catch {
    return NextResponse.json(
      { success: false, error: "파일에서 텍스트를 추출하지 못했습니다. 파일이 손상되었을 수 있습니다." },
      { status: 422 },
    );
  }

  if (!sourceText || sourceText.length < MIN_TEXT_LENGTH) {
    return NextResponse.json(
      { success: false, error: "텍스트 레이어가 없습니다. 이미지로 스캔된 PDF는 지원하지 않습니다." },
      { status: 422 },
    );
  }

  let tree: AIMindmapNode | null = null;
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 2 && !tree; attempt += 1) {
    try {
      tree = await generateTree(provider, sourceText, maxDepth);
    } catch (err) {
      lastError = err;
    }
  }

  if (!tree) {
    console.error(`generate-mindmap: ${provider} request failed`, lastError);
    return NextResponse.json(
      { success: false, error: "AI 마인드맵 생성에 실패했습니다. 잠시 후 다시 시도해주세요." },
      { status: 502 },
    );
  }

  return NextResponse.json({ success: true, data: attachIds(tree) });
}
