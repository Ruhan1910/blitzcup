import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px]" />

      <div className="z-10 text-center max-w-4xl px-4">
        <div className="inline-block mb-4 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm text-sm font-semibold text-neutral-300">
          v1.0 is live ⚡️
        </div>
        <h1 className="text-6xl md:text-8xl font-extrabold tracking-tight mb-8 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-600 drop-shadow-sm leading-tight">
          BlitzChallenge
        </h1>
        <p className="text-xl md:text-2xl text-neutral-400 mb-12 font-medium leading-relaxed max-w-2xl mx-auto">
          The ultimate real-time programming duel platform. Challenge your friends to solve Codeforces problems head-to-head.
        </p>

        <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
          <Link
            href="/create"
            className="group relative px-10 py-5 bg-white text-black font-bold text-xl rounded-full overflow-hidden shadow-[0_0_40px_-10px_rgba(255,255,255,0.4)] hover:scale-105 transition-all duration-300"
          >
            <span className="relative z-10 flex items-center gap-3">
              Create a Duel
              <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            </span>
          </Link>
        </div>

        <div className="mt-28 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
          <div className="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl hover:bg-white/10 hover:-translate-y-1 transition-all duration-300">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center mb-6 shadow-highlight">
              <span className="text-blue-400 text-2xl font-extrabold">1</span>
            </div>
            <h3 className="text-2xl font-bold mb-3 text-white">Curate Problems</h3>
            <p className="text-neutral-400 leading-relaxed">Select any Codeforces problems and configure custom point values to design your ultimate contest.</p>
          </div>
          <div className="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl hover:bg-white/10 hover:-translate-y-1 transition-all duration-300">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 flex items-center justify-center mb-6">
              <span className="text-indigo-400 text-2xl font-extrabold">2</span>
            </div>
            <h3 className="text-2xl font-bold mb-3 text-white">Share Link</h3>
            <p className="text-neutral-400 leading-relaxed">Instantly generate a unique duel room and invite a challenger to compete against you in real-time.</p>
          </div>
          <div className="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl hover:bg-white/10 hover:-translate-y-1 transition-all duration-300">
            <div className="w-14 h-14 rounded-2xl bg-purple-500/20 flex items-center justify-center mb-6">
              <span className="text-purple-400 text-2xl font-extrabold">3</span>
            </div>
            <h3 className="text-2xl font-bold mb-3 text-white">Race to Solve</h3>
            <p className="text-neutral-400 leading-relaxed">First to solve secures the points. The next problem unlocks instantly. purely head-to-head.</p>
          </div>
        </div>
      </div>
    </main>
  );
}