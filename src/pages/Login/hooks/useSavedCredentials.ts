import { useState, useEffect } from 'react';
import { SavedCredential } from '../types';

const STORAGE_KEY = 'wfe_saved_credentials';

export function useSavedCredentials() {
    const [savedCredentials, setSavedCredentials] = useState<SavedCredential[]>([]);
    const [showSavedAccounts, setShowSavedAccounts] = useState(false);
    const [loadingCredentialEmail, setLoadingCredentialEmail] = useState<string | null>(null);

    const getSavedCredentials = (): SavedCredential[] => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return [];
            const creds = JSON.parse(raw);
            return creds.map((c: any) => {
                // remove password if it exists from older versions
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { password, ...rest } = c;
                return rest;
            });
        } catch {
            return [];
        }
    };

    useEffect(() => {
        const creds = getSavedCredentials();
        setSavedCredentials(creds);
        setShowSavedAccounts(creds.length > 0);
    }, []);

    const saveCredential = (email: string) => {
        const existing = getSavedCredentials().filter(c => c.email !== email);
        existing.unshift({ email, savedAt: new Date().toISOString() });
        // Máximo de 5 contas salvas
        const sliced = existing.slice(0, 5);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sliced));
        setSavedCredentials(sliced);
    };

    const removeCredential = (email: string) => {
        const existing = getSavedCredentials().filter(c => c.email !== email);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
        setSavedCredentials(existing);
        if (existing.length === 0) {
            setShowSavedAccounts(false);
        }
    };

    return {
        savedCredentials,
        showSavedAccounts,
        setShowSavedAccounts,
        loadingCredentialEmail,
        setLoadingCredentialEmail,
        saveCredential,
        removeCredential
    };
}
