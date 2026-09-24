"use client";

import { useState } from "react";
import { Copy, Share2, Check, ImageIcon, Loader2 } from "lucide-react";

interface PostCardProps {
  post: {
    id: string;
    created_at: string;
    topic: string;
    generated_text: string;
    label: string;
    image_url: string | null;
    image_prompt?: string | null;
    status: string;
    posted_at: string | null;
    impressions: number | null;
    likes: number | null;
    comments: number | null;
    reposts: number | null;
  };
  onCopy?: (text: string) => void;
  onPost?: (id: string) => void;
}

export function PostCard({ post, onCopy, onPost }: PostCardProps) {
  const [copied, setCopied] = useState(false);
  const [promptLoading, setPromptLoading] = useState(false);
  const [fetchedPrompt, setFetchedPrompt] = useState<string | null>(null);

  function handleCopy() {
    navigator.clipboard.writeText(post.generated_text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopy?.(post.generated_text);
  }

  async function handleGetPrompt() {
    setPromptLoading(true);
    try {
      const res = await fetch("/api/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postText: post.generated_text }),
      });
      const data = await res.json();
      if (data.success && data.imagePrompt) {
        setFetchedPrompt(data.imagePrompt.prompt);
      }
    } catch {
      // leave button in place on failure
    } finally {
      setPromptLoading(false);
    }
  }

  const shownPrompt = post.image_prompt || fetchedPrompt;

  const isValue = post.label === "VALUE";

  return (
    <div className="bg-navy-800 rounded-lg p-6 border border-navy-700 hover:border-navy-600 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold px-2 py-1 rounded ${
            isValue
              ? "bg-green-900/50 text-green-300"
              : "bg-lime-400/20 text-lime-400"
          }`}>
            [{post.label}]
          </span>
          <span className="text-xs text-gray-500">
            {new Date(post.created_at).toLocaleDateString()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-1 rounded ${
            post.status === "posted" ? "bg-blue-900/50 text-blue-300" : "bg-gray-800 text-gray-400"
          }`}>
            {post.status}
          </span>
          {post.posted_at && (
            <span className="text-xs text-gray-500">
              Posted: {new Date(post.posted_at).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      <div className="prose prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap text-gray-200 mb-4">
        {post.generated_text}
      </div>

      {post.image_url && (
        <img src={post.image_url} alt="Post image" className="rounded-lg border border-navy-600 mb-4" />
      )}

      {!post.image_url && shownPrompt && (
        <div className="bg-navy-900 rounded-lg p-4 border border-navy-600 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-lime-400 uppercase tracking-wide">Image prompt</span>
            <button
              onClick={() => navigator.clipboard.writeText(shownPrompt || "")}
              className="flex items-center gap-1.5 bg-navy-700 hover:bg-navy-600 text-white px-3 py-1.5 rounded text-xs transition-colors"
            >
              <Copy className="w-3 h-3" />
              Copy prompt
            </button>
          </div>
          <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">{shownPrompt}</p>
        </div>
      )}

      {!post.image_url && !shownPrompt && (
        <button
          onClick={handleGetPrompt}
          disabled={promptLoading}
          className="flex items-center gap-1.5 bg-navy-700 hover:bg-navy-600 disabled:opacity-50 text-white px-3 py-1.5 rounded text-xs transition-colors mb-4"
        >
          {promptLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImageIcon className="w-3 h-3" />}
          {promptLoading ? "Building prompt..." : "Get image prompt"}
        </button>
      )}

      {post.impressions && (
        <div className="flex gap-4 text-xs text-gray-500 mb-4">
          <span>👁 {post.impressions.toLocaleString()} views</span>
          <span>❤️ {post.likes}</span>
          <span>💬 {post.comments}</span>
          <span>🔁 {post.reposts}</span>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 bg-navy-700 hover:bg-navy-600 text-white px-3 py-1.5 rounded text-xs transition-colors"
        >
          {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
          {copied ? "Copied!" : "Copy"}
        </button>
        {post.status === "draft" && onPost && (
          <button
            onClick={() => onPost(post.id)}
            className="flex items-center gap-1.5 bg-lime-400/20 hover:bg-lime-400/30 text-lime-400 px-3 py-1.5 rounded text-xs transition-colors"
          >
            <Share2 className="w-3 h-3" />
            Mark Posted
          </button>
        )}
      </div>
    </div>
  );
}
