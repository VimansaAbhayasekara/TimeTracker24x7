// app/api/jira/resource-utilization/route.ts
import { NextResponse } from "next/server"
import fetch from "node-fetch"
import * as xlsx from "xlsx"
import { v4 as uuidv4 } from "uuid"

interface Worklog {
  started: string
  updateAuthor: { displayName: string; emailAddress?: string }
  comment?: string
  timeSpentSeconds: number
}

interface Issue {
  key: string
  fields: {
    summary: string
    assignee?: { displayName: string; emailAddress?: string }
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

interface ResourceUtilizationData {
  Employee: string
  Email?: string
  TotalHours: number
  Utilization: string
  ProjectsWorked: number
  AvgHoursPerDay: number
  LastActiveDate?: string
  //UniqueKey: string
}

// Helper function to fetch all JIRA data with pagination
async function fetchAllJiraData(startDate: string, endDate: string) {
  const authHeader = `Basic ${Buffer.from(`${process.env.JIRA_USERNAME}:${process.env.JIRA_TOKEN}`).toString("base64")}`
  const maxResults = 100
  let startAt = 0
  let allIssues: Issue[] = []
  let totalFetched = 0

  const baseJql = `timespent > 0 AND worklogDate >= "${startDate}" AND worklogDate <= "${endDate}"`

  do {
    const jiraUrl = `${process.env.JIRA_BASE_URL}/rest/api/2/search?jql=${encodeURIComponent(baseJql)}&fields=worklog,summary,assignee,project,key&expand=worklog&maxResults=${maxResults}&startAt=${startAt}`

    try {
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
      totalFetched += data.issues.length
      startAt += maxResults

      if (totalFetched >= data.total || data.issues.length === 0) break

      await new Promise((resolve) => setTimeout(resolve, 100))
    } catch (error) {
      throw error
    }
  } while (true)

  return allIssues
}

function processResourceUtilizationData(issues: Issue[], startDate: string, endDate: string): ResourceUtilizationData[] {
  const resourceMap: Record<string, {
    hours: number
    projects: Set<string>
    lastActive?: Date
    email?: string
  }> = {}

  const startDateObj = new Date(startDate)
  const endDateObj = new Date(endDate)
  endDateObj.setHours(23, 59, 59, 999)

  // Calculate working days (excluding weekends)
  const workingDays = calculateWorkingDays(startDateObj, endDateObj)

  issues.forEach((issue) => {
    if (issue.fields.worklog?.worklogs) {
      issue.fields.worklog.worklogs.forEach((log) => {
        const logDate = new Date(log.started)
        if (logDate >= startDateObj && logDate <= endDateObj) {
          const user = log.updateAuthor?.displayName || issue.fields.assignee?.displayName || "Unassigned"
          const email = log.updateAuthor?.emailAddress || issue.fields.assignee?.emailAddress
          
          if (!resourceMap[user]) {
            resourceMap[user] = {
              hours: 0,
              projects: new Set(),
              email
            }
          }

          const hours = log.timeSpentSeconds / 3600
          resourceMap[user].hours += hours
          resourceMap[user].projects.add(issue.fields.project.name)
          
          // Track last active date
          if (!resourceMap[user].lastActive || logDate > resourceMap[user].lastActive!) {
            resourceMap[user].lastActive = logDate
          }
        }
      })
    }
  })

  return Object.entries(resourceMap).map(([user, data]) => {
    // Calculate utilization (assuming 8 hour work day)
    const utilization = (data.hours / (workingDays * 8)) * 100
    
    return {
      Employee: user,
      Email: data.email,
      TotalHours: parseFloat(data.hours.toFixed(2)),
      Utilization: `${Math.min(100, Math.round(utilization))}%`,
      ProjectsWorked: data.projects.size,
      AvgHoursPerDay: parseFloat((data.hours / workingDays).toFixed(2)),
      LastActiveDate: data.lastActive?.toISOString().split('T')[0],
      //UniqueKey: uuidv4()
    }
  })
}

function calculateWorkingDays(start: Date, end: Date): number {
  let count = 0
  const current = new Date(start)
  
  while (current <= end) {
    const day = current.getDay()
    if (day !== 0 && day !== 6) count++ // Skip weekends
    current.setDate(current.getDate() + 1)
  }
  
  return count || 1 // Ensure at least 1 day to avoid division by zero
}

export async function POST(req: Request) {
  const { startDate, endDate } = await req.json()

  if (!startDate || !endDate) {
    return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
  }

  try {
    const issues = await fetchAllJiraData(startDate, endDate)
    const utilizationData = processResourceUtilizationData(issues, startDate, endDate)
    
    // Sort by highest utilization
    utilizationData.sort((a, b) => parseFloat(b.Utilization) - parseFloat(a.Utilization))

    return NextResponse.json(utilizationData)
  } catch (error) {
    return NextResponse.json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const startDate = searchParams.get("startDate")
  const endDate = searchParams.get("endDate")

  if (!startDate || !endDate) {
    return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
  }

  try {
    const issues = await fetchAllJiraData(startDate, endDate)
    const utilizationData = processResourceUtilizationData(issues, startDate, endDate)
    
    // Sort by highest utilization
    utilizationData.sort((a, b) => parseFloat(b.Utilization) - parseFloat(a.Utilization))

    const worksheet = xlsx.utils.json_to_sheet(utilizationData)
    const workbook = xlsx.utils.book_new()
    xlsx.utils.book_append_sheet(workbook, worksheet, "Resource Utilization")

    const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" })

    return new Response(buffer, {
      headers: {
        "Content-Disposition": `attachment; filename="Resource_Utilization_${startDate}_to_${endDate}.xlsx"`,
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}