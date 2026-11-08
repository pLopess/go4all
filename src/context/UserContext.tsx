'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

type UserContextType = {
  currentUser: string | null;
  deviceId: string | null;
  setCurrentUser: (name: string) => void;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUserState] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);

  useEffect(() => {
    // Inicializar o device_id ou recuperar do localStorage
    let storedDeviceId = localStorage.getItem('deviceId');
    if (!storedDeviceId) {
      storedDeviceId = crypto.randomUUID();
      localStorage.setItem('deviceId', storedDeviceId);
    }
    setDeviceId(storedDeviceId);

    // Recuperar usuário atual
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      setCurrentUserState(storedUser);
    }
  }, []);

  const setCurrentUser = async (name: string) => {
    if (!deviceId) return;
    
    setCurrentUserState(name);
    localStorage.setItem('currentUser', name);

    // Fazer upsert na tabela active_sessions
    await supabase.from('active_sessions').upsert({
      member_name: name,
      device_id: deviceId,
      last_seen: new Date().toISOString()
    });
  };

  // Atualizar o last_seen a cada 10 minutos
  useEffect(() => {
    if (!currentUser || !deviceId) return;

    const updateLastSeen = async () => {
      await supabase.from('active_sessions').upsert({
        member_name: currentUser,
        device_id: deviceId,
        last_seen: new Date().toISOString()
      });
    };

    const interval = setInterval(updateLastSeen, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [currentUser, deviceId]);

  return (
    <UserContext.Provider value={{ currentUser, deviceId, setCurrentUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
