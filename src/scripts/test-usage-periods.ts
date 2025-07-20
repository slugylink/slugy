import { 
  calculateUsagePeriod, 
  isUsagePeriodExpired, 
  getRemainingDays,
  formatUsagePeriod,
  getUsagePeriodStatus 
} from "@/lib/usage-period";

function testUsagePeriods() {
  console.log("=== Testing Usage Period Logic ===\n");

  const now = new Date('2024-01-15T10:00:00Z');
  console.log(`Current time: ${now.toISOString()}\n`);

  // Test 1: New workspace (no current period)
  console.log("Test 1: New workspace");
  const newWorkspace = calculateUsagePeriod(null, now);
  console.log(`Period: ${formatUsagePeriod(newWorkspace.periodStart, newWorkspace.periodEnd)}`);
  console.log(`Status: ${getUsagePeriodStatus(newWorkspace.periodEnd, now).status}\n`);

  // Test 2: Existing workspace with active period
  console.log("Test 2: Existing workspace with active period");
  const activePeriodEnd = new Date('2024-02-15T23:59:59Z');
  const activeWorkspace = calculateUsagePeriod(activePeriodEnd, now);
  console.log(`Current period ends: ${activePeriodEnd.toISOString()}`);
  console.log(`Next period: ${formatUsagePeriod(activeWorkspace.periodStart, activeWorkspace.periodEnd)}`);
  console.log(`Status: ${getUsagePeriodStatus(activePeriodEnd, now).status}\n`);

  // Test 3: Existing workspace with expired period
  console.log("Test 3: Existing workspace with expired period");
  const expiredPeriodEnd = new Date('2024-01-10T23:59:59Z');
  const expiredWorkspace = calculateUsagePeriod(expiredPeriodEnd, now);
  console.log(`Expired period ends: ${expiredPeriodEnd.toISOString()}`);
  console.log(`Next period: ${formatUsagePeriod(expiredWorkspace.periodStart, expiredWorkspace.periodEnd)}`);
  console.log(`Status: ${getUsagePeriodStatus(expiredPeriodEnd, now).status}\n`);

  // Test 4: Multiple users with different creation dates
  console.log("Test 4: Multiple users scenario");
  const user1Created = new Date('2024-01-01T00:00:00Z');
  const user2Created = new Date('2024-01-10T00:00:00Z');
  const user3Created = new Date('2024-01-20T00:00:00Z');

  const user1Period = calculateUsagePeriod(null, user1Created);
  const user2Period = calculateUsagePeriod(null, user2Created);
  const user3Period = calculateUsagePeriod(null, user3Created);

  console.log(`User 1 (created ${user1Created.toISOString()}):`);
  console.log(`  Period: ${formatUsagePeriod(user1Period.periodStart, user1Period.periodEnd)}`);
  console.log(`  Status: ${getUsagePeriodStatus(user1Period.periodEnd, now).status}`);

  console.log(`User 2 (created ${user2Created.toISOString()}):`);
  console.log(`  Period: ${formatUsagePeriod(user2Period.periodStart, user2Period.periodEnd)}`);
  console.log(`  Status: ${getUsagePeriodStatus(user2Period.periodEnd, now).status}`);

  console.log(`User 3 (created ${user3Created.toISOString()}):`);
  console.log(`  Period: ${formatUsagePeriod(user3Period.periodStart, user3Period.periodEnd)}`);
  console.log(`  Status: ${getUsagePeriodStatus(user3Period.periodEnd, now).status}\n`);

  // Test 5: Daily cron check simulation
  console.log("Test 5: Daily cron check simulation");
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  console.log(`Tomorrow: ${tomorrow.toISOString()}`);
  console.log(`User 1 status tomorrow: ${getUsagePeriodStatus(user1Period.periodEnd, tomorrow).status}`);
  console.log(`User 2 status tomorrow: ${getUsagePeriodStatus(user2Period.periodEnd, tomorrow).status}`);
  console.log(`User 3 status tomorrow: ${getUsagePeriodStatus(user3Period.periodEnd, tomorrow).status}`);

  console.log("\n=== Test Complete ===");
}

testUsagePeriods(); 