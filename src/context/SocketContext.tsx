import React, { createContext, useContext } from 'react';
import { supabase } from '@/lib/supabase';
import { SupabaseClient } from '@supabase/supabase-js';

interface SocketContextType {
    supabase: SupabaseClient;
}

const SocketContext = createContext<SocketContextType>({ supabase });

export const useSocket = () => {
    return useContext(SocketContext);
};

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <SocketContext.Provider value={{ supabase }}>
            {children}
        </SocketContext.Provider>
    );
};
