#!/usr/bin/env npx tsx
/**
 * Azure DevOps CLI - TypeScript command-line interface for the ADO API client.
 *
 * Usage:
 *   npx tsx ado.ts <command> [args...]
 *
 * Commands:
 *   Work Items:
 *     get-work-item [project] <id>                    Get a work item
 *     create-work-item <project> <type> <fields-json>  Create a work item
 *     update-work-item [project] <id> <updates-json>   Update a work item
 *     delete-work-item [project] <id>                  Delete a work item
 *     query <project> <wiql>                           Run WIQL query
 *     get-comments [project] <work-item-id>            Get work item comments
 *     add-comment [project] <work-item-id> <text>      Add work item comment
 *
 *   Git:
 *     list-repos <project>                             List repositories
 *     list-prs <project> <repo-id>                     List pull requests
 *     get-pr [project] <pr-id>                         Get a pull request
 *     get-pr-threads [project] <pr-id>                 Get PR comment threads
 *     add-pr-comment [project] <pr-id> <content>       Add PR comment
 *     list-branches <project> <repo-id>                List branches
 *     list-commits <project> <repo-id>                 List commits
 *     list-tags <project> <repo-id>                    List tags
 *
 *   Pipelines:
 *     list-pipelines <project>                         List pipelines
 *     run-pipeline <project> <pipeline-id>             Run a pipeline
 *     get-pipeline-run <project> <pipeline-id> <run-id>  Get pipeline run
 *     list-builds <project>                            List builds
 *
 *   Projects:
 *     list-projects                                    List all projects
 *     get-project <name>                               Get project details
 *     list-teams <project>                             List teams
 *
 *   Identity:
 *     get-user-by-email <email>                        Look up user by email
 *     search-users-by-name <name> [max]                Search users by display name
 *
 * Environment:
 *   ADO_ORGANIZATION  Azure DevOps organization name
 *   ADO_PAT           Personal Access Token
 *   Auto-resolution: When project is omitted, it is resolved from the PR/work-item ID via the ADO API.
 *
 * Examples:
 *   npx tsx ado.ts get-work-item "My Project" 42731
 *   npx tsx ado.ts list-prs "My Project" "repo-id"
 *   npx tsx ado.ts add-pr-comment "My Project" "repo-id" 123 "LGTM!"
 *   npx tsx ado.ts query "My Project" "SELECT [System.Id] FROM WorkItems WHERE [System.State] = 'Active'"
 */

import { AzureDevOpsClient } from "./ado_client.js";

function printJson(data: any): void {
  console.log(JSON.stringify(data, null, 2));
}

function printUsage(): void {
  console.log(`Azure DevOps CLI - TypeScript

Usage: npx tsx ado.ts <command> [args...]

Work Items:
  get-work-item [project] <id>                     Get a work item
  create-work-item <project> <type> <fields-json>  Create a work item
  update-work-item [project] <id> <updates-json>   Update a work item
  delete-work-item [project] <id>                  Delete a work item
  query <project> <wiql>                           Run WIQL query
  get-comments [project] <work-item-id>            Get work item comments
  add-comment [project] <work-item-id> <text>      Add work item comment

Git:
  list-repos <project>                             List repositories
  list-prs <project> <repo-id>                     List pull requests
  get-pr [project] <pr-id>                         Get a pull request
  get-pr-threads [project] <pr-id>                 Get PR comment threads
  add-pr-comment [project] <pr-id> <content>       Add PR comment
  list-branches <project> <repo-id>                List branches
  list-commits <project> <repo-id>                 List commits
  list-tags <project> <repo-id>                    List tags

Pipelines:
  list-pipelines <project>                         List pipelines
  run-pipeline <project> <pipeline-id>             Run a pipeline
  get-pipeline-run <project> <pipeline-id> <run-id>  Get pipeline run
  list-builds <project>                            List builds

Projects:
  list-projects                                    List all projects
  get-project <name>                               Get project details
  list-teams <project>                             List teams

Identity:
  get-user-by-email <email>                        Look up user by email
  search-users-by-name <name> [max]                Search users by display name

Environment:
  ADO_ORGANIZATION  Azure DevOps organization name
  ADO_PAT           Personal Access Token
  Auto-resolution: When project is omitted, it is resolved from the PR/work-item ID via the ADO API.`);
}

const VALID_COMMANDS = new Set([
  "get-work-item",
  "create-work-item",
  "update-work-item",
  "delete-work-item",
  "query",
  "get-comments",
  "add-comment",
  "list-repos",
  "list-prs",
  "get-pr",
  "get-pr-threads",
  "add-pr-comment",
  "list-branches",
  "list-commits",
  "list-tags",
  "list-pipelines",
  "run-pipeline",
  "get-pipeline-run",
  "list-builds",
  "list-projects",
  "get-project",
  "list-teams",
  "get-user-by-email",
  "search-users-by-name",
  "help",
  "--help",
  "-h",
]);

