#!/usr/bin/env python3
"""
Azure DevOps CLI - Simple command-line interface for the ADO API client.

Usage:
    uv run --with requests python3 ado.py <command> [args...]

Commands:
    get-work-item <project> <id>              Get a work item
    get-project <name>                        Get project details
    list-projects                             List all projects
    query <project> <wiql>                    Run WIQL query
    list-repos <project>                      List repositories
    list-prs <project> <repo-id>              List pull requests
    list-pipelines <project>                  List pipelines

Examples:
    uv run --with requests python3 ado.py get-work-item "Best Upon Request" 42731
    uv run --with requests python3 ado.py get-project "Best Upon Request"
    uv run --with requests python3 ado.py list-projects
"""

import sys
import json
from ado_client import AzureDevOpsClient


def print_json(data):
  """Pretty print JSON data."""
  print(json.dumps(data, indent=2, default=str))


def main():
  if len(sys.argv) < 2:
    print(__doc__)
    sys.exit(1)

  command = sys.argv[1]
  args = sys.argv[2:]

  client = AzureDevOpsClient()

  commands = {
    'get-work-item': lambda: client.get_work_item(args[0], int(args[1])),
    'get-project': lambda: client.get_project(args[0]),
    'list-projects': lambda: client.list_projects(),
    'query': lambda: client.query_work_items(args[0], args[1], top=100),
    'list-repos': lambda: client.list_repositories(args[0]),
    'list-prs': lambda: client.list_pull_requests(args[0], args[1]),
    'list-pipelines': lambda: client.list_pipelines(args[0]),
    'list-teams': lambda: client.list_teams(args[0]),
    'list-branches': lambda: client.list_branches(args[0], args[1]),
    'list-commits': lambda: client.list_commits(args[0], args[1], top=20),
    'get-pr': lambda: client.get_pull_request(args[0], args[1], int(args[2])),
    'create-work-item': lambda: client.create_work_item(args[0], args[1], json.loads(args[2])),
    'update-work-item': lambda: client.update_work_item(args[0], int(args[1]), json.loads(args[2])),
    'add-comment': lambda: client.add_work_item_comment(args[0], int(args[1]), args[2]),
  }

  if command == 'help' or command == '--help' or command == '-h':
    print(__doc__)
    sys.exit(0)

  if command not in commands:
    print(f"Unknown command: {command}")
    print(f"Available commands: {', '.join(commands.keys())}")
    sys.exit(1)

  try:
    result = commands[command]()
    print_json(result)
  except IndexError:
    print(f"Error: Missing arguments for '{command}'")
    print(__doc__)
    sys.exit(1)
  except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)


if __name__ == "__main__":
  main()
