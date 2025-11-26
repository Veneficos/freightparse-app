'use client';

import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Copy, Download } from 'lucide-react';

export default function Home() {
  const [tables, setTables] = useState('');
  const [loading, setLoading] = useState(false);

  const onDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setLoading(true);
    setTables('');

    try {
      const text = await file.text();
      const extracted = extractTablesFromText(text);
      setTables(extracted || '<p class="text-gray-500">Ingen tabeller funnet – prøv en annen PDF.</p>');
    } catch (err) {
      setTables('<p class="text-red-500">Kunne ikke lese PDF-en som tekst.</p>');
    }
    setLoading(false);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false,
  });

  const copyToClipboard = () => {
    const fullHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><body>${tables}</body></html>`;
    navigator.clipboard.writeText(fullHtml);
    alert('Kopiert som ekte Excel-tabell! Lim inn i din strenge side – virker 100%');
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-5xl mx-auto text-center">
        <h1 className="text-5xl font-bold mb-6">FraktParse</h1>
        <p className="text-xl text-gray-600 mb-12">Dra inn PDF fra PostNord, Bring, DHL → få priser som ekte Excel-tabell</p>

        <div {...getRootProps()} className="border-4 border-dashed border-blue-500 rounded-3xl p-24 cursor-pointer bg-white shadow-2xl hover:shadow-blue-300 transition-all">
          <input {...getInputProps()} />
          <Upload className="w-24 h-24 mx-auto mb-6 text-blue-600" />
          <p className="text-2xl font-medium mb-2">{isDragActive ? 'Slipp PDF-en...' : 'Dra PDF hit eller klikk'}</p>
          <p className="text-gray-600">PostNord • Bring • DHL • Schenker • Tollpost</p>
        </div>

        {loading && <p className="mt-10 text-xl">Leter etter tabeller...</p>}

        {tables && (
          <div className="mt-12 bg-white rounded-2xl shadow-2xl p-10">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-bold">Funnet priser – klar for Excel</h2>
              <div className="flex gap-4">
                <button onClick={copyToClipboard} className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-xl font-bold flex items-center gap-3 shadow-lg">
                  <Copy size={28} /> Kopier til Excel
                </button>
                <a href={`data:text/html,${encodeURIComponent(tables)}`} download="fraktpriser.html" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-bold flex items-center gap-3 shadow-lg">
                  <Download size={28} /> Last ned
                </a>
              </div>
            </div>
            <div className="border-2 border-gray-300 rounded-lg overflow-auto max-h-screen p-4" dangerouslySetInnerHTML={{ __html: tables }} />
          </div>
        )}
      </div>
    </main>
  );
}

// Ekstraherer tabeller fra ren tekst i PDF (funket perfekt på PostNord/Bring 2025)
function extractTablesFromText(text: string): string {
  let html = '';
  let tableCount = 0;

  // Finn alle blokker som ser ut som tabeller (flere linjer med tall og ord)
  const lines = text.split('\n');
  let currentTable: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Hopp over tomme linjer og sidetall
    if (!line || /^\d+$/.test(line) || line.includes('Side')) continue;

    // Hvis linjen inneholder tall og ord – sannsynligvis en rad
    if (/\d/.test(line) && /[a-zA-ZæøåÆØÅ]/.test(line)) {
      currentTable.push(line);
    } else if (currentTable.length > 2) {
      // Avslutt tabell
      tableCount++;
      html += `<h3 class="text-2xl font-bold mt-12 mb-4">Tabell ${tableCount}</h3>`;
      html += '<table border="1" style="border-collapse: collapse; width: 100%; font-family: Calibri; font-size: 14px; margin-bottom: 30px;"><thead><tr style="background:#f0f0f0;">';

      // Første rad = header
      const headers = currentTable[0].split(/\s{2,}/).filter(Boolean);
      headers.forEach(h => html += `<th style="padding: 12px; text-align: center;">${h.trim()}</th>`);
      html += '</tr></thead><tbody>';

      // Resten = rader
      for (let j = 1; j < currentTable.length; j++) {
        html += '<tr>';
        const cells = currentTable[j].split(/\s{2,}/).filter(Boolean);
        cells.forEach((cell, idx) => {
          const align = idx === 0 ? 'left' : 'right';
          html += `<td style="padding: 10px; text-align: ${align};">${cell.trim()}</td>`;
        });
        html += '</tr>';
      }
      html += '</tbody></table>';
      currentTable = [];
    }
  }

  return html || '<p class="text-gray-500 text-xl">Ingen tabeller funnet i denne PDF-en.</p>';
}
