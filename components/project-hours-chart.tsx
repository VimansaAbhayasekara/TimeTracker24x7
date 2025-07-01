"use client"

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { motion } from "framer-motion"
import { Skeleton } from "@/components/ui/skeleton"

interface ProjectHoursChartProps {
  data: { project: string; totalHours: number }[]
  loading?: boolean
}

export function ProjectHoursChart({ data, loading = false }: ProjectHoursChartProps) {
  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-primary">Total Logged Work Hours by Project</CardTitle>
          <CardDescription>Hours distribution across all projects</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[500px] w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full bg-card border-border">
      <CardHeader>
        <CardTitle className="text-primary">Total Logged Work Hours by Project</CardTitle>
        <CardDescription>Hours distribution across all projects</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[500px] w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, ease: "easeOut" }}
            className="h-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                <defs>
                  <linearGradient id="amberGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                  </linearGradient>
                </defs>
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
                  tickFormatter={(value) => `${value}h`}
                />
                <Tooltip
                  cursor={false}
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                    color: "hsl(var(--popover-foreground))",
                  }}
                  formatter={(value) => [`${value} hours`, "Total Hours"]}
                  labelStyle={{ color: "hsl(var(--foreground))", fontWeight: "bold" }}
                />
                <Legend wrapperStyle={{ color: "hsl(var(--foreground))", fontSize: 14 }} />
                <Bar dataKey="totalHours" name="Total Logged Time" fill="url(#amberGradient)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </div>
      </CardContent>
    </Card>
  )
}
