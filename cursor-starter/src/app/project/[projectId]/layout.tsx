import { ProjectProvider } from "@/components/project/project-provider";
import { ProjectShellBar } from "@/components/project/project-shell-bar";
import { ProjectHeader } from "@/components/project/project-header";
import { ProjectTabs } from "@/components/project/project-tabs";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  return (
    <ProjectProvider projectId={projectId}>
      <div className="flex min-h-svh flex-col bg-background">
        <ProjectShellBar />
        <ProjectHeader />
        <ProjectTabs />
        <div className="flex-1 overflow-auto p-6">{children}</div>
      </div>
    </ProjectProvider>
  );
}
