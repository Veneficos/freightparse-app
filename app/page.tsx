'use client';

import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Copy, Download, Loader2 } from 'lucide-react';
import { LlamaParse } from 'llama-parse';

export default function Home() {
  const [tables, setTables] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const apiKey = process.env.NEXT_PUBLIC_LLAMA_CLOUD_API_KEY;

  const onDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file || !apiKey) {
      setError('Fil eller API-nøkkel mangler. Sjekk Vercel Environment Variables.');
      return;
    }

    setLoading(true);
    setError('');
    setTables('');

    try {
      const parser = new LlamaParse(apiKey, {
        result_type: 'markdown',
        language: 'no', // Norsk støtte
        verbose: true, // For debugging
      });

      const documents = await parser.load_data(file);
      const markdown = documents[0]?.text || '';

      const htmlTables = parseMarkdownToHtmlTables(markdown);
      setTables(htmlTables);
    } catch (err) {
      setError('Feil ved parsing: ' + (err as Error).message + '. Sjekk API-nøkkel eller PDF-størrelse.');
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

// Hjelpefunksjon: Konverterer markdown-tabeller til kopierbar HTML (bedre for priser/soner)
function parseMarkdownToHtmlTables(markdown: string): string {
  const sections = markdown.split('\n\n').filter(s => s.trim());
  let html = '';
  let tableCount = 0;

  sections.forEach((section) => {
    if (section.includes('|') && section.includes('---')) {
      tableCount++;
      const rows = section.split('\n').filter(r => r.trim() && !r.match(/^\|[-:\s|]+\|?$/));
      if (rows.length > 1) {
        html += `<h3 class="text-lg font-medium mb-2 mt-6">Tabell ${tableCount}: Priser (f.eks. fra/til land)</h3>`;
        html += '<table border="1" style="border-collapse: collapse; width: 100%; margin-bottom: 20px; font-family: Calibri, sans-serif; font-size: 14px;">';
        html += '<thead><tr style="background-color: #f0f0f0; font-weight: bold;">';
        const headerCells = rows[0].split('|').map(c => c.trim()).filter(c => c);
        headerCells.forEach(cell => {
          const clean = cell.replace(/[*_\\]/g, '');
          html += `<th style="padding: 10px; text-align: center; border: 1px solid #ddd;">${clean}</th>`;
        });
        html += '</tr></thead><tbody>';
        for (let i = 1; i < rows.length; i++) {
          html += '<tr>';
          const cells = rows[i].split('|').map(c => c.trim()).filter(c => c);
          cells.forEach((cell, idx) => {
            const content = cell.replace(/[*_\\]/g, '').replace(/\n/g, '<br>');
            const align = idx > 0 ? 'right' : 'left';
            html += `<td style="padding: 8px; text-align: ${align}; border: 1px solid #ddd;">${content}</td>`;
          });
          html += '</tr>';
        }
        html += '</tbody></table>';
      }
    }
  });

  return html || '<p class="text-gray-500">Ingen tabeller funnet i PDF-en. Prøv en annen fil med prislister (f.eks. PostNord 2025).</p>';
}
