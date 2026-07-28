import { lookupAladinBook } from "../../_lib/aladin";

export async function GET(_request: Request, context: { params: Promise<{ isbn: string }> }) {
  const { isbn } = await context.params;
  if (!/^\d{10,13}$/.test(isbn)) return Response.json({ message: "올바른 ISBN이 필요합니다." }, { status: 400 });
  const item = await lookupAladinBook(isbn);
  if (!item) return Response.json({ message: "책 정보를 찾지 못했습니다." }, { status: 404 });
  return Response.json({ item });
}
