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
  const [games, progress] = await Promise.all([
    getDocs(collection(fb().db, "users", uid, "gameMonths")),
    getDocs(collection(fb().db, "users", uid, "campaignProgress")),
  ]);
  return {
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
export async function addProgress(
  uid: string,
  season: string,
  campaign: Campaign,
  cardId: string,
  amountKurus: number,
  day: string,
) {
  if (campaign.category === "tumu" || !Number.isSafeInteger(amountKurus) || amountKurus <= 0)
    throw new Error("Geçersiz tutar.");
  const ref = doc(fb().db, "users", uid, "campaignProgress", `${season}_${campaign.id}`);
  await runTransaction(fb().db, async (tx) => {
    const snap = await tx.get(ref);
    const old = snap.exists() ? snap.data() : { entries: [], totalKurus: 0 };
    tx.set(ref, {
      season,
      campaignId: campaign.id,
      cardId,
      category: campaign.category,
      entries: [...old.entries, { amountKurus, day }],
      totalKurus: old.totalKurus + amountKurus,
      updatedAt: serverTimestamp(),
    });
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
    const tasks = { ...old.tasks, ...(action.task ? { [action.task]: true } : {}) };
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
