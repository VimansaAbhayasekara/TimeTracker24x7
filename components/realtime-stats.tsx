"use client"

import { motion } from "framer-motion"
import { Clock, Users, Briefcase, TrendingUp } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

interface RealtimeStatsProps {
  stats: {
    totalProjects: number
    totalUsers: number
    totalHours: number
    activeProjects: number
  }
  loading?: boolean
}

const statCards = [
  {
    title: "Total Projects",
    key: "totalProjects" as const,
    icon: Briefcase,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    title: "Active Users",
    key: "totalUsers" as const,
    icon: Users,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  {
    title: "Hours Tracked",
    key: "totalHours" as const,
    icon: Clock,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  {
    title: "Active Projects",
    key: "activeProjects" as const,
    icon: TrendingUp,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
]

export function RealtimeStats({ stats, loading = false }: RealtimeStatsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat, index) => (
        <motion.div
          key={stat.key}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card className="group hover:shadow-lg transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  {loading ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="text-3xl font-bold">{stats[stat.key].toLocaleString()}</p>
                  )}
                </div>
                <div
                  className={`flex items-center justify-center w-12 h-12 rounded-xl ${stat.bgColor} group-hover:scale-110 transition-transform duration-300`}
                >
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}
