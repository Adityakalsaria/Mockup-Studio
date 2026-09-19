// Which deployment is live. The page compares this with the one it was built
// as -- see `UpdateNotice`. Uncached: a cached answer would never change.
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    { id: process.env.VERCEL_GIT_COMMIT_SHA ?? null },
    { headers: { "Cache-Control": "no-store" } },
  );
}
