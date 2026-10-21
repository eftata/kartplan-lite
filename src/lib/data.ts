import { entryProblem, nextJourneyProgress } from "./campaignJourney";
import { EMPTY_LEAGUE, leagueScore } from "./league";
// Firestore erişimi tek dosyada. Koleksiyonlar:
//   cards/{id}       katalog (herkes okur, admin yazar)
//   campaigns/{id}   kampanyalar (yayındakini herkes, taslağı admin okur; admin yazar)
//   users/{uid}      kullanıcının kartları, harcama profili, katıldıkları (yalnızca kendisi)
//   admins/{uid}     admin işareti (yalnızca konsoldan eklenir)

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  deleteField,
  runTransaction,
  orderBy,
  limit,
} from "firebase/firestore";
import { fb } from "../firebase";
import { SEED_CARDS, demoCampaigns } from "./seed";
import type { Campaign, CatalogCard, UserDoc } from "./types";

export const CONSENT_VERSION = 1;

export const EMPTY_USER: UserDoc = {
  cardIds: [],
  spend: {},
  joined: {},
  onboarded: false,
  consentVersion: 0,
};

export function watchCards(cb: (cards: CatalogCard[]) => void, onError: (e: Error) => void) {
  return onSnapshot(
    collection(fb().db, "cards"),
    (snap) => {
      // Başlangıç kartları veritabanı henüz kurulmamış olsa da görünür.
      // Yönetici tarafından kaydedilen sürüm aynı kimlikli varsayılan kartın yerini alır.
      const byId = new Map(SEED_CARDS.map((card) => [card.id, card]));
      snap.docs.forEach((d) =>
        byId.set(d.id, { ...byId.get(d.id), ...(d.data() as Omit<CatalogCard, "id">), id: d.id }),
      );
      const cards = [...byId.values()];
      cards.sort(
        (a, b) =>
          a.programName.localeCompare(b.programName, "tr") || a.name.localeCompare(b.name, "tr"),
      );
      cb(cards);
    },
    onError,
  );
}

export function watchCampaigns(
  admin: boolean,
  cb: (c: Campaign[]) => void,
  onError: (e: Error) => void,
) {
  const col = collection(fb().db, "campaigns");
  const q = admin ? col : query(col, where("status", "==", "yayinda"));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ ...(d.data() as Omit<Campaign, "id">), id: d.id }))),
    onError,
  );
}

export function watchUser(
  uid: string,
  cb: (u: UserDoc | null) => void,
  onError: (e: Error) => void,
) {
  return onSnapshot(
    doc(fb().db, "users", uid),
    (snap) => cb(snap.exists() ? { ...EMPTY_USER, ...(snap.data() as Partial<UserDoc>) } : null),
    onError,
  );
}

export async function isAdmin(uid: string): Promise<boolean> {
  try {
    return (await getDoc(doc(fb().db, "admins", uid))).exists();
  } catch {
    return false;
  }
}

