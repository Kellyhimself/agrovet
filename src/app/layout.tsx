import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { OfflineStatus } from '@/components/OfflineStatus'
import { OfflineToggle } from '@/components/OfflineToggle'
import { Toaster } from 'sonner'
import Providers from '@/components/Providers'

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Agrovet Management System",
  description: "Manage your agrovet business efficiently",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-1 pt-20">
              {children}
            </main>
          </div>
          <OfflineStatus />
          <OfflineToggle />
          <Toaster position="top-right" />
        </Providers>
      </body>
    </html>
  );
}
