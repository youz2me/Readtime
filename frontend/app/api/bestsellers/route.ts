import { listAladinBestsellers } from "../_lib/aladin";

export async function GET() {
  const items = await listAladinBestsellers();
  return Response.json({ count: items.length, items });
}
