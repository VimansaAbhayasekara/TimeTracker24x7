"use client"

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { motion } from "framer-motion"
import { Skeleton } from "@/components/ui/skeleton"
import { TrendingUp } from "lucide-react"

interface OvertimeData {
  date: string
  resource: string
  overtimeHours: number
  totalHours: number
}

interface OvertimeAnalysisChartProps {
  data: OvertimeData[]
  loading?: boolean
}

export function OvertimeAnalysisChart({ data, loading = false }: OvertimeAnalysisChartProps) {
  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-orange-500 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Overtime Analysis
          </CardTitle>
          <CardDescription>Hours worked beyond standard work hours</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[500px] w-full" />
        </CardContent>
      </Card>
    )
  }

  // Process data for line chart - group by date and resource
  const processedData = data
    .reduce((acc: any[], item) => {
      const key = `${item.date}-${item.resource}`
      const existingEntry = acc.find((d) => d.key === key)
      if (existingEntry) {
        existingEntry.overtimeHours += item.overtimeHours
      } else {
        acc.push({
          key,
          date: item.date,
          resource: item.resource,
          overtimeHours: item.overtimeHours,
          totalHours: item.totalHours,
          formattedDate: new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        })
      }
      return acc
    }, [])
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  // Group by date for chart display
  const chartData = processedData.reduce((acc: any[], item) => {
    const existingDate = acc.find((d) => d.date === item.date)
    if (existingDate) {
      existingDate.totalOvertime += item.overtimeHours
      existingDate.resources.push({
        name: item.resource,
        hours: item.overtimeHours,
      })
    } else {
      acc.push({
        date: item.date,
        formattedDate: item.formattedDate,
        totalOvertime: item.overtimeHours,
        resources: [
          {
            name: item.resource,
            hours: item.overtimeHours,
          },
        ],
      })
    }
    return acc
  }, [])

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-popover p-4 rounded-lg shadow-lg border border-border max-w-xs">
          <p className="text-foreground font-semibold">{data.formattedDate}</p>
          <p className="text-orange-500">{`Total Overtime: ${data.totalOvertime.toFixed(1)}h`}</p>
          <div className="mt-2">
            <p className="text-foreground font-semibold">Resources:</p>
            <div className="max-h-32 overflow-y-auto">
              <ul className="list-disc list-inside">
                {data.resources.map((resource: any, index: number) => (
                  <li key={index} className="text-primary text-sm">
                    {resource.name}: {resource.hours.toFixed(1)}h
                  </li>
                ))}
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
        <CardTitle className="text-orange-500 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Overtime Analysis
        </CardTitle>
        <CardDescription>
          Daily overtime trends ({data.length} overtime instances across {chartData.length} days)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[500px] w-full">
          {chartData.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No Overtime Detected</p>
                <p className="text-sm">All team members are working within standard hours</p>
              </div>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, ease: "easeOut" }}
              className="h-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <defs>
                    <linearGradient id="overtimeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="formattedDate"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={{ stroke: "hsl(var(--border))" }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={{ stroke: "hsl(var(--border))" }}
                    tickFormatter={(value) => `${value}h`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ color: "hsl(var(--foreground))", fontSize: 14 }} />
                  <Line
                    type="monotone"
                    dataKey="totalOvertime"
                    stroke="#f97316"
                    strokeWidth={3}
                    name="Daily Overtime Hours"
                    dot={{ fill: "#f97316", strokeWidth: 2, r: 6 }}
                    activeDot={{ r: 8, stroke: "#f97316", strokeWidth: 2 }}
                    fill="url(#overtimeGradient)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </motion.div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
