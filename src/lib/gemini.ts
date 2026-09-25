import { GoogleGenerativeAI, SchemaType, type Schema } from "@google/generative-ai";

export interface GeminiMindmapNode {
  name: string;
  color?: string;
  children?: GeminiMindmapNode[];
}

/**
 * Gemini's structured-output schema has no self-reference, so the recursive
 * node shape from the PRD is unrolled to a fixed depth instead.
 */
function buildNodeSchema(remainingDepth: number): Schema {
  const properties: Record<string, Schema> = {
    name: { type: SchemaType.STRING, description: "단원명 또는 세부 개념 (간결한 명사형)" },
    color: { type: SchemaType.STRING, description: "HEX 색상 코드 (상위 항목별 구분)" },
  };
  if (remainingDepth > 0) {
    properties.children = {
      type: SchemaType.ARRAY,
      items: buildNodeSchema(remainingDepth - 1),
    };
  }
  return { type: SchemaType.OBJECT, properties, required: ["name"] };
}

export function buildMindmapSchema(maxDepth: number): Schema {
  return {
    type: SchemaType.OBJECT,
    properties: {
      name: { type: SchemaType.STRING, description: "강의 전체의 핵심 주제 (루트 노드)" },
      color: { type: SchemaType.STRING, description: "HEX 색상 코드" },
      children: {
        type: SchemaType.ARRAY,
        items: buildNodeSchema(Math.max(0, maxDepth - 1)),
      },
    },
    required: ["name", "children"],
  };
}

let cachedClient: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY 환경변수가 설정되지 않았습니다.");
  if (!cachedClient) cachedClient = new GoogleGenerativeAI(apiKey);
  return cachedClient;
}

const MAX_SOURCE_CHARS = 60000;

export async function generateMindmapTree(sourceText: string, maxDepth: number): Promise<GeminiMindmapNode> {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL ?? "gemini-1.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: buildMindmapSchema(maxDepth),
    },
  });

  const prompt = `다음은 강의 자료에서 추출한 텍스트입니다. 핵심 개념을 계층 구조로 정리하여 학습 마인드맵을 생성하세요.
- 최상위 루트 노드는 문서 전체를 아우르는 핵심 주제로 작성하세요.
- 각 하위 노드는 간결한 명사형으로 작성하고, 최대 ${maxDepth}단계 깊이까지만 구성하세요.
- color 필드는 상위 항목(형제 그룹)별로 구분되는 HEX 색상 코드를 지정하세요.
- 문서에 없는 내용을 지어내지 마세요.

--- 문서 내용 ---
${sourceText.slice(0, MAX_SOURCE_CHARS)}`;

  const result = await model.generateContent(prompt);
  const raw = result.response.text();
  return JSON.parse(raw) as GeminiMindmapNode;
}
