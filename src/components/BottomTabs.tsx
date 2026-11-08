'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calendar, CheckCircle2, Wallet } from 'lucide-react';
// import { useEffect, useState } from 'react';
// import { supabase } from '@/lib/supabase/client';

export default function BottomTabs() {
  const pathname = usePathname();
  // const [pendingVotes, setPendingVotes] = useState(false);

  // TODO: Add realtime logic to check for pending votes for the current user
  
  const tabs = [
    { name: 'Jogos', href: '/jogos', icon: Calendar },
    { name: 'Votar', href: '/votar', icon: CheckCircle2, badge: false },
    { name: 'Banca', href: '/banca', icon: Wallet },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 pb-6 flex justify-center z-50 pointer-events-none">
      <div className="bg-neutral-900/85 backdrop-blur-xl border border-neutral-800/60 rounded-full flex gap-1 p-1.5 shadow-2xl pointer-events-auto w-full max-w-sm">
        {tabs.map((tab) => {
          const isActive = pathname.startsWith(tab.href);
          const Icon = tab.icon;
          
          return (
            <Link 
              key={tab.name} 
              href={tab.href}
              className={`relative flex flex-col items-center justify-center w-full py-2 space-y-1 transition-colors ${isActive ? 'text-blue-500' : 'text-neutral-500 hover:text-neutral-400'}`}
            >
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{tab.name}</span>
              
              {tab.badge && (
                <span className="absolute top-2 right-1/4 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-neutral-900"></span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
