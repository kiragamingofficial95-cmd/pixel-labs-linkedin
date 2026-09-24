"use client";

import { useState } from "react";
import { GeneratorForm } from "../components/GeneratorForm";
import { PostList } from "../components/PostList";
import { RatioChart } from "../components/RatioChart";
import { EngagementForm } from "../components/EngagementForm";
import { FilterTabs } from "../components/FilterTabs";
import { Sparkles, FileText, TrendingUp, Clock } from "lucide-react";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"generate" | "feed" | "ratio" | "performance">("generate");

  const tabs = [
    { id: "generate" as const, label: "Generator", icon: Sparkles },
    { id: "feed" as const, label: "Feed", icon: FileText },
    { id: "ratio" as const, label: "Ratio", icon: TrendingUp },
    { id: "performance" as const, label: "Performance", icon: Clock },
  ];

  return (
    <div className="min-h-screen bg-navy-900 text-white">
      <header className="border-b border-navy-700 bg-navy-800/50 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-lime-400 rounded-lg flex items-center justify-center text-navy-900 font-bold text-sm">
              PL
            </div>
            <div>
              <h1 className="text-lg font-bold">Pixel Labs</h1>
              <p className="text-xs text-gray-400">LinkedIn Auto-Poster + Analytics</p>
            </div>
          </div>
          <div className="text-xs text-gray-500">Varad Agarwal — Founder</div>
        </div>
      </header>

      <nav className="border-b border-navy-700 bg-navy-800/30">
        <div className="max-w-6xl mx-auto px-4 flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-lime-400 text-lime-400"
                  : "border-transparent text-gray-400 hover:text-gray-200"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {activeTab === "generate" && <GeneratorForm />}
        {activeTab === "feed" && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Feed</h2>
              <FilterTabs filter="all" onFilterChange={() => {}} />
            </div>
            <PostList />
          </>
        )}
        {activeTab === "ratio" && <RatioChart />}
        {activeTab === "performance" && <PerformanceView />}
      </main>
    </div>
  );
}

function PerformanceView() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Performance Metrics</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[
          { label: "Avg. Impressions", value: "—", change: "Pending data" },
          { label: "Avg. Engagement Rate", value: "—", change: "Pending data" },
          { label: "Value vs Promo Reach", value: "—", change: "Pending data" },
        ].map((stat) => (
          <div key={stat.label} className="bg-navy-800 rounded-lg p-6 border border-navy-700">
            <p className="text-gray-400 text-sm mb-1">{stat.label}</p>
            <p className="text-3xl font-bold text-lime-400">{stat.value}</p>
            <p className="text-sm text-gray-500 mt-1">{stat.change}</p>
          </div>
        ))}
      </div>
      <div className="bg-navy-800 rounded-lg p-6 border border-navy-700">
        <h3 className="text-lg font-semibold mb-4">Engagement per Post</h3>
        <p className="text-gray-400 text-sm">Engagement data will appear here once posts are published and metrics are logged.</p>
        <EngagementForm postId="placeholder" />
      </div>
    </div>
  );
}
