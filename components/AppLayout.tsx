import React from 'react';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import { SalesSettings, TrainingMode } from '../types';

interface AppLayoutProps {
    children: React.ReactNode;
    isSidebarOpen: boolean;
    onSidebarChange: (isOpen: boolean) => void;
    viewMode: 'text' | 'voice' | 'profile' | 'welcome' | 'dashboard';
    settings: SalesSettings;
    onSettingsChange: (settings: any) => void; // Using any to match Sidebar props for now, should be specific
    onReset: () => void;
    onOpenProfile: () => void;
    onOpenDashboard: () => void;
    onSignOut: () => void;
    onModeSelect: (mode: TrainingMode) => void;
}

const AppLayout: React.FC<AppLayoutProps> = ({
    children,
    isSidebarOpen,
    onSidebarChange,
    viewMode,
    settings,
    onSettingsChange,
    onReset,
    onOpenProfile,
    onOpenDashboard,
    onSignOut,
    onModeSelect
}) => {
    return (
        <div className="flex h-screen w-full bg-gemini-dark text-gemini-text font-sans overflow-hidden">

            <Sidebar
                isOpen={isSidebarOpen}
                onClose={() => onSidebarChange(false)}
                settings={settings}
                onSettingsChange={onSettingsChange}
                onReset={onReset}
                onOpenProfile={onOpenProfile}
                onOpenDashboard={onOpenDashboard}
                onSignOut={onSignOut}
                onModeSelect={onModeSelect}
            />

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-full relative transition-all duration-300 ease-in-out">

                {/* Header */}
                <header className="h-16 flex items-center justify-between px-4 border-b border-gemini-highlight bg-gemini-dark z-10">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => onSidebarChange(true)}
                            className="p-2 text-gemini-muted hover:text-white hover:bg-gemini-highlight rounded-full transition-colors"
                        >
                            <Menu size={24} />
                        </button>
                        <div className="flex items-center gap-2 text-gemini-blue">
                            {/* Simple Logo Icon */}
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            <span className="font-bold text-lg tracking-wide text-white">Sales Architect</span>
                        </div>
                    </div>

                    {/* Mode Indicator */}
                    <div className="px-3 py-1 rounded-full bg-gemini-highlight text-xs font-medium text-gemini-cyan border border-gemini-cyan/20">
                        {viewMode === 'text' ? 'TEXT MODE' : viewMode === 'voice' ? 'LIVE VOICE' : viewMode === 'profile' ? 'PROFILE' : viewMode === 'dashboard' ? 'DASHBOARD' : 'WELCOME'}
                    </div>
                </header>

                {/* View Content */}
                <main className="flex-1 overflow-hidden relative">
                    {children}
                </main>

            </div>

            {/* Overlay for mobile sidebar */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
                    onClick={() => onSidebarChange(false)}
                />
            )}
        </div>
    );
};

export default AppLayout;
