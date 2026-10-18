import { after, test } from "node:test";
import assert from "node:assert/strict";
import { useTempJsonDb } from "./helpers";
import { getCollections, findPatientForUser } from "../lib/db";
import { caregiverInput, createPatientForCaregiver, patientInput, updateCaregiver, updatePatientForCaregiver } from "../lib/profile";

after(useTempJsonDb());

const base = {
  patientName: "Amina",
  age: 78,
  gender: "Female",
  dementiaStage: "Mild",
  notes: "Allergic to penicillin",
  contacts: [{ name: "Sara", relationship: "Daughter", type: "Family" as const, photo: "data:image/jpeg;base64,AAA" }],
  quizLength: 4,
  quizDifficulty: "Easy",
};
const input = (overrides: object = {}) => patientInput.parse({ ...base, ...overrides });

test("onboarding creates the patient once; repeating it neither overwrites nor duplicates", async () => {
  const c = await getCollections();
  const first = await createPatientForCaregiver(c, "user_a", input());
  assert.equal(first.ok, true);

  // A stale or repeated onboarding submission with a blank form.
  const again = await createPatientForCaregiver(c, "user_a", input({ notes: "", contacts: [] }));
  assert.deepEqual(again, { ok: false, reason: "exists" });

  const all = await c.patients.find({ caregiverIds: "user_a" }).toArray();
  assert.equal(all.length, 1);
  assert.equal(all[0].notes, "Allergic to penicillin");
  assert.equal(all[0].contacts.length, 1);
});

test("editing the patient updates in place and keeps id, contacts' ids and history links", async () => {
  const c = await getCollections();
  const before = (await findPatientForUser(c, "user_a"))!;
  await c.medications.insertOne({ id: "med_1", userId: "user_a", patientId: before.id, name: "Donepezil", dosage: "5mg", time: "08:00", status: "Pending" });
  const sara = before.contacts[0];

  const result = await updatePatientForCaregiver(c, "user_a", input({
    age: 79,
    contacts: [
      { id: sara.id, name: "Sara Khan", relationship: "Daughter", type: "Family", photo: sara.photo },
      { name: "Bilal", relationship: "Neighbour", type: "Friend" },
      { name: "   ", relationship: "", type: "Friend" }, // blank rows are dropped
    ],
  }));
  assert.equal(result.ok, true);

  const after = (await findPatientForUser(c, "user_a"))!;
  assert.equal(after.id, before.id);
  assert.equal(after.createdAt, before.createdAt);
  assert.deepEqual(after.caregiverIds, before.caregiverIds);
  assert.equal(after.age, 79);
  assert.equal(after.contacts.length, 2);
  assert.equal(after.contacts[0].id, sara.id); // existing person keeps their id
  assert.equal(after.contacts[0].photo, sara.photo);
  assert.notEqual(after.contacts[1].id, undefined);
  assert.deepEqual([after.familyCount, after.friendsCount], [1, 1]);
  assert.equal((await c.medications.find({ patientId: after.id }).toArray()).length, 1); // history untouched
  assert.equal((await c.patients.find({ caregiverIds: "user_a" }).toArray()).length, 1);
});

test("a caregiver can only edit their own patient, and an invented contact id is not trusted", async () => {
  const c = await getCollections();
  await createPatientForCaregiver(c, "user_b", input({ patientName: "Yusuf" }));
  const forged = await updatePatientForCaregiver(c, "user_b", input({ contacts: [{ id: "contact_from_someone_else", name: "X", type: "Friend" }] }));
  assert.equal(forged.ok, true);
  const b = (await findPatientForUser(c, "user_b"))!;
  assert.notEqual(b.contacts[0].id, "contact_from_someone_else");
  assert.equal((await findPatientForUser(c, "user_a"))!.name, "Amina"); // other caregiver's patient untouched

  assert.deepEqual(await updatePatientForCaregiver(c, "user_nobody", input()), { ok: false, reason: "missing" });
});

test("patient and caregiver input are validated", () => {
  assert.equal(patientInput.safeParse({ ...base, patientName: "A" }).success, false);
  assert.equal(patientInput.safeParse({ ...base, age: 0 }).success, false);
  assert.equal(patientInput.safeParse({ ...base, age: 121 }).success, false);
  assert.equal(patientInput.safeParse({ ...base, quizLength: 999 }).success, false);
  assert.equal(caregiverInput.safeParse({ name: "N", phone: "03001234567" }).success, false);
  assert.equal(caregiverInput.safeParse({ name: "Nashmia", phone: "123" }).success, false);
  assert.equal(caregiverInput.safeParse({ name: "Nashmia", phone: "03001234567" }).success, true);
});

test("caregiver profile updates name and phone but never the sign-in email", async () => {
  const c = await getCollections();
  await c.users.insertOne({ id: "user_c", name: "Old", email: "c@example.test", phone: "00000000", passwordHash: "x", createdAt: new Date().toISOString() });
  const updated = await updateCaregiver(c, "user_c", caregiverInput.parse({ name: "New Name", phone: "03001112222", email: "attacker@example.test" }));
  assert.deepEqual(updated, { id: "user_c", name: "New Name", email: "c@example.test", phone: "03001112222" });
});
