import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@pcubed_profile';

export interface ProfileData {
  fullName: string;
  email: string;
  company?: string;
  jobTitle?: string;
  industry?: string;
  function?: string;
  seniority?: string;
  padelLevel?: string;
  interests?: string[];
  linkedinUrl?: string;
  registeredAt: string;
}

interface ProfileContextType {
  isRegistered: boolean;
  profile: ProfileData | null;
  isLoading: boolean;
  saveProfile: (data: ProfileData) => Promise<void>;
  clearProfile: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType>({
  isRegistered: false,
  profile: null,
  isLoading: true,
  saveProfile: async () => {},
  clearProfile: async () => {},
});

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setProfile(JSON.parse(raw));
      })
      .finally(() => setIsLoading(false));
  }, []);

  const saveProfile = useCallback(async (data: ProfileData) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setProfile(data);
  }, []);

  const clearProfile = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setProfile(null);
  }, []);

  return (
    <ProfileContext.Provider value={{ isRegistered: !!profile, profile, isLoading, saveProfile, clearProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

export const useProfile = () => useContext(ProfileContext);
