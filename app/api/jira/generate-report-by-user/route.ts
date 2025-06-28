/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextResponse } from "next/server"
import fetch from "node-fetch"
import * as xlsx from "xlsx"
import { v4 as uuidv4 } from "uuid"

interface Worklog {
  started: string
  updateAuthor: { displayName: string }
  comment?: string
  timeSpentSeconds: number
}

interface Issue {
  key: string
  fields: {
    summary: string
    assignee?: { displayName: string }
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

interface ReportData {
  Date: string
  ProjectName: string
  ProjectID: string
  IssueID: string
  Assignee: string
  Issue: string
  Comment: string
  Hours: string
  UniqueKey: string
}

// Helper function to fetch all JIRA data with pagination for user reports
async function fetchAllJiraDataForUser(startDate: string, endDate: string, user: string) {
  const authHeader = `Basic ${Buffer.from(`${process.env.JIRA_USERNAME}:${process.env.JIRA_TOKEN}`).toString("base64")}`
  const maxResults = 100
  let startAt = 0
  let allIssues: Issue[] = []
  let totalFetched = 0

  // More specific JQL for user-based queries
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

      if (totalFetched >= data.total || data.issues.length === 0) {
        break
      }

      // Add small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100))
    } catch (error) {
      throw error
    }
  } while (true)

  return allIssues
}

// Helper function to process JIRA data for user reports
function processJiraDataForUser(issues: Issue[], startDate: string, endDate: string, user: string): ReportData[] {
  const taskData: ReportData[] = []
  const startDateObj = new Date(startDate)
  const endDateObj = new Date(endDate)
  endDateObj.setHours(23, 59, 59, 999)

  issues.forEach((issue) => {
    const title = issue.fields.summary || "No title available"
    const assigneeEmail = issue.fields.assignee?.displayName || "Unassigned"
    const projectName = issue.fields.project.name
    const projectId = issue.fields.project.key
    const issueId = issue.key

    if (issue.fields.worklog?.worklogs) {
      issue.fields.worklog.worklogs.forEach((log) => {
        const logDate = new Date(log.started)
        if (logDate >= startDateObj && logDate <= endDateObj) {
          const updatedBy = log.updateAuthor?.displayName || assigneeEmail

          // Filter by user if not 'ALL'
          if (user !== "ALL" && updatedBy !== user) return

          const hours = Math.floor(log.timeSpentSeconds / 3600)
          const minutes = Math.floor((log.timeSpentSeconds % 3600) / 60)
          const timeSpent = (() => {
            if (hours === 0 && minutes === 0) return "0h"
            if (minutes === 0) return `${hours}h`
            return `${hours}h ${minutes}m`
          })()

          taskData.push({
            Date: logDate.toISOString().split("T")[0],
            ProjectName: projectName,
            ProjectID: projectId,
            IssueID: issueId,
            Assignee: assigneeEmail,
            Issue: title,
            Comment: log.comment || "No comment",
            Hours: timeSpent,
            UniqueKey: uuidv4(),
          })
        }
      })
    }
  })

  // Sort by date in ascending order
  taskData.sort((a, b) => new Date(a.Date).getTime() - new Date(b.Date).getTime())

  return taskData
}

// Endpoint to fetch report data as JSON
export async function POST(req: Request) {
  const { startDate, endDate, user } = await req.json()

  if (!startDate || !endDate || !user) {
    return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
  }

  try {
    const issues = await fetchAllJiraDataForUser(startDate, endDate, user)
    const taskData = processJiraDataForUser(issues, startDate, endDate, user)

    return NextResponse.json(taskData)
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

// Endpoint to download the report as Excel
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const startDate = searchParams.get("startDate")
  const endDate = searchParams.get("endDate")
  const user = searchParams.get("user")

  if (!startDate || !endDate || !user) {
    return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
  }

  try {
    const issues = await fetchAllJiraDataForUser(startDate, endDate, user)
    const taskData = processJiraDataForUser(issues, startDate, endDate, user)
    const taskDataWithoutKey = taskData.map(({ UniqueKey: _, ...rest }) => rest)

    // Calculate total hours and minutes
    let totalHours = 0
    let totalMinutes = 0
    taskData.forEach((entry) => {
      const [hours, minutes] = entry.Hours.split("h").map((part) => Number.parseFloat(part) || 0)
      totalHours += hours
      totalMinutes += minutes
    })

    // Convert excess minutes to hours
    totalHours += Math.floor(totalMinutes / 60)
    totalMinutes = totalMinutes % 60

    // Add a row for Total Actual Hours
    const totalRow = {
      Date: "Total Actual Hours",
      ProjectName: "",
      ProjectID: "",
      IssueID: "",
      Assignee: "",
      Issue: "",
      Comment: "",
      Hours: `${totalHours}h ${totalMinutes}m`,
    }

    const dataWithTotal = [...taskDataWithoutKey, totalRow]

    const worksheet = xlsx.utils.json_to_sheet(dataWithTotal)
    const workbook = xlsx.utils.book_new()
    xlsx.utils.book_append_sheet(workbook, worksheet, "Worklog Report")

    const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" })

    return new Response(buffer, {
      headers: {
        "Content-Disposition": `attachment; filename="Worklog_Report_${startDate}_to_${endDate}.xlsx"`,
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
