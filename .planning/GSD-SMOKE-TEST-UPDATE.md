# GSD Update: Mandatory Smoke Testing

## Problem Statement

The current GSD workflow allows phases to be marked "complete" without any actual verification that the code works. This leads to:
- Broken code being marked as complete
- TypeScript compilation errors being ignored
- Missing database tables not being detected
- Frontend/backend integration never being tested
- False sense of progress

## Real Example: Phase 3 Failure

Phase 3 was marked "complete" with:
- **87 TypeScript compilation errors** in backend
- **Missing database tables** (migrations failed)
- **Frontend crashing** with Immer Map/Set errors
- **No backend API running** (ERR_CONNECTION_REFUSED)
- **Zero integration testing**

## Solution: Mandatory Smoke Test

Add a smoke test requirement to the GSD verification workflow that MUST pass before any phase can be marked complete.

### New Verification Requirements

Before marking a phase complete, the verifier MUST:

1. **Run the smoke test script** (`bash .planning/smoke-test.sh`)
2. **Ensure all tests pass** (exit code 0)
3. **Include test results in VERIFICATION.md**

### Smoke Test Components

The smoke test verifies:
1. ✅ **Code Compilation** - All TypeScript compiles without errors
2. ✅ **Database Connectivity** - PostgreSQL and Neo4j are accessible
3. ✅ **Backend Service** - API starts and responds to health checks
4. ✅ **Frontend Service** - UI loads without errors
5. ✅ **Integration** - Frontend can call backend APIs
6. ✅ **Basic Functionality** - At least one user flow works

### Implementation in GSD Verifier

Update the `gsd-verifier` agent prompt to include:

```
CRITICAL REQUIREMENT - SMOKE TEST:
Before marking any phase as complete, you MUST:
1. Run: bash .planning/smoke-test.sh
2. Verify it exits with code 0 (all tests pass)
3. If it fails, the phase CANNOT be marked complete
4. Include the test results in your VERIFICATION.md report

A phase is NOT complete if:
- Code doesn't compile
- Services won't start
- APIs return errors
- Frontend shows errors in console
```

### Benefits

1. **Catches broken code early** - Can't proceed with non-working code
2. **Ensures integration** - Frontend and backend must work together
3. **Validates database state** - Migrations must be run
4. **Prevents false progress** - Only working code counts as complete
5. **Creates accountability** - Clear pass/fail criteria

### Rollout Plan

1. Add smoke-test.sh to all GSD projects
2. Update gsd-verifier agent prompt
3. Update phase completion criteria documentation
4. Make smoke test results visible in progress tracking

## Conclusion

No more marking broken code as "complete". Every phase must have working, testable functionality that passes the smoke test.

This change would have prevented Phase 3 from being falsely marked complete and saved hours of debugging.