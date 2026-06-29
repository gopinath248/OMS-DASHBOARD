export const students = [
  { id: "INT001", name: "Alice Johnson", college: "MIT", role: "Intern", project: "AI Chatbot Platform", email: "alice.johnson@codecore.edu", phone: "555-0101", startDate: "2026-01-15", endDate: "2026-07-15", mentor: "Dr. Smith", progress: 85, status: "Active", cgpa: 3.8, dob: "2002-05-14", gender: "Female", address: "123 Main St, Boston, MA", degree: "B.Tech", year: "3rd", skills: ["React", "Python", "Machine Learning", "TensorFlow"] },
  { id: "INT002", name: "Bob Smith", college: "Stanford University", role: "Intern", project: "Data Pipeline Automation", email: "bob.smith@codecore.edu", phone: "555-0102", startDate: "2026-02-01", endDate: "2026-08-01", mentor: "Prof. Davis", progress: 62, status: "Active", cgpa: 3.5, dob: "2001-11-20", gender: "Male", address: "456 Oak Ave, Palo Alto, CA", degree: "B.Tech", year: "4th", skills: ["SQL", "AWS", "Spark", "Power BI"] },
  { id: "INT003", name: "Charlie Brown", college: "UC Berkeley", role: "Trainee", project: "Mobile App Development", email: "charlie.brown@codecore.edu", phone: "555-0103", startDate: "2025-09-01", endDate: "2026-03-01", mentor: "Sarah Lee", progress: 100, status: "Completed", cgpa: 3.9, dob: "2002-01-10", gender: "Male", address: "789 Pine Rd, Berkeley, CA", degree: "B.Tech", year: "4th", skills: ["Flutter", "Firebase", "Dart", "REST APIs"] },
  { id: "INT004", name: "Diana Prince", college: "Carnegie Mellon", role: "Intern", project: "IoT Sensor Network", email: "diana.prince@codecore.edu", phone: "555-0104", startDate: "2026-03-01", endDate: "2026-09-01", mentor: "Dr. Smith", progress: 34, status: "Active", cgpa: 3.7, dob: "2003-04-05", gender: "Female", address: "321 Elm St, Pittsburgh, PA", degree: "B.Tech", year: "2nd", skills: ["C++", "Arduino", "MQTT", "Embedded C"] },
  { id: "INT005", name: "Eve Davis", college: "UCLA", role: "Trainee", project: "Smart Grid Management", email: "eve.davis@codecore.edu", phone: "555-0105", startDate: "2026-05-01", endDate: "2026-11-01", mentor: "Prof. Davis", progress: 12, status: "Active", cgpa: 3.6, dob: "2002-08-15", gender: "Female", address: "654 Maple Dr, Los Angeles, CA", degree: "B.Tech", year: "3rd", skills: ["AutoCAD", "MATLAB", "PLC", "SCADA"] },
  { id: "INT006", name: "Frank Miller", college: "IIT Bombay", role: "Intern", project: "Blockchain Supply Chain", email: "frank.miller@codecore.edu", phone: "555-0106", startDate: "2026-01-10", endDate: "2026-07-10", mentor: "Dr. Smith", progress: 78, status: "Active", cgpa: 3.4, dob: "2001-03-22", gender: "Male", address: "12 Sector 5, Mumbai", degree: "B.Tech", year: "4th", skills: ["Solidity", "Node.js", "Hyperledger", "Ethereum"] },
  { id: "INT007", name: "Grace Kim", college: "NUS Singapore", role: "Intern", project: "NLP Sentiment Analysis", email: "grace.kim@codecore.edu", phone: "555-0107", startDate: "2026-02-15", endDate: "2026-08-15", mentor: "Prof. Davis", progress: 91, status: "Active", cgpa: 4.0, dob: "2002-09-08", gender: "Female", address: "88 Orchard Rd, Singapore", degree: "B.Tech", year: "3rd", skills: ["Python", "NLTK", "BERT", "Transformers"] },
  { id: "INT008", name: "Henry Wilson", college: "University of Toronto", role: "Trainee", project: "Cloud Infrastructure Setup", email: "henry.wilson@codecore.edu", phone: "555-0108", startDate: "2026-03-15", endDate: "2026-09-15", mentor: "Sarah Lee", progress: 55, status: "Active", cgpa: 3.3, dob: "2001-07-30", gender: "Male", address: "99 Bay St, Toronto, ON", degree: "B.Tech", year: "4th", skills: ["AWS", "Terraform", "Docker", "Kubernetes"] },
  { id: "INT009", name: "Isla Clark", college: "Oxford University", role: "Intern", project: "FPGA-based Signal Processing", email: "isla.clark@codecore.edu", phone: "555-0109", startDate: "2025-10-01", endDate: "2026-04-01", mentor: "Dr. Smith", progress: 100, status: "Completed", cgpa: 3.9, dob: "2002-12-03", gender: "Female", address: "7 High St, Oxford, UK", degree: "B.Tech", year: "4th", skills: ["VHDL", "FPGA", "DSP", "Verilog"] },
  { id: "INT010", name: "James Moore", college: "TU Delft", role: "Trainee", project: "Renewable Energy Monitor", email: "james.moore@codecore.edu", phone: "555-0110", startDate: "2026-04-01", endDate: "2026-10-01", mentor: "Prof. Davis", progress: 28, status: "Active", cgpa: 3.5, dob: "2003-02-17", gender: "Male", address: "10 Mekelweg, Delft, NL", degree: "B.Tech", year: "2nd", skills: ["LabVIEW", "MATLAB", "Solar Tech", "Power Electronics"] },
  { id: "INT011", name: "Karen Lee", college: "BITS Pilani", role: "Intern", project: "Recommendation Engine", email: "karen.lee@codecore.edu", phone: "555-0111", startDate: "2026-01-20", endDate: "2026-07-20", mentor: "Sarah Lee", progress: 70, status: "Active", cgpa: 3.6, dob: "2002-06-25", gender: "Female", address: "Vidya Vihar, Pilani, Rajasthan", degree: "B.Tech", year: "3rd", skills: ["Collaborative Filtering", "Python", "SQL", "Flask"] },
  { id: "INT012", name: "Liam Young", college: "IIT Delhi", role: "Intern", project: "Computer Vision QA System", email: "liam.young@codecore.edu", phone: "555-0112", startDate: "2026-02-20", endDate: "2026-08-20", mentor: "Prof. Davis", progress: 48, status: "Active", cgpa: 3.7, dob: "2001-10-14", gender: "Male", address: "IIT Campus, New Delhi", degree: "B.Tech", year: "4th", skills: ["OpenCV", "YOLO", "TensorFlow", "Python"] },
  { id: "INT013", name: "Mia Martinez", college: "EPFL", role: "Trainee", project: "Microservices Architecture", email: "mia.martinez@codecore.edu", phone: "555-0113", startDate: "2026-03-20", endDate: "2026-09-20", mentor: "Dr. Smith", progress: 65, status: "Active", cgpa: 3.8, dob: "2002-04-11", gender: "Female", address: "Route Cantonale, Lausanne, CH", degree: "B.Tech", year: "3rd", skills: ["Spring Boot", "Docker", "Kafka", "Java"] },
  { id: "INT014", name: "Noah Brown", college: "Georgia Tech", role: "Intern", project: "5G Protocol Testing", email: "noah.brown@codecore.edu", phone: "555-0114", startDate: "2026-04-05", endDate: "2026-10-05", mentor: "Sarah Lee", progress: 20, status: "Pending", cgpa: 3.4, dob: "2003-08-02", gender: "Male", address: "225 North Ave NW, Atlanta, GA", degree: "B.Tech", year: "2nd", skills: ["RF Engineering", "Python", "OFDM", "GNU Radio"] },
  { id: "INT015", name: "Olivia White", college: "NSIT Delhi", role: "Trainee", project: "Battery Management System", email: "olivia.white@codecore.edu", phone: "555-0115", startDate: "2026-01-01", endDate: "2026-07-01", mentor: "Prof. Davis", progress: 88, status: "Active", cgpa: 3.9, dob: "2002-11-30", gender: "Female", address: "Sector 3, Dwarka, New Delhi", degree: "B.Tech", year: "4th", skills: ["LTSpice", "MATLAB", "Battery Tech", "PCB Design"] },
  { id: "INT016", name: "Paul Anderson", college: "IIIT Hyderabad", role: "Intern", project: "Serverless Functions Platform", email: "paul.anderson@codecore.edu", phone: "555-0116", startDate: "2026-02-10", endDate: "2026-08-10", mentor: "Dr. Smith", progress: 53, status: "Active", cgpa: 3.3, dob: "2001-09-09", gender: "Male", address: "Gachibowli, Hyderabad", degree: "B.Tech", year: "4th", skills: ["AWS Lambda", "Go", "Serverless", "CI/CD"] },
  { id: "INT017", name: "Quinn Davis", college: "VJTI Mumbai", role: "Intern", project: "Time Series Forecasting", email: "quinn.davis@codecore.edu", phone: "555-0117", startDate: "2026-03-10", endDate: "2026-09-10", mentor: "Prof. Davis", progress: 77, status: "Active", cgpa: 3.6, dob: "2002-07-21", gender: "Non-binary", address: "Matunga, Mumbai", degree: "B.Tech", year: "3rd", skills: ["LSTM", "Prophet", "R", "Tableau"] },
  { id: "INT018", name: "Rachel Wilson", college: "SRM University", role: "Trainee", project: "DevSecOps Pipeline", email: "rachel.wilson@codecore.edu", phone: "555-0118", startDate: "2026-04-10", endDate: "2026-10-10", mentor: "Sarah Lee", progress: 30, status: "Active", cgpa: 3.5, dob: "2003-01-16", gender: "Female", address: "Kattankulathur, Chennai", degree: "B.Tech", year: "2nd", skills: ["Jenkins", "SonarQube", "Trivy", "GitLab CI"] },
  { id: "INT019", name: "Sam Taylor", college: "VIT Vellore", role: "Intern", project: "Autonomous Robot Navigation", email: "sam.taylor@codecore.edu", phone: "555-0119", startDate: "2025-11-01", endDate: "2026-05-01", mentor: "Dr. Smith", progress: 100, status: "Completed", cgpa: 3.8, dob: "2001-05-05", gender: "Male", address: "Vellore, Tamil Nadu", degree: "B.Tech", year: "4th", skills: ["ROS", "Python", "SLAM", "Lidar"] },
  { id: "INT020", name: "Deepika K", college: "Anna University", role: "Intern", project: "Healthcare AI Diagnostics", email: "deepika.k@codecore.edu", phone: "555-0120", startDate: "2026-01-08", endDate: "2026-07-08", mentor: "Prof. Davis", progress: 82, status: "Active", cgpa: 3.9, dob: "2002-03-19", gender: "Female", address: "Guindy, Chennai, Tamil Nadu", degree: "B.Tech", year: "3rd", skills: ["Python", "Machine Learning", "SQL", "Power BI", "TensorFlow"] },
];

