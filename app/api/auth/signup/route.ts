import { NextResponse } from "next/server";
import { z } from "zod";
import { createId, getCollections } from "@/lib/db";
import { hashPassword, setSession } from "@/lib/auth";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(8),
  password: z.string().min(6),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid signup details." }, { status: 400 });

  const { users } = await getCollections();
  const email = parsed.data.email.toLowerCase();
  if (await users.findOne({ email })) {
    return NextResponse.json({ error: "An account already exists with this email." }, { status: 409 });
  }

  const user = {
    id: createId("user"),
    name: parsed.data.name,
    email,
    phone: parsed.data.phone,
    passwordHash: hashPassword(parsed.data.password),
    createdAt: new Date().toISOString(),
  };

  await users.insertOne(user);
  await setSession(user.id);

  return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, phone: user.phone } });
}
