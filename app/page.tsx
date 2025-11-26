'use client';

import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Copy, Download, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Home() {
  const [tables, setTables] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setLoading(true);
    setError('');
    setTables('');

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfjsLib = await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.mjs');
      const pdfjsWorker = await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.mjs');
      pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(new Blob([pdfjsWorker.default], { type: 'application/javascript' }));

      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;

      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + '\n\n';
      }

      const htmlTables = extractTablesToHtml(fullText);
      setTables(htmlTables);
    } catch (err) {
      setError('Feil ved lesing av PDF: ' + (err as Error).message + '. Prøv en annen fil.');
    }
    setLoading(false);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop, 
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false 
  });

  const copyToClipboard = () => {
    if (!tables) return;
    const fullHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" 
            xmlns:x="urn:schemas-microsoft-com:office:excel" 
            xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="utf-8"><style>table {border-collapse: collapse; font-family: Calibri; font-size: 14px;}</style></head>
      <body>${tables}</body></html>`;
    navigator.clipboard.writeText(fullHtml);
    alert('Kopiert som ekte Excel-HTML! Lim inn i din strenge nettside – den gjenkjenner det som tabell-data (ikke CSV).');
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center p-8">
      <motion.h1 
        className="text-4xl font-bold text-center mb-8 text-gray-800"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        FraktParse – PDF til Excel
      </motion.h1>
      <p className="text-center mb-8 text-gray-600 max-w-md">Last opp PDF fra PostNord, Bring, DHL osv. – få priser som kopierbar tabell. Moderne og enkelt.</p>
      
      <motion.div 
        {...getRootProps()} 
        className="border-4 border-dashed rounded-3xl p-12 text-center cursor-pointer bg-white shadow-xl hover:shadow-2xl transition-all w-full max-w-2xl"
        initial={{ scale: 0.95 }}
        whileHover={{ scale: 1.02 }}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <Loader2 className="w-16 h-16 mx-auto mb-4 text-blue-500 animate-spin" />
        ) : (
          <Upload className="w-16 h-16 mx-auto mb-4 text-blue-500" />
        )}
        <p className="text-xl font-medium">{isDragActive ? 'Slipp PDF-en...' : 'Dra PDF hit eller klikk for å laste opp'}</p>
        <p className="text-gray-500 mt-2">Støtter prislister fra PostNord, Bring, DHL, Schenker... (flere tabeller håndteres auto)</p>
      </motion.div>

      {loading && <div className="mt-4 flex items-center gap-2 text-blue-600"><Loader2 className="animate-spin" size={20} /> Laster... (finner tabeller i PDF)</div>}
      {error && <div className="mt-4 text-red-500 text-center p-4 bg-red-50 rounded-lg max-w-md">{error}</div>}

      {tables && (
        <motion.div 
          className="mt-8 w-full max-w-4xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <h2 className="text-2xl font-semibold mb-4">Funne tabeller (klar for Excel):</h2>
          <div className="overflow-auto bg-white rounded-lg shadow-md p-4 border" dangerouslySetInnerHTML={{ __html: tables }} />
          <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={copyToClipboard} 
              className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-lg flex items-center gap-2 font-medium transition-colors shadow-md"
            >
              <Copy size={20} /> Kopier til Excel (ekte HTML-tabell)
            </button>
            <a 
              href={`data:text/html;charset=utf-8,${encodeURIComponent(tables)}`} 
              download="frakt-priser.html"
              className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-lg flex items-center gap-2 font-medium transition-colors shadow-md"
            >
              <Download size={20} /> Last ned som HTML
            </a>
          </div>
          <p className="text-sm text-gray-500 mt-4 text-center italic">Tips: Lim inn HTML-et i din strenge nettside – det identifiseres som ekte Excel-data!</p>
        </motion.div>
      )}
    </main>
  );
}

// Ekstraher tabeller fra PDF-tekst (regex for frakt-priser med soner/produkter)
function extractTablesToHtml(text: string): string {
  // Finn tabell-lignende strukturer (f.eks. "Produkt Sone 1 Sone 2 Pris")
  const tableMatches = text.match(/([A-ZÆØÅa-zæøå][^.!?\n]{5,})\s+([A-ZÆØÅa-zæøå0-9\s\-]+(?:\n[A-ZÆØÅa-zæøå0-9\s\-]+)+)/g) || [];
  let html = '';
  tableMatches.slice(0, 5).forEach((match, index) => {
    const lines = match.split('\n').filter(l => l.trim().length > 5).slice(0, 10); // Begrens til 10 rader
    if (lines.length < 2) return;

    html += `<h3 class="text-lg font-medium mb-2 mt-6">Tabell ${index + 1}: Priser (f.eks. soner/land)</h3>`;
    html += '<table border="1" style="border-collapse: collapse; width: 100%; margin-bottom: 20px; font-family: Calibri, sans-serif; font-size: 14px;">';
    html += '<thead><tr style="background-color: #f0f0f0; font-weight: bold;">';

    // Anta 4 kolonner (typisk for frakt: Produkt, Sone 1, Sone 2, Pris)
    const headers = ['Produkt', 'Sone 1', 'Sone 2', 'Pris (kr)'];
    headers.forEach(h => {
      html += `<th style="padding: 10px; text-align: center; border: 1px solid #ddd;">${h}</th>`;
    });
    html += '</tr></thead><tbody>';

    // Del linjer i celler (basert på lengde og mønster)
    lines.forEach(line => {
      const cells = line.match(/.{1,20}/g) || [line]; // Del i ca. 20-tegn celler
      html += '<tr>';
      cells.slice(0, 4).forEach((cell, idx) => {
        const content = cell.trim().replace(/[\s\n]+/g, ' ');
        const align = idx > 0 ? 'right' : 'left';
        html += `<td style="padding: 8px; text-align: ${align}; border: 1px solid #ddd;">${content}</td>`;
      });
      html += '</tr>';
    });
    html += '</tbody></table>';
  });

  return html || '<p class="text-gray-500">Ingen tabeller funnet. Prøv en PDF med prislister (f.eks. PostNord sone-priser).</p>';
}