export const staff = [
  { id: "EMP001", name: "Dr. Smith", designation: "Senior Engineer", role: "Mentor", assignedInterns: ["INT001", "INT004", "INT006", "INT013", "INT016", "INT019"], email: "smith@codecore.edu", phone: "555-0201", status: "Active", bio: "Dr. Smith has 12+ years of experience in AI, full-stack engineering, and distributed systems. Passionate about mentoring the next generation of engineers." },
  { id: "EMP002", name: "Prof. Davis", designation: "Lead Data Scientist", role: "Project Lead", assignedInterns: ["INT002", "INT005", "INT007", "INT010", "INT012", "INT015", "INT017", "INT020"], email: "davis@codecore.edu", phone: "555-0202", status: "Active", bio: "Prof. Davis specializes in big data analytics, machine learning pipelines, and cloud-native data platforms. 8+ years of industry and academic experience." },
  { id: "EMP003", name: "Sarah Lee", designation: "Product Manager", role: "Manager", assignedInterns: ["INT003", "INT008", "INT011", "INT014", "INT018"], email: "sarah.lee@codecore.edu", phone: "555-0203", status: "On Leave", bio: "Sarah bridges product and engineering. Specializes in agile delivery, UX strategy, and cross-functional team coordination." },
  { id: "EMP004", name: "Raj Mehta", designation: "DevOps Lead", role: "Project Lead", assignedInterns: [], email: "raj.mehta@codecore.edu", phone: "555-0204", status: "Active", bio: "Raj oversees CI/CD infrastructure and cloud migrations. AWS certified architect with 10 years of experience in DevOps transformation programs." },
  { id: "EMP005", name: "Angela Chen", designation: "ML Research Engineer", role: "Employee", assignedInterns: [], email: "angela.chen@codecore.edu", phone: "555-0205", status: "Active", bio: "Angela leads applied ML research. Focused on NLP, computer vision, and model optimization for production systems." },
  { id: "EMP006", name: "Michael Torres", designation: "Full Stack Engineer", role: "Employee", assignedInterns: [], email: "michael.torres@codecore.edu", phone: "555-0206", status: "Active", bio: "Michael excels in building scalable web applications. Expertise in React, Node.js, and PostgreSQL." },
  { id: "EMP007", name: "Priya Nair", designation: "HR Coordinator", role: "HR", assignedInterns: [], email: "priya.nair@codecore.edu", phone: "555-0207", status: "Active", bio: "Priya manages intern onboarding, compliance, and performance review cycles across all departments." },
  { id: "EMP008", name: "David Kim", designation: "Hardware Engineer", role: "Employee", assignedInterns: [], email: "david.kim@codecore.edu", phone: "555-0208", status: "Active", bio: "David designs embedded systems and PCB layouts. Specializes in IoT hardware prototyping and signal integrity." },
  { id: "EMP009", name: "Sunita Reddy", designation: "Power Systems Expert", role: "Coordinator", assignedInterns: [], email: "sunita.reddy@codecore.edu", phone: "555-0209", status: "Active", bio: "Sunita focuses on renewable energy systems and smart grid solutions. 15+ years of power engineering experience." },
  { id: "EMP010", name: "Lucas Oliveira", designation: "Security Engineer", role: "Employee", assignedInterns: [], email: "lucas.oliveira@codecore.edu", phone: "555-0210", status: "On Leave", bio: "Lucas handles application security, penetration testing, and DevSecOps integration across the intern projects." },
];

