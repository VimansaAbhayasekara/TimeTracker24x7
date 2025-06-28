"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Filter, BarChart3, TrendingUp, Users, Clock } from "lucide-react"
import type { DateRange } from "react-day-picker"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbLink } from "@/components/ui/breadcrumb"
import { ProjectHoursChart } from "@/components/project-hours-chart"
import { ProjectResourceAllocationChart } from "@/components/project-resource-allocation-chart"
import { OvertimeAnalysisChart } from "@/components/overtime-analysis-chart"
import { UndertimeAnalysisChart } from "@/components/undertime-analysis-chart"
import { CalendarDatePicker } from "@/components/date-range-picker"
import { HeroSection } from "@/components/hero-section"
import { useToast } from "@/hooks/use-toast"
import { Skeleton } from "@/components/ui/skeleton"

interface Project {
  id: string
  name: string
}

interface User {
  name: string
  email: string
  accountId: string
}

export default function AnalyticsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [selectedProject, setSelectedProject] = useState<string>("")
  const [selectedUser, setSelectedUser] = useState<string>("")
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  })
  const [loading, setLoading] = useState(false)
  const [analyticsData, setAnalyticsData] = useState({
    projectHours: [],
    resourceAllocation: [],
    overtimeAnalysis: [],
    undertimeAnalysis: [],
    totalHours: 0,
    totalProjects: 0,
    totalUsers: 0,
  })
  const { toast } = useToast()

  useEffect(() => {
    fetchProjects()
    fetchUsers()
  }, [])

  useEffect(() => {
    if (selectedProject) {
      filterUsersByProject()
    }
  }, [selectedProject, users, dateRange])

  useEffect(() => {
    if (dateRange?.from && dateRange?.to && selectedProject) {
      fetchAnalyticsData()
    }
  }, [dateRange, selectedProject, selectedUser])

  const fetchProjects = async () => {
    try {
      const response = await fetch("/api/jira/projects")
      if (response.ok) {
        const data = await response.json()
        // Sort projects alphabetically but keep "All Projects" first
        const sortedProjects = data.sort((a: Project, b: Project) => a.name.localeCompare(b.name))
        setProjects([{ id: "ALL", name: "All Projects" }, ...sortedProjects])
        setSelectedProject("ALL")
      }
    } catch (error) {
      console.error("Error fetching projects:", error)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/jira/users")
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      }
    } catch (error) {
      console.error("Error fetching users:", error)
    }
  }

  const filterUsersByProject = async () => {
    if (!selectedProject || !dateRange?.from || !dateRange?.to) return

    try {
      const formatDateSriLanka = (date: Date) => {
        return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split("T")[0]
      }

      const response = await fetch("/api/jira/users-by-project", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          project: selectedProject,
          startDate: formatDateSriLanka(dateRange.from),
          endDate: formatDateSriLanka(dateRange.to),
        }),
      })

      if (response.ok) {
        const projectUsers = await response.json()
        const baseOptions =
          selectedProject === "ALL"
            ? [{ name: "All Resources", email: "", accountId: "ALL" }]
            : [{ name: "The Team", email: "", accountId: "TEAM" }]

        // Sort users alphabetically but keep base options first
        const sortedUsers = projectUsers.sort((a: User, b: User) => a.name.localeCompare(b.name))
        setFilteredUsers([...baseOptions, ...sortedUsers])
        setSelectedUser(baseOptions[0].name)
      }
    } catch (error) {
      console.error("Error filtering users by project:", error)
      const baseOptions =
        selectedProject === "ALL"
          ? [{ name: "All Resources", email: "", accountId: "ALL" }]
          : [{ name: "The Team", email: "", accountId: "TEAM" }]
      setFilteredUsers(baseOptions)
      setSelectedUser(baseOptions[0].name)
    }
  }

  const fetchAnalyticsData = async () => {
    if (!dateRange?.from || !dateRange?.to || !selectedProject) return

    setLoading(true)
    try {
      const formatDateSriLanka = (date: Date) => {
        return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split("T")[0]
      }

      const response = await fetch("/api/jira/analytics-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startDate: formatDateSriLanka(dateRange.from),
          endDate: formatDateSriLanka(dateRange.to),
          project: selectedProject,
          user: selectedUser,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setAnalyticsData(data)

        toast({
          title: "Analytics Updated",
          description: `Processed analytics for ${selectedProject === "ALL" ? "all projects" : selectedProject}`,
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch analytics data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDateSelect = (range: { from: Date; to: Date }) => {
    setDateRange({ from: range.from, to: range.to })
  }

  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem>
              <BreadcrumbPage>Analytics</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      <div className="flex-1 space-y-6 p-4 md:p-6 overflow-auto max-h-screen">
        {/* Hero Section */}
        <HeroSection
          title="Advanced Analytics"
          subtitle="Comprehensive insights and data visualization"
          description="Dive deep into your team's productivity patterns, project performance, and resource utilization with powerful analytics tools."
          badgeText="Live Analytics"
          badgeIcon={<BarChart3 className="w-6 h-6 text-primary" />}
          primaryAction={{
            text: "View Reports",
            href: "/reports",
          }}
          secondaryAction={{
            text: "Export Data",
            href: "/jira-timesheets/by-project",
          }}
          backgroundGradient="from-blue-500/20 via-purple-500/10 to-background"
        />

        {/* Filters */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Analytics Filters
              </CardTitle>
              <CardDescription>Configure your analytics view</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date Range</label>
                  <CalendarDatePicker
                    date={dateRange}
                    onDateSelect={handleDateSelect}
                    numberOfMonths={2}
                    placeholder="Select date range"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Project *</label>
                  <Select value={selectedProject} onValueChange={setSelectedProject}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select project first" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Resource</label>
                  <Select value={selectedUser} onValueChange={setSelectedUser} disabled={!selectedProject}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select resource" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredUsers.map((user) => (
                        <SelectItem key={user.accountId} value={user.name}>
                          {user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Summary Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Hours</p>
                  {loading ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold">{analyticsData.totalHours}h</p>
                  )}
                </div>
                <Clock className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Projects</p>
                  {loading ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold">{analyticsData.totalProjects}</p>
                  )}
                </div>
                <BarChart3 className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Users</p>
                  {loading ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold">{analyticsData.totalUsers}</p>
                  )}
                </div>
                <Users className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Avg Hours/Project</p>
                  {loading ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold">
                      {analyticsData.totalProjects > 0
                        ? Math.round((analyticsData.totalHours / analyticsData.totalProjects) * 100) / 100
                        : 0}
                      h
                    </p>
                  )}
                </div>
                <TrendingUp className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Charts - Full Width */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-6"
        >
          <ProjectHoursChart data={analyticsData.projectHours} loading={loading} />
          <ProjectResourceAllocationChart data={analyticsData.resourceAllocation} loading={loading} />
          <OvertimeAnalysisChart data={analyticsData.overtimeAnalysis} loading={loading} />
          <UndertimeAnalysisChart data={analyticsData.undertimeAnalysis} loading={loading} />
        </motion.div>
      </div>
    </SidebarInset>
  )
}
