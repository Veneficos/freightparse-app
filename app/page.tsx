'use client';

import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Copy, Download, Loader2 } from 'lucide-react';

export default function Home() {
  const [tables, setTables] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const apiKey = process.env.NEXT_PUBLIC_LLAMA_CLOUD_API_KEY; // Din nøkkel fra Vercel

  const onDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file || !apiKey) {
      setError('Fil eller API-nøkkel mangler. Sjekk Vercel-innstillingene.');
      return;
    }

    setLoading(true);
    setError('');
    setTables('');

    try {
      // Lag FormData for filen
      const formData = new FormData();
      formData.append('file', file);
      formData.append('result_type', 'markdown');
      formData.append('language', 'no'); // Norsk støtte

      // Kall LlamaParse API direkte (ingen pakke nødvendig!)
      const response = await fetch('https://api.cloud.llamaindex.ai/v1/parse', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`API-feil: ${response.status} - ${response.statusText}`);
      }

      const result = await response.json();
      const markdown = result.text || result.markdown; // API returnerer markdown med tabeller

      // Konverter markdown-tabeller til HTML for Excel
      const htmlTables = parseMarkdownToHtmlTables(markdown);
      setTables(htmlTables);
    } catch (err) {
      setError('Feil ved parsing: ' + (err as Error).message + '. Sjekk API-nøkkelen din på cloud.llamaindex.ai.');
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
    // Lag ekte Excel-kompatibel HTML (med xmlns for å lure din strenge nettside)
    const fullHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" 
            xmlns:x="urn:schemas-microsoft-com:office:excel" 
            xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="utf-8"><style>table {border-collapse: collapse;}</style></head>
      <body>${tables}</body></html>`;
    
    navigator.clipboard.writeText(fullHtml);
    alert('Kopiert som ekte Excel-HTML! Lim inn i din nettside/Excel – det vil gjenkjennes som tabell-data (ikke CSV).');
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold text-center mb-8 text-gray-800">FraktParse – PDF til Excel</h1>
      <p className="text-center mb-8 text-gray-600 max-w-md">Last opp PDF fra PostNord, Bring, DHL osv. – få priser som kopierbar tabell. Moderne og enkelt.</p>
      
      <div {...getRootProps()} className="border-4 border-dashed rounded-3xl p-12 text-center cursor-pointer bg-white shadow-xl hover:shadow-2xl transition-all w-full max-w-2xl">
        <input {...getInputProps()} />
        {isDragActive ? (
          <Loader2 className="w-16 h-16 mx-auto mb-4 text-blue-500 animate-spin" />
        ) : (
          <Upload className="w-16 h-16 mx-auto mb-4 text-blue-500" />
        )}
        <p className="text-xl font-medium">{isDragActive ? 'Slipp PDF-en...' : 'Dra PDF hit eller klikk for å laste opp'}</p>
        <p className="text-gray-500 mt-2">Støtter prislister fra PostNord, Bring, DHL, Schenker... (flere tabeller håndteres auto)</p>
      </div>

      {loading && <div className="mt-4 flex items-center gap-2 text-blue-600"><Loader2 className="animate-spin" size={20} /> Laster... (finner tabeller med AI)</div>}
      {error && <div className="mt-4 text-red-500 text-center p-4 bg-red-50 rounded-lg max-w-md">{error}</div>}

      {tables && (
        <div className="mt-8 w-full max-w-4xl">
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
          <p className="text-sm text-gray-500 mt-4 text-center italic">Tips: Denne HTML-en identifiseres som 'Excel-data' når du limer inn – ingen CSV-problemer!</p>
        </div>
      )}
    </main>
  );
}

// Hjelpefunksjon: Konverterer markdown-tabeller til kopierbar HTML (bedre deteksjon for priser/soner)
function parseMarkdownToHtmlTables(markdown: string): string {
  const sections = markdown.split('\n\n').filter(s => s.trim());
  let html = '';
  let tableCount = 0;

  sections.forEach((section) => {
    if (section.includes('|') && section.includes('---')) { // Detekter markdown-tabell
      tableCount++;
      const rows = section.split('\n').filter((r) => r.trim() && !r.match(/^\|[-:\s|]+\|?$/)); // Ignorer separator-rad
      if (rows.length > 1) {
        html += `<h3 class="text-lg font-medium mb-2 mt-6">Tabell ${tableCount}: Priser (f.eks. fra/til land)</h3>`;
        html += '<table border="1" style="border-collapse: collapse; width: 100%; margin-bottom: 20px; font-family: Calibri, sans-serif; font-size: 14px;">';
        html += '<thead><tr style="background-color: #f0f0f0; font-weight: bold;">';
        
        // Header-rad (f.eks. "Produkt", "Sone 1", "Sone 2")
        const headerCells = rows[0].split('|').map((c) => c.trim()).filter((c) => c);
        headerCells.forEach((cell) => {
          const clean = cell.replace(/[*_\\]/g, ''); // Fjern markdown-stjerner/understreker
          html += `<th style="padding: 10px; text-align: center; border: 1px solid #ddd;">${clean}</th>`;
        });
        html += '</tr></thead><tbody>';
        
        // Data-rader (priser, ofte tall til høyre)
        for (let i = 1; i < rows.length; i++) {
          html += '<tr>';
          const cells = rows[i].split('|').map((c) => c.trim()).filter((c) => c);
          cells.forEach((cell, idx) => {
            const content = cell.replace(/[*_\\]/g, '').replace(/\n/g, '<br>'); // Rengjør
            const align = idx > 0 ? 'right' : 'left'; // Priser til høyre
            html += `<td style="padding: 8px; text-align: ${align}; border: 1px solid #ddd;">${content}</td>`;
          });
          html += '</tr>';
        }
        html += '</tbody></table>';
      }
    }
  });

  return html || '<p className="text-gray-500">Ingen tabeller funnet. PDF-en kan være enkel tekst – prøv en med prislister (f.eks. PostNord 2025).</p>';
}
