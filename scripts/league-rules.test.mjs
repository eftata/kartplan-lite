import { readFileSync } from "node:fs";
import { describe, it, beforeAll, afterAll, beforeEach } from "vitest";
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from "@firebase/rules-unit-testing";
import { doc, setDoc, getDoc, writeBatch, serverTimestamp } from "firebase/firestore";
const enabled = !!process.env.FIRESTORE_EMULATOR_HOST;
describe.skipIf(!enabled)("private goals and monthly league security", () => {
  let env;
  let db;
  let season;
  let day;
  beforeAll(async () => {
    env = await initializeTestEnvironment({
      projectId: "demo-kartplan",
      firestore: { host: "127.0.0.1", port: 8080, rules: readFileSync("firestore.rules", "utf8") },
    });
    db = env.authenticatedContext("alice").firestore();
    const now = new Date(Date.now() + 3 * 3600000);
    day = now.toISOString().slice(0, 10);
    season = day.slice(0, 7);
  });
  afterAll(async () => {
    await env?.cleanup();
  });
  beforeEach(async () => {
    await env.clearFirestore();
    await setDoc(doc(db, "users/alice"), {
      cardIds: ["bonus"],
      spend: { market: 100000 },
      joined: {},
      planMonth: season,
      planChoices: [{ campaignId: "offer", cardId: "bonus", amountKurus: 100000 }],
    });
  });
  const game = (extra = {}) => ({
    tasks: {},
    checkins: {},
    score: 0,
    optIn: false,
    nickname: "",
    progressId: "",
    updatedAt: serverTimestamp(),
    ...extra,
  });
  it("allows fixed task points, rejects invented points and repeated score increases", async () => {
    const ref = doc(db, `users/alice/gameMonths/${season}`);
    await assertFails(setDoc(ref, game({ tasks: { wallet: true }, score: 500 })));
    await assertSucceeds(setDoc(ref, game({ tasks: { wallet: true }, score: 50 })));
    await assertFails(setDoc(ref, game({ tasks: { wallet: true }, score: 100 })));
  });
  it("allows one current day check-in, rejects backdating and other seasons", async () => {
    await assertSucceeds(
      setDoc(
        doc(db, `users/alice/gameMonths/${season}`),
        game({ checkins: { [day]: true }, score: 10 }),
      ),
    );
    await assertFails(
      setDoc(
        doc(db, `users/alice/gameMonths/${season}`),
        game({ checkins: { [day]: true, "2000-01-01": true }, score: 20 }),
      ),
    );
    await assertFails(setDoc(doc(db, "users/alice/gameMonths/2000-01"), game()));
  });
  it("checks profile prerequisites and private progress before awarding missions", async () => {
    const ref = doc(db, `users/alice/gameMonths/${season}`);
    await assertFails(setDoc(ref, game({ tasks: { join: true }, score: 50 })));
    await assertFails(
      setDoc(ref, game({ tasks: { progress: true }, score: 100, progressId: "missing" })),
    );
    await assertSucceeds(setDoc(ref, game({ tasks: { budget: true, plan: true }, score: 150 })));
  });
  it("requires atomic opt-in projection and never permits financial fields in public", async () => {
    const ref = doc(db, `users/alice/gameMonths/${season}`);
    const pub = doc(db, `leaderboards/${season}/players/alice`);
    await assertFails(setDoc(ref, game({ optIn: true, nickname: "Kaşif" })));
    let b = writeBatch(db);
    b.set(ref, game({ optIn: true, nickname: "Kaşif" }));
    b.set(pub, { nickname: "Kaşif", score: 0, updatedAt: serverTimestamp() });
    await assertSucceeds(b.commit());
    await assertFails(
      setDoc(pub, { nickname: "Kaşif", score: 0, spend: 1000, updatedAt: serverTimestamp() }),
    );
    await assertFails(setDoc(pub, { nickname: "Kaşif", score: 999, updatedAt: serverTimestamp() }));
    b = writeBatch(db);
    b.set(ref, game());
    b.delete(pub);
    await assertSucceeds(b.commit());
  });
  it("keeps legacy progress private and rejects unchecked new entries", async () => {
    const ref = doc(db, `users/alice/campaignProgress/${season}_offer`);
    const value = {
      season,
      campaignId: "offer",
      cardId: "bonus",
      category: "market",
      entries: [{ amountKurus: 1000, day }],
      totalKurus: 1000,
      updatedAt: serverTimestamp(),
    };
    await assertFails(setDoc(ref, value));
    await env.withSecurityRulesDisabled(async (context) =>
      setDoc(doc(context.firestore(), ref.path), value),
    );
    await assertSucceeds(getDoc(ref));
    await assertFails(getDoc(doc(env.authenticatedContext("bob").firestore(), ref.path)));
  });
});
