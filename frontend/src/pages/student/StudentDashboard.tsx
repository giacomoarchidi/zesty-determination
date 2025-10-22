import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { studentApi } from '../../api/student';
import { useAuthStore } from '../../store/authStore';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

// Funzione per convertire delimitatori LaTeX: \( \) → $ per compatibilità remark-math
const fixLatexDelimiters = (text: string): string => {
  let fixed = text;
  
  // Pattern 1: Converti ( formula ) in $formula$ (solo se contiene simboli math)
  fixed = fixed.replace(/(?<!\\)\(\s*([^()]*[\^\\=<>≠±√][^()]*)\s*\)/g, (match, inner) => {
    return `$${inner}$`;
  });
  
  // Pattern 2: Converti anche singole lettere matematiche: ( x ) → $x$
  fixed = fixed.replace(/(?<!\\)(\s|^|:|\.|,)\(\s*([a-z])\s*\)(?=\s|:|\.|,|$)/gi, (match, pre, letter) => {
    return `${pre}$${letter}$`;
  });
  
  // Pattern 3: Converti \( formula \) in $formula$ per compatibilità con remark-math
  fixed = fixed.replace(/\\\(\s*([^)]+?)\s*\\\)/g, (match, formula) => {
    return `$${formula}$`;
  });
  
  return fixed;
};

interface Lesson {
  id: number;
  subject: string;
  start_at: string;
  end_at: string;
  status: string;
  tutor_name: string;
  room_slug?: string;
  notes_text?: string;
}

interface Assignment {
  id: number;
  title: string;
  description: string;
  due_date: string;
  status: string;
  tutor_name: string;
}

