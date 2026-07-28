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
    title: "Readtime — 책 완독 시간 예측",
    description: "페이지 수, 장르, 개인 읽기 속도로 책의 예상 완독 시간을 계산합니다.",
    icons: {
      icon: "/favicon.svg",
      shortcut: "/favicon.svg",
    },
    openGraph: {
      title: "Readtime — 이 책, 오늘 안에 읽을 수 있을까?",
      description: "내 읽기 속도에 맞춘 책 완독 시간 예측기",
      type: "website",
      images: [{ url: `${origin}/og.png`, width: 1748, height: 909, alt: "Readtime 책 완독 시간 예측" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Readtime — 책 완독 시간 예측",
      description: "내 읽기 속도에 맞춘 책 완독 시간 예측기",
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
