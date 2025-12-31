# Firestore Indexes Required for M-Lingua

## Conversations Index

The conversations query requires a composite index because it uses:
- `where('participants', 'array-contains', userId)` 
- `orderBy('updatedAt', 'desc')`

### Direct Link to Create Index

**Click this link to create the index automatically:**
https://console.firebase.google.com/v1/r/project/m-lingua-22553/firestore/indexes?create_composite=ClRwcm9qZWN0cy9tLWxpbmd1YS0yMjU1My9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvY29udmVyc2F0aW9ucy9pbmRleGVzL18QARoQCgxwYXJ0aWNpcGFudHMYARoNCgl1cGRhdGVkQXQQAhoMCghfX25hbWVfXxAC

### Manual Method (Step-by-Step)

1. **Go to Firebase Console:**
   - Visit: https://console.firebase.google.com/
   - Select your project: `m-lingua-22553`

2. **Navigate to Indexes:**
   - Click on "Firestore Database" in the left sidebar
   - Click on the "Indexes" tab at the top

3. **Create New Index:**
   - Click the "Create Index" button
   - Configure the index:
     - **Collection ID:** `conversations`
     - **Query scope:** Collection
     - **Fields to index:**
       - Field 1:
         - Field path: `participants`
         - Order: `Ascending` (or `Arrays` if available)
       - Field 2:
         - Field path: `updatedAt`
         - Order: `Descending`
   - Click "Create"

4. **Wait for Index to Build:**
   - The index will show as "Building" initially
   - It typically takes 1-5 minutes to complete
   - Once it shows "Enabled", the error will be resolved

### Index Details

**Collection:** `conversations`
**Fields:**
1. `participants` (Array-contains)
2. `updatedAt` (Descending)

**Status:** The index will take a few minutes to build. You'll see a status indicator in Firebase Console.

### Alternative: Temporary Workaround

If you need to test immediately, you can temporarily modify the query to not use `orderBy`, but this will affect the sorting of conversations:

```typescript
// Temporary workaround (not recommended for production)
const q = query(
  conversationsRef,
  where('participants', 'array-contains', userId)
  // Remove orderBy temporarily
);
```

Then sort client-side:
```typescript
conversations.sort((a, b) => {
  const aTime = a.updatedAt?.toMillis() || 0;
  const bTime = b.updatedAt?.toMillis() || 0;
  return bTime - aTime; // Descending
});
```

**Note:** The proper solution is to create the index as described above.

