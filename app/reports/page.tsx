"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  FileText,
  Download,
  Calendar,
  Users,
  BarChart3,
  TrendingUp,
  Clock,
  Target,
  Building,
  DollarSign,
} from "lucide-react"
import type { DateRange } from "react-day-picker"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbLink } from "@/components/ui/breadcrumb"
import { CalendarDatePicker } from "@/components/date-range-picker"
import { HeroSection } from "@/components/hero-section"
import { useToast } from "@/hooks/use-toast"

interface Project {
  id: string
  name: string
}

interface User {
  name: string
  email: string
  accountId: string
}

interface ReportTemplate {
  id: string
  title: string
  description: string
  icon: any
  color: string
  bgColor: string
  audience: string
  type: "project" | "user" | "organization"
  endpoint: string
}

const reportTemplates: ReportTemplate[] = [
  {
    id: "executive-summary",
    title: "Executive Summary Report",
    description:
      "High-level overview of organizational productivity, resource utilization, and project performance metrics",
    icon: TrendingUp,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    audience: "CEO, Executive Team",
    type: "organization",
    endpoint: "/api/jira/reports/executive-summary",
  },
  {
    id: "project-performance",
    title: "Project Performance Report",
    description: "Detailed analysis of project timelines, resource allocation, deliverables, and budget utilization",
    icon: Target,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    audience: "Project Managers",
    type: "project",
    endpoint: "/api/jira/generate-report-by-project",
  },
  {
    id: "resource-utilization",
    title: "Resource Utilization Report",
    description:
      "Individual and team productivity metrics with overtime analysis, capacity planning, and workload distribution",
    icon: Users,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    audience: "HR, Team Leads",
    type: "user",
    endpoint: "/api/jira/generate-report-by-user",
  },
  {
    id: "time-tracking-summary",
    title: "Time Tracking Summary",
    description:
      "Comprehensive timesheet data with billable hours breakdown, project time allocation, and efficiency metrics",
    icon: Clock,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    audience: "Finance, Billing",
    type: "organization",
    endpoint: "/api/jira/generate-report-by-project",
  },
  {
    id: "productivity-insights",
    title: "Productivity Insights",
    description:
      "Advanced analytics on work patterns, efficiency metrics, peak performance hours, and team collaboration",
    icon: BarChart3,
    color: "text-indigo-500",
    bgColor: "bg-indigo-500/10",
    audience: "Operations, Management",
    type: "organization",
    endpoint: "/api/jira/generate-report-by-project",
  },
  {
    id: "financial-overview",
    title: "Financial Overview Report",
    description: "Cost analysis, budget tracking, resource costs, and ROI metrics for projects and teams",
    icon: DollarSign,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
    audience: "Finance, Accounting",
    type: "organization",
    endpoint: "/api/jira/generate-report-by-project",
  },
  {
    id: "department-analysis",
    title: "Department Analysis",
    description:
      "Cross-departmental performance comparison, resource allocation, and interdepartmental collaboration metrics",
    icon: Building,
    color: "text-cyan-500",
    bgColor: "bg-cyan-500/10",
    audience: "Department Heads",
    type: "organization",
    endpoint: "/api/jira/generate-report-by-project",
  },
  {
    id: "individual-performance",
    title: "Individual Performance Report",
    description: "Personal productivity report with goals, achievements, skill development, and performance trends",
    icon: FileText,
    color: "text-pink-500",
    bgColor: "bg-pink-500/10",
    audience: "Individual Contributors",
    type: "user",
    endpoint: "/api/jira/generate-report-by-user",
  },
]

