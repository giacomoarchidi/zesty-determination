import React, { useEffect, useRef, useState } from 'react';
import { tutorApi } from '../../api/tutor';
import { assignmentApi } from '../../api/assignment';
import { Link } from 'react-router-dom';
import { apiClient } from '../../api/client';

interface Assignment {
  id: string;
  title: string;
  subject: string;
  description: string;
  dueDate: string;
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
  status: 'draft' | 'published';
  attachments?: {
    name: string;
    url: string;
    size: number;
  }[];
}

// Interfaccia per i dati di creazione compito
interface AssignmentCreateData {
  title: string;
  description: string;
  instructions: string;
  subject: string;
  due_date: string;
  points: number;
  is_published: boolean;
  student_id: number;
}

interface Student {
  id: string;
  name: string;
  email: string;
  grade: string;
}

const AssignmentsPage: React.FC = () => {
  const sanitizeAi = (txt?: string) => {
    if (!txt) return '';
    // rimuovi grassetto markdown ** e backticks, normalizza spaziature
    return txt
      .replace(/\*\*/g, '')
      .replace(/`/g, '')
      // rimuovi heading markdown (#, ##, ###)
      .replace(/^\s*#{1,6}\s*/gm, '')
      .replace(/\r/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  };

  const [assignments, setAssignments] = useState<Assignment[]>([]);

  const [students, setStudents] = useState<Student[]>([]);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newAssignment, setNewAssignment] = useState<Partial<Assignment>>({
    title: '',
    subject: 'Matematica',
    description: '',
    dueDate: '',
    difficulty: 'medium',
    points: 10,
    status: 'published'
  });

  const [aiDifficulty, setAiDifficulty] = useState<'easy'|'medium'|'hard'>('medium');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiGeneratedOk, setAiGeneratedOk] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [expandPreview, setExpandPreview] = useState(false);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  useEffect(() => {
    if (!selectedStudent && students.length > 0) {
      setSelectedStudent(students[0]);
    }
  }, [students, selectedStudent]);

  useEffect(() => {
    // Carica studenti reali assegnati al tutor
    (async () => {
      try {
        const res = await tutorApi.getStudents();
        const fetched = (res?.students || []).map((s: any) => ({
          id: String(s.id),
          name: `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Studente',
          email: s.email || '',
          grade: s.school_level || ''
        }));
        setStudents(fetched);
      } catch (e) {
        console.error('Errore caricamento studenti tutor', e);
        setStudents([]);
      }
    })();
  }, []);

  const escapeHtml = (raw: string) =>
    raw
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');

  // Aggiunge automaticamente delimitatori LaTeX a righe che contengono \in, \infty, \frac, ecc.
  const autoWrapLatex = (line: string): string => {
    if (line.includes('$') || line.includes('\\(') || line.includes('\\[')) return line;
    const hasLatexToken = /\\(infty|in|frac|left|right|cup|cap|leq|geq|neq|sqrt|pm|cdot|times|forall|exists|to|lim|sum|prod|int|pi|approx)/.test(line) || /[\^_]/.test(line);
    if (!hasLatexToken) return line;
    const m = line.match(/^\s*(Disequazione|Soluzione)\s*:\s*(.*)$/i);
    if (m) {
      const head = m[1];
      const rest = m[2];
      return `${head}: \\(${rest}\\)`;
    }
    // Prova a isolare la parte matematica e lasciare il testo finale (es. "secondi") fuori dal math
    const wordAfterMath = line.match(/\s(?!\\)([A-Za-zÀ-ÿ]{3,})/);
    if (wordAfterMath) {
      const cut = wordAfterMath.index ?? -1;
      if (cut > 0) {
        const mathPart = line.slice(0, cut).trimEnd();
        const textPart = line.slice(cut).trimStart();
        return `\\(${mathPart}\\) ${textPart}`;
      }
    }
    return `\\(${line}\\)`;
  };

  // parse LaTeX delimiters and render with KaTeX in-place into HTML string
  const renderWithLatex = (raw: string): string => {
    const tokens: { open: string; close: string; display: boolean; }[] = [
      { open: '$$', close: '$$', display: true },
      { open: '\\(', close: '\\)', display: false },
      { open: '$', close: '$', display: false },
    ];
    let i = 0;
    let out = '';
    while (i < raw.length) {
      let nextIdx = -1; let t: any = null;
      for (const tk of tokens) {
        const idx = raw.indexOf(tk.open, i);
        if (idx !== -1 && (nextIdx === -1 || idx < nextIdx)) { nextIdx = idx; t = tk; }
      }
      if (nextIdx === -1 || !t) { out += escapeHtml(raw.slice(i)); break; }
      out += escapeHtml(raw.slice(i, nextIdx));
      const start = nextIdx + t.open.length;
      const end = raw.indexOf(t.close, start);
      if (end === -1) { out += escapeHtml(raw.slice(nextIdx)); break; }
      const expr = raw.slice(start, end);
      try {
        const w = window as any;
        if (w.katex && typeof w.katex.renderToString === 'function') {
          out += w.katex.renderToString(expr, { displayMode: t.display, throwOnError: false });
        } else {
          out += `<code class=\"text-pink-300\">${escapeHtml(expr)}</code>`;
        }
      } catch (_) {
        out += `<code class=\"text-pink-300\">${escapeHtml(expr)}</code>`;
      }
      i = end + t.close.length;
    }
    return out;
  };

  const buildPreviewHtml = (text: string) => {
    if (!text) return '<div class="text-white/50">Nessuna descrizione ancora disponibile.</div>';
    const lines = text.split('\n');
    let html = '';
    let inList = false;
    let inOl = false;
    for (let line of lines) {
      line = autoWrapLatex(line);
      const trimmed = line.trim();
      // Sezioni riconosciute con stile giocoso
      if (/^titolo\s*:/i.test(trimmed)) {
        if (inList) { html += '</ul>'; inList = false; }
        if (inOl) { html += '</ol>'; inOl = false; }
        const val = trimmed.replace(/^titolo\s*:/i, '').trim();
        html += `<div class=\"mb-2 flex items-center gap-2\"><span class=\"px-2 py-0.5 text-xs rounded-full bg-pink-500/20 text-pink-300 border border-pink-400/30\">Titolo</span><span class=\"font-semibold text-white\">${renderWithLatex(val)}</span></div>`;
        continue;
      }
      if (/^descrizione\s*:/i.test(trimmed)) {
        if (inList) { html += '</ul>'; inList = false; }
        if (inOl) { html += '</ol>'; inOl = false; }
        html += '<h4 class="mt-3 mb-2 text-white font-semibold flex items-center gap-2"><span class="text-yellow-300">🗒️</span><span>Descrizione</span></h4>';
        const val = trimmed.replace(/^descrizione\s*:/i, '').trim();
        if (val) html += `<p class=\"mb-2 leading-relaxed\">${renderWithLatex(val)}</p>`;
        continue;
      }
      if (/^istruzioni\s*:/i.test(trimmed)) {
        if (inList) { html += '</ul>'; inList = false; }
        if (inOl) { html += '</ol>'; inOl = false; }
        html += '<h4 class="mt-3 mb-2 text-white font-semibold flex items-center gap-2"><span class="text-blue-300">🧭</span><span>Istruzioni</span></h4>';
        const val = trimmed.replace(/^istruzioni\s*:/i, '').trim();
        if (val) html += `<p class=\"mb-2 leading-relaxed\">${renderWithLatex(val)}</p>`;
        continue;
      }
      if (trimmed.startsWith('- ')) {
        if (!inList) { html += '<ul class="list-disc pl-6 space-y-1">'; inList = true; }
        html += `<li><span class=\"inline-block w-2 h-2 rounded-full bg-cyan-400 mr-2 align-middle\"></span>${renderWithLatex(trimmed.slice(2))}</li>`;
      } else {
        if (inList) { html += '</ul>'; inList = false; }
        // ordered list tipo "1. " o "1) "
        const olMatch = trimmed.match(/^(\d+)[\.|\)]\s+(.*)$/);
        if (olMatch) {
          if (!inOl) { html += '<ol class="list-decimal pl-6 space-y-1">'; inOl = true; }
          html += `<li>${renderWithLatex(olMatch[2])}</li>`;
          continue;
        } else if (inOl) { html += '</ol>'; inOl = false; }
        if (/^soluzioni:?/i.test(trimmed)) {
          html += '<h4 class="mt-3 mb-2 text-white font-semibold">Soluzioni</h4>';
        } else if (trimmed.length > 0) {
          html += `<p class=\"mb-2 leading-relaxed\">${renderWithLatex(trimmed)}</p>`;
        } else {
          html += '<br />';
        }
      }
    }
    if (inList) html += '</ul>';
    if (inOl) html += '</ol>';
    return html;
  };

  // Render LaTeX (KaTeX) quando cambia la descrizione
  useEffect(() => {
    try {
      const w = window as any;
      if (w.renderMathInElement && previewRef.current) {
        w.renderMathInElement(previewRef.current, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '\\(', right: '\\)', display: false },
            { left: '$', right: '$', display: false },
            { left: '[latex]', right: '[/latex]', display: true }
          ],
          throwOnError: false
        });
      }
    } catch (_) {}
  }, [newAssignment.description, showPreview]);

  
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [assignmentToDelete, setAssignmentToDelete] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setUploadedFiles(prev => [...prev, ...filesArray]);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const createAssignment = async () => {
    if (!newAssignment.title || !newAssignment.description || !selectedStudent) {
      alert('Compila tutti i campi obbligatori e seleziona uno studente');
      return;
    }

    // Validazione data
    if (!newAssignment.dueDate) {
      alert('Seleziona una data di scadenza');
      return;
    }

    try {
      console.log('📝 Creazione compito...');
      
      // Valida la data
      const dueDate = new Date(newAssignment.dueDate!);
      if (isNaN(dueDate.getTime())) {
        alert('Data di scadenza non valida');
        return;
      }
      
      // Prepara i dati per l'API
      const assignmentData: AssignmentCreateData = {
        title: newAssignment.title!,
        description: newAssignment.description!,
        instructions: newAssignment.description!, // Usa la descrizione come istruzioni per ora
        subject: newAssignment.subject!,
        due_date: dueDate.toISOString(),
        points: newAssignment.points!,
        is_published: true,
        student_id: parseInt(selectedStudent.id)
      };

      console.log('📤 Invio dati compito:', assignmentData);

      // Chiama l'API per creare il compito
      const response = await assignmentApi.create(assignmentData);
      console.log('✅ Compito creato con successo:', response);

      // Aggiorna la lista locale
      const newAssignmentLocal: Assignment = {
        id: response.id.toString(),
        title: response.title,
        subject: response.subject,
        description: response.description,
        dueDate: new Date(response.due_date).toLocaleDateString('it-IT'),
        difficulty: 'medium', // Default per ora
        points: response.points,
        status: response.is_published ? 'published' : 'draft',
        attachments: uploadedFiles.length > 0 ? uploadedFiles.map(file => ({
          name: file.name,
          url: URL.createObjectURL(file),
          size: file.size
        })) : undefined
      };

      setAssignments(prev => [...prev, newAssignmentLocal]);
      
      // Reset form
      setNewAssignment({
        title: '',
        subject: 'Matematica',
        description: '',
        dueDate: '',
        difficulty: 'medium',
        points: 10,
        status: 'published'
      });
      setUploadedFiles([]);
      setShowCreateForm(false);
      setSelectedStudent(null);

      // Notifica la dashboard per ricaricare i dati
      window.dispatchEvent(new CustomEvent('assignmentCreated'));

      alert('✅ Compito assegnato allo studente con successo!');
    } catch (error) {
      console.error('❌ Errore creazione compito:', error);
      alert('❌ Errore durante la creazione del compito. Riprova.');
    }
  };

  const publishAssignment = (id: string) => {
    setAssignments(prev => 
      prev.map(assignment => 
        assignment.id === id ? { ...assignment, status: 'published' } : assignment
      )
    );
    alert('Compito pubblicato! Gli studenti riceveranno una notifica.');
  };

  const deleteAssignment = (id: string) => {
    setAssignmentToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (assignmentToDelete) {
      setAssignments(prev => prev.filter(assignment => assignment.id !== assignmentToDelete));
      setShowDeleteModal(false);
      setAssignmentToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setAssignmentToDelete(null);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-400 bg-cyan-500/20';
      case 'medium': return 'text-yellow-400 bg-yellow-500/20';
      case 'hard': return 'text-red-400 bg-red-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  const getDifficultyText = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'Facile';
      case 'medium': return 'Medio';
      case 'hard': return 'Difficile';
      default: return 'Sconosciuto';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            to="/tutor/dashboard" 
            className="inline-flex items-center text-white/70 hover:text-white transition-colors mb-4"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Torna alla Dashboard
          </Link>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-4 bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20">
                <div className="text-4xl">📝</div>
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">Assegna Compiti</h1>
                <p className="text-white/70 text-lg">Crea e gestisci i compiti per i tuoi studenti</p>
              </div>
            </div>
            
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all duration-300 transform hover:scale-105"
            >
              ➕ Nuovo Compito
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 text-center">
            <div className="text-3xl mb-2">📚</div>
            <div className="text-2xl font-bold text-white">{assignments.length}</div>
            <div className="text-white/70">Compiti Totali</div>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 text-center">
            <div className="text-3xl mb-2">✅</div>
            <div className="text-2xl font-bold text-white">{assignments.filter(a => a.status === 'published').length}</div>
            <div className="text-white/70">Pubblicati</div>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 text-center">
            <div className="text-3xl mb-2">👥</div>
            <div className="text-2xl font-bold text-white">{students.length}</div>
            <div className="text-white/70">Studenti</div>
          </div>
        </div>

        {/* Create Assignment Form */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white/10 backdrop-blur-lg rounded-3xl border border-white/20 p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-white mb-6">Crea Nuovo Compito</h2>
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-white/70 mb-2">Titolo</label>
                  <input
                    type="text"
                    value={newAssignment.title}
                    onChange={(e) => setNewAssignment(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                    placeholder="Es. Equazioni di Secondo Grado"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white/70 mb-2">Materia</label>
                    <select
                      value={newAssignment.subject}
                      onChange={(e) => setNewAssignment(prev => ({ ...prev, subject: e.target.value }))}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      <option value="Matematica">Matematica</option>
                      <option value="Fisica">Fisica</option>
                      <option value="Chimica">Chimica</option>
                      <option value="Italiano">Italiano</option>
                      <option value="Inglese">Inglese</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-white/70 mb-2">Difficoltà</label>
                    <select
                        value={aiDifficulty}
                        onChange={(e) => setAiDifficulty(e.target.value as any)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      <option value="easy">Facile</option>
                      <option value="medium">Medio</option>
                      <option value="hard">Difficile</option>
                    </select>
                  </div>
                </div>
                  <div>
                    <label className="block text-white/70 mb-2">Studente</label>
                    <select
                      value={selectedStudent?.id || ''}
                      onChange={(e) => {
                        const student = students.find(s => s.id === e.target.value);
                        setSelectedStudent(student || null);
                      }}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      {students.map(s => (
                        <option key={s.id} value={s.id}>{s.name} • {s.grade}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-white/70 mb-2">Data di scadenza</label>
                    <input
                      type="date"
                      value={newAssignment.dueDate}
                      onChange={(e) => setNewAssignment(prev => ({ ...prev, dueDate: e.target.value }))}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </div>

                {/* Anteprima Compito generata dall'AI */}
                <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-600/10 via-purple-600/10 to-pink-600/10 border border-white/10">
                  {/* Riga 1: titolo a sinistra, azioni a destra */}
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <h3 className="text-white font-semibold flex items-center gap-2 text-base md:text-lg">
                      <span>🧩</span> Anteprima Compito
                    </h3>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        disabled={isGenerating || !newAssignment.title}
                        onClick={async ()=>{
                          try{
                            if (!selectedStudent) { alert('Seleziona uno studente'); return; }
                            setIsGenerating(true);
                            const { data } = await apiClient.post('/assignments/generate', {
                              topic: newAssignment.title || '',
                              difficulty: aiDifficulty,
                              subject: newAssignment.subject || 'Matematica',
                              student_id: Number(selectedStudent?.id)||0,
                            });
                            if(data){
                              const title = sanitizeAi(data.title) || (newAssignment.title || '');
                              const parts: string[] = [];
                              if (data.description) parts.push(sanitizeAi(data.description));
                              if (data.instructions) parts.push('Istruzioni:\n' + sanitizeAi(data.instructions));
                              if (data.solutions) parts.push('Soluzioni:\n' + sanitizeAi(data.solutions));
                              const description = parts.join('\n\n');
                              setNewAssignment(prev=>({ ...prev, title, description }));
                              setAiGeneratedOk(true);
                              setTimeout(()=>setAiGeneratedOk(false), 1500);
                            } else {
                              alert('Errore generazione AI');
                            }
                          } catch (err:any) {
                            console.error('AI generate error', err);
                            alert(err?.response?.data?.detail || 'Errore generazione AI');
                          } finally { setIsGenerating(false); }
                        }}
                        className={`min-w-[150px] px-4 py-2 rounded-lg flex items-center justify-center gap-2 ${isGenerating? 'bg-white/20 text-white/60':'bg-purple-600 hover:bg-purple-700 text-white'}`}
                      >
                        {isGenerating && (
                          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                          </svg>
                        )}
                        {isGenerating? 'Generazione…' : '✨ Genera con AI'}
                      </button>
                      <button
                        onClick={async ()=>{
                          // crea compito su backend per lo studente selezionato
                          try {
                            if (!selectedStudent) { alert('Seleziona uno studente'); return; }
                            if (!newAssignment.title || !newAssignment.description) { alert('Titolo e contenuto mancanti'); return; }
                            const due = new Date();
                            due.setDate(due.getDate() + 7);
                            // invia datetime senza timezone per evitare confronto naive/aware nel backend
                            const dueStr = new Date(due.getTime() - due.getTimezoneOffset()*60000).toISOString().slice(0,19);
                            const payload = {
                              title: newAssignment.title,
                              description: newAssignment.description,
                              instructions: 'Segui le indicazioni nella descrizione.',
                              subject: newAssignment.subject || 'Matematica',
                              due_date: dueStr,
                              points: 100,
                              student_id: Number(selectedStudent?.id),
                              is_published: true
                            };
                            const res = await apiClient.post('/assignments', payload).catch((e:any)=>{
                              console.error('Assign API error:', e?.response?.data || e);
                              throw e;
                            });
                            if (res?.data?.id) {
                              alert('📤 Compito assegnato allo studente!');
                              setShowCreateForm(false);
                              // Notifica la dashboard per ricaricare i dati
                              window.dispatchEvent(new CustomEvent('assignmentCreated'));
                            } else {
                              alert('Errore creazione compito');
                            }
                          } catch (e:any) {
                            console.error('Errore assegnazione compito', e);
                            alert(e?.response?.data?.detail || 'Errore assegnazione compito');
                          }
                        }}
                        disabled={!newAssignment.description || !newAssignment.title}
                        className="min-w-[120px] px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        📤 Assegna
                      </button>
                    </div>
                  </div>
                  {/* Riga 2: chip materia e difficoltà sotto il titolo */}
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className="px-2 py-0.5 text-xs rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">{newAssignment.subject || 'Materia'}</span>
                    <span className={`px-2 py-0.5 text-xs rounded-full border ${aiDifficulty==='easy' ? 'bg-green-500/20 text-green-300 border-green-400/30' : aiDifficulty==='medium' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-400/30' : 'bg-red-500/20 text-red-300 border-red-400/30'}`}>{getDifficultyText(aiDifficulty)}</span>
                  </div>
                  {aiGeneratedOk && <div className="text-emerald-300 text-sm mb-2">Contenuto aggiornato ✓</div>}
                  <div className={`relative rounded-xl border border-white/15 bg-gradient-to-br from-gray-800/60 to-gray-800/30 p-4 text-white/90 ${expandPreview ? '' : 'max-h-60 overflow-hidden'}`}
                    ref={previewRef}
                    dangerouslySetInnerHTML={{ __html: buildPreviewHtml(newAssignment.description || '') }}
                  />
                  <div className="flex justify-end mt-2">
                    <button onClick={()=>setExpandPreview(v=>!v)} className="text-sm text-blue-300 hover:text-blue-200">
                      {expandPreview ? 'Mostra meno' : 'Mostra di più'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-4 mt-8">
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="px-6 py-3 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20 transition-all duration-300 border border-white/20"
                >
                  Annulla
                </button>
                <button
                  onClick={createAssignment}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all duration-300"
                >
                  Crea Compito
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Assignments List */}
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl border border-white/20 p-8">
          <h2 className="text-2xl font-bold text-white mb-6">I Tuoi Compiti</h2>
          
          <div className="space-y-6">
            {assignments.map((assignment) => (
              <div key={assignment.id} className="p-6 bg-white/5 rounded-2xl border border-white/20">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4 mb-2">
                      <h3 className="text-xl font-bold text-white">{assignment.title}</h3>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getDifficultyColor(assignment.difficulty)}`}>
                        {getDifficultyText(assignment.difficulty)}
                      </span>
                    </div>
                    <p className="text-white/70 mb-2">{assignment.description}</p>
                    <div className="flex items-center space-x-6 text-sm text-white/60 mb-3">
                      <span>📅 Scadenza: {new Date(assignment.dueDate).toLocaleDateString('it-IT')}</span>
                      <span>🎯 Punti: {assignment.points}</span>
                      <span>📚 {assignment.subject}</span>
                    </div>
                    
                    {/* Attachments Display */}
                    {assignment.attachments && assignment.attachments.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-white/10">
                        <p className="text-white/50 text-sm mb-2">📎 Allegati ({assignment.attachments.length}):</p>
                        <div className="flex flex-wrap gap-2">
                          {assignment.attachments.map((file, idx) => (
                            <a
                              key={idx}
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center space-x-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-400/30 rounded-lg px-3 py-2 text-sm text-blue-400 transition-all duration-300 group"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                              </svg>
                              <span className="truncate max-w-[150px]">{file.name}</span>
                              <span className="text-blue-400/60">({formatFileSize(file.size)})</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => deleteAssignment(assignment.id)}
                      className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-medium rounded-lg transition-colors border border-red-400/30"
                    >
                      🗑️ Elimina
                    </button>
                  </div>
                </div>
              </div>
            ))}
            
            {assignments.length === 0 && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📝</div>
                <h3 className="text-xl font-bold text-white mb-2">Nessun compito creato</h3>
                <p className="text-white/70 mb-6">Inizia creando il tuo primo compito per i tuoi studenti</p>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all duration-300"
                >
                  ➕ Crea Primo Compito
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Back Button */}
        <div className="flex justify-center mt-8">
          <Link
            to="/tutor/dashboard"
            className="px-8 py-4 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20 transition-all duration-300 border border-white/20"
          >
            🔙 Torna alla Dashboard
          </Link>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-gradient-to-br from-red-500/20 to-orange-500/20 backdrop-blur-xl rounded-3xl border-2 border-red-400/30 p-8 max-w-md w-full transform animate-in zoom-in-95 duration-300 shadow-2xl">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="w-20 h-20 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center animate-pulse">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="absolute inset-0 w-20 h-20 bg-red-500 rounded-full animate-ping opacity-20"></div>
              </div>
            </div>

            {/* Title */}
            <h3 className="text-2xl font-bold text-white text-center mb-4">
              ⚠️ Attenzione!
            </h3>

            {/* Message */}
            <p className="text-white/90 text-center mb-2 text-lg">
              Sei sicuro di voler eliminare questo compito?
            </p>
            <p className="text-white/60 text-center mb-8 text-sm">
              Questa azione è irreversibile e tutti i dati associati saranno persi.
            </p>

            {/* Assignment Info */}
            {assignmentToDelete && (
              <div className="bg-white/10 rounded-2xl p-4 mb-6 border border-white/20">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">
                      {assignments.find(a => a.id === assignmentToDelete)?.title}
                    </p>
                    <p className="text-white/60 text-sm">
                      {assignments.find(a => a.id === assignmentToDelete)?.subject}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex space-x-4">
              <button
                onClick={cancelDelete}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 border border-white/20"
              >
                ❌ Annulla
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-red-500/50"
              >
                🗑️ Elimina
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignmentsPage;
