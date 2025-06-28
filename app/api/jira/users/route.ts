import { NextResponse } from "next/server"
import fetch from "node-fetch"

interface User {
  accountId: string
  displayName: string
  emailAddress?: string
  active?: boolean
}

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

// System users to exclude
const SYSTEM_USERS = [
  "atlassian",
  "slack",
  "trello",
  "assistant",
  "bot",
  "jira",
  "automation",
  "system",
  "addon",
  "integration",
  "admin",
  "administrator",
]

// Helper to identify system users
function isSystemUser(user: User | string): boolean {
  const name = typeof user === "string" ? user.toLowerCase() : user.displayName?.toLowerCase() || ""
  return SYSTEM_USERS.some((sysUser) => name.includes(sysUser))
}

// Fetch all users with pagination from JIRA user API
async function fetchAllJiraUsers(): Promise<User[]> {
  const authHeader = `Basic ${Buffer.from(`${process.env.JIRA_USERNAME}:${process.env.JIRA_TOKEN}`).toString("base64")}`
  const maxResults = 100
  let startAt = 0
  const allUsers: User[] = []

  do {
    const userSearchUrl = `${process.env.JIRA_BASE_URL}/rest/api/2/user/search?query=&startAt=${startAt}&maxResults=${maxResults}`

    const response = await fetch(userSearchUrl, {
      method: "GET",
      headers: {
        Authorization: authHeader,
        Accept: "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(`JIRA API error: ${response.status} - ${response.statusText}`)
    }

    const currentUsers = (await response.json()) as User[]

    // Filter out system users and inactive accounts
    const filteredUsers = currentUsers.filter((user) => user.active !== false && !isSystemUser(user))

    allUsers.push(...filteredUsers)
    startAt += maxResults

    // Add delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Continue until we get fewer users than requested
    if (currentUsers.length < maxResults) {
      break
    }
  } while (true)

  return allUsers
}

export async function GET() {
  try {
    // First try to get all users through the user search API
    const directUsers = await fetchAllJiraUsers()

    // If we got users, return them
    if (directUsers.length > 0) {
      const formattedUsers = directUsers.map((user) => ({
        name: user.displayName,
        email: user.emailAddress || "",
        accountId: user.accountId,
      }))
      return NextResponse.json(formattedUsers)
    }

    // Fallback to worklog-based approach if direct search fails
    const authHeader = `Basic ${Buffer.from(`${process.env.JIRA_USERNAME}:${process.env.JIRA_TOKEN}`).toString("base64")}`
    const jql = "worklogDate >= -365d" // Look at worklogs from the past year
    const maxResults = 100
    let startAt = 0
    const usersMap: Record<string, User> = {}

    do {
      const jiraUrl = `${process.env.JIRA_BASE_URL}/rest/api/2/search?jql=${encodeURIComponent(jql)}&fields=worklog&expand=worklog&maxResults=${maxResults}&startAt=${startAt}`

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
            const userName = log.updateAuthor.displayName
            if (userName && !isSystemUser(userName)) {
              usersMap[log.updateAuthor.accountId] = {
                displayName: userName,
                accountId: log.updateAuthor.accountId,
                active: true,
              }
            }
          }
        })
      })

      startAt += maxResults

      // Add delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Continue until we've processed all issues
      if (startAt >= data.total) {
        break
      }
    } while (true)

    // Convert the map to an array
    const fallbackUsers = Object.values(usersMap)

    if (fallbackUsers.length === 0) {
      throw new Error("No active users found in JIRA")
    }

    return NextResponse.json(
      fallbackUsers.map((user) => ({
        name: user.displayName,
        email: "",
        accountId: user.accountId,
      })),
    )
  } catch (error) {
    console.error("Error fetching JIRA users:", error)
    return NextResponse.json(
      {
        error: "Failed to retrieve users",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
