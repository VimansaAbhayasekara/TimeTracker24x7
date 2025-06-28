import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "TimeTrack24X7 - Professional Time Tracking",
  description: "Advanced time tracking and analytics for JIRA and Redmine",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <SidebarProvider>
            <AppSidebar />
            <main className="flex-1 overflow-hidden">{children}</main>
          </SidebarProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
