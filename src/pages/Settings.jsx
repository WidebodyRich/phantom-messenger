import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, User, Bell, Shield, Palette, Info, LogOut, ChevronRight, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Settings({ onBack }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const sections = [
    {
      title: 'Account',
      items: [
        { icon: User, label: 'Edit Profile', desc: 'Username, display name, avatar', onClick: () => {} },
        { icon: Shield, label: 'Privacy', desc: 'Who can message you, blocked users', onClick: () => {} },
        { icon: Lock, label: 'Security', desc: 'Encryption keys, active sessions', onClick: () => {} },
      ],
    },
    {
      title: 'Preferences',
      items: [
        { icon: Bell, label: 'Notifications', desc: 'Push notifications, sounds', onClick: () => {} },
        { icon: Palette, label: 'Appearance', desc: 'Theme, font size', onClick: () => {} },
      ],
    },
    {
      title: 'About',
      items: [
        { icon: Info, label: 'About Phantom', desc: 'Version 2.0.0 • Helsinki, FI', onClick: () => {} },
      ],
    },
  ];

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="h-full flex flex-col bg-white">
      <div className="px-5 pt-5 pb-3 flex items-center gap-3 border-b border-phantom-gray-200">
        <button onClick={onBack} className="w-9 h-9 rounded-xl hover:bg-phantom-gray-50 flex items-center justify-center">
          <ArrowLeft className="w-5 h-5 text-phantom-gray-500" />
        </button>
        <h2 className="text-lg font-bold text-phantom-charcoal">Settings</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
        {/* User card */}
        <div className="flex items-center gap-4 p-4 bg-phantom-gray-50 rounded-2xl">
          <div className="w-14 h-14 bg-phantom-green/10 rounded-full flex items-center justify-center">
            <span className="text-phantom-green font-bold text-xl">{(user?.username || '?')[0].toUpperCase()}</span>
          </div>
          <div>
            <p className="font-bold text-phantom-charcoal">{user?.username}</p>
            <p className="text-sm text-phantom-gray-400 capitalize">{user?.tier || 'Free'} Plan</p>
          </div>
        </div>

        {sections.map((section) => (
          <div key={section.title}>
            <h3 className="text-xs font-semibold text-phantom-gray-400 uppercase tracking-wider mb-2 px-1">{section.title}</h3>
            <div className="space-y-1">
              {section.items.map(({ icon: Icon, label, desc, onClick }) => (
                <button key={label} onClick={onClick} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-phantom-gray-50 transition-colors text-left">
                  <div className="w-9 h-9 bg-phantom-gray-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-phantom-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-phantom-charcoal">{label}</p>
                    <p className="text-xs text-phantom-gray-400">{desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-phantom-gray-300 flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Logout */}
        <button onClick={handleLogout} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-50 transition-colors text-left group">
          <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center">
            <LogOut className="w-4 h-4 text-red-500" />
          </div>
          <span className="text-sm font-medium text-red-500">Sign Out</span>
        </button>
      </div>
    </motion.div>
  );
}
