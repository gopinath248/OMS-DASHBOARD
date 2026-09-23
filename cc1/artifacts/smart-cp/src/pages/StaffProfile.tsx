import { useParams, Link } from "wouter";
import { ArrowLeft, Mail, Phone, Users, BarChart3, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { staff, students } from "@/data/mockData";

function employeePerformance(employee: typeof staff[number]) {
  const base = employee.status === "Active" ? 88 : 76;
  const leadBonus = ["manager", "manager", "manager"].includes(employee.role) ? 4 : 0;
  const seniorBonus = employee.designation.includes("Lead") || employee.designation.includes("Senior") ? 3 : 0;
  return {
    attendance: Math.min(98, base + seniorBonus),
    taskCompletion: Math.min(96, base + leadBonus),
    communication: Math.min(97, base + 5),
    leadership: Math.min(98, base + leadBonus + seniorBonus),
    collaboration: Math.min(97, base + 4),
  };
}

export default function StaffProfile() {
  const { id } = useParams<{ id: string }>();
  const staffMember = staff.find(s => s.id === id) || staff[0];
  if (!staffMember) {
    return (
      <div className="space-y-6 pb-8">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/staff"><ArrowLeft size={16} /></Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Employee Profile</h1>
            <p className="text-muted-foreground mt-1">No employee record is available yet.</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No employee data found in smart_cp for this profile.
          </CardContent>
        </Card>
      </div>
    );
  }

  const assignedInterns = students.filter(s => staffMember.assignedInterns.includes(s.id));
  const ownPerformance = employeePerformance(staffMember);
  const overallScore = Math.round(Object.values(ownPerformance).reduce((sum, value) => sum + value, 0) / Object.values(ownPerformance).length);

  const performanceData = [
    { month: "Jan", reviews: 12 },
    { month: "Feb", reviews: 19 },
    { month: "Mar", reviews: 15 },
    { month: "Apr", reviews: 22 },
    { month: "May", reviews: 18 },
    { month: "Jun", reviews: 25 },
  ];

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/staff"><ArrowLeft size={16} /></Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Employee Profile</h1>
          <p className="text-muted-foreground mt-1">Detailed view of staff member and assignments.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <Avatar className="h-24 w-24 mb-4">
                {staffMember.avatarUrl && <AvatarImage src={staffMember.avatarUrl} alt={staffMember.name} />}
                <AvatarFallback className="text-3xl font-medium bg-secondary/10 text-secondary">
                  {staffMember.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-2xl font-bold">{staffMember.name}</h2>
              <p className="text-muted-foreground">{staffMember.designation}</p>
              <Badge 
                variant={staffMember.status === "Active" ? "default" : "secondary"}
                className="mt-2"
              >
                {staffMember.status}
              </Badge>

              <div className="w-full mt-6 space-y-3 text-left">
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="text-muted-foreground h-4 w-4 shrink-0" />
                  <span className="truncate">{staffMember.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="text-muted-foreground h-4 w-4 shrink-0" />
                  <span>{staffMember.phone}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Users className="text-muted-foreground h-4 w-4 shrink-0" />
                  <span>{staffMember.role}</span>
                </div>
              </div>
              
              <div className="w-full mt-6 pt-6 border-t text-left">
                <h3 className="font-medium mb-2">Bio</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{staffMember.bio}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="md:col-span-2">
          <Tabs defaultValue="Interns" className="w-full">
            <TabsList className="bg-card w-full justify-start rounded-lg border h-auto p-1">
              <TabsTrigger value="Interns" className="py-2.5 px-4"><Users size={16} className="mr-2" /> Assigned Interns</TabsTrigger>
              <TabsTrigger value="performance" className="py-2.5 px-4"><TrendingUp size={16} className="mr-2" /> Performance</TabsTrigger>
              <TabsTrigger value="analytics" className="py-2.5 px-4"><BarChart3 size={16} className="mr-2" /> Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="Interns" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Assigned Interns ({assignedInterns.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {assignedInterns.length > 0 ? assignedInterns.map(intern => (
                      <div key={intern.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-4">
                          <Avatar>
                            {intern.avatarUrl && <AvatarImage src={intern.avatarUrl} alt={intern.name} />}
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {intern.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{intern.name}</p>
                            <p className="text-xs text-muted-foreground">{intern.project}</p>
                          </div>
                        </div>
                        <Button variant="ghost" asChild>
                          <Link href={`/students/${intern.id}`}>View Profile</Link>
                        </Button>
                      </div>
                    )) : (
                      <div className="text-center py-8 text-muted-foreground">No Interns assigned.</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="performance" className="mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Employee Result</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center rounded-xl bg-primary/5 p-5">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Overall Score</p>
                      <p className="text-4xl font-bold text-primary mt-1">{overallScore}%</p>
                    </div>
                    <div className="mt-4 space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">Employee ID</span><span className="font-semibold">{staffMember.id}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Designation</span><span className="font-semibold">{staffMember.designation}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className="font-semibold">{staffMember.status}</span></div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Own Performance Report</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {Object.entries(ownPerformance).map(([key, value]) => (
                      <div key={key}>
                        <div className="flex justify-between text-sm mb-1 capitalize">
                          <span>{key.replace(/([A-Z])/g, " $1").trim()}</span>
                          <span className="font-semibold">{value}%</span>
                        </div>
                        <Progress value={value} className="h-2" />
                      </div>
                    ))}
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      This report is specific to {staffMember.name}, based on attendance, delivery, communication, leadership, and collaboration.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="analytics" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Team Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={performanceData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip cursor={{ fill: "hsl(var(--muted))" }} contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }} />
                        <Bar dataKey="reviews" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
