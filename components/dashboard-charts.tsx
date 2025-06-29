"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Bar, BarChart, Pie, PieChart, Cell, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Button } from "@/components/ui/button"
import { Download, BarChart3, LineChartIcon, PieChartIcon } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

const chartConfig = {
  hours: {
    label: "Hours",
    color: "hsl(var(--chart-1))",
  },
  projects: {
    label: "Projects",
    color: "hsl(var(--chart-2))",
  },
  users: {
    label: "Users",
    color: "hsl(var(--chart-3))",
  },
}

// Multiple colors for project distribution
  const CHART_COLORS = [
    "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444",
    "#3b82f6", "#f97316", "#84cc16", "#ec4899", "#6366f1",
    "#14b8a6", "#a855f7", "#f43f5e", "#3b76f6", "#65a30d",
    "#eab308", "#0ea5e9", "#db2777", "#7c3aed", "#15803d",
    "#0284c7", "#d946ef", "#b91c1c", "#5eead4", "#0f766e",
    "#7e22ce", "#fde047", "#3f6212", "#c084fc", "#7dd3fc",
  ]



export function DashboardCharts() {
  const [activeChart, setActiveChart] = useState<"bar" | "line" | "pie">("bar")
  const [chartData, setChartData] = useState({
    weeklyData: [],
    projectDistribution: [],
    monthlyTrends: [],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchChartData = async () => {
      try {
        setLoading(true)

        // Get last week data for weekly chart
        const weekEndDate = new Date()
        const weekStartDate = new Date()
        weekStartDate.setDate(weekStartDate.getDate() - 7)

        // Get current year data for project distribution
        const yearStart = new Date(new Date().getFullYear(), 0, 1)
        const today = new Date()

        // Get last month data for monthly trends
        const monthEndDate = new Date()
        const monthStartDate = new Date()
        monthStartDate.setMonth(monthStartDate.getMonth() - 1)

        const [weeklyResponse, sixMonthsResponse, monthlyResponse] = await Promise.all([
          fetch("/api/jira/generate-report-by-project", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              startDate: weekStartDate.toISOString().split("T")[0],
              endDate: weekEndDate.toISOString().split("T")[0],
              project: "ALL",
            }),
          }),
          fetch("/api/jira/generate-report-by-project", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              startDate: yearStart.toISOString().split("T")[0],
              endDate: today.toISOString().split("T")[0],
              project: "ALL",
            }),
          }),
          fetch("/api/jira/generate-report-by-project", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              startDate: monthStartDate.toISOString().split("T")[0],
              endDate: monthEndDate.toISOString().split("T")[0],
              project: "ALL",
            }),
          }),
        ])

        const weeklyData = weeklyResponse.ok ? await weeklyResponse.json() : { data: [] }
        const yearData = sixMonthsResponse.ok ? await sixMonthsResponse.json() : { data: [] }
        const monthlyData = monthlyResponse.ok ? await monthlyResponse.json() : { data: [] }

        const processedData = processDataForCharts(
          weeklyData.data || weeklyData,
          yearData.data || yearData,
          monthlyData.data || monthlyData,
        )
        setChartData(processedData)
      } catch (error) {
        console.error("Error fetching chart data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchChartData()
  }, [])

  const processDataForCharts = (weeklyRawData: any[], sixMonthsRawData: any[], monthlyRawData: any[]) => {
    // Weekly data processing (last 7 days)
    const weeklyMap: { [key: string]: number } = {}
    const projectHoursMap: { [key: string]: number } = {}
    const dailyMap: { [key: string]: number } = {}

    // Process weekly data
    if (Array.isArray(weeklyRawData)) {
      weeklyRawData.forEach((entry: any) => {
        const date = new Date(entry.Date)
        const dayName = date.toLocaleDateString("en-US", { weekday: "short" })
        const [hours, minutes] = entry.Hours.split("h")
        const totalHours = Number.parseInt(hours) + (Number.parseInt((minutes || "").replace("m", "")) || 0) / 60
        weeklyMap[dayName] = (weeklyMap[dayName] || 0) + totalHours
      })
    }

    // Process 6 months data for project distribution
    if (Array.isArray(sixMonthsRawData)) {
      sixMonthsRawData.forEach((entry: any) => {
        const [hours, minutes] = entry.Hours.split("h")
        const totalHours = Number.parseInt(hours) + (Number.parseInt((minutes || "").replace("m", "")) || 0) / 60
        projectHoursMap[entry.ProjectName] = (projectHoursMap[entry.ProjectName] || 0) + totalHours
      })
    }

    // Process monthly data for daily trends
    if (Array.isArray(monthlyRawData)) {
      monthlyRawData.forEach((entry: any) => {
        const date = new Date(entry.Date)
        const dayKey = date.getDate().toString()
        const [hours, minutes] = entry.Hours.split("h")
        const totalHours = Number.parseInt(hours) + (Number.parseInt((minutes || "").replace("m", "")) || 0) / 60
        dailyMap[dayKey] = (dailyMap[dayKey] || 0) + totalHours
      })
    }

    const weeklyData = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => ({
      day,
      hours: Math.round((weeklyMap[day] || 0) * 100) / 100,
    }))

    const projectDistribution = Object.entries(projectHoursMap)
    .sort(([, a], [, b]) => b - a)
    .map(([name, value], index) => ({
      name: name.length > 15 ? name.substring(0, 15) + "..." : name,
      value: Math.round(value * 100) / 100,
      color: CHART_COLORS[index % CHART_COLORS.length],
    }))

    // Monthly trends - day by day for last month
    const monthlyTrends = Object.entries(dailyMap)
      .sort(([a], [b]) => Number.parseInt(a) - Number.parseInt(b))
      .map(([day, hours]) => ({
        day: `Day ${day}`,
        totalHours: Math.round(hours * 100) / 100,
      }))

    return { weeklyData, projectDistribution, monthlyTrends }
  }

  const downloadChart = (chartType: string) => {
    console.log(`Downloading ${chartType} chart...`)
  }

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight">Analytics Dashboard</h2>
            <p className="text-muted-foreground">Real-time insights and trends</p>
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Weekly Activity</CardTitle>
              <CardDescription>Hours tracked this week</CardDescription>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Project Distribution</CardTitle>
              <CardDescription>Time allocation by project type (Last 6 months)</CardDescription>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">Analytics Dashboard</h2>
          <p className="text-muted-foreground">Real-time insights and trends</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Weekly Activity Chart */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Weekly Activity</CardTitle>
              <CardDescription>Hours tracked last week</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => downloadChart("weekly")}>
              <Download className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.weeklyData} barCategoryGap="20%">
                  <XAxis dataKey="day" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="hours" fill="var(--color-hours)" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Project Distribution */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Project Distribution</CardTitle>
              <CardDescription>
                {`Annual project time allocation (${new Date().getFullYear()})`}
              </CardDescription>

            </div>
            <Button variant="outline" size="sm" onClick={() => downloadChart("distribution")}>
              <Download className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.projectDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {chartData.projectDistribution.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload
                        const color = data.color

                        return (
                          <div className="rounded-lg border bg-background p-2 shadow-sm">
                            <div className="grid grid-cols-2 gap-2">
                              <div className="flex flex-col">
                                <span className="text-[0.70rem] uppercase text-muted-foreground">
                                  {data.name}
                                </span>
                                <span className="font-bold" style={{ color }}>
                                  {data.value}h
                                </span>
                              </div>
                            </div>
                          </div>
                        )
                      }
                      return null
                    }}
                  />

                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Monthly Trends */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Monthly Trends</CardTitle>
              <CardDescription>Daily total hours for last month - Interactive Bar Chart</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => downloadChart("trends")}>
              <Download className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="w-full h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.monthlyTrends} barCategoryGap="10%">
                  <XAxis dataKey="day" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Bar dataKey="totalHours" fill="var(--color-hours)" name="Total Hours" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>

        </Card>
      </div>
    </motion.div>
  )
}
