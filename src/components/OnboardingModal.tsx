'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabase/client';
import { MEMBERS } from '@/lib/constants';

type ActiveSession = {
  member_name: string;
  device_id: string;
  last_seen: string;
};

export default function OnboardingModal() {
  const { currentUser, deviceId, setCurrentUser } = useUser();
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Busca sessões ativas (últimas 24h)
    const fetchSessions = async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('active_sessions')
        .select('*')
        .gt('last_seen', yesterday);
      
      if (data && !error) {
        setActiveSessions(data);
      }
      setLoading(false);
    };

    fetchSessions();

    // Inscrição no realtime para mudanças nas sessões
    const channel = supabase.channel('active_sessions_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'active_sessions' }, payload => {
        fetchSessions(); // refetch on change
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (currentUser !== null) return null; // Se já escolheu, esconde modal
  if (loading) return <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center text-white">Carregando...</div>;

  const handleSelectUser = (name: string) => {
    const session = activeSessions.find(s => s.member_name === name);
    
    // Se está em uso por outro deviceId, pede confirmação
    if (session && session.device_id !== deviceId) {
      const confirmMsg = `${name} já está ativo em outro dispositivo. Continuar mesmo assim?`;
      if (!window.confirm(confirmMsg)) return;
    }

    setCurrentUser(name);
  };

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4">
      <div className="bg-neutral-900 rounded-2xl w-full max-w-sm p-6 text-center shadow-2xl border border-neutral-800">
        <h1 className="text-2xl font-bold text-white mb-2">Quem é você?</h1>
        <p className="text-neutral-400 text-sm mb-6">Selecione seu nome para entrar no bolão.</p>
        
        <div className="flex flex-col gap-3">
          {MEMBERS.map(name => {
            const isUsedByOther = activeSessions.some(s => s.member_name === name && s.device_id !== deviceId);
            
            return (
              <button
                key={name}
                onClick={() => handleSelectUser(name)}
                className={`p-4 rounded-xl font-medium transition-all ${
                  isUsedByOther 
                ? 'bg-neutral-800 text-neutral-400 border border-neutral-700' 
                  : 'bg-blue-600 hover:bg-blue-500 text-white'
                }`}
              >
                {name} {isUsedByOther && <span className="text-xs ml-2 bg-neutral-700 px-2 py-1 rounded-full">em uso</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
