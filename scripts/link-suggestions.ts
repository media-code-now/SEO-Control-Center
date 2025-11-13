import { prisma } from "../lib/prisma";
import { generateLinkSuggestionsForProject } from "../lib/linking/linkOpportunities";

async function main() {
  const projectIdArg = process.argv[2];

  const projects = projectIdArg
    ? await prisma.project.findMany({ where: { id: projectIdArg }, select: { id: true, name: true } })
    : await prisma.project.findMany({ select: { id: true, name: true } });

  if (!projects.length) {
    console.log("No projects found to scan.");
    return;
  }

  for (const project of projects) {
    const suggestions = await generateLinkSuggestionsForProject(project.id);
    console.log(
      `Project ${project.name ?? project.id}: created ${suggestions.length} link suggestion task${
        suggestions.length === 1 ? "" : "s"
      }.`,
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
