import { NextResponse } from "next/server";
import { getDb, users, eq } from "@dealopoly/db";
import { hashPassword } from "@/lib/password";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, password } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Display name is required." }, { status: 400 });
    }

    if (!email || typeof email !== "string" || !email.trim()) {
      return NextResponse.json({ error: "Email address is required." }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cleanEmail = email.toLowerCase().trim();
    if (!emailRegex.test(cleanEmail)) {
      return NextResponse.json({ error: "Please provide a valid email address." }, { status: 400 });
    }

    if (!password || typeof password !== "string" || password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters long." }, { status: 400 });
    }

    const db = getDb();

    // Check if user already exists
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, cleanEmail))
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { error: "An account with this email already exists. Please sign in instead." },
        { status: 409 }
      );
    }

    const cleanName = name.trim();
    const passwordHash = hashPassword(password);
    const tag = `${cleanName}#${Math.floor(1000 + Math.random() * 9000)}`;

    await db.insert(users).values({
      name: cleanName,
      email: cleanEmail,
      password: passwordHash,
      customTag: tag,
      gamesPlayed: 0,
      gamesWon: 0,
    });

    return NextResponse.json({ success: true, message: "Account created successfully." });
  } catch (err: unknown) {
    console.error("[Register Error]", err);
    return NextResponse.json(
      { error: "An unexpected error occurred while creating your account. Please try again." },
      { status: 500 }
    );
  }
}