export const leaveRequests = [
  { id: "LR001", internName: "Alice Johnson", type: "Sick", startDate: "2026-04-10", endDate: "2026-04-12", reason: "Flu with fever, doctor advised rest for 3 days.", status: "Pending", duration: 3 },
  { id: "LR002", internName: "Bob Smith", type: "Personal", startDate: "2026-05-01", endDate: "2026-05-01", reason: "Sister's wedding ceremony.", status: "Approved", duration: 1 },
  { id: "LR003", internName: "Charlie Brown", type: "Emergency", startDate: "2025-11-15", endDate: "2025-11-16", reason: "Hospitalization of a family member.", status: "Rejected", duration: 2, rejectionReason: "Invalid or missing supporting documents." },
  { id: "LR004", internName: "Diana Prince", type: "Casual", startDate: "2026-06-05", endDate: "2026-06-07", reason: "Out-of-town family visit.", status: "Pending", duration: 3 },
  { id: "LR005", internName: "Eve Davis", type: "Sick", startDate: "2026-06-10", endDate: "2026-06-11", reason: "Migraine and severe headache.", status: "Approved", duration: 2 },
  { id: "LR006", internName: "Frank Miller", type: "Personal", startDate: "2026-04-22", endDate: "2026-04-22", reason: "Passport renewal appointment.", status: "Approved", duration: 1 },
  { id: "LR007", internName: "Grace Kim", type: "Casual", startDate: "2026-05-18", endDate: "2026-05-19", reason: "Research conference attendance.", status: "Approved", duration: 2 },
  { id: "LR008", internName: "Henry Wilson", type: "Emergency", startDate: "2026-05-28", endDate: "2026-05-30", reason: "Urgent travel for family bereavement.", status: "Approved", duration: 3 },
  { id: "LR009", internName: "Isla Clark", type: "Sick", startDate: "2025-12-01", endDate: "2025-12-02", reason: "Viral fever and body ache.", status: "Approved", duration: 2 },
  { id: "LR010", internName: "James Moore", type: "Casual", startDate: "2026-04-29", endDate: "2026-04-29", reason: "University exam duty.", status: "Rejected", duration: 1, rejectionReason: "Request submitted after the deadline." },
  { id: "LR011", internName: "Karen Lee", type: "Personal", startDate: "2026-05-06", endDate: "2026-05-06", reason: "Medical checkup appointment.", status: "Pending", duration: 1 },
  { id: "LR012", internName: "Liam Young", type: "Sick", startDate: "2026-06-01", endDate: "2026-06-03", reason: "Food poisoning, advised bed rest.", status: "Pending", duration: 3 },
  { id: "LR013", internName: "Mia Martinez", type: "Casual", startDate: "2026-05-24", endDate: "2026-05-24", reason: "National holiday travel.", status: "Approved", duration: 1 },
  { id: "LR014", internName: "Noah Brown", type: "Emergency", startDate: "2026-04-15", endDate: "2026-04-16", reason: "Home flooding due to heavy rain.", status: "Approved", duration: 2 },
  { id: "LR015", internName: "Deepika K", type: "Personal", startDate: "2026-06-15", endDate: "2026-06-17", reason: "Sibling's graduation ceremony out of state.", status: "Pending", duration: 3 },
];

