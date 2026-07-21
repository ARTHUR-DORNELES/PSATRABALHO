// ─────────────────────────────────────────────────────────────────────────
// Integração com o Banlek (banco de fotos da PSA — fotos livres, preço 0).
// A API é GraphQL com persisted query (getPicturesByAlbum), pública.
// O id numérico do álbum é o HEX do prefixo do slug da URL
// (ex: /album/1f71ad-... → 0x1f71ad = 2060717).
// ─────────────────────────────────────────────────────────────────────────

const GRAPHQL = "https://graphql.banlek.com/graphql";
const PERSISTED_HASH = "d76155057d290362f3d9ac865c9becafd536efd56f517c8d005a14fdca6fd643";

export interface BanlekPhoto {
  id: number;
  mini: string;
  med: string;
  original: string;
}

/** Aceita id numérico, slug hex, ou URL completa do álbum → id numérico. */
export function albumIdFrom(input: string): number | null {
  const s = input.trim();
  if (/^\d{4,}$/.test(s)) return Number(s);
  // pega o prefixo hex do slug (antes do primeiro "-"), com ou sem /album/
  const m = s.match(/(?:album\/)?([0-9a-f]{4,})(?:-|$|\/|\?)/i);
  if (m) {
    const n = parseInt(m[1], 16);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

export async function fetchAlbumPhotos(
  albumId: number,
  page = 1,
  itemsPerPage = 60,
): Promise<BanlekPhoto[]> {
  const variables = {
    albumId,
    childrenId: 0,
    numeroAtletaAutomatico: false,
    nav: { page, itemsPerPage },
  };
  const extensions = { persistedQuery: { version: 1, sha256Hash: PERSISTED_HASH } };
  const url =
    `${GRAPHQL}?operationName=getPicturesByAlbum` +
    `&variables=${encodeURIComponent(JSON.stringify(variables))}` +
    `&extensions=${encodeURIComponent(JSON.stringify(extensions))}`;

  const res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0", accept: "application/json" } });
  if (!res.ok) throw new Error(`Banlek respondeu ${res.status}`);
  const json = await res.json();
  const items = json?.data?.fotos?.items;
  if (!Array.isArray(items)) return [];
  return items.map((it: any) => ({
    id: it.id,
    mini: it.mini,
    med: it.med || it.original || it.mini,
    original: it.original || it.med || it.mini,
  }));
}
