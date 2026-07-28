type AladinItem = Record<string, any>;

function categorize(categoryName = "") {
  if (/만화|코믹/.test(categoryName)) return "comic";
  if (/어린이|유아/.test(categoryName)) return "children";
  if (/그림책/.test(categoryName)) return "picturebook";
  if (/사진|화보|도감/.test(categoryName)) return "photo";
  if (/시집/.test(categoryName)) return "poetry";
  if (/소설|희곡/.test(categoryName)) return "novel";
  if (/에세이/.test(categoryName)) return "essay";
  if (/인문/.test(categoryName)) return "humanities";
  if (/자기계발/.test(categoryName)) return "selfhelp";
  return "default";
}

const unsupported = new Set(["comic", "children", "poetry", "picturebook", "photo"]);

function normalize(item: AladinItem) {
  const category = categorize(item.categoryName);
  return {
    title: item.title,
    author: item.author,
    pages: item.subInfo?.itemPage ?? item.itemPage ?? 0,
    category,
    categoryName: item.categoryName,
    isbn: item.isbn13 || item.isbn,
    cover: item.cover ?? "",
    description: item.description ?? "",
    publisher: item.publisher ?? "",
    publishedAt: item.pubDate ?? "",
    link: item.link ?? "",
    supported: !unsupported.has(category),
  };
}

function requestUrl(path: string) {
  const key = process.env.ALADIN_TTB_KEY;
  if (!key) throw new Error("ALADIN_TTB_KEY is not configured");
  const url = new URL(`https://www.aladin.co.kr/ttb/api/${path}`);
  url.searchParams.set("ttbkey", key);
  url.searchParams.set("MaxResults", "12");
  url.searchParams.set("start", "1");
  url.searchParams.set("SearchTarget", "Book");
  url.searchParams.set("Cover", "Big");
  url.searchParams.set("Output", "js");
  url.searchParams.set("Version", "20131101");
  url.searchParams.set("OptResult", "itemPage");
  return url;
}

async function request(url: URL) {
  const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error(`Aladin API ${response.status}`);
  const data = await response.json();
  if (data.errorCode) throw new Error(data.errorMessage ?? data.errorCode);
  return (data.item ?? []).map(normalize);
}

export async function searchAladin(query: string) {
  const url = requestUrl("ItemSearch.aspx");
  url.searchParams.set("Query", query);
  url.searchParams.set("QueryType", "Keyword");
  return request(url);
}

export async function listAladinBestsellers() {
  const url = requestUrl("ItemList.aspx");
  url.searchParams.set("QueryType", "Bestseller");
  return request(url);
}

export async function lookupAladinBook(isbn: string) {
  const url = requestUrl("ItemLookUp.aspx");
  url.searchParams.delete("MaxResults");
  url.searchParams.delete("start");
  url.searchParams.delete("SearchTarget");
  url.searchParams.set("itemIdType", "ISBN13");
  url.searchParams.set("ItemId", isbn);
  const [book] = await request(url);
  return book ?? null;
}
