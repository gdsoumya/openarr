import { sendLocalNotification } from './notificationService';

export function checkForCompletedDownloads(
  currentQueue: Array<{ id: number; title: string }>,
  previousQueue: Array<{ id: number; title: string }>,
): void {
  const currentIds = new Set(currentQueue.map(q => q.id));

  // Items that were in previous queue but not in current = completed or removed
  for (const prev of previousQueue) {
    if (!currentIds.has(prev.id)) {
      sendLocalNotification('Download Complete', prev.title);
    }
  }
}
