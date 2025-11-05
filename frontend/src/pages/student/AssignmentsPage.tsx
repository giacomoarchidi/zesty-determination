import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { studentApi } from '../../api/student';

interface Assignment {
  id: number;
  title: string;
  description: string;
  instructions: string;
  subject: string;
  due_date: string;
  points: number;
  is_published: boolean;
  created_at: string;
  tutor_name: string;
  has_submission: boolean;
  submission_status: 'pending' | 'submitted' | 'graded' | 'late';
  submission_grade?: number;
  submission_feedback?: string;
}

const AssignmentsPage: React.FC = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [submissionText, setSubmissionText] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const descRef = useRef<HTMLDivElement | null>(null);
  const instrRef = useRef<HTMLDivElement | null>(null);
  const solRef = useRef<HTMLDivElement | null>(null);
  const prevRef = useRef<HTMLDivElement | null>(null);
  const [showSolutions, setShowSolutions] = useState(false);
  const [solutionSteps, setSolutionSteps] = useState<string[][]>([]);
  const [stepsShown, setStepsShown] = useState<Record<number, number>>({});
  const listRef = useRef<HTMLDivElement | null>(null);
  // rimosso focus per placeholder dinamico; input semplice
  const [hasChecked, setHasChecked] = useState<boolean>(false);
  const [studentAnswers, setStudentAnswers] = useState<string[]>([]);
  const [isCheckingSolutions, setIsCheckingSolutions] = useState(false);
  const [feedback, setFeedback] = useState<string>('');

  const location = useLocation();
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const data = await studentApi.getAssignments();
        setAssignments(data as any);
      } catch (error) {
        console.error('Errore caricamento compiti:', error);
        setAssignments([]);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Inizializza KaTeX per renderizzare le formule matematiche
  useEffect(() => {
    const initKaTeX = () => {
      if (typeof window !== 'undefined' && (window as any).renderMathInElement) {
        (window as any).renderMathInElement(document.body, {
          delimiters: [
            {left: '$$', right: '$$', display: true},
            {left: '$', right: '$', display: false},
            {left: '\\(', right: '\\)', display: false},
            {left: '\\[', right: '\\]', display: true}
          ],
          throwOnError: false,
          strict: false
        });
      }
    };

    // Aspetta che KaTeX sia caricato
    if (typeof window !== 'undefined') {
      if ((window as any).renderMathInElement) {
        setTimeout(initKaTeX, 100);
      } else {
        // Se KaTeX non è ancora caricato, aspetta
        const checkKaTeX = setInterval(() => {
          if ((window as any).renderMathInElement) {
            clearInterval(checkKaTeX);
            initKaTeX();
          }
        }, 100);
        
        // Timeout dopo 5 secondi
        setTimeout(() => clearInterval(checkKaTeX), 5000);
      }
    }
  }, [selectedAssignment]);

  useEffect(() => {
    // Se arrivo con ?id= apri direttamente il compito
    const params = new URLSearchParams(location.search);
    const idParam = params.get('id');
    if (idParam) {
      const found = assignments.find(a => Number(a.id) === Number(idParam));
      if (found) setSelectedAssignment(found);
    }
  }, [location.search, assignments]);

  // --- Rendering elegante testo con LaTeX ---
  const sanitize = (txt?: string) => {
    if (!txt) return '';
    return txt
      .replace(/\*\*/g, '')
      .replace(/^\s*#{1,6}\s*/gm, '')
      .trim();
  };

  const autoWrapLatex = (line: string): string => {
    if (line.includes('$') || line.includes('\\(')) return line;
    const hasMath = /\\(infty|frac|sqrt|left|right|cup|cap|leq|geq|neq|pm|cdot|times|pi|approx|in)/.test(line) || /[\^_]/.test(line);
    if (!hasMath) return line;
    return `\\(${line}\\)`;
  };

  const toHtml = (text?: string) => {
    if (!text) return '';
    const safe = sanitize(text);
    const lines = safe.split('\n');
    
    // Rimuovi duplicati mantenendo l'ordine
    const seen = new Set();
    const uniqueLines = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !seen.has(trimmed)) {
        seen.add(trimmed);
        uniqueLines.push(line);
      } else if (!trimmed) {
        uniqueLines.push(line); // Mantieni le righe vuote
      }
    }
    
    const html = uniqueLines
      .map(l => l.trim())
      .map(l => (l.length === 0 ? '<br />' : `<p class=\"leading-relaxed\">${autoWrapLatex(l)}</p>`))
      .join('');
    
    // Re-renderizza KaTeX dopo aver aggiornato l'HTML
    setTimeout(() => {
      if (typeof window !== 'undefined' && (window as any).renderMathInElement) {
        (window as any).renderMathInElement(document.body, {
          delimiters: [
            {left: '$$', right: '$$', display: true},
            {left: '$', right: '$', display: false},
            {left: '\\(', right: '\\)', display: false},
            {left: '\\[', right: '\\]', display: true}
          ],
          throwOnError: false,
          strict: false
        });
      }
    }, 50);
    
    return html;
  };

  // Funzione per renderizzare LaTeX con KaTeX
  const renderLatex = (text: string) => {
    // Non modificare il testo LaTeX, lasciarlo così com'è per KaTeX
    return text;
  };

  // Funzione per estrarre solo le domande matematiche senza le soluzioni
  const extractQuestions = (text: string) => {
    const lines = text.split('\n');
    const questions = [];
    let currentQuestion = '';
    let inSolutions = false;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Se troviamo la sezione "Soluzioni", fermiamo l'estrazione
      if (trimmed.toLowerCase().includes('soluzioni') && trimmed.length < 20) {
        inSolutions = true;
        break;
      }
      
      // Se siamo già nella sezione soluzioni, fermiamo
      if (inSolutions) break;
      
      // Se la riga contiene una disequazione matematica (contiene <, >, ≤, ≥)
      if (trimmed.match(/[<>≤≥]/) && trimmed.match(/[x²\^]/)) {
        if (currentQuestion) {
          questions.push(currentQuestion.trim());
        }
        currentQuestion = trimmed;
      }
      // Se la riga contiene soluzioni (Discriminante, Radici, Intervallo)
      else if (trimmed.includes('Discriminante') || trimmed.includes('Radici') || trimmed.includes('Intervallo')) {
        if (currentQuestion) {
          questions.push(currentQuestion.trim());
          currentQuestion = '';
        }
        break; // Ferma quando trova le soluzioni
      }
      // Se è una riga normale e stiamo costruendo una domanda matematica
      else if (currentQuestion && trimmed && !trimmed.match(/^\d+\.|^[abc]\)/)) {
        currentQuestion += ' ' + trimmed;
      }
    }
    
    if (currentQuestion) {
      questions.push(currentQuestion.trim());
    }
    
    return questions;
  };

  // Estrae sezione Soluzioni dall'eventuale testo lungo in descrizione
  const extractSections = (text?: string) => {
    const safe = sanitize(text || '');
    const lines = safe.split('\n');
    const idxSol = lines.findIndex(l => /^\s*-{3,}\s*$/.test(l) || /^\s*soluzioni\s*:?/i.test(l));
    let desc = safe;
    let sols = '';
    if (idxSol !== -1) {
      desc = lines.slice(0, idxSol).join('\n');
      const after = lines.slice(idxSol).join('\n');
      const solHeaderIdx = after.search(/soluzioni\s*:?/i);
      if (solHeaderIdx !== -1) {
        const only = after.slice(solHeaderIdx + 'soluzioni'.length);
        sols = only.trim();
      } else {
        sols = lines.slice(idxSol + 1).join('\n');
      }
    }
    // Rimuovi eventuali duplicati di blocchi ricorrenti
    desc = desc.replace(/Istruzioni:?[\s\S]*$/i, '').trim() || desc;
    return { desc, sols };
  };

  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/\\\(|\\\)/g, '')
      .replace(/\s+/g, '')
      .replace(/≥/g, '>=')
      .replace(/≤/g, '<=')
      .replace(/∞/g, 'infty')
      .replace(/∪/g, 'cup')
      .replace(/\{/g, '{')
      .replace(/\}/g, '}')
      .replace(/\[/g, '[')
      .replace(/\]/g, ']');

  const splitNumbered = (text: string) => {
    const lines = text.split('\n');
    const items: string[] = [];
    let current = '';
    for (const raw of lines) {
      const l = raw.trim();
      const m = l.match(/^(\d+)\s*[\.|\)]\s*(.*)$/);
      if (m) {
        if (current) items.push(current.trim());
        current = m[2];
      } else if (l.length > 0) {
        current += (current ? ' ' : '') + l;
      }
    }
    if (current) items.push(current.trim());
    return items;
  };

  // Prepara quick answers quando si apre un compito
  useEffect(() => {
    if (!selectedAssignment) return;
    const { sols } = extractSections(selectedAssignment.description);
    const solsList = splitNumbered(sols).map(s => s.replace(/^[:\-\s]*/, ''));
    const steps = solsList.map(item => item.split('\n').map(l => l.trim()).filter(Boolean));
    setSolutionSteps(steps);
    const initialShown: Record<number, number> = {};
    for (let i = 0; i < steps.length; i++) initialShown[i] = 0;
    setStepsShown(initialShown);
    setHasChecked(false);
    setShowSolutions(false);
  }, [selectedAssignment]);

  // nessun controllo automatico per risposte rapide: risposta libera unica

  useEffect(() => {
    try {
      const w = window as any;
      if (selectedAssignment && w.renderMathInElement) {
        if (descRef.current) {
          w.renderMathInElement(descRef.current, {
            delimiters: [
              { left: '$$', right: '$$', display: true },
              { left: '\\(', right: '\\)', display: false },
              { left: '$', right: '$', display: false },
            ],
            throwOnError: false,
          });
        }
        if (instrRef.current) {
          w.renderMathInElement(instrRef.current, {
            delimiters: [
              { left: '$$', right: '$$', display: true },
              { left: '\\(', right: '\\)', display: false },
              { left: '$', right: '$', display: false },
            ],
            throwOnError: false,
          });
        }
        if (solRef.current) {
          w.renderMathInElement(solRef.current, {
            delimiters: [
              { left: '$$', right: '$$', display: true },
              { left: '\\(', right: '\\)', display: false },
              { left: '$', right: '$', display: false },
            ],
            throwOnError: false,
          });
        }
        if (prevRef.current) {
          w.renderMathInElement(prevRef.current, {
            delimiters: [
              { left: '$$', right: '$$', display: true },
              { left: '\\(', right: '\\)', display: false },
              { left: '$', right: '$', display: false },
            ],
            throwOnError: false,
          });
        }
      }
    } catch (_) {}
  }, [selectedAssignment, showSolutions, submissionText]);

  // KaTeX anche nell'elenco dei compiti
  useEffect(() => {
    try {
      const w = window as any;
      if (w.renderMathInElement && listRef.current) {
        w.renderMathInElement(listRef.current, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '\\(', right: '\\)', display: false },
            { left: '$', right: '$', display: false },
          ],
          throwOnError: false,
        });
      }
    } catch (_) {}
  }, [assignments]);

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

  const getStatusColor = (status: string, dueDate: string) => {
    const now = new Date();
    const due = new Date(dueDate);
    const isLate = now > due && status !== 'submitted' && status !== 'graded';

    if (isLate) return 'bg-red-500/20 text-red-300 border border-red-500/30';
    
    switch (status) {
      case 'submitted':
        return 'bg-blue-500/20 text-blue-300 border border-blue-500/30';
      case 'graded':
        return 'bg-cyan-500/20 text-green-300 border border-cyan-500/30';
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30';
      default:
        return 'bg-gray-500/20 text-gray-300 border border-gray-500/30';
    }
  };

  const getStatusText = (status: string, dueDate: string) => {
    const now = new Date();
    const due = new Date(dueDate);
    const isLate = now > due && status !== 'submitted' && status !== 'graded';

    if (isLate) return 'In ritardo';
    
    switch (status) {
      case 'submitted':
        return 'Consegnato';
      case 'graded':
        return 'Valutato';
      case 'pending':
        return 'In attesa';
      default:
        return status;
    }
  };

  const handleSubmitAssignment = async (assignmentId: number) => {
    if (!submissionText.trim()) return;
    
    setSubmitting(true);
    
    // Simula l'invio
    setTimeout(() => {
      setAssignments(prev => prev.map(assignment => 
        assignment.id === assignmentId 
          ? {
              ...assignment,
              has_submission: true,
              submission_status: 'submitted' as const
            }
          : assignment
      ));
      setSubmissionText('');
      setSelectedAssignment(null);
      setSubmitting(false);
    }, 2000);
  };

  const getGradeColor = (grade?: number) => {
    if (!grade) return 'text-white/60';
    if (grade >= 90) return 'text-green-400';
    if (grade >= 80) return 'text-blue-400';
    if (grade >= 70) return 'text-yellow-400';
    if (grade >= 60) return 'text-orange-400';
    return 'text-red-400';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-blue-600 rounded-full animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
          </div>
          <p className="mt-6 text-white/80 text-lg">Caricamento compiti...</p>
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
                I Miei Compiti
              </h1>
              <p className="text-white/70 mt-2 text-lg">Gestisci le tue consegne e monitora i progressi</p>
            </div>
            <div className="flex space-x-4">
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
                to="/student/dashboard" 
                className="group border-2 border-white/30 text-white px-6 py-3 rounded-full font-semibold backdrop-blur-sm hover:bg-white/10 transform hover:scale-105 transition-all duration-300"
              >
                <span className="flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  <span>Dashboard</span>
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <p className="text-white/70 text-sm font-medium">Compiti Totali</p>
                <p className="text-3xl font-bold text-white group-hover:text-blue-300 transition-colors duration-300">{assignments.length}</p>
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
                <p className="text-white/70 text-sm font-medium">Consegnati</p>
                <p className="text-3xl font-bold text-white group-hover:text-green-300 transition-colors duration-300">
                  {assignments.filter(a => a.has_submission).length}
                </p>
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
                <p className="text-white/70 text-sm font-medium">In Attesa</p>
                <p className="text-3xl font-bold text-white group-hover:text-yellow-300 transition-colors duration-300">
                  {assignments.filter(a => a.submission_status === 'pending').length}
                </p>
              </div>
            </div>
          </div>

          <div className="group bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:border-blue-400/50 transform hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/10">
            <div className="flex items-center">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl mr-4 group-hover:rotate-12 transition-transform duration-300">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <p className="text-white/70 text-sm font-medium">Media Voti</p>
                <p className="text-3xl font-bold text-white group-hover:text-blue-300 transition-colors duration-300">
                  {(() => {
                    const gradedAssignments = assignments.filter(a => a.submission_grade !== undefined);
                    if (gradedAssignments.length === 0) return 'N/A';
                    const average = gradedAssignments.reduce((sum, a) => sum + (a.submission_grade || 0), 0) / gradedAssignments.length;
                    return Math.round(average);
                  })()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Lista Compiti */}
        {assignments.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl p-12">
            <div className="text-center">
              <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Nessun compito assegnato</h3>
              <p className="text-white/60 text-lg mb-8">Al momento non ci sono compiti da completare</p>
              <Link 
                to="/student/dashboard"
                className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-blue-500 text-white px-8 py-4 rounded-xl font-semibold shadow-lg hover:shadow-blue-500/25 transform hover:scale-105 transition-all duration-300"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Torna alla Dashboard</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6" ref={listRef}>
            {assignments.map((assignment) => (
            <div key={assignment.id} className="group bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 hover:border-white/30 transition-all duration-300 hover:bg-white/15 shadow-xl">
              <div className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4 mb-4">
                      <span className="bg-gradient-to-r from-blue-500 to-blue-500 text-white px-4 py-2 rounded-full text-sm font-semibold">
                        {assignment.subject}
                      </span>
                      <span className="bg-white/20 text-white/80 px-3 py-1 rounded-full text-sm">
                        {assignment.points} punti
                      </span>
                      <span className={`px-3 py-1 text-xs rounded-full font-medium ${getStatusColor(assignment.submission_status, assignment.due_date)}`}>
                        {getStatusText(assignment.submission_status, assignment.due_date)}
                      </span>
                    </div>
                    
                    <h2 className="text-2xl font-bold text-white mb-3 group-hover:text-blue-300 transition-colors duration-300">
                      {assignment.title}
                    </h2>
                    
                    <div className="text-white/80 mb-4 text-lg leading-relaxed prose prose-invert max-w-none" ref={assignment.id === selectedAssignment?.id ? descRef : undefined} dangerouslySetInnerHTML={{ __html: toHtml(assignment.description) }} />
                    
                    <div className="flex items-center space-x-6 text-white/60 text-sm">
                      <span className="flex items-center space-x-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span>{assignment.tutor_name}</span>
                      </span>
                      <span className="flex items-center space-x-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Scadenza: {formatDateTime(assignment.due_date)}</span>
                      </span>
                      {assignment.submission_grade && (
                        <span className={`flex items-center space-x-2 font-semibold ${getGradeColor(assignment.submission_grade)}`}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Voto: {assignment.submission_grade}/100</span>
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col space-y-3">
                    <button
                      onClick={() => setSelectedAssignment(assignment)}
                      className="group/btn bg-gradient-to-r from-blue-500 to-blue-500 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-blue-500/25 transform hover:scale-105 transition-all duration-300"
                    >
                      <span className="flex items-center space-x-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span>Vedi Dettagli</span>
                      </span>
                    </button>
                    
                    {!assignment.has_submission && assignment.is_published && (
                      <button
                        onClick={() => setSelectedAssignment(assignment)}
                        className="group/btn bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-cyan-500/25 transform hover:scale-105 transition-all duration-300"
                      >
                        <span className="flex items-center space-x-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          <span>Consegna</span>
                        </span>
                      </button>
                    )}
                  </div>
                </div>
                
                {assignment.submission_feedback && (
                  <div className="mt-6 p-6 bg-white/5 rounded-xl border border-white/10">
                    <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                      </svg>
                      Feedback del Tutor
                    </h3>
                    <p className="text-white/80 leading-relaxed">{assignment.submission_feedback}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
          </div>
        )}
      </main>

      {/* Modal per dettagli compito e consegna */}
      {selectedAssignment && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div className="flex-1 min-w-0">
                  <h2 className="text-3xl font-bold text-white mb-3">{selectedAssignment.title}</h2>
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className="px-3 py-1 text-xs rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">{selectedAssignment.subject}</span>
                    <span className="px-3 py-1 text-xs rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">Scadenza: {formatDateTime(selectedAssignment.due_date)}</span>
                    <span className="px-3 py-1 text-xs rounded-full bg-white/10 text-white/70 border border-white/20">{selectedAssignment.points} punti</span>
                  </div>
                  <div
                    className="prose prose-invert max-w-none text-white/80 leading-relaxed"
                    ref={descRef}
                dangerouslySetInnerHTML={{ __html: toHtml(selectedAssignment.description) }}
                  />
                </div>
                <button
                  onClick={() => setSelectedAssignment(null)}
                  className="text-white/60 hover:text-white transition-colors duration-300"
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="bg-white/5 rounded-xl p-6 mb-6">
                <h3 className="text-xl font-semibold text-white mb-4">Istruzioni Dettagliate</h3>
                <div className="text-white/80 leading-relaxed" ref={instrRef} dangerouslySetInnerHTML={{ __html: toHtml(selectedAssignment.instructions) }} />
              </div>

              {/* Sezione Esercizi con tabella interattiva */}
              {(() => {
                const questions = extractQuestions(selectedAssignment.description);
                // Filtra solo le domande che contengono disequazioni matematiche
                const mathQuestions = questions.filter(q => 
                  q.includes('<') || q.includes('>') || q.includes('≤') || q.includes('≥')
                );
                
                if (mathQuestions.length === 0) return null as any;
                
                return (
                  <div className="bg-white/5 rounded-xl p-6 mb-6">
                    <h3 className="text-xl font-semibold text-white mb-4">Esercizi</h3>
                    <p className="text-white/70 text-sm mb-6">Risolvi le seguenti disequazioni di secondo grado e clicca "Controlla Soluzioni" per ricevere feedback personalizzato.</p>
                    
                    <div className="space-y-4">
                      {mathQuestions.map((question, index) => (
                        <div key={index} className="bg-white/5 rounded-lg p-4 border border-white/10">
                          <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 w-20">
                              <span className="text-white font-semibold">Esercizio {index + 1}</span>
                            </div>
                            <div className="flex-1">
                              <div className="mb-3">
                                <div className="text-white/80 text-sm mb-2" dangerouslySetInnerHTML={{ __html: toHtml(question) }} />
                              </div>
                              <textarea
                                value={studentAnswers[index] || ''}
                                onChange={(e) => {
                                  const newAnswers = [...studentAnswers];
                                  newAnswers[index] = e.target.value;
                                  setStudentAnswers(newAnswers);
                                }}
                                placeholder={`Risposta per l'esercizio ${index + 1}...`}
                                className="w-full min-h-[80px] px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 resize-y text-sm"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex justify-center mt-6">
                      <button
                        onClick={async () => {
                          if (studentAnswers.every(answer => !answer.trim())) {
                            alert('Compila almeno una risposta prima di controllare!');
                            return;
                          }
                          
                          setIsCheckingSolutions(true);
                          setFeedback('');
                          
                          try {
                            // Simula chiamata API OpenAI (da implementare)
                            await new Promise(resolve => setTimeout(resolve, 2000));
                            
                            // Feedback simulato per ora
                            setFeedback(`
                              🎉 Ottimo lavoro! 
                              
                              ✅ **Esercizio 1**: La tua risposta è corretta! Hai identificato correttamente l'intervallo (2, 3).
                              
                              ⚠️ **Esercizio 2**: Quasi perfetto! Ricorda di includere anche l'intervallo (-∞, -2.5].
                              
                              ✅ **Esercizio 3**: Perfetto! Hai capito bene il concetto degli intervalli.
                              
                              💡 **Suggerimento**: Continua così! Stai padroneggiando bene le disequazioni di secondo grado.
                            `);
                          } catch (error) {
                            setFeedback('❌ Errore durante il controllo. Riprova più tardi.');
                          } finally {
                            setIsCheckingSolutions(false);
                          }
                        }}
                        disabled={isCheckingSolutions}
                        className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:from-gray-500 disabled:to-gray-600 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-green-500/25 transform hover:scale-105 transition-all duration-300 disabled:transform-none"
                      >
                        <span className="flex items-center space-x-2">
                          {isCheckingSolutions ? (
                            <>
                              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                              <span>Controllando...</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Controlla Soluzioni</span>
                            </>
                          )}
                        </span>
                      </button>
                    </div>
                    
                    {/* Sezione Feedback */}
                    {feedback && (
                      <div className="mt-6 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl p-6 border border-blue-400/20">
                        <h4 className="text-lg font-semibold text-white mb-3 flex items-center">
                          <svg className="w-6 h-6 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                          Feedback Personalizzato
                        </h4>
                        <div className="text-white/90 leading-relaxed whitespace-pre-line">
                          {feedback}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignmentsPage;
