import { NextResponse } from "next/server";
import { albumIdFrom, fetchAlbumPhotos } from "@/lib/banlek";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const album = params.get("album") ?? "";
  const page = Math.max(1, Number(params.get("page")) || 1);

  const albumId = albumIdFrom(album);
  if (!albumId) {
    return NextResponse.json(
      { error: "Álbum inválido. Cole a URL do álbum do Banlek (ex: banlek.com/album/1f71ad-...)." },
      { status: 400 },
    );
  }

  try {
    const photos = await fetchAlbumPhotos(albumId, page);
    return NextResponse.json({ albumId, page, photos });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Falha ao buscar fotos do Banlek." },
      { status: 502 },
    );
  }
}
