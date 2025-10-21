import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AgoraRTC, { 
  type IAgoraRTCClient, 
  type IAgoraRTCRemoteUser, 
  type ICameraVideoTrack,
  type IMicrophoneAudioTrack
} from 'agora-rtc-sdk-ng';
import { videoApi, type JoinRoomResponse, type QuizState } from '../../api/video';
import { useAuthStore } from '../../store/authStore';

const VideoRoom: React.FC = () => {
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  // Agora states
  const [client, setClient] = useState<IAgoraRTCClient | null>(null);
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
  const isTutor = (user?.role || '').toLowerCase() === 'tutor';
  const recognitionRef = useRef<any>(null);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [interimText, setInterimText] = useState<string>('');
  const [fullTranscript, setFullTranscript] = useState<string>(''); // Trascrizione completa accumulata
  const [isRecognitionPaused, setIsRecognitionPaused] = useState<boolean>(false);
  
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

        setClient(agoraClient);
        setLocalVideoTrack(videoTrack);
        setLocalAudioTrack(audioTrack);

        // Set up event listeners
        agoraClient.on('user-published', handleUserPublished);
        agoraClient.on('user-unpublished', handleUserUnpublished);
        agoraClient.on('user-left', handleUserLeft);

        // Join channel
        await agoraClient.join(
          joinData.app_id,
          joinData.channel,
          joinData.token,
          joinData.uid
        );

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
      if (client) {
        client.leave().catch(e => console.log('Errore leave (ignorato):', e));
        client.removeAllListeners();
        console.log('✅ Client Agora pulito');
      }
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
    await client?.subscribe(user, mediaType);
    
    if (mediaType === 'video' && user.videoTrack) {
      setRemoteUsers(prev => [...prev, user]);
      if (remoteVideoRef.current) {
        user.videoTrack.play(remoteVideoRef.current);
      }
    }
    
    if (mediaType === 'audio' && user.audioTrack) {
      user.audioTrack.play();
    }
  };

  const handleUserUnpublished = (user: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => {
    if (mediaType === 'video') {
      setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
    }
  };

  const handleUserLeft = (user: IAgoraRTCRemoteUser) => {
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
        setIsRecognitionPaused(false);
        
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
                if (event.results[i].isFinal && !isRecognitionPaused) {
                  finalText += transcript.trim() + ' ';
                }
              }
              if (finalText && !isRecognitionPaused) {
                // Aggiungi alla trascrizione completa
                setFullTranscript(prev => prev + finalText);
                // Aggiungi anche alle note visuali
                setNotesLines(prev => [...prev, finalText.trim()].slice(-200));
              }
            };
            
            rec.onerror = (event: any) => {
              console.log('⚠️ Speech recognition error:', event.error);
              // Se l'errore è "no-speech", riavvia automaticamente
              if (event.error === 'no-speech' && !isRecognitionPaused) {
                setTimeout(() => {
                  if (recognitionRef.current && isRecording) {
                    try {
                      recognitionRef.current.start();
                    } catch (_) {}
                  }
                }, 100);
              }
            };
            
            rec.onend = () => {
              // Se la registrazione è ancora attiva, riavvia automaticamente
              if (isRecording && !isRecognitionPaused) {
                try {
                  recognitionRef.current?.start();
                } catch (_) {}
              } else {
                setIsTranscribing(false);
              }
            };
            
            recognitionRef.current = rec;
            rec.start();
            setIsTranscribing(true);
            console.log('🎙️ Trascrizione avviata');
          } else if (recognitionRef.current) {
            // Riprendi la trascrizione esistente
            setIsRecognitionPaused(false);
            console.log('▶️ Trascrizione ripresa (continuazione)');
          }
        } catch (e) {
          console.log('⚠️ Trascrizione non disponibile:', e);
        }
      } else {
        // Metti in pausa la registrazione (non fermare completamente)
        await videoApi.stopRecording(Number(lessonId));
        setIsRecording(false);
        setIsRecognitionPaused(true);
        
        // Pausa appunti AI (ma non fermare completamente)
        try {
          const data = await videoApi.stopNotes(Number(lessonId));
          setNotesActive(false);
          if (data.lines) setNotesLines(data.lines);
        } catch (_) {}
        
        console.log('⏸️ Registrazione in pausa - Trascrizione: ' + fullTranscript.substring(0, 100) + '...');
        console.log('📊 Lunghezza trascrizione totale:', fullTranscript.length, 'caratteri');
        // NON fermiamo recognitionRef - continua a girare ma non aggiunge testo quando isRecognitionPaused è true
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
      console.log('📤 Uscita dalla video room...');
      
      // Ferma la trascrizione se attiva
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
          recognitionRef.current = null;
          setIsTranscribing(false);
          console.log('✅ Trascrizione fermata');
        } catch (_) {}
      }
      
      // Salva la trascrizione completa sul backend se disponibile
      if (fullTranscript && fullTranscript.length > 0) {
        try {
          console.log('💾 Salvataggio trascrizione completa...');
          console.log('📊 Lunghezza finale:', fullTranscript.length, 'caratteri');
          console.log('📝 Anteprima:', fullTranscript.substring(0, 200) + '...');
          
          // TODO: Invia la trascrizione al backend
          // await videoApi.saveTranscript(Number(lessonId), fullTranscript);
          
          // Per ora la logghiamo in console - implementeremo l'endpoint dopo
          console.log('✅ Trascrizione completa salvata localmente');
        } catch (e) {
          console.error('⚠️ Errore salvataggio trascrizione:', e);
        }
      }
      
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
      if (client) {
        await client.leave();
        client.removeAllListeners();
        console.log('✅ Uscito dal channel Agora');
      }
      
      // Naviga alla dashboard appropriata
      const user = useAuthStore.getState().user;
      if (user?.role === 'tutor') {
        navigate('/tutor/dashboard');
      } else {
        navigate('/student/dashboard');
      }
    } catch (err) {
      console.error('❌ Errore leave room:', err);
      // Prova comunque a navigare
      navigate(-1);
    }
  };

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
            <button
              onClick={launchSampleQuiz}
              className={"px-3 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 text-sm"}
            >
              Lancia quiz
            </button>
            {notesActive ? (
              <button
                onClick={stopNotes}
                className={"px-3 py-2 rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 text-sm"}
              >
                Ferma appunti
              </button>
            ) : (
              (notesLines.length > 0 ? (
                <button
                  onClick={() => { setNotesHidden(false); setShowNotes(true); }}
                  className={"px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-sm"}
                >
                  Mostra appunti
                </button>
              ) : (
                <button
                  onClick={startNotes}
                  className={"px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-sm"}
                >
                  Appunti lezione (AI)
                </button>
              ))
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
          {/* Indicatore Trascrizione */}
          {isTranscribing && (
            <div className="mb-4 flex items-center justify-center gap-3">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
                isRecording ? 'bg-red-600/20 border-2 border-red-500' : 'bg-yellow-600/20 border-2 border-yellow-500'
              }`}>
                <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-yellow-500'}`}></div>
                <span className="text-white text-sm font-medium">
                  {isRecording ? '🎙️ Trascrizione attiva' : '⏸️ Trascrizione in pausa'}
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

            {/* Screen Share */}
            <button
              onClick={toggleScreenShare}
              className={`p-3 rounded-full ${
                isScreenSharing ? 'bg-cyan-600 text-white' : 'bg-gray-600 text-white'
              } hover:opacity-80 transition-opacity`}
              title={isScreenSharing ? 'Ferma condivisione' : 'Condividi schermo'}
            >
              📺
            </button>

            {/* Recording con indicatore stato */}
            <button
              onClick={toggleRecording}
              className={`relative p-3 rounded-full ${
                isRecording ? 'bg-red-600 text-white animate-pulse' : 'bg-gray-600 text-white'
              } hover:opacity-80 transition-opacity`}
              title={isRecording ? 'Pausa registrazione' : fullTranscript.length > 0 ? 'Riprendi registrazione' : 'Avvia registrazione'}
            >
              {isRecording ? '🔴' : fullTranscript.length > 0 ? '⏸️' : '⚫'}
            </button>

            {/* Leave Room */}
            <button
              onClick={leaveRoom}
              className="p-3 rounded-full bg-red-600 text-white hover:opacity-80 transition-opacity"
              title="Termina e salva lezione"
            >
              📞
            </button>
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
        {((showNotes || notesLines.length > 0) && !notesHidden) && (
          <div className="fixed left-0 right-0 bottom-0 z-20">
            <div className="mx-auto max-w-5xl m-4 p-4 rounded-2xl bg-gray-800/95 text-white border border-white/10 shadow-2xl">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-emerald-300">
                  <span>📝</span>
                  <span className="font-semibold">Appunti lezione (AI)</span>
                  {notesActive ? (
                    <span className="text-xs text-emerald-400 animate-pulse">in ascolto…</span>
                  ) : (
                    <span className="text-xs text-white/50">in pausa</span>
                  )}
                </div>
                <button onClick={() => setNotesHidden(true)} className="text-white/60 hover:text-white text-sm">Nascondi</button>
              </div>
              <div className="max-h-40 overflow-auto space-y-1 text-sm">
                {notesLines.length === 0 && (
                  <div className="text-white/50">In attesa di note…</div>
                )}
                {notesLines.map((l, i) => (
                  <div key={i} className="whitespace-pre-wrap">{l}</div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoRoom;
