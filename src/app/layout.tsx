import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ShopProvider } from "@/components/ShopContext";
import { AuthProvider } from "@/components/AuthContext";
import Navbar from "@/components/Navbar";
import Providers from "@/components/Providers";
import { OfflineProvider } from '@/lib/offline-context';
import { OfflineStatus } from '@/components/OfflineStatus';
import { OfflineToggle } from '@/components/OfflineToggle';
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Agrovet Management System",
  description: "Manage your agrovet shop inventory and sales",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-emerald-950`}>
        <OfflineProvider>
          <Providers>
            <AuthProvider>
              <ShopProvider>
                <div className="flex flex-col min-h-screen">
                  <Navbar />
                  <main className="flex-1">
                    {children}
                  </main>
                </div>
                <OfflineStatus />
                <OfflineToggle />
                <Toaster position="top-right" />
              </ShopProvider>
            </AuthProvider>
          </Providers>
        </OfflineProvider>
      </body>
    </html>
  );
}
