# Time Range Search Feature Examples

This document demonstrates the new time range search functionality added to Simple Memory MCP Server.

## Overview

The time range search feature allows filtering memories by their creation date using three approaches:

1. **Relative Time (`daysAgo`)**: Search memories from the last N days
2. **Absolute Date (`startDate`/`endDate`)**: Search memories within specific date ranges
3. **Combined Filters**: Use time ranges with content/tag searches

## CLI Examples

### Search memories from last 7 days
```bash
simple-memory search --days-ago 7
```

### Search memories from last 30 days
```bash
simple-memory search --days-ago 30
```

### Search memories created today (daysAgo 0)
```bash
simple-memory search --days-ago 0
```

### Search with specific date range
```bash
simple-memory search --start-date "2025-01-01" --end-date "2025-01-31"
```

### Search with start date only (from date onwards)
```bash
simple-memory search --start-date "2025-01-01"
```

### Search with end date only (up to date)
```bash
simple-memory search --end-date "2025-01-31"
```

### Combine content search with time filter
```bash
simple-memory search --query "project" --days-ago 7
```

### Combine tag search with time filter
```bash
simple-memory search --tags "bug,fix" --days-ago 3
```

### Combine query, tags, and time filter
```bash
simple-memory search --query "database" --tags "project" --days-ago 14
```

## MCP Tool Examples

### Search memories from last week (daysAgo)
```json
{
  "query": "project update",
  "daysAgo": 7
}
```

### Search memories from specific month (date range)
```json
{
  "startDate": "2025-01-01",
  "endDate": "2025-01-31"
}
```

### Recent bugs (tags + time)
```json
{
  "tags": ["bug"],
  "daysAgo": 3,
  "limit": 10
}
```

### Search with all filters
```json
{
  "query": "authentication",
  "tags": ["security"],
  "daysAgo": 30,
  "limit": 5
}
```

## Use Cases

### 1. Find Recent Work
Search for memories created in the last few days to recall recent work:
```bash
simple-memory search --days-ago 3
```

### 2. Monthly Review
Review all memories from a specific month:
```bash
simple-memory search --start-date "2025-01-01" --end-date "2025-01-31"
```

### 3. Recent Project Updates
Find project-related memories from the last week:
```bash
simple-memory search --tags "project" --days-ago 7
```

### 4. Bug Triage
Find recent bug-related memories:
```bash
simple-memory search --tags "bug" --days-ago 14
```

### 5. Quarterly Planning
Search for planning notes from Q1:
```bash
simple-memory search --query "planning" --start-date "2025-01-01" --end-date "2025-03-31"
```

## Implementation Details

### Date Parsing
- **YYYY-MM-DD format**: Parsed as start/end of day
- **ISO 8601 format**: Full timestamp support (e.g., `2025-01-15T14:30:00.000Z`)
- Invalid dates are ignored (search proceeds without time filter)

### Relative Time Calculation
- `daysAgo: 0` = Today (from 00:00:00)
- `daysAgo: 1` = Last 24 hours (from 00:00:00 yesterday)
- `daysAgo: 7` = Last week (from 00:00:00 seven days ago)

### Priority Order
If both `daysAgo` and `startDate` are provided:
- `startDate` takes precedence over `daysAgo`
- Both can be used together (startDate sets minimum, endDate sets maximum)

### Performance Notes
- Time filtering is applied in JavaScript after database fetch
- Database fetches 2x the limit to allow for filtering
- Performance impact is minimal for typical result sets (<100 items)
- Indexed queries (FTS, tags) remain fast with time filtering

## Testing

The feature includes comprehensive tests in `src/tests/time-range-test.ts`:
- ✓ Search last 2 days
- ✓ Search last 10 days  
- ✓ Search last 40 days
- ✓ Search specific date range
- ✓ Search with query + time range
- ✓ Search with tags + time range

All tests pass successfully with the expected results.
