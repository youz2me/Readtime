import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;

  return {
    metadataBase: new URL(origin),
    title: "Readtime — 내 속도로 계산하는 완독 시간",
    description: "좋아하는 장르로 읽기 속도를 측정하고, 책의 예상 완독 시간과 다음 책을 추천받아보세요.",
    icons: {
      icon: "/favicon.svg",
      shortcut: "/favicon.svg",
    },
    openGraph: {
      title: "Readtime — 내 속도로, 이 책은 얼마나 걸릴까?",
      description: "장르별 읽기 속도 측정부터 완독 시간과 다음 책 추천까지",
      type: "website",
      images: [{ url: `${origin}/og.png`, width: 1748, height: 909, alt: "Readtime 책 완독 시간 예측" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Readtime — 내 속도로 계산하는 완독 시간",
      description: "장르별 읽기 속도 측정부터 완독 시간과 다음 책 추천까지",
      images: [`${origin}/og.png`],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
