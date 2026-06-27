import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme-provider";
import NotFound from "@/pages/not-found";

import { AppLayout } from "@/components/layout/AppLayout";
import Login from "@/pages/Login";
import AdminDashboard from "@/pages/AdminDashboard";
import StudentManagement from "@/pages/StudentManagement";
import StudentProfile from "@/pages/StudentProfile";
import StaffManagement from "@/pages/StaffManagement";
import StaffProfile from "@/pages/StaffProfile";
import LeaveManagement from "@/pages/LeaveManagement";
import TaskManagement from "@/pages/TaskManagement";
import PerformanceManagement from "@/pages/PerformanceManagement";
import Reports from "@/pages/Reports";
import StaffDashboard from "@/pages/StaffDashboard";
import StudentDashboard from "@/pages/StudentDashboard";
import Calendar from "@/pages/Calendar";
import Notifications from "@/pages/Notifications";
import Settings from "@/pages/Settings";
import HelpCenter from "@/pages/HelpCenter";
import ApplyLeave from "@/pages/ApplyLeave";
import Projects from "@/pages/Projects";
import ProjectDetail from "@/pages/ProjectDetail";
import PlanWay from "@/pages/PlanWay";
import SalaryManagement from "@/pages/SalaryManagement";
import Commands from "@/pages/Commands";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Login} />
      <Route path="/login" component={Login} />
      
      <Route path="/:rest*">
        <AppLayout>
          <Switch>
            <Route path="/admin" component={AdminDashboard} />
            <Route path="/students" component={StudentManagement} />
            <Route path="/students/:id" component={StudentProfile} />
            
            <Route path="/staff" component={StaffManagement} />
            <Route path="/staff/:id" component={StaffProfile} />
            
            <Route path="/leave" component={LeaveManagement} />
            <Route path="/tasks" component={TaskManagement} />
            <Route path="/performance" component={PerformanceManagement} />
            <Route path="/reports" component={Reports} />
            
            <Route path="/staff-dashboard" component={StaffDashboard} />
            <Route path="/student-dashboard" component={StudentDashboard} />
            <Route path="/calendar" component={Calendar} />
            <Route path="/notifications" component={Notifications} />
            <Route path="/settings" component={Settings} />
            <Route path="/help" component={HelpCenter} />
            <Route path="/apply-leave" component={ApplyLeave} />
            <Route path="/projects" component={Projects} />
            <Route path="/projects/:id" component={ProjectDetail} />
            <Route path="/planway" component={PlanWay} />
            <Route path="/salary" component={SalaryManagement} />
            <Route path="/commands" component={Commands} />

            <Route component={NotFound} />
          </Switch>
        </AppLayout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="smart-cp-theme">
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