export default function ReportsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [selectedProject, setSelectedProject] = useState<string>("ALL")
  const [selectedUser, setSelectedUser] = useState<string>("ALL")
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  })
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchProjects()
    fetchUsers()
  }, [])

  const fetchProjects = async () => {
    try {
      const response = await fetch("/api/jira/projects")
      if (response.ok) {
        const data = await response.json()
        setProjects([{ id: "ALL", name: "All Projects" }, ...data])
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
        setUsers([{ name: "ALL", email: "", accountId: "ALL" }, ...data])
      }
    } catch (error) {
      console.error("Error fetching users:", error)
    }
  }

  const generateReport = async (template: ReportTemplate) => {
    if (!dateRange?.from || !dateRange?.to) {
      toast({
        title: "Error",
        description: "Please select both start and end dates",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const formatDateSriLanka = (date: Date) => {
        return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split("T")[0]
      }

      const params: any = {
        startDate: formatDateSriLanka(dateRange.from),
        endDate: formatDateSriLanka(dateRange.to),
        reportType: template.id,
      }

      // Add filters based on report type
      if (template.type === "project" || template.type === "organization") {
        params.project = selectedProject
      }
      if (template.type === "user") {
        params.user = selectedUser
      }

      const url = `${template.endpoint}?${new URLSearchParams(params).toString()}`

      // Create a temporary link and trigger download
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = downloadUrl
      link.download = `${template.id}_${formatDateSriLanka(dateRange.from)}_to_${formatDateSriLanka(dateRange.to)}.xlsx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)

      toast({
        title: "Success",
        description: `${template.title} downloaded successfully`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate report",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDateSelect = (range: { from: Date; to: Date }) => {
    setDateRange({ from: range.from, to: range.to })
  }

  const formatDate = (date: Date) =>
  new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split("T")[0]

  const downloadProjectReport = async (start: Date, end: Date, label: string) => {
    try {
      const startDate = formatDate(start)
      const endDate = formatDate(end)

      const params = new URLSearchParams({
        startDate,
        endDate,
        project: "ALL",
      })

      const response = await fetch(`/api/jira/generate-report-by-project?${params.toString()}`)
      if (!response.ok) throw new Error("Failed to download report")

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `ProjectTimesheet_${label}_${startDate}_to_${endDate}.xlsx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Download error:", error)
    }
  }

  // Predefined date ranges
  const getLastWeekRange = () => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const sunday = new Date(today)
    sunday.setDate(today.getDate() - dayOfWeek)
    const monday = new Date(sunday)
    monday.setDate(sunday.getDate() - 6)
    return { from: monday, to: sunday }
  }

  const getLastMonthRange = () => {
    const now = new Date()
    const first = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const last = new Date(now.getFullYear(), now.getMonth(), 0)
    return { from: first, to: last }
  }

  const getCurrentMonthRange = () => {
    const now = new Date()
    const first = new Date(now.getFullYear(), now.getMonth(), 1)
    return { from: first, to: now }
  }

  const getYearToDateRange = () => {
    const now = new Date()
    const jan1 = new Date(now.getFullYear(), 0, 1)
    return { from: jan1, to: now }
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
              <BreadcrumbPage>Reports</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      <div className="flex-1 space-y-6 p-4 md:p-6 overflow-auto">
        {/* Hero Section */}
        <HeroSection
          title="Reports Center"
          subtitle="Generate comprehensive reports for stakeholders"
          description="Create detailed reports for executives, project managers, and team leads with advanced analytics and insights tailored to your organization's needs."
          badgeText="Professional Reports"
          badgeIcon={<FileText className="w-6 h-6 text-primary" />}
          primaryAction={{
            text: "View Analytics",
            href: "/analytics",
          }}
          secondaryAction={{
            text: "Timesheet Reports",
            href: "/jira-timesheets/by-project",
          }}
          backgroundGradient="from-indigo-500/20 via-purple-500/10 to-background"
        />

        {/* Report Configuration */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Report Configuration
              </CardTitle>
              <CardDescription>Configure global parameters for all reports</CardDescription>
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
                  <label className="text-sm font-medium">Project Filter</label>
                  <Select value={selectedProject} onValueChange={setSelectedProject}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select project" />
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
                  <label className="text-sm font-medium">User Filter</label>
                  <Select value={selectedUser} onValueChange={setSelectedUser}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select user" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
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

        {/* Report Templates */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {reportTemplates.map((template, index) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
            >
              <Card className="group hover:shadow-lg transition-all duration-300 hover:scale-105 h-full">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${template.bgColor}`}>
                        <template.icon className={`w-6 h-6 ${template.color}`} />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg leading-tight">{template.title}</CardTitle>
                        <Badge variant="outline" className="mt-1 text-xs">
                          {template.audience}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 flex-1 flex flex-col">
                  <p className="text-sm text-muted-foreground flex-1">{template.description}</p>

                  <div className="flex items-center justify-between pt-2">
                    <Badge variant="secondary" className="text-xs">
                      {template.type === "organization"
                        ? "Organization"
                        : template.type === "project"
                          ? "Project"
                          : "User"}{" "}
                      Level
                    </Badge>
                    <Button
                      size="sm"
                      onClick={() => generateReport(template)}
                      disabled={loading}
                      className="group-hover:bg-primary group-hover:text-primary-foreground"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Generate
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Quick Reports Section */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Quick Reports
              </CardTitle>
              <CardDescription>Generate common reports with predefined date ranges</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Button
                  variant="outline"
                  className="h-auto p-4 justify-start bg-transparent"
                  onClick={() => {
                    const { from, to } = getLastWeekRange()
                    downloadProjectReport(from, to, "Weekly")
                  }}
                  disabled={loading}
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-blue-500" />
                    <div className="text-left">
                      <div className="font-semibold">Weekly Summary</div>
                      <div className="text-sm text-muted-foreground">Last 7 Days</div>
                    </div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto p-4 justify-start bg-transparent"
                  onClick={() => {
                    const { from, to } = getLastMonthRange()
                    downloadProjectReport(from, to, "LastMonth")
                  }}
                  disabled={loading}
                >
                  <div className="flex items-center gap-3">
                    <BarChart3 className="w-5 h-5 text-green-500" />
                    <div className="text-left">
                      <div className="font-semibold">Monthly Overview</div>
                      <div className="text-sm text-muted-foreground">Last 30 Days (Previous Month)</div>
                    </div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto p-4 justify-start bg-transparent"
                  onClick={() => {
                    const { from, to } = getCurrentMonthRange()
                    downloadProjectReport(from, to, "CurrentMonth")
                  }}
                  disabled={loading}
                >
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-purple-500" />
                    <div className="text-left">
                      <div className="font-semibold">Current Month Review</div>
                      <div className="text-sm text-muted-foreground">Ongoing – Current Month</div>
                    </div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto p-4 justify-start bg-transparent"
                  onClick={() => {
                    const { from, to } = getYearToDateRange()
                    downloadProjectReport(from, to, "YTD")
                  }}
                  disabled={loading}
                >
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-orange-500" />
                    <div className="text-left">
                      <div className="font-semibold">Annual Report</div>
                      <div className="text-sm text-muted-foreground">From January 1st to Today (Current Year)</div>
                    </div>
                  </div>
                </Button>
              </div>
            </CardContent>

          </Card>
        </motion.div>
      </div>
    </SidebarInset>
  )
}
