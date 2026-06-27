import { useState } from "react";
import { TrendingUp, Star } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { students, performanceData } from "@/data/mockData";

function getUserId(name: string, id: string): string {
  const firstName = name.split(" ")[0];
  const num = id.slice(-3);
  return `${firstName}CC${num}`;
}

function getRating(score: number): { label: string; stars: number; color: string } {
  if (score >= 90) return { label: "Excellent", stars: 5, color: "text-green-600" };
  if (score >= 80) return { label: "Good", stars: 4, color: "text-blue-600" };
  if (score >= 70) return { label: "Average", stars: 3, color: "text-yellow-600" };
  if (score >= 60) return { label: "Below Average", stars: 2, color: "text-orange-600" };
  return { label: "Needs Improvement", stars: 1, color: "text-red-600" };
}

export default function PerformanceManagement() {
  const [selectedStudent, setSelectedStudent] = useState<string>(students[0].id);

  const student = students.find(s => s.id === selectedStudent);
  const perfData = performanceData.find(p => p.internId === selectedStudent);

  const metrics = perfData ? [
    { subject: "Attendance", A: perfData.attendance },
    { subject: "Task Completion", A: perfData.taskCompletion },
    { subject: "Communication", A: perfData.communication },
    { subject: "Discipline", A: perfData.discipline },
    { subject: "Learning", A: perfData.learning },
    { subject: "Innovation", A: perfData.innovation },
    { subject: "Leadership", A: perfData.leadership },
    { subject: "Collaboration", A: perfData.collaboration },
  ] : [];

  const overallScore = perfData
    ? Math.round(
        (perfData.attendance + perfData.taskCompletion + perfData.communication +
         perfData.discipline + perfData.learning + perfData.innovation +
         perfData.leadership + perfData.collaboration) / 8
      )
    : 0;

  const rating = getRating(overallScore);

  const trendData = [
    { month: "Jan", score: Math.max(50, overallScore - 12) },
    { month: "Feb", score: Math.max(55, overallScore - 8) },
    { month: "Mar", score: Math.max(60, overallScore - 10) },
    { month: "Apr", score: Math.max(65, overallScore - 5) },
    { month: "May", score: Math.max(70, overallScore - 2) },
    { month: "Jun", score: overallScore },
  ];

  const METRIC_LABELS: Record<string, string> = {
    attendance: "Attendance",
    taskCompletion: "Task Completion",
    communication: "Communication",
    discipline: "Discipline",
    learning: "Learning",
    innovation: "Innovation",
    leadership: "Leadership",
    collaboration: "Collaboration",
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Performance Management</h1>
        </div>
        <div className="w-full sm:w-[320px]">
          <Select value={selectedStudent} onValueChange={setSelectedStudent}>
            <SelectTrigger>
              <SelectValue placeholder="Select Intern" />
            </SelectTrigger>
            <SelectContent>
              {students.map(s => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name} — {s.department}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {student && perfData ? (
        <>
          {/* Intern Info Card */}
          <div className="bg-card border rounded-xl p-5 flex flex-wrap gap-6 items-center shadow-sm">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-lg">
                {student.name.split(" ").map(n => n[0]).join("").substring(0,2)}
              </div>
              <div>
                <p className="font-bold text-lg leading-tight">{student.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{getUserId(student.name, student.id)}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Designation</p>
                <p className="font-semibold">{student.department}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Rating</p>
                <p className={`font-semibold ${rating.color}`}>{rating.label}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Attendance</p>
                <p className="font-semibold">{perfData.attendance}%</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Task Completion</p>
                <p className="font-semibold">{perfData.taskCompletion}%</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Performance Score</p>
                <p className="font-semibold text-primary">{overallScore}%</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-1 bg-primary text-primary-foreground border-transparent shadow-md">
              <CardContent className="pt-6 text-center pb-6">
                <h3 className="text-sm font-medium opacity-80 mb-1">Overall Rating</h3>
                <p className="text-xs opacity-60 mb-3">{student.name}</p>
                <div className="text-6xl font-bold mb-3">
                  {overallScore}<span className="text-3xl">%</span>
                </div>
                <div className="flex justify-center gap-1 mb-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      fill="currentColor"
                      size={22}
                      className={i < rating.stars ? "text-yellow-400" : "text-yellow-400/30"}
                    />
                  ))}
                </div>
                <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/25 mb-4">
                  {rating.label}
                </Badge>
                <p className="text-xs opacity-75 leading-relaxed">
                  {overallScore >= 90
                    ? "Excellent performance, exceeding expectations in most areas."
                    : overallScore >= 80
                    ? "Good overall performance with room for improvement."
                    : overallScore >= 70
                    ? "Meets expectations. Consistent effort needed in key areas."
                    : "Below expectations. Immediate improvement plan recommended."}
                </p>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Score Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                  {Object.entries(perfData)
                    .filter(([k]) => k !== "internId")
                    .map(([key, value]) => {
                      const score = value as number;
                      const color = score >= 90 ? "bg-green-500" : score >= 75 ? "bg-blue-500" : score >= 60 ? "bg-yellow-500" : "bg-red-500";
                      return (
                        <div key={key}>
                          <div className="flex justify-between text-sm mb-1.5">
                            <span className="text-muted-foreground capitalize">{METRIC_LABELS[key] ?? key}</span>
                            <span className="font-semibold text-foreground">{score}%</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${color}`}
                              style={{ width: `${score}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Competency Radar</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="75%" data={metrics}>
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: "hsl(var(--foreground))", fontSize: 11 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar
                        name={student.name}
                        dataKey="A"
                        stroke="hsl(var(--primary))"
                        fill="hsl(var(--primary))"
                        fillOpacity={0.4}
                        strokeWidth={2}
                      />
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderRadius: "8px", border: "1px solid hsl(var(--border))" }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Trend (Estimated)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData} margin={{ top: 20, right: 20, bottom: 20, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                      <YAxis stroke="hsl(var(--muted-foreground))" domain={[40, 100]} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderRadius: "8px", border: "1px solid hsl(var(--border))" }} />
                      <Line
                        type="monotone"
                        dataKey="score"
                        stroke="hsl(var(--primary))"
                        strokeWidth={3}
                        dot={{ r: 4, fill: "hsl(var(--primary))" }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <div className="text-center py-20 text-muted-foreground">
          <TrendingUp className="mx-auto h-12 w-12 opacity-20 mb-4" />
          <p>Select an intern to view performance data.</p>
        </div>
      )}
    </div>
  );
}
