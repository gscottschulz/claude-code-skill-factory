/**
 * Azure DevOps REST API Client (API Version 7.1)
 *
 * Functional TypeScript client using Node.js native fetch (no external HTTP deps).
 * All methods return { success: true, data: {...} } or { success: false, error: {...} }.
 *
 * Authentication: Personal Access Token (PAT) via env vars or constructor params.
 *
 * Requirements: Node.js 18+ (for native fetch)
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    status_code?: number;
    message: string;
  };
  responseHeaders?: Record<string, string>;
}

export interface ClientConfig {
  organization?: string;
  pat?: string;
  apiVersion?: string;
}

export class AzureDevOpsClient {
  private organization: string;
  private pat: string;
  private apiVersion: string;
  private baseUrl: string;
  private vsspsBaseUrl: string;
  private authHeader: string;

  constructor(config?: ClientConfig) {
    this.organization = config?.organization || process.env.ADO_ORGANIZATION || "";
    this.pat = config?.pat || process.env.ADO_PAT || "";

    if (!this.organization) {
      throw new Error(
        "organization is required. Provide it as a parameter or set ADO_ORGANIZATION env var."
      );
    }
    if (!this.pat) {
      throw new Error(
        "pat is required. Provide it as a parameter or set ADO_PAT env var."
      );
    }

    this.apiVersion = config?.apiVersion || "7.1";
    this.baseUrl = `https://dev.azure.com/${this.organization}`;
    this.vsspsBaseUrl = `https://vssps.dev.azure.com/${this.organization}`;
    this.authHeader = `Basic ${Buffer.from(`:${this.pat}`).toString("base64")}`;
  }

  // ===========================================================================
  // Private helpers
  // ===========================================================================

  private buildUrl(path: string, project?: string): string {
    if (project) {
      return `${this.baseUrl}/${encodeURIComponent(project)}/_apis/${path}`;
    }
    return `${this.baseUrl}/_apis/${path}`;
  }

  private async request<T = any>(
    method: string,
    url: string,
    options?: {
      params?: Record<string, any>;
      body?: any;
      headers?: Record<string, string>;
      apiVersion?: string;
    }
  ): Promise<ApiResponse<T>> {
    try {
      const urlObj = new URL(url);
      const version = options?.apiVersion || this.apiVersion;
      urlObj.searchParams.set("api-version", version);

      if (options?.params) {
        for (const [key, value] of Object.entries(options.params)) {
          if (value !== undefined && value !== null) {
            urlObj.searchParams.set(key, String(value));
          }
        }
      }

      const fetchHeaders: Record<string, string> = {
        Authorization: this.authHeader,
        "Content-Type": "application/json",
        Accept: "application/json",
        ...options?.headers,
      };

      const fetchOptions: RequestInit = { method, headers: fetchHeaders };

      if (options?.body !== undefined) {
        if (options.body instanceof Buffer || options.body instanceof Uint8Array) {
          fetchOptions.body = options.body;
        } else {
          fetchOptions.body = JSON.stringify(options.body);
        }
      }

      const response = await fetch(urlObj.toString(), fetchOptions);

      if (response.ok) {
        const resp: ApiResponse<T> = { success: true };
        const ct = response.headers.get("x-ms-continuationtoken");
        if (ct) {
          resp.responseHeaders = { "x-ms-continuationtoken": ct };
        }
        if (response.status === 204) {
          resp.data = undefined as any;
          return resp;
        }
        const text = await response.text();
        if (!text) {
          resp.data = undefined as any;
          return resp;
        }
        resp.data = JSON.parse(text);
        return resp;
      } else {
        return {
          success: false,
          error: { status_code: response.status, message: await response.text() },
        };
      }
    } catch (e: any) {
      return { success: false, error: { message: e.message } };
    }
  }

  // ===========================================================================
  // WORK ITEMS (12 methods)
  // ===========================================================================

  async getWorkItem(
    project: string,
    workItemId: number,
    expand: string = "All"
  ): Promise<ApiResponse> {
    const url = this.buildUrl(`wit/workitems/${workItemId}`, project);
    return this.request("GET", url, { params: { $expand: expand } });
  }

  async getWorkItems(
    project: string,
    ids: number[],
    fields?: string[]
  ): Promise<ApiResponse> {
    const url = this.buildUrl("wit/workitems", project);
    const params: Record<string, any> = { ids: ids.join(",") };
    if (fields) {
      params.fields = fields.join(",");
    }
    return this.request("GET", url, { params });
  }

  async createWorkItem(
    project: string,
    workItemType: string,
    fields: Record<string, any>
  ): Promise<ApiResponse> {
    const url = this.buildUrl(`wit/workitems/$${workItemType}`, project);
    const operations = Object.entries(fields).map(([k, v]) => ({
      op: "add",
      path: `/fields/${k}`,
      value: v,
    }));
    return this.request("POST", url, {
      body: operations,
      headers: { "Content-Type": "application/json-patch+json" },
    });
  }

  async updateWorkItem(
    project: string,
    workItemId: number,
    updates: Record<string, any>
  ): Promise<ApiResponse> {
    const url = this.buildUrl(`wit/workitems/${workItemId}`, project);
    const operations = Object.entries(updates).map(([k, v]) => ({
      op: "add",
      path: `/fields/${k}`,
      value: v,
    }));
    return this.request("PATCH", url, {
      body: operations,
      headers: { "Content-Type": "application/json-patch+json" },
    });
  }

  async deleteWorkItem(
    project: string,
    workItemId: number,
    permanent: boolean = false
  ): Promise<ApiResponse> {
    const url = this.buildUrl(`wit/workitems/${workItemId}`, project);
    const params: Record<string, any> = {};
    if (permanent) {
      params.destroy = true;
    }
    return this.request("DELETE", url, { params });
  }

  async queryWorkItems(
    project: string,
    wiql: string,
    top?: number
  ): Promise<ApiResponse> {
    const url = this.buildUrl("wit/wiql", project);
    const params: Record<string, any> = {};
    if (top !== undefined) {
      params.$top = top;
    }
    return this.request("POST", url, { body: { query: wiql }, params });
  }

  async getWorkItemComments(
    project: string,
    workItemId: number,
    top?: number
  ): Promise<ApiResponse> {
    const url = this.buildUrl(`wit/workitems/${workItemId}/comments`, project);
    const params: Record<string, any> = {};
    if (top !== undefined) {
      params.$top = top;
    }
    return this.request("GET", url, { params, apiVersion: "7.1-preview.4" });
  }

  async addWorkItemComment(
    project: string,
    workItemId: number,
    text: string
  ): Promise<ApiResponse> {
    const url = this.buildUrl(`wit/workitems/${workItemId}/comments`, project);
    return this.request("POST", url, {
      body: { text },
      apiVersion: "7.1-preview.4",
    });
  }

  async linkWorkItems(
    project: string,
    sourceId: number,
    targetId: number,
    linkType: string,
    comment?: string
  ): Promise<ApiResponse> {
    const url = this.buildUrl(`wit/workitems/${sourceId}`, project);
    const targetUrl = `${this.baseUrl}/${encodeURIComponent(project)}/_apis/wit/workitems/${targetId}`;
    const operation: any = {
      op: "add",
      path: "/relations/-",
      value: { rel: linkType, url: targetUrl },
    };
    if (comment) {
      operation.value.attributes = { comment };
    }
    return this.request("PATCH", url, {
      body: [operation],
      headers: { "Content-Type": "application/json-patch+json" },
    });
  }

  async getWorkItemRevisions(
    project: string,
    workItemId: number,
    top?: number,
    skip?: number
  ): Promise<ApiResponse> {
    const url = this.buildUrl(`wit/workitems/${workItemId}/revisions`, project);
    const params: Record<string, any> = {};
    if (top !== undefined) {
      params.$top = top;
    }
    if (skip !== undefined) {
      params.$skip = skip;
    }
    return this.request("GET", url, { params });
  }

  async uploadAttachment(
    project: string,
    fileName: string,
    content: Buffer
  ): Promise<ApiResponse> {
    const url = this.buildUrl("wit/attachments", project);
    return this.request("POST", url, {
      body: content,
      params: { fileName },
      headers: { "Content-Type": "application/octet-stream" },
    });
  }

  async attachToWorkItem(
    project: string,
    workItemId: number,
    attachmentUrl: string,
    comment?: string
  ): Promise<ApiResponse> {
    const url = this.buildUrl(`wit/workitems/${workItemId}`, project);
    const operation: any = {
      op: "add",
      path: "/relations/-",
      value: { rel: "AttachedFile", url: attachmentUrl },
    };
    if (comment) {
      operation.value.attributes = { comment };
    }
    return this.request("PATCH", url, {
      body: [operation],
      headers: { "Content-Type": "application/json-patch+json" },
    });
  }

  // ===========================================================================
  // GIT REPOSITORIES (14 methods)
  // ===========================================================================

  async listRepositories(project: string): Promise<ApiResponse> {
    const url = this.buildUrl("git/repositories", project);
    return this.request("GET", url);
  }

  async getRepository(
    project: string,
    repositoryIdOrName: string
  ): Promise<ApiResponse> {
    const url = this.buildUrl(
      `git/repositories/${encodeURIComponent(repositoryIdOrName)}`,
      project
    );
    return this.request("GET", url);
  }

  async listPullRequests(
    project: string,
    repositoryId: string,
    status: string = "active",
    top?: number
  ): Promise<ApiResponse> {
    const url = this.buildUrl(
      `git/repositories/${encodeURIComponent(repositoryId)}/pullrequests`,
      project
    );
    const params: Record<string, any> = { "searchCriteria.status": status };
    if (top !== undefined) {
      params.$top = top;
    }
    return this.request("GET", url, { params });
  }

  async getPullRequest(
    project: string,
    repositoryId: string,
    pullRequestId: number
  ): Promise<ApiResponse> {
    const url = this.buildUrl(
      `git/repositories/${encodeURIComponent(repositoryId)}/pullrequests/${pullRequestId}`,
      project
    );
    return this.request("GET", url);
  }

  async createPullRequest(
    project: string,
    repositoryId: string,
    sourceRef: string,
    targetRef: string,
    title: string,
    description?: string,
    reviewers?: string[],
    workItemIds?: number[],
    isDraft: boolean = false
  ): Promise<ApiResponse> {
    const url = this.buildUrl(
      `git/repositories/${encodeURIComponent(repositoryId)}/pullrequests`,
      project
    );
    const body: any = {
      sourceRefName: sourceRef.startsWith("refs/") ? sourceRef : `refs/heads/${sourceRef}`,
      targetRefName: targetRef.startsWith("refs/") ? targetRef : `refs/heads/${targetRef}`,
      title,
      isDraft,
    };
    if (description) {
      body.description = description;
    }
    if (reviewers) {
      body.reviewers = reviewers.map((r) => ({ id: r }));
    }
    if (workItemIds) {
      body.workItemRefs = workItemIds.map((id) => ({ id: String(id) }));
    }
    return this.request("POST", url, { body });
  }

  async updatePullRequest(
    project: string,
    repositoryId: string,
    pullRequestId: number,
    updates: Record<string, any>
  ): Promise<ApiResponse> {
    const url = this.buildUrl(
      `git/repositories/${encodeURIComponent(repositoryId)}/pullrequests/${pullRequestId}`,
      project
    );
    return this.request("PATCH", url, { body: updates });
  }

  async getPullRequestThreads(
    project: string,
    repositoryId: string,
    pullRequestId: number
  ): Promise<ApiResponse> {
    const url = this.buildUrl(
      `git/repositories/${encodeURIComponent(repositoryId)}/pullrequests/${pullRequestId}/threads`,
      project
    );
    return this.request("GET", url);
  }

  async addPullRequestThread(
    project: string,
    repositoryId: string,
    pullRequestId: number,
    content: string,
    status: string = "active",
    filePath?: string,
    line?: number
  ): Promise<ApiResponse> {
    const url = this.buildUrl(
      `git/repositories/${encodeURIComponent(repositoryId)}/pullrequests/${pullRequestId}/threads`,
      project
    );
    const body: any = {
      comments: [{ content, commentType: 1 }],
      status,
    };
    if (filePath) {
      body.threadContext = { filePath };
      if (line) {
        body.threadContext.rightFileStart = { line, offset: 1 };
        body.threadContext.rightFileEnd = { line, offset: 1 };
      }
    }
    return this.request("POST", url, { body });
  }

  async listCommits(
    project: string,
    repositoryId: string,
    branch?: string,
    top?: number
  ): Promise<ApiResponse> {
    const url = this.buildUrl(
      `git/repositories/${encodeURIComponent(repositoryId)}/commits`,
      project
    );
    const params: Record<string, any> = {};
    if (branch) {
      params["searchCriteria.itemVersion.version"] = branch;
    }
    if (top !== undefined) {
      params.$top = top;
    }
    return this.request("GET", url, { params });
  }

  async getCommit(
    project: string,
    repositoryId: string,
    commitId: string,
    changeCount?: number
  ): Promise<ApiResponse> {
    const url = this.buildUrl(
      `git/repositories/${encodeURIComponent(repositoryId)}/commits/${commitId}`,
      project
    );
    const params: Record<string, any> = {};
    if (changeCount !== undefined) {
      params.changeCount = changeCount;
    }
    return this.request("GET", url, { params });
  }

  async listBranches(
    project: string,
    repositoryId: string,
    filterContains?: string
  ): Promise<ApiResponse> {
    const url = this.buildUrl(
      `git/repositories/${encodeURIComponent(repositoryId)}/refs`,
      project
    );
    const params: Record<string, any> = { filter: "heads/" };
    if (filterContains) {
      params.filterContains = filterContains;
    }
    return this.request("GET", url, { params });
  }

  async listTags(
    project: string,
    repositoryId: string
  ): Promise<ApiResponse> {
    const url = this.buildUrl(
      `git/repositories/${encodeURIComponent(repositoryId)}/refs`,
      project
    );
    return this.request("GET", url, { params: { filter: "tags/" } });
  }

  async createBranch(
    project: string,
    repositoryId: string,
    branchName: string,
    sourceCommitId: string
  ): Promise<ApiResponse> {
    const url = this.buildUrl(
      `git/repositories/${encodeURIComponent(repositoryId)}/refs`,
      project
    );
    const refName = branchName.startsWith("refs/")
      ? branchName
      : `refs/heads/${branchName}`;
    return this.request("POST", url, {
      body: [
        {
          name: refName,
          oldObjectId: "0000000000000000000000000000000000000000",
          newObjectId: sourceCommitId,
        },
      ],
    });
  }

  async deleteBranch(
    project: string,
    repositoryId: string,
    branchName: string,
    currentCommitId: string
  ): Promise<ApiResponse> {
    const url = this.buildUrl(
      `git/repositories/${encodeURIComponent(repositoryId)}/refs`,
      project
    );
    const refName = branchName.startsWith("refs/")
      ? branchName
      : `refs/heads/${branchName}`;
    return this.request("POST", url, {
      body: [
        {
          name: refName,
          oldObjectId: currentCommitId,
          newObjectId: "0000000000000000000000000000000000000000",
        },
      ],
    });
  }

  // ===========================================================================
  // PIPELINES (11 methods)
  // ===========================================================================

  async listPipelines(project: string, top?: number): Promise<ApiResponse> {
    const url = this.buildUrl("pipelines", project);
    const params: Record<string, any> = {};
    if (top !== undefined) {
      params.$top = top;
    }
    return this.request("GET", url, { params });
  }

  async getPipeline(
    project: string,
    pipelineId: number
  ): Promise<ApiResponse> {
    const url = this.buildUrl(`pipelines/${pipelineId}`, project);
    return this.request("GET", url);
  }

  async runPipeline(
    project: string,
    pipelineId: number,
    refName?: string,
    templateParameters?: Record<string, string>,
    variables?: Record<string, string>
  ): Promise<ApiResponse> {
    const url = this.buildUrl(`pipelines/${pipelineId}/runs`, project);
    const body: any = {};
    if (refName) {
      body.resources = { repositories: { self: { refName } } };
    }
    if (templateParameters) {
      body.templateParameters = templateParameters;
    }
    if (variables) {
      body.variables = Object.fromEntries(
        Object.entries(variables).map(([k, v]) => [k, { value: v }])
      );
    }
    return this.request("POST", url, { body });
  }

  async getPipelineRun(
    project: string,
    pipelineId: number,
    runId: number
  ): Promise<ApiResponse> {
    const url = this.buildUrl(`pipelines/${pipelineId}/runs/${runId}`, project);
    return this.request("GET", url);
  }

  async listPipelineRuns(
    project: string,
    pipelineId: number,
    top?: number
  ): Promise<ApiResponse> {
    const url = this.buildUrl(`pipelines/${pipelineId}/runs`, project);
    const params: Record<string, any> = {};
    if (top !== undefined) {
      params.$top = top;
    }
    return this.request("GET", url, { params });
  }

  async getPipelineRunLogs(
    project: string,
    pipelineId: number,
    runId: number
  ): Promise<ApiResponse> {
    const url = this.buildUrl(
      `pipelines/${pipelineId}/runs/${runId}/logs`,
      project
    );
    return this.request("GET", url);
  }

  async getPipelineLogContent(
    project: string,
    pipelineId: number,
    runId: number,
    logId: number
  ): Promise<ApiResponse> {
    const url = this.buildUrl(
      `pipelines/${pipelineId}/runs/${runId}/logs/${logId}`,
      project
    );
    return this.request("GET", url);
  }

  async cancelPipelineRun(
    project: string,
    buildId: number
  ): Promise<ApiResponse> {
    const url = this.buildUrl(`build/builds/${buildId}`, project);
    return this.request("PATCH", url, { body: { status: "cancelling" } });
  }

  async listBuilds(
    project: string,
    options?: {
      definitions?: number[];
      statusFilter?: string;
      resultFilter?: string;
      branchName?: string;
      top?: number;
    }
  ): Promise<ApiResponse> {
    const url = this.buildUrl("build/builds", project);
    const params: Record<string, any> = {};
    if (options?.definitions) {
      params.definitions = options.definitions.join(",");
    }
    if (options?.statusFilter) {
      params.statusFilter = options.statusFilter;
    }
    if (options?.resultFilter) {
      params.resultFilter = options.resultFilter;
    }
    if (options?.branchName) {
      params.branchName = options.branchName;
    }
    if (options?.top !== undefined) {
      params.$top = options.top;
    }
    return this.request("GET", url, { params });
  }

  async getBuildArtifacts(
    project: string,
    buildId: number
  ): Promise<ApiResponse> {
    const url = this.buildUrl(`build/builds/${buildId}/artifacts`, project);
    return this.request("GET", url);
  }

  async downloadArtifact(
    project: string,
    buildId: number,
    artifactName: string
  ): Promise<ApiResponse> {
    const url = this.buildUrl(`build/builds/${buildId}/artifacts`, project);
    return this.request("GET", url, { params: { artifactName } });
  }

  // ===========================================================================
  // PROJECTS AND TEAMS (6 methods)
  // ===========================================================================

  async listProjects(top?: number, skip?: number): Promise<ApiResponse> {
    const url = `${this.baseUrl}/_apis/projects`;
    const params: Record<string, any> = {};
    if (top !== undefined) {
      params.$top = top;
    }
    if (skip !== undefined) {
      params.$skip = skip;
    }
    return this.request("GET", url, { params });
  }

  async getProject(
    projectIdOrName: string,
    includeCapabilities?: boolean
  ): Promise<ApiResponse> {
    const url = `${this.baseUrl}/_apis/projects/${encodeURIComponent(projectIdOrName)}`;
    const params: Record<string, any> = {};
    if (includeCapabilities !== undefined) {
      params.includeCapabilities = includeCapabilities;
    }
    return this.request("GET", url, { params });
  }

  async listTeams(project: string, top?: number): Promise<ApiResponse> {
    const url = `${this.baseUrl}/_apis/projects/${encodeURIComponent(project)}/teams`;
    const params: Record<string, any> = {};
    if (top !== undefined) {
      params.$top = top;
    }
    return this.request("GET", url, { params });
  }

  async getTeamMembers(
    project: string,
    teamId: string,
    top?: number
  ): Promise<ApiResponse> {
    const url = `${this.baseUrl}/_apis/projects/${encodeURIComponent(project)}/teams/${encodeURIComponent(teamId)}/members`;
    const params: Record<string, any> = {};
    if (top !== undefined) {
      params.$top = top;
    }
    return this.request("GET", url, { params });
  }

  async listIterations(
    project: string,
    team: string,
    timeframe?: string
  ): Promise<ApiResponse> {
    const url = `${this.baseUrl}/${encodeURIComponent(project)}/${encodeURIComponent(team)}/_apis/work/teamsettings/iterations`;
    const params: Record<string, any> = {};
    if (timeframe) {
      params.$timeframe = timeframe;
    }
    return this.request("GET", url, { params });
  }

  async listAreas(project: string, depth: number = 10): Promise<ApiResponse> {
    const url = this.buildUrl("wit/classificationnodes/Areas", project);
    return this.request("GET", url, { params: { $depth: depth } });
  }

  // ===========================================================================
  // PROJECT RESOLUTION (auto-resolve project from PR or work item)
  // ===========================================================================

  /**
   * Resolve project name and repository ID from a pull request ID.
   * Uses the org-level PR search endpoint to find the PR across all projects.
   */
  async resolveProjectFromPullRequest(
    pullRequestId: number
  ): Promise<ApiResponse<{ project: string; repositoryId: string; repositoryName: string }>> {
    const url = `${this.baseUrl}/_apis/git/pullrequests`;
    const result = await this.request<{ value: any[] }>("GET", url, {
      params: { "searchCriteria.pullRequestId": pullRequestId },
    });
    if (!result.success || !result.data?.value?.length) {
      return {
        success: false,
        error: { message: `Pull request ${pullRequestId} not found in any project.` },
      };
    }
    // Filter to exact match (API may return nearby IDs)
    const matches = result.data.value.filter((p: any) => p.pullRequestId === pullRequestId);
    if (!matches.length) {
      return {
        success: false,
        error: { message: `Pull request ${pullRequestId} not found in any project.` },
      };
    }
    if (matches.length > 1) {
      const repos = matches.map((p: any) => `${p.repository.project.name}/${p.repository.name}`);
      return {
        success: false,
        error: {
          message: `Pull request ${pullRequestId} exists in multiple repositories: ${repos.join(", ")}. Please specify project and repo explicitly.`,
        },
      };
    }
    const pr = matches[0];
    return {
      success: true,
      data: {
        project: pr.repository.project.name,
        repositoryId: pr.repository.id,
        repositoryName: pr.repository.name,
      },
    };
  }

  /**
   * Resolve project name from a work item ID.
   * Uses the org-level work item endpoint (no project scope required).
   */
  async resolveProjectFromWorkItem(
    workItemId: number
  ): Promise<ApiResponse<{ project: string }>> {
    const url = `${this.baseUrl}/_apis/wit/workitems/${workItemId}`;
    const result = await this.request<any>("GET", url, {
      params: { $expand: "None", fields: "System.TeamProject" },
    });
    if (!result.success || !result.data) {
      return {
        success: false,
        error: { message: `Work item ${workItemId} not found.` },
      };
    }
    const project = result.data.fields?.["System.TeamProject"];
    if (!project) {
      return {
        success: false,
        error: { message: `Could not determine project for work item ${workItemId}.` },
      };
    }
    return { success: true, data: { project } };
  }

  // ===========================================================================
  // GRAPH / IDENTITY (3 methods)
  // ===========================================================================

  /**
   * List graph users with optional filtering and pagination.
   * Uses vssps.dev.azure.com (Graph API).
   */
  async listGraphUsers(
    subjectTypes?: string[],
    continuationToken?: string
  ): Promise<ApiResponse> {
    const url = `${this.vsspsBaseUrl}/_apis/graph/users`;
    const params: Record<string, any> = {};
    if (subjectTypes?.length) {
      params.subjectTypes = subjectTypes.join(",");
    }
    if (continuationToken) {
      params.continuationToken = continuationToken;
    }
    return this.request("GET", url, { params, apiVersion: "7.1-preview.1" });
  }

  /**
   * Resolve a graph descriptor to a storage key (identity GUID).
   * The storage key is the ID used for PR reviewer assignment and user mentions.
   */
  async getGraphStorageKey(
    descriptor: string
  ): Promise<ApiResponse<{ value: string }>> {
    const url = `${this.vsspsBaseUrl}/_apis/graph/storagekeys/${descriptor}`;
    return this.request("GET", url, { apiVersion: "7.1" });
  }

  /**
   * Look up a user's identity by email address.
   * Returns the storage key (identity GUID) suitable for PR reviewer assignment
   * and user mentions in comments, plus the graph descriptor and display name.
   *
   * Paginates through Graph Users API, matching on mailAddress or principalName.
   */
  async getUserByEmail(
    email: string
  ): Promise<ApiResponse<{
    id: string;
    descriptor: string;
    displayName: string;
    email: string;
    originId: string;
  }>> {
    const emailLower = email.toLowerCase();
    let continuationToken: string | undefined;

    do {
      const result = await this.listGraphUsers(
        ["aad", "msa"],
        continuationToken
      );
      if (!result.success || !result.data?.value) {
        return {
          success: false,
          error: result.error || { message: "Failed to list graph users." },
        };
      }

      const match = result.data.value.find(
        (u: any) =>
          u.mailAddress?.toLowerCase() === emailLower ||
          u.principalName?.toLowerCase() === emailLower
      );

      if (match) {
        const storageResult = await this.getGraphStorageKey(match.descriptor);
        const id = storageResult.success && storageResult.data?.value
          ? storageResult.data.value
          : match.originId;

        return {
          success: true,
          data: {
            id,
            descriptor: match.descriptor,
            displayName: match.displayName,
            email: match.mailAddress || match.principalName,
            originId: match.originId,
          },
        };
      }

      continuationToken = result.responseHeaders?.["x-ms-continuationtoken"];
    } while (continuationToken);

    return {
      success: false,
      error: { message: `No user found with email: ${email}` },
    };
  }
}
