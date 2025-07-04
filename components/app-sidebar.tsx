"use client"

import type * as React from "react"
import { BarChart3, Clock, Home, Settings, FileText, TrendingUp } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

const data = {
  user: {
    name: "TimeTrack24X7",
    email: "admin@timetrack24x7.com",
    avatar: "/placeholder.svg?height=32&width=32",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/",
      icon: Home,
    },
    {
      title: "JIRA Timesheets",
      icon: Clock,
      items: [
        {
          title: "By Project",
          url: "/jira-timesheets/by-project",
        },
        {
          title: "By Resource",
          url: "/jira-timesheets/by-resource",
        },
      ],
    },
    {
      title: "Analytics",
      url: "/analytics",
      icon: BarChart3,
    },
    {
      title: "Reports",
      url: "/reports",
      icon: FileText,
    },
    {
      title: "Settings",
      url: "/settings",
      icon: Settings,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <TrendingUp className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">TimeTrack24X7</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Platform</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {data.navMain.map((item) => (
                <SidebarMenuItem key={item.title}>
                  {item.items ? (
                    <div className="space-y-1">
                      <SidebarMenuButton asChild>
                        <div className="flex items-center gap-2 px-2 py-1.5 text-sm font-medium">
                          <item.icon className="size-4" />
                          <span>{item.title}</span>
                        </div>
                      </SidebarMenuButton>
                      <div className="ml-6 space-y-1">
                        {item.items.map((subItem) => (
                          <SidebarMenuButton 
                            key={subItem.title} 
                            asChild 
                            className={cn(
                              "hover:bg-primary/10",
                              pathname === subItem.url && "bg-primary/10 text-primary"
                            )}
                          >
                            <Link href={subItem.url}>
                              <span>{subItem.title}</span>
                            </Link>
                          </SidebarMenuButton>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <SidebarMenuButton 
                      asChild 
                      className={cn(
                        "hover:bg-primary/10",
                        pathname === item.url && "bg-primary/10 text-primary"
                      )}
                    >
                      <Link href={item.url}>
                        <item.icon className={cn(
                          "size-4",
                          pathname === item.url ? "text-primary" : "text-muted-foreground"
                        )} />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={data.user.avatar || "/placeholder.svg"} alt={data.user.name} />
                  <AvatarFallback className="rounded-lg">TT</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{data.user.name}</span>
                  <span className="truncate text-xs">{data.user.email}</span>
                </div>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}