const StudentDashboard: React.FC = () => {
  const [upcomingLessons, setUpcomingLessons] = useState<Lesson[]>([]);
  const [recentAssignments, setRecentAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const assignmentsRef = useRef<HTMLDivElement | null>(null);
  const user = useAuthStore((s) => s.user);
  const [selectedNotes, setSelectedNotes] = useState<{lesson: Lesson, notes: string} | null>(null);
  const greetingName = (() => {
    if (!user) return 'Utente';
    return user.first_name || user.email?.split('@')[0] || 'Utente';
  })();

  const loadData = async () => {
      try {
        setLoading(true);
        
        // Carica lezioni dal backend
        try {
          const lessonsData = await studentApi.getLessons(1, 100);
          console.log('✅ Lezioni studente caricate:', lessonsData);
          
          const lessons = lessonsData.lessons.map(lesson => ({
            id: lesson.id,
            subject: lesson.subject,
            start_at: lesson.start_at,
            end_at: lesson.end_at,
            status: lesson.status,
            tutor_name: lesson.tutor_name || 'Tutor',
            room_slug: lesson.room_slug,
            notes_text: lesson.notes_text // Aggiunto per mostrare appunti
          }));
          
          setUpcomingLessons(lessons);
        } catch (error) {
          console.error('❌ Errore caricamento lezioni:', error);
          setUpcomingLessons([]);
        }
        
        try {
          const assignmentsResponse = await studentApi.getAssignments();
          const normalized = (assignmentsResponse || []).slice(0, 4).map(a => ({
            id: a.id,
            title: a.title,
            description: a.description,
            due_date: a.due_date,
            status: a.is_published ? 'published' : 'draft',
            tutor_name: a.tutor_name || 'Tutor'
          }));
          setRecentAssignments(normalized);
        } catch (error) {
          console.error('❌ Errore caricamento compiti:', error);
          setRecentAssignments([]);
        }
        
    } catch (error) {
        console.error('Errore caricamento dati:', error);
        setUpcomingLessons([]);
        setRecentAssignments([]);
    } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    loadData();
  }, []);

  // Auto-refresh ogni 30 secondi
  useEffect(() => {
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Render LaTeX nei compiti (KaTeX inserito in index.html)
  useEffect(() => {
    try {
      const w = window as any;
      if (w.renderMathInElement && assignmentsRef.current) {
        w.renderMathInElement(assignmentsRef.current, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '\\(', right: '\\)', display: false },
            { left: '$', right: '$', display: false },
          ],
          throwOnError: false,
        });
      }
    } catch (_) {}
  }, [recentAssignments, expanded]);

  const sanitizeAi = (txt?: string) => {
    if (!txt) return '';
    return txt
      .replace(/\*\*/g, '')
      .replace(/^\s*#{1,6}\s*/gm, '')
      .trim();
  };

  const formatDescHtml = (text: string) => {
    const safe = sanitizeAi(text);
    const parts = safe.split('\n').map(p => p.trim());
    const html = parts
      .map(p => (p.length === 0 ? '<br />' : `<p class="leading-relaxed">${p}</p>`))
      .join('');
    return html;
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
  };

  const canJoinLesson = (lesson: Lesson) => {
    // Permetti accesso alle lezioni confermate dello stesso giorno
    if (lesson.status !== 'confirmed') {
      return false;
    }
    
    const lessonDate = new Date(lesson.start_at);
    const today = new Date();
    
    // Controlla se è lo stesso giorno (anno, mese, giorno)
    const isSameDay = lessonDate.getFullYear() === today.getFullYear() &&
                     lessonDate.getMonth() === today.getMonth() &&
                     lessonDate.getDate() === today.getDate();
    
    return isSameDay;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-purple-200 border-t-blue-600 rounded-full animate-spin"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-cyan-600 rounded-full animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
          </div>
          <p className="mt-6 text-white/80 text-lg">Caricamento dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-md shadow-xl border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-blue-400 bg-clip-text text-transparent">
                Dashboard Studente
              </h1>
              <p className="text-white/70 mt-2 text-lg">Bentornato, <span className="text-white font-semibold">{greetingName}</span> 👋</p>
            </div>
            <div className="flex space-x-4">
              <Link 
                to="/lessons/book" 
                className="group bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-6 py-3 rounded-full font-semibold shadow-lg hover:shadow-blue-500/25 transform hover:scale-105 transition-all duration-300"
              >
                <span className="flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>Prenota Lezione</span>
                </span>
              </Link>
              <Link 
                to="/student/assignments" 
                className="group bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-6 py-3 rounded-full font-semibold shadow-lg hover:shadow-blue-500/25 transform hover:scale-105 transition-all duration-300"
              >
                <span className="flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <span>I Miei Compiti</span>
                </span>
              </Link>
              <Link 
                to="/" 
                className="group bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-6 py-3 rounded-full font-semibold shadow-lg hover:shadow-cyan-500/25 transform hover:scale-105 transition-all duration-300"
              >
                <span className="flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  <span>Home</span>
                </span>
              </Link>
              <Link 
                to="/profile" 
                className="group border-2 border-white/30 text-white px-6 py-3 rounded-full font-semibold backdrop-blur-sm hover:bg-white/10 transform hover:scale-105 transition-all duration-300"
              >
                <span className="flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>Profilo</span>
                </span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistiche rapide */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="group bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:border-blue-400/50 transform hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/10">
          <div className="flex items-center">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl mr-4 group-hover:rotate-12 transition-transform duration-300">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <p className="text-white/70 text-sm font-medium">Lezioni Totali</p>
                <p className="text-3xl font-bold text-white group-hover:text-blue-300 transition-colors duration-300">{loading ? '...' : 0}</p>
              </div>
            </div>
          </div>

          <div className="group bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:border-green-400/50 transform hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-cyan-500/10">
            <div className="flex items-center">
              <div className="p-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl mr-4 group-hover:rotate-12 transition-transform duration-300">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-white/70 text-sm font-medium">Completate</p>
                <p className="text-3xl font-bold text-white group-hover:text-green-300 transition-colors duration-300">{loading ? '...' : 0}</p>
              </div>
            </div>
          </div>

          <div className="group bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:border-yellow-400/50 transform hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-yellow-500/10">
          <div className="flex items-center">
              <div className="p-3 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl mr-4 group-hover:rotate-12 transition-transform duration-300">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-white/70 text-sm font-medium">In Arrivo</p>
                <p className="text-3xl font-bold text-white group-hover:text-yellow-300 transition-colors duration-300">{loading ? '...' : upcomingLessons.length}</p>
            </div>
            </div>
          </div>

          <div className="group bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:border-blue-400/50 transform hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/10">
          <div className="flex items-center">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl mr-4 group-hover:rotate-12 transition-transform duration-300">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <p className="text-white/70 text-sm font-medium">Compiti</p>
                <p className="text-3xl font-bold text-white group-hover:text-blue-300 transition-colors duration-300">{loading ? '...' : recentAssignments.length}</p>
            </div>
            </div>
          </div>
      </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Prossime Lezioni */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl">
            <div className="px-8 py-6 border-b border-white/20">
              <h2 className="text-2xl font-bold text-white flex items-center">
                <svg className="w-6 h-6 mr-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Prossime Lezioni
              </h2>
            </div>
            <div className="p-8">
              {upcomingLessons.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-white/50 text-lg">Nessuna lezione programmata</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {upcomingLessons.map((lesson) => (
                    <div key={lesson.id} className="group bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:border-white/30 transition-all duration-300 hover:bg-white/10">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-blue-300 transition-colors duration-300">{lesson.subject}</h3>
                          <p className="text-white/70 mb-1">con <span className="font-medium">{lesson.tutor_name}</span></p>
                          <p className="text-white/60 text-sm">{formatDateTime(lesson.start_at)}</p>
                      </div>
                        <div className="flex flex-col items-end space-y-3">
                          <span className={`px-3 py-1 text-xs rounded-full font-medium ${
                            lesson.status === 'confirmed' ? 'bg-cyan-500/20 text-green-300 border border-cyan-500/30' :
                            lesson.status === 'pending' || lesson.status === 'pending_payment' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' :
                            lesson.status === 'cancelled' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                            'bg-gray-500/20 text-gray-300 border border-gray-500/30'
                          }`}>
                            {lesson.status === 'confirmed' ? 'Confermata' :
                             lesson.status === 'pending_payment' ? 'In attesa conferma tutor' :
                             lesson.status === 'pending' ? 'In attesa conferma tutor' :
                             lesson.status === 'cancelled' ? 'Annullata' :
                             lesson.status}
                          </span>
                          {canJoinLesson(lesson) && (
                            <button
                              onClick={() => window.location.href = `/lessons/${lesson.id}/video`}
                              className="group/btn bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:from-blue-600 text-white px-4 py-2 text-sm rounded-lg font-medium shadow-lg hover:shadow-cyan-500/50 transform hover:scale-105 transition-all duration-300"
                            >
                              <span className="flex items-center space-x-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                <span>🎥 Entra</span>
                              </span>
                            </button>
                          )}
                          {lesson.status === 'pending_payment' && (
                          <Link
                              to={`/payments/checkout/${lesson.id}`}
                              className="group/btn bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-4 py-2 text-sm rounded-lg font-medium shadow-lg hover:shadow-yellow-500/25 transform hover:scale-105 transition-all duration-300"
                            >
                              <span className="flex items-center space-x-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                </svg>
                                <span>Paga Ora</span>
                              </span>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                  ))}
            </div>
          )}
        </div>
      </div>

          {/* Compiti Recenti */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl">
            <div className="px-8 py-6 border-b border-white/20">
              <h2 className="text-2xl font-bold text-white flex items-center">
                <svg className="w-6 h-6 mr-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Compiti Recenti
              </h2>
            </div>
            <div className="p-8" ref={assignmentsRef}>
              {recentAssignments.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <p className="text-white/50 text-lg">Nessun compito assegnato</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {recentAssignments.map((assignment) => (
                    <div key={assignment.id} className="group bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-white/30 transition-all duration-300 hover:bg-white/10">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <h3 className="text-xl font-semibold text-white group-hover:text-blue-300 transition-colors duration-300 mr-2 truncate">{assignment.title}</h3>
                            <span className="px-2 py-0.5 text-[11px] rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">{assignment.tutor_name}</span>
                            <span className="px-2 py-0.5 text-[11px] rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">Scadenza: {formatDateTime(assignment.due_date)}</span>
                          </div>
                          <div className={`${expanded[assignment.id] ? '' : 'line-clamp-3'} text-white/80 text-sm`} dangerouslySetInnerHTML={{ __html: formatDescHtml(assignment.description) }} />
                          <div className="mt-2 flex items-center gap-3">
                            <button
                              onClick={() => setExpanded(prev => ({ ...prev, [assignment.id]: !prev[assignment.id] }))}
                              className="text-blue-300 hover:text-blue-200 text-sm"
                            >
                              {expanded[assignment.id] ? 'Mostra meno' : 'Mostra di più'}
                            </button>
                            <Link to={`/student/assignments?id=${assignment.id}`} className="text-white/70 hover:text-white text-sm">Apri compito</Link>
                          </div>
                        </div>
                        <span className={`px-3 py-1 text-xs rounded-full font-medium shrink-0 ${
                          assignment.status === 'completed' ? 'bg-green-500/20 text-green-300 border border-green-500/30' :
                          assignment.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' :
                          'bg-gray-500/20 text-gray-300 border border-gray-500/30'
                        }`}>
                          {assignment.status === 'completed' ? 'Completato' : assignment.status === 'pending' ? 'In corso' : assignment.status}
                        </span>
                      </div>
                    </div>
                  ))}
                  </div>
              )}
            </div>
          </div>
        </div>

        {/* Sezione Appunti e Report */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <svg className="w-6 h-6 mr-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Appunti Recenti
            </h2>
            
            {upcomingLessons.filter(l => l.status === 'completed' && l.notes_text).length > 0 ? (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {upcomingLessons
                  .filter(l => l.status === 'completed' && l.notes_text)
                  .slice(0, 5)
                  .map((lesson: any) => (
                    <div key={lesson.id} className="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-green-400/30 transition-all duration-300 cursor-pointer group">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-white font-semibold group-hover:text-green-400 transition-colors">
                            📚 {lesson.subject}
                          </h3>
                          <p className="text-white/60 text-sm">
                            con {lesson.tutor_name} • {new Date(lesson.start_at).toLocaleDateString('it-IT')}
                          </p>
                        </div>
                        <span className="text-green-400 text-xs bg-green-500/10 px-2 py-1 rounded-full">
                          ✓ Completata
                        </span>
                      </div>
                      <p className="text-white/70 text-sm line-clamp-2">
                        {lesson.notes_text?.substring(0, 150)}...
                      </p>
                      <button 
                        onClick={() => setSelectedNotes({lesson, notes: lesson.notes_text || ''})}
                        className="mt-3 text-green-400 text-sm hover:text-green-300 transition-colors flex items-center gap-1"
                      >
                        <span>Leggi appunti</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-white/50 text-lg">Gli appunti delle lezioni completate appariranno qui</p>
              </div>
            )}
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <svg className="w-6 h-6 mr-3 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Report Mensili
            </h2>
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <p className="text-white/50 text-lg">I report mensili generati dal tutor appariranno qui</p>
            </div>
        </div>
      </div>

      {/* Modale Appunti */}
      {selectedNotes && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-blue-900/90 to-purple-900/90 backdrop-blur-xl rounded-3xl border-2 border-blue-400/30 p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                  <span>📚</span>
                  <span>Appunti: {selectedNotes.lesson.subject}</span>
                </h3>
                <p className="text-white/70">
                  Lezione con {selectedNotes.lesson.tutor_name} • {new Date(selectedNotes.lesson.start_at).toLocaleDateString('it-IT')}
                </p>
              </div>
              <button
                onClick={() => setSelectedNotes(null)}
                className="text-white/60 hover:text-white transition-colors"
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="bg-white rounded-xl p-6 prose prose-slate prose-headings:text-gray-900 prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-p:text-gray-700 prose-a:text-blue-600 prose-strong:text-gray-900 prose-ul:text-gray-700 prose-ol:text-gray-700 prose-li:text-gray-700 max-w-none">
              <style>{`
                .katex { color: #1a1a1a !important; }
                .katex * { color: #1a1a1a !important; }
                .katex-display { margin: 1.5rem 0 !important; }
                .katex-display .katex { font-size: 1.2rem !important; }
              `}</style>
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
              >
                {fixLatexDelimiters(selectedNotes.notes)}
              </ReactMarkdown>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedNotes(null)}
                className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold py-3 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}
      </main>
    </div>
  );
};

export default StudentDashboard;