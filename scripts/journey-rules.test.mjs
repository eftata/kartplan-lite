import { readFileSync } from "node:fs";
import { describe, it, beforeAll, beforeEach, afterAll } from "vitest";
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from "@firebase/rules-unit-testing";
import { doc, setDoc, getDoc, serverTimestamp, writeBatch } from "firebase/firestore";
const enabled = !!process.env.FIRESTORE_EMULATOR_HOST;
describe.skipIf(!enabled)("enrollment to earned reward security", () => {
  let env, db, day, season, model;
  const ref = () => doc(db, `users/alice/campaignProgress/${season}_offer`);
  const enrolled = (extra = {}) => ({
    season,
    campaignId: "offer",
    cardId: "bonus",
    category: "market",
    targetKurus: 100000,
    joinDay: day,
    bankJoined: true,
    conditionsAccepted: true,
    updatedAt: serverTimestamp(),
    ...extra,
  });
  const progress = (count = 1, extra = {}) => ({
    season,
    campaignId: "offer",
    cardId: "bonus",
    category: "market",
    entries: Array.from({ length: count }, (_, i) => ({
      day,
      merchant: `magaza-${i}`,
      amountKurus: 50000,
      conditionsConfirmed: true,
    })),
    totalKurus: count * 50000,
    qualifiedTotalKurus: count * 50000,
    qualifiedCount: count,
    qualificationKeys: Object.fromEntries(
      Array.from({ length: count }, (_, i) => [`${day}|magaza-${i}`, true]),
    ),
    effectiveKurus: count * 50000,
    completed: count >= 2,
    earnedKurus: count >= 2 ? 10000 : 0,
    updatedAt: serverTimestamp(),
    ...extra,
  });
  beforeAll(async () => {
    env = await initializeTestEnvironment({
      projectId: "demo-kartplan-journey",
      firestore: { host: "127.0.0.1", port: 8080, rules: readFileSync("firestore.rules", "utf8") },
    });
    db = env.authenticatedContext("alice").firestore();
    day = new Date(Date.now() + 3 * 3600000).toISOString().slice(0, 10);
    season = day.slice(0, 7);
    model = {
      poolKey: "bonus-market",
      merchantPattern: ".*",
      status: "yayinda",
      cardIds: ["bonus"],
      category: "market",
      startsAt: season + "-01",
      endsAt: season + "-31",
      minSpendKurus: 50000,
      repeatReward: true,
      requiredTransactions: 0,
      transactionMinKurus: 50000,
      transactionMaxExclusiveKurus: 0,
      separateDays: false,
      sameDayMerchantOnce: true,
      skipTransactions: 0,
      rewardKurus: 5000,
      capKurus: 10000,
      rewardKind: "sabit",
      rateBps: 0,
      feeCardIds: [],
      participationFeeKurus: 0,
      requiresJoin: true,
    };
  });
  afterAll(async () => env?.cleanup());
  beforeEach(async () => {
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async (c) => {
      await setDoc(doc(c.firestore(), "trackingRules/offer"), model);
    });
    await setDoc(doc(db, "users/alice"), {
      cardIds: ["bonus"],
      spend: { market: 100000 },
      joined: { offer: true },
    });
  });
  async function enroll() {
    const batch = writeBatch(db);
    batch.set(doc(db, `users/alice/campaignEnrollments/${season}_offer`), enrolled());
    batch.set(doc(db, `users/alice/campaignMonths/${season}`), {
      season,
      allocations: { market: 100000 },
      pools: { "bonus-market": "offer" },
      count: 1,
      lastCampaignId: "offer",
      updatedAt: serverTimestamp(),
    });
    await assertSucceeds(batch.commit());
  }
  it("requires enrollment, bank participation and enough category budget", async () => {
    await assertFails(setDoc(ref(), progress()));
    const e = doc(db, `users/alice/campaignEnrollments/${season}_offer`);
    await assertFails(setDoc(e, enrolled({ bankJoined: false })));
    await assertFails(setDoc(e, enrolled({ targetKurus: 150000 })));
    await assertFails(setDoc(e, enrolled()));
    await enroll();
    await assertFails(setDoc(e, enrolled({ targetKurus: 50000 })));
  });
  it("atomically rejects a second enrollment that exceeds the shared category budget", async () => {
    await enroll();
    await env.withSecurityRulesDisabled(async (c) =>
      setDoc(doc(c.firestore(), "trackingRules/other"), { ...model, poolKey: "other-market" }),
    );
    const batch = writeBatch(db);
    batch.set(
      doc(db, `users/alice/campaignEnrollments/${season}_other`),
      enrolled({ campaignId: "other", targetKurus: 50000 }),
    );
    batch.set(doc(db, `users/alice/campaignMonths/${season}`), {
      season,
      allocations: { market: 150000 },
      pools: { "bonus-market": "offer", "other-market": "other" },
      count: 2,
      lastCampaignId: "other",
      updatedAt: serverTimestamp(),
    });
    await assertFails(batch.commit());
  });
  it("records accepted transactions but credits reward only once the target completes", async () => {
    await enroll();
    await assertSucceeds(setDoc(ref(), progress()));
    await assertSucceeds(setDoc(ref(), progress(2)));
    await assertFails(setDoc(ref(), progress(3)));
    await assertFails(setDoc(ref(), progress(2, { earnedKurus: 999999 })));
  });
  it("rejects forged early earnings, counts and totals", async () => {
    await enroll();
    await assertFails(setDoc(ref(), progress(1, { completed: true, earnedKurus: 10000 })));
    await assertFails(setDoc(ref(), progress(1, { qualifiedCount: 2, effectiveKurus: 100000 })));
    await assertFails(setDoc(ref(), progress(1, { totalKurus: 100000 })));
  });
  it("rejects transactions below the minimum or without merchant/POS consent", async () => {
    await enroll();
    const p = progress();
    await assertFails(setDoc(ref(), { ...p, entries: [{ ...p.entries[0], amountKurus: 1000 }] }));
    await assertFails(
      setDoc(ref(), { ...p, entries: [{ ...p.entries[0], conditionsConfirmed: false }] }),
    );
    await assertFails(setDoc(ref(), { ...p, entries: [{ ...p.entries[0], merchant: "" }] }));
  });
  it("rejects repeated same-day merchant transactions and a transaction before joining", async () => {
    await enroll();
    await assertSucceeds(setDoc(ref(), progress()));
    const p = progress(2);
    await assertFails(setDoc(ref(), { ...p, entries: [p.entries[0], p.entries[0]] }));
    if (day.slice(-2) !== "01") {
      const earlier = season + "-01";
      await assertFails(
        setDoc(
          ref(),
          progress(2, {
            entries: [
              progress().entries[0],
              { day: earlier, merchant: "earlier", amountKurus: 50000, conditionsConfirmed: true },
            ],
          }),
        ),
      );
    }
  });
  it("rejects a merchant outside a campaign's explicitly restricted brand", async () => {
    await env.withSecurityRulesDisabled(async (c) =>
      setDoc(doc(c.firestore(), "trackingRules/offer"), { ...model, merchantPattern: ".*coffy.*" }),
    );
    await enroll();
    await assertFails(setDoc(ref(), progress()));
  });
  it("keeps financial records private and prevents client changes to official rules", async () => {
    await enroll();
    await assertSucceeds(setDoc(ref(), progress()));
    await assertFails(getDoc(doc(env.authenticatedContext("bob").firestore(), ref().path)));
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), ref().path)));
    await assertFails(setDoc(doc(db, "trackingRules/offer"), { ...model, rewardKurus: 100000 }));
  });
  it("awards a completion mission only after the validated target completes", async () => {
    await enroll();
    const game = doc(db, `users/alice/gameMonths/${season}`);
    const g = {
      tasks: { complete: true },
      checkins: {},
      score: 150,
      optIn: false,
      nickname: "",
      progressId: `${season}_offer`,
      updatedAt: serverTimestamp(),
    };
    await assertFails(setDoc(game, g));
    await assertSucceeds(setDoc(ref(), progress()));
    await assertFails(setDoc(game, g));
    await assertSucceeds(setDoc(ref(), progress(2)));
    await assertSucceeds(setDoc(game, g));
  });
});