export const tasks = [
  { id: "TSK001", title: "Setup Development Environment", description: "Install Node.js, React, and all project dependencies. Configure ESLint and Prettier.", assignedTo: "Alice Johnson", priority: "High", dueDate: "2026-01-20", status: "Completed", attachments: 0 },
  { id: "TSK002", title: "Design REST API Endpoints", description: "Design and document all REST endpoints using OpenAPI 3.0 spec. Review with team lead.", assignedTo: "Bob Smith", priority: "Medium", dueDate: "2026-02-15", status: "In Progress", attachments: 2 },
  { id: "TSK003", title: "Fix Authentication Bug", description: "Fix token expiry issue causing users to be logged out unexpectedly on the mobile app.", assignedTo: "Diana Prince", priority: "Critical", dueDate: "2026-03-10", status: "To Do", attachments: 1 },
  { id: "TSK004", title: "Implement Dashboard Charts", description: "Integrate Chart.js or Recharts for the admin analytics dashboard. Include line, bar, and pie charts.", assignedTo: "Alice Johnson", priority: "High", dueDate: "2026-03-25", status: "In Progress", attachments: 3 },
  { id: "TSK005", title: "Write Unit Tests for Payment Module", description: "Cover all payment gateway flows with Jest unit tests. Aim for 80% code coverage.", assignedTo: "Frank Miller", priority: "Medium", dueDate: "2026-03-30", status: "To Do", attachments: 0 },
  { id: "TSK006", title: "Database Schema Migration v2", description: "Add multi-tenant support columns and run migration on staging. Document changes in CHANGELOG.", assignedTo: "Bob Smith", priority: "High", dueDate: "2026-02-28", status: "Completed", attachments: 1 },
  { id: "TSK007", title: "UI/UX Review & Redesign", description: "Review intern dashboard for UX issues. Redesign task cards and leave request table.", assignedTo: "Grace Kim", priority: "Low", dueDate: "2026-04-15", status: "Review", attachments: 5 },
  { id: "TSK008", title: "Set Up CI/CD Pipeline", description: "Configure GitHub Actions for automated testing and deployment to staging on every PR merge.", assignedTo: "Henry Wilson", priority: "High", dueDate: "2026-04-10", status: "In Progress", attachments: 2 },
  { id: "TSK009", title: "Integrate Push Notifications", description: "Implement Firebase Cloud Messaging for real-time task and leave request notifications.", assignedTo: "Charlie Brown", priority: "Medium", dueDate: "2026-02-10", status: "Completed", attachments: 0 },
  { id: "TSK010", title: "Performance Benchmarking Report", description: "Conduct load testing with k6 and document bottlenecks in the API response times.", assignedTo: "Liam Young", priority: "Medium", dueDate: "2026-04-20", status: "To Do", attachments: 0 },
  { id: "TSK011", title: "API Rate Limiting Implementation", description: "Add token bucket rate limiting to all public endpoints. Use Redis for distributed state.", assignedTo: "Mia Martinez", priority: "High", dueDate: "2026-04-05", status: "In Progress", attachments: 1 },
  { id: "TSK012", title: "Machine Learning Model Integration", description: "Integrate the trained sentiment analysis model into the Node.js backend via REST endpoint.", assignedTo: "Deepika K", priority: "Critical", dueDate: "2026-05-01", status: "Review", attachments: 4 },
  { id: "TSK013", title: "Accessibility Audit", description: "Audit the web app for WCAG 2.1 compliance. Fix all critical and high severity issues.", assignedTo: "Karen Lee", priority: "Low", dueDate: "2026-05-10", status: "To Do", attachments: 0 },
  { id: "TSK014", title: "Security Penetration Testing", description: "Conduct OWASP top-10 penetration testing on the staging environment and report findings.", assignedTo: "Paul Anderson", priority: "Critical", dueDate: "2026-04-28", status: "In Progress", attachments: 2 },
  { id: "TSK015", title: "Intern Onboarding Documentation", description: "Write comprehensive onboarding guide for new interns including tools, workflows, and contacts.", assignedTo: "Rachel Wilson", priority: "Low", dueDate: "2026-05-15", status: "To Do", attachments: 0 },
  { id: "TSK016", title: "Implement Dark Mode Support", description: "Add system-level dark mode detection and toggle switch to all app pages.", assignedTo: "Quinn Davis", priority: "Low", dueDate: "2026-05-20", status: "Review", attachments: 1 },
  { id: "TSK017", title: "Optimize Database Queries", description: "Profile slow SQL queries using EXPLAIN ANALYZE. Add indexes where needed.", assignedTo: "Sam Taylor", priority: "High", dueDate: "2026-03-15", status: "Completed", attachments: 0 },
  { id: "TSK018", title: "IoT Data Ingestion Service", description: "Build MQTT subscriber service to ingest sensor data into TimescaleDB every 10 seconds.", assignedTo: "Diana Prince", priority: "High", dueDate: "2026-05-05", status: "In Progress", attachments: 3 },
  { id: "TSK019", title: "Admin Role Permission Matrix", description: "Define and implement RBAC permission matrix for Admin, Staff, and Student roles.", assignedTo: "Olivia White", priority: "Medium", dueDate: "2026-04-12", status: "Completed", attachments: 1 },
  { id: "TSK020", title: "Weekly Progress Report Automation", description: "Write a Python script to auto-generate weekly progress PDFs and email to mentors.", assignedTo: "Eve Davis", priority: "Medium", dueDate: "2026-05-25", status: "To Do", attachments: 0 },
];

