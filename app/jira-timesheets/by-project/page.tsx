"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Download, BarChart3, Clock, FileText, Briefcase, ChevronLeft, ChevronRight, ArrowUpDown } from "lucide-react"
import type { DateRange } from "react-day-picker"
import { Line, LineChart, Bar, BarChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbLink } from "@/components/ui/breadcrumb"
import { useToast } from "@/hooks/use-toast"
import { ProjectAnalyticsCharts } from "@/components/project-analytics-charts"
import { CalendarDatePicker } from "@/components/date-range-picker"
import { HeroSection } from "@/components/hero-section"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

interface ReportData {
  Date: string
  ProjectName: string
  ProjectID: string
  IssueID: string
  Assignee: string
  UpdatedBy?: string
  Issue: string
  Comment: string
  Hours: string
  UniqueKey: string
}

interface Project {
  id: string
  name: string
}

type SortField = "Date" | "ProjectName" | "IssueID" | "Assignee" | "Hours"
type SortOrder = "asc" | "desc"

export default function JiraTimesheetsByProject() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<string>("")
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    to: new Date(),
  })
  const [reportData, setReportData] = useState<ReportData[]>([])
  const [loading, setLoading] = useState(false)
  const [showCharts, setShowCharts] = useState(false)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [totalItems, setTotalItems] = useState(0)

  // Sorting state
  const [sortField, setSortField] = useState<SortField>("Date")
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc")

  // Chart data for individual project
  const [dailyHoursData, setDailyHoursData] = useState<any[]>([])
  const [employeeHoursData, setEmployeeHoursData] = useState<any[]>([])

  const { toast } = useToast()

  const fetchProjects = async () => {
    try {
      const response = await fetch("/api/jira/projects")
      if (!response.ok) throw new Error("Failed to fetch projects")
      const data = await response.json()
      // Sort projects alphabetically but keep "All Projects" first
      const sortedProjects = data.sort((a: Project, b: Project) => a.name.localeCompare(b.name))
      setProjects([{ id: "ALL", name: "All Projects" }, ...sortedProjects])
      setSelectedProject("ALL")
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch projects",
        variant: "destructive",
      })
    }
  }

  const fetchReportData = async (page = 1) => {
    if (!dateRange?.from || !dateRange?.to) {
      toast({
        title: "Error",
        description: "Please select both start and end dates",
        variant: "destructive",
      })
      return
    }

    if (!selectedProject) {
      toast({
        title: "Error",
        description: "Please select a project",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      // Format dates for Sri Lankan timezone
      const formatDateSriLanka = (date: Date) => {
        return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split("T")[0]
      }

      const response = await fetch("/api/jira/generate-report-by-project", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startDate: formatDateSriLanka(dateRange.from),
          endDate: formatDateSriLanka(dateRange.to),
          project: selectedProject,
        }),
      })

      if (!response.ok) throw new Error("Failed to fetch report data")

      const data = await response.json()
      const allData = data.data || data

      if (allData && allData.length === 0) {
        toast({
          title: "No Data",
          description: "No worklogs found for the selected criteria",
          variant: "destructive",
        })
        setShowCharts(false)
        setReportData([])
        setTotalItems(0)
      } else {
        // Process data to handle "Unassigned" assignees
        const processedData = allData.map((item: ReportData) => ({
          ...item,
          Assignee: item.Assignee === "Unassigned" ? item.UpdatedBy || "Unassigned" : item.Assignee,
        }))

        // Sort data by date in ascending order by default
        const sortedData = processedData.sort((a: ReportData, b: ReportData) => {
          return new Date(a.Date).getTime() - new Date(b.Date).getTime()
        })

        setReportData(sortedData)
        setTotalItems(sortedData.length)
        setCurrentPage(1)
        setShowCharts(true)

        // Process chart data for individual projects
        if (selectedProject !== "ALL") {
          processChartData(sortedData)
        }

        toast({
          title: "Success",
          description: `Generated report with ${sortedData.length} entries`,
        })
      }
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

  const processChartData = (data: ReportData[]) => {
    // Daily Hours Trend
    const dailyMap: { [key: string]: number } = {}
    const employeeMap: { [key: string]: number } = {}

    data.forEach((entry) => {
      const [hours, minutes] = entry.Hours.split("h")
      const totalHours = Number.parseInt(hours) + (Number.parseInt((minutes || "").replace("m", "")) || 0) / 60

      // Daily hours
      dailyMap[entry.Date] = (dailyMap[entry.Date] || 0) + totalHours

      // Employee hours
      employeeMap[entry.Assignee] = (employeeMap[entry.Assignee] || 0) + totalHours
    })

    // Convert to chart data
    const dailyData = Object.entries(dailyMap)
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
      .map(([date, hours]) => ({
        date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        hours: Math.round(hours * 100) / 100,
      }))

    const employeeData = Object.entries(employeeMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, hours]) => ({
        name: name.length > 15 ? name.substring(0, 15) + "..." : name,
        hours: Math.round(hours * 100) / 100,
      }))

    setDailyHoursData(dailyData)
    setEmployeeHoursData(employeeData)
  }

  const downloadReport = async () => {
    if (!dateRange?.from || !dateRange?.to || !selectedProject || reportData.length === 0) {
      toast({
        title: "Error",
        description: "Please generate a report first",
        variant: "destructive",
      })
      return
    }

    try {
      const formatDateSriLanka = (date: Date) => {
        return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split("T")[0]
      }

      const url = `/api/jira/generate-report-by-project?startDate=${formatDateSriLanka(dateRange.from)}&endDate=${formatDateSriLanka(dateRange.to)}&project=${selectedProject}`
      const link = document.createElement("a")
      link.href = url
      link.download = `Worklog_Report_${formatDateSriLanka(dateRange.from)}_to_${formatDateSriLanka(dateRange.to)}.xlsx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: "Success",
        description: "Report downloaded successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download report",
        variant: "destructive",
      })
    }
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortOrder("asc")
    }
  }

  const sortedData = [...reportData].sort((a, b) => {
    let aValue: string | number = a[sortField]
    let bValue: string | number = b[sortField]

    if (sortField === "Date") {
      aValue = new Date(aValue).getTime()
      bValue = new Date(bValue).getTime()
    }

    if (sortOrder === "asc") {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
    }
  })

  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedData = sortedData.slice(startIndex, startIndex + itemsPerPage)

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  const handleDateSelect = (range: { from: Date; to: Date }) => {
    setDateRange({ from: range.from, to: range.to })
  }

  useEffect(() => {
    fetchProjects()
  }, [])

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
              <BreadcrumbPage>JIRA Timesheets - By Project</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      <div className="flex-1 space-y-6 p-4 md:p-6 overflow-auto">
        {/* Hero Section */}
        <HeroSection
          title="Project Timesheets"
          subtitle="Track and analyze time spent across projects"
          description="Generate comprehensive timesheet reports, analyze project performance, and gain insights into resource allocation across your organization."
          badgeText="Project Analytics"
          badgeIcon={<Briefcase className="w-6 h-6 text-primary" />}
          primaryAction={{
            text: "View Analytics",
            href: "/analytics",
          }}
          secondaryAction={{
            text: "Resource Reports",
            href: "/jira-timesheets/by-resource",
          }}
          backgroundGradient="from-cyan-500/20 via-violet-500/10 to-background"
        />

        {/* Controls */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Report Configuration
              </CardTitle>
              <CardDescription>Configure your timesheet report parameters</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Project</label>
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
                  <label className="text-sm font-medium">Date Range</label>
                  <CalendarDatePicker
                    date={dateRange}
                    onDateSelect={handleDateSelect}
                    numberOfMonths={2}
                    placeholder="Select date range"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Actions</label>
                  <div className="flex gap-2">
                    <Button onClick={() => fetchReportData(1)} disabled={loading} className="flex-1">
                      {loading ? "Generating..." : "Generate"}
                    </Button>
                    <Button variant="outline" onClick={downloadReport} disabled={loading || reportData.length === 0}>
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {selectedProject === "ALL" && reportData.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setShowCharts(!showCharts)}
                    className="flex items-center gap-2"
                  >
                    <BarChart3 className="w-4 h-4" />
                    {showCharts ? "Hide Analytics" : "Show Analytics"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Analytics Charts for All Projects */}
        {showCharts && selectedProject === "ALL" && reportData.length > 0 && (
          <ProjectAnalyticsCharts data={reportData} />
        )}

        {/* Individual Project Charts */}
        {selectedProject !== "ALL" && reportData.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Daily Hours Trend */}
              <Card>
                <CardHeader>
                  <CardTitle>Daily Hours Trend</CardTitle>
                  <CardDescription>Hours logged per day for selected date range</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{ hours: { label: "Hours", color: "hsl(var(--chart-1))" } }}
                    className="h-[300px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dailyHoursData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Line type="monotone" dataKey="hours" stroke="var(--color-hours)" strokeWidth={3} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Employee Hours */}
              <Card>
                <CardHeader>
                  <CardTitle>Employee Total Hours</CardTitle>
                  <CardDescription>Total hours logged by each team member</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{ hours: { label: "Hours", color: "hsl(var(--chart-2))" } }}
                    className="h-[300px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={employeeHoursData} layout="horizontal">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={100} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="hours" fill="var(--color-hours)" radius={4} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}

        {/* Data Table */}
        {reportData.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Timesheet Data
                </CardTitle>
                <CardDescription>
                  Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, totalItems)} of {totalItems} entries
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>
                          <Button
                            variant="ghost"
                            onClick={() => handleSort("Date")}
                            className="h-auto p-0 font-semibold"
                          >
                            Date
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            onClick={() => handleSort("ProjectName")}
                            className="h-auto p-0 font-semibold"
                          >
                            Project Name
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                          </Button>
                        </TableHead>
                        <TableHead>Project ID</TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            onClick={() => handleSort("IssueID")}
                            className="h-auto p-0 font-semibold"
                          >
                            Issue ID
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            onClick={() => handleSort("Assignee")}
                            className="h-auto p-0 font-semibold"
                          >
                            Assignee
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                          </Button>
                        </TableHead>
                        <TableHead>Updated By</TableHead>
                        <TableHead>Issue</TableHead>
                        <TableHead>Comment</TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            onClick={() => handleSort("Hours")}
                            className="h-auto p-0 font-semibold"
                          >
                            Actual Hours
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                          </Button>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedData.map((row) => (
                        <TableRow key={row.UniqueKey}>
                          <TableCell className="font-mono text-sm">{row.Date}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{row.ProjectName}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{row.ProjectID}</TableCell>
                          <TableCell className="font-mono text-sm">{row.IssueID}</TableCell>
                          <TableCell>{row.Assignee}</TableCell>
                          <TableCell>{row.UpdatedBy}</TableCell>
                          <TableCell className="max-w-xs truncate" title={row.Issue}>
                            {row.Issue}
                          </TableCell>
                          <TableCell className="max-w-xs truncate" title={row.Comment}>
                            {row.Comment}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{row.Hours}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between space-x-2 py-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">Rows per page:</span>
                    <Select
                      value={itemsPerPage.toString()}
                      onValueChange={(value) => {
                        setItemsPerPage(Number(value))
                        setCurrentPage(1)
                      }}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="500">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage <= 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage >= totalPages}
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </SidebarInset>
  )
}
