import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const minRating = parseInt(searchParams.get("min") || "800");
  const maxRating = parseInt(searchParams.get("max") || "3500");
  const count = parseInt(searchParams.get("count") || "5");

  try {
    const res = await fetch("https://codeforces.com/api/problemset.problems");
    const data = await res.json();

    if (data.status !== "OK") {
      throw new Error("Failed to fetch from Codeforces");
    }

    const allProblems = data.result.problems;
    
    // Filter problems by rating and also make sure they are somewhat standard programming problems
    // Often there's no rating for newly added problems, so we skip those
    const filtered = allProblems.filter((p: any) => {
      return (
        p.rating && 
        p.rating >= minRating && 
        p.rating <= maxRating && 
        !p.tags.includes("*special")
      );
    });

    if (filtered.length < count) {
      return NextResponse.json({ error: "Not enough problems in this difficulty range" }, { status: 400 });
    }

    // Shuffle and pick `count` problems
    const shuffled = filtered.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, count);

    const result = selected.map((p: any) => ({
      contestId: p.contestId,
      index: p.index,
      name: p.name,
      rating: p.rating,
    }));

    return NextResponse.json({ problems: result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
