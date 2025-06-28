"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  Users,
  BarChart3,
  TrendingUp,
  FileText,
  Activity,
  Zap,
  ArrowRight,
  Target,
  Briefcase,
  Clock,
} from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb"
import { DashboardCharts } from "@/components/dashboard-charts"
import { RealtimeStats } from "@/components/realtime-stats"
import { useToast } from "@/hooks/use-toast"

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.5,
    },
  },
}

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalProjects: 0,
    totalUsers: 0,
    totalHours: 0,
    activeProjects: 0,
  })
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true)

        // Fetch projects and users in parallel
        const [projectsRes, usersRes] = await Promise.all([fetch("/api/jira/projects"), fetch("/api/jira/users")])

        if (!projectsRes.ok || !usersRes.ok) {
          throw new Error("Failed to fetch data")
        }

        const [projects, users] = await Promise.all([projectsRes.json(), usersRes.json()])

        // Fetch recent worklog data to calculate total hours
        const endDate = new Date()
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - 30) // Last 30 days

        const worklogRes = await fetch("/api/jira/generate-report-by-project", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            startDate: startDate.toISOString().split("T")[0],
            endDate: endDate.toISOString().split("T")[0],
            project: "ALL",
          }),
        })

        let totalHours = 0
        if (worklogRes.ok) {
          const worklogResponse = await worklogRes.json()
          // Check if response has data property (paginated response) or is direct array
          const worklogData = worklogResponse.data || worklogResponse

          if (Array.isArray(worklogData)) {
            totalHours = worklogData.reduce((sum: number, entry: any) => {
              const [hours, minutes] = entry.Hours.split("h")
              const h = Number.parseInt(hours) || 0
              const m = Number.parseInt((minutes || "").replace("m", "").trim()) || 0
              return sum + h + m / 60
            }, 0)
          }
        }

        setStats({
          totalProjects: projects.length || 0,
          totalUsers: users.length || 0,
          totalHours: Math.round(totalHours),
          activeProjects: projects.length || 0,
        })

        toast({
          title: "Dashboard Updated",
          description: `Loaded ${projects.length} projects and ${users.length} users`,
        })
      } catch (error) {
        console.error("Error fetching stats:", error)
        toast({
          title: "Error",
          description: "Failed to load dashboard data",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [toast])

  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>Dashboard</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      <div className="flex-1 space-y-6 p-6 overflow-auto">
        {/* Hero Section */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-background p-8"
        >
          <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]" />
          <motion.div variants={itemVariants} className="relative">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/20">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <Badge variant="secondary" className="animate-pulse-slow">
                Live Dashboard
              </Badge>
            </div>
            <h1 className="text-4xl font-bold tracking-tight mb-2">Welcome to TimeTrack24X7</h1>
            <p className="text-xl text-muted-foreground mb-6">
              Professional time tracking and analytics for your organization
            </p>
            <div className="flex flex-wrap gap-4">
              <Button size="lg" asChild>
                <Link href="/jira-timesheets/by-project">
                  Get Started <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/analytics">View Analytics</Link>
              </Button>
            </div>
          </motion.div>
        </motion.div>

        {/* Real-time Stats */}
        <RealtimeStats stats={stats} loading={loading} />

        {/* Platform Cards */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="grid gap-6 md:grid-cols-2"
        >
          {/* JIRA Platform Card */}
          <motion.div variants={itemVariants}>
            <Card className="group relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-500/10">
                      <Activity className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl">JIRA Integration</CardTitle>
                      <CardDescription>Comprehensive time tracking</CardDescription>
                    </div>
                  </div>
                  <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Active</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Link href="/jira-timesheets/by-project">
                    <Card className="group/inner hover:bg-accent/50 transition-colors cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                            <Briefcase className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h4 className="font-semibold">Projects</h4>
                            <p className="text-sm text-muted-foreground">
                              {loading ? "Loading..." : `${stats.totalProjects} active`}
                            </p>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 ml-auto opacity-0 group-hover/inner:opacity-100 transition-opacity" />
                      </CardContent>
                    </Card>
                  </Link>

                  <Link href="/jira-timesheets/by-resource">
                    <Card className="group/inner hover:bg-accent/50 transition-colors cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                            <Users className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h4 className="font-semibold">Resources</h4>
                            <p className="text-sm text-muted-foreground">
                              {loading ? "Loading..." : `${stats.totalUsers} users`}
                            </p>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 ml-auto opacity-0 group-hover/inner:opacity-100 transition-opacity" />
                      </CardContent>
                    </Card>
                  </Link>
                </div>

                <div className="pt-2">
                  <Button className="w-full bg-transparent" variant="outline" asChild>
                    <Link href="/jira-timesheets/by-project">
                      Access JIRA Timesheets <ArrowRight className="ml-2 w-4 h-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Redmine Platform Card */}
          <motion.div variants={itemVariants}>
            <Card className="group relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 opacity-60">
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-red-500/10">
                      <Target className="w-6 h-6 text-red-500" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl">Redmine Integration</CardTitle>
                      <CardDescription>Coming soon</CardDescription>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                    Coming Soon
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card className="opacity-50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted/50">
                          <Briefcase className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-muted-foreground">Projects</h4>
                          <p className="text-sm text-muted-foreground">Coming soon</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="opacity-50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted/50">
                          <Users className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-muted-foreground">Resources</h4>
                          <p className="text-sm text-muted-foreground">Coming soon</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="pt-2">
                  <Button className="w-full bg-transparent" variant="outline" disabled>
                    Coming Soon
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Analytics Dashboard */}
        <DashboardCharts />

        {/* Quick Actions */}
        <motion.div initial="hidden" animate="visible" variants={containerVariants}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Quick Actions
              </CardTitle>
              <CardDescription>Frequently used features and shortcuts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <motion.div variants={itemVariants}>
                  <Button variant="outline" className="w-full justify-start h-auto p-4 bg-transparent" asChild>
                    <Link href="/reports">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5" />
                        <div className="text-left">
                          <div className="font-semibold">Generate Report</div>
                          <div className="text-sm text-muted-foreground">Export timesheet data</div>
                        </div>
                      </div>
                    </Link>
                  </Button>
                </motion.div>

                <motion.div variants={itemVariants}>
                  <Button variant="outline" className="w-full justify-start h-auto p-4 bg-transparent" asChild>
                    <Link href="/analytics">
                      <div className="flex items-center gap-3">
                        <BarChart3 className="w-5 h-5" />
                        <div className="text-left">
                          <div className="font-semibold">View Analytics</div>
                          <div className="text-sm text-muted-foreground">Detailed insights</div>
                        </div>
                      </div>
                    </Link>
                  </Button>
                </motion.div>

                <motion.div variants={itemVariants}>
                  <Button variant="outline" className="w-full justify-start h-auto p-4 bg-transparent" asChild>
                    <Link href="/settings">
                      <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5" />
                        <div className="text-left">
                          <div className="font-semibold">Settings</div>
                          <div className="text-sm text-muted-foreground">Configure preferences</div>
                        </div>
                      </div>
                    </Link>
                  </Button>
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </SidebarInset>
  )
}
