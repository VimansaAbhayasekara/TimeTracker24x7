"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Bar, BarChart, Line, LineChart, Pie, PieChart, Cell, XAxis, YAxis, CartesianGrid, Legend } from "recharts"
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
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#3b82f6", // blue
  "#f97316", // orange
  "#84cc16", // lime
  "#ec4899", // pink
  "#6366f1", // indigo
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

        // Get last 6 months of data for charts
        const endDate = new Date()
        const startDate = new Date()
        startDate.setMonth(startDate.getMonth() - 6)

        const response = await fetch("/api/jira/generate-report-by-project", {
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

        if (response.ok) {
          const responseData = await response.json()
          // Handle both paginated and direct array responses
          const data = responseData.data || responseData

          if (Array.isArray(data)) {
            const processedData = processDataForCharts(data)
            setChartData(processedData)
          }
        }
      } catch (error) {
        console.error("Error fetching chart data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchChartData()
  }, [])

  const processDataForCharts = (data: any[]) => {
    // Weekly data processing (last 7 days)
    const weeklyMap: { [key: string]: { hours: number; projects: Set<string>; users: Set<string> } } = {}
    const projectHoursMap: { [key: string]: number } = {}
    const monthlyMap: { [key: string]: number } = {}

    data.forEach((entry: any) => {
      const date = new Date(entry.Date)
      const dayName = date.toLocaleDateString("en-US", { weekday: "short" })
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`

      // Parse hours
      const [hours, minutes] = entry.Hours.split("h")
      const totalHours = Number.parseInt(hours) + (Number.parseInt((minutes || "").replace("m", "")) || 0) / 60

      // Weekly data (last 7 days only)
      const today = new Date()
      const weekAgo = new Date()
      weekAgo.setDate(today.getDate() - 7)

      if (date >= weekAgo) {
        if (!weeklyMap[dayName]) {
          weeklyMap[dayName] = { hours: 0, projects: new Set(), users: new Set() }
        }
        weeklyMap[dayName].hours += totalHours
        weeklyMap[dayName].projects.add(entry.ProjectName)
        weeklyMap[dayName].users.add(entry.UpdatedBy || entry.Assignee)
      }

      // Project distribution (last 6 months)
      projectHoursMap[entry.ProjectName] = (projectHoursMap[entry.ProjectName] || 0) + totalHours

      // Monthly trends (last 6 months including current)
      monthlyMap[monthKey] = (monthlyMap[monthKey] || 0) + totalHours
    })

    const weeklyData = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => ({
      day,
      hours: Math.round((weeklyMap[day]?.hours || 0) * 100) / 100,
      projects: weeklyMap[day]?.projects.size || 0,
      users: weeklyMap[day]?.users.size || 0,
    }))

    const projectDistribution = Object.entries(projectHoursMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([name, value], index) => ({
        name: name.length > 15 ? name.substring(0, 15) + "..." : name,
        value: Math.round(value),
        color: CHART_COLORS[index % CHART_COLORS.length],
      }))

    // Monthly trends for last 6 months including current
    const currentDate = new Date()
    const monthlyTrends = []

    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      const monthName = date.toLocaleDateString("en-US", { month: "short" })

      monthlyTrends.push({
        month: monthName,
        totalHours: Math.round(monthlyMap[monthKey] || 0),
        efficiency: Math.min(95, Math.max(70, 80 + Math.random() * 15)), // Simulated efficiency
      })
    }

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
        <div className="flex gap-2">
          <Button
            variant={activeChart === "bar" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveChart("bar")}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Bar
          </Button>
          <Button
            variant={activeChart === "line" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveChart("line")}
          >
            <LineChartIcon className="w-4 h-4 mr-2" />
            Line
          </Button>
          <Button
            variant={activeChart === "pie" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveChart("pie")}
          >
            <PieChartIcon className="w-4 h-4 mr-2" />
            Pie
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Weekly Activity Chart */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Weekly Activity</CardTitle>
              <CardDescription>Hours tracked this week</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => downloadChart("weekly")}>
              <Download className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              {activeChart === "bar" ? (
                <BarChart data={chartData.weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="hours" fill="var(--color-hours)" radius={4} />
                </BarChart>
              ) : (
                <LineChart data={chartData.weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="hours"
                    stroke="var(--color-hours)"
                    strokeWidth={3}
                    dot={{ fill: "var(--color-hours)", strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              )}
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Project Distribution */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Project Distribution</CardTitle>
              <CardDescription>Time allocation by project type (Last 6 months)</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => downloadChart("distribution")}>
              <Download className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
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
                      return (
                        <div className="rounded-lg border bg-background p-2 shadow-sm">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="flex flex-col">
                              <span className="text-[0.70rem] uppercase text-muted-foreground">{data.name}</span>
                              <span className="font-bold text-muted-foreground">{data.value}h</span>
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
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Monthly Trends */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Monthly Trends</CardTitle>
              <CardDescription>Total hours over the last 6 months (including current month)</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => downloadChart("trends")}>
              <Download className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[400px]">
              <LineChart data={chartData.monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="totalHours"
                  stroke="var(--color-hours)"
                  strokeWidth={3}
                  name="Total Hours"
                  dot={{ fill: "var(--color-hours)", strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  )
}
