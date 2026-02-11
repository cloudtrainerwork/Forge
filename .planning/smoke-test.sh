#!/bin/bash
#
# FORGE Project Smoke Test
# This script MUST pass before any phase can be marked complete
#

set -e

echo "🔥 FORGE SMOKE TEST STARTING..."
echo "================================"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results
TESTS_PASSED=0
TESTS_FAILED=0

# Function to run a test
run_test() {
    local test_name="$1"
    local test_command="$2"

    echo -n "Testing: $test_name... "
    if eval "$test_command" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC}"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}✗${NC}"
        ((TESTS_FAILED++))
        return 1
    fi
}

# Function to check if a service is running
check_service() {
    local service_name="$1"
    local port="$2"
    local endpoint="${3:-/}"

    echo -n "Checking $service_name on port $port... "
    if curl -s -o /dev/null -w "%{http_code}" "http://localhost:$port$endpoint" | grep -q "200\|404"; then
        echo -e "${GREEN}✓${NC}"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}✗ (not responding)${NC}"
        ((TESTS_FAILED++))
        return 1
    fi
}

echo ""
echo "1️⃣  BACKEND COMPILATION"
echo "------------------------"
run_test "TypeScript compilation" "npm run build"

echo ""
echo "2️⃣  DATABASE CONNECTIVITY"
echo "-------------------------"
run_test "PostgreSQL connection" "PGPASSWORD=password psql -h localhost -U appuser -d appdb -c 'SELECT 1'"
run_test "Neo4j connection" "curl -s http://localhost:7474"

echo ""
echo "3️⃣  BACKEND SERVICE"
echo "-------------------"
# Try to start backend in background
echo "Starting backend service..."
PORT=3001 npm start > backend.log 2>&1 &
BACKEND_PID=$!
sleep 5

# Check if backend is running
if check_service "Backend API" 3001 "/api/v1/health"; then
    BACKEND_RUNNING=true
else
    BACKEND_RUNNING=false
    echo -e "${YELLOW}Backend failed to start. Check backend.log for details.${NC}"
fi

echo ""
echo "4️⃣  FRONTEND SERVICE"
echo "--------------------"
# Check if frontend is already running or try to start it
if ! curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200\|404"; then
    echo "Starting frontend service..."
    cd frontend && npm run dev > ../frontend.log 2>&1 &
    FRONTEND_PID=$!
    cd ..
    sleep 5
fi

check_service "Frontend" 3000 "/"

echo ""
echo "5️⃣  INTEGRATION TESTS"
echo "---------------------"
if [ "$BACKEND_RUNNING" = true ]; then
    run_test "API endpoint /api/v1/work-items" "curl -s http://localhost:3001/api/v1/work-items"
    run_test "API endpoint /api/v1/readiness/config" "curl -s http://localhost:3001/api/v1/readiness/config"
else
    echo -e "${YELLOW}Skipping integration tests - backend not running${NC}"
    ((TESTS_FAILED+=2))
fi

echo ""
echo "6️⃣  FRONTEND FUNCTIONALITY"
echo "--------------------------"
run_test "Frontend loads without errors" "curl -s http://localhost:3000 | grep -q 'FORGE'"

# Clean up background processes
if [ ! -z "$BACKEND_PID" ]; then
    kill $BACKEND_PID 2>/dev/null || true
fi
if [ ! -z "$FRONTEND_PID" ]; then
    kill $FRONTEND_PID 2>/dev/null || true
fi

echo ""
echo "================================"
echo "SMOKE TEST RESULTS"
echo "================================"
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"

if [ $TESTS_FAILED -gt 0 ]; then
    echo ""
    echo -e "${RED}❌ SMOKE TEST FAILED${NC}"
    echo "Phase cannot be marked complete until all tests pass."
    echo ""
    echo "Debug hints:"
    echo "- Check backend.log for backend errors"
    echo "- Check frontend.log for frontend errors"
    echo "- Run 'npm run build' to see TypeScript errors"
    echo "- Run 'docker ps' to verify databases are running"
    exit 1
else
    echo ""
    echo -e "${GREEN}✅ SMOKE TEST PASSED${NC}"
    echo "Phase is ready for completion."
    exit 0
fi