export async function saveUser(uid: string, patch: Partial<UserDoc>) {
  await setDoc(
    doc(fb().db, "users", uid),
    { ...patch, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

export async function setJoined(uid: string, campaignId: string, joined: boolean) {
  await updateDoc(doc(fb().db, "users", uid), {
    [`joined.${campaignId}`]: joined ? true : deleteField(),
    updatedAt: serverTimestamp(),
  });
}

export async function exportExtraData(uid: string) {
  const [games, progress, enrollments, months] = await Promise.all([
    getDocs(collection(fb().db, "users", uid, "gameMonths")),
    getDocs(collection(fb().db, "users", uid, "campaignProgress")),
    getDocs(collection(fb().db, "users", uid, "campaignEnrollments")),
    getDocs(collection(fb().db, "users", uid, "campaignMonths")),
  ]);
  return {
    campaignMonths: months.docs.map((d) => ({ id: d.id, ...d.data() })),
    campaignEnrollments: enrollments.docs.map((d) => ({ id: d.id, ...d.data() })),
    gameMonths: games.docs.map((d) => ({ id: d.id, ...d.data() })),
    campaignProgress: progress.docs.map((d) => ({ id: d.id, ...d.data() })),
  };
}
export async function deleteUserData(uid: string) {
  const games = await getDocs(collection(fb().db, "users", uid, "gameMonths"));
  for (const game of games.docs) {
    const batch = writeBatch(fb().db);
    batch.delete(game.ref);
    batch.delete(doc(fb().db, "leaderboards", game.id, "players", uid));
    await batch.commit();
  }
  const progress = await getDocs(collection(fb().db, "users", uid, "campaignProgress"));
  for (const item of progress.docs) await deleteDoc(item.ref);
  const enrollments = await getDocs(collection(fb().db, "users", uid, "campaignEnrollments"));
  for (const item of enrollments.docs) await deleteDoc(item.ref);
  const months = await getDocs(collection(fb().db, "users", uid, "campaignMonths"));
  for (const month of months.docs) await deleteDoc(month.ref);
  await deleteDoc(doc(fb().db, "users", uid));
}

// ---- admin ----

export async function saveCard(card: CatalogCard) {
  const { id, ...rest } = card;
  await setDoc(doc(fb().db, "cards", id), rest);
}

export async function removeCard(id: string) {
  await deleteDoc(doc(fb().db, "cards", id));
}

export async function saveCampaign(c: Omit<Campaign, "id"> & { id?: string }) {
  const { id, ...rest } = c;
  const data = { ...rest, updatedAt: serverTimestamp() };
  if (id) await setDoc(doc(fb().db, "campaigns", id), data);
  else await addDoc(collection(fb().db, "campaigns"), data);
}

export async function removeCampaign(id: string) {
  await deleteDoc(doc(fb().db, "campaigns", id));
}

/** Eksik katalog kartlarını ekler; mevcutları ezmez. Eklenen sayıyı döner. */
export async function seedCatalog(): Promise<number> {
  const existing = new Set((await getDocs(collection(fb().db, "cards"))).docs.map((d) => d.id));
  const batch = writeBatch(fb().db);
  let n = 0;
  for (const { id, ...rest } of SEED_CARDS) {
    if (existing.has(id)) continue;
    batch.set(doc(fb().db, "cards", id), rest);
    n++;
  }
  if (n) await batch.commit();
  return n;
}

export async function seedDemoCampaigns(today: string): Promise<number> {
  const batch = writeBatch(fb().db);
  const list = demoCampaigns(today);
  for (const c of list)
    batch.set(doc(collection(fb().db, "campaigns")), { ...c, updatedAt: serverTimestamp() });
  await batch.commit();
  return list.length;
}

// ---- Monthly goals, private progress and opt-in public league ----
export function watchProgress(
  uid: string,
  season: string,
  cb: (items: import("./types").CampaignProgress[]) => void,
  onError: (e: Error) => void,
) {
  return onSnapshot(
    query(collection(fb().db, "users", uid, "campaignProgress"), where("season", "==", season)),
    (snap) =>
      cb(snap.docs.map((d) => ({ ...d.data(), id: d.id }) as import("./types").CampaignProgress)),
    onError,
  );
}
export function watchEnrollments(
  uid: string,
  season: string,
  cb: (items: import("./types").CampaignEnrollment[]) => void,
  onError: (e: Error) => void,
) {
  return onSnapshot(
    query(collection(fb().db, "users", uid, "campaignEnrollments"), where("season", "==", season)),
    (snap) =>
      cb(snap.docs.map((d) => ({ ...d.data(), id: d.id }) as import("./types").CampaignEnrollment)),
    onError,
  );
}
export async function startTracking(
  uid: string,
  value: import("./types").CampaignEnrollment,
  choices: UserDoc["planChoices"],
) {
  const { id, ...data } = value;
  const ref = doc(fb().db, "users", uid, "campaignEnrollments", id);
  await runTransaction(fb().db, async (tx) => {
    const monthRef = doc(fb().db, "users", uid, "campaignMonths", value.season);
    const [old, month, model] = await Promise.all([
      tx.get(ref),
      tx.get(monthRef),
      tx.get(doc(fb().db, "trackingRules", value.campaignId)),
    ]);
    if (old.exists()) throw new Error("Bu kampanya zaten takibinde.");
    if (!model.exists())
      throw new Error("Bu kampanyanın sayısal takip kuralı henüz yayımlanmamış.");
    const previous = month.exists() ? month.data() : { allocations: {}, pools: {}, count: 0 };
    const pool = model.data().poolKey;
    if (previous.pools[pool])
      throw new Error("Aynı müşteri ödül havuzundan bir kampanya zaten takibinde.");
    tx.set(monthRef, {
      season: value.season,
      allocations: {
        ...previous.allocations,
        [value.category]: (previous.allocations[value.category] ?? 0) + value.targetKurus,
      },
      pools: { ...previous.pools, [pool]: value.campaignId },
      count: previous.count + 1,
      lastCampaignId: value.campaignId,
      updatedAt: serverTimestamp(),
    });
    tx.set(ref, { ...data, updatedAt: serverTimestamp() });
    tx.set(
      doc(fb().db, "users", uid),
      {
        planMonth: value.season,
        planChoices: choices,
        ...(value.bankJoined ? { joined: { [value.campaignId]: true } } : {}),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  });
}
export async function addJourneyEntry(
  uid: string,
  campaign: Campaign,
  card: CatalogCard,
  season: string,
  entry: import("./types").CampaignEntry,
  today: string,
) {
  const id = `${season}_${campaign.id}`;
  const ref = doc(fb().db, "users", uid, "campaignProgress", id);
  const enrollmentRef = doc(fb().db, "users", uid, "campaignEnrollments", id);
  await runTransaction(fb().db, async (tx) => {
    const [enrolled, previous] = await Promise.all([tx.get(enrollmentRef), tx.get(ref)]);
    if (!enrolled.exists()) throw new Error("Önce kampanya koşullarını onaylayıp takibe al.");
    const enrollment = { ...enrolled.data(), id } as import("./types").CampaignEnrollment;
    if (enrollment.cardId !== card.id)
      throw new Error("Kampanyaya katıldığın kartla işlem kaydet.");
    const old = previous.exists()
      ? ({ ...previous.data(), id } as import("./types").CampaignProgress)
      : undefined;
    const clean = { ...entry, merchant: entry.merchant?.trim().toLocaleLowerCase("tr") };
    const problem = entryProblem(campaign, enrollment, clean, old, today);
    if (problem) throw new Error(problem);
    const { id: ignored, ...value } = nextJourneyProgress(campaign, card, enrollment, old, clean);
    void ignored;
    tx.set(ref, { ...value, updatedAt: serverTimestamp() });
  });
}
export function watchLeague(
  uid: string,
  season: string,
  cb: (value: import("./league").LeagueMonth) => void,
  onError: (e: Error) => void,
) {
  return onSnapshot(
    doc(fb().db, "users", uid, "gameMonths", season),
    (snap) =>
      cb(snap.exists() ? (snap.data() as import("./league").LeagueMonth) : { ...EMPTY_LEAGUE }),
    onError,
  );
}
export function watchLeaders(
  season: string,
  cb: (value: import("./league").Leader[]) => void,
  onError: (e: Error) => void,
) {
  return onSnapshot(
    query(
      collection(fb().db, "leaderboards", season, "players"),
      orderBy("score", "desc"),
      limit(50),
    ),
    (snap) =>
      cb(snap.docs.map((d) => ({ id: d.id, nickname: d.data().nickname, score: d.data().score }))),
    onError,
  );
}
export async function updateLeague(
  uid: string,
  season: string,
  action: {
    task?: import("./league").MissionId;
    tasks?: import("./league").MissionId[];
    checkin?: string;
    optIn?: boolean;
    nickname?: string;
    progressId?: string;
  },
) {
  const ref = doc(fb().db, "users", uid, "gameMonths", season);
  const publicRef = doc(fb().db, "leaderboards", season, "players", uid);
  await runTransaction(fb().db, async (tx) => {
    const snapshot = await tx.get(ref);
    const old = snapshot.exists()
      ? (snapshot.data() as import("./league").LeagueMonth)
      : { ...EMPTY_LEAGUE };
    const tasks = {
      ...old.tasks,
      ...Object.fromEntries((action.tasks ?? []).map((id) => [id, true])),
      ...(action.task ? { [action.task]: true } : {}),
    };
    const checkins = { ...old.checkins, ...(action.checkin ? { [action.checkin]: true } : {}) };
    const value = {
      tasks,
      checkins,
      score: leagueScore(tasks, checkins),
      optIn: action.optIn ?? old.optIn,
      nickname: action.nickname ?? old.nickname,
      progressId: action.progressId ?? old.progressId,
      updatedAt: serverTimestamp(),
    };
    tx.set(ref, value);
    if (value.optIn)
      tx.set(publicRef, {
        nickname: value.nickname,
        score: value.score,
        updatedAt: serverTimestamp(),
      });
    else if (old.optIn) tx.delete(publicRef);
  });
}
