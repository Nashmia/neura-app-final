import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getCollections } from "@/lib/db";
import { caregiverInput, updateCaregiver } from "@/lib/profile";

/** The signed-in caregiver's own account details. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, phone: user.phone } });
}

/** Update name and phone. Email is the sign-in identity, so it isn't editable here. */
export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  const parsed = caregiverInput.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Please check your details." }, { status: 400 });
  const updated = await updateCaregiver(await getCollections(), user.id, parsed.data);
  if (!updated) return NextResponse.json({ error: "Your account could not be found. Please log in again." }, { status: 404 });
  return NextResponse.json({ user: updated });
}
