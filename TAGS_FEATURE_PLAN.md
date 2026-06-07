# Tags Feature Plan

## Overview
Add optional tagging system to Stories and AltitudeInfo with tag filtering on the frontend and admin management on the admin site.

## Feature Requirements

### Core Constraints
- **Maximum tags in system**: 20 total unique tags
- **Tag name length**: Minimum 3 characters, Maximum 100 characters
- **Tag uniqueness**: No duplicate tag names (case-insensitive)
- **Tags per item**: Multiple tags allowed (0 or more)
- **Filter logic**: OR-based (show item if ANY enabled tag matches, not ALL)

### Data Model

#### Prisma Schema Changes
```prisma
model Tag {
  id        String   @id @default(cuid())
  name      String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  stories        Story[]
  altitudeInfos  AltitudeInfo[]

  @@index([name])
}

// Updated Story model
model Story {
  // ... existing fields ...
  tags   Tag[]
  // ... existing relations ...
}

// Updated AltitudeInfo model
model AltitudeInfo {
  // ... existing fields ...
  tags   Tag[]
  // ... existing relations ...
}
```

#### New Database Relations
- `Story` ↔ `Tag` (many-to-many)
- `AltitudeInfo` ↔ `Tag` (many-to-many)

### Phase 1: Database & Domain Logic

#### 1.1 Prisma Migration
- [ ] Create migration for Tag model
- [ ] Create many-to-many junction tables for Story-Tag and AltitudeInfo-Tag
- [ ] Add indices for efficient tag lookups
- [ ] Database: `20260607_add_tags_feature`

#### 1.2 Domain Types
**File**: `app/features/tags/domain/tags.ts`
- [ ] Create `Tag` type
- [ ] Create `TagValidator` functions:
  - `validateTagName(name: string): { valid: boolean; error?: string }`
    - Check length (3-100 characters)
    - Check for duplicates/collisions
  - `validateTagCount(tags: Tag[]): { valid: boolean; error?: string }`
    - Max 20 tags
  - `normalizeTagName(name: string): string` (trim, lowercase)
- [ ] Create filter logic:
  - `filterStoriesByTags(stories: Story[], enabledTagIds: string[]): Story[]`
    - OR-based filtering: include if ANY tag is enabled
  - `filterAltitudeInfoByTags(items: AltitudeInfo[], enabledTagIds: string[]): AltitudeInfo[]`

#### 1.3 Tests
**File**: `app/features/tags/domain/tags.jest.test.ts`
- [ ] Test tag name validation (min/max length)
- [ ] Test tag count validation (max 20)
- [ ] Test OR-based filtering logic
- [ ] Test edge cases (no tags, all tags disabled, etc.)

### Phase 2: Admin UI - Tag Management

#### 2.1 Tag Manager Components
**Directory**: `app/features/tags/admin/`

**File**: `TagSelector.tsx`
- [ ] Input field that searches tags after 3 characters
- [ ] Dropdown showing matching tags
- [ ] Button to add selected tag to the item
- [ ] Display list of selected tags with remove buttons
- [ ] Validation feedback

**File**: `TagInput.tsx`
- [ ] Searchable input with autocomplete
- [ ] Debounced search (300ms)
- [ ] Hit enter to add new tag (if valid)
- [ ] Show validation errors inline

#### 2.2 Admin Routes Updates

**File**: `app/routes/admin.$journeyId.stories.$storyId.tsx`
- [ ] Import TagSelector component
- [ ] Add tag field to form
- [ ] Update form action to handle tags:
  ```
  const tags = formData.getAll("tag-id") // array of tag IDs
  ```
- [ ] Save tags relation in database

**File**: `app/routes/admin.$journeyId.altitude-info.$altitudeInfoId.tsx`
- [ ] Import TagSelector component
- [ ] Add tag field to form
- [ ] Update form action to handle tags
- [ ] Save tags relation in database

**File**: `app/routes/admin.tags.tsx` (NEW)
- [ ] List all tags in the system
- [ ] Show count of items using each tag
- [ ] Create new tag form
- [ ] Delete tag (with warning about dependent items)
- [ ] Edit tag name (if not used by multiple items)
- [ ] Search/filter tags

