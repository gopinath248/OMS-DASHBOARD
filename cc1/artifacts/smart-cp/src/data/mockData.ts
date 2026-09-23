export interface Student {
  id: string;
  userId?: string;
  name: string;
  college: string;
  role: string;
  project: string;
  email: string;
  avatarUrl?: string | null;
  phone: string;
  startDate: string;
  endDate: string;
  manager: string;
  progress: number;
  status: string;
  cgpa: number;
  dob: string;
  gender: string;
  address: string;
  degree: string;
  year: string;
  skills: string[];
}

export interface Staff {
  id: string;
  name: string;
  designation: string;
  role: string;
  assignedInterns: string[];
  email: string;
  avatarUrl?: string | null;
  phone: string;
  status: string;
  bio: string;
}

export interface LeaveRequest {
  id: string;
  userId?: string;
  applicantId?: string;
  applicantRole?: string;
  internName: string;
  employeeName?: string;
  employeeId?: string;
  email?: string;
  avatarUrl?: string | null;
  type: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
  duration: number;
  halfDay?: boolean;
  halfDayPeriod?: string;
  submittedAt?: string;
  decidedBy?: string;
  decidedAt?: string;
  rejectionReason?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assignedTo: string;
  priority: string;
  dueDate: string;
  status: string;
  attachments: number;
}

export interface Shift {
  id: string;
  internName: string;
  currentShift: string;
  requestedShift: string;
  effectiveDate: string;
  reason: string;
  status: string;
}

export interface PerformanceDatum {
  internId: string;
  attendance: number;
  taskCompletion: number;
  communication: number;
  discipline: number;
  learning: number;
  innovation: number;
  leadership: number;
  collaboration: number;
}

export interface NotificationItem {
  id: string;
  category: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

export type ProjectStatus = "Active" | "Planning" | "On Hold" | "Completed" | "Cancelled" | string;
export type ProjectCategory = "Web Application" | "Mobile App" | "UI/UX Design" | "Data & AI" | "Infrastructure" | "Research" | "HR & Operations" | string;

export interface Project {
  id: string;
  name: string;
  description: string;
  category: ProjectCategory;
  createdBy: string;
  startDate: string;
  endDate: string;
  status: ProjectStatus;
  imageColor: string;
  assignedStaff: string[];
  assignedInterns: string[];
  techStack?: string[];
  priority?: "Critical" | "High" | "Medium" | "Low";
  remarks?: string;
}

export interface ProjectDocument {
  id: string;
  projectId: string;
  title: string;
  fileName: string;
  fileType: "pdf" | "docx" | "pptx" | "xlsx" | "zip" | "image" | string;
  uploadedBy: string;
  uploadDate: string;
  sizeMB: number;
}

export interface CalendarEvent {
  date: string;
  title: string;
  type: string;
}

export interface AppData {
  students: Student[];
  staff: Staff[];
  leaveRequests: LeaveRequest[];
  tasks: Task[];
  shifts: Shift[];
  performanceData: PerformanceDatum[];
  notifications: NotificationItem[];
  projects: Project[];
  projectDocuments: ProjectDocument[];
  events: CalendarEvent[];
}

export let students: Student[] = [];
export let staff: Staff[] = [];
export let leaveRequests: LeaveRequest[] = [];
export let tasks: Task[] = [];
export let shifts: Shift[] = [];
export let performanceData: PerformanceDatum[] = [];
export let notifications: NotificationItem[] = [];
export let projects: Project[] = [];
export let projectDocuments: ProjectDocument[] = [];
export let events: CalendarEvent[] = [];

let appDataLoaded = false;

function replaceArray<T>(source: T[] | undefined): T[] {
  return [...(source ?? [])];
}

export function hasLoadedAppData() {
  return appDataLoaded;
}

export function clearAppData() {
  students = [];
  staff = [];
  leaveRequests = [];
  tasks = [];
  shifts = [];
  performanceData = [];
  notifications = [];
  projects = [];
  projectDocuments = [];
  events = [];
  appDataLoaded = false;
}

export function replaceAppData(data: Partial<AppData>) {
  students = replaceArray(data.students);
  staff = replaceArray(data.staff);
  leaveRequests = replaceArray(data.leaveRequests);
  tasks = replaceArray(data.tasks);
  shifts = replaceArray(data.shifts);
  performanceData = replaceArray(data.performanceData);
  notifications = replaceArray(data.notifications);
  projects = replaceArray(data.projects);
  projectDocuments = replaceArray(data.projectDocuments);
  events = replaceArray(data.events);
  appDataLoaded = true;
}
