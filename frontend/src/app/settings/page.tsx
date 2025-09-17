"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from "@/lib/supabase";
import type { User } from '@supabase/supabase-js';
import { 
  UserIcon, 
  BellIcon, 
  ShieldCheckIcon, 
  MoonIcon,
  SunIcon,
  CheckCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';

const Settings = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [settings, setSettings] = useState({
    theme: 'dark',
    notifications: {
      email: true,
      push: false,
      research_updates: true,
      chat_messages: true
    },
    privacy: {
      profile_visibility: 'public',
      search_history: true,
      analytics: true
    }
  });
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }

      setUser(user);
      setLoading(false);
    };

    checkAuth();
  }, [router]);

  const handleSettingChange = (category: string, setting: string, value: any) => {
    setSettings(prev => {
      if (category === 'theme') {
        return { ...prev, theme: value };
      }
      
      const categoryData = prev[category as keyof typeof prev];
      if (typeof categoryData === 'object' && categoryData !== null) {
        return {
          ...prev,
          [category]: { ...categoryData, [setting]: value }
        };
      }
      
      return prev;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      // Here you would save settings to your backend
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      setMessage({ type: 'success', text: 'Settings saved successfully!' });
    } catch (error) {
      console.error('Failed to save settings:', error);
      setMessage({ type: 'error', text: 'Failed to save settings. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Settings</h1>
          <p className="text-gray-400 mt-2">Manage your application preferences and privacy settings</p>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center space-x-3 ${
            message.type === 'success' ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'
          }`}>
            {message.type === 'success' ? (
              <CheckCircleIcon className="h-5 w-5" />
            ) : (
              <ExclamationCircleIcon className="h-5 w-5" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        <div className="space-y-8">
          {/* Theme Settings */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center space-x-3 mb-6">
              {settings.theme === 'dark' ? (
                <MoonIcon className="h-6 w-6 text-blue-500" />
              ) : (
                <SunIcon className="h-6 w-6 text-yellow-500" />
              )}
              <h2 className="text-xl font-semibold text-white">Appearance</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Theme</label>
                <div className="flex space-x-4">
                  <button
                    onClick={() => handleSettingChange('theme', '', 'dark')}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
                      settings.theme === 'dark'
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-gray-500'
                    }`}
                  >
                    <MoonIcon className="h-4 w-4" />
                    <span>Dark</span>
                  </button>
                  <button
                    onClick={() => handleSettingChange('theme', '', 'light')}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
                      settings.theme === 'light'
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-gray-500'
                    }`}
                  >
                    <SunIcon className="h-4 w-4" />
                    <span>Light</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center space-x-3 mb-6">
              <BellIcon className="h-6 w-6 text-blue-500" />
              <h2 className="text-xl font-semibold text-white">Notifications</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-medium">Email Notifications</h3>
                  <p className="text-gray-400 text-sm">Receive updates via email</p>
                </div>
                <button
                  onClick={() => handleSettingChange('notifications', 'email', !settings.notifications.email)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    settings.notifications.email ? 'bg-blue-600' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      settings.notifications.email ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-medium">Research Updates</h3>
                  <p className="text-gray-400 text-sm">Get notified about new papers and research</p>
                </div>
                <button
                  onClick={() => handleSettingChange('notifications', 'research_updates', !settings.notifications.research_updates)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    settings.notifications.research_updates ? 'bg-blue-600' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      settings.notifications.research_updates ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-medium">Chat Messages</h3>
                  <p className="text-gray-400 text-sm">Notifications for new chat messages</p>
                </div>
                <button
                  onClick={() => handleSettingChange('notifications', 'chat_messages', !settings.notifications.chat_messages)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    settings.notifications.chat_messages ? 'bg-blue-600' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      settings.notifications.chat_messages ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Privacy Settings */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center space-x-3 mb-6">
              <ShieldCheckIcon className="h-6 w-6 text-blue-500" />
              <h2 className="text-xl font-semibold text-white">Privacy & Security</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Profile Visibility</label>
                <select
                  value={settings.privacy.profile_visibility}
                  onChange={(e) => handleSettingChange('privacy', 'profile_visibility', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                  <option value="friends">Friends Only</option>
                </select>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-medium">Save Search History</h3>
                  <p className="text-gray-400 text-sm">Allow us to save your searches to improve recommendations</p>
                </div>
                <button
                  onClick={() => handleSettingChange('privacy', 'search_history', !settings.privacy.search_history)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    settings.privacy.search_history ? 'bg-blue-600' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      settings.privacy.search_history ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-medium">Analytics</h3>
                  <p className="text-gray-400 text-sm">Help us improve the app by sharing usage analytics</p>
                </div>
                <button
                  onClick={() => handleSettingChange('privacy', 'analytics', !settings.privacy.analytics)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    settings.privacy.analytics ? 'bg-blue-600' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      settings.privacy.analytics ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Account Actions */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center space-x-3 mb-6">
              <UserIcon className="h-6 w-6 text-blue-500" />
              <h2 className="text-xl font-semibold text-white">Account</h2>
            </div>
            
            <div className="space-y-4">
              <button
                onClick={() => router.push('/profile')}
                className="w-full sm:w-auto px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Edit Profile
              </button>
              
              <div className="border-t border-gray-700 pt-4">
                <button className="text-red-400 hover:text-red-300 text-sm transition-colors">
                  Delete Account
                </button>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end space-x-4 pt-6">
            <button
              onClick={() => router.back()}
              className="px-6 py-2 border border-gray-600 text-gray-300 hover:text-white hover:border-gray-500 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center space-x-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Settings</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;