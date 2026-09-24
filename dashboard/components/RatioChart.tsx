"use client";

import { useState, useEffect } from "react";
import { TrendingUp } from "lucide-react";

interface RatioData {
  total: number;
  value_count: number;
  promo_count: number;
  value_pct: number;
}

interface PostEntry {
  created_at: string;
  label: string;
}

export function RatioChart() {
  const [ratioData, setRatioData] = useState<RatioData | null>(null);
  const [history, setHistory] = useState<PostEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRatioData();
  }, []);

  async function fetchRatioData() {
    try {
      const res = await fetch("/api/posts?limit=100");
      const data = await res.json();
      if (data.posts) {
        const total = data.posts.length;
        const valueCount = data.posts.filter((p: PostEntry) => p.label === "VALUE").length;
        const promoCount = total - valueCount;
        const valuePct = total > 0 ? parseFloat(((valueCount / total) * 100).toFixed(1)) : 0;

        setRatioData({ total, value_count: valueCount, promo_count: promoCount, value_pct: valuePct });
        setHistory(data.posts.slice(-20).reverse());
      }
    } catch (err) {
      console.error("Failed to fetch ratio data:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="text-gray-400">Loading ratio data...</div>;
  }

  if (!ratioData || ratioData.total === 0) {
    return (
      <div className="bg-navy-800 rounded-lg p-8 border border-navy-700 text-center">
        <TrendingUp className="w-12 h-12 text-navy-600 mx-auto mb-4" />
        <h3 className="text-lg font-bold mb-2">No posts yet</h3>
        <p className="text-gray-400 text-sm">Generate some posts to see your ratio tracking here.</p>
      </div>
    );
  }

  // Build a simple bar chart from history
  const maxDisplay = Math.min(history.length, 20);
  const chartHistory = history.slice(-maxDisplay);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold flex items-center gap-2">
        <TrendingUp className="w-6 h-6 text-lime-400" />
        Ratio Tracker
      </h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Total Posts", value: ratioData.total, color: "text-white" },
          { label: "Value Posts", value: ratioData.value_count, color: "text-green-400" },
          { label: "Promo Posts", value: ratioData.promo_count, color: "text-lime-400" },
          { label: "Value %", value: `${ratioData.value_pct}%`, color: ratioData.value_pct >= 75 ? "text-green-400" : "text-yellow-400" },
        ].map((stat) => (
          <div key={stat.label} className="bg-navy-800 rounded-lg p-6 border border-navy-700">
            <p className="text-gray-400 text-sm mb-1">{stat.label}</p>
            <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Visual Ratio Bar */}
      <div className="bg-navy-800 rounded-lg p-6 border border-navy-700">
        <h3 className="text-lg font-semibold mb-4">Rolling Ratio</h3>
        <div className="w-full bg-navy-700 rounded-full h-8 overflow-hidden flex">
          <div
            className="bg-green-500 h-8 flex items-center justify-center text-xs font-bold transition-all duration-500"
            style={{ width: `${ratioData.value_pct}%` }}
          >
            {ratioData.value_pct >= 75 ? `${ratioData.value_pct}%` : ""}
          </div>
          <div
            className="bg-lime-400 h-8 flex items-center justify-center text-xs font-bold text-navy-900 transition-all duration-500"
            style={{ width: `${100 - ratioData.value_pct}%` }}
          >
            {100 - ratioData.value_pct <= 25 ? `${100 - ratioData.value_pct}%` : ""}
          </div>
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>Target: 80% value</span>
          <span>Target: 20% promo</span>
        </div>
        {ratioData.value_pct < 75 && (
          <div className="mt-3 text-sm text-yellow-400">⚠️ Value ratio below 75% — consider generating more value posts</div>
        )}
        {ratioData.value_pct > 90 && (
          <div className="mt-3 text-sm text-lime-400">💡 Value ratio above 90% — a promo post might be due</div>
        )}
      </div>

      {/* Post History Timeline */}
      <div className="bg-navy-800 rounded-lg p-6 border border-navy-700">
        <h3 className="text-lg font-semibold mb-4">Recent Posts</h3>
        {chartHistory.length === 0 ? (
          <p className="text-gray-400 text-sm">No posts in history.</p>
        ) : (
          <div className="space-y-2">
            {chartHistory.map((post, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className={`w-3 h-3 rounded-full flex-shrink-0 ${
                  post.label === "VALUE" ? "bg-green-500" : "bg-lime-400"
                }`}></span>
                <span className="text-sm text-gray-300 flex-1">
                  [{post.label}] {new Date(post.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
