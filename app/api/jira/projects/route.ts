import { NextResponse } from "next/server"
import fetch from "node-fetch"

interface Project {
  id: string
  name: string
}

interface JiraIssue {
  fields: {
    project?: {
      key: string
      name: string
    }
  }
}

interface JiraResponse {
  issues: JiraIssue[]
  total: number
  maxResults: number
  startAt: number
}

// Helper function to fetch all projects with pagination
async function fetchAllProjectsWithWorklogs() {
  const authHeader = `Basic ${Buffer.from(`${process.env.JIRA_USERNAME}:${process.env.JIRA_TOKEN}`).toString("base64")}`
  const maxResults = 100
  let startAt = 0
  let allIssues: JiraIssue[] = []
  let totalFetched = 0

  const baseJql = "timespent > 0"

  do {
    const jiraUrl = `${process.env.JIRA_BASE_URL}/rest/api/2/search?jql=${encodeURIComponent(baseJql)}&fields=project&maxResults=${maxResults}&startAt=${startAt}`

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

export async function GET() {
  try {
    const allIssues = await fetchAllProjectsWithWorklogs()
    const projectsMap: { [key: string]: Project } = {}

    allIssues.forEach((issue) => {
      const project = issue.fields.project
      if (project && !projectsMap[project.key]) {
        projectsMap[project.key] = {
          id: project.key,
          name: project.name,
        }
      }
    })

    const projects = Object.values(projectsMap)

    return NextResponse.json(projects)
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to retrieve projects with worklogs",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
