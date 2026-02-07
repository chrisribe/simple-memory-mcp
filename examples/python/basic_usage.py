"""
Simple Memory - Python Usage Example

This example demonstrates how to use Simple Memory from Python
by spawning the CLI as a subprocess.

For production use, consider:
1. Using the HTTP transport mode (--http flag)
2. Making REST API calls to the HTTP server
3. Or using Python MCP client libraries

Installation:
    npm install -g simple-memory-mcp
    
Or use npx:
    npx simple-memory-mcp <command>
"""

import subprocess
import json
import sys
from typing import List, Dict, Optional, Any


class SimpleMemoryClient:
    """Python wrapper for Simple Memory CLI"""
    
    def __init__(self, db_path: str = "./memory.db", cli_path: str = "simple-memory"):
        """
        Initialize the Simple Memory client
        
        Args:
            db_path: Path to the SQLite database file
            cli_path: Path to the simple-memory CLI (default: "simple-memory")
        """
        self.db_path = db_path
        self.cli_path = cli_path
    
    def _run_command(self, args: List[str]) -> Dict[str, Any]:
        """Run a CLI command and return the result"""
        cmd = [self.cli_path] + args
        
        # Set environment variable for database path
        env = {"MEMORY_DB": self.db_path}
        
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                env={**subprocess.os.environ.copy(), **env}
            )
            
            if result.returncode != 0:
                raise RuntimeError(f"Command failed: {result.stderr}")
            
            # Try to parse JSON output
            try:
                return json.loads(result.stdout)
            except json.JSONDecodeError:
                # Return plain text output
                return {"output": result.stdout.strip()}
                
        except FileNotFoundError:
            raise RuntimeError(
                f"CLI not found at '{self.cli_path}'. "
                "Please install with: npm install -g simple-memory-mcp"
            )
    
    def store(self, content: str, tags: Optional[List[str]] = None) -> str:
        """
        Store a memory with optional tags
        
        Args:
            content: The content to store
            tags: Optional list of tags
            
        Returns:
            MD5 hash of the stored memory
        """
        args = ["store", "--content", content]
        if tags:
            args.extend(["--tags", ",".join(tags)])
        
        result = self._run_command(args)
        return result.get("hash", "")
    
    def search(
        self,
        query: Optional[str] = None,
        tags: Optional[List[str]] = None,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Search for memories
        
        Args:
            query: Optional text query
            tags: Optional list of tags to filter by
            limit: Maximum number of results
            
        Returns:
            List of memory entries
        """
        args = ["search"]
        
        if query:
            args.extend(["--query", query])
        if tags:
            args.extend(["--tags", ",".join(tags)])
        args.extend(["--limit", str(limit)])
        
        result = self._run_command(args)
        return result.get("memories", [])
    
    def get(self, hash: str) -> Optional[Dict[str, Any]]:
        """
        Get a memory by its hash
        
        Args:
            hash: The MD5 hash of the memory
            
        Returns:
            Memory entry or None
        """
        args = ["get", "--hash", hash]
        result = self._run_command(args)
        return result.get("memory")
    
    def update(
        self,
        hash: str,
        content: str,
        tags: Optional[List[str]] = None
    ) -> str:
        """
        Update a memory
        
        Args:
            hash: Hash of the memory to update
            content: New content
            tags: Optional new tags
            
        Returns:
            New hash of the updated memory
        """
        args = ["update", "--hash", hash, "--content", content]
        if tags:
            args.extend(["--tags", ",".join(tags)])
        
        result = self._run_command(args)
        return result.get("newHash", "")
    
    def delete(self, hash: str) -> bool:
        """
        Delete a memory by hash
        
        Args:
            hash: Hash of the memory to delete
            
        Returns:
            True if successful
        """
        args = ["delete", "--hash", hash]
        result = self._run_command(args)
        return result.get("deleted", False)
    
    def delete_by_tag(self, tag: str) -> int:
        """
        Delete all memories with a specific tag
        
        Args:
            tag: The tag to delete by
            
        Returns:
            Number of memories deleted
        """
        args = ["delete", "--tag", tag]
        result = self._run_command(args)
        return result.get("deletedCount", 0)
    
    def stats(self) -> Dict[str, Any]:
        """
        Get database statistics
        
        Returns:
            Statistics dictionary
        """
        args = ["stats"]
        return self._run_command(args)
    
    def related(self, hash: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Get memories related to a specific memory
        
        Args:
            hash: Hash of the memory
            limit: Maximum number of results
            
        Returns:
            List of related memories
        """
        args = ["related", "--hash", hash, "--limit", str(limit)]
        result = self._run_command(args)
        return result.get("memories", [])


def main():
    """Example usage of the Simple Memory Python client"""
    
    print("=== Simple Memory SDK - Python Example ===\n")
    
    # Create a client instance
    client = SimpleMemoryClient("./python-example.db")
    
    # 1. Store some memories
    print("1. Storing memories...")
    hash1 = client.store(
        "Python is a great programming language",
        ["programming", "python"]
    )
    hash2 = client.store(
        "Machine learning with Python is powerful",
        ["python", "ml", "ai"]
    )
    hash3 = client.store(
        "Flask is a micro web framework for Python",
        ["python", "web", "flask"]
    )
    print(f"Stored 3 memories. First hash: {hash1}\n")
    
    # 2. Search for memories
    print("2. Searching for Python memories...")
    results = client.search(tags=["python"], limit=10)
    print(f"Found {len(results)} Python-related memories:")
    for memory in results:
        content = memory.get("content", "")
        tags = memory.get("tags", [])
        print(f"  - {content}")
        print(f"    Tags: {', '.join(tags)}")
    print()
    
    # 3. Full-text search
    print("3. Full-text search for 'machine learning'...")
    ml_results = client.search(query="machine learning", limit=5)
    print(f"Found {len(ml_results)} results:")
    for memory in ml_results:
        print(f"  - {memory.get('content', '')}")
    print()
    
    # 4. Get a specific memory
    print("4. Retrieving memory by hash...")
    memory = client.get(hash1)
    if memory:
        print(f"Content: {memory.get('content', '')}")
        print(f"Tags: {', '.join(memory.get('tags', []))}")
        print(f"Created: {memory.get('createdAt', '')}\n")
    
    # 5. Update a memory
    print("5. Updating a memory...")
    new_hash = client.update(
        hash2,
        "Machine learning with Python and TensorFlow is powerful",
        ["python", "ml", "ai", "tensorflow"]
    )
    print(f"Memory updated. New hash: {new_hash}\n")
    
    # 6. Get statistics
    print("6. Database statistics:")
    stats = client.stats()
    print(f"Total memories: {stats.get('totalMemories', 0)}")
    print(f"Total relationships: {stats.get('totalRelationships', 0)}")
    print(f"Database path: {stats.get('dbPath', '')}\n")
    
    # 7. Clean up - delete test data
    print("7. Cleaning up test data...")
    deleted = client.delete_by_tag("python")
    print(f"Deleted {deleted} Python memories\n")
    
    # Final stats
    print("Final statistics:")
    final_stats = client.stats()
    print(f"Total memories: {final_stats.get('totalMemories', 0)}\n")
    
    print("Done!")


if __name__ == "__main__":
    try:
        main()
    except RuntimeError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
