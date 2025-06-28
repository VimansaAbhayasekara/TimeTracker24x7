export interface User {
  name: string
  email?: string
  accountId?: string
}

export interface Project {
  id: string
  name: string
}

export interface ReportData {
  Date: string
  ProjectName: string
  ProjectID: string
  IssueID: string
  Assignee: string
  UpdatedBy?: string // Optional for by-resource
  Issue: string
  Comment: string
  Hours: string
  UniqueKey?: string
}
