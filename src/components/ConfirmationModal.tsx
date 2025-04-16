'use client';

import React from 'react';

interface ActionButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'default';
}

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  actions: ActionButtonProps[];
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  message, 
  actions 
}) => {
  if (!isOpen) return null;

  const getButtonClasses = (variant: ActionButtonProps['variant']) => {
    switch (variant) {
      case 'primary':
        return 'bg-blue-600 hover:bg-blue-700 text-white';
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 text-white';
      case 'secondary':
        return 'bg-gray-500 hover:bg-gray-600 text-white';
      case 'default':
      default:
        return 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 border border-gray-400 dark:border-gray-500';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm">
      <div className="bg-[rgb(var(--card-bg-rgb))] dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md mx-4 border border-[rgb(var(--card-border-rgb))] dark:border-gray-700">
        <h2 className="text-xl font-semibold mb-4 text-[rgb(var(--foreground-rgb))]">{title}</h2>
        <p className="mb-6 text-[rgb(var(--secondary-rgb))]">{message}</p>
        <div className="flex justify-end gap-3">
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={action.onClick}
              className={`px-4 py-2 rounded-md font-medium transition-colors duration-150 ${getButtonClasses(action.variant)}`}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal; 