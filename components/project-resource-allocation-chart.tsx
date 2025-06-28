"use client"

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { motion } from "framer-motion"
import { Skeleton } from "@/components/ui/skeleton"

interface ChartData {
  project: string
  userCount: number
  users: string[]
}

interface ProjectResourceAllocationChartProps {
  data: ChartData[]
  loading?: boolean
}

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

export function ProjectResourceAllocationChart({ data, loading = false }: ProjectResourceAllocationChartProps) {
  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-green-500">Employee Time Logging Engagement</CardTitle>
          <CardDescription>Number of team members actively logging time per project</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[500px] w-full" />
        </CardContent>
      </Card>
    )
  }

  // Add colors to data
  const dataWithColors = data.map((item, index) => ({
    ...item,
    fill: CHART_COLORS[index % CHART_COLORS.length],
  }))

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const projectData = data.find((item) => item.project === label)
      return (
        <div className="bg-popover p-4 rounded-lg shadow-lg border border-border max-w-xs">
          <p className="text-foreground font-semibold">{label}</p>
          <p className="text-primary">{`${payload[0].value} users`}</p>
          <div className="mt-2">
            <p className="text-foreground font-semibold">Resources:</p>
            <div className="max-h-32 overflow-y-auto">
              <ul className="list-disc list-inside">
                {projectData?.users.slice(0, 10).map((user, index) => (
                  <li key={index} className="text-primary text-sm">
                    {user}
                  </li>
                ))}
                {projectData && projectData.users.length > 10 && (
                  <li className="text-muted-foreground text-sm">+{projectData.users.length - 10} more...</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <Card className="w-full bg-card border-border">
      <CardHeader>
        <CardTitle className="text-green-500">Employee Time Logging Engagement</CardTitle>
        <CardDescription>Number of team members actively logging time per project</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[500px] w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.63, ease: "easeOut" }}
            className="h-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dataWithColors}
                margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                barCategoryGap="20%"
              >
                <XAxis
                  dataKey="project"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={{ stroke: "hsl(var(--border))" }}
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  interval={0}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={{ stroke: "hsl(var(--border))" }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ color: "hsl(var(--foreground))", fontSize: 14 }} />
                <Bar dataKey="userCount" name="Active Users" radius={[4, 4, 0, 0]} minPointSize={5} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </div>
      </CardContent>
    </Card>
  )
}
