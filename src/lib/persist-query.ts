import type { QueryClient } from "@tanstack/react-query";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { persistQueryClient } from "@tanstack/react-query-persist-client";

let started = false;

/** Keeps the last loaded study data in localStorage so screens still render offline. */
export function startQueryPersistence(queryClient: QueryClient) {
  if (started || typeof window === "undefined") return;
  started = true;
  persistQueryClient({
    queryClient,
    persister: createSyncStoragePersister({ storage: window.localStorage, key: "studyflow.cache.v1" }),
    maxAge: 1000 * 60 * 60 * 24 * 7,
  });
}
