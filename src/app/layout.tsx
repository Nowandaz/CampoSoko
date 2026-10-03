import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { APP_NAME, APP_TAGLINE } from "@/config/site";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BottomNav } from "@/components/BottomNav";
import { FeedbackProvider, FlashToast } from "@/components/feedback";
import { InstallPrompt } from "@/components/InstallPrompt";
import { getMe } from "@/lib/auth";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: { default: `${APP_NAME} - ${APP_TAGLINE}`, template: `%s | ${APP_NAME}` },
  description: "Buy, sell and request goods and online services on your campus.",
  applicationName: APP_NAME,
  appleWebApp: { capable: true, title: APP_NAME, statusBarStyle: "default" },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#ea580c" };

// Sets the theme before paint to avoid a flash (light is the default).
const themeScript = `try{var t=localStorage.getItem('theme');if(t==='dark')document.documentElement.dataset.theme='dark'}catch(e){}`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const me = await getMe();
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body className="min-h-dvh flex flex-col antialiased">
        <FeedbackProvider>
        <FlashToast />
        <InstallPrompt />
        <Header />
        <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-8">{children}</main>
        <Footer padForNav={Boolean(me)} />
        {me && <BottomNav />}
        </FeedbackProvider>
      </body>
    </html>
  );
}
