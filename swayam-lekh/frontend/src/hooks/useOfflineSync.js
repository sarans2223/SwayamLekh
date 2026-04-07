// Empty shell for offline sync fallback
export function useOfflineSync() {
  const syncing = false;
  const pendingCount = 0;

  const syncNow = () => {
    console.log("Mock sync now");
  };

  return { syncing, pendingCount, syncNow };
}