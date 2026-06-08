// Client-only PDF/text extractor. Uses pdfjs-dist with a CDN worker
// to avoid bundler-specific worker setup.

let pdfjsPromise: Promise<typeof import("pdfjs-dist")> | null = null;

async function loadPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist").then((mod) => {
      mod.GlobalWorkerOptions.workerSrc =
        "https://cdn.jsdelivr.net/npm/pdfjs-dist@6.0.227/build/pdf.worker.min.mjs";
      return mod;
    });
  }
  return pdfjsPromise;
}

export async function extractTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    const pdfjs = await loadPdfjs();
    const buf = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: buf }).promise;
    const out: string[] = [];
    const max = Math.min(pdf.numPages, 80);
    for (let i = 1; i <= max; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const text = content.items
        .map((item) => ("str" in item ? (item as { str: string }).str : ""))
        .join(" ");
      out.push(text);
    }
    return out.join("\n\n");
  }
  // text / markdown / csv / json fallback
  return await file.text();
}