import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AppContextType {
  apiBaseUrl: string;
  setApiBaseUrl: (url: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [apiBaseUrl, setApiBaseUrl] = useState(
    import.meta.env.VITE_API_BASE || 'http://localhost:3001/api'
  );

  const value = {
    apiBaseUrl,
    setApiBaseUrl,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
