"use client"

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { motion } from "framer-motion"
import { Skeleton } from "@/components/ui/skeleton"
import { TrendingDown } from "lucide-react"

interface UndertimeData {
  date: string
  resource: string
  undertimeHours: number
  totalHours: number
}

interface UndertimeAnalysisChartProps {
  data: UndertimeData[]
  loading?: boolean
}

export function UndertimeAnalysisChart({ data, loading = false }: UndertimeAnalysisChartProps) {
  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-blue-500 flex items-center gap-2">
            <TrendingDown className="w-5 h-5" />
            Undertime Analysis
          </CardTitle>
          <CardDescription>Hours worked below standard work hours</CardDescription>
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
        existingEntry.undertimeHours += item.undertimeHours
      } else {
        acc.push({
          key,
          date: item.date,
          resource: item.resource,
          undertimeHours: item.undertimeHours,
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
      existingDate.totalUndertime += item.undertimeHours
      existingDate.resources.push({
        name: item.resource,
        hours: item.undertimeHours,
      })
    } else {
      acc.push({
        date: item.date,
        formattedDate: item.formattedDate,
        totalUndertime: item.undertimeHours,
        resources: [
          {
            name: item.resource,
            hours: item.undertimeHours,
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
          <p className="text-blue-500">{`Total Undertime: ${data.totalUndertime.toFixed(1)}h`}</p>
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
        <CardTitle className="text-blue-500 flex items-center gap-2">
          <TrendingDown className="w-5 h-5" />
          Undertime Analysis
        </CardTitle>
        <CardDescription>
          Daily undertime trends ({data.length} undertime instances across {chartData.length} days)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[500px] w-full">
          {chartData.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <TrendingDown className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No Undertime Detected</p>
                <p className="text-sm">All team members are meeting standard work hours</p>
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
                    <linearGradient id="undertimeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
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
                    dataKey="totalUndertime"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    name="Daily Undertime Hours"
                    dot={false}
                    fill="url(#undertimeGradient)"
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
