"""
Azure DevOps REST API Client (API Version 7.1)

Simple Python client using requests library with consistent response format.
No exceptions thrown - all methods return {"success": True, "data": {...}} or {"success": False, "error": {...}}.

Authentication: Personal Access Token (PAT) via environment variables or direct parameters.
"""

import os
import base64
import requests
from typing import Dict, Any, Optional, List


class AzureDevOpsClient:
  """Simple Azure DevOps REST API client."""

  def __init__(self, organization: str = None, pat: str = None, api_version: str = "7.1"):
    """
    Initialize the Azure DevOps client.

    Args:
      organization: Azure DevOps organization name (or set ADO_ORGANIZATION env var)
      pat: Personal Access Token (or set ADO_PAT env var)
      api_version: API version to use (default: 7.1)

    Raises:
      ValueError: If organization or pat is not provided and not set in environment
    """
    self.organization = organization or os.getenv("ADO_ORGANIZATION")
    self.pat = pat or os.getenv("ADO_PAT")

    if not self.organization:
      raise ValueError(
        "organization is required. Provide it as a parameter or set ADO_ORGANIZATION env var."
      )
    if not self.pat:
      raise ValueError(
        "pat is required. Provide it as a parameter or set ADO_PAT env var."
      )

    self.api_version = api_version
    self.base_url = f"https://dev.azure.com/{self.organization}"
    self._session = requests.Session()
    self._session.headers.update(self._get_headers())

  def _get_headers(self) -> Dict[str, str]:
    """Get default headers with Basic auth."""
    token = base64.b64encode(f":{self.pat}".encode()).decode()
    return {
      "Authorization": f"Basic {token}",
      "Content-Type": "application/json"
    }

  def _request(self, method: str, url: str, **kwargs) -> Dict[str, Any]:
    """Make request, return JSON with success/error info."""
    try:
      response = self._session.request(method, url, **kwargs)
      if response.ok:
        if response.status_code == 204 or not response.text:
          return {"success": True, "data": None}
        return {"success": True, "data": response.json()}
      else:
        return {
          "success": False,
          "error": {
            "status_code": response.status_code,
            "message": response.text
          }
        }
    except Exception as e:
      return {"success": False, "error": {"message": str(e)}}

  def _build_url(self, path: str, project: str = None) -> str:
    """Build full API URL."""
    if project:
      return f"{self.base_url}/{project}/_apis/{path}"
    return f"{self.base_url}/_apis/{path}"

  def _add_params(self, params: Dict, **kwargs) -> Dict:
    """Add api-version and optional parameters."""
    params["api-version"] = self.api_version
    for key, value in kwargs.items():
      if value is not None:
        params[key] = value
    return params

  # ===========================================================================
  # WORK ITEMS (12 methods)
  # ===========================================================================

  def get_work_item(self, project: str, work_item_id: int, expand: str = "All") -> Dict[str, Any]:
    """Get a single work item by ID."""
    url = self._build_url(f"wit/workitems/{work_item_id}", project)
    params = self._add_params({}, **{"$expand": expand})
    return self._request("GET", url, params=params)

  def get_work_items(self, project: str, ids: List[int], fields: List[str] = None) -> Dict[str, Any]:
    """Get multiple work items by IDs."""
    url = self._build_url("wit/workitems", project)
    params = self._add_params({"ids": ",".join(map(str, ids))})
    if fields:
      params["fields"] = ",".join(fields)
    return self._request("GET", url, params=params)

  def create_work_item(self, project: str, work_item_type: str, fields: Dict[str, Any]) -> Dict[str, Any]:
    """Create a new work item."""
    url = self._build_url(f"wit/workitems/${work_item_type}", project)
    params = self._add_params({})
    operations = [{"op": "add", "path": f"/fields/{k}", "value": v} for k, v in fields.items()]
    headers = {"Content-Type": "application/json-patch+json"}
    return self._request("POST", url, params=params, json=operations, headers=headers)

  def update_work_item(self, project: str, work_item_id: int, updates: Dict[str, Any]) -> Dict[str, Any]:
    """Update a work item's fields."""
    url = self._build_url(f"wit/workitems/{work_item_id}", project)
    params = self._add_params({})
    operations = [{"op": "add", "path": f"/fields/{k}", "value": v} for k, v in updates.items()]
    headers = {"Content-Type": "application/json-patch+json"}
    return self._request("PATCH", url, params=params, json=operations, headers=headers)

  def delete_work_item(self, project: str, work_item_id: int, permanent: bool = False) -> Dict[str, Any]:
    """Delete a work item (move to recycle bin or permanently delete)."""
    url = self._build_url(f"wit/workitems/{work_item_id}", project)
    params = self._add_params({}, destroy=permanent if permanent else None)
    return self._request("DELETE", url, params=params)

  def query_work_items(self, project: str, wiql: str, top: int = None) -> Dict[str, Any]:
    """Execute a WIQL query."""
    url = self._build_url("wit/wiql", project)
    params = self._add_params({}, **{"$top": top})
    return self._request("POST", url, params=params, json={"query": wiql})

  def get_work_item_comments(self, project: str, work_item_id: int, top: int = None) -> Dict[str, Any]:
    """Get comments for a work item."""
    url = self._build_url(f"wit/workitems/{work_item_id}/comments", project)
    params = {"api-version": "7.1-preview.4"}
    if top:
      params["$top"] = top
    return self._request("GET", url, params=params)

  def add_work_item_comment(self, project: str, work_item_id: int, text: str) -> Dict[str, Any]:
    """Add a comment to a work item."""
    url = self._build_url(f"wit/workitems/{work_item_id}/comments", project)
    params = {"api-version": "7.1-preview.4"}
    return self._request("POST", url, params=params, json={"text": text})

  def link_work_items(self, project: str, source_id: int, target_id: int,
            link_type: str, comment: str = None) -> Dict[str, Any]:
    """Link two work items together."""
    url = self._build_url(f"wit/workitems/{source_id}", project)
    params = self._add_params({})
    target_url = f"{self.base_url}/{project}/_apis/wit/workitems/{target_id}"
    operation = {
      "op": "add",
      "path": "/relations/-",
      "value": {
        "rel": link_type,
        "url": target_url
      }
    }
    if comment:
      operation["value"]["attributes"] = {"comment": comment}
    headers = {"Content-Type": "application/json-patch+json"}
    return self._request("PATCH", url, params=params, json=[operation], headers=headers)

  def get_work_item_revisions(self, project: str, work_item_id: int,
                top: int = None, skip: int = None) -> Dict[str, Any]:
    """Get revisions of a work item."""
    url = self._build_url(f"wit/workitems/{work_item_id}/revisions", project)
    params = self._add_params({}, **{"$top": top, "$skip": skip})
    return self._request("GET", url, params=params)

  def upload_attachment(self, project: str, file_name: str, content: bytes) -> Dict[str, Any]:
    """Upload an attachment and return the attachment URL."""
    url = self._build_url("wit/attachments", project)
    params = self._add_params({"fileName": file_name})
    headers = {"Content-Type": "application/octet-stream"}
    return self._request("POST", url, params=params, data=content, headers=headers)

  def attach_to_work_item(self, project: str, work_item_id: int,
              attachment_url: str, comment: str = None) -> Dict[str, Any]:
    """Attach an uploaded file to a work item."""
    url = self._build_url(f"wit/workitems/{work_item_id}", project)
    params = self._add_params({})
    operation = {
      "op": "add",
      "path": "/relations/-",
      "value": {
        "rel": "AttachedFile",
        "url": attachment_url
      }
    }
    if comment:
      operation["value"]["attributes"] = {"comment": comment}
    headers = {"Content-Type": "application/json-patch+json"}
    return self._request("PATCH", url, params=params, json=[operation], headers=headers)

  # ===========================================================================
  # GIT REPOSITORIES (14 methods)
  # ===========================================================================

  def list_repositories(self, project: str) -> Dict[str, Any]:
    """List all Git repositories in a project."""
    url = self._build_url("git/repositories", project)
    params = self._add_params({})
    return self._request("GET", url, params=params)

  def get_repository(self, project: str, repository_id_or_name: str) -> Dict[str, Any]:
    """Get a Git repository by ID or name."""
    url = self._build_url(f"git/repositories/{repository_id_or_name}", project)
    params = self._add_params({})
    return self._request("GET", url, params=params)

  def list_pull_requests(self, project: str, repository_id: str,
              status: str = "active", top: int = None) -> Dict[str, Any]:
    """List pull requests in a repository."""
    url = self._build_url(f"git/repositories/{repository_id}/pullrequests", project)
    params = self._add_params({"searchCriteria.status": status}, **{"$top": top})
    return self._request("GET", url, params=params)

  def get_pull_request(self, project: str, repository_id: str, pull_request_id: int) -> Dict[str, Any]:
    """Get a specific pull request."""
    url = self._build_url(f"git/repositories/{repository_id}/pullrequests/{pull_request_id}", project)
    params = self._add_params({})
    return self._request("GET", url, params=params)

  def create_pull_request(self, project: str, repository_id: str, source_ref: str, target_ref: str,
              title: str, description: str = None, reviewers: List[str] = None,
              work_item_ids: List[int] = None, is_draft: bool = False) -> Dict[str, Any]:
    """Create a new pull request."""
    url = self._build_url(f"git/repositories/{repository_id}/pullrequests", project)
    params = self._add_params({})
    body = {
      "sourceRefName": f"refs/heads/{source_ref}" if not source_ref.startswith("refs/") else source_ref,
      "targetRefName": f"refs/heads/{target_ref}" if not target_ref.startswith("refs/") else target_ref,
      "title": title,
      "isDraft": is_draft
    }
    if description:
      body["description"] = description
    if reviewers:
      body["reviewers"] = [{"id": r} for r in reviewers]
    if work_item_ids:
      body["workItemRefs"] = [{"id": str(wid)} for wid in work_item_ids]
    return self._request("POST", url, params=params, json=body)

  def update_pull_request(self, project: str, repository_id: str,
              pull_request_id: int, updates: Dict[str, Any]) -> Dict[str, Any]:
    """Update a pull request (title, description, status, etc.)."""
    url = self._build_url(f"git/repositories/{repository_id}/pullrequests/{pull_request_id}", project)
    params = self._add_params({})
    return self._request("PATCH", url, params=params, json=updates)

  def get_pull_request_threads(self, project: str, repository_id: str,
                 pull_request_id: int) -> Dict[str, Any]:
    """Get all comment threads on a pull request."""
    url = self._build_url(f"git/repositories/{repository_id}/pullrequests/{pull_request_id}/threads", project)
    params = self._add_params({})
    return self._request("GET", url, params=params)

  def add_pull_request_thread(self, project: str, repository_id: str, pull_request_id: int,
                content: str, status: str = "active",
                file_path: str = None, line: int = None) -> Dict[str, Any]:
    """Add a comment thread to a pull request."""
    url = self._build_url(f"git/repositories/{repository_id}/pullrequests/{pull_request_id}/threads", project)
    params = self._add_params({})
    body = {
      "comments": [{"content": content, "commentType": 1}],
      "status": status
    }
    if file_path:
      body["threadContext"] = {"filePath": file_path}
      if line:
        body["threadContext"]["rightFileStart"] = {"line": line, "offset": 1}
        body["threadContext"]["rightFileEnd"] = {"line": line, "offset": 1}
    return self._request("POST", url, params=params, json=body)

  def list_commits(self, project: str, repository_id: str,
           branch: str = None, top: int = None) -> Dict[str, Any]:
    """List commits in a repository."""
    url = self._build_url(f"git/repositories/{repository_id}/commits", project)
    params = self._add_params({}, **{"$top": top})
    if branch:
      params["searchCriteria.itemVersion.version"] = branch
    return self._request("GET", url, params=params)

  def get_commit(self, project: str, repository_id: str,
          commit_id: str, change_count: int = None) -> Dict[str, Any]:
    """Get a specific commit with optional change details."""
    url = self._build_url(f"git/repositories/{repository_id}/commits/{commit_id}", project)
    params = self._add_params({}, changeCount=change_count)
    return self._request("GET", url, params=params)

  def list_branches(self, project: str, repository_id: str,
           filter_contains: str = None) -> Dict[str, Any]:
    """List branches in a repository."""
    url = self._build_url(f"git/repositories/{repository_id}/refs", project)
    params = self._add_params({"filter": "heads/"})
    if filter_contains:
      params["filterContains"] = filter_contains
    return self._request("GET", url, params=params)

  def list_tags(self, project: str, repository_id: str) -> Dict[str, Any]:
    """List tags in a repository."""
    url = self._build_url(f"git/repositories/{repository_id}/refs", project)
    params = self._add_params({"filter": "tags/"})
    return self._request("GET", url, params=params)

  def create_branch(self, project: str, repository_id: str,
           branch_name: str, source_commit_id: str) -> Dict[str, Any]:
    """Create a new branch from a commit."""
    url = self._build_url(f"git/repositories/{repository_id}/refs", project)
    params = self._add_params({})
    ref_name = f"refs/heads/{branch_name}" if not branch_name.startswith("refs/") else branch_name
    body = [{
      "name": ref_name,
      "oldObjectId": "0000000000000000000000000000000000000000",
      "newObjectId": source_commit_id
    }]
    return self._request("POST", url, params=params, json=body)

  def delete_branch(self, project: str, repository_id: str,
           branch_name: str, current_commit_id: str) -> Dict[str, Any]:
    """Delete a branch."""
    url = self._build_url(f"git/repositories/{repository_id}/refs", project)
    params = self._add_params({})
    ref_name = f"refs/heads/{branch_name}" if not branch_name.startswith("refs/") else branch_name
    body = [{
      "name": ref_name,
      "oldObjectId": current_commit_id,
      "newObjectId": "0000000000000000000000000000000000000000"
    }]
    return self._request("POST", url, params=params, json=body)

  # ===========================================================================
  # PIPELINES (11 methods)
  # ===========================================================================

  def list_pipelines(self, project: str, top: int = None) -> Dict[str, Any]:
    """List all pipelines in a project."""
    url = self._build_url("pipelines", project)
    params = self._add_params({}, **{"$top": top})
    return self._request("GET", url, params=params)

  def get_pipeline(self, project: str, pipeline_id: int) -> Dict[str, Any]:
    """Get a specific pipeline."""
    url = self._build_url(f"pipelines/{pipeline_id}", project)
    params = self._add_params({})
    return self._request("GET", url, params=params)

  def run_pipeline(self, project: str, pipeline_id: int, ref_name: str = None,
           template_parameters: Dict[str, str] = None,
           variables: Dict[str, str] = None) -> Dict[str, Any]:
    """Run a pipeline."""
    url = self._build_url(f"pipelines/{pipeline_id}/runs", project)
    params = self._add_params({})
    body = {}
    if ref_name:
      body["resources"] = {"repositories": {"self": {"refName": ref_name}}}
    if template_parameters:
      body["templateParameters"] = template_parameters
    if variables:
      body["variables"] = {k: {"value": v} for k, v in variables.items()}
    return self._request("POST", url, params=params, json=body)

  def get_pipeline_run(self, project: str, pipeline_id: int, run_id: int) -> Dict[str, Any]:
    """Get a specific pipeline run."""
    url = self._build_url(f"pipelines/{pipeline_id}/runs/{run_id}", project)
    params = self._add_params({})
    return self._request("GET", url, params=params)

  def list_pipeline_runs(self, project: str, pipeline_id: int, top: int = None) -> Dict[str, Any]:
    """List runs for a pipeline."""
    url = self._build_url(f"pipelines/{pipeline_id}/runs", project)
    params = self._add_params({}, **{"$top": top})
    return self._request("GET", url, params=params)

  def get_pipeline_run_logs(self, project: str, pipeline_id: int, run_id: int) -> Dict[str, Any]:
    """Get log metadata for a pipeline run."""
    url = self._build_url(f"pipelines/{pipeline_id}/runs/{run_id}/logs", project)
    params = self._add_params({})
    return self._request("GET", url, params=params)

  def get_pipeline_log_content(self, project: str, pipeline_id: int,
                 run_id: int, log_id: int) -> Dict[str, Any]:
    """Get the content of a specific pipeline log."""
    url = self._build_url(f"pipelines/{pipeline_id}/runs/{run_id}/logs/{log_id}", project)
    params = self._add_params({})
    return self._request("GET", url, params=params)

  def cancel_pipeline_run(self, project: str, build_id: int) -> Dict[str, Any]:
    """Cancel a running build/pipeline."""
    url = self._build_url(f"build/builds/{build_id}", project)
    params = self._add_params({})
    return self._request("PATCH", url, params=params, json={"status": "cancelling"})

  def list_builds(self, project: str, definitions: List[int] = None,
          status_filter: str = None, result_filter: str = None,
          branch_name: str = None, top: int = None) -> Dict[str, Any]:
    """List builds with optional filters."""
    url = self._build_url("build/builds", project)
    params = self._add_params({}, **{"$top": top})
    if definitions:
      params["definitions"] = ",".join(map(str, definitions))
    if status_filter:
      params["statusFilter"] = status_filter
    if result_filter:
      params["resultFilter"] = result_filter
    if branch_name:
      params["branchName"] = branch_name
    return self._request("GET", url, params=params)

  def get_build_artifacts(self, project: str, build_id: int) -> Dict[str, Any]:
    """Get artifacts for a build."""
    url = self._build_url(f"build/builds/{build_id}/artifacts", project)
    params = self._add_params({})
    return self._request("GET", url, params=params)

  def download_artifact(self, project: str, build_id: int, artifact_name: str) -> Dict[str, Any]:
    """Download a build artifact as bytes."""
    url = self._build_url(f"build/builds/{build_id}/artifacts", project)
    params = self._add_params({"artifactName": artifact_name})
    try:
      response = self._session.get(url, params=params, stream=True)
      if response.ok:
        return {"success": True, "data": {"content": response.content}}
      else:
        return {
          "success": False,
          "error": {"status_code": response.status_code, "message": response.text}
        }
    except Exception as e:
      return {"success": False, "error": {"message": str(e)}}

  # ===========================================================================
  # PROJECTS AND TEAMS (6 methods)
  # ===========================================================================

  def list_projects(self, top: int = None, skip: int = None) -> Dict[str, Any]:
    """List all projects in the organization."""
    url = f"{self.base_url}/_apis/projects"
    params = self._add_params({}, **{"$top": top, "$skip": skip})
    return self._request("GET", url, params=params)

  def get_project(self, project_id_or_name: str,
          include_capabilities: bool = None) -> Dict[str, Any]:
    """Get a specific project."""
    url = f"{self.base_url}/_apis/projects/{project_id_or_name}"
    params = self._add_params({}, includeCapabilities=include_capabilities)
    return self._request("GET", url, params=params)

  def list_teams(self, project: str, top: int = None) -> Dict[str, Any]:
    """List teams in a project."""
    url = f"{self.base_url}/_apis/projects/{project}/teams"
    params = self._add_params({}, **{"$top": top})
    return self._request("GET", url, params=params)

  def get_team_members(self, project: str, team_id: str, top: int = None) -> Dict[str, Any]:
    """Get members of a team."""
    url = f"{self.base_url}/_apis/projects/{project}/teams/{team_id}/members"
    params = self._add_params({}, **{"$top": top})
    return self._request("GET", url, params=params)

  def list_iterations(self, project: str, team: str, timeframe: str = None) -> Dict[str, Any]:
    """List iterations for a team."""
    url = self._build_url(f"work/teamsettings/iterations", project)
    url = url.replace(f"/{project}/_apis/", f"/{project}/{team}/_apis/")
    params = self._add_params({}, **{"$timeframe": timeframe})
    return self._request("GET", url, params=params)

  def list_areas(self, project: str, depth: int = 10) -> Dict[str, Any]:
    """List area paths for a project."""
    url = self._build_url("wit/classificationnodes/Areas", project)
    params = self._add_params({}, **{"$depth": depth})
    return self._request("GET", url, params=params)
