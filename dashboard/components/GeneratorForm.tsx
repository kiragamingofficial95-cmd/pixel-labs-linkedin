"use client";

import { useState } from "react";
import { Sparkles, Loader2, Copy, ImageIcon } from "lucide-react";

interface ImagePrompt {
  prompt: string;
  insight: string;
  metaphor: string;
}

interface PostResult {
  text: string;
  label: string;
  model: string;
  imageUrl?: string | null;
  imagePrompt?: ImagePrompt | null;
}

export function GeneratorForm() {
  const [topic, setTopic] = useState("");
  const [auto, setAuto] = useState(false);
  const [forceValue, setForceValue] = useState(false);
  const [forcePromo, setForcePromo] = useState(false);
  const [withImage, setWithImage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PostResult | null>(null);
  const [ratioInfo, setRatioInfo] = useState("");

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: auto ? undefined : topic || undefined,
          auto,
          forceValue,
          forcePromo,
          withImage,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setResult({ ...data.post, imagePrompt: data.imagePrompt || null });
        setRatioInfo(`Next label: ${data.ratioState?.label} (${data.ratioState?.reason})`);
      } else {
        alert(`Generation failed: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    if (!result) return;
    navigator.clipboard.writeText(result.text);
  }

  return (
    <div className="space-y-6">
      <div className="bg-navy-800 rounded-lg p-6 border border-navy-700">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-lime-400" />
          Generate Post
        </h2>

        <form onSubmit={handleGenerate} className="space-y-4">
          {/* Topic Input */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Topic / Source Note</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. cold outreach lesson"
              disabled={auto || loading}
              className="w-full bg-navy-700 border border-navy-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-lime-400 disabled:opacity-50"
            />
          </div>

          {/* Auto mode toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={auto}
              onChange={(e) => { setAuto(e.target.checked); setForceValue(false); setForcePromo(false); }}
              className="w-4 h-4 rounded bg-navy-700 border-navy-600 text-lime-400 focus:ring-lime-400"
            />
            <span className="text-sm">Auto mode — pick random value angle from source notes</span>
          </label>

          {/* Force labels */}
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={forceValue}
                onChange={(e) => { setForceValue(e.target.checked); setForcePromo(false); }}
                disabled={auto || loading}
                className="w-4 h-4 rounded bg-navy-700 border-navy-600 text-green-400"
              />
              <span className="text-sm text-green-400">Force VALUE</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={forcePromo}
                onChange={(e) => { setForcePromo(e.target.checked); setForceValue(false); }}
                disabled={auto || loading}
                className="w-4 h-4 rounded bg-navy-700 border-navy-600 text-lime-400"
              />
              <span className="text-sm text-lime-400">Force PROMO</span>
            </label>
          </div>

          {/* With image toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={withImage}
              onChange={(e) => setWithImage(e.target.checked)}
              disabled={loading}
              className="w-4 h-4 rounded bg-navy-700 border-navy-600"
            />
            <span className="text-sm flex items-center gap-1">
              <ImageIcon className="w-3 h-3" />
              Include image prompt (paste into any AI image tool)
            </span>
          </label>

          {/* Generate button */}
          <button
            type="submit"
            disabled={loading || (auto && !topic && !auto)}
            className="w-full bg-lime-400 text-navy-900 font-bold py-3 rounded-lg hover:bg-lime-500 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate Post"
            )}
          </button>
        </form>
      </div>

      {/* Ratio Info */}
      {ratioInfo && (
        <div className="bg-navy-800 rounded-lg p-4 border border-navy-700 text-sm text-gray-400">
          <span className="text-lime-400 font-medium">Ratio tracker:</span> {ratioInfo}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="bg-navy-800 rounded-lg p-6 border border-lime-400/30">
          <div className="flex items-center justify-between mb-4">
            <span className={`text-xs font-bold px-3 py-1 rounded ${
              result.label === "VALUE"
                ? "bg-green-900/50 text-green-300"
                : "bg-lime-400/20 text-lime-400"
            }`}>
              [{result.label}]
            </span>
            <span className="text-xs text-gray-500">{result.model}</span>
          </div>

          <div className="prose prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap text-gray-200">
            {result.text}
          </div>

          {result.imageUrl && (
            <div className="mt-4">
              <img src={result.imageUrl} alt="Post visual" className="rounded-lg border border-navy-600" />
            </div>
          )}

          {result.imagePrompt && (
            <div className="mt-4 bg-navy-900 rounded-lg p-4 border border-navy-600">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-lime-400 uppercase tracking-wide">Image prompt</span>
                <button
                  onClick={() => result.imagePrompt && navigator.clipboard.writeText(result.imagePrompt.prompt)}
                  className="flex items-center gap-1.5 bg-navy-700 hover:bg-navy-600 text-white px-3 py-1.5 rounded text-xs transition-colors"
                >
                  <Copy className="w-3 h-3" />
                  Copy prompt
                </button>
              </div>
              <p className="text-xs text-gray-500 mb-2">Insight: {result.imagePrompt.insight}</p>
              <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">{result.imagePrompt.prompt}</p>
              <p className="text-xs text-gray-500 mt-2">Paste into Midjourney, DALL·E, Ideogram, Gemini, or any image tool.</p>
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 bg-navy-700 hover:bg-navy-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
            >
              <Copy className="w-4 h-4" />
              Copy to Clipboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
