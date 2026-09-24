"use client";

import { useState } from "react";
import { Save } from "lucide-react";

interface EngagementFormProps {
  postId: string;
  onSaved?: () => void;
}

export function EngagementForm({ postId, onSaved }: EngagementFormProps) {
  const [form, setForm] = useState({
    impressions: "",
    likes: "",
    comments: "",
    reposts: "",
    profile_views_delta: "",
    posted_at: "",
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch("/api/posts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: postId,
          status: "posted",
          impressions: parseInt(form.impressions) || 0,
          likes: parseInt(form.likes) || 0,
          comments: parseInt(form.comments) || 0,
          reposts: parseInt(form.reposts) || 0,
          profile_views_delta: parseInt(form.profile_views_delta) || 0,
          posted_at: form.posted_at ? new Date(form.posted_at).toISOString() : new Date().toISOString(),
        }),
      });

      if (res.ok) {
        onSaved?.();
      }
    } catch (err) {
      console.error("Failed to save engagement:", err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-navy-800 rounded-lg p-6 border border-navy-700 space-y-4">
      <h3 className="text-lg font-semibold">Log Engagement</h3>
      <div className="grid grid-cols-2 gap-4">
        {[
          { key: "impressions", label: "Impressions", type: "number" },
          { key: "likes", label: "Likes", type: "number" },
          { key: "comments", label: "Comments", type: "number" },
          { key: "reposts", label: "Reposts", type: "number" },
          { key: "profile_views_delta", label: "Profile View Delta", type: "number" },
        ].map(({ key, label, type }) => (
          <div key={key}>
            <label className="block text-sm text-gray-400 mb-1">{label}</label>
            <input
              type={type}
              value={form[key as keyof typeof form] as string}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              className="w-full bg-navy-700 border border-navy-600 rounded px-3 py-2 text-white focus:outline-none focus:border-lime-400"
            />
          </div>
        ))}
        <div>
          <label className="block text-sm text-gray-400 mb-1">Posted At</label>
          <input
            type="datetime-local"
            value={form.posted_at}
            onChange={(e) => setForm({ ...form, posted_at: e.target.value })}
            className="w-full bg-navy-700 border border-navy-600 rounded px-3 py-2 text-white focus:outline-none focus:border-lime-400"
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={saving}
        className="bg-lime-400 text-navy-900 font-bold py-2 px-4 rounded hover:bg-lime-500 disabled:opacity-50 flex items-center gap-2"
      >
        <Save className="w-4 h-4" />
        {saving ? "Saving..." : "Save Engagement"}
      </button>
    </form>
  );
}
