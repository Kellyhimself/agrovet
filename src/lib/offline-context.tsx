'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { syncService } from './sync';
import { offlineStorage } from './offline';

interface OfflineContextType {
  isOnline: boolean;
  pendingSyncs: number;
}

const OfflineContext = createContext<OfflineContextType>({
  isOnline: true,
  pendingSyncs: 0,
});

export const useOffline = () => useContext(OfflineContext);

export const OfflineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(() => {
    // Initialize with navigator.onLine in client-side
    if (typeof window !== 'undefined') {
      return navigator.onLine;
    }
    return true;
  });
  const [pendingSyncs, setPendingSyncs] = useState(0);

  // Memoize the checkPendingSyncs function to prevent unnecessary re-renders
  const checkPendingSyncs = useCallback(async () => {
    try {
      const unsyncedSales = await offlineStorage.getUnsyncedSales();
      const unsyncedProducts = await offlineStorage.getUnsyncedProducts();
      const total = unsyncedSales.length + unsyncedProducts.length;
      setPendingSyncs(total);
    } catch {
      // Silent error handling
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
    };
    
    const handleOffline = () => {
      setIsOnline(false);
    };

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Start periodic sync only if online
    if (isOnline) {
      syncService.startPeriodicSync();
    }

    // Check immediately and then every 5 seconds
    checkPendingSyncs();
    const interval = setInterval(checkPendingSyncs, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [isOnline, checkPendingSyncs]);

  return (
    <OfflineContext.Provider value={{ isOnline, pendingSyncs }}>
      {children}
    </OfflineContext.Provider>
  );
}; 