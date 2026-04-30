"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useRouter, usePathname } from 'next/navigation';

type SessionContextType = {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
};

const SessionContext = createContext<SessionContextType>({
  session: null,
  user: null,
  isLoading: true,
});

export const SessionContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
      
      if (session) {
        document.cookie = `sb-access-token=${session.access_token}; path=/admin; max-age=86400; SameSite=Lax; Secure`;
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);

      if (session) {
        document.cookie = `sb-access-token=${session.access_token}; path=/admin; max-age=86400; SameSite=Lax; Secure`;
      } else {
        document.cookie = `sb-access-token=; path=/admin; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      }

      if (event === 'SIGNED_IN' && pathname.startsWith('/admin/login')) {
        router.push('/admin');
      } else if (event === 'SIGNED_OUT' && pathname.startsWith('/admin')) {
        router.push('/admin/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [router, pathname]);

  return (
    <SessionContext.Provider value={{ session, user, isLoading }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => useContext(SessionContext);