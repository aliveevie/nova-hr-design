import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import {
  AuthProvider,
  EmployeeProvider,
  RecruitmentProvider,
  AttendanceProvider,
  LeaveProvider,
  PayrollProvider,
  PerformanceProvider,
  TrainingProvider,
  DisciplineProvider,
  HolidayProvider,
} from "@/lib/store";
import AppLayout from "./components/layout/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Index from "./pages/Index";
import Employees from "./pages/Employees";
import EmployeeDetail from "./pages/EmployeeDetail";
import Recruitment from "./pages/Recruitment";
import Attendance from "./pages/Attendance";
import LeaveManagement from "./pages/LeaveManagement";
import Payroll from "./pages/Payroll";
import Performance from "./pages/Performance";
import Training from "./pages/Training";
import Discipline from "./pages/Discipline";
import Reports from "./pages/Reports";
import Holidays from "./pages/Holidays";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <EmployeeProvider>
        <RecruitmentProvider>
          <AttendanceProvider>
            <LeaveProvider>
              <PayrollProvider>
                <PerformanceProvider>
                  <TrainingProvider>
                    <DisciplineProvider>
                      <HolidayProvider>
                        <TooltipProvider>
                          <Toaster />
                          <Sonner />
                          <BrowserRouter>
                            <Routes>
                              <Route path="/login" element={<Login />} />
                              <Route element={<ProtectedRoute />}>
                                <Route element={<AppLayout />}>
                                  <Route path="/" element={<Index />} />
                                  <Route path="/employees" element={<Employees />} />
                                  <Route path="/employees/:id" element={<EmployeeDetail />} />
                                  <Route path="/recruitment" element={<Recruitment />} />
                                  <Route path="/attendance" element={<Attendance />} />
                                  <Route path="/leave" element={<LeaveManagement />} />
                                  <Route path="/payroll" element={<Payroll />} />
                                  <Route path="/performance" element={<Performance />} />
                                  <Route path="/training" element={<Training />} />
                                  <Route path="/discipline" element={<Discipline />} />
                                  <Route path="/reports" element={<Reports />} />
                                  <Route path="/holidays" element={<Holidays />} />
                                  <Route path="/settings" element={<Settings />} />
                                </Route>
                              </Route>
                              <Route path="*" element={<NotFound />} />
                            </Routes>
                          </BrowserRouter>
                        </TooltipProvider>
                      </HolidayProvider>
                    </DisciplineProvider>
                  </TrainingProvider>
                </PerformanceProvider>
              </PayrollProvider>
            </LeaveProvider>
          </AttendanceProvider>
        </RecruitmentProvider>
      </EmployeeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
