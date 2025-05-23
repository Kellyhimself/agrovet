'use client'

import React from 'react';
import { useOffline } from '@/lib/offline-context';

export const OfflineStatus: React.FC = () => {
  const { isOnline, pendingSyncs } = useOffline();

  if (isOnline && pendingSyncs === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!isOnline && (
        <div className="bg-yellow-500 text-white px-4 py-2 rounded-lg shadow-lg mb-2">
          You&apos;re currently offline. Changes will be synced when you&apos;re back online.
        </div>
      )}
      {pendingSyncs > 0 && (
        <div className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg">
          {pendingSyncs} {pendingSyncs === 1 ? 'change' : 'changes'} pending sync
        </div>
      )}
    </div>
  );
}; 