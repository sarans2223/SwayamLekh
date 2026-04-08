// Empty shell for offline sync fallback
export function useOfflineSync() {
  const syncing = false;
  const pendingCount = 0;

  const syncNow = () => {
    if (import.meta.env.DEV) console.log("Mock sync now");
  };

  return { syncing, pendingCount, syncNow };
}