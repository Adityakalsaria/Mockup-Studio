import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

/* Development only: writes one rendered landing still as WebP. */
export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") return new Response(null, { status: 404 });
  const { id, dataUrl } = (await request.json()) as { id: string; dataUrl: string };
  if (!/^[a-z0-9-]+$/.test(id) || !dataUrl.startsWith("data:image/png;base64,")) {
    return new Response("bad shot", { status: 400 });
  }
  const dir = path.join(process.cwd(), "public/landing/shots");
  await mkdir(dir, { recursive: true });
  const png = Buffer.from(dataUrl.slice("data:image/png;base64,".length), "base64");
  await writeFile(path.join(dir, `${id}.webp`), await sharp(png).webp({ quality: 86 }).toBuffer());
  return Response.json({ ok: true });
}
