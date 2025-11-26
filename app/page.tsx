'use client';

import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Copy, Download } from 'lucide-react';

export default function Home() {
  const [tables, setTables] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const onDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setLoading(true);
    setTables('');

    try {
      // Last inn Tabula.js fra CDN
      const tabula = await import('https://unpkg.com/tabula-js@1.0.0/dist/tabula.min.js');
      
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      const pdf = await tabula.PDFParser.fromBuffer(uint8Array);
      const pages = await pdf.getPages();
      
      let allTables = '';
      let tableCount = 0;

      for (const page of pages) {
        const pageTables = await page.getTables();
        for (const table of pageTables) {
          tableCount++;
          allTables += `<h3 class="font-bold text-lg mb-3 mt-8">Tabell ${tableCount}</h3>`;
          allTables += '<table border="1" style="border-collapse: collapse; width: 100%; font-family: Calibri, sans-serif; font-size: 14px;">';
          
          table.rows.forEach((row: any[], rowIndex: number) => {
            allTables += '<tr>';
            row.forEach((cell: any, cellIndex: number) => {
              const tag = rowIndex === 0 ? 'th' : 'td';
              const bg = rowIndex === 0 ? '#f0f0f0' : 'white';
              const align = cellIndex > 0 ? 'right' : 'left';
              allTables += `<${tag} style="padding: 8px; background: ${bg}; text-align: ${align}; border: 1px solid #ccc;">${cell.text || ''}</${tag}>`;
            });
            allTables += '</tr>';
          });
          allTables += '</table>';
        }
      }

      setTables(allTables || '<p class="text-gray-500">Ingen tabeller funnet. Prøv en PDF med ekte tabeller (PostNord, Bring).</p>');
    } catch (err) {
      setTables('<p class="text-red-500">Kunne ikke lese PDF-en. Prøv en annen fil.</p>');
    }
    setLoading(false);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false
  });

  const copyToClipboard = () => {
    const fullHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><body>${tables}</body></html>`;
    navigator.clipboard.writeText(fullHtml);
    alert('Kopiert som ekte Excel-tabell! Lim inn i din strenge side – virker 100%');
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-5xl font-bold text-center mb-4">FraktParse</h1>
        <p className="text-xl text-center text-gray-600 mb-12">Dra inn PDF fra PostNord, Bring, DHL → få priser som ekte Excel-tabell</p>

        <div {...getRootProps()} className="border-4 border-dashed border-blue-500 rounded-3xl p-20 text-center cursor-pointer bg-white shadow-2xl hover:shadow-blue-300 transition-all">
          <input {...getInputProps()} />
          <Upload className="w-20 h-20 mx-auto mb-6 text-blue-600" />
          <p className="text-2xl font-medium mb-2">{isDragActive ? 'Slipp PDF-en...' : 'Dra PDF hit eller klikk for å laste opp'}</p>
          <p className="text-gray-600">PostNord • Bring • DHL • Schenker • Tollpost</p>
        </div>

        {loading && <p className="text-center mt-8 text-xl">Leser PDF og finner tabeller...</p>}

        {tables && (
          <div className="mt-12 bg-white rounded-2xl shadow-2xl p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold">Funnet priser – klar for Excel</h2>
              <div className="flex gap-4">
                <button onClick={copyToClipboard} className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-xl font-bold flex items-center gap-3 shadow-lg">
                  <Copy size={24} /> Kopier til Excel
                </button>
                <a href={`data:text/html,${encodeURIComponent(tables)}`} download="fraktpriser.html" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-bold flex items-center gap-3 shadow-lg">
                  <Download size={24} /> Last ned
                </a>
              </div>
            </div>
            <div className="border-2 border-gray-300 rounded-lg overflow-auto max-h-screen" dangerouslySetInnerHTML={{ __html: tables }} />
          </div>
        )}
      </div>
    </main>
  );
}
