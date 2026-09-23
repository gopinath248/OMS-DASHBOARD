import { ClipboardList, CheckCircle2, Clock, CalendarDays, Award } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import { hasLoadedAppData, tasks, performanceData, projects, students } from "@/data/mockData";
import { FolderOpen } from "lucide-react";
import { getAuthSession } from "@/lib/auth";

function metricValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function StudentDashboard() {
  const session = getAuthSession();
  const currentUserId = session?.user.userId ?? "INT001";
  const currentStudent = students.find(student =>
    student.userId === currentUserId ||
    student.id === currentUserId ||
    (!!session?.user.email && student.email.toLowerCase() === session.user.email.toLowerCase())
  );
  const currentInternId = currentStudent?.id ?? currentUserId;
  const currentName = currentStudent?.name ?? session?.user.fullName ?? "Intern";
  const myTasks = tasks.filter(t => t.assignedTo === currentName);
  const completedTasks = myTasks.filter(t => t.status === "Completed");
  const myPerformance = performanceData.find(p => p.internId === currentInternId);
  const appDataLoaded = hasLoadedAppData();
  const overallCompletion = currentStudent?.progress ?? (myTasks.length ? Math.round((completedTasks.length / myTasks.length) * 100) : 0);

  const radarData = myPerformance
    ? [
        { subject: 'Attendance', A: metricValue(myPerformance.attendance), fullMark: 100 },
        { subject: 'Task', A: metricValue(myPerformance.taskCompletion), fullMark: 100 },
        { subject: 'Comm.', A: metricValue(myPerformance.communication), fullMark: 100 },
        { subject: 'Discipline', A: metricValue(myPerformance.discipline), fullMark: 100 },
        { subject: 'Learning', A: metricValue(myPerformance.learning), fullMark: 100 },
        { subject: 'Innov.', A: metricValue(myPerformance.innovation), fullMark: 100 },
      ]
    : [];

  if (!appDataLoaded) {
    return (
      <div className="space-y-6 pb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Intern Dashboard</h1>
          <p className="text-muted-foreground mt-1">Loading your internship data...</p>
        </div>
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Loading performance...
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Intern Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome back, {currentName.split(" ")[0]}! Here is your internship progress.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: "Tasks Completed", value: `${completedTasks.length}/${myTasks.length}`, icon: ClipboardList, color: "text-blue-500", bg: "bg-blue-100" },
          { title: "Attendance", value: myPerformance ? `${metricValue(myPerformance.attendance)}%` : "N/A", icon: CheckCircle2, color: "text-green-500", bg: "bg-green-100" },
          { title: "Assigned Projects", value: projects.filter(p => p.assignedInterns.includes(currentInternId)).length, icon: FolderOpen, color: "text-violet-600", bg: "bg-violet-100" },
          { title: "Leave Balance", value: "10 Days", icon: CalendarDays, color: "text-orange-500", bg: "bg-orange-100" },
        ].map((kpi, i) => (
          <Card key={i}>
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{kpi.title}</p>
                <h3 className="text-2xl font-bold mt-1">{kpi.value}</h3>
              </div>
              <div className={`p-3 rounded-full ${kpi.bg} ${kpi.color}`}>
                <kpi.icon size={20} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>Internship Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium text-foreground">Overall Completion</span>
                  <span className="font-medium">{overallCompletion}%</span>
                </div>
                <Progress value={overallCompletion} className="h-3" />
                <p className="text-xs text-muted-foreground mt-2">
                  {currentStudent?.endDate ? `Expected completion: ${currentStudent.endDate}` : "Expected completion date is not set."}
                </p>
              </div>

              <div className="pt-4 border-t">
                <h4 className="text-sm font-medium mb-4">Current Tasks</h4>
                <div className="space-y-4">
                  {myTasks.map(task => (
                    <div key={task.id} className="p-4 border rounded-xl hover:bg-muted/30 transition-colors">
                      <div className="flex justify-between items-center mb-2">
                        <h5 className="font-medium text-sm">{task.title}</h5>
                        <Badge variant={task.status === "Completed" ? "secondary" : "outline"} className={task.status === "Completed" ? "bg-green-100 text-green-700" : ""}>
                          {task.status}
                        </Badge>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground mt-2">
                        <span className="flex items-center gap-1"><Clock size={12}/> Due: {task.dueDate}</span>
                        <span>{task.priority} Priority</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>My Performance</CardTitle>
            </CardHeader>
            <CardContent>
              {myPerformance ? (
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: 'hsl(var(--foreground))', fontSize: 10 }} />
                      <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar name="Student" dataKey="A" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.4} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex h-[250px] items-center justify-center rounded-lg border border-dashed text-center text-sm text-muted-foreground">
                  No performance data available yet.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-6 text-center">
              <div className="mx-auto w-12 h-12 bg-primary/20 text-primary rounded-full flex items-center justify-center mb-4">
                <Award size={24} />
              </div>
              <h3 className="font-bold text-lg mb-2">Certificate Eligibility</h3>
              <Badge className={myPerformance ? "bg-green-500 text-white mb-4 hover:bg-green-600" : "mb-4"} variant={myPerformance ? "default" : "outline"}>
                {myPerformance ? "Eligible" : "Pending Review"}
              </Badge>
              <div className="space-y-2 text-sm text-left mt-4 bg-background p-4 rounded-lg">
                <div className="flex items-center gap-2"><CheckCircle2 size={16} className="text-green-500"/> Attendance: {myPerformance ? `${metricValue(myPerformance.attendance)}%` : "Not available"}</div>
                <div className="flex items-center gap-2"><CheckCircle2 size={16} className="text-green-500"/> Task completion: {myPerformance ? `${metricValue(myPerformance.taskCompletion)}%` : "Not available"}</div>
                <div className="flex items-center gap-2"><CheckCircle2 size={16} className="text-green-500"/> Manager approval pending final review</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
