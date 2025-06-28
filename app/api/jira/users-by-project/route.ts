import { NextResponse } from "next/server"
import fetch from "node-fetch"

interface JiraWorklog {
  updateAuthor?: {
    displayName: string
    accountId: string
  }
}

interface JiraIssue {
  fields: {
    worklog?: {
      worklogs?: JiraWorklog[]
    }
  }
}

interface JiraResponse {
  issues: JiraIssue[]
  total: number
  maxResults: number
  startAt: number
}

export async function POST(req: Request) {
  try {
    const { project, startDate, endDate } = await req.json()

    if (!project || !startDate || !endDate) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    const authHeader = `Basic ${Buffer.from(`${process.env.JIRA_USERNAME}:${process.env.JIRA_TOKEN}`).toString("base64")}`
    const maxResults = 100
    let startAt = 0
    const usersMap: Record<string, { displayName: string; accountId: string }> = {}

    const baseJql =
      project === "ALL"
        ? `worklogDate >= "${startDate}" AND worklogDate <= "${endDate}"`
        : `project = "${project}" AND worklogDate >= "${startDate}" AND worklogDate <= "${endDate}"`

    do {
      const jiraUrl = `${process.env.JIRA_BASE_URL}/rest/api/2/search?jql=${encodeURIComponent(baseJql)}&fields=worklog&expand=worklog&maxResults=${maxResults}&startAt=${startAt}`

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

      // Process worklogs to find users
      data.issues.forEach((issue) => {
        issue.fields.worklog?.worklogs?.forEach((log) => {
          if (log.updateAuthor) {
            const logDate = new Date(log.started || "")
            const filterStartDate = new Date(startDate)
            const filterEndDate = new Date(endDate)

            if (logDate >= filterStartDate && logDate <= filterEndDate) {
              usersMap[log.updateAuthor.accountId] = {
                displayName: log.updateAuthor.displayName,
                accountId: log.updateAuthor.accountId,
              }
            }
          }
        })
      })

      startAt += maxResults

      if (startAt >= data.total) {
        break
      }

      // Add delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100))
    } while (true)

    const users = Object.values(usersMap).map((user) => ({
      name: user.displayName,
      email: "",
      accountId: user.accountId,
    }))

    return NextResponse.json(users)
  } catch (error) {
    console.error("Error fetching users by project:", error)
    return NextResponse.json(
      {
        error: "Failed to retrieve users for project",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
