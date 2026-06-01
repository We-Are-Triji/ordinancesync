// Server-side PDF text extraction using pdfjs-dist's legacy build, which runs
// in Node without a browser worker. Used at upload time so ordinance content
// is stored as searchable text for the chat agent.

interface TextItem {
  str?: string
}

export interface ExtractResult {
  text: string
  pageCount: number
}

export async function extractPdfText(buffer: Buffer): Promise<ExtractResult> {
  // Dynamic import keeps this out of the client bundle and avoids worker setup.
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs")

  // Disable the worker; the legacy build can parse on the main thread in Node.
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  })

  const doc = await loadingTask.promise
  const pageCount = doc.numPages
  const pages: string[] = []

  for (let i = 1; i <= pageCount; i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    const pageText = (content.items as TextItem[])
      .map((item) => item.str ?? "")
      .join(" ")
      .replace(/\s+/g, " ")
      .trim()
    pages.push(pageText)
  }

  await doc.cleanup()

  return {
    text: pages.join("\n\n"),
    pageCount,
  }
}
