import { NextResponse } from "next/server"
import fetch from "node-fetch"

interface Worklog {
  started: string
  updateAuthor: { displayName: string }
  comment: string
  timeSpentSeconds: number
}

interface Issue {
  key: string
  fields: {
    summary: string
    assignee: { displayName: string } | null
    project: { name: string; key: string }
    worklog: { worklogs: Worklog[] }
  }
}

interface JiraResponse {
  issues: Issue[]
  total: number
  maxResults: number
  startAt: number
}

const DEFAULT_WORK_HOURS = 8 // This should come from settings

export async function POST(req: Request) {
  try {
    const { startDate, endDate, project, user } = await req.json()

    if (!startDate || !endDate || !project) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    const authHeader = `Basic ${Buffer.from(`${process.env.JIRA_USERNAME}:${process.env.JIRA_TOKEN}`).toString("base64")}`
    const maxResults = 100
    let startAt = 0
    let allIssues: Issue[] = []

    const baseJql =
      project === "ALL"
        ? `worklogDate >= "${startDate}" AND worklogDate <= "${endDate}"`
        : `project = "${project}" AND worklogDate >= "${startDate}" AND worklogDate <= "${endDate}"`

    // Fetch all issues with worklogs
    do {
      const jiraUrl = `${process.env.JIRA_BASE_URL}/rest/api/2/search?jql=${encodeURIComponent(baseJql)}&fields=worklog,summary,assignee,project,key&expand=worklog&maxResults=${maxResults}&startAt=${startAt}`

      const response = await fetch(jiraUrl, {
        method: "GET",
        headers: {
          Authorization: authHeader,
          Accept: "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`JIRA API error: ${response.status} - ${response.statusText}`)
      }

      const data = (await response.json()) as JiraResponse
      allIssues = allIssues.concat(data.issues)
      startAt += maxResults

      if (startAt >= data.total || data.issues.length === 0) {
        break
      }

      await new Promise((resolve) => setTimeout(resolve, 100))
    } while (true)

    // Process the data
    const analyticsData = processAnalyticsData(allIssues, startDate, endDate, user)

    return NextResponse.json(analyticsData)
  } catch (error) {
    console.error("Error fetching analytics data:", error)
    return NextResponse.json(
      {
        error: "Failed to retrieve analytics data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

function processAnalyticsData(issues: Issue[], startDate: string, endDate: string, selectedUser: string) {
  const projectHoursMap: { [key: string]: number } = {}
  const resourceAllocationMap: { [key: string]: { userCount: number; users: string[] } } = {}
  const dailyHoursMap: { [key: string]: { [user: string]: number } } = {}
  let totalHours = 0

  const startDateObj = new Date(startDate)
  const endDateObj = new Date(endDate)
  endDateObj.setHours(23, 59, 59, 999)

  issues.forEach((issue) => {
    const projectName = issue.fields.project?.name || "Unknown Project"

    if (issue.fields.worklog?.worklogs) {
      issue.fields.worklog.worklogs.forEach((log) => {
        const logDate = new Date(log.started)

        if (logDate >= startDateObj && logDate <= endDateObj) {
          const resource = log.updateAuthor?.displayName || "Unknown User"
          const hours = log.timeSpentSeconds / 3600

          // Filter by user if specified
          if (
            selectedUser &&
            selectedUser !== "All Resources" &&
            selectedUser !== "The Team" &&
            resource !== selectedUser
          ) {
            return
          }

          totalHours += hours

          // Project hours
          projectHoursMap[projectName] = (projectHoursMap[projectName] || 0) + hours

          // Resource allocation
          if (!resourceAllocationMap[projectName]) {
            resourceAllocationMap[projectName] = { userCount: 0, users: [] }
          }
          if (!resourceAllocationMap[projectName].users.includes(resource)) {
            resourceAllocationMap[projectName].users.push(resource)
            resourceAllocationMap[projectName].userCount += 1
          }

          // Daily hours for overtime/undertime analysis
          const dateKey = logDate.toISOString().split("T")[0]
          if (!dailyHoursMap[dateKey]) {
            dailyHoursMap[dateKey] = {}
          }
          dailyHoursMap[dateKey][resource] = (dailyHoursMap[dateKey][resource] || 0) + hours
        }
      })
    }
  })

  // Process project hours
  const projectHours = Object.entries(projectHoursMap)
    .map(([project, totalHours]) => ({
      project: project.length > 25 ? project.substring(0, 25) + "..." : project,
      totalHours: Math.round(totalHours * 100) / 100,
    }))
    .sort((a, b) => b.totalHours - a.totalHours)
    .slice(0, 15)

  // Process resource allocation
  const resourceAllocation = Object.entries(resourceAllocationMap)
    .map(([project, { userCount, users }]) => ({
      project: project.length > 20 ? project.substring(0, 20) + "..." : project,
      userCount,
      users,
    }))
    .sort((a, b) => b.userCount - a.userCount)
    .slice(0, 10)

  // Process overtime analysis
  const overtimeAnalysis: any[] = []
  const undertimeAnalysis: any[] = []

  Object.entries(dailyHoursMap).forEach(([date, userHours]) => {
    Object.entries(userHours).forEach(([resource, hours]) => {
      if (hours > DEFAULT_WORK_HOURS) {
        overtimeAnalysis.push({
          resource: resource.length > 15 ? resource.substring(0, 15) + "..." : resource,
          date,
          overtimeHours: Math.round((hours - DEFAULT_WORK_HOURS) * 100) / 100,
          totalHours: Math.round(hours * 100) / 100,
        })
      } else if (hours > 0 && hours < DEFAULT_WORK_HOURS) {
        undertimeAnalysis.push({
          resource: resource.length > 15 ? resource.substring(0, 15) + "..." : resource,
          date,
          undertimeHours: Math.round((DEFAULT_WORK_HOURS - hours) * 100) / 100,
          totalHours: Math.round(hours * 100) / 100,
        })
      }
    })
  })

  // Sort by overtime/undertime hours descending
  overtimeAnalysis.sort((a, b) => b.overtimeHours - a.overtimeHours).slice(0, 20)
  undertimeAnalysis.sort((a, b) => b.undertimeHours - a.undertimeHours).slice(0, 20)

  return {
    projectHours,
    resourceAllocation,
    overtimeAnalysis,
    undertimeAnalysis,
    totalHours: Math.round(totalHours * 100) / 100,
    totalProjects: Object.keys(projectHoursMap).length,
    totalUsers: new Set(
      issues.flatMap(
        (issue) => issue.fields.worklog?.worklogs?.map((log) => log.updateAuthor?.displayName).filter(Boolean) || [],
      ),
    ).size,
  }
}
