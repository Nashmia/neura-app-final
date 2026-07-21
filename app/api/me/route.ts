import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getCollections, withoutMongoId } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null, patient: null });
  const { patients } = await getCollections();
  const patient = await patients.findOne({ userId: user.id }, withoutMongoId);
  return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, phone: user.phone }, patient });
}