export const shifts = [
  { id: "SHF001", internName: "Alice Johnson", currentShift: "Morning", requestedShift: "General", effectiveDate: "2026-05-01", reason: "University classes scheduled in the morning block.", status: "Pending" },
  { id: "SHF002", internName: "Bob Smith", currentShift: "Evening", requestedShift: "Morning", effectiveDate: "2026-04-15", reason: "Long distance commute is difficult late at night.", status: "Approved" },
  { id: "SHF003", internName: "Diana Prince", currentShift: "General", requestedShift: "Evening", effectiveDate: "2026-05-10", reason: "Part-time course enrollment on weekdays.", status: "Pending" },
  { id: "SHF004", internName: "Frank Miller", currentShift: "Morning", requestedShift: "Night", effectiveDate: "2026-06-01", reason: "Working on a research project with international collaborators.", status: "Rejected" },
  { id: "SHF005", internName: "Grace Kim", currentShift: "Night", requestedShift: "General", effectiveDate: "2026-04-20", reason: "Health issues related to night shift schedule.", status: "Approved" },
  { id: "SHF006", internName: "Henry Wilson", currentShift: "General", requestedShift: "Morning", effectiveDate: "2026-05-15", reason: "Transportation arrangement only available early morning.", status: "Pending" },
  { id: "SHF007", internName: "Karen Lee", currentShift: "Morning", requestedShift: "Weekend", effectiveDate: "2026-06-08", reason: "Weekday lab sessions conflict with project deadlines.", status: "Approved" },
  { id: "SHF008", internName: "Liam Young", currentShift: "Evening", requestedShift: "General", effectiveDate: "2026-05-20", reason: "Family commitment requires presence at home in evenings.", status: "Pending" },
];

