import { useParams, Link } from "wouter";
import { ArrowLeft, Mail, Phone, MapPin, Calendar as CalendarIcon, Briefcase, BookOpen, User, Award, ShieldAlert, BarChart3, Clock, CheckCircle2, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { students, performanceData, tasks, leaveRequests } from "@/data/mockData";

export default function StudentProfile() {
  const { id } = useParams<{ id: string }>();
  
  const student = students.find(s => s.id === id) || students[0];
  if (!student) {
    return (
      <div className="space-y-6 pb-8">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/students"><ArrowLeft size={16} /></Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Intern Profile</h1>
            <p className="text-muted-foreground mt-1">No intern record is available yet.</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No intern data found in smart_cp for this profile.
          </CardContent>
        </Card>
      </div>
    );
  }

  const perfData = performanceData.find(p => p.internId === student.id);
  const studentTasks = tasks.filter(t => t.assignedTo === student.name);
  const studentLeaves = leaveRequests.filter(l => l.internName === student.name);
  const completedTaskCount = studentTasks.filter(t => t.status === "Completed").length;
  const overallScore = perfData
    ? Math.round((perfData.attendance + perfData.taskCompletion + perfData.communication + perfData.discipline + perfData.learning + perfData.innovation + perfData.leadership + perfData.collaboration) / 8)
    : 0;
  const resultStatus = overallScore >= 85 ? "Strong" : overallScore >= 70 ? "Satisfactory" : "Needs Support";

  const radarData = perfData ? [
    { subject: 'Attendance', A: perfData.attendance, fullMark: 100 },
    { subject: 'Task', A: perfData.taskCompletion, fullMark: 100 },
    { subject: 'Comm.', A: perfData.communication, fullMark: 100 },
    { subject: 'Discipline', A: perfData.discipline, fullMark: 100 },
    { subject: 'Learning', A: perfData.learning, fullMark: 100 },
    { subject: 'Innov.', A: perfData.innovation, fullMark: 100 },
    { subject: 'Leader.', A: perfData.leadership, fullMark: 100 },
    { subject: 'Collab.', A: perfData.collaboration, fullMark: 100 },
  ] : [];

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/students"><ArrowLeft size={16} /></Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Intern Profile</h1>
          <p className="text-muted-foreground mt-1">Detailed view of intern performance and details.</p>
        </div>
      </div>

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden relative">
        <div className="h-32 bg-gradient-to-r from-primary/20 to-secondary/20"></div>
        <div className="px-6 sm:px-10 pb-6">
          <div className="flex flex-col sm:flex-row gap-6 sm:items-end -mt-12 relative z-10">
            <Avatar className="h-24 w-24 border-4 border-card bg-card shadow-sm">
              {student.avatarUrl && <AvatarImage src={student.avatarUrl} alt={student.name} />}
              <AvatarFallback className="text-3xl font-medium bg-primary/10 text-primary">
                {student.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold">{student.name}</h2>
                  <div className="text-muted-foreground flex items-center gap-2 mt-1">
                    <span className="font-medium text-foreground">{student.id}</span>
                    <span>•</span>
                    <span>{student.role}</span>
                    <span>•</span>
                    <span>{student.college}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Badge 
                    variant={student.status === "Active" ? "default" : student.status === "Completed" ? "secondary" : "outline"}
                    className="text-sm px-3 py-1"
                  >
                    {student.status}
                  </Badge>
                  <Button className="gap-2"><Mail size={16}/> Message</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Overall Score</p>
                <p className="text-2xl font-bold text-primary">{overallScore}%</p>
              </div>
              <div className="h-11 w-11 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <BarChart3 size={20} />
              </div>
            </div>
            <Progress value={overallScore} className="h-2 mt-4" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Result</p>
                <p className="text-2xl font-bold">{resultStatus}</p>
              </div>
              <div className="h-11 w-11 rounded-full bg-green-500/10 text-green-600 flex items-center justify-center">
                <Award size={20} />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-4">Based on attendance, tasks, discipline, and growth metrics.</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Task Report</p>
                <p className="text-2xl font-bold">{completedTaskCount}/{studentTasks.length}</p>
              </div>
              <div className="h-11 w-11 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center">
                <CheckCircle2 size={20} />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-4">Completed tasks assigned only to {student.name}.</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Project Progress</p>
                <p className="text-2xl font-bold">{student.progress}%</p>
              </div>
              <div className="h-11 w-11 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <Briefcase size={20} />
              </div>
            </div>
            <Progress value={student.progress} className="h-2 mt-4" />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-card w-full justify-start rounded-lg border h-auto p-1 overflow-x-auto flex-nowrap">
          <TabsTrigger value="overview" className="py-2.5 px-4"><User size={16} className="mr-2" /> Overview</TabsTrigger>
          <TabsTrigger value="tasks" className="py-2.5 px-4"><CheckCircle2 size={16} className="mr-2" /> Tasks</TabsTrigger>
          <TabsTrigger value="leave" className="py-2.5 px-4"><CalendarIcon size={16} className="mr-2" /> Leave</TabsTrigger>
          <TabsTrigger value="performance" className="py-2.5 px-4"><TrendingUp size={16} className="mr-2" /> Performance</TabsTrigger>
          <TabsTrigger value="reports" className="py-2.5 px-4"><BarChart3 size={16} className="mr-2" /> Reports</TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="overview" className="space-y-6 outline-none focus-visible:ring-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Personal Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="text-muted-foreground h-4 w-4" />
                    <span className="text-muted-foreground w-20">Email</span>
                    <span className="font-medium">{student.email}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="text-muted-foreground h-4 w-4" />
                    <span className="text-muted-foreground w-20">Phone</span>
                    <span className="font-medium">{student.phone}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <MapPin className="text-muted-foreground h-4 w-4" />
                    <span className="text-muted-foreground w-20">Address</span>
                    <span className="font-medium">{student.address}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <CalendarIcon className="text-muted-foreground h-4 w-4" />
                    <span className="text-muted-foreground w-20">DOB</span>
                    <span className="font-medium">{student.dob}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Academic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3 text-sm">
                    <BookOpen className="text-muted-foreground h-4 w-4" />
                    <span className="text-muted-foreground w-20">Degree</span>
                    <span className="font-medium">{student.degree} - {student.year}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Award className="text-muted-foreground h-4 w-4" />
                    <span className="text-muted-foreground w-20">CGPA</span>
                    <span className="font-medium">{student.cgpa}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg">Internship Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 text-sm">
                        <Briefcase className="text-muted-foreground h-4 w-4" />
                        <span className="text-muted-foreground w-24">Project</span>
                        <span className="font-medium">{student.project}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <User className="text-muted-foreground h-4 w-4" />
                        <span className="text-muted-foreground w-24">manager</span>
                        <span className="font-medium">{student.manager}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <Clock className="text-muted-foreground h-4 w-4" />
                        <span className="text-muted-foreground w-24">Duration</span>
                        <span className="font-medium">{student.startDate} to {student.endDate}</span>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-medium text-foreground">Project Progress</span>
                        <span className="text-muted-foreground">{student.progress}%</span>
                      </div>
                      <Progress value={student.progress} className="h-2.5" />
                      
                      <div className="mt-6">
                        <h4 className="text-sm font-medium mb-3">Skills</h4>
                        <div className="flex flex-wrap gap-2">
                          {student.skills.map(skill => (
                            <Badge key={skill} variant="secondary" className="font-normal">{skill}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="tasks" className="outline-none focus-visible:ring-0">
             <Card>
              <CardHeader>
                <CardTitle>Assigned Tasks</CardTitle>
                <CardDescription>Recent tasks assigned to this student</CardDescription>
              </CardHeader>
              <CardContent>
                {studentTasks.length > 0 ? (
                  <div className="space-y-4">
                    {studentTasks.map(task => (
                      <div key={task.id} className="p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold">{task.title}</h4>
                          <Badge 
                            variant="outline" 
                            className={task.status === "Completed" ? "bg-green-50 text-green-700" : "bg-blue-50 text-blue-700"}
                          >
                            {task.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{task.description}</p>
                        <div className="flex items-center text-xs text-muted-foreground gap-4">
                          <span className="flex items-center gap-1"><Clock size={12} /> Due: {task.dueDate}</span>
                          <span className={`font-medium ${task.priority === 'High' || task.priority === 'Critical' ? 'text-red-500' : ''}`}>Priority: {task.priority}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 text-muted-foreground">
                    No tasks assigned yet.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="leave" className="outline-none focus-visible:ring-0">
             <Card>
              <CardHeader>
                <CardTitle>Leave History</CardTitle>
              </CardHeader>
              <CardContent>
                 {studentLeaves.length > 0 ? (
                    <div className="space-y-4">
                      {studentLeaves.map(leave => (
                        <div key={leave.id} className="p-4 border rounded-lg flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold">{leave.type} Leave</h4>
                              <Badge variant="outline" className={
                                leave.status === "Approved" ? "text-green-600 border-green-200 bg-green-50" :
                                leave.status === "Rejected" ? "text-red-600 border-red-200 bg-red-50" :
                                "text-orange-600 border-orange-200 bg-orange-50"
                              }>{leave.status}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{leave.startDate} to {leave.endDate} • {leave.duration} days</p>
                            <p className="text-sm mt-2">Reason: {leave.reason}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                 ) : (
                    <div className="text-center py-10 text-muted-foreground">
                      No leave history found.
                    </div>
                 )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="performance" className="outline-none focus-visible:ring-0">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Performance Radar</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {perfData ? (
                      <div className="h-[350px]">
                         <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                              <PolarGrid stroke="hsl(var(--border))" />
                              <PolarAngleAxis dataKey="subject" tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }} />
                              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                              <Radar name="Student" dataKey="A" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.4} />
                              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderRadius: "8px" }} />
                            </RadarChart>
                          </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="text-center py-10 text-muted-foreground">No performance data available.</div>
                    )}
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Detailed Metrics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {perfData ? (
                      <div className="space-y-4">
                        {Object.entries(perfData).filter(([key]) => key !== 'internId').map(([key, value]) => (
                           <div key={key}>
                              <div className="flex justify-between text-sm mb-1 capitalize">
                                <span>{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                                <span className="font-medium">{value as number}%</span>
                              </div>
                              <Progress value={value as number} className="h-2" />
                           </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-10 text-muted-foreground">No metrics available.</div>
                    )}
                  </CardContent>
                </Card>
             </div>
          </TabsContent>
          <TabsContent value="reports" className="outline-none focus-visible:ring-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Performance Result</CardTitle>
                  <CardDescription>Individual report for {student.name}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center rounded-xl bg-primary/5 p-5">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Overall Score</p>
                    <p className="text-4xl font-bold text-primary mt-1">
                      {overallScore}%
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg border p-3">
                      <p className="text-muted-foreground text-xs">Tasks</p>
                      <p className="font-semibold">{completedTaskCount}/{studentTasks.length} completed</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-muted-foreground text-xs">Leave Requests</p>
                      <p className="font-semibold">{studentLeaves.length}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-muted-foreground text-xs">Project Progress</p>
                      <p className="font-semibold">{student.progress}%</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-muted-foreground text-xs">Status</p>
                      <p className="font-semibold">{student.status}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Report Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Attendance</span>
                      <span className="font-semibold">{perfData?.attendance ?? 0}%</span>
                    </div>
                    <Progress value={perfData?.attendance ?? 0} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Task Completion</span>
                      <span className="font-semibold">{perfData?.taskCompletion ?? 0}%</span>
                    </div>
                    <Progress value={perfData?.taskCompletion ?? 0} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Project Progress</span>
                      <span className="font-semibold">{student.progress}%</span>
                    </div>
                    <Progress value={student.progress} className="h-2" />
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    This report belongs only to {student.name}. It combines their performance score, assigned task result, leave record, and current project progress.
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
