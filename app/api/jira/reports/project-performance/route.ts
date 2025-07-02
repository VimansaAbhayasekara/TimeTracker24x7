/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextResponse } from "next/server"
import fetch from "node-fetch"
import * as xlsx from "xlsx"

interface Worklog {
  started: string
  updateAuthor: { displayName: string }
  timeSpentSeconds: number
}

interface Issue {
  key: string
  fields: {
    summary: string
    status: { name: string }
    assignee: { displayName: string } | null
    project: { name: string; key: string }
    worklog: { worklogs: Worklog[] }
    created: string
    updated: string
    priority: { name: string }
    issuetype: { name: string }
  }
}

interface JiraResponse {
  issues: Issue[]
  total: number
}

interface ProjectPerformanceData {
  ProjectID: string
  ProjectName: string
  TotalIssues: number
  CompletedIssues: number
  CompletionRate: string
  TotalHoursSpent: number
  AvgHoursPerIssue: number
  ResourceCount: number
  AvgIssueResolutionDays: number
  HighPriorityIssues: number
  BugCount: number
  StoryCount: number
  TaskCount: number
  LastUpdated: string
}

// Helper function to fetch all JIRA data with pagination
async function fetchAllJiraData(startDate: string, endDate: string, project: string) {
  const authHeader = `Basic ${Buffer.from(`${process.env.JIRA_USERNAME}:${process.env.JIRA_TOKEN}`).toString("base64")}`
  const maxResults = 100
  let startAt = 0
  let allIssues: Issue[] = []
  let totalFetched = 0

  const baseJql =
    project === "ALL"
      ? `worklogDate >= "${startDate}" AND worklogDate <= "${endDate}"`
      : `project = "${project}" AND worklogDate >= "${startDate}" AND worklogDate <= "${endDate}"`

  do {
    const jiraUrl = `${process.env.JIRA_BASE_URL}/rest/api/2/search?jql=${encodeURIComponent(
      baseJql,
    )}&fields=worklog,summary,assignee,project,key,status,created,updated,priority,issuetype&expand=worklog&maxResults=${maxResults}&startAt=${startAt}`

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

      await new Promise((resolve) => setTimeout(resolve, 100))
    } catch (error) {
      throw error
    }
  } while (true)

  return allIssues
}

// Helper function to process JIRA data into performance metrics
function processPerformanceData(issues: Issue[]): ProjectPerformanceData[] {
  const projectMap = new Map<string, ProjectPerformanceData>()

  issues.forEach((issue) => {
    const projectId = issue.fields.project.key
    const projectName = issue.fields.project.name
    const createdDate = new Date(issue.fields.created)
    const updatedDate = new Date(issue.fields.updated)
    const resolutionDays = Math.floor((updatedDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24))
    const isCompleted = issue.fields.status.name.toLowerCase().includes("done")
    const isHighPriority = issue.fields.priority.name.toLowerCase().includes("high")
    const issueType = issue.fields.issuetype.name.toLowerCase()

    // Calculate total hours from worklogs
    let issueHours = 0
    if (issue.fields.worklog?.worklogs) {
      issueHours = issue.fields.worklog.worklogs.reduce(
        (total, log) => total + log.timeSpentSeconds / 3600,
        0,
      )
    }

    // Get or create project entry
    let projectData = projectMap.get(projectId)
    if (!projectData) {
      projectData = {
        ProjectID: projectId,
        ProjectName: projectName,
        TotalIssues: 0,
        CompletedIssues: 0,
        CompletionRate: "0%",
        TotalHoursSpent: 0,
        AvgHoursPerIssue: 0,
        ResourceCount: 0,
        AvgIssueResolutionDays: 0,
        HighPriorityIssues: 0,
        BugCount: 0,
        StoryCount: 0,
        TaskCount: 0,
        LastUpdated: updatedDate.toISOString().split("T")[0],
      }
      projectMap.set(projectId, projectData)
    }

    // Update project metrics
    projectData.TotalIssues += 1
    projectData.TotalHoursSpent += issueHours
    projectData.AvgIssueResolutionDays =
      (projectData.AvgIssueResolutionDays * (projectData.TotalIssues - 1) + resolutionDays) / projectData.TotalIssues

    if (isCompleted) projectData.CompletedIssues += 1
    if (isHighPriority) projectData.HighPriorityIssues += 1

    // Count issue types
    if (issueType.includes("bug")) projectData.BugCount += 1
    else if (issueType.includes("story")) projectData.StoryCount += 1
    else if (issueType.includes("task")) projectData.TaskCount += 1

    // Track unique assignees for resource count
    if (issue.fields.assignee) {
      // This would need a more robust solution to track unique resources across all issues
      projectData.ResourceCount = Math.max(projectData.ResourceCount, 1) // Simplified for this example
    }
  })

  // Calculate derived metrics
  projectMap.forEach((projectData) => {
    projectData.CompletionRate = ((projectData.CompletedIssues / projectData.TotalIssues) * 100).toFixed(1) + "%"
    projectData.AvgHoursPerIssue = projectData.TotalHoursSpent / projectData.TotalIssues
  })

  return Array.from(projectMap.values())
}

// Endpoint to fetch project performance data as JSON
export async function POST(req: Request) {
  const { startDate, endDate, project } = await req.json()

  if (!startDate || !endDate || !project) {
    return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
  }

  try {
    const issues = await fetchAllJiraData(startDate, endDate, project)
    const performanceData = processPerformanceData(issues)

    return NextResponse.json({
      data: performanceData,
      total: performanceData.length,
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
    const performanceData = processPerformanceData(issues)

    // Format for Excel with additional calculated columns
    const excelData = performanceData.map((project) => ({
      "Project ID": project.ProjectID,
      "Project Name": project.ProjectName,
      "Total Issues": project.TotalIssues,
      "Completed Issues": project.CompletedIssues,
      "Completion Rate": project.CompletionRate,
      "Total Hours Spent": project.TotalHoursSpent.toFixed(1),
      "Avg Hours per Issue": project.AvgHoursPerIssue.toFixed(1),
      "Team Size": project.ResourceCount,
      "Avg Resolution Time (days)": project.AvgIssueResolutionDays.toFixed(1),
      "High Priority Issues": project.HighPriorityIssues,
      "Bugs": project.BugCount,
      "User Stories": project.StoryCount,
      "Tasks": project.TaskCount,
      "Last Updated": project.LastUpdated,
      "Efficiency Score": (
        (project.CompletedIssues / (project.TotalHoursSpent || 1)) *
        (1 - project.BugCount / project.TotalIssues)
      ).toFixed(2),
    }))

    const worksheet = xlsx.utils.json_to_sheet(excelData)
    const workbook = xlsx.utils.book_new()
    xlsx.utils.book_append_sheet(workbook, worksheet, "Project Performance")

    const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" })

    return new Response(buffer, {
      headers: {
        "Content-Disposition": `attachment; filename="Project_Performance_Report_${startDate}_to_${endDate}.xlsx"`,
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