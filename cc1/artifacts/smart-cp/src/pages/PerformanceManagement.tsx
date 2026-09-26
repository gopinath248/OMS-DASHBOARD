import { useEffect, useMemo, useState } from "react";
import { BarChart3, CheckCircle2, Clock3, FolderKanban, ListTodo, TrendingUp } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { projects, staff, students, tasks, performanceData } from "@/data/mockData";

type PersonType = "Employee" | "Intern";
type Person = {
  id: string;
  userId?: string;
  name: string;
  type: PersonType;
  role: string;
};

function normalize(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function isCompleted(status: string) {
  return ["completed", "complete", "done"].includes(normalize(status));
}

function isInProgress(status: string) {
  return ["in progress", "in-progress", "in_progress", "started"].includes(normalize(status));
}

function formatPercent(value: number) {
  return `${Math.round(value * 10) / 10}%`;
}

function taskBelongsToPerson(task: typeof tasks[number], person: Person) {
  const assignedUserId = normalize(task.assignedToUserId);
  const personUserId = normalize(person.userId);
  if (assignedUserId && personUserId) return assignedUserId === personUserId;
  return normalize(task.assignedTo) === normalize(person.name);
}

function projectBelongsToPerson(project: typeof projects[number], person: Person) {
  return person.type === "Employee"
    ? project.assignedStaff.includes(person.id)
    : project.assignedInterns.includes(person.id);
}

function projectStatusIsCompleted(status: string) {
  return normalize(status) === "completed";
}

export default function PerformanceManagement() {
  const people = useMemo<Person[]>(() => [
    ...staff.map(person => ({
      id: person.id,
      userId: person.userId,
      name: person.name,
      type: "Employee" as const,
      role: person.designation || person.role,
    })),
    ...students.map(person => ({
      id: person.id,
      userId: person.userId,
      name: person.name,
      type: "Intern" as const,
      role: person.role,
    })),
  ], []);
  const [selectedPersonId, setSelectedPersonId] = useState(() => people[0]?.id ?? "");
  const [groupFilter, setGroupFilter] = useState<"all" | PersonType>("all");

  const visiblePeople = useMemo(
    () => groupFilter === "all" ? people : people.filter(person => person.type === groupFilter),
    [groupFilter, people],
  );

  useEffect(() => {
    if (!visiblePeople.some(person => person.id === selectedPersonId)) {
      setSelectedPersonId(visiblePeople[0]?.id ?? "");
    }
  }, [selectedPersonId, visiblePeople]);

  const selectedPerson = people.find(person => person.id === selectedPersonId);
  const selectedTasks = selectedPerson ? tasks.filter(task => taskBelongsToPerson(task, selectedPerson)) : [];
  const selectedProjects = selectedPerson ? projects.filter(project => projectBelongsToPerson(project, selectedPerson)) : [];
  const completedTasks = selectedTasks.filter(task => isCompleted(task.status)).length;
  const inProgressTasks = selectedTasks.filter(task => isInProgress(task.status)).length;
  const pendingTasks = selectedTasks.length - completedTasks - inProgressTasks;
  const overdueTasks = selectedTasks.filter(task =>
    Boolean(task.dueDate) && !isCompleted(task.status) && new Date(task.dueDate).getTime() < Date.now()
  ).length;
  const completedProjects = selectedProjects.filter(project => projectStatusIsCompleted(project.status)).length;
  const taskCompletionRate = selectedTasks.length ? (completedTasks / selectedTasks.length) * 100 : null;
  const projectCompletionRate = selectedProjects.length ? (completedProjects / selectedProjects.length) * 100 : null;
  const storedPerformance = selectedPerson?.type === "Intern"
    ? performanceData.find(item => item.internId === selectedPerson.id)
    : undefined;
  const storedMetrics = storedPerformance
    ? [
        ["Attendance", storedPerformance.attendance],
        ["Communication", storedPerformance.communication],
        ["Discipline", storedPerformance.discipline],
        ["Learning", storedPerformance.learning],
        ["Innovation", storedPerformance.innovation],
        ["Leadership", storedPerformance.leadership],
        ["Collaboration", storedPerformance.collaboration],
      ].filter(([, value]) => Number(value) > 0)
    : [];

  const summary = useMemo(() => {
    const allTasks = groupFilter === "all"
      ? tasks
      : tasks.filter(task => visiblePeople.some(person => taskBelongsToPerson(task, person)));
    const completed = allTasks.filter(task => isCompleted(task.status)).length;
    const inProgress = allTasks.filter(task => isInProgress(task.status)).length;
    return {
      total: allTasks.length,
      completed,
      inProgress,
      pending: allTasks.length - completed - inProgress,
      completionRate: allTasks.length ? (completed / allTasks.length) * 100 : null,
    };
  }, [groupFilter, visiblePeople]);

  const chartData = [
    { name: "Completed", count: completedTasks },
    { name: "In progress", count: inProgressTasks },
    { name: "Pending", count: pendingTasks },
    { name: "Overdue", count: overdueTasks },
  ];
  const summaryCards: Array<{ label: string; value: string | number; icon: React.ElementType }> = [
    { label: "People", value: visiblePeople.length, icon: BarChart3 },
    { label: "Tasks", value: summary.total, icon: ListTodo },
    { label: "Completed", value: summary.completed, icon: CheckCircle2 },
    { label: "In progress", value: summary.inProgress, icon: Clock3 },
    { label: "Completion rate", value: summary.completionRate === null ? "—" : formatPercent(summary.completionRate), icon: TrendingUp },
  ];

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Performance Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">Analytics calculated from stored tasks, projects, and performance records.</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto">
          <Select value={groupFilter} onValueChange={value => setGroupFilter(value as "all" | PersonType)}>
            <SelectTrigger className="w-full sm:w-[150px]"><SelectValue placeholder="Group" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All people</SelectItem>
              <SelectItem value="Employee">Employees</SelectItem>
              <SelectItem value="Intern">Interns</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedPersonId} onValueChange={setSelectedPersonId} disabled={!visiblePeople.length}>
            <SelectTrigger className="w-full sm:w-[260px]"><SelectValue placeholder="Select person" /></SelectTrigger>
            <SelectContent className="max-h-72">
              {visiblePeople.map(person => (
                <SelectItem key={person.id} value={person.id}>{person.name} — {person.type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {summaryCards.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <Icon size={17} className="mb-3 text-primary" />
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 text-2xl font-bold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {!selectedPerson ? (
        <div className="rounded-xl border py-20 text-center text-muted-foreground">
          <TrendingUp className="mx-auto mb-4 h-12 w-12 opacity-20" />
          <p>{people.length ? "No people match the selected filter." : "No performance data available yet."}</p>
        </div>
      ) : (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{selectedPerson.name}</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">{selectedPerson.role} · {selectedPerson.type} · {selectedPerson.id}</p>
              </div>
              <Badge variant="outline">{selectedTasks.length ? "Task data available" : "No task data available yet"}</Badge>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-7">
              {[
                ["Assigned tasks", selectedTasks.length],
                ["Completed", completedTasks],
                ["In progress", inProgressTasks],
                ["Pending", pendingTasks],
                ["Overdue", overdueTasks],
                ["Assigned projects", selectedProjects.length],
                ["Completed projects", completedProjects],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-lg bg-muted/30 px-3 py-2">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="mt-1 font-semibold">{value}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Task performance</CardTitle></CardHeader>
              <CardContent>
                {selectedTasks.length ? (
                  <>
                    <div className="mb-4 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Task completion rate</span>
                      <span className="font-semibold">{formatPercent(taskCompletionRate ?? 0)}</span>
                    </div>
                    <div className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                          <YAxis allowDecimals={false} />
                          <Tooltip />
                          <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                ) : <p className="py-20 text-center text-sm text-muted-foreground">No performance data available yet.</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Project performance</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {selectedProjects.length ? (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg bg-muted/30 p-3"><p className="text-xs text-muted-foreground">Completion rate</p><p className="mt-1 font-semibold">{formatPercent(projectCompletionRate ?? 0)}</p></div>
                      <div className="rounded-lg bg-muted/30 p-3"><p className="text-xs text-muted-foreground">Active/planning</p><p className="mt-1 font-semibold">{selectedProjects.length - completedProjects}</p></div>
                    </div>
                    <div className="space-y-2">
                      {selectedProjects.map(project => (
                        <div key={project.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                          <span className="flex min-w-0 items-center gap-2"><FolderKanban size={14} className="shrink-0 text-primary" /><span className="truncate">{project.name}</span></span>
                          <Badge variant="outline">{project.status}</Badge>
                        </div>
                      ))}
                    </div>
                  </>
                ) : <p className="py-20 text-center text-sm text-muted-foreground">No project data available yet.</p>}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Existing performance metrics</CardTitle></CardHeader>
            <CardContent>
              {storedMetrics.length ? (
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  {storedMetrics.map(([label, value]) => (
                    <div key={String(label)} className="rounded-lg bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="mt-1 font-semibold">{value}%</p>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-muted-foreground">No stored evaluation metrics are available for this person.</p>}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