async function main(): Promise<void> {
  const [command, ...args] = process.argv.slice(2);

  if (!command) {
    printUsage();
    process.exit(1);
  }

  if (command === "help" || command === "--help" || command === "-h") {
    printUsage();
    process.exit(0);
  }

  if (!VALID_COMMANDS.has(command)) {
    console.error(`Unknown command: ${command}`);
    console.error(`Available commands: ${[...VALID_COMMANDS].filter((c) => !c.startsWith("-") && c !== "help").sort().join(", ")}`);
    process.exit(1);
  }

  // Commands that never need a project argument
  const NO_PROJECT_COMMANDS = new Set(["list-projects", "get-user-by-email", "search-users-by-name"]);

  // Commands where the first numeric arg is a PR ID (project + repo auto-resolved)
  const PR_COMMANDS = new Set([
    "get-pr",
    "get-pr-threads",
    "add-pr-comment",
  ]);

  // Commands where the first numeric arg is a work item ID (project auto-resolved)
  const WORK_ITEM_COMMANDS = new Set([
    "get-work-item",
    "update-work-item",
    "delete-work-item",
    "get-comments",
    "add-comment",
  ]);

  const client = new AzureDevOpsClient();

  // Minimum arg counts when project IS provided (used to detect if auto-resolution is needed)
  const FULL_ARG_COUNTS: Record<string, number> = {
    "get-pr": 3, "get-pr-threads": 3, "add-pr-comment": 4,
    "get-work-item": 2, "update-work-item": 3, "delete-work-item": 2,
    "get-comments": 2, "add-comment": 3,
  };

  // Auto-resolve project when first arg looks like a numeric ID and user provided fewer
  // args than the full explicit form requires (avoids false triggers on numeric project names)
  if (!NO_PROJECT_COMMANDS.has(command) && args[0] && /^\d+$/.test(args[0])) {
    const fullCount = FULL_ARG_COUNTS[command];
    const needsResolution = fullCount !== undefined && args.length < fullCount;

    if (needsResolution) {
      const numericId = parseInt(args[0]);

      if (PR_COMMANDS.has(command)) {
        console.error(`Resolving project from PR #${numericId}...`);
        const resolved = await client.resolveProjectFromPullRequest(numericId);
        if (!resolved.success || !resolved.data) {
          console.error(`Error: ${resolved.error?.message || "Failed to resolve project from PR"}`);
          process.exit(1);
        }
        console.error(`Found: project="${resolved.data.project}", repo="${resolved.data.repositoryName}"`);
        args.unshift(resolved.data.project, resolved.data.repositoryId);
      } else if (WORK_ITEM_COMMANDS.has(command)) {
        console.error(`Resolving project from work item #${numericId}...`);
        const resolved = await client.resolveProjectFromWorkItem(numericId);
        if (!resolved.success || !resolved.data) {
          console.error(`Error: ${resolved.error?.message || "Failed to resolve project from work item"}`);
          process.exit(1);
        }
        console.error(`Found: project="${resolved.data.project}"`);
        args.unshift(resolved.data.project);
      }
    }
  }

  // After auto-resolution, validate project is present for commands that need it
  if (!NO_PROJECT_COMMANDS.has(command) && !args[0]) {
    console.error(`Error: <project> is required for '${command}'.`);
    console.error(`Usage: npx tsx ado.ts ${command} [project] ...`);
    console.error(`\nTo see available projects: npx tsx ado.ts list-projects`);
    process.exit(1);
  }

  const commands: Record<string, () => Promise<any>> = {
    // Work Items
    "get-work-item": () => client.getWorkItem(args[0], parseInt(args[1])),
    "create-work-item": () =>
      client.createWorkItem(args[0], args[1], JSON.parse(args[2])),
    "update-work-item": () =>
      client.updateWorkItem(args[0], parseInt(args[1]), JSON.parse(args[2])),
    "delete-work-item": () =>
      client.deleteWorkItem(args[0], parseInt(args[1])),
    query: () => client.queryWorkItems(args[0], args[1], 100),
    "get-comments": () =>
      client.getWorkItemComments(args[0], parseInt(args[1])),
    "add-comment": () =>
      client.addWorkItemComment(args[0], parseInt(args[1]), args[2]),

    // Git
    "list-repos": () => client.listRepositories(args[0]),
    "list-prs": () => client.listPullRequests(args[0], args[1]),
    "get-pr": () =>
      client.getPullRequest(args[0], args[1], parseInt(args[2])),
    "get-pr-threads": () =>
      client.getPullRequestThreads(args[0], args[1], parseInt(args[2])),
    "add-pr-comment": () =>
      client.addPullRequestThread(args[0], args[1], parseInt(args[2]), args[3]),
    "list-branches": () => client.listBranches(args[0], args[1]),
    "list-commits": () => client.listCommits(args[0], args[1], undefined, 20),
    "list-tags": () => client.listTags(args[0], args[1]),

    // Pipelines
    "list-pipelines": () => client.listPipelines(args[0]),
    "run-pipeline": () =>
      client.runPipeline(args[0], parseInt(args[1])),
    "get-pipeline-run": () =>
      client.getPipelineRun(args[0], parseInt(args[1]), parseInt(args[2])),
    "list-builds": () => client.listBuilds(args[0]),

    // Projects
    "list-projects": () => client.listProjects(),
    "get-project": () => client.getProject(args[0]),
    "list-teams": () => client.listTeams(args[0]),

    // Identity
    "get-user-by-email": () => client.getUserByEmail(args[0]),
    "search-users-by-name": () => client.searchUsersByDisplayName(args[0], args[1] ? parseInt(args[1]) : undefined),
  };

  try {
    const result = await commands[command]();
    printJson(result);
  } catch (e: any) {
    if (e instanceof TypeError && e.message.includes("undefined")) {
      console.error(`Error: Missing arguments for '${command}'`);
      printUsage();
      process.exit(1);
    }
    console.error(`Error: ${e.message}`);
    process.exit(1);
  }
}

main();
