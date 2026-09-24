"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";

export default function AuthPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Simple auth: just a password check stored in a cookie-like mechanism
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      // Set a simple session indicator
      document.cookie = "pixel_labs_auth=true; path=/; max-age=86400"; // 24h
      router.push("/dashboard");
      router.refresh();
    } else {
      setError("Incorrect password");
    }
  }

  return (
    <div className="min-h-screen bg-navy-900 flex items-center justify-center">
      <div className="bg-navy-800 rounded-xl p-8 border border-navy-700 w-full max-w-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-lime-400 rounded-lg flex items-center justify-center text-navy-900 font-bold">
            PL
          </div>
          <div>
            <h1 className="text-xl font-bold">Pixel Labs</h1>
            <p className="text-xs text-gray-400">Dashboard Login</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                placeholder="Enter password"
                className="w-full bg-navy-700 border border-navy-600 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-lime-400"
              />
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            className="w-full bg-lime-400 text-navy-900 font-bold py-3 rounded-lg hover:bg-lime-500 transition-colors"
          >
            Sign In
          </button>
        </form>

        <p className="mt-4 text-xs text-gray-500 text-center">
          Single-user password. Check DASHBOARD_PASSWORD env var.
        </p>
      </div>
    </div>
  );
}
