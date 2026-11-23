import type { Project } from "@/domain/projects/project";

export const sampleProjects: readonly Project[] = [
  {
    id: "project-1",
    name: "Portfolio site",
    description: "Personal website with a contact page and blog section.",
    targetUrl: "https://example.com/portfolio",
    requestCount: 2,
    completedTaskCount: 3,
    totalTaskCount: 8,
  },
  {
    id: "project-2",
    name: "Booking app",
    description: "Appointment flow for a small clinic, with reminders.",
    targetUrl: "https://example.com/booking",
    requestCount: 1,
    completedTaskCount: 0,
    totalTaskCount: 4,
  },
  {
    id: "project-3",
    name: "Agent Team demo",
    description: "The board you are looking at, used to run the test brief.",
    targetUrl: "http://localhost:3000",
    requestCount: 1,
    completedTaskCount: 1,
    totalTaskCount: 5,
  },
];
