
import React, { useState, useEffect } from 'react';

const loadingMessages = [
  "Consulting ancient texts...",
  "Synthesizing philosophical concepts...",
  "Structuring chapters...",
  "Crafting a compelling preface...",
  "Polishing the final narrative...",
  "Binding the digital pages..."
];

const LoadingSpinner: React.FC = () => {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setMessageIndex((prevIndex) => (prevIndex + 1) % loadingMessages.length);
    }, 2500);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="max-w-4xl mx-auto mt-6 text-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <div className="flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
      <p className="mt-4 text-lg font-medium text-gray-700 dark:text-gray-300">Generating your anthology...</p>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 min-h-[20px]">{loadingMessages[messageIndex]}</p>
    </div>
  );
};

export default LoadingSpinner;
