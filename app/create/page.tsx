"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateContest() {
  const router = useRouter();

  const [problems, setProblems] = useState<{ id: string; points: number | string }[]>([
    { id: "4A", points: 10 },
    { id: "71A", points: 20 },
    { id: "158A", points: 30 },
  ]);
  const [duration, setDuration] = useState<number | string>(20);
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    setLoading(true);
    try {
      // Parse problems
      const parsedProblems = problems.map((p) => {
        const match = p.id.trim().match(/^(\d+)([A-Za-z]\d*)$/);
        if (!match) throw new Error(`Invalid problem format: ${p.id}. Use format like '2207G'.`);
        
        const pts = typeof p.points === "string" ? parseInt(p.points) : p.points;
        if (!pts || pts < 1 || pts > 100) throw new Error(`Points must be between 1 and 100.`);

        return {
          contestId: parseInt(match[1]),
          index: match[2].toUpperCase(),
          points: pts,
        };
      });

      const parsedDuration = typeof duration === "string" ? parseInt(duration) : duration;
      if (!parsedDuration || parsedDuration < 1 || parsedDuration > 120) {
        throw new Error("Duration must be between 1 and 120 minutes.");
      }

      const res = await fetch("/api/room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problems: parsedProblems,
          durationMinutes: parsedDuration,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create room");
      }

      const { roomId } = await res.json();
      router.push(`/room/${roomId}`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  function addProblem() {
    setProblems([...problems, { id: "", points: 10 }]);
  }

  function removeProblem(index: number) {
    setProblems(problems.filter((_, i) => i !== index));
  }

  function updateProblem(index: number, field: "id" | "points", value: string | number) {
    const newProblems = [...problems];
    newProblems[index] = { ...newProblems[index], [field]: value } as any;
    setProblems(newProblems);
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white p-6 md:p-12 relative">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-64 bg-indigo-600/10 blur-[100px] pointer-events-none" />

      <div className="max-w-3xl mx-auto relative z-10">
        <button onClick={() => router.push("/")} className="text-neutral-400 hover:text-white mb-8 flex items-center gap-2 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Back
        </button>

        <h1 className="text-4xl md:text-5xl font-extrabold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-white to-neutral-500">
          Create Blitz Duel
        </h1>
        <p className="text-neutral-400 mb-10 text-lg">Configure your custom Codeforces contest.</p>

        <div className="space-y-8 bg-white/5 border border-white/10 p-6 md:p-8 rounded-3xl backdrop-blur-xl shadow-2xl">
          
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-sm">1</span>
                Problems
              </h2>
              <button onClick={addProblem} className="text-sm font-semibold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 px-3 py-1.5 rounded-full transition-colors">
                + Add Problem
              </button>
            </div>

            <div className="space-y-3">
              {problems.map((p, i) => (
                <div key={i} className="flex gap-3 items-center group">
                  <div className="w-8 text-center text-neutral-500 font-mono text-sm">{i + 1}</div>
                  <input
                    type="text"
                    placeholder="e.g. 2207G"
                    value={p.id}
                    onChange={(e) => updateProblem(i, "id", e.target.value)}
                    className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:border-indigo-500 transition-colors font-mono uppercase"
                  />
                  <input
                    type="number"
                    placeholder="Points (1-100)"
                    value={p.points}
                    onChange={(e) => updateProblem(i, "points", e.target.value === "" ? "" : parseInt(e.target.value))}
                    min={1}
                    max={100}
                    title="Enter points between 1 and 100"
                    className="w-32 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                  <button 
                    onClick={() => removeProblem(i)}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 opacity-50 group-hover:opacity-100 transition-all disabled:opacity-20"
                    disabled={problems.length <= 1}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="h-px w-full bg-white/10" />

          <div>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-sm">2</span>
              Settings
            </h2>
            <div className="flex items-center gap-4">
              <div className="flex flex-col">
                <label className="text-neutral-400 font-medium">Duration (minutes)</label>
                <span className="text-xs text-neutral-600">Enter a value between 1-120</span>
              </div>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value === "" ? "" : parseInt(e.target.value))}
                min={1}
                max={120}
                placeholder="1-120"
                className="w-28 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>
          </div>

          <button
            onClick={handleCreate}
            disabled={loading}
            className="w-full mt-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-lg py-4 rounded-xl shadow-[0_0_30px_-5px_rgba(79,70,229,0.5)] hover:shadow-[0_0_40px_0px_rgba(79,70,229,0.7)] hover:scale-[1.02] transition-all disabled:opacity-70 disabled:hover:scale-100 flex items-center justify-center gap-2"
          >
            {loading ? "Generating Room..." : "Generate Duel Link"}
            {!loading && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>}
          </button>
        </div>
      </div>
    </main>
  );
}