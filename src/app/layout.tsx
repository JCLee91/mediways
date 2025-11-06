import type { Metadata } from "next";
import "./globals.css";
import ClientBody from "./ClientBody";
import LoadingBar from "@/components/LoadingBar";
import UserStoreInitializer from "@/components/UserStoreInitializer";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "메디웨이즈 – 안전한 의료광고 컨텐츠를 AI와 함께",
  description: "클릭 한 번으로 안심하고 쓸 수 있는 의료광고 컨텐츠를 생성해보세요! 의료법을 준수하는 블로그, SNS, 유튜브 스크립트를 AI가 자동으로 작성합니다.",
  keywords: "의료광고, 의료마케팅, AI 콘텐츠, 의료법 준수, 병원 마케팅, 의료 블로그, 의료 SNS, 유튜브 스크립트",
  authors: [{ name: "Mediways" }],
  creator: "Mediways",
  publisher: "Mediways",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: 'https://mediways.ai',
    title: '메디웨이즈 – 안전한 의료광고 컨텐츠를 AI와 함께',
    description: '의료법을 준수하는 안전한 의료광고 콘텐츠를 AI가 자동으로 생성합니다. 블로그, SNS, 유튜브 스크립트를 클릭 한 번으로!',
    siteName: '메디웨이즈',
    images: [{
      url: '/og-image.png',
      width: 1200,
      height: 630,
      alt: '메디웨이즈 - AI 의료광고 콘텐츠 생성 플랫폼',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '메디웨이즈 – 안전한 의료광고 컨텐츠를 AI와 함께',
    description: '의료법을 준수하는 안전한 의료광고 콘텐츠를 AI가 자동으로 생성합니다.',
    images: ['/og-image.png'],
  },
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
  metadataBase: new URL('https://mediways.ai'),
  alternates: {
    canonical: '/',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="dark">
      <ClientBody>
        <UserStoreInitializer />
        <LoadingBar />
        <div className="min-h-screen">
          {children}
        </div>
        <Toaster 
          theme="dark"
          position="bottom-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#1e2029',
              color: 'white',
              border: '1px solid rgb(31 41 55)',
            },
            classNames: {
              success: 'sonner-toast-success',
              error: 'sonner-toast-error',
            },
          }}
        />
      </ClientBody>
    </html>
  );
}