export const performanceData = [
  { internId: "INT001", attendance: 95, taskCompletion: 90, communication: 85, discipline: 100, learning: 88, innovation: 80, leadership: 75, collaboration: 92 },
  { internId: "INT002", attendance: 80, taskCompletion: 62, communication: 70, discipline: 90, learning: 75, innovation: 65, leadership: 60, collaboration: 80 },
  { internId: "INT003", attendance: 98, taskCompletion: 100, communication: 95, discipline: 98, learning: 96, innovation: 90, leadership: 88, collaboration: 97 },
  { internId: "INT004", attendance: 72, taskCompletion: 34, communication: 65, discipline: 80, learning: 70, innovation: 55, leadership: 50, collaboration: 68 },
  { internId: "INT005", attendance: 88, taskCompletion: 12, communication: 78, discipline: 85, learning: 80, innovation: 70, leadership: 65, collaboration: 75 },
  { internId: "INT006", attendance: 91, taskCompletion: 78, communication: 82, discipline: 95, learning: 84, innovation: 88, leadership: 72, collaboration: 86 },
  { internId: "INT007", attendance: 97, taskCompletion: 91, communication: 93, discipline: 99, learning: 95, innovation: 92, leadership: 85, collaboration: 94 },
  { internId: "INT008", attendance: 84, taskCompletion: 55, communication: 75, discipline: 88, learning: 78, innovation: 70, leadership: 68, collaboration: 80 },
  { internId: "INT009", attendance: 99, taskCompletion: 100, communication: 97, discipline: 100, learning: 98, innovation: 95, leadership: 90, collaboration: 99 },
  { internId: "INT010", attendance: 78, taskCompletion: 28, communication: 68, discipline: 82, learning: 72, innovation: 60, leadership: 55, collaboration: 70 },
  { internId: "INT011", attendance: 89, taskCompletion: 70, communication: 80, discipline: 92, learning: 83, innovation: 74, leadership: 70, collaboration: 85 },
  { internId: "INT012", attendance: 85, taskCompletion: 48, communication: 72, discipline: 88, learning: 78, innovation: 75, leadership: 64, collaboration: 82 },
  { internId: "INT013", attendance: 92, taskCompletion: 65, communication: 84, discipline: 94, learning: 86, innovation: 80, leadership: 76, collaboration: 90 },
  { internId: "INT014", attendance: 76, taskCompletion: 20, communication: 62, discipline: 78, learning: 65, innovation: 58, leadership: 52, collaboration: 66 },
  { internId: "INT015", attendance: 96, taskCompletion: 88, communication: 90, discipline: 97, learning: 92, innovation: 85, leadership: 82, collaboration: 93 },
  { internId: "INT016", attendance: 83, taskCompletion: 53, communication: 74, discipline: 87, learning: 76, innovation: 70, leadership: 65, collaboration: 78 },
  { internId: "INT017", attendance: 90, taskCompletion: 77, communication: 86, discipline: 93, learning: 88, innovation: 83, leadership: 78, collaboration: 88 },
  { internId: "INT018", attendance: 80, taskCompletion: 30, communication: 70, discipline: 84, learning: 72, innovation: 62, leadership: 58, collaboration: 74 },
  { internId: "INT019", attendance: 98, taskCompletion: 100, communication: 94, discipline: 99, learning: 96, innovation: 91, leadership: 87, collaboration: 96 },
  { internId: "INT020", attendance: 94, taskCompletion: 82, communication: 89, discipline: 96, learning: 91, innovation: 87, leadership: 80, collaboration: 92 },
];

export const notifications = [
  { id: "NOT001", category: "System", title: "Scheduled Maintenance", message: "Server maintenance on Saturday 2:00–4:00 AM. The platform will be unavailable during this window.", time: "2 hours ago", read: false },
  { id: "NOT002", category: "Leave", title: "Leave Request Approved", message: "Your casual leave request for May 24 has been approved by your mentor.", time: "1 day ago", read: true },
  { id: "NOT003", category: "Tasks", title: "New Task Assigned", message: "You have been assigned 'API Rate Limiting Implementation' with a High priority. Due: April 5.", time: "3 hours ago", read: false },
  { id: "NOT004", category: "Performance", title: "Performance Review Ready", message: "Your Q1 performance evaluation report is now available in the Performance section.", time: "2 days ago", read: true },
  { id: "NOT005", category: "Announcements", title: "Certificate Issuance Window Open", message: "Internship completion certificates will be issued between June 1–15. Ensure all tasks are submitted.", time: "3 days ago", read: false },
  { id: "NOT006", category: "Tasks", title: "Task Review Requested", message: "Dr. Smith has requested a review of your 'Dashboard Charts' task. Please provide an update.", time: "5 hours ago", read: false },
  { id: "NOT007", category: "Leave", title: "Leave Request Pending", message: "Your sick leave request for April 10–12 is awaiting mentor approval.", time: "6 hours ago", read: true },
  { id: "NOT008", category: "System", title: "Password Expiry Warning", message: "Your account password will expire in 7 days. Please update it in Settings > Security.", time: "4 days ago", read: true },
  { id: "NOT009", category: "Announcements", title: "Project Demo Day Scheduled", message: "The mid-internship project demo is scheduled for June 20. Prepare your presentation slides.", time: "5 days ago", read: false },
  { id: "NOT010", category: "Performance", title: "Attendance Alert", message: "Your attendance has dropped below 85% this month. Please ensure regular check-ins.", time: "1 day ago", read: false },
];

