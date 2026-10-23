import type { Metadata } from "next";
import { cookies } from "next/headers";
import { I18nProvider } from "@/src/i18n/provider";
import { LOCALE_COOKIE, localeCode, normalizeLocale, translate } from "@/src/i18n/config";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/src/lib/utils";
import { LocalizedToaster } from "@/src/i18n/toaster";
import { ThemeProvider } from "@/src/providers/theme-provider";
import { QueryProvider } from "@/src/providers/query-provider";
import { TooltipProvider } from "@/src/components/ui/tooltip";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const locale = normalizeLocale(cookieStore.get(LOCALE_COOKIE)?.value);
  return {
    title: "QuickVoice",
    description: translate(locale, "QuickVoice is a platform for creating and managing voice agents."),
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const initialLocale = normalizeLocale(cookieStore.get(LOCALE_COOKIE)?.value);
  return (
    <html
      lang={localeCode(initialLocale)}
      suppressHydrationWarning
      className={cn(
        "h-full antialiased",
        geistSans.variable,
        geistMono.variable,
        "font-sans",
        inter.variable
      )}
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <I18nProvider initialLocale={initialLocale}>
          <ThemeProvider>
          <QueryProvider>
            <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
          </QueryProvider>
          <LocalizedToaster />
          </ThemeProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
