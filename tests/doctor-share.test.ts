import { after, test } from "node:test";
import assert from "node:assert/strict";
import { useTempJsonDb } from "./helpers";
import { createDoctorShareCode, createInviteCode, DOCTOR_LINK_TTL_MS, verifyDoctorShareCode, verifyInviteCode } from "../lib/auth";
import { getCollections } from "../lib/db";
import { loadDoctorView } from "../lib/doctor-share";

after(useTempJsonDb());

async function setup() {
  const c = await getCollections();
  await c.users.insertOne({ id: "user_d", name: "Jackie Doe", email: "j@example.test", phone: "03001234567", passwordHash: "x", createdAt: new Date().toISOString() });
  await c.patients.insertOne({
    id: "patient_d", userId: "user_d", caregiverIds: ["user_d"], name: "Jane Doe", age: 72, gender: "Female", dementiaStage: "Moderate",
    notes: "", contacts: [], familyCount: 0, friendsCount: 0, quizLength: 4, quizDifficulty: "Easy", createdAt: "", updatedAt: "",
  });
  await c.medications.insertOne({ id: "m1", userId: "user_d", patientId: "patient_d", name: "Donepezil", dosage: "10mg", time: "08:00 AM", status: "Taken" });
  await c.medications.insertOne({ id: "m2", userId: "other", patientId: "patient_other", name: "Other med", dosage: "1mg", time: "x", status: "Pending" });
  return c;
}

test("a doctor link opens only its patient's summary, without account details", async () => {
  const c = await setup();
  const view = await loadDoctorView(c, createDoctorShareCode("patient_d", 0));
  assert.equal(view.ok, true);
  if (!view.ok) return;
  assert.equal(view.patient.name, "Jane Doe");
  assert.deepEqual(view.medications.map((m) => m.name), ["Donepezil"]); // never another patient's records
  assert.deepEqual(view.caregivers, ["Jackie Doe"]); // names only, no emails or phones
});

test("forged, edited and expired links are refused", async () => {
  const c = await getCollections();
  const code = createDoctorShareCode("patient_d", 0);
  assert.deepEqual(await loadDoctorView(c, code.replace("patient_d", "patient_other")), { ok: false, reason: "invalid" });
  assert.deepEqual(await loadDoctorView(c, `${code.slice(0, -1)}0`), { ok: false, reason: "invalid" });
  assert.deepEqual(await loadDoctorView(c, "garbage"), { ok: false, reason: "invalid" });
  const old = createDoctorShareCode("patient_d", 0, Date.now() - DOCTOR_LINK_TTL_MS - 1000);
  assert.deepEqual(await loadDoctorView(c, old), { ok: false, reason: "expired" });
});

test("revoking turns off every link issued before, and new links work again", async () => {
  const c = await getCollections();
  const before = createDoctorShareCode("patient_d", 0);
  await c.patients.updateOne({ id: "patient_d" }, { $set: { doctorShareVersion: 1 } });
  assert.deepEqual(await loadDoctorView(c, before), { ok: false, reason: "revoked" });
  assert.equal((await loadDoctorView(c, createDoctorShareCode("patient_d", 1))).ok, true);
});

test("doctor links and caregiver invite codes can't be swapped", () => {
  const invite = createInviteCode("patient_d");
  assert.equal(verifyDoctorShareCode(invite), null);
  const doctor = createDoctorShareCode("patient_d", 0);
  assert.equal(verifyInviteCode(doctor), null);
});
