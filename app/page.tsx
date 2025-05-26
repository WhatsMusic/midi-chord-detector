'use client';
import { useState } from 'react';

type ApiResponse = { progression: string[] };

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [prog, setProg] = useState<string[]>([]);

  const upload = async () => {
    if (!file) return;
    setLoading(true);
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const json: ApiResponse = await res.json();
    setProg(json.progression || []);
    setLoading(false);
  };

  return (
    <main className="min-h-screen p-8 bg-gray-50 flex flex-col items-center">
      <h1 className="text-3xl font-bold mb-6">MIDI Akkord-Detektor</h1>
      <input
        type="file"
        accept=".mid,.midi,.wav,.mp3,.ogg,.aac,.flac"
        onChange={e => setFile(e.target.files?.[0] || null)}
        className="mb-4"
      />
      <button
        onClick={upload}
        disabled={!file || loading}
        className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
      >
        {loading ? 'Analysiere…' : 'Akkordfolge generieren'}
      </button>
      {prog.length > 0 && (
        <ul className="mt-8 space-y-2">
          {prog.map((line, i) => (
            <li key={i} className="text-lg font-medium">
              {line}
            </li>
          ))}
        </ul>
      )}

    </main>
  );
}
