import { useState } from 'react';
import { Link } from 'react-router-dom';
import jetFighterImage from '@/assets/jet-fighter.jpg';
import wfeLogo from '@/assets/wfe-logo.png';
import { SavedCredentialsList } from './components/SavedCredentialsList';
import { LoginForm } from './components/LoginForm';
import { useSavedCredentials } from './hooks/useSavedCredentials';
import { SavedCredential } from './types';

export default function Login() {
  const {
    savedCredentials,
    showSavedAccounts,
    setShowSavedAccounts,
    loadingCredentialEmail,
    removeCredential,
    saveCredential
  } = useSavedCredentials();

  const [prefilledEmail, setPrefilledEmail] = useState('');

  const handleSelectAccount = (credential: SavedCredential) => {
    setPrefilledEmail(credential.email);
    setShowSavedAccounts(false);
  };

  const handleUseOtherAccount = () => {
    setShowSavedAccounts(false);
    setPrefilledEmail('');
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col px-8 md:px-16 lg:px-24 bg-background py-8 min-h-screen">
        {/* Logo */}
        <div className="mb-12 md:mb-16">
          <div className="flex items-center gap-3">
            <Link to="/login">
              <img src={wfeLogo} alt="WFE Evolution" className="h-12 w-auto object-contain cursor-pointer" />
            </Link>
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 flex flex-col justify-center max-w-md w-full mx-auto animate-fade-in">
          <div className="space-y-6 w-full">
            <div>
              <h1 className="text-4xl md:text-5xl font-light mb-3">
                {showSavedAccounts && savedCredentials.length > 0 ? 'Escolha uma conta.' : 'Bem-vindo.'}
              </h1>
              <p className="text-muted-foreground text-lg">
                {showSavedAccounts && savedCredentials.length > 0
                  ? 'Selecione uma conta salva para entrar.'
                  : 'Acesse sua conta exclusiva.'}
              </p>
            </div>

            {showSavedAccounts && savedCredentials.length > 0 ? (
              <SavedCredentialsList
                credentials={savedCredentials}
                loadingEmail={loadingCredentialEmail}
                onSelectAccount={handleSelectAccount}
                onRemoveAccount={(e, email) => { e.stopPropagation(); removeCredential(email); }}
                onUseOtherAccount={handleUseOtherAccount}
              />
            ) : (
              <LoginForm
                prefilledEmail={prefilledEmail}
                onLoginSuccess={(email) => { saveCredential(email); }}
                onBackToSavedAccounts={
                  savedCredentials.length > 0 ? () => setShowSavedAccounts(true) : undefined
                }
              />
            )}
          </div>
        </div>
      </div>

      {/* Right Panel - Image */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent z-10" />

        {/* Image */}
        <img src={jetFighterImage} alt="Fighter jet breaking sound barrier" className="absolute inset-0 w-full h-full object-cover object-center" />

        {/* Subtle animated glow */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-60 animate-pulse" />
      </div>
    </div>
  );
}