export type ProjectStatus = "Active" | "Planning" | "On Hold" | "Completed" | "Cancelled";
export type ProjectCategory = "Web Application" | "Mobile App" | "UI/UX Design" | "Data & AI" | "Infrastructure" | "Research" | "HR & Operations";

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
  fileType: "pdf" | "docx" | "pptx" | "xlsx" | "zip" | "image";
  uploadedBy: string;
  uploadDate: string;
  sizeMB: number;
}

export const projects: Project[] = [
  {
    id: "PRJ001",
    name: "E-Commerce Web Application",
    description: "Full-stack e-commerce platform with product catalog, shopping cart, payment gateway integration, and admin dashboard for order management.",
    category: "Web Application",
    createdBy: "Dr. Smith",
    startDate: "2026-01-15",
    endDate: "2026-07-15",
    status: "Active",
    imageColor: "from-blue-500 to-indigo-600",
    assignedStaff: ["EMP001", "EMP006"],
    assignedInterns: ["INT001", "INT006", "INT013"],
  },
  {
    id: "PRJ002",
    name: "UI Design System",
    description: "Comprehensive design system with reusable components, design tokens, typography guidelines, and Figma-to-code workflow for all intern projects.",
    category: "UI/UX Design",
    createdBy: "Sarah Lee",
    startDate: "2026-02-01",
    endDate: "2026-08-01",
    status: "Active",
    imageColor: "from-purple-500 to-pink-500",
    assignedStaff: ["EMP003"],
    assignedInterns: ["INT007", "INT011"],
  },
  {
    id: "PRJ003",
    name: "HR Management System",
    description: "Internal HR tool for managing employee onboarding, leave tracking, payroll reports, and performance review cycles across all departments.",
    category: "HR & Operations",
    createdBy: "Priya Nair",
    startDate: "2026-03-01",
    endDate: "2026-09-01",
    status: "Planning",
    imageColor: "from-green-500 to-emerald-600",
    assignedStaff: ["EMP007", "EMP001"],
    assignedInterns: ["INT003", "INT008"],
  },
  {
    id: "PRJ004",
    name: "Inventory Management System",
    description: "Real-time inventory tracking system with barcode scanning support, low-stock alerts, supplier management, and analytics dashboard.",
    category: "Web Application",
    createdBy: "Prof. Davis",
    startDate: "2026-01-10",
    endDate: "2026-06-10",
    status: "Completed",
    imageColor: "from-orange-500 to-red-500",
    assignedStaff: ["EMP002", "EMP004"],
    assignedInterns: ["INT002", "INT005", "INT010"],
  },
  {
    id: "PRJ005",
    name: "AI Chatbot Platform",
    description: "Conversational AI platform using LLMs and RAG architecture for automated customer support with context-aware responses and escalation routing.",
    category: "Data & AI",
    createdBy: "Angela Chen",
    startDate: "2026-02-20",
    endDate: "2026-08-20",
    status: "Active",
    imageColor: "from-cyan-500 to-blue-500",
    assignedStaff: ["EMP005", "EMP002"],
    assignedInterns: ["INT012", "INT017", "INT020"],
  },
  {
    id: "PRJ006",
    name: "DevSecOps Pipeline",
    description: "Automated CI/CD pipeline with integrated security scanning, SAST/DAST tools, container image scanning, and compliance reporting.",
    category: "Infrastructure",
    createdBy: "Raj Mehta",
    startDate: "2026-04-01",
    endDate: "2026-10-01",
    status: "Active",
    imageColor: "from-gray-600 to-gray-800",
    assignedStaff: ["EMP004", "EMP010"],
    assignedInterns: ["INT018", "INT016"],
  },
  {
    id: "PRJ007",
    name: "Mobile Health App",
    description: "Cross-platform mobile application for health tracking, appointment booking, medication reminders, and telemedicine video consultations.",
    category: "Mobile App",
    createdBy: "Dr. Smith",
    startDate: "2026-03-15",
    endDate: "2026-09-15",
    status: "On Hold",
    imageColor: "from-rose-500 to-pink-600",
    assignedStaff: ["EMP006", "EMP001"],
    assignedInterns: ["INT004", "INT019"],
  },
];