#### 2.3 API Endpoints
**File**: `app/server/api/tags.ts` (NEW)
- [ ] `GET /api/tags/search?q=searchTerm`
  - Return tags matching query (case-insensitive)
  - Return empty array if query < 3 characters
  - Max 10 results
- [ ] `POST /api/tags`
  - Create new tag with validation
  - Return `{ id, name }` or error
- [ ] `GET /api/tags`
  - Return all tags with usage count
- [ ] `DELETE /api/tags/:id`
  - Delete tag if not in use
  - Return error if in use

### Phase 3: Frontend UI - Tag Filtering

#### 3.1 Tag Filter Components
**Directory**: `app/shared/components/tags/`

**File**: `TagFilterModal.tsx`
- [ ] Modal showing all available tags
- [ ] Checkbox list for each tag
- [ ] Show count of stories/altitude info per tag
- [ ] "Select All" / "Deselect All" buttons
- [ ] Apply button
- [ ] Cancel button (revert changes)

**File**: `TagFilterButton.tsx`
- [ ] Button with icon (similar to "Recent Stories" style)
- [ ] Badge showing active tag filters count
- [ ] Open TagFilterModal on click
- [ ] Visual indicator if filters are active

#### 3.2 Frontend Routes Updates

**File**: `app/routes/journey.$id.tsx`
- [ ] Add TagFilterButton to UI
- [ ] Track selected tags in URL state: `?tags=tag1,tag2,tag3`
- [ ] Apply tag filter to stories:
  ```typescript
  const filteredStories = filterStoriesByTags(stories, selectedTagIds)
  ```
- [ ] Apply tag filter to altitude info:
  ```typescript
  const filteredAltitudeInfo = filterAltitudeInfoByTags(altitudeInfo, selectedTagIds)
  ```
- [ ] Persist filter in localStorage/session

**File**: `app/routes/journey._index.tsx`
- [ ] Honor tag filters when displaying recent stories
- [ ] Show "No stories match selected filters" message if applicable

### Phase 4: Import & Validation Schemas

#### 4.1 Story Import Schema Update
**File**: `public/admin-import/story.schema.json`
- [ ] Add `tags` field:
  ```json
  {
    "tags": {
      "type": "array",
      "items": { "type": "string" },
      "minItems": 0,
      "maxItems": 20,
      "description": "Optional tags (3-100 chars each, max 20 unique tags)"
    }
  }
  ```

#### 4.2 AltitudeInfo Import Schema Update
**File**: `public/admin-import/altitude-info.schema.json`
- [ ] Add `tags` field (same as story)

#### 4.3 Validation Logic Update
**File**: `app/shared/validation/storySchemas.ts`
- [ ] Update `StoryImportSchema` to include tags validation
- [ ] Update `AltitudeInfoImportSchema` to include tags validation

#### 4.4 Import Template Update
**File**: `public/admin-import/journey-import.template.json`
- [ ] Add example tags to story examples
- [ ] Add example tags to altitude info examples

### Phase 5: AI Prompt Updates

#### 5.1 AI Prompt Template Update
**File**: `public/admin-import/ai-prompt.md`
- [ ] Add instructions for tag suggestions:
  ```markdown
  - Suggest relevant tags (3-100 character names)
  - Maximum 20 unique tags per journey
  - Use tags like: "history", "biology", "geography", "culture", etc.
  - Apply same tags to related stories and altitude info
  - Tags should help users filter by topic
  ```
- [ ] Add example output with tags
- [ ] Update schema references

### Phase 6: Testing Strategy

#### 6.1 Unit Tests
- [ ] Tag validation functions
- [ ] Tag filtering logic (OR-based)
- [ ] Tag count limits
- [ ] Tag name constraints

#### 6.2 Integration Tests
- [ ] Create story with tags
- [ ] Update story tags
- [ ] Delete tag and cascade handling
- [ ] Filter stories by tags
- [ ] Filter altitude info by tags

