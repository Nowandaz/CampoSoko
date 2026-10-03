import type { Metadata, Viewport } from "next";
import "./globals.css";
import { APP_NAME, APP_TAGLINE } from "@/config/site";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: { default: `${APP_NAME} - ${APP_TAGLINE}`, template: `%s | ${APP_NAME}` },
  description: "Buy, sell and request goods and online services on your campus.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

// Sets the theme before paint to avoid a flash (light is the default).
const themeScript = `try{var t=localStorage.getItem('theme');if(t==='dark')document.documentElement.dataset.theme='dark'}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body className="min-h-dvh flex flex-col antialiased">
        <Header />
        <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-6">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
