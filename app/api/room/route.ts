import { NextResponse } from "next/server";
import { setRoom, Room } from "@/lib/store";

export async function POST(request: Request) {
  try {
    const { problems, durationMinutes } = await request.json();

    if (!problems || problems.length === 0) {
      return NextResponse.json({ error: "Problems are required" }, { status: 400 });
    }

    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();

    const newRoom: Room = {
      id: roomId,
      problems,
      durationMinutes: durationMinutes || 20,
      startTime: null,
      player1: null,
      player2: null,
      currentProblemIndex: 0,
      status: "waiting",
      winner: null,
    };

    await setRoom(roomId, newRoom);

    return NextResponse.json({ roomId: newRoom.id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
