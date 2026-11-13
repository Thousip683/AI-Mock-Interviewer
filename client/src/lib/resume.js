export async function readResume(file) {
  const pdf = /\.pdf$/i.test(file.name);
  if (!pdf && !/\.txt$/i.test(file.name)) throw new Error('Upload a PDF or .txt résumé.');
  if (file.size > (pdf ? 5 * 1024 * 1024 : 65536)) throw new Error(pdf ? 'Keep PDFs under 5 MB.' : 'Keep .txt files under 64 KB.');
  let text;
  if (pdf) {
    const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist');
    const { default: workerUrl } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
    GlobalWorkerOptions.workerSrc = workerUrl;
    const task = getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false });
    try {
      const document = await task.promise;
      if (document.numPages > 20) throw new Error('Use a résumé with 20 pages or fewer.');
      const pages = [];
      for (let n = 1; n <= document.numPages; n++) {
        const page = await document.getPage(n);
        const content = await page.getTextContent();
        pages.push(content.items.map(item => item.str || '').join(' '));
      }
      text = pages.join('\n');
    } finally {
      await task.destroy();
    }
  } else text = await file.text();
  if (!text.trim()) throw new Error('No readable text found. Upload a text-based PDF or .txt file; scanned PDFs are not supported.');
  if (text.length > 16000) throw new Error('Keep résumé content under 16,000 characters.');
  return text;
}