#### 6.3 E2E Tests
- [ ] Admin: Create and manage tags
- [ ] Admin: Add tags to stories
- [ ] Admin: Add tags to altitude info
- [ ] Frontend: Filter by tags
- [ ] Frontend: Tag filter persistence (URL state)
- [ ] Frontend: No results when filters too strict

### Phase 7: Migration & Rollout

#### 7.1 Backwards Compatibility
- [ ] All tags fields are optional
- [ ] Existing stories/altitude info work without tags
- [ ] No breaking changes to existing data

#### 7.2 Data Migration
- [ ] Run Prisma migration
- [ ] Validate all existing records still accessible
- [ ] No data loss

## Implementation Timeline

| Phase | Component | Priority | Est. Hours |
|-------|-----------|----------|------------|
| 1 | Database & Domain | High | 4-6 |
| 2 | Admin UI | High | 8-12 |
| 3 | Frontend UI | High | 6-8 |
| 4 | Import Schemas | Medium | 2-3 |
| 5 | AI Prompt | Medium | 1-2 |
| 6 | Testing | High | 6-8 |
| 7 | Rollout | High | 2-4 |
| **Total** | | | **29-43 hours** |

## File Structure After Implementation

```
app/
├── features/
│   └── tags/
│       ├── admin/
│       │   ├── TagSelector.tsx
│       │   └── TagInput.tsx
│       ├── domain/
│       │   ├── tags.ts
│       │   └── tags.jest.test.ts
├── shared/
│   ├── components/
│   │   └── tags/
│       ├── TagFilterModal.tsx
│       └── TagFilterButton.tsx
│   └── validation/
│       └── (updated storySchemas.ts)
├── routes/
│   ├── admin.tags.tsx (new)
│   ├── admin.$journeyId.stories.$storyId.tsx (updated)
│   ├── admin.$journeyId.altitude-info.$altitudeInfoId.tsx (updated)
│   └── journey.$id.tsx (updated)
├── server/
│   └── api/
│       └── tags.ts (new)
└── generated/
    └── prisma/
        └── (auto-generated types)

prisma/
├── schema.prisma (updated)
└── migrations/
    └── 20260607_add_tags_feature/ (new)

public/admin-import/
├── story.schema.json (updated)
├── altitude-info.schema.json (updated)
├── journey-import.template.json (updated)
└── ai-prompt.md (updated)
```

## Key Decisions

### 1. OR-based Filtering
- **Decision**: Stories/altitude info are shown if ANY selected tag matches
- **Reason**: More intuitive UX - users expect to see content if "any interest matches"
- **Alternative**: AND-based would be too restrictive

### 2. Case-Insensitive Tags
- **Decision**: Tag names normalized to lowercase
- **Reason**: Prevents duplicate tags with different casing
- **Alternative**: Could allow case-sensitive, but more complex validation

### 3. Tag Limit (20)
- **Decision**: Maximum 20 unique tags per journey
- **Reason**: Prevents tag explosion, keeps filtering manageable
- **Alternative**: Could be configurable, but 20 is reasonable default

### 4. URL State for Filters
- **Decision**: Persist selected tags in URL query params
- **Reason**: Allows sharing filtered views, browser back/forward
- **Alternative**: localStorage alone doesn't support sharing

### 5. Debounced Search
- **Decision**: 300ms debounce on tag search input
- **Reason**: Reduces unnecessary API calls during typing
- **Alternative**: No debounce would hit server too often

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Tag explosion (too many tags) | UX confusion | Hard limit of 20 tags, admin review |
| Slow filtering with many tags | Performance | Index tags table, optimize queries |
| Tag name collisions | Data integrity | Unique constraint at DB level |
| Breaking changes | Compatibility | All fields optional, gradual rollout |
| Import schema changes | Data loss | Backward compatible schema, validation |

## Success Criteria

- ✅ Users can create and manage up to 20 tags
- ✅ Tag search works with 3+ character matching
- ✅ Stories and altitude info can have multiple tags
- ✅ Frontend filtering works with OR logic
- ✅ Filter state persists in URL
- ✅ All existing data remains accessible
- ✅ No performance degradation
- ✅ All tests pass (unit, integration, e2e)