export const projectDocuments: ProjectDocument[] = [
  { id: "DOC001", projectId: "PRJ001", title: "Project Requirements Specification", fileName: "requirements-spec.pdf", fileType: "pdf", uploadedBy: "Dr. Smith", uploadDate: "2026-01-20", sizeMB: 2.4 },
  { id: "DOC002", projectId: "PRJ001", title: "Database Schema Design", fileName: "db-schema.pdf", fileType: "pdf", uploadedBy: "Alice Johnson", uploadDate: "2026-02-05", sizeMB: 1.1 },
  { id: "DOC003", projectId: "PRJ001", title: "API Endpoints Documentation", fileName: "api-docs.docx", fileType: "docx", uploadedBy: "Frank Miller", uploadDate: "2026-02-18", sizeMB: 0.8 },
  { id: "DOC004", projectId: "PRJ001", title: "Sprint 1 Presentation", fileName: "sprint1-demo.pptx", fileType: "pptx", uploadedBy: "Mia Martinez", uploadDate: "2026-03-01", sizeMB: 5.2 },
  { id: "DOC005", projectId: "PRJ002", title: "Design Tokens Reference", fileName: "design-tokens.pdf", fileType: "pdf", uploadedBy: "Sarah Lee", uploadDate: "2026-02-10", sizeMB: 1.9 },
  { id: "DOC006", projectId: "PRJ002", title: "Component Library Specs", fileName: "components.docx", fileType: "docx", uploadedBy: "Grace Kim", uploadDate: "2026-02-25", sizeMB: 3.1 },
  { id: "DOC007", projectId: "PRJ002", title: "Figma Export Assets", fileName: "figma-assets.zip", fileType: "zip", uploadedBy: "Karen Lee", uploadDate: "2026-03-10", sizeMB: 18.4 },
  { id: "DOC008", projectId: "PRJ003", title: "HR Process Flowchart", fileName: "hr-flowchart.pdf", fileType: "pdf", uploadedBy: "Priya Nair", uploadDate: "2026-03-05", sizeMB: 0.6 },
  { id: "DOC009", projectId: "PRJ003", title: "Data Privacy Compliance Checklist", fileName: "compliance.xlsx", fileType: "xlsx", uploadedBy: "Charlie Brown", uploadDate: "2026-03-20", sizeMB: 0.4 },
  { id: "DOC010", projectId: "PRJ004", title: "Inventory System Architecture", fileName: "architecture.pdf", fileType: "pdf", uploadedBy: "Prof. Davis", uploadDate: "2026-01-15", sizeMB: 3.3 },
  { id: "DOC011", projectId: "PRJ004", title: "Final Delivery Report", fileName: "delivery-report.docx", fileType: "docx", uploadedBy: "Bob Smith", uploadDate: "2026-06-05", sizeMB: 1.7 },
  { id: "DOC012", projectId: "PRJ005", title: "LLM Integration Research", fileName: "llm-research.pdf", fileType: "pdf", uploadedBy: "Angela Chen", uploadDate: "2026-03-01", sizeMB: 4.8 },
  { id: "DOC013", projectId: "PRJ005", title: "Training Dataset Summary", fileName: "dataset-summary.xlsx", fileType: "xlsx", uploadedBy: "Grace Kim", uploadDate: "2026-03-15", sizeMB: 2.2 },
  { id: "DOC014", projectId: "PRJ005", title: "Model Evaluation Results", fileName: "model-eval.pdf", fileType: "pdf", uploadedBy: "Deepika K", uploadDate: "2026-04-01", sizeMB: 1.5 },
  { id: "DOC015", projectId: "PRJ006", title: "Pipeline Architecture Diagram", fileName: "pipeline-arch.pdf", fileType: "pdf", uploadedBy: "Raj Mehta", uploadDate: "2026-04-10", sizeMB: 2.0 },
  { id: "DOC016", projectId: "PRJ006", title: "Security Audit Report", fileName: "security-audit.docx", fileType: "docx", uploadedBy: "Lucas Oliveira", uploadDate: "2026-05-01", sizeMB: 3.7 },
  { id: "DOC017", projectId: "PRJ007", title: "Mobile App Wireframes", fileName: "wireframes.pdf", fileType: "pdf", uploadedBy: "Dr. Smith", uploadDate: "2026-03-20", sizeMB: 6.1 },
  { id: "DOC018", projectId: "PRJ007", title: "Feature Roadmap", fileName: "roadmap.xlsx", fileType: "xlsx", uploadedBy: "Michael Torres", uploadDate: "2026-04-05", sizeMB: 0.9 },
];

export const events = [
  { date: "2026-06-05", title: "Project Review – AI Chatbot", type: "Deadline" },
  { date: "2026-06-08", title: "Weekend Shift Starts", type: "Event" },
  { date: "2026-06-10", title: "Mid-Internship Evaluation", type: "Meeting" },
  { date: "2026-06-12", title: "Leave – Deepika K", type: "Leave" },
  { date: "2026-06-15", title: "Certificate Window Opens", type: "Event" },
  { date: "2026-06-18", title: "API Integration Deadline", type: "Deadline" },
  { date: "2026-06-20", title: "Project Demo Day", type: "Event" },
  { date: "2026-06-22", title: "Mentor–Intern 1:1 Sessions", type: "Meeting" },
  { date: "2026-06-25", title: "Security Audit Submission", type: "Deadline" },
  { date: "2026-06-28", title: "Leave – Alice Johnson", type: "Leave" },
  { date: "2026-07-01", title: "New Intern Batch Onboarding", type: "Event" },
  { date: "2026-07-05", title: "Performance Reports Due", type: "Deadline" },
];
