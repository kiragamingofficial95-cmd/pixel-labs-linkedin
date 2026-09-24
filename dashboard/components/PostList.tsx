"use client";

import { useState, useEffect } from "react";
import { PostCard } from "./PostCard";

interface Post {
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
}

export function PostList() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPosts();
  }, [filter]);

  async function fetchPosts() {
    try {
      const params = new URLSearchParams();
      if (filter !== "all") params.set("label", filter);
      const res = await fetch(`/api/posts?limit=50&${params}`);
      const data = await res.json();
      setPosts(data.posts || []);
    } catch (err) {
      console.error("Failed to fetch posts:", err);
    } finally {
      setLoading(false);
    }
  }

  async function markPosted(id: string) {
    try {
      await fetch("/api/posts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "posted", posted_at: new Date().toISOString() }),
      });
      setPosts(posts.map(p => p.id === id ? { ...p, status: "posted", posted_at: new Date().toISOString() } : p));
    } catch (err) {
      console.error("Failed to mark as posted:", err);
    }
  }

  if (loading) {
    return <div className="text-gray-400">Loading posts...</div>;
  }

  if (posts.length === 0) {
    return (
      <div className="bg-navy-800 rounded-lg p-8 border border-navy-700 text-center">
        <p className="text-gray-400">No posts yet. Generate your first post above!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map(post => (
        <PostCard
          key={post.id}
          post={post}
          onPost={markPosted}
        />
      ))}
    </div>
  );
}
