"use client";

import { useParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { Room, Problem, Player } from "@/lib/store";

export default function RoomPage() {
  const params = useParams();
  // Safe unwrap of param in Next.js 15+ compatible way: Next 16.1.6
  // params is actually a promise in 15+, but in standard client components using useParams() 
  // it unpacks synchronously IF wrapped properly, however we'll just extract it as string.
  const roomId = params?.roomId as string;

  const [room, setRoom] = useState<Room | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Local state
  const [handleInput, setHandleInput] = useState("");
  const [mySlot, setMySlot] = useState<"player1" | "player2" | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  // Ref to prevent double-checking the same problem
  const lastCheckedIndex = useRef(-1);
  const previousProblemIndex = useRef(0);

  // Request Notification Permission on mount
  useEffect(() => {
    try {
      if (typeof window !== "undefined" && "Notification" in window) {
        if (Notification.permission !== "granted" && Notification.permission !== "denied") {
          Notification.requestPermission().catch(() => {});
        }
      }
    } catch (e) {
      console.log("Notifications not supported or blocked");
    }
  }, []);

  // Poll room state
  useEffect(() => {
    if (!roomId) return;
    
    // Check if we already joined
    const savedSlot = localStorage.getItem(`duel-slot-${roomId}`);
    if (savedSlot === "player1" || savedSlot === "player2") setMySlot(savedSlot);

    async function fetchRoom() {
      try {
        const res = await fetch(`/api/room/${roomId}`);
        if (!res.ok) {
          setError("Room not found");
          return;
        }
        const data = await res.json();
        setRoom(data.room);
      } catch (err) {
        console.error(err);
      }
    }

    fetchRoom();
    const interval = setInterval(fetchRoom, 2000); // poll every 2 seconds
    return () => clearInterval(interval);
  }, [roomId]);

  // Alert when problem changes (someone solved it)
  useEffect(() => {
    if (!room || room.status !== "running") return;
    
    if (room.currentProblemIndex > previousProblemIndex.current) {
      // The problem index advanced!
      const justSolvedProblem = room.problems[previousProblemIndex.current];
      const nameOfProblem = `${justSolvedProblem.contestId}${justSolvedProblem.index}`;
      
      // Determine who solved it by looking at who had the last score increase
      // (This is a simplified assumption that the opponent solved it if we are on a different tab, 
      // but if we solved it ourselves we probably still want the nice sound/alert)
      
      // Play a success sound
      try {
        const audio = new Audio("https://cdn.freesound.org/previews/320/320655_527080-lq.mp3");
        audio.volume = 0.5;
        audio.play().catch(e => console.log("Audio play blocked by browser:", e));
      } catch (e) {}

      // Trigger Browser Notification (Fallback)
      try {
        if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
          new Notification("Next Problem Unlocked!", {
            body: `Problem ${nameOfProblem} was solved! Time to race on the next one!`,
            icon: "/favicon.ico", 
          });
        }
      } catch (e) {
        console.log("Notification trigger failed", e);
      }
      
      // Trigger In-App Popup
      setAlertMessage(`🔥 Problem ${nameOfProblem} was solved! Next problem unlocked.`);
      setTimeout(() => setAlertMessage(null), 6000);

      previousProblemIndex.current = room.currentProblemIndex;
    }
  }, [room?.currentProblemIndex, room?.status, room?.problems]);

  // Check solve logic
  useEffect(() => {
    if (!room || room.status !== "running" || !mySlot) return;
    
    const currentProblem = room.problems[room.currentProblemIndex];
    if (!currentProblem) return;

    // We only check if we haven't already marked this problem index as checked
    if (lastCheckedIndex.current === room.currentProblemIndex) return;

    const myHandle = mySlot === "player1" ? room.player1?.handle : room.player2?.handle;
    if (!myHandle) return;

    const interval = setInterval(async () => {
      // Prevent overlapping checks if state just updated
      if (room.status !== "running" || room.problems[room.currentProblemIndex] !== currentProblem) return;
      if (room.nextProblemUnlockedAt && Date.now() < room.nextProblemUnlockedAt) return;
      
      try {
        // Cache buster
        const timestamp = new Date().getTime();
        const res = await fetch(`/api/cf?handle=${myHandle}&count=10&_t=${timestamp}`, { cache: "no-store" });
        const data = await res.json();
        
        if (data.status === "OK") {
          // Compare strings to avoid 123 === "123" failing
          const solved = data.result.find((s: any) => {
            if (s.verdict !== "OK") return false;
            
            const isTargetProblem = String(s.problem.contestId) === String(currentProblem.contestId) && 
                                    String(s.problem.index) === String(currentProblem.index);
            
            if (!isTargetProblem) return false;

            // Ensure the submission happened after the room started running.
            // Give a 5 minute grace period backwards in case of slight clock sync issues between CF and our server
            if (room.startTime) {
               const roomStartSeconds = Math.floor(room.startTime / 1000) - 300;
               return s.creationTimeSeconds >= roomStartSeconds;
            }
            return false;
          });

          if (solved) {
            // WE SOLVED IT!
            lastCheckedIndex.current = room.currentProblemIndex;
            
            const myScore = mySlot === "player1" ? (room.player1?.score || 0) : (room.player2?.score || 0);
            
            // Advance room state
            const isLast = room.currentProblemIndex >= room.problems.length - 1;
            
            const updatedProblems = [...room.problems];
            updatedProblems[room.currentProblemIndex] = {
              ...currentProblem,
              solvedBy: mySlot as "player1" | "player2"
            };

            const updates: Partial<Room> = {
              currentProblemIndex: room.currentProblemIndex + 1,
              problems: updatedProblems,
              [mySlot]: { handle: myHandle, score: myScore + currentProblem.points }
            };

            if (isLast) {
              updates.status = "finished";
            } else {
              updates.nextProblemUnlockedAt = Date.now() + 60000;
            }

            await fetch(`/api/room/${roomId}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(updates),
            });
            
            // Instantly update local UI
            setRoom((prev) => prev ? { ...prev, ...updates } as Room : null);

          }
        }
      } catch (err) {
        console.error("API error", err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [room?.status, room?.currentProblemIndex, mySlot, room?.problems, roomId]);


  // Auto-start room if both joined
  useEffect(() => {
    if (room && room.status === "waiting" && room.player1 && room.player2) {
      if (mySlot === "player1") {
        fetch(`/api/room/${roomId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "running", startTime: Date.now() }),
        });
      }
    }
  }, [room?.status, room?.player1, room?.player2, mySlot, roomId]);


  async function handleJoin() {
    if (!room || !handleInput) return;

    let slot: "player1" | "player2" | null = null;
    if (!room.player1) slot = "player1";
    else if (!room.player2) slot = "player2";

    if (!slot) {
      alert("Room is full!");
      return;
    }

    const updates = {
      [slot]: { handle: handleInput, score: 0 }
    };

    await fetch(`/api/room/${roomId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });

    localStorage.setItem(`duel-slot-${roomId}`, slot);
    setMySlot(slot);
  }

  function getTimer() {
    if (!room || !room.startTime) return room?.durationMinutes ? room.durationMinutes * 60 : 0;
    const elapsed = Math.floor((Date.now() - room.startTime) / 1000);
    const remaining = (room.durationMinutes * 60) - elapsed;
    return Math.max(0, remaining);
  }

  const formatSecs = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // UI Renderers
  if (error) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-4">
        <h1 className="text-3xl font-bold text-red-500">{error}</h1>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Before joining
  if (!mySlot && room.status === "waiting") {
    const p1Empty = !room.player1;
    const p2Empty = !room.player2;
    if (!p1Empty && !p2Empty) {
       return <SpectatorView room={room} />
    }

    return (
      <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-4">
        <div className="bg-white/5 border border-white/10 p-8 rounded-3xl max-w-md w-full backdrop-blur-xl shadow-2xl text-center">
          <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
          </div>
          <h1 className="text-3xl font-extrabold mb-2">Join Duel</h1>
          <p className="text-neutral-400 mb-8">Enter your Codeforces handle to enter the arena.</p>

          <input
            type="text"
            placeholder="Codeforces Handle"
            value={handleInput}
            onChange={(e) => setHandleInput(e.target.value)}
            className="w-full bg-black/50 border border-white/10 rounded-xl px-5 py-4 text-white placeholder-neutral-500 mb-6 focus:outline-none focus:border-blue-500 transition-colors text-center font-bold text-lg"
          />

          <button onClick={handleJoin} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-[0_0_20px_-5px_rgba(37,99,235,0.5)] transition-all">
            Enter Arena
          </button>
        </div>
      </div>
    );
  }

  // Waiting for opponent
  if (room.status === "waiting") {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-4">
        <div className="text-center">
          <div className="relative w-24 h-24 mx-auto mb-8">
            <div className="absolute inset-0 rounded-full border-t-2 border-indigo-500 animate-spin" />
            <div className="absolute inset-2 rounded-full border-r-2 border-purple-500 animate-spin-reverse" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl">⏳</span>
            </div>
          </div>
          <h2 className="text-3xl font-extrabold mb-4">Waiting for Opponent...</h2>
          <p className="text-neutral-400 mb-8 max-w-md mx-auto">Share the link with your opponent. The match will automatically begin when both players have joined.</p>
          <div className="bg-black border border-white/10 rounded-xl px-4 py-3 font-mono text-sm text-neutral-300 select-all">
            {typeof window !== "undefined" ? window.location.href : roomId}
          </div>
        </div>
      </div>
    );
  }

  const currentProblem = room.problems[room.currentProblemIndex];

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans flex flex-col relative overflow-hidden">
      {/* Dynamic Backgrounds depending on status */}
      <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 z-50`} />
      
      {room.status === "finished" && (
        <div className="absolute inset-0 bg-neutral-950/80 backdrop-blur-2xl z-40 flex items-center justify-center p-4 overflow-y-auto pt-20 pb-20">
          <div className="text-center bg-white/5 border border-white/10 p-8 md:p-12 rounded-3xl shadow-2xl max-w-2xl w-full transform animate-in fade-in zoom-in duration-500">
            <h2 className="text-5xl font-black mb-2 bg-clip-text text-transparent bg-gradient-to-r from-amber-200 to-yellow-500 drop-shadow-[0_0_30px_rgba(234,179,8,0.3)]">Match Over!</h2>
            <p className="text-xl text-neutral-300 mb-8">The duel has concluded.</p>

            <div className="flex justify-between items-end mb-8">
              <div className="text-center flex-1">
                <p className="text-sm uppercase tracking-widest text-neutral-500 font-bold mb-2">{room.player1?.handle}</p>
                <p className="text-4xl font-extrabold text-white">{room.player1?.score}</p>
                <p className="text-sm text-blue-400 mt-2 font-bold">{room.problems.filter(p => p.solvedBy === "player1").length} Solved</p>
              </div>
              <div className="px-4 text-2xl font-black text-white/20 mb-2">VS</div>
              <div className="text-center flex-1">
                <p className="text-sm uppercase tracking-widest text-neutral-500 font-bold mb-2">{room.player2?.handle}</p>
                <p className="text-4xl font-extrabold text-white">{room.player2?.score}</p>
                <p className="text-sm text-pink-400 mt-2 font-bold">{room.problems.filter(p => p.solvedBy === "player2").length} Solved</p>
              </div>
            </div>

            <div className="py-6 border-t border-b border-white/10 mb-8 max-h-[40vh] overflow-y-auto text-left">
              <h3 className="text-lg font-bold text-white mb-4">Problem Breakdown</h3>
              <div className="space-y-3">
                {room.problems.map((p, i) => (
                  <div key={i} className="flex items-center justify-between bg-black/40 p-4 rounded-xl border border-white/5 hover:bg-white/5 transition-colors group/row">
                    <div className="flex items-center gap-3">
                      <span className="text-neutral-500 font-mono font-bold w-6">{i + 1}.</span>
                      <a href={`https://codeforces.com/contest/${p.contestId}/problem/${p.index}`} target="_blank" rel="noreferrer" className="text-lg font-bold hover:text-indigo-400 transition-colors">
                        {p.contestId}{p.index}
                      </a>
                      <span className="text-xs font-bold text-neutral-400 bg-white/10 px-2 py-1 rounded-md">{p.points} pts</span>
                    </div>
                    <div className="text-sm font-bold">
                       {p.solvedBy === "player1" ? (
                         <span className="text-blue-400 bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-500/20">{room.player1?.handle}</span>
                       ) : p.solvedBy === "player2" ? (
                         <span className="text-pink-400 bg-pink-500/10 px-3 py-1.5 rounded-lg border border-pink-500/20">{room.player2?.handle}</span>
                       ) : (
                         <span className="text-neutral-500 italic">Unsolved</span>
                       )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="py-2">
              <p className="text-sm text-neutral-400 uppercase tracking-widest font-bold">Winner</p>
              <p className="text-4xl font-extrabold text-yellow-400 mt-2 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]">{room.winner || "Draw"}</p>
            </div>
          </div>
        </div>
      )}

      {/* Header / Scoreboard */}
      <header className="p-6 md:p-8 flex flex-col md:flex-row justify-between items-center gap-6 z-10">
        <div className="flex bg-white/5 border border-white/10 rounded-2xl p-4 shrink-0 shadow-lg min-w-[200px]">
          <div className="flex flex-col">
            <p className="text-xs uppercase tracking-widest font-bold text-blue-400 mb-1">Player 1</p>
            <p className="text-lg font-bold truncate max-w-[150px]">{room.player1?.handle}</p>
            <p className="text-3xl font-extrabold mt-1">{room.player1?.score}</p>
          </div>
        </div>

        <div className="flex flex-col items-center">
          <p className="text-xs uppercase tracking-widest font-bold text-neutral-500 mb-2">Time Remaining</p>
          <div className="text-5xl md:text-6xl font-black font-mono tracking-tighter text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]">
             <Timer room={room} />
          </div>
        </div>

        <div className="flex bg-white/5 border border-white/10 rounded-2xl p-4 shrink-0 shadow-lg min-w-[200px] text-right justify-end">
          <div className="flex flex-col items-end">
            <p className="text-xs uppercase tracking-widest font-bold text-pink-400 mb-1">Player 2</p>
            <p className="text-lg font-bold truncate max-w-[150px]">{room.player2?.handle}</p>
            <p className="text-3xl font-extrabold mt-1">{room.player2?.score}</p>
          </div>
        </div>
      </header>

      {/* Toast Alert */}
      {alertMessage && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-10 fade-in duration-300">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-2xl shadow-[0_10px_40px_-10px_rgba(79,70,229,0.8)] border border-white/20 flex items-center gap-3">
            <span className="text-2xl">⚡</span>
            <p className="font-bold text-lg">{alertMessage}</p>
          </div>
        </div>
      )}

      {/* Main Arena */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 z-10 w-full max-w-5xl mx-auto">
        
        {/* Progress Bar Area */}
        <div className="w-full mb-10">
          <div className="flex justify-between text-xs font-bold text-neutral-500 uppercase tracking-widest mb-3 px-2">
            <span>Problem Timeline</span>
            <span>{Math.min(room.currentProblemIndex + 1, room.problems.length)} / {room.problems.length}</span>
          </div>
          <div className="flex gap-2">
            {room.problems.map((p, idx) => {
              const isActive = idx === room.currentProblemIndex;
              const isPast = idx < room.currentProblemIndex;
              
              let classes = "h-3 flex-1 rounded-full transition-all duration-500 ";
              if (isActive) classes += "bg-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.6)]";
              else if (isPast) classes += "bg-green-500/50";
              else classes += "bg-white/10";

              return <div key={idx} className={classes} />;
            })}
          </div>
        </div>

        {/* Current Problem Card */}
        {currentProblem ? (
          <ProblemDisplay currentProblem={currentProblem} room={room} />
        ) : (
          <div className="text-2xl font-bold text-neutral-500">Wait... checking problems</div>
        )}

      </main>

      <div className="text-center pb-6 text-sm text-neutral-600 z-10">
        Live validation checking is active. Submissions are registered automatically.
      </div>
    </div>
  );
}

function SpectatorView({ room }: { room: Room }) {
  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center">
       {/* To keep it simple, they see a message for now instead of the full UI, or maybe the full UI is better? 
          For brevity, basic message */}
       <h1 className="text-3xl font-bold">Spectator Mode</h1>
       <p className="text-neutral-400">Match is currently in progress. Refresh to join later if allowed.</p>
    </div>
  );
}

// Separate component to isolate timer rendering / tick logic
function Timer({ room }: { room: Room }) {
  const [timeLeft, setTimeLeft] = useState(getTimerInit());

  function getTimerInit() {
    if (!room.startTime) return room.durationMinutes * 60;
    const elapsed = Math.floor((Date.now() - room.startTime) / 1000);
    return Math.max(0, (room.durationMinutes * 60) - elapsed);
  }

  useEffect(() => {
    if (room.status !== "running") return;
    const interval = setInterval(() => {
      setTimeLeft(getTimerInit());
    }, 1000);
    return () => clearInterval(interval);
  }, [room.status, room.startTime, room.durationMinutes]);

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  return <>{mins}:{secs.toString().padStart(2, "0")}</>;
}

function ProblemDisplay({ currentProblem, room }: { currentProblem: Problem, room: Room }) {
  const [timeLeft, setTimeLeft] = useState(() => {
    if (!room.nextProblemUnlockedAt) return 0;
    return Math.max(0, Math.ceil((room.nextProblemUnlockedAt - Date.now()) / 1000));
  });

  useEffect(() => {
    if (!room.nextProblemUnlockedAt) {
      setTimeLeft(0);
      return;
    }
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((room.nextProblemUnlockedAt! - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining === 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [room.nextProblemUnlockedAt]);

  if (timeLeft > 0) {
    return (
      <div className="w-full bg-gradient-to-b from-teal-900/40 to-blue-900/40 border border-white/20 p-8 md:p-14 rounded-[3rem] shadow-2xl backdrop-blur-xl relative overflow-hidden flex flex-col items-center text-center">
         <div className="px-5 py-2 rounded-full bg-white/10 border border-white/10 text-sm font-bold tracking-widest text-teal-300 uppercase mb-8">
           Rest Period
         </div>
         <h2 className="text-4xl md:text-5xl font-black mb-4 tracking-tighter text-white">
           Take a Breath!
         </h2>
         <p className="text-neutral-300 text-xl md:text-2xl mb-8">
           Next problem unlocks in...
         </p>
         <div className="text-8xl md:text-9xl font-mono font-black text-teal-400 drop-shadow-[0_0_30px_rgba(45,212,191,0.5)]">
           {timeLeft}s
         </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-gradient-to-b from-white/10 to-white/5 border border-white/20 p-8 md:p-14 rounded-[3rem] shadow-2xl backdrop-blur-xl relative overflow-hidden group">
      <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
      
      <div className="relative z-10 flex flex-col items-center text-center">
        <div className="px-5 py-2 rounded-full bg-white/10 border border-white/10 text-sm font-bold tracking-widest text-indigo-300 uppercase mb-8 flex items-center gap-2">
          <span>Active</span>
          <span className="w-1.5 h-1.5 rounded-full bg-white/30 mx-1" />
          <span>Problem {Math.min(room.currentProblemIndex + 1, room.problems.length)} / {room.problems.length}</span>
        </div>
        
        <h2 className="text-7xl md:text-9xl font-black mb-6 tracking-tighter saturate-150">
          {currentProblem.contestId}<span className="text-indigo-400">{currentProblem.index}</span>
        </h2>

        <p className="text-2xl text-neutral-300 font-medium mb-12 flex items-center gap-2">
          Worth <span className="font-bold text-white px-3 py-1 bg-white/10 rounded-lg">{currentProblem.points} pts</span>
        </p>

        <a 
          href={`https://codeforces.com/contest/${currentProblem.contestId}/problem/${currentProblem.index}`} 
          target="_blank" 
          rel="noreferrer"
          className="group/btn relative px-8 py-4 bg-white text-black font-bold text-xl rounded-2xl hover:scale-105 transition-all duration-300 flex items-center gap-3 shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)]"
        >
          Open in Codeforces
          <svg className="w-6 h-6 group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
        </a>
      </div>
    </div>
  );
}