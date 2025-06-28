"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Download, Users, Clock, FileText, TrendingUp, AlertTriangle, ArrowUpDown } from "lucide-react"
import type { DateRange } from "react-day-picker"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbLink } from "@/components/ui/breadcrumb"
import { useToast } from "@/hooks/use-toast"
import { CalendarDatePicker } from "@/components/date-range-picker"
import { HeroSection } from "@/components/hero-section"
import { ScrollArea } from "@/components/ui/scroll-area"

interface ReportData {
  Date: string
  ProjectName: string
  ProjectID: string
  IssueID: string
  Assignee: string
  Issue: string
  Comment: string
  Hours: string
  UniqueKey: string
}

interface User {
  name: string
  email: string
  accountId: string
}

type SortField = "Date" | "ProjectName" | "IssueID" | "Hours"
type SortOrder = "asc" | "desc"

export default function JiraTimesheetsByResource() {
  const [users, setUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<string>("")
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  })
  const [reportData, setReportData] = useState<ReportData[]>([])
  const [loading, setLoading] = useState(false)
  const [totalMinutes, setTotalMinutes] = useState<number>(0)
  const [overtimeData, setOvertimeData] = useState<{ date: string; overtimeMinutes: number }[]>([])
  const [undertimeData, setUndertimeData] = useState<{ date: string; undertimeMinutes: number }[]>([])

  // Pagination and sorting
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)
  const [sortField, setSortField] = useState<SortField>("Date")
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc")

  const { toast } = useToast()

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/jira/users")
      if (!response.ok) throw new Error("Failed to fetch users")
      const data = await response.json()

      // Sort users alphabetically but keep "All Users" first
      const sortedUsers = data.sort((a: User, b: User) => a.name.localeCompare(b.name))
      setUsers([{ name: "ALL", email: "", accountId: "ALL" }, ...sortedUsers])

      if (data.length > 0) {
        toast({
          title: "Success",
          description: `Loaded ${data.length} users`,
        })
      } else {
        toast({
          title: "Warning",
          description: "No users found. Check your JIRA permissions.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchReportData = async () => {
    if (!dateRange?.from || !dateRange?.to) {
      toast({
        title: "Error",
        description: "Please select a date range",
        variant: "destructive",
      })
      return
    }

    if (!selectedUser) {
      toast({
        title: "Error",
        description: "Please select a user",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    setReportData([])

    try {
      const formatDateSriLanka = (date: Date) => {
        return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split("T")[0]
      }

      const response = await fetch("/api/jira/generate-report-by-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startDate: formatDateSriLanka(dateRange.from),
          endDate: formatDateSriLanka(dateRange.to),
          user: selectedUser,
        }),
      })

      if (!response.ok) throw new Error("Failed to fetch report data")

      const data = await response.json()

      if (data.length === 0) {
        toast({
          title: "No Data",
          description: "No worklogs found for the selected criteria",
          variant: "destructive",
        })
      } else {
        setReportData(data)
        calculateTimeAnalytics(data)
        toast({
          title: "Success",
          description: `Generated report with ${data.length} entries`,
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

  const calculateTimeAnalytics = (data: ReportData[]) => {
    let totalMinutes = 0
    const dateMap: { [key: string]: number } = {}

    data.forEach((entry) => {
      const time = entry.Hours
      const [hoursPart, minutesPart] = time.split("h")
      const hours = Number.parseInt(hoursPart, 10) || 0
      const minutes = Number.parseInt((minutesPart || "").replace("m", "").trim(), 10) || 0
      const entryMinutes = hours * 60 + minutes

      totalMinutes += entryMinutes

      const date = entry.Date
      dateMap[date] = (dateMap[date] || 0) + entryMinutes
    })

    setTotalMinutes(totalMinutes)

    const overtimeEntries = Object.entries(dateMap)
      .filter(([_, total]) => total > 480) // 8 hours = 480 minutes
      .map(([date, total]) => ({
        date,
        overtimeMinutes: total - 480,
      }))

    const undertimeEntries = Object.entries(dateMap)
      .filter(([_, total]) => total > 0 && total < 480) // Less than 8 hours and not zero
      .map(([date, total]) => ({
        date,
        undertimeMinutes: 480 - total,
      }))

    setOvertimeData(overtimeEntries)
    setUndertimeData(undertimeEntries)
  }

  const formatHoursAndMinutes = (totalMinutes: number) => {
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    return `${hours}h ${minutes}m`
  }

  const downloadReport = async () => {
    if (!dateRange?.from || !dateRange?.to || !selectedUser || reportData.length === 0) {
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

      const url = `/api/jira/generate-report-by-user?startDate=${formatDateSriLanka(dateRange.from)}&endDate=${formatDateSriLanka(dateRange.to)}&user=${selectedUser}`
      const link = document.createElement("a")
      link.href = url
      link.download = `User_Report_${formatDateSriLanka(dateRange.from)}_to_${formatDateSriLanka(dateRange.to)}.xlsx`
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

  // Pagination logic
  const totalPages = Math.ceil(sortedData.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedData = sortedData.slice(startIndex, startIndex + itemsPerPage)

  const handleDateSelect = (range: { from: Date; to: Date }) => {
    setDateRange({ from: range.from, to: range.to })
  }

  useEffect(() => {
    fetchUsers()
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
              <BreadcrumbPage>JIRA Timesheets - By Resource</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      <div className="flex-1 space-y-6 p-4 md:p-6 overflow-auto max-h-screen">
        {/* Hero Section */}
        <HeroSection
          title="Resource Timesheets"
          subtitle="Track and analyze individual resource time allocation"
          description="Monitor team member productivity, identify overtime patterns, and optimize resource utilization across projects with detailed individual reports."
          badgeText="Resource Analytics"
          badgeIcon={<Users className="w-6 h-6 text-primary" />}
          primaryAction={{
            text: "View Analytics",
            href: "/analytics",
          }}
          secondaryAction={{
            text: "Project Reports",
            href: "/jira-timesheets/by-project",
          }}
          backgroundGradient="from-purple-500/20 via-pink-500/10 to-background"
        />

        {/* Controls */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Report Configuration
              </CardTitle>
              <CardDescription>Configure your resource timesheet report parameters</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Resource</label>
                  <Select value={selectedUser} onValueChange={setSelectedUser}>
                    <SelectTrigger>
                      <SelectValue placeholder={loading ? "Loading users..." : "Select user"} />
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
                  <label className="text-sm font-medium">Items per page</label>
                  <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                      <SelectItem value="200">200</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Actions</label>
                  <div className="flex gap-2">
                    <Button onClick={fetchReportData} disabled={loading} className="flex-1">
                      {loading ? "Generating..." : "Generate"}
                    </Button>
                    <Button variant="outline" onClick={downloadReport} disabled={loading || reportData.length === 0}>
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Analytics Cards */}
        {selectedUser && selectedUser !== "ALL" && reportData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            {/* Total Hours Card */}
            <Card className="group hover:shadow-lg transition-all duration-300">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="w-5 h-5 text-primary" />
                  Total Hours
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">{formatHoursAndMinutes(totalMinutes)}</div>
                <p className="text-sm text-muted-foreground mt-1">For selected period</p>
              </CardContent>
            </Card>

            {/* Overtime Analysis */}
            <Card className="group hover:shadow-lg transition-all duration-300">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="w-5 h-5 text-orange-500" />
                  Overtime Days
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-500">{overtimeData.length}</div>
                <p className="text-sm text-muted-foreground mt-1">Days with &gt;8 hours</p>
                {overtimeData.length > 0 && (
                  <ScrollArea className="h-24 mt-3">
                    <div className="space-y-1">
                      {overtimeData.map((entry, index) => (
                        <div key={index} className="flex justify-between text-xs">
                          <span>{entry.date}</span>
                          <span className="text-orange-500 font-medium">
                            +{formatHoursAndMinutes(entry.overtimeMinutes)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            {/* Undertime Analysis */}
            <Card className="group hover:shadow-lg transition-all duration-300">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <AlertTriangle className="w-5 h-5 text-blue-500" />
                  Undertime Days
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-500">{undertimeData.length}</div>
                <p className="text-sm text-muted-foreground mt-1">Days with &lt;8 hours</p>
                {undertimeData.length > 0 && (
                  <ScrollArea className="h-24 mt-3">
                    <div className="space-y-1">
                      {undertimeData.map((entry, index) => (
                        <div key={index} className="flex justify-between text-xs">
                          <span>{entry.date}</span>
                          <span className="text-blue-500 font-medium">
                            -{formatHoursAndMinutes(entry.undertimeMinutes)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
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
                  Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, sortedData.length)} of{" "}
                  {sortedData.length} entries
                  {selectedUser !== "ALL" && ` for ${selectedUser}`}
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
                            Project
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                          </Button>
                        </TableHead>
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
                        <TableHead>Assignee</TableHead>
                        <TableHead>Issue</TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            onClick={() => handleSort("Hours")}
                            className="h-auto p-0 font-semibold"
                          >
                            Hours
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
                          <TableCell className="font-mono text-sm">{row.IssueID}</TableCell>
                          <TableCell>{row.Assignee}</TableCell>
                          <TableCell className="max-w-xs truncate">{row.Issue}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{row.Hours}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between space-x-2 py-4">
                    <div className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage <= 1}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage >= totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </SidebarInset>
  )
}
