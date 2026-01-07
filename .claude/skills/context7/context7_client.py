"""
Context7 API Client Module.

Provides functions to search for libraries and retrieve documentation
from the Context7 API. Replaces the Context7 MCP server with direct
REST API integration.

Environment Variables:
    CONTEXT7_API_KEY: Your Context7 API key (required)
"""

import os
import time
import json
from typing import Dict, List, Any, Optional
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, quote


class Context7Client:
    """Client for interacting with the Context7 API."""

    BASE_URL = "https://context7.com/api/v2"

    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize the Context7 client.

        Args:
            api_key: Context7 API key. If not provided, reads from
                     CONTEXT7_API_KEY environment variable.

        Raises:
            ValueError: If no API key is provided or found in environment.
        """
        self.api_key = api_key or os.environ.get("CONTEXT7_API_KEY")
        if not self.api_key:
            raise ValueError(
                "Context7 API key required. Set CONTEXT7_API_KEY environment "
                "variable or pass api_key parameter."
            )

    def _make_request(
        self,
        endpoint: str,
        params: Optional[Dict[str, Any]] = None,
        max_retries: int = 3,
        expect_json: bool = True
    ) -> Any:
        """
        Make an authenticated request to the Context7 API.

        Args:
            endpoint: API endpoint path (e.g., "/docs/code/vercel/next.js")
            params: Optional query parameters
            max_retries: Maximum retry attempts for rate limiting
            expect_json: If True, parse response as JSON; if False, return text

        Returns:
            JSON response as dictionary, or text string if expect_json=False

        Raises:
            HTTPError: For non-retryable HTTP errors
            URLError: For network errors
            ValueError: For JSON parsing errors
        """
        url = f"{self.BASE_URL}{endpoint}"
        if params:
            filtered_params = {k: v for k, v in params.items() if v is not None}
            if filtered_params:
                url = f"{url}?{urlencode(filtered_params)}"

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Accept": "application/json" if expect_json else "text/plain"
        }

        for attempt in range(max_retries):
            try:
                request = Request(url, headers=headers)
                with urlopen(request, timeout=30) as response:
                    content = response.read().decode("utf-8")
                    if expect_json:
                        return json.loads(content)
                    return content
            except HTTPError as e:
                if e.code == 429:
                    # Rate limited - exponential backoff
                    wait_time = 2 ** attempt
                    time.sleep(wait_time)
                    continue
                elif e.code == 401:
                    raise ValueError("Invalid API key. Check your CONTEXT7_API_KEY.")
                elif e.code == 404:
                    raise ValueError(f"Library not found: {endpoint}")
                else:
                    raise
            except URLError as e:
                raise ValueError(f"Network error: {e.reason}")

        raise ValueError("Max retries exceeded due to rate limiting")

    def search_library(self, library_name: str) -> Dict[str, Any]:
        """
        Search for a library and get its Context7-compatible ID.

        Args:
            library_name: Library name to search for (e.g., "next.js", "react")

        Returns:
            Dictionary with search results including library IDs under "results" key

        Example:
            >>> client = Context7Client()
            >>> result = client.search_library("next.js")
            >>> library_id = result["results"][0]["id"]  # "/vercel/next.js"
        """
        response = self._make_request(
            "/search",
            params={"q": library_name}
        )
        # Normalize response - API returns "results", we also support "libraries" for backwards compat
        if "results" in response and "libraries" not in response:
            response["libraries"] = response["results"]
        return response

    def get_library_docs(
        self,
        library_id: str,
        topic: Optional[str] = None,
        mode: str = "code",
        page: int = 1,
        version: Optional[str] = None
    ) -> str:
        """
        Retrieve documentation for a library.

        Args:
            library_id: Context7 library ID (e.g., "vercel/next.js", "vuejs/core")
            topic: Optional topic to focus on (e.g., "routing", "hooks", "composition api")
            mode: "code" for API references/examples, "info" for conceptual guides
            page: Page number for pagination (1-10)
            version: Optional specific version (e.g., "v15.1.8")

        Returns:
            Markdown-formatted documentation string

        Example:
            >>> client = Context7Client()
            >>> docs = client.get_library_docs(
            ...     "vercel/next.js",
            ...     topic="routing",
            ...     mode="code"
            ... )
            >>> print(docs)
        """
        # Normalize library_id - remove leading slash for URL construction
        lib_path = library_id.lstrip("/")

        # Build endpoint based on mode and version
        if mode == "info":
            endpoint = f"/docs/info/{lib_path}"
        else:
            endpoint = f"/docs/code/{lib_path}"

        if version:
            endpoint = f"{endpoint}/{version}"

        params = {
            "topic": topic,
            "page": page
        }

        # Docs endpoint returns markdown text, not JSON
        return self._make_request(endpoint, params, expect_json=False)

    def get_code_snippets(
        self,
        library_id: str,
        topic: Optional[str] = None,
        page: int = 1,
        version: Optional[str] = None
    ) -> str:
        """
        Get code examples and API snippets for a library.

        Convenience method that calls get_library_docs with mode="code".

        Args:
            library_id: Context7 library ID (e.g., "vercel/next.js")
            topic: Optional topic filter (e.g., "routing", "hooks")
            page: Page number (1-10)
            version: Optional version tag

        Returns:
            Markdown-formatted code examples
        """
        return self.get_library_docs(
            library_id,
            topic=topic,
            mode="code",
            page=page,
            version=version
        )

    def get_info_docs(
        self,
        library_id: str,
        topic: Optional[str] = None,
        page: int = 1,
        version: Optional[str] = None
    ) -> str:
        """
        Get conceptual documentation and guides for a library.

        Convenience method that calls get_library_docs with mode="info".

        Args:
            library_id: Context7 library ID (e.g., "vercel/next.js")
            topic: Optional topic filter
            page: Page number (1-10)
            version: Optional version tag

        Returns:
            Markdown-formatted documentation
        """
        return self.get_library_docs(
            library_id,
            topic=topic,
            mode="info",
            page=page,
            version=version
        )

    def get_all_pages(
        self,
        library_id: str,
        topic: Optional[str] = None,
        mode: str = "code",
        max_pages: int = 10,
        version: Optional[str] = None
    ) -> str:
        """
        Retrieve all pages of documentation for a topic.

        Args:
            library_id: Context7 library ID
            topic: Optional topic filter
            mode: "code" or "info"
            max_pages: Maximum pages to fetch (default 10)
            version: Optional version tag

        Returns:
            Combined markdown documentation from all pages
        """
        all_content = []
        page = 1

        while page <= max_pages:
            content = self.get_library_docs(
                library_id,
                topic=topic,
                mode=mode,
                page=page,
                version=version
            )

            if not content or not content.strip():
                break

            all_content.append(content)
            page += 1

        return "\n\n".join(all_content)


def search_library(library_name: str) -> Dict[str, Any]:
    """
    Search for a library by name.

    Standalone function for quick searches.

    Args:
        library_name: Library name to search for

    Returns:
        Search results with library IDs
    """
    client = Context7Client()
    return client.search_library(library_name)


def get_docs(
    library_id: str,
    topic: Optional[str] = None,
    mode: str = "code",
    page: int = 1
) -> str:
    """
    Get documentation for a library.

    Standalone function for quick documentation retrieval.

    Args:
        library_id: Context7 library ID (e.g., "vercel/next.js", "vuejs/core")
        topic: Optional topic filter (e.g., "routing", "composition api")
        mode: "code" for API references, "info" for conceptual guides
        page: Page number (1-10)

    Returns:
        Markdown-formatted documentation string
    """
    client = Context7Client()
    return client.get_library_docs(library_id, topic=topic, mode=mode, page=page)


if __name__ == "__main__":
    # Example usage
    import sys

    if len(sys.argv) < 2:
        print("Usage: python context7_client.py <library_id> [topic]")
        print("Example: python context7_client.py vercel/next.js routing")
        print("Example: python context7_client.py vuejs/core composition api")
        print("\nCommon library IDs:")
        print("  vercel/next.js    - Next.js framework")
        print("  vuejs/core        - Vue.js 3")
        print("  facebook/react    - React")
        print("  prisma/prisma     - Prisma ORM")
        print("  supabase/supabase - Supabase")
        sys.exit(1)

    library_id = sys.argv[1]
    topic = " ".join(sys.argv[2:]) if len(sys.argv) > 2 else None

    try:
        client = Context7Client()

        # Get documentation directly
        print(f"Fetching docs for: {library_id}")
        if topic:
            print(f"Topic: {topic}")
        print("-" * 50)

        docs = client.get_library_docs(library_id, topic=topic, mode="code")

        if docs:
            # Show preview (first 2000 chars)
            print(docs[:2000])
            if len(docs) > 2000:
                print(f"\n... ({len(docs) - 2000} more characters)")
        else:
            print("No documentation found")

    except ValueError as e:
        print(f"Error: {e}")
        sys.exit(1)
