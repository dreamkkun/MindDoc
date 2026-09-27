import pdfParse from "pdf-parse";

export async function extractTextFromBuffer(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === "application/pdf") {
    const result = await pdfParse(buffer);
    return result.text.trim();
  }
  return buffer.toString("utf-8").trim();
}
