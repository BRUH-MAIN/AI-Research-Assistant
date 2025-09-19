"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  UserGroupIcon,
  GlobeAltIcon,
  LockClosedIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { createClient } from '@supabase/supabase-js';
import { groupService, CreateGroupData } from '../../services/groupService';
import { authService } from '../../services/authService';

// Supabase Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface User {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    name?: string;
  };
}

const CreateGroupPage: React.FC = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  
  const [formData, setFormData] = useState<CreateGroupData>({
    name: '',
    description: '',
    is_public: false,
  });

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);
      // Get internal user ID from auth service
      const internalUserId = authService.getCurrentInternalUserId();
      setCurrentUserId(internalUserId);
      
      // Check if user can create groups (ID must be >= 2)
      if (internalUserId !== null && internalUserId < 2) {
        setError('Guest users are not allowed to create groups. Please contact an administrator to create a proper user account.');
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!session?.user) {
          router.push('/login');
        } else {
          setUser(session.user);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Group name is required');
      return;
    }

    if (formData.name.trim().length < 3) {
      setError('Group name must be at least 3 characters long');
      return;
    }

    if (formData.name.trim().length > 50) {
      setError('Group name must be less than 50 characters');
      return;
    }

    if (!user || !currentUserId) {
      setError('You must be logged in to create a group');
      return;
    }

    // Check if user can create groups
    if (currentUserId < 2) {
      setError('Guest users are not allowed to create groups. Please contact an administrator for a proper user account.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const groupData: CreateGroupData = {
        ...formData,
        name: formData.name.trim(),
        description: formData.description?.trim() || '',
        created_by: currentUserId,
      };

      const newGroup = await groupService.createGroup(groupData);
      
      // Redirect to the new group page
      const groupId = newGroup.group_id || newGroup.id;
      router.push(`/groups/${groupId}`);
    } catch (error: any) {
      console.error('Failed to create group:', error);
      setError(error.message || 'Failed to create group. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/groups"
            className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            <span>Back to Groups</span>
          </Link>
          
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
              <UserGroupIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Create New Group</h1>
              <p className="text-gray-400">Start a new research group and invite collaborators</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Group Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                Group Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter group name..."
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                required
                maxLength={50}
              />
              <p className="text-xs text-gray-400 mt-1">
                {formData.name.length}/50 characters
              </p>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
                Description (Optional)
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Describe your group's purpose and goals..."
                rows={4}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
                maxLength={500}
              />
              <p className="text-xs text-gray-400 mt-1">
                {(formData.description || '').length}/500 characters
              </p>
            </div>

            {/* Privacy Settings */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Privacy Settings
              </label>
              
              <div className="space-y-3">
                {/* Private Group (Default) */}
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="privacy"
                    value="private"
                    checked={!formData.is_public}
                    onChange={() => setFormData(prev => ({ ...prev, is_public: false }))}
                    className="mt-1 h-4 w-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <LockClosedIcon className="h-5 w-5 text-yellow-400" />
                      <span className="text-white font-medium">Private Group</span>
                    </div>
                    <p className="text-sm text-gray-400 mt-1">
                      Only members with an invite code can join. You control who has access.
                    </p>
                  </div>
                </label>

                {/* Public Group */}
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="privacy"
                    value="public"
                    checked={formData.is_public}
                    onChange={() => setFormData(prev => ({ ...prev, is_public: true }))}
                    className="mt-1 h-4 w-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <GlobeAltIcon className="h-5 w-5 text-green-400" />
                      <span className="text-white font-medium">Public Group</span>
                    </div>
                    <p className="text-sm text-gray-400 mt-1">
                      Anyone can discover and join this group. Great for open research projects.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <InformationCircleIcon className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-300">
                  <p className="font-medium mb-1">What happens after creation:</p>
                  <ul className="space-y-1 text-blue-200">
                    <li>• You'll automatically become the group admin</li>
                    <li>• A unique invite code will be generated</li>
                    <li>• You can manage members and their roles</li>
                    <li>• Start research sessions and collaborate</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end space-x-3 pt-4">
              <Link
                href="/groups"
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading || !formData.name.trim()}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center space-x-2"
              >
                {loading && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                <span>{loading ? 'Creating...' : 'Create Group'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateGroupPage;