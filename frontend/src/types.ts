/**
 * Shape of everything the API returns.
 *
 * These used to be `any` at every call site, which is how the UI ended up reading
 * both `person.firstName` and `person.FirstName` defensively for the same field.
 */

export type Role = 'Admin' | 'Employer' | 'Employee'

export type CurrentUser = {
  id: string
  email: string
  firstName?: string
  lastName?: string
  companyName?: string | null
  professionalTitle?: string | null
  roles: Role[]
}

export type JobPosting = {
  id: number
  title: string
  company: string
  companyDescription?: string
  description: string
  location: string
  salary: string
  jobType: string
  workMode?: string
  employmentType?: string
  seniorityLevel?: string
  requirements?: string
  responsibilities?: string
  benefits?: string
  deadline?: string | null
  isDeleted?: boolean
  createdAt?: string
  tags: string[]
}

export type JobApplication = {
  id: number
  userId: string
  jobId: number
  jobTitle: string
  companyName: string
  applicantName: string
  applicantEmail: string
  message: string
  status: ApplicationStatus
  appliedAt: string
  updatedAt?: string
}

export type SavedJob = {
  id: number
  jobPostingId: number
  savedAt: string
  job: {
    id: number
    title: string
    company: string
    location: string
    salary: string
    jobType?: string
    isDeleted?: boolean
  } | null
}

export type Experience = {
  id: number
  title: string
  company: string
  startDate: string
  endDate?: string | null
  isCurrent?: boolean
  description: string
}

export type Education = {
  id: number
  school: string
  degree: string
  fieldOfStudy: string
  startYear: string
  endYear?: string | null
}

export type Skill = {
  id: number
  name: string
}

/** A profile as seen by other people. Contact details are deliberately absent. */
export type PublicProfile = {
  id: string
  firstName: string
  lastName: string
  companyName: string
  professionalTitle: string
  bio: string
  city: string
  country: string
  avatarUrl: string | null
  bannerUrl: string | null
  companySize: string
  industry: string
  techStack: string
  benefits: string
  experiences: Experience[]
  educations: Education[]
  skills: Skill[]
}

/** The signed-in user's own profile, which does include contact details. */
export type MyProfile = {
  id: string
  email: string
  firstName: string
  lastName: string
  companyName: string
  professionalTitle: string
  phoneNumber: string
  bio: string
  companySize: string
  industry: string
  techStack: string
  benefits: string
  addressLine1: string
  addressLine2: string
  city: string
  postalCode: string
  country: string
  avatarUrl: string | null
  bannerUrl: string | null
  experiences: Experience[]
  educations: Education[]
  skills: Skill[]
}

export type NotificationItem = {
  id: number
  title: string
  message: string
  type: string
  isRead: boolean
  linkUrl?: string | null
  createdAt: string
}

export type Conversation = {
  otherUserId: string
  otherUserName: string
  otherUserCompany?: string | null
  otherUserTitle?: string | null
  lastMessageId: number
  lastMessageSubject: string
  lastMessageContent: string
  lastMessageSentAt: string
  unreadCount: number
  iBlockedThem: boolean
  theyBlockedMe: boolean
}

export type ThreadMessage = {
  id: number
  senderUserId: string
  receiverUserId: string
  subject: string
  content: string
  isRead: boolean
  sentAt: string
}

export type Friend = {
  id: string
  firstName: string
  lastName: string
  companyName?: string | null
  professionalTitle?: string | null
  isBlocked: boolean
}

export type FriendRequest = {
  id: number
  senderId: string
  receiverId: string
  createdAt: string
  isOutgoing: boolean
  otherUserId: string
  otherName: string
  otherTitle: string
}

export type FriendshipStatus = {
  isFriend: boolean
  requestSent: boolean
  requestReceived: boolean
  incomingRequestId: number | null
}

export type AdminUser = {
  id: string
  email: string
  firstName: string
  lastName: string
  companyName?: string | null
  professionalTitle?: string | null
  roles: Role[]
  isDisabled: boolean
}

/** An employer a posting can be assigned to, from `/api/admin/employers`. */
export type AdminEmployer = {
  id: string
  email: string
  companyName: string | null
  firstName: string
  lastName: string
}

export type AdminJob = {
  id: number
  title: string
  ownerId: string
  ownerCompany: string
  company: string
  companyDescription: string
  location: string
  salary: string
  jobType: string
  workMode: string
  employmentType: string
  seniorityLevel: string
  description: string
  requirements: string
  responsibilities: string
  benefits: string
  deadline: string | null
  isDeleted: boolean
  createdAt: string
  tags: string[]
}

export type PendingRegistration = {
  id: string
  email: string
  firstName: string
  lastName: string
  role: Role
  createdAt: string
  expiresAt: string
}

export type AdminStats = {
  totalUsers: number
  totalJobs: number
  activeJobs: number
  deletedJobs: number
  totalApplications: number
  employers: number
  employees: number
  admins: number
}

export const APPLICATION_STATUSES = [
  'Pending',
  'Reviewed',
  'Interviewing',
  'Accepted',
  'Rejected',
] as const

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number]

/** Every paged endpoint returns this envelope. */
export type Paged<T> = {
  items: T[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}
