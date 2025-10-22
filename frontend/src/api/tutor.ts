import { apiClient } from './client';

export interface TutorLesson {
  id: number;
  subject: string;
  start_at: string;
  end_at: string;
  status: string;
  student_id: number;
  student_name?: string;
  room_slug?: string;
  price?: number;
}

export interface TutorStats {
  total_lessons: number;
  completed_lessons: number;
  pending_lessons: number;
  total_students: number;
  total_earnings: number;
}

export interface TutorAssignment {
  id: number;
  title: string;
  description: string;
  instructions: string;
  subject: string;
  due_date: string;
  points: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  tutor_name: string;
  student_name: string;
  has_submission: boolean;
  submission_status?: string;
  submission_grade?: number;
}

export interface TutorLessonsResponse {
  lessons: TutorLesson[];
  total: number;
  page: number;
  size: number;
}

export const tutorApi = {
  // Ottieni le lezioni del tutor
  getLessons: async (page: number = 1, size: number = 20): Promise<TutorLessonsResponse> => {
    console.log('🔵 [TutorAPI] Chiamata getLessons con page=', page, 'size=', size);
    console.log('🔵 [TutorAPI] URL completo:', `/tutor/lessons?page=${page}&size=${size}`);
    try {
      const response = await apiClient.get(`/tutor/lessons?page=${page}&size=${size}`);
      console.log('✅ [TutorAPI] Risposta ricevuta:', response.data);
      console.log('✅ [TutorAPI] Numero lezioni:', response.data?.lessons?.length || 0);
      return response.data;
    } catch (error: any) {
      console.error('❌ [TutorAPI] Errore nella chiamata:', error);
      console.error('❌ [TutorAPI] Status:', error.response?.status);
      console.error('❌ [TutorAPI] Data:', error.response?.data);
      throw error;
    }
  },

  // Ottieni le statistiche del tutor
  getStats: async (): Promise<TutorStats> => {
    const response = await apiClient.get('/tutor/stats');
    return response.data;
  },

  // Ottieni gli studenti assegnati
  getStudents: async () => {
    const response = await apiClient.get('/tutor/students');
    return response.data;
  },

  // Conferma una lezione
  confirmLesson: async (lessonId: number): Promise<TutorLesson> => {
    const response = await apiClient.put(`/lessons/${lessonId}/confirm`);
    return response.data;
  },

  // Rifiuta una lezione
  rejectLesson: async (lessonId: number): Promise<TutorLesson> => {
    const response = await apiClient.put(`/lessons/${lessonId}/reject`);
    return response.data;
  },

  // Ottieni i compiti assegnati dal tutor
  getAssignments: async (): Promise<TutorAssignment[]> => {
    const response = await apiClient.get('/assignments/tutor/');
    return response.data;
  },
};
