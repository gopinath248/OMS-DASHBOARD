import { useParams, Link } from "wouter";
import { ArrowLeft, Mail, Phone, Users, BarChart3, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { staff, students } from "@/data/mockData";

export default function StaffProfile() {
  const { id } = useParams<{ id: string }>();
  const staffMember = staff.find(s => s.id === id) || staff[0];
  const assignedInterns = students.filter(s => staffMember.assignedInterns.includes(s.id));

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
          <Tabs defaultValue="interns" className="w-full">
            <TabsList className="bg-card w-full justify-start rounded-lg border h-auto p-1">
              <TabsTrigger value="interns" className="py-2.5 px-4"><Users size={16} className="mr-2" /> Assigned Interns</TabsTrigger>
              <TabsTrigger value="analytics" className="py-2.5 px-4"><BarChart3 size={16} className="mr-2" /> Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="interns" className="mt-6">
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
                      <div className="text-center py-8 text-muted-foreground">No interns assigned.</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Mentorship Activity</CardTitle>
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
