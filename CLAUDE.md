# CLAUDE.md — KartPlan Lite

Kredi kartı kampanyalarına göre "hangi harcamayı hangi kartla yapmalıyım" planı çıkaran, yalnızca
Firebase (Hosting + Auth + Firestore) ile çalışan hafif web uygulaması. Ayrıntı: `README.md`.

## Stack ve komutlar

Vite + React 19 + TypeScript (strict, `noUncheckedIndexedAccess`), düz CSS, Firebase JS SDK, Vitest.

```bash
npm install
npm run dev            # http://localhost:5173 (.env ya da VITE_USE_EMULATORS=1)
npm test               # Vitest
npm run typecheck
npm run format         # Prettier
npm run build
npm run deploy         # yerelde, firebase login sonrası
npm run deploy:ci      # FIREBASE_PROJECT_ID + FIREBASE_SERVICE_ACCOUNT ile etkileşimsiz
```

## Yapı

- `src/lib/optimizer.ts` (aylık plan, açgözlü, durumsuz), `advisor.ts` (tek alışveriş), `money.ts`,
  `dates.ts` — saf, testli. Yeni kural → test.
- Firestore erişimi yalnızca `src/lib/data.ts`; oturum ve canlı veri `src/lib/store.tsx`.
- Yetki `firestore.rules`: `users/{uid}` yalnızca sahibi (alanlar sınırlı — yeni alan → kurala ekle),
  `cards`/`campaigns` yalnızca admin yazar, `admins/{uid}` konsoldan.
- Yönlendirme `src/lib/router.tsx` (küçük history router), sayfalar `src/pages/`, ortak bileşenler
  `src/components/`. Renk/yazı değişkenleri `src/styles.css` başında.

## Kurallar

- Para kuruş cinsinden tamsayı (`...Kurus`), oran baz puan (`...Bps`); float ile para hesabı yok.
- Kart numarası, CVV, son kullanma tarihi hiçbir formda alınmaz (`looksLikeCardNumber`).
- Katalog oranları banka kaynağından doğrulanmadan girilmez; örnek kampanyalar `demo: true`.
- Kullanıcıya görünen metinler Türkçe. Gizli anahtar repoya girmez; yeni ortam değişkeni →
  `.env.example`.
- Bitti tanımı: `npm run format:check && npm run typecheck && npm test && npm run build` yeşil.
