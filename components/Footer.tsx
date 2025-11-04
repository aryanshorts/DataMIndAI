
import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
      <div className="container mx-auto px-4 py-6 text-center text-gray-600 dark:text-gray-400">
        <div className="flex justify-center space-x-6 mb-4">
          <a href="#" className="hover:text-brand-primary dark:hover:text-brand-secondary">About</a>
          <a href="#" className="hover:text-brand-primary dark:hover:text-brand-secondary">Privacy Policy</a>
          <a href="#" className="hover:text-brand-primary dark:hover:text-brand-secondary">Terms</a>
        </div>
        <p>&copy; 2025 Datamind Voice AI. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
