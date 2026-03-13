export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const handle = searchParams.get("handle");
  const count = searchParams.get("count") ?? "100";

  if (!handle) {
    return Response.json({ error: "handle is required" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://codeforces.com/api/user.status?handle=${handle}&from=1&count=${count}`
    );

    if (!res.ok) {
        return Response.json({ error: `Codeforces API returned ${res.status}` }, { status: 500 });
    }

    const data = await res.json();

    return Response.json(data);
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}