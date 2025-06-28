"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import { BarChart3, Users } from "lucide-react"

interface ChartDataItem {
  name: string
  hours: number
}

interface ChartData {
  projectHours: ChartDataItem[]
  employeeEngagement: ChartDataItem[]
}

interface ProjectAnalyticsChartsProps {
  data: any[]
}

export function ProjectAnalyticsCharts({ data }: ProjectAnalyticsChartsProps) {
  const [chartData, setChartData] = useState<ChartData>({
    projectHours: [],
    employeeEngagement: [],
  })

  useEffect(() => {
    if (data && data.length > 0) {
      processChartData(data)
    }
  }, [data])

  const processChartData = (rawData: any[]) => {
    // Process project hours
    const projectHoursMap: { [key: string]: number } = {}
    const employeeEngagementMap: { [key: string]: number } = {}

    rawData.forEach((entry) => {
      const [hours, minutes] = entry.Hours.split("h")
      const totalHours = Number.parseInt(hours) + (Number.parseInt((minutes || "").replace("m", "")) || 0) / 60

      // Project hours
      projectHoursMap[entry.ProjectName] = (projectHoursMap[entry.ProjectName] || 0) + totalHours

      // Employee engagement
      const assignee = entry.Assignee === "Unassigned" ? entry.UpdatedBy || "Unassigned" : entry.Assignee
      employeeEngagementMap[assignee] = (employeeEngagementMap[assignee] || 0) + totalHours
    })

    // Convert to chart data and sort
    const projectHours = Object.entries(projectHoursMap)
      .sort(([, a], [, b]) => b - a)
      .map(([name, hours]) => ({
        name: name.length > 20 ? name.substring(0, 20) + "..." : name,
        hours: Math.round(hours * 100) / 100,
      }))

    const employeeEngagement = Object.entries(employeeEngagementMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 15) // Top 15 employees
      .map(([name, hours]) => ({
        name: name.length > 15 ? name.substring(0, 15) + "..." : name,
        hours: Math.round(hours * 100) / 100,
      }))

    setChartData({ projectHours, employeeEngagement })
  }

  if (!data || data.length === 0) {
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Total Logged Work Hours by Project</CardTitle>
            <CardDescription>Project workload distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[400px] w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Employee Time Logging Engagement</CardTitle>
            <CardDescription>Top contributors by logged hours</CardDescription>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[400px] w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="grid gap-6 lg:grid-cols-2"
    >
      {/* Total Logged Work Hours by Project */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Total Logged Work Hours by Project
          </CardTitle>
          <CardDescription>Project workload distribution for selected period</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              hours: {
                label: "Hours",
                color: "hsl(var(--chart-1))",
              },
            }}
            className="h-[400px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.projectHours} layout="horizontal" margin={{ left: 100 }}>
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

      {/* Employee Time Logging Engagement */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Employee Time Logging Engagement
          </CardTitle>
          <CardDescription>Top contributors by logged hours</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              hours: {
                label: "Hours",
                color: "hsl(var(--chart-2))",
              },
            }}
            className="h-[400px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.employeeEngagement} layout="horizontal" margin={{ left: 100 }}>
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
    </motion.div>
  )
}