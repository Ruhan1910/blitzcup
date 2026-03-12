"use client";

import { useEffect, useState } from "react";

type Submission = {
  id: number;
  verdict?: string;
  creationTimeSeconds: number;
  problem: {
    index: string;
    name: string;
    contestId?: number;
  };
};

type Problem = {
  contestId: number;
  index: string;
  points: number;
};

function formatTime(seconds: number) {
  return new Date(seconds * 1000).toLocaleString();
}

export default function Home() {
  const problems: Problem[] = [
    { contestId: 2207, index: "G", points: 10 },
    { contestId: 2207, index: "F", points: 20 },
    { contestId: 2207, index: "E", points: 40 },
  ];

  const [handle1, setHandle1] = useState("");
  const [handle2, setHandle2] = useState("");
  const [problemIndexNumber, setProblemIndexNumber] = useState(0);
  const [message, setMessage] = useState("Enter two handles and start the duel.");
  const [score1, setScore1] = useState(0);
  const [score2, setScore2] = useState(0);
  const [isChecking, setIsChecking] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120);
  const [winner, setWinner] = useState("");

  const currentProblem = problems[problemIndexNumber];
  const totalProblems = problems.length;
const currentStep = Math.min(problemIndexNumber + 1, totalProblems);
const progressPercent = (problemIndexNumber / totalProblems) * 100;

  useEffect(() => {
    const savedHandle1 = localStorage.getItem("handle1") || "";
    const savedHandle2 = localStorage.getItem("handle2") || "";
    const savedScore1 = Number(localStorage.getItem("score1") || "0");
    const savedScore2 = Number(localStorage.getItem("score2") || "0");

    setHandle1(savedHandle1);
    setHandle2(savedHandle2);
    setScore1(savedScore1);
    setScore2(savedScore2);
  }, []);

  useEffect(() => {
    localStorage.setItem("handle1", handle1);
    localStorage.setItem("handle2", handle2);
  }, [handle1, handle2]);

  useEffect(() => {
    localStorage.setItem("score1", String(score1));
    localStorage.setItem("score2", String(score2));
  }, [score1, score2]);

  useEffect(() => {
    if (!isLive) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsLive(false);
          setMessage("Contest finished: time over");

          if (score1 > score2) {
            setWinner(handle1 || "Player 1");
          } else if (score2 > score1) {
            setWinner(handle2 || "Player 2");
          } else {
            setWinner("Draw");
          }

          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isLive, score1, score2, handle1, handle2]);

  useEffect(() => {
    if (!isLive || !handle1 || !handle2 || winner) return;

    const interval = setInterval(() => {
      compareHandles();
    }, 5000);

    return () => clearInterval(interval);
  }, [isLive, handle1, handle2, problemIndexNumber, winner]);

  async function getSolveTime(handle: string, problem: Problem) {
    const res = await fetch(`/api/cf?handle=${handle}&count=500`);
    const data = await res.json();

    if (data.status !== "OK") {
      return null;
    }

    const acceptedOnly: Submission[] = data.result.filter(
      (submission: Submission) => submission.verdict === "OK"
    );

    const solvedProblem = acceptedOnly.find(
      (submission) =>
        submission.problem.contestId === problem.contestId &&
        submission.problem.index === problem.index
    );

    if (!solvedProblem) return null;

    return solvedProblem.creationTimeSeconds;
  }

  async function compareHandles() {
    if (!handle1 || !handle2 || !currentProblem || isChecking) return;

    setIsChecking(true);
    setMessage("Checking submissions...");

    try {
      const [time1, time2] = await Promise.all([
        getSolveTime(handle1, currentProblem),
        getSolveTime(handle2, currentProblem),
      ]);

      const problemLabel = `${currentProblem.contestId}${currentProblem.index}`;

      if (time1 === null && time2 === null) {
        setMessage(`Neither player solved problem ${problemLabel} yet`);
        setIsChecking(false);
        return;
      }

      if (time1 !== null && time2 === null) {
        setScore1((prev) => prev + currentProblem.points);
        setMessage(`${handle1} solved problem ${problemLabel}, ${handle2} did not`);
        moveToNextProblemOrFinish(handle1);
        setIsChecking(false);
        return;
      }

      if (time1 === null && time2 !== null) {
        setScore2((prev) => prev + currentProblem.points);
        setMessage(`${handle2} solved problem ${problemLabel}, ${handle1} did not`);
        moveToNextProblemOrFinish(handle2);
        setIsChecking(false);
        return;
      }

      if (time1! < time2!) {
        setScore1((prev) => prev + currentProblem.points);
        setMessage(
          `${handle1} solved problem ${problemLabel} first (${formatTime(
            time1!
          )}) vs ${handle2} (${formatTime(time2!)})`
        );
        moveToNextProblemOrFinish(handle1);
      } else if (time2! < time1!) {
        setScore2((prev) => prev + currentProblem.points);
        setMessage(
          `${handle2} solved problem ${problemLabel} first (${formatTime(
            time2!
          )}) vs ${handle1} (${formatTime(time1!)})`
        );
        moveToNextProblemOrFinish(handle2);
      } else {
        setMessage(`Both solved problem ${problemLabel} at the same time (${formatTime(time1!)})`);
        moveToNextProblemOrFinish("");
      }
    } catch (error) {
      setMessage("Error checking submissions");
      console.error(error);
    } finally {
      setIsChecking(false);
    }
  }

  function moveToNextProblemOrFinish(lastWinner: string) {
    if (problemIndexNumber < problems.length - 1) {
      setProblemIndexNumber((prev) => prev + 1);
      return;
    }

    setIsLive(false);
    setMessage("Contest finished: all problems checked");

    const finalScore1 = score1 + (lastWinner === handle1 ? currentProblem.points : 0);
    const finalScore2 = score2 + (lastWinner === handle2 ? currentProblem.points : 0);

    if (finalScore1 > finalScore2) {
      setWinner(handle1 || "Player 1");
    } else if (finalScore2 > finalScore1) {
      setWinner(handle2 || "Player 2");
    } else {
      setWinner("Draw");
    }
  }

  function resetGame() {
  setScore1(0);
  setScore2(0);
  setProblemIndexNumber(0);
  setTimeLeft(120);
  setWinner("");
  setMessage("Game reset. Enter handles and start again.");
  setIsLive(false);

  localStorage.setItem("score1", "0");
  localStorage.setItem("score2", "0");
}

  const problemUrl = currentProblem
    ? `https://codeforces.com/contest/${currentProblem.contestId}/problem/${currentProblem.index}`
    : "#";
  
  return (
  <main className="min-h-screen bg-black text-white px-4 py-8">
    <div className="mx-auto max-w-5xl">
      <div className="mb-8 text-center">
        <h1 className="text-5xl font-extrabold tracking-tight">
          BlitzCup
        </h1>
        <p className="mt-3 text-gray-400 text-lg">
          Real-time Codeforces duel platform
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-800 bg-gray-950 p-6 shadow-lg">
          <p className="text-sm uppercase tracking-wide text-gray-500">Player 1</p>
          <h2 className="mt-2 text-2xl font-bold text-blue-400">
            {handle1 || "Player 1"}
          </h2>
          <p className="mt-4 text-4xl font-extrabold">{score1}</p>
          <p className="mt-1 text-sm text-gray-500">points</p>
        </div>

        <div className="rounded-2xl border border-yellow-700 bg-gradient-to-b from-yellow-500/10 to-transparent p-6 text-center shadow-lg">
          <p className="text-sm uppercase tracking-wide text-yellow-500">Live Duel</p>
          <h2 className="mt-2 text-3xl font-extrabold">VS</h2>
          <p className="mt-4 text-lg text-gray-300">
            Time Left: <span className="font-bold text-white">{timeLeft}s</span>
          </p>
          <p className="mt-2 text-sm text-gray-400">
            Live checking: {isLive ? "ON" : "OFF"}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-800 bg-gray-950 p-6 shadow-lg text-right">
          <p className="text-sm uppercase tracking-wide text-gray-500">Player 2</p>
          <h2 className="mt-2 text-2xl font-bold text-pink-400">
            {handle2 || "Player 2"}
          </h2>
          <p className="mt-4 text-4xl font-extrabold">{score2}</p>
          <p className="mt-1 text-sm text-gray-500">points</p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-gray-800 bg-gray-950 p-6 shadow-lg">
        <h3 className="text-2xl font-bold">Match Control Panel</h3>

        {currentProblem && (
          <div className="mt-4 rounded-xl border border-gray-800 bg-black/40 p-4">
            <p className="text-sm text-gray-400">Current Problem</p>
            <p className="mt-1 text-xl font-semibold">
              {currentProblem.contestId}
              {currentProblem.index}
            </p>
            <p className="mt-1 text-sm text-yellow-400">
              Worth {currentProblem.points} points
            </p>
          </div>
        )}

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <input
            type="text"
            placeholder="First handle"
            value={handle1}
            onChange={(e) => setHandle1(e.target.value)}
            className="rounded-xl border border-gray-700 bg-black px-4 py-3 text-white outline-none focus:border-blue-500"
          />

          <input
            type="text"
            placeholder="Second handle"
            value={handle2}
            onChange={(e) => setHandle2(e.target.value)}
            className="rounded-xl border border-gray-700 bg-black px-4 py-3 text-white outline-none focus:border-pink-500"
          />
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
  onClick={() => {
    if (!handle1 || !handle2) {
      setMessage("Please enter both handles first.");
      return;
    }

    setScore1(0);
    setScore2(0);
    setProblemIndexNumber(0);
    setTimeLeft(120);
    setWinner("");
    setMessage("Live duel started from Problem 1.");
    setIsLive(true);

    localStorage.setItem("score1", "0");
    localStorage.setItem("score2", "0");
  }}
  className="rounded-xl bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-500"
>
  Start Live Duel
</button>

          <button
            onClick={() => setIsLive((prev) => !prev)}
            className="rounded-xl bg-gray-800 px-5 py-3 font-semibold text-white hover:bg-gray-700"
          >
            {isLive ? "Pause Live Checking" : "Resume Live Checking"}
          </button>

          <button
            onClick={compareHandles}
            disabled={isChecking}
            className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {isChecking ? "Checking..." : "Check Now"}
          </button>

          <button
            onClick={resetGame}
            className="rounded-xl bg-red-600 px-5 py-3 font-semibold text-white hover:bg-red-500"
          >
            Reset
          </button>

          {currentProblem && (
            <a
              href={problemUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border border-gray-700 px-5 py-3 font-semibold text-yellow-400 hover:bg-gray-900"
            >
              Open Problem
            </a>
          )}
        </div>
        <div className="mt-6 rounded-xl border border-gray-800 bg-black/40 p-4">
  <div className="flex items-center justify-between text-sm text-gray-400">
    <span>Match Progress</span>
    <span>
      Problem {currentStep} / {totalProblems}
    </span>
  </div>

  <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-gray-800">
    <div
      className="h-full rounded-full bg-yellow-500 transition-all duration-500"
      style={{ width: `${progressPercent}%` }}
    />
  </div>

  <div className="mt-4 flex gap-2">
    {problems.map((problem, idx) => {
      const isDone = idx < problemIndexNumber;
      const isCurrent = idx === problemIndexNumber;

      return (
        <div
          key={`${problem.contestId}-${problem.index}`}
          className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
            isDone
              ? "border-green-600 bg-green-600/20 text-green-400"
              : isCurrent
              ? "border-yellow-500 bg-yellow-500/10 text-yellow-400"
              : "border-gray-700 bg-gray-900 text-gray-500"
          }`}
        >
          {problem.contestId}
          {problem.index} ({problem.points})
        </div>
      );
    })}
  </div>
</div>
        <div className="mt-6 rounded-xl border border-gray-800 bg-black/40 p-4">
          <p className="text-sm text-gray-400">Status</p>
          <p className="mt-2 text-lg">{message}</p>
          {winner && (
            <p className="mt-4 text-2xl font-extrabold text-yellow-400">
              Winner: {winner}
            </p>
          )}
        </div>
      </div>
    </div>
  </main>
);
}