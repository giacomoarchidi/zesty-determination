import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AgoraRTC, { 
  type IAgoraRTCClient, 
  type IAgoraRTCRemoteUser, 
  type ICameraVideoTrack,
  type IMicrophoneAudioTrack
} from 'agora-rtc-sdk-ng';
import { videoApi, type JoinRoomResponse, type QuizState } from '../../api/video';
import { useAuthStore } from '../../store/authStore';
import apiClient from '../../api/client';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

// Funzione per convertire delimitatori LaTeX: \( \) → $ e mantenere $$ per blocchi
const fixLatexDelimiters = (text: string): string => {
  let fixed = text;
  
  // Pattern 1: Converti ( formula ) in $formula$ per inline (solo se contiene simboli math)
  // Usa negative lookbehind (?<!\\) per non toccare \( già corretti
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

const VideoRoom: React.FC = () => {
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  const { user, loadProfile, isLoading: authLoading } = useAuthStore();
  
  // Agora states
  const [client, setClient] = useState<IAgoraRTCClient | null>(null);
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const [localVideoTrack, setLocalVideoTrack] = useState<ICameraVideoTrack | null>(null);
  const [localAudioTrack, setLocalAudioTrack] = useState<IMicrophoneAudioTrack | null>(null);
  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);
  
  // UI states
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining] = useState<string>('');
  const [quiz, setQuiz] = useState<QuizState>({ active: false, reveal: false, answers_count: {} });
  const [answerIndex, setAnswerIndex] = useState<number | null>(null);
  const [answerResult, setAnswerResult] = useState<boolean | null>(null);
  const [quizVisible, setQuizVisible] = useState<boolean>(false);
  const [showNotes, setShowNotes] = useState<boolean>(false);
  const [notesLines, setNotesLines] = useState<string[]>([]);
  const [notesHidden, setNotesHidden] = useState<boolean>(true);
  const [notesActive, setNotesActive] = useState<boolean>(false);
  // Salva il ruolo in un campo separato quando il componente si monta
  useEffect(() => {
    if (user?.role) {
      localStorage.setItem('current_user_role', user.role);
      console.log('💾 Ruolo salvato in localStorage:', user.role);
    }
  }, [user]);
  
  // Funzione per controllare dinamicamente se è tutor
  const checkIsTutor = () => {
    // Prova prima dallo store
    const currentUser = useAuthStore.getState().user;
    if (currentUser?.role) {
      const isTutorRole = currentUser.role.toLowerCase() === 'tutor';
      console.log('🔍 Check isTutor (da store):', { currentUser, role: currentUser.role, isTutorRole });
      return isTutorRole;
    }
    
    // Fallback 1: prova dal localStorage Zustand persist
    const storedUser = localStorage.getItem('auth-storage');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        const userRole = parsed?.state?.user?.role || parsed?.user?.role;
        if (userRole) {
          const isTutorRole = userRole.toLowerCase() === 'tutor';
          console.log('🔍 Check isTutor (da localStorage Zustand):', { userRole, isTutorRole });
          return isTutorRole;
        }
      } catch (e) {
        console.error('❌ Errore parsing localStorage Zustand:', e);
      }
    }
    
    // Fallback 2: prova dal campo separato
    const savedRole = localStorage.getItem('current_user_role');
    if (savedRole) {
      const isTutorRole = savedRole.toLowerCase() === 'tutor';
      console.log('🔍 Check isTutor (da current_user_role):', { savedRole, isTutorRole });
      return isTutorRole;
    }
    
    console.log('❌ Impossibile determinare ruolo utente - tutti i fallback falliti');
    console.log('   Store:', useAuthStore.getState().user);
    console.log('   LocalStorage auth-storage:', localStorage.getItem('auth-storage'));
    console.log('   LocalStorage current_user_role:', localStorage.getItem('current_user_role'));
    return false;
  };
  
  // Calcola isTutor dinamicamente quando user cambia
  const isTutor = useMemo(() => {
    const result = (user?.role || '').toLowerCase() === 'tutor';
    console.log('🔄 isTutor ricalcolato:', { userRole: user?.role, isTutor: result });
    return result;
  }, [user]);
  
  // States per trascrizione e riconoscimento speaker
  const [showNotesConfirmModal, setShowNotesConfirmModal] = useState<boolean>(false);
  const [generatedNotes, setGeneratedNotes] = useState<string>('');
  const [isGeneratingNotes, setIsGeneratingNotes] = useState<boolean>(false);
  const [notesEditable, setNotesEditable] = useState<string>('');
  const [notesViewMode, setNotesViewMode] = useState<'preview' | 'edit'>('preview'); // Toggle per visualizzazione appunti
  const recognitionRef = useRef<any>(null);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [interimText, setInterimText] = useState<string>('');
  const [fullTranscript, setFullTranscript] = useState<string>(''); // Trascrizione completa accumulata
  const [currentSpeaker, setCurrentSpeaker] = useState<'tutor' | 'student'>('tutor'); // Chi sta parlando
  const [localVolume, setLocalVolume] = useState<number>(0); // Volume audio locale (tutor)
  const [remoteVolume, setRemoteVolume] = useState<number>(0); // Volume audio remoto (studente)
  
  // Forza il caricamento del profilo utente se non è presente
  useEffect(() => {
    const loadUserProfile = async () => {
      const token = localStorage.getItem('access_token');
      console.log('🔍 Check token:', { hasToken: !!token, token: token?.substring(0, 20) + '...' });
      
      // Pulisci token invalidi (stringa "undefined", "null", troppo corti)
      if (token === 'undefined' || token === 'null' || (token && token.length < 20)) {
        console.log('🧹 Token invalido rilevato, pulisco localStorage');
        localStorage.removeItem('access_token');
        localStorage.removeItem('current_user_role');
        navigate('/login');
        return;
      }
      
      if (!token) {
        console.log('❌ Nessun token trovato - Redirect al login');
        navigate('/login');
        return;
      }
      
      if (!user && !authLoading) {
        console.log('⚠️ User non presente ma token esiste, carico profilo...');
        await loadProfile();
        const loadedUser = useAuthStore.getState().user;
        console.log('✅ Profilo caricato:', loadedUser);
        
        if (!loadedUser) {
          console.log('❌ loadProfile fallito - Redirect al login');
          navigate('/login');
        }
      }
    };
    loadUserProfile();
  }, [user, authLoading, loadProfile, navigate]);
  
  // Debug log all'avvio
  useEffect(() => {
    console.log('🔍 VideoRoom - Informazioni utente:', {
      user: user,
      role: user?.role,
      isTutor: isTutor,
      email: user?.email
    });
    
    console.log('🔍 isTutor determination:', {
      userRole: user?.role,
      userRoleLowerCase: (user?.role || '').toLowerCase(),
      isTutor: isTutor,
      shouldShowControls: isTutor ? 'YES - Mostra controlli tutor' : 'NO - Nascondi controlli tutor'
    });
  }, [user, isTutor]);
  
  // Auto-detect chi sta parlando basandosi sul volume
  useEffect(() => {
    if (!isRecording || !isTranscribing) return;
    
    // Se il volume locale è significativamente più alto → Tutor parla
    // Se il volume remoto è significativamente più alto → Studente parla
    const threshold = 10; // Soglia minima di volume per considerare qualcuno "sta parlando"
    
    if (localVolume > threshold && localVolume > remoteVolume * 1.5) {
      // Tutor sta parlando
      if (currentSpeaker !== 'tutor') {
        console.log('🎙️ Auto-detect: TUTOR sta parlando (volume:', localVolume, ')');
        setCurrentSpeaker('tutor');
      }
    } else if (remoteVolume > threshold && remoteVolume > localVolume * 1.5) {
      // Studente sta parlando
      if (currentSpeaker !== 'student') {
        console.log('🎙️ Auto-detect: STUDENTE sta parlando (volume:', remoteVolume, ')');
        setCurrentSpeaker('student');
      }
    }
  }, [localVolume, remoteVolume, isRecording, isTranscribing, currentSpeaker]);
  
  // Refs
  const localVideoRef = useRef<HTMLDivElement>(null);
  const remoteVideoRef = useRef<HTMLDivElement>(null);

  // Join room data
  const [joinData, setJoinData] = useState<JoinRoomResponse | null>(null);

  // Load join room data
  useEffect(() => {
    const loadJoinData = async () => {
      if (!lessonId) return;
      
      try {
        setIsLoading(true);
        const data = await videoApi.joinRoom(Number(lessonId));
        setJoinData(data);
      } catch (err: any) {
        console.error('Errore join room:', err);
        setError(err.response?.data?.detail || 'Errore nel join della video room');
        setIsLoading(false);
      }
    };

    loadJoinData();
  }, [lessonId]);

  // Initialize Agora client
  useEffect(() => {
    if (!joinData) return;

    const initAgora = async () => {
      try {
        // Create Agora client
        const agoraClient = AgoraRTC.createClient({
          mode: 'rtc',
          codec: 'vp8'
        });

        // Create local tracks
        const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks(
          {},
          {
            encoderConfig: '720p_1'
          }
        );

        clientRef.current = agoraClient;
        setClient(agoraClient);
        setLocalVideoTrack(videoTrack);
        setLocalAudioTrack(audioTrack);

        // Set up event listeners
        agoraClient.on('user-published', handleUserPublished);
        agoraClient.on('user-unpublished', handleUserUnpublished);
        agoraClient.on('user-left', handleUserLeft);
        
        // Abilita volume indicator per riconoscere chi sta parlando
        agoraClient.enableAudioVolumeIndicator();
        
        // Listener per volume (per auto-detect chi sta parlando)
        agoraClient.on('volume-indicator', (volumes) => {
          volumes.forEach((volume: any) => {
            if (volume.level > 0) {
              if (volume.uid === 0) {
                // Volume locale (tutor)
                setLocalVolume(volume.level);
              } else {
                // Volume remoto (studente)
                setRemoteVolume(volume.level);
              }
            }
          });
        });

        // Join channel
        console.log('🚨🚨🚨 [AGORA DEBUG] Dati join room:', {
          app_id: joinData.app_id,
          channel: joinData.channel,
          uid: joinData.uid,
          token: joinData.token?.substring(0, 20) + '...',
          lessonId: lessonId,
          userRole: user?.role,
          userEmail: user?.email
        });
        alert(`🚨🚨🚨 AGORA DEBUG 🚨🚨🚨\nChannel: ${joinData.channel}\nUID: ${joinData.uid}\nLesson: ${lessonId}\nRole: ${user?.role}\nTimestamp: ${Date.now()}`);
        console.log('🚨🚨🚨 [AGORA DEBUG] Dati join room:', {
          app_id: joinData.app_id,
          channel: joinData.channel,
          uid: joinData.uid,
          token: joinData.token?.substring(0, 20) + '...',
          lessonId: lessonId,
          userRole: user?.role,
          userEmail: user?.email
        });
        
        // Lasciare Agora scegliere l'UID reale per evitare conflitti
        const actualUid = await agoraClient.join(
          joinData.app_id,
          joinData.channel,
          joinData.token,
          joinData.uid
        );
        
        console.log('✅ [AGORA DEBUG] JOIN COMPLETATO:', {
          channel: joinData.channel,
          uid: actualUid,
          userRole: user?.role,
          lessonId: lessonId
        });

        // Publish local tracks
        await agoraClient.publish([audioTrack, videoTrack]);
        console.log('✅ Track pubblicati sul channel');

        // Play local video - aspetta un momento che il DOM sia pronto
        setTimeout(() => {
          if (localVideoRef.current) {
            console.log('▶️ Playing local video nel div:', localVideoRef.current);
            try {
              videoTrack.play(localVideoRef.current, { fit: 'cover' });
              console.log('✅ Video.play() chiamato');
              
              // Verifica che il video sia realmente visibile
              setTimeout(() => {
                const videoElement = localVideoRef.current?.querySelector('video');
                if (videoElement) {
                  console.log('✅ Elemento <video> trovato nel DOM:', {
                    width: videoElement.videoWidth,
                    height: videoElement.videoHeight,
                    paused: videoElement.paused
                  });
                } else {
                  console.warn('⚠️ Elemento <video> NON trovato nel DOM!');
                }
              }, 500);
            } catch (e) {
              console.error('❌ Errore durante play():', e);
            }
          } else {
            console.warn('⚠️ localVideoRef.current è null!');
          }
        }, 100);

        setIsLoading(false);
        setError(null);
        console.log('✅ Agora inizializzato con successo!');

      } catch (err: any) {
        console.error('❌ Errore inizializzazione Agora:', err);
        setError('Errore nella connessione video');
        setIsLoading(false);
      }
    };

    initAgora();

    // Cleanup on unmount
    return () => {
      console.log('🧹 Cleanup video room...');
      
      // Stop e chiudi tutti i track
      if (localVideoTrack) {
        localVideoTrack.stop();
        localVideoTrack.close();
        console.log('✅ Local video track chiuso nel cleanup');
      }
      if (localAudioTrack) {
        localAudioTrack.stop();
        localAudioTrack.close();
        console.log('✅ Local audio track chiuso nel cleanup');
      }
      
      // Leave dal channel
      if (clientRef.current) {
        clientRef.current.leave().catch(e => console.log('Errore leave (ignorato):', e));
        clientRef.current.removeAllListeners();
        console.log('✅ Client Agora pulito');
      }
      clientRef.current = null;
      setClient(null);
    };
  }, [joinData]);

  // Reset su nuova lezione
  useEffect(() => {
    setShowNotes(false);
    setNotesHidden(true);
    setNotesLines([]);
    setAnswerIndex(null);
    setAnswerResult(null);
    try {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
        setIsTranscribing(false);
      }
    } catch (_) {}
  }, [lessonId]);

  // Poll quiz and notes state ogni 2s
  useEffect(() => {
    if (!lessonId) return;
    let timer: any;
    const tick = async () => {
      try {
        const [q, n] = await Promise.all([
          videoApi.getQuiz(Number(lessonId)),
          videoApi.getNotes(Number(lessonId))
        ]);
        setQuiz(q);
        setNotesActive(Boolean(n.active));
        setNotesLines(prev => {
          const backendLines = n.lines || [];
          if (isTranscribing) return prev; // non toccare mentre stiamo trascrivendo
          if (backendLines.length > prev.length) return backendLines; // aggiorna solo se ci sono più righe
          return prev;
        });
        // Mostra se attivo o se ci sono note (ma non forzare se nascosto manualmente)
        setShowNotes(notesHidden ? false : (Boolean(n.active) || ((n.lines || []).length > 0)));
      } catch (e) {
        // ignora errori transitori
      } finally {
        timer = setTimeout(tick, 2000);
      }
    };
    tick();
    return () => timer && clearTimeout(timer);
  }, [lessonId, notesHidden]);

  // Mostra quiz solo al cambio stato (false -> true). Se l'utente chiude, non riaprirlo finché non c'è un nuovo quiz
  const prevQuizActiveRef = useRef<boolean>(false);
  useEffect(() => {
    if (quiz.active && !prevQuizActiveRef.current) {
      // attivato ora → mostra overlay e reset risposte locali
      setQuizVisible(true);
      setAnswerIndex(null);
      setAnswerResult(null);
    }
    if (!quiz.active && prevQuizActiveRef.current) {
      // disattivato ora → chiudi overlay
      setQuizVisible(false);
      setAnswerIndex(null);
      setAnswerResult(null);
    }
    prevQuizActiveRef.current = quiz.active;
  }, [quiz.active]);

  // Event handlers
  const handleUserPublished = async (user: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => {
    console.log('🔍 [AGORA DEBUG] Utente connesso:', {
      uid: user.uid,
      mediaType: mediaType,
      channel: joinData?.channel,
      currentUserRole: user?.role,
      lessonId: lessonId
    });
    
    await clientRef.current?.subscribe(user, mediaType);
    
    if (mediaType === 'video' && user.videoTrack) {
      setRemoteUsers(prev => [...prev, user]);
      if (remoteVideoRef.current) {
        user.videoTrack.play(remoteVideoRef.current);
      }
      console.log('✅ [AGORA DEBUG] Video remoto riprodotto per UID:', user.uid);
    }
    
    if (mediaType === 'audio' && user.audioTrack) {
      user.audioTrack.play();
      console.log('✅ [AGORA DEBUG] Audio remoto riprodotto per UID:', user.uid);
    }
  };

  const handleUserUnpublished = (user: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => {
    console.log('🔍 [AGORA DEBUG] Utente disconnesso (unpublished):', {
      uid: user.uid,
      mediaType: mediaType,
      channel: joinData?.channel
    });
    
    if (mediaType === 'video') {
      setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
    }
  };

  const handleUserLeft = (user: IAgoraRTCRemoteUser) => {
    console.log('🔍 [AGORA DEBUG] Utente uscito completamente:', {
      uid: user.uid,
      channel: joinData?.channel
    });
    
    setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
  };

  // Control handlers
  const toggleVideo = async () => {
    console.log('📹 Toggle video, stato attuale:', isVideoOn);
    if (localVideoTrack) {
      if (isVideoOn) {
        await localVideoTrack.setEnabled(false);
        console.log('📹 Video disabilitato');
      } else {
        await localVideoTrack.setEnabled(true);
        console.log('📹 Video abilitato');
      }
      setIsVideoOn(!isVideoOn);
    } else {
      console.warn('⚠️ localVideoTrack è null!');
    }
  };

  const toggleAudio = async () => {
    console.log('🎤 Toggle audio, stato attuale:', isAudioOn);
    if (localAudioTrack) {
      if (isAudioOn) {
        await localAudioTrack.setEnabled(false);
        console.log('🎤 Audio disabilitato');
      } else {
        await localAudioTrack.setEnabled(true);
        console.log('🎤 Audio abilitato');
      }
      setIsAudioOn(!isAudioOn);
    } else {
      console.warn('⚠️ localAudioTrack è null!');
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const screenTrack = await AgoraRTC.createScreenVideoTrack({}, "auto");
        if (localVideoTrack) {
          await client?.unpublish([localVideoTrack]);
          localVideoTrack.close();
        }
        await client?.publish([screenTrack]);
        setLocalVideoTrack(screenTrack);
        if (localVideoRef.current) {
          screenTrack.play(localVideoRef.current);
        }
        setIsScreenSharing(true);
      } else {
        const cameraTrack = await AgoraRTC.createCameraVideoTrack();
        if (localVideoTrack) {
          await client?.unpublish([localVideoTrack]);
          localVideoTrack.close();
        }
        await client?.publish([cameraTrack]);
        setLocalVideoTrack(cameraTrack);
        if (localVideoRef.current) {
          cameraTrack.play(localVideoRef.current);
        }
        setIsScreenSharing(false);
      }
    } catch (err) {
      console.error('Errore screen sharing:', err);
    }
  };

  const toggleRecording = async () => {
    try {
      if (!isRecording) {
        // Avvia o riprendi la registrazione
        await videoApi.startRecording(Number(lessonId));
        setIsRecording(true);
        
        // Avvia appunti AI in background (non mostrare box)
        try {
          const data = await videoApi.startNotes(Number(lessonId));
          setNotesActive(true);
          if (data.lines) setNotesLines(data.lines);
        } catch (_) {}
        
        // Avvia o riprendi trascrizione locale se disponibile
        try {
          const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
          if (SpeechRecognition && !recognitionRef.current) {
            // Crea SpeechRecognition solo se non esiste già
            const rec = new SpeechRecognition();
            rec.lang = 'it-IT';
            rec.continuous = true;
            rec.interimResults = true;
            
            rec.onresult = (event: any) => {
              let finalText = '';
              for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                  finalText += transcript.trim() + ' ';
                }
              }
              if (finalText) {
                // Aggiungi prefisso parlante (solo se tutor - gli studenti non possono registrare)
                const speaker = currentSpeaker === 'tutor' ? 'TUTOR' : 'STUDENTE';
                const labeledText = `${speaker}: ${finalText}`;
                
                // Aggiungi alla trascrizione completa
                setFullTranscript(prev => prev + labeledText);
                // Aggiungi anche alle note visuali
                setNotesLines(prev => [...prev, labeledText.trim()].slice(-200));
              }
            };
            
            rec.onerror = (event: any) => {
              console.log('⚠️ Speech recognition error:', event.error);
            };
            
            rec.onend = () => {
              setIsTranscribing(false);
              console.log('🎙️ Speech recognition terminato');
            };
            
            recognitionRef.current = rec;
            rec.start();
            setIsTranscribing(true);
            console.log('🎙️ Trascrizione avviata' + (fullTranscript.length > 0 ? ' (continua da ' + fullTranscript.length + ' caratteri)' : ''));
          }
        } catch (e) {
          console.log('⚠️ Trascrizione non disponibile:', e);
        }
      } else {
        // FERMA completamente la registrazione e la trascrizione
        await videoApi.stopRecording(Number(lessonId));
        setIsRecording(false);
        
        // Ferma appunti AI
        try {
          const data = await videoApi.stopNotes(Number(lessonId));
          setNotesActive(false);
          if (data.lines) setNotesLines(data.lines);
        } catch (_) {}
        
        // FERMA completamente il speech recognition
        try {
          if (recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current = null;
            setIsTranscribing(false);
            console.log('⏸️ Registrazione fermata - Trascrizione salvata: ' + fullTranscript.length + ' caratteri');
            console.log('📝 Anteprima: ' + fullTranscript.substring(0, 100) + '...');
          }
        } catch (_) {}
      }
    } catch (err) {
      console.error('Errore recording:', err);
    }
  };

  // Quiz handlers
  const launchSampleQuiz = async () => {
    if (!lessonId) return;
    try {
      const data = await videoApi.launchQuiz(Number(lessonId), {
        question: 'Quanto fa 7 × 8?',
        options: ['52', '54', '56', '58'],
        correct_index: 2
      });
      setQuiz(data);
      setAnswerIndex(null);
    } catch (e) {
      console.error('Errore launch quiz', e);
    }
  };

  const answerQuiz = async (idx: number) => {
    if (!lessonId) return;
    try {
      const res = await videoApi.answerQuiz(Number(lessonId), { answer_index: idx });
      setAnswerIndex(idx);
      setAnswerResult(res.correct ?? null);
    } catch (e) {
      console.error('Errore answer quiz', e);
    }
  };

  const closeQuiz = async () => {
    if (!lessonId) return;
    try {
      const data = await videoApi.closeQuiz(Number(lessonId));
      setQuiz(data);
      // manteniamo answerIndex/answerResult per mostrare esito anche dopo reveal
    } catch (e) {
      console.error('Errore close quiz', e);
    }
  };

  // Notes handlers (tutor)
  const startNotes = async () => {
    if (!lessonId) return;
    try {
      const data = await videoApi.startNotes(Number(lessonId));
      setNotesHidden(false);
      setShowNotes(true);
      setNotesLines(data.lines);
    } catch (e) {
      console.error('Errore start notes', e);
    }
  };

  const stopNotes = async () => {
    if (!lessonId) return;
    try {
      const data = await videoApi.stopNotes(Number(lessonId));
      setNotesLines(data.lines);
      setShowNotes(false);
    } catch (e) {
      console.error('Errore stop notes', e);
    }
  };

  const leaveRoom = async () => {
    try {
      console.log('📤 Richiesta uscita dalla video room...');
      
      // Ferma la trascrizione se attiva
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
          recognitionRef.current = null;
          setIsTranscribing(false);
          console.log('✅ Trascrizione fermata');
        } catch (_) {}
      }
      
      // Controlla dinamicamente il ruolo
      const isTutorNow = checkIsTutor();
      
      // Log per debug
      console.log('🔍 Debug uscita:', {
        isTutorStatic: isTutor,
        isTutorDynamic: isTutorNow,
        hasTranscript: !!fullTranscript,
        transcriptLength: fullTranscript.length,
        willShowModal: fullTranscript && fullTranscript.length > 50
      });
      
      // MOSTRA SEMPRE il modale se c'è trascrizione (indipendentemente dal ruolo)
      // Poi nel backend verificheremo che sia effettivamente il tutor
      if (fullTranscript && fullTranscript.length > 50) {
        console.log('📝 Generazione appunti dalla trascrizione...');
        setIsGeneratingNotes(true);
        setShowNotesConfirmModal(true);
        
        // Genera appunti con OpenAI
        try {
          console.log('📤 Invio richiesta a /video/generate-notes...');
          const response = await apiClient.post('/video/generate-notes', {
            lesson_id: Number(lessonId),
            transcript: fullTranscript
          });
          
          console.log('📥 Risposta ricevuta:', response.data);
          const notes = response.data?.notes || fullTranscript;
          setGeneratedNotes(notes);
          setNotesEditable(notes);
          setIsGeneratingNotes(false);
          console.log('✅ Appunti generati con successo - lunghezza:', notes.length);
        } catch (e: any) {
          console.error('❌ Errore generazione appunti:', e);
          console.error('❌ Dettagli errore:', e.response?.data);
          // Fallback: usa la trascrizione diretta
          setGeneratedNotes(fullTranscript);
          setNotesEditable(fullTranscript);
          setIsGeneratingNotes(false);
        }
        
        // Il modale è aperto - l'uscita vera avverrà dopo la conferma
        return;
      }
      
      // Se non è tutor o non c'è trascrizione, esci direttamente
      await performLeaveRoom();
      
    } catch (err) {
      console.error('❌ Errore leave room:', err);
      // Prova comunque a navigare
      navigate(-1);
    }
  };
  
  // Funzione separata per uscire effettivamente dalla room
  const performLeaveRoom = async () => {
    try {
      // Stop e chiudi tutti i track locali
      if (localVideoTrack) {
        localVideoTrack.stop();
        localVideoTrack.close();
        console.log('✅ Video track chiuso');
      }
      if (localAudioTrack) {
        localAudioTrack.stop();
        localAudioTrack.close();
        console.log('✅ Audio track chiuso');
      }
      
      // Leave dal channel Agora
      if (clientRef.current) {
        await clientRef.current.leave();
        clientRef.current.removeAllListeners();
        console.log('✅ Uscito dal channel Agora');
      }
      clientRef.current = null;
      setClient(null);
      
      // Naviga alla dashboard appropriata
      // Usa direttamente user.role dall'authStore (più affidabile)
      const userRole = useAuthStore.getState().user?.role?.toLowerCase();
      const isTutorRole = userRole === 'tutor';
      
      console.log('🔍 Debug navigazione:', {
        userRole: userRole,
        isTutorRole: isTutorRole,
        destination: isTutorRole ? 'tutor/dashboard' : 'student/dashboard'
      });
      
      if (isTutorRole) {
        console.log('✅ Navigazione verso dashboard TUTOR');
        navigate('/tutor/dashboard');
      } else {
        console.log('✅ Navigazione verso dashboard STUDENTE');
        navigate('/student/dashboard');
      }
    } catch (err) {
      console.error('❌ Errore leave room:', err);
      navigate(-1);
    }
  };

  // Aspetta che user sia caricato
  if (!user || authLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">Caricamento profilo utente...</p>
        </div>
      </div>
    );
  }
  
  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">Connessione alla video room...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center bg-gray-800 p-8 rounded-lg">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-white text-2xl mb-4">Errore Connessione</h2>
          <p className="text-gray-300 mb-6">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Torna Indietro
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 p-4 flex justify-between items-center">
        <div className="text-white">
          <h1 className="text-xl font-bold">Video Lezione</h1>
          <p className="text-sm text-gray-300">Lezione #{lessonId}</p>
        </div>
        <div className="flex items-center gap-3">
          <>
            {/* Lancia quiz - Solo Tutor */}
            {isTutor && (
              <button
                onClick={launchSampleQuiz}
                className={"px-3 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 text-sm"}
              >
                Lancia quiz
              </button>
            )}
            
            {/* Indicatore Chi Sta Parlando - Solo Tutor durante registrazione */}
            {isTutor && isRecording && isTranscribing && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800/90 border border-white/20 animate-pulse">
                <span className="text-white/70 text-sm">🎙️ Sta parlando:</span>
                <span className={`px-3 py-1 rounded-lg text-sm font-bold ${
                  currentSpeaker === 'tutor'
                    ? 'bg-blue-500 text-white'
                    : 'bg-green-500 text-white'
                }`}>
                  {currentSpeaker === 'tutor' ? '👨‍🏫 Tutor' : '🎓 Studente'}
                </span>
              </div>
            )}
            {fullTranscript.length > 0 || notesLines.length > 0 ? (
              <button
                onClick={() => { 
                  setNotesHidden(false); 
                  setShowNotes(true); 
                }}
                className="px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-sm flex items-center gap-2"
              >
                <span>📝</span>
                <span>Mostra Trascrizione</span>
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                  {fullTranscript.length}
                </span>
              </button>
            ) : (
              <button
                onClick={() => { 
                  setNotesHidden(false); 
                  setShowNotes(true); 
                }}
                className="px-3 py-2 rounded-lg bg-gray-600 text-white/60 hover:bg-gray-500 text-sm"
                disabled
              >
                📝 Nessuna trascrizione
              </button>
            )}
          </>
          <div className="text-white text-right">
            <p className="text-sm">{timeRemaining}</p>
            <p className="text-xs text-gray-400">Partecipanti: {remoteUsers.length + 1}</p>
          </div>
        </div>
      </div>

      {/* Video Grid */}
      <div className="p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          {/* Local Video */}
          <div className="relative bg-gray-800 rounded-lg overflow-hidden">
            <div 
              ref={localVideoRef} 
              className="w-full h-64 lg:h-96"
              style={{ minHeight: '256px', backgroundColor: '#1f2937' }}
            >
              {/* Placeholder quando non c'è video */}
              {!isVideoOn && (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-6xl">📹</div>
                </div>
              )}
            </div>
            
            {/* Nome utente */}
            <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
              {user?.first_name} {user?.last_name} (Tu)
            </div>
            
            {/* Indicatori stato microfono e video */}
            <div className="absolute top-2 right-2 flex space-x-2">
              {!isAudioOn && (
                <div className="bg-red-600 text-white px-3 py-2 rounded-lg shadow-lg flex items-center space-x-1 animate-pulse">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-bold">Muto</span>
                </div>
              )}
              {!isVideoOn && (
                <div className="bg-red-600 text-white px-3 py-2 rounded-lg shadow-lg flex items-center space-x-1">
                  <span className="text-sm font-bold">📹 OFF</span>
                </div>
              )}
            </div>
          </div>

          {/* Remote Video */}
          <div className="relative bg-gray-800 rounded-lg overflow-hidden">
            {remoteUsers.length > 0 ? (
              <div ref={remoteVideoRef} className="w-full h-64 lg:h-96" />
            ) : (
              <div className="w-full h-64 lg:h-96 flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <div className="text-6xl mb-2">👤</div>
                  <p>In attesa di partecipanti...</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="bg-gray-800 rounded-lg p-4">
          {/* Indicatore Trascrizione - mostra SOLO quando sta registrando */}
          {isRecording && isTranscribing && (
            <div className="mb-4 flex items-center justify-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-600/20 border-2 border-red-500">
                <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
                <span className="text-white text-sm font-medium">
                  🎙️ Trascrizione in corso
                </span>
                <span className="text-white/60 text-xs">
                  ({fullTranscript.length} caratteri)
                </span>
              </div>
            </div>
          )}
          
          <div className="flex justify-center flex-wrap gap-4">
            {/* Video Toggle */}
            <button
              onClick={toggleVideo}
              className={`p-3 rounded-full ${
                isVideoOn ? 'bg-blue-600 text-white' : 'bg-red-600 text-white'
              } hover:opacity-80 transition-opacity`}
              title={isVideoOn ? 'Disattiva video' : 'Attiva video'}
            >
              {isVideoOn ? '📹' : '📹'}
            </button>

            {/* Audio Toggle */}
            <button
              onClick={toggleAudio}
              className={`p-3 rounded-full ${
                isAudioOn ? 'bg-blue-600 text-white' : 'bg-red-600 text-white'
              } hover:opacity-80 transition-opacity`}
              title={isAudioOn ? 'Disattiva microfono' : 'Attiva microfono'}
            >
              {isAudioOn ? '🎤' : '🎤'}
            </button>

            {/* Screen Share - Solo Tutor */}
            {isTutor && (
              <button
                onClick={toggleScreenShare}
                className={`p-3 rounded-full ${
                  isScreenSharing ? 'bg-cyan-600 text-white' : 'bg-gray-600 text-white'
                } hover:opacity-80 transition-opacity`}
                title={isScreenSharing ? 'Ferma condivisione' : 'Condividi schermo'}
              >
                📺
              </button>
            )}

            {/* Recording con indicatore stato - Solo Tutor */}
            {isTutor && (
              <button
                onClick={toggleRecording}
                className={`relative p-3 rounded-full ${
                  isRecording ? 'bg-red-600 text-white animate-pulse' : 'bg-gray-600 text-white'
                } hover:opacity-80 transition-opacity`}
                title={isRecording ? 'Pausa registrazione' : fullTranscript.length > 0 ? 'Riprendi registrazione' : 'Avvia registrazione'}
              >
                {isRecording ? '🔴' : fullTranscript.length > 0 ? '⏸️' : '⚫'}
              </button>
            )}

            {/* Leave Room - Solo Tutor */}
            {isTutor && (
              <button
                onClick={leaveRoom}
                className="p-3 rounded-full bg-red-600 text-white hover:opacity-80 transition-opacity"
                title="Termina e salva lezione"
              >
                📞
              </button>
            )}
          </div>
        </div>

        {/* Overlay Quiz */}
        {quizVisible && quiz.active && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-30">
            <div className="bg-gray-800 text-white p-6 rounded-2xl w-full max-w-xl shadow-2xl border border-white/10">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-bold">Quiz</h3>
                  {answerResult !== null && (
                    <span className={answerResult ? 'text-emerald-400 text-2xl' : 'text-red-400 text-2xl'}>
                      {answerResult ? '🙂' : '🙁'}
                    </span>
                  )}
                </div>
                <button onClick={() => { setQuizVisible(false); }} className="text-gray-400 hover:text-white">✕</button>
              </div>
              <p className="text-lg font-semibold mb-4">{quiz.question}</p>
              <div className="space-y-2">
                {(quiz.options || []).map((opt, idx) => {
                  const count = quiz.answers_count?.[idx] || 0;
                  const selected = answerIndex === idx;
                  const isCorrectSel = selected && answerResult === true;
                  const isWrongSel = selected && answerResult === false;
                  return (
                    <button
                      key={idx}
                      onClick={() => answerQuiz(idx)}
                      disabled={answerIndex !== null}
                      className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                        isCorrectSel ? 'border-emerald-400 bg-emerald-500/10' : isWrongSel ? 'border-red-400 bg-red-500/10' : selected ? 'border-purple-400 bg-white/5' : 'border-white/10 hover:bg-white/5'
                      } ${answerIndex !== null ? 'cursor-not-allowed opacity-90' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{String.fromCharCode(65 + idx)}. {opt}</span>
                        <span className="text-xs text-white/60">{count}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
              {(quiz.reveal || answerResult !== null) && answerIndex !== null && (
                <div className="mt-4">
                  <div className="px-4 py-3 rounded-lg bg-black/30 border border-white/10">
                    <div className="flex items-center gap-2">
                      <span className={answerResult ? 'text-emerald-400' : 'text-red-400'}>
                        {answerResult ? '✅ Risposta corretta!' : '❌ Risposta errata'}
                      </span>
                      {!quiz.reveal && (
                        <span className="text-xs text-white/50">(risultato personale, il tutor può rivelare a tutti)</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pannello Appunti (bottom dock) */}
        {((showNotes || notesLines.length > 0 || fullTranscript.length > 0) && !notesHidden) && (
          <div className="fixed left-0 right-0 bottom-0 z-20">
            <div className="mx-auto max-w-5xl m-4 p-4 rounded-2xl bg-gray-800/95 text-white border border-white/10 shadow-2xl">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-emerald-300">
                  <span>📝</span>
                  <span className="font-semibold">Trascrizione Completa</span>
                  {isRecording && isTranscribing ? (
                    <span className="text-xs text-emerald-400 animate-pulse">🎙️ registrando…</span>
                  ) : fullTranscript.length > 0 ? (
                    <span className="text-xs text-white/50">✅ {fullTranscript.length} caratteri salvati</span>
                  ) : (
                    <span className="text-xs text-white/50">in attesa...</span>
                  )}
                </div>
                <button onClick={() => setNotesHidden(true)} className="text-white/60 hover:text-white text-sm">Nascondi</button>
              </div>
              <div className="max-h-60 overflow-auto space-y-1 text-sm bg-gray-900/50 rounded-lg p-3">
                {fullTranscript.length === 0 && notesLines.length === 0 && (
                  <div className="text-white/50">In attesa di trascrizione… Clicca 🔴 per iniziare a registrare.</div>
                )}
                {fullTranscript && (
                  <div className="whitespace-pre-wrap text-white/90 leading-relaxed">
                    {fullTranscript}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modale Conferma Appunti (solo per tutor) */}
        {showNotesConfirmModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-blue-900/90 to-purple-900/90 backdrop-blur-xl rounded-3xl border-2 border-blue-400/30 p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                    <span>📚</span>
                    <span>Appunti della Lezione</span>
                  </h3>
                  <p className="text-white/70">
                    Rivedi e conferma gli appunti generati dall'AI prima di inviarli allo studente
                  </p>
                </div>
              </div>

              {/* Loading State */}
              {isGeneratingNotes ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="relative">
                    <div className="w-20 h-20 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 w-20 h-20 border-4 border-transparent border-t-purple-600 rounded-full animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
                  </div>
                  <p className="mt-6 text-white/80 text-lg">✨ Sto generando appunti dettagliati con l'AI...</p>
                  <p className="mt-2 text-white/60 text-sm">Analisi di {fullTranscript.length} caratteri di trascrizione</p>
                </div>
              ) : (
                <>
                  {/* Info Box */}
                  <div className="bg-blue-500/10 border border-blue-400/30 rounded-xl p-4 mb-6">
                    <div className="flex items-start gap-3">
                      <svg className="w-6 h-6 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="text-white/90 text-sm">
                        <p className="font-semibold mb-1">💡 Suggerimenti:</p>
                        <ul className="space-y-1 text-white/70">
                          <li>• Puoi modificare gli appunti prima di confermare</li>
                          <li>• Gli appunti supportano formattazione markdown e LaTeX</li>
                          <li>• Una volta confermati, gli studenti li vedranno nella loro dashboard</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Toggle View Mode */}
                  <div className="flex justify-center mb-4">
                    <div className="inline-flex rounded-lg bg-black/30 p-1">
                      <button
                        onClick={() => setNotesViewMode('preview')}
                        className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                          notesViewMode === 'preview'
                            ? 'bg-blue-500 text-white'
                            : 'bg-transparent text-white/60 hover:text-white'
                        }`}
                      >
                        👁️ Anteprima
                      </button>
                      <button
                        onClick={() => setNotesViewMode('edit')}
                        className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                          notesViewMode === 'edit'
                            ? 'bg-blue-500 text-white'
                            : 'bg-transparent text-white/60 hover:text-white'
                        }`}
                      >
                        ✏️ Modifica
                      </button>
                    </div>
                  </div>

                  {/* Editor/Preview Appunti */}
                  <div className="mb-6">
                    {notesViewMode === 'preview' ? (
                      <>
                        <label className="block text-white font-semibold mb-3 text-lg">
                          👁️ Anteprima Appunti
                        </label>
                        <div className="w-full min-h-[400px] max-h-[600px] overflow-y-auto px-6 py-5 bg-white rounded-xl border-2 border-blue-400/30 prose prose-slate prose-headings:text-gray-900 prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-p:text-gray-700 prose-a:text-blue-600 prose-strong:text-gray-900 prose-ul:text-gray-700 prose-ol:text-gray-700 prose-li:text-gray-700 prose-code:text-purple-600 prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded max-w-none">
                          <style>{`
                            /* Forza colore nero per formule LaTeX KaTeX */
                            .katex { color: #1a1a1a !important; }
                            .katex * { color: #1a1a1a !important; }
                            .katex-display { margin: 1.5rem 0 !important; }
                            .katex-display .katex { font-size: 1.2rem !important; }
                          `}</style>
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm, remarkMath]}
                            rehypePlugins={[rehypeKatex]}
                          >
                            {fixLatexDelimiters(notesEditable)}
                          </ReactMarkdown>
                        </div>
                      </>
                    ) : (
                      <>
                        <label className="block text-white font-semibold mb-3 text-lg">
                          ✏️ Modifica Appunti
                        </label>
                        <textarea
                          value={notesEditable}
                          onChange={(e) => setNotesEditable(e.target.value)}
                          className="w-full min-h-[400px] px-4 py-3 bg-gray-900/50 border-2 border-blue-400/30 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-all duration-300 resize-y font-mono text-sm leading-relaxed"
                          placeholder="Gli appunti generati appariranno qui..."
                        />
                        <p className="text-white/50 text-xs mt-2">
                          📝 Lunghezza: {notesEditable.length} caratteri | 
                          Puoi usare LaTeX tra \( \) per formule matematiche inline e $$ $$ per blocchi
                        </p>
                      </>
                    )}
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-4">
                    <button
                      onClick={async () => {
                        // Annulla - esci senza salvare appunti
                        setShowNotesConfirmModal(false);
                        await performLeaveRoom();
                      }}
                      className="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 border border-white/20"
                    >
                      ❌ Esci Senza Salvare
                    </button>
                    <button
                      onClick={async () => {
                        // Salva appunti e poi esci
                        try {
                          console.log('💾 Salvataggio appunti confermati...');
                          
                          await apiClient.post(`/video/save-notes/${lessonId}`, {
                            notes: notesEditable
                          });
                          
                          console.log('✅ Appunti salvati con successo!');
                          setShowNotesConfirmModal(false);
                          await performLeaveRoom();
                        } catch (e) {
                          console.error('❌ Errore salvataggio appunti:', e);
                          alert('Errore nel salvataggio degli appunti. Riprova.');
                        }
                      }}
                      disabled={!notesEditable || notesEditable.length < 10}
                      className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      ✅ Conferma e Invia allo Studente
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoRoom;

// Force cache bust Wed Oct 22 11:51:33 EEST 2025
// CACHE BUST 1761123497
// CACHE BUST 1761123857909132000
// CACHE BUST 1761124320017081000
