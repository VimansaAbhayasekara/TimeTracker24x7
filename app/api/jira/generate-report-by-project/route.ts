/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextResponse } from "next/server"
import fetch from "node-fetch"
import * as xlsx from "xlsx"
import { v4 as uuidv4 } from "uuid"

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

interface ReportData {
  Date: string
  ProjectName: string
  ProjectID: string
  IssueID: string
  Assignee: string
  UpdatedBy: string
  Issue: string
  Comment: string
  Hours: string
  UniqueKey: string
}

// Helper function to fetch all JIRA data with pagination
async function fetchAllJiraData(startDate: string, endDate: string, project: string) {
  const authHeader = `Basic ${Buffer.from(`${process.env.JIRA_USERNAME}:${process.env.JIRA_TOKEN}`).toString("base64")}`
  const maxResults = 100 // Optimal batch size
  let startAt = 0
  let allIssues: Issue[] = []
  let totalFetched = 0

  const baseJql =
    project === "ALL"
      ? `worklogDate >= "${startDate}" AND worklogDate <= "${endDate}"`
      : `project = "${project}" AND worklogDate >= "${startDate}" AND worklogDate <= "${endDate}"`

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

      // Break if we've fetched all available issues
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

// Helper function to process JIRA data
function processJiraData(issues: Issue[], startDate: string, endDate: string): ReportData[] {
  const taskData: ReportData[] = []
  const startDateObj = new Date(startDate + "T00:00:00")
  const endDateObj = new Date(endDate + "T23:59:59")

  issues.forEach((issue) => {
    const title = issue.fields.summary || "No title available"
    const assigneeEmail = issue.fields.assignee?.displayName || "Unassigned"
    const projectName = issue.fields.project?.name || "No project name"
    const projectId = issue.fields.project?.key || "No project ID"
    const issueId = issue.key || "No issue ID"

    if (issue.fields.worklog?.worklogs) {
      issue.fields.worklog.worklogs.forEach((log) => {
        const logDate = new Date(log.started)

        // Check if logDate is within the range (inclusive)
        if (logDate >= startDateObj && logDate <= endDateObj) {
          const hours = Math.floor(log.timeSpentSeconds / 3600)
          const minutes = Math.floor((log.timeSpentSeconds % 3600) / 60)
          const timeSpent = (() => {
            if (hours === 0 && minutes === 0) return "0h"
            if (minutes === 0) return `${hours}h`
            return `${hours}h ${minutes}m`
          })()

          // Format date in Sri Lankan timezone
          const sriLankanDate = new Date(logDate.getTime() + 5.5 * 60 * 60 * 1000)
          const formattedDate = sriLankanDate.toISOString().split("T")[0]

          const updatedBy = log.updateAuthor?.displayName || assigneeEmail
          const finalAssignee = assigneeEmail === "Unassigned" ? updatedBy : assigneeEmail

          taskData.push({
            Date: formattedDate,
            ProjectName: projectName,
            ProjectID: projectId,
            IssueID: issueId,
            Assignee: finalAssignee,
            UpdatedBy: updatedBy,
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

// Endpoint to fetch report data as JSON with pagination
export async function POST(req: Request) {
  const { startDate, endDate, project, page = 1, limit = 50 } = await req.json()

  if (!startDate || !endDate || !project) {
    return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
  }

  try {
    const issues = await fetchAllJiraData(startDate, endDate, project)
    const taskData = processJiraData(issues, startDate, endDate)

    // Apply pagination
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedData = taskData.slice(startIndex, endIndex)

    return NextResponse.json({
      data: paginatedData,
      total: taskData.length,
      page,
      limit,
      totalPages: Math.ceil(taskData.length / limit),
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

// Endpoint to download the report as Excel
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const startDate = searchParams.get("startDate")
  const endDate = searchParams.get("endDate")
  const project = searchParams.get("project")

  if (!startDate || !endDate || !project) {
    return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
  }

  try {
    const issues = await fetchAllJiraData(startDate, endDate, project)
    const taskData = processJiraData(issues, startDate, endDate)
    const taskDataWithoutKey = taskData.map(({ UniqueKey: _, ...rest }) => rest)

    const worksheet = xlsx.utils.json_to_sheet(taskDataWithoutKey)
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
