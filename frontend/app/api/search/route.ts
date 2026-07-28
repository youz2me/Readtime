import { searchAladin } from "../_lib/aladin";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (!query) return Response.json({ query, count: 0, items: [] });
  const items = await searchAladin(query);
  return Response.json({ query, count: items.length, items });
}
