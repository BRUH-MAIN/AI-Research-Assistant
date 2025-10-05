"use client";

import React, { useState } from 'react';
import {
  ClipboardDocumentIcon,
  CheckIcon
} from '@heroicons/react/24/outline';

interface InviteCodeDisplayProps {
  inviteCode: string;
  groupName: string;
  showRegenerateButton?: boolean;
  onRegenerate?: () => Promise<void>;
}

const InviteCodeDisplay: React.FC<InviteCodeDisplayProps> = ({
  inviteCode,
  groupName,
  showRegenerateButton = false,
  onRegenerate
}) => {
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy invite code:', error);
    }
  };

  const handleRegenerate = async () => {
    if (!onRegenerate) return;
    
    const confirmed = confirm(
      'Are you sure you want to regenerate the invite code? The current code will become invalid.'
    );
    
    if (!confirmed) return;

    setRegenerating(true);
    try {
      await onRegenerate();
    } catch (error) {
      console.error('Failed to regenerate invite code:', error);
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-white mb-4">
        Invite Code for "{groupName}"
      </h3>
      
      <div className="space-y-4">
        {/* Invite Code Display */}
        <div className="flex items-center space-x-3">
          <div className="flex-1">
            <code className="block text-2xl font-mono text-blue-400 bg-gray-900 px-4 py-3 rounded border tracking-wider">
              {inviteCode}
            </code>
          </div>
          <button
            onClick={copyToClipboard}
            className={`flex items-center space-x-2 px-4 py-3 rounded transition-colors ${
              copied
                ? 'bg-green-600 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {copied ? (
              <>
                <CheckIcon className="h-5 w-5" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <ClipboardDocumentIcon className="h-5 w-5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        {/* Instructions */}
        <div className="text-sm text-gray-300 space-y-2">
          <p>Share this code with people you want to invite to the group.</p>
          <p className="text-gray-400">
            They can join by entering this code on the "Join Group" page.
          </p>
        </div>

        {/* Regenerate Button */}
        {showRegenerateButton && onRegenerate && (
          <div className="pt-4 border-t border-gray-700">
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="flex items-center space-x-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-800 text-white text-sm rounded transition-colors"
            >
              {regenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Regenerating...</span>
                </>
              ) : (
                <span>Regenerate Code</span>
              )}
            </button>
            <p className="text-xs text-gray-400 mt-2">
              Regenerating will invalidate the current code
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InviteCodeDisplay;