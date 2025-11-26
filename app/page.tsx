'use client';

import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Copy, Download, Loader2 } from 'lucide-react';

export default function Home() {
  const [tables, setTables] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const apiKey = process.env.NEXT_PUBLIC_LLAMA_CLOUD_API_KEY;

  const onDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file || !apiKey) {
      setError('Manglende fil eller API-nøkkel');
      return;
    }

    setLoading(true);
    setError('');
    setTables('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('result_type', 'markdown');
    formData.append('language', 'no');

    try {
      const res = await fetch('https://api.cloud.llamaindex.ai/v1/parse/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`HTTP ${res.status}: ${err}`);
      }

      const data = await res.json();
      const markdown = data.markdown || data.text || '';

      const htmlTables = markdownToHtmlTables(markdown);
      setTables(htmlTables);
    Contrived catch (err) {
      setError('Parsing feilet: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false,
  });

  const copyToClipboard = () => {
    const fullHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><body>${tables}</body></html>`;
    navigator.clipboard.writeText(fullHtml);
    alert('Kopiert som ekte Excel-tabell! Lim inn i din nettside → virker 100 %');
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col items-center justify-center p-8">
      <h1 className="text-5xl font-bold mb-4">FraktParse</h1>
      <p className="text-xl text-gray-600 mb-10">Dra inn PDF fra PostNord, Bring, DHL → få priser som ekte Excel-tabell</p>

      <div {...getRootProps()} className="border-4 border-dashed border-blue-400 rounded-3xl p-16 text-center cursor-pointer bg-white shadow-2xl hover:shadow-blue-200 transition-all max-w-2xl w-full">
        <input {...getInputProps()} />
        {isDragActive ? <Loader2 className="w-20 h-20 mx-auto animate-spin text-blue-600" /> : <Upload className="w-20 h-20 mx-auto text-blue-600 mb-6" />}
        <p className="text-2xl font-medium">{isDragActive ? 'Slipp PDF-en...' : 'Dra PDF hit eller klikk for å laste opp'}</p>
        <p className="text-gray-500 mt-3">PostNord • Bring • DHL • Schenker • Tollpost</p>
      </div>

      {loading && <p className="mt-8 text-xl"><Loader2 className="inline animate-spin" /> Parser PDF med AI...</p>}
      {error && <p className="mt-8 text-red-600 bg-red-50 px-8 py-4 rounded-lg text-lg">{error}</p>}

      {tables && (
        <div className="mt-12 max-w-5xl w-full">
          <h2 className="text-3xl font-bold mb-6">Funnet priser – klar for Excel:</h2>
          <div className="bg-white rounded-xl shadow-xl p-8 overflow-x-auto border" dangerouslySetInnerHTML={{ __html: tables }} />
          <div className="flex gap-6 justify-center mt-8">
            <button onClick={copyToClipboard} className="bg-green-600 hover:bg-green-700 text-white px-10 py-5 rounded-xl text-xl font-semibold flex items-center gap-3 shadow-lg">
              <Copy size={28} /> Kopier til Excel (virker på din strenge side!)
            </button>
            <a href={`data:text/html,${encodeURIComponent(tables)}`} download="fraktpriser.html" className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-5 rounded-xl text-xl font-semibold flex items-center gap-3 shadow-lg">
              <Download size={28} /> Last ned HTML
            </a>
          </div>
        </div>
      )}
    </main>
  );
}

function markdownToHtmlTables(md: string): string {
  let html = '';
  let tableNum = 0;
  const blocks = md.split('\n\n');

  for (const block of blocks) {
    if (block.includes('|') && block.includes('---')) {
      tableNum++;
      const lines = block.split('\n').filter(l => l.trim() && !l.trim().match(/^[\|\-\:\s]+$/));
      if (lines.length < 2) continue;

      html += `<h3 class="text-2xl font-bold mt-12 mb-4">Tabell ${tableNum}</h3>`;
      html += `<table border="1" style="border-collapse: collapse; width: 100%; font-family: Calibri; font-size: 14px; margin-bottom: 30px;">`;
      html += `<thead><tr style="background:#f0f0f0;">`;

      lines[0].split('|').map(c => c.trim()).filter(Boolean).forEach(cell => {
        html += `<th style="padding: 12px; text-align: center; border: 1px solid #ccc;">${cell.replace(/[_*]/g, '')}</th>`;
      });
      html += `</tr></thead><tbody>`;

      for (let i = 1; i < lines.length; i++) {
        html += `<tr>`;
        lines[i].split('|').map(c => c.trim()).filter(Boolean).forEach((cell, idx) => {
          const align = idx === 0 ? 'left' : 'right';
          html += `<td style="padding: 10px; text-align: ${align}; border: 1px solid #ccc;">${cell.replace(/[_*]/g, '')}</td>`;
        });
        html += `</tr>`;
      }
      html += `</tbody></table>`;
    }
  }
  return html || '<p class="text-gray-500 text-xl">Ingen tabeller funnet i PDF-en.</p>';
}
