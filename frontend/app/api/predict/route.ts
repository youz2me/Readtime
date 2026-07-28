const charsPerPage: Record<string, number> = {
  novel: 600,
  essay: 500,
  humanities: 700,
  selfhelp: 680,
  default: 620,
};

export async function POST(request: Request) {
  const { pages, category = "default", cpm = 500, favorites = [] } = await request.json();
  if (!Number.isFinite(pages) || pages < 1 || !Number.isFinite(cpm) || cpm < 1) {
    return Response.json({ message: "올바른 페이지 수와 읽기 속도가 필요합니다." }, { status: 400 });
  }
  const coefficient = favorites.includes(category) ? 0.9 : favorites.length ? 1.15 : 1;
  const minutes = Math.max(1, Math.round((pages * (charsPerPage[category] ?? charsPerPage.default) * coefficient) / cpm));
  return Response.json({
    minutes,
    range: {
      low: Math.max(1, Math.round(minutes * 0.78)),
      high: Math.round(minutes * 1.22),
    },
  });
}
