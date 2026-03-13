import { NextResponse } from "next/server";
import { getRoom, setRoom, Room } from "@/lib/store";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  const normalizedId = roomId.toUpperCase();
  const room = await getRoom(normalizedId);

  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  // Check if time is up
  if (room.status === "running" && room.startTime) {
    const elapsedSeconds = (Date.now() - room.startTime) / 1000;
    if (elapsedSeconds >= room.durationMinutes * 60) {
      room.status = "finished";
      room.winner = getWinner(room);
      await setRoom(normalizedId, room);
    }
  }

  return NextResponse.json({ room });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  const normalizedId = roomId.toUpperCase();
  const room = await getRoom(normalizedId);

  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  try {
    const updates: Partial<Room> = await request.json();
    
    // Merge updates
    const updatedRoom = { ...room, ...updates };
    await setRoom(normalizedId, updatedRoom);

    return NextResponse.json({ room: updatedRoom });
  } catch (err) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}

function getWinner(room: Room) {
  const s1 = room.player1?.score || 0;
  const s2 = room.player2?.score || 0;
  if (s1 > s2) return room.player1?.handle || "Player 1";
  if (s2 > s1) return room.player2?.handle || "Player 2";
  return "Draw";
}
