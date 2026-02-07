"""
Simple Memory - Python HTTP Client Example

This example demonstrates how to use Simple Memory from Python
via HTTP transport using the MCP protocol.

Usage:
    1. Start the server: simple-memory --http --port 3000
    2. Run this script: python advanced_http_client.py
    
Requirements:
    pip install requests
"""

import requests
import json
from typing import List, Dict, Optional, Any


class SimpleMemoryHTTPClient:
    """Python HTTP client for Simple Memory MCP server"""
    
    def __init__(self, base_url: str = "http://localhost:3000"):
        """
        Initialize the HTTP client
        
        Args:
            base_url: Base URL of the Simple Memory HTTP server
        """
        self.base_url = base_url.rstrip("/")
        self.tools_url = f"{self.base_url}/tools"
    
    def _call_tool(self, tool_name: str, arguments: Dict[str, Any]) -> Any:
        """
        Call an MCP tool via HTTP
        
        Args:
            tool_name: Name of the tool to call
            arguments: Tool arguments
            
        Returns:
            Tool response
        """
        payload = {
            "name": tool_name,
            "arguments": arguments
        }
        
        try:
            response = requests.post(
                self.tools_url,
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            response.raise_for_status()
            
            result = response.json()
            return result.get("content", [{}])[0].get("text", "")
            
        except requests.RequestException as e:
            raise RuntimeError(f"HTTP request failed: {e}")
    
    def _execute_graphql(self, query: str, variables: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Execute a GraphQL query via the memory-graphql tool
        
        Args:
            query: GraphQL query string
            variables: Optional query variables
            
        Returns:
            Query result
        """
        args = {"query": query}
        if variables:
            args["variables"] = json.dumps(variables)
        
        result_text = self._call_tool("memory-graphql", args)
        
        try:
            return json.loads(result_text)
        except json.JSONDecodeError:
            return {"data": None, "errors": [{"message": result_text}]}
    
    def store(self, content: str, tags: Optional[List[str]] = None) -> str:
        """Store a memory with optional tags"""
        query = """
        mutation Store($content: String!, $tags: [String!]) {
          store(content: $content, tags: $tags) {
            hash
          }
        }
        """
        variables = {"content": content, "tags": tags or []}
        result = self._execute_graphql(query, variables)
        
        if result.get("errors"):
            raise RuntimeError(f"GraphQL error: {result['errors']}")
        
        return result["data"]["store"]["hash"]
    
    def search(
        self,
        query: Optional[str] = None,
        tags: Optional[List[str]] = None,
        limit: int = 10,
        summary_only: bool = False
    ) -> List[Dict[str, Any]]:
        """Search for memories"""
        graphql_query = """
        query Search($query: String, $tags: [String!], $limit: Int, $summaryOnly: Boolean) {
          memories(query: $query, tags: $tags, limit: $limit, summaryOnly: $summaryOnly) {
            ... on Memory {
              hash
              content
              tags
              createdAt
              updatedAt
            }
            ... on MemorySummary {
              hash
              title
              preview
              tags
              createdAt
            }
          }
        }
        """
        variables = {
            "query": query,
            "tags": tags,
            "limit": limit,
            "summaryOnly": summary_only
        }
        result = self._execute_graphql(graphql_query, variables)
        
        if result.get("errors"):
            raise RuntimeError(f"GraphQL error: {result['errors']}")
        
        return result["data"]["memories"]
    
    def get(self, hash: str) -> Optional[Dict[str, Any]]:
        """Get a memory by hash"""
        query = """
        query GetMemory($hash: String!) {
          memory(hash: $hash) {
            hash
            content
            tags
            createdAt
            updatedAt
          }
        }
        """
        result = self._execute_graphql(query, {"hash": hash})
        
        if result.get("errors"):
            return None
        
        return result["data"]["memory"]
    
    def update(self, hash: str, content: str, tags: Optional[List[str]] = None) -> str:
        """Update a memory"""
        query = """
        mutation Update($hash: String!, $content: String!, $tags: [String!]) {
          update(hash: $hash, content: $content, tags: $tags) {
            hash
          }
        }
        """
        variables = {"hash": hash, "content": content, "tags": tags}
        result = self._execute_graphql(query, variables)
        
        if result.get("errors"):
            raise RuntimeError(f"GraphQL error: {result['errors']}")
        
        return result["data"]["update"]["hash"]
    
    def delete(self, hash: Optional[str] = None, tag: Optional[str] = None) -> Dict[str, Any]:
        """Delete memories by hash or tag"""
        query = """
        mutation Delete($hash: String, $tag: String) {
          delete(hash: $hash, tag: $tag) {
            deleted
            deletedCount
          }
        }
        """
        variables = {"hash": hash, "tag": tag}
        result = self._execute_graphql(query, variables)
        
        if result.get("errors"):
            raise RuntimeError(f"GraphQL error: {result['errors']}")
        
        return result["data"]["delete"]
    
    def related(self, hash: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Get related memories"""
        query = """
        query Related($hash: String!, $limit: Int) {
          related(hash: $hash, limit: $limit) {
            hash
            content
            tags
            createdAt
          }
        }
        """
        result = self._execute_graphql(query, {"hash": hash, "limit": limit})
        
        if result.get("errors"):
            raise RuntimeError(f"GraphQL error: {result['errors']}")
        
        return result["data"]["related"]
    
    def stats(self) -> Dict[str, Any]:
        """Get database statistics"""
        query = """
        query {
          stats {
            version
            totalMemories
            totalRelationships
            dbSize
            dbPath
            schemaVersion
          }
        }
        """
        result = self._execute_graphql(query)
        
        if result.get("errors"):
            raise RuntimeError(f"GraphQL error: {result['errors']}")
        
        return result["data"]["stats"]


def main():
    """Example usage of the HTTP client"""
    
    print("=== Simple Memory HTTP Client - Python Example ===")
    print("Note: Make sure the server is running with: simple-memory --http\n")
    
    try:
        # Create HTTP client
        client = SimpleMemoryHTTPClient("http://localhost:3000")
        
        # 1. Store memories
        print("1. Storing memories via HTTP...")
        hash1 = client.store(
            "GraphQL makes API design elegant",
            ["programming", "graphql", "api"]
        )
        hash2 = client.store(
            "Python HTTP clients are easy to use",
            ["python", "http", "api"]
        )
        print(f"Stored 2 memories. First hash: {hash1}\n")
        
        # 2. Search with summary mode (token-efficient)
        print("2. Searching with summary mode...")
        summaries = client.search(tags=["api"], limit=5, summary_only=True)
        print(f"Found {len(summaries)} API-related memories (summaries):")
        for item in summaries:
            print(f"  - {item.get('title', 'N/A')}")
            print(f"    Preview: {item.get('preview', 'N/A')}")
        print()
        
        # 3. Full content search
        print("3. Full-text search...")
        results = client.search(query="Python", limit=5)
        print(f"Found {len(results)} results:")
        for memory in results:
            print(f"  - {memory.get('content', '')}")
        print()
        
        # 4. Get specific memory
        print("4. Getting memory by hash...")
        memory = client.get(hash1)
        if memory:
            print(f"Content: {memory.get('content', '')}")
            print(f"Tags: {', '.join(memory.get('tags', []))}\n")
        
        # 5. Statistics
        print("5. Database statistics:")
        stats = client.stats()
        print(f"Total memories: {stats.get('totalMemories', 0)}")
        print(f"Total relationships: {stats.get('totalRelationships', 0)}")
        print(f"Version: {stats.get('version', 'N/A')}\n")
        
        # 6. Clean up
        print("6. Cleaning up test data...")
        delete_result = client.delete(tag="api")
        print(f"Deleted {delete_result.get('deletedCount', 0)} memories\n")
        
        print("Done!")
        
    except RuntimeError as e:
        print(f"Error: {e}")
        print("\nMake sure the Simple Memory server is running:")
        print("  simple-memory --http --port 3000")
        return 1
    
    return 0


if __name__ == "__main__":
    import sys
    sys.exit(main())
