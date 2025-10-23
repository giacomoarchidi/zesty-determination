import React from 'react';

const TestTutor: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-4">
          🎯 TEST TUTOR PAGE
        </h1>
        <p className="text-xl text-blue-200 mb-8">
          Se vedi questa pagina, il routing funziona!
        </p>
        <div className="bg-white/10 rounded-xl p-6 backdrop-blur-sm">
          <p className="text-white">
            URL: {window.location.href}
          </p>
          <p className="text-white">
            Path: {window.location.pathname}
          </p>
        </div>
      </div>
    </div>
  );
};

export default TestTutor;
