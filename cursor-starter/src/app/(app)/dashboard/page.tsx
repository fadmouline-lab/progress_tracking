"use client";

import { motion } from "framer-motion";
import {
  Users,
  DollarSign,
  Activity,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const stats = [
  {
    title: "Total Users",
    value: "12,489",
    change: "+12.5%",
    trend: "up" as const,
    icon: Users,
    description: "from last month",
  },
  {
    title: "Revenue",
    value: "$48,352",
    change: "+8.2%",
    trend: "up" as const,
    icon: DollarSign,
    description: "from last month",
  },
  {
    title: "Active Sessions",
    value: "2,834",
    change: "-3.1%",
    trend: "down" as const,
    icon: Activity,
    description: "from last hour",
  },
  {
    title: "Growth Rate",
    value: "24.5%",
    change: "+4.1%",
    trend: "up" as const,
    icon: TrendingUp,
    description: "from last quarter",
  },
];

const recentActivity = [
  { user: "Alice Johnson", action: "Created a new project", time: "2 min ago" },
  { user: "Bob Smith", action: "Updated billing info", time: "15 min ago" },
  { user: "Carol Williams", action: "Invited 3 team members", time: "1 hr ago" },
  { user: "David Brown", action: "Deployed to production", time: "2 hr ago" },
  { user: "Eve Davis", action: "Generated monthly report", time: "4 hr ago" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.35, ease: "easeOut" as const },
  }),
};

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your key metrics and recent activity.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.title}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={i}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <stat.icon className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  {stat.trend === "up" ? (
                    <ArrowUpRight className="size-3 text-emerald-500" />
                  ) : (
                    <ArrowDownRight className="size-3 text-red-500" />
                  )}
                  <span
                    className={
                      stat.trend === "up" ? "text-emerald-500" : "text-red-500"
                    }
                  >
                    {stat.change}
                  </span>{" "}
                  {stat.description}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Content grid */}
      <div className="grid gap-4 lg:grid-cols-7">
        {/* Main content area */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Overview</CardTitle>
            <CardDescription>
              This is a placeholder for a chart or main content area. Use
              recharts (already installed) or any visualization library.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-64 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
              Chart or content goes here
            </div>
          </CardContent>
        </Card>

        {/* Recent activity */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest actions across your app.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                    {activity.user
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>
                  <div className="flex-1 space-y-0.5">
                    <p className="text-sm font-medium leading-none">
                      {activity.user}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {activity.action}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {activity.time}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
