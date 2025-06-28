"use client"

import { useMemo } from "react"
import { motion } from "framer-motion"
import { Bar, BarChart, Line, LineChart, Pie, PieChart, Cell, XAxis, YAxis, CartesianGrid, Legend } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"

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

interface ProjectAnalyticsChartsProps {
  data: ReportData[]
}

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

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
]

export function ProjectAnalyticsCharts({ data }: ProjectAnalyticsChartsProps) {
  const chartData = useMemo(() => {
    // Project Hours Distribution
    const projectHoursMap: { [key: string]: number } = {}
    const resourceAllocationMap: { [key: string]: Set<string> } = {}
    const dailyHoursMap: { [key: string]: number } = {}

    data.forEach((entry) => {
      // Parse hours
      const [hoursPart, minutesPart] = entry.Hours.split("h")
      const hours = Number.parseInt(hoursPart, 10) || 0
      const minutes = Number.parseInt((minutesPart || "").replace("m", "").trim(), 10) || 0
      const totalHours = hours + minutes / 60

      // Project hours
      projectHoursMap[entry.ProjectName] = (projectHoursMap[entry.ProjectName] || 0) + totalHours

      // Resource allocation
      const resource = entry.UpdatedBy || entry.Assignee
      if (!resourceAllocationMap[entry.ProjectName]) {
        resourceAllocationMap[entry.ProjectName] = new Set()
      }
      resourceAllocationMap[entry.ProjectName].add(resource)

      // Daily hours
      dailyHoursMap[entry.Date] = (dailyHoursMap[entry.Date] || 0) + totalHours
    })

    const projectHours = Object.entries(projectHoursMap)
      .map(([project, hours]) => ({
        project: project.length > 20 ? project.substring(0, 20) + "..." : project,
        hours: Math.round(hours * 100) / 100,
      }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 10)

    const resourceAllocation = Object.entries(resourceAllocationMap)
      .map(([project, users]) => ({
        project: project.length > 15 ? project.substring(0, 15) + "..." : project,
        userCount: users.size,
        users: Array.from(users),
      }))
      .sort((a, b) => b.userCount - a.userCount)
      .slice(0, 8)

    const dailyHours = Object.entries(dailyHoursMap)
      .map(([date, hours]) => ({
        date,
        hours: Math.round(hours * 100) / 100,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    return {
      projectHours,
      resourceAllocation,
      dailyHours,
    }
  }, [data])

  const downloadChart = (chartType: string) => {
    console.log(`Downloading ${chartType} chart...`)
    // Implement chart export functionality
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="space-y-6"
    >
      <div className="grid gap-6 md:grid-cols-2">
        {/* Project Hours Distribution */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Project Hours Distribution</CardTitle>
              <CardDescription>Total hours by project</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => downloadChart("project-hours")}>
              <Download className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <BarChart data={chartData.projectHours} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="project" type="category" width={100} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="hours" fill="var(--color-hours)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Resource Allocation */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Resource Allocation</CardTitle>
              <CardDescription>Team members per project</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => downloadChart("resource-allocation")}>
              <Download className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <PieChart>
                <Pie
                  data={chartData.resourceAllocation}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="userCount"
                >
                  {chartData.resourceAllocation.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <ChartTooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload
                      return (
                        <div className="rounded-lg border bg-background p-3 shadow-sm">
                          <div className="grid gap-2">
                            <div className="font-medium">{data.project}</div>
                            <div className="text-sm text-muted-foreground">{data.userCount} team members</div>
                            <div className="text-xs">
                              {data.users.slice(0, 3).join(", ")}
                              {data.users.length > 3 && ` +${data.users.length - 3} more`}
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

        {/* Daily Hours Trend */}
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Daily Hours Trend</CardTitle>
              <CardDescription>Total hours logged per day</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => downloadChart("daily-trend")}>
              <Download className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[400px]">
              <LineChart data={chartData.dailyHours}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={(value) => new Date(value).toLocaleDateString()} />
                <YAxis />
                <ChartTooltip
                  content={<ChartTooltipContent />}
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <Line
                  type="monotone"
                  dataKey="hours"
                  stroke="var(--color-hours)"
                  strokeWidth={3}
                  dot={{ fill: "var(--color-hours)", strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  )
}
