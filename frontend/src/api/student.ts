import { apiClient } from './client';

export interface StudentLesson {
  id: number;
  subject: string;
  start_at: string;
  end_at: string;
  status: string;
  tutor_id: number;
  tutor_name?: string;
  room_slug?: string;
  price?: number;
}

export interface StudentLessonsResponse {
  lessons: StudentLesson[];
  total: number;
  page: number;
  size: number;
}

export interface StudentAssignment {
  id: number;
  title: string;
  description: string;
  subject: string;
  due_date: string;
  tutor_name: string;
  is_published: boolean;
}

export const studentApi = {
  // Ottieni le lezioni dello studente
  getLessons: async (page: number = 1, size: number = 20): Promise<StudentLessonsResponse> => {
    console.log('🔵 [StudentAPI] Chiamata getLessons con page=', page, 'size=', size);
    console.log('🔵 [StudentAPI] URL completo:', `/lessons/?page=${page}&size=${size}`);
    try {
      const response = await apiClient.get(`/lessons/?page=${page}&size=${size}`);
      console.log('✅ [StudentAPI] Risposta ricevuta:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ [StudentAPI] Errore nella chiamata:', error);
      console.error('❌ [StudentAPI] Status:', error.response?.status);
      console.error('❌ [StudentAPI] Data:', error.response?.data);
      throw error;
    }
  },

  // Ottieni i compiti dello studente (recenti)
  getAssignments: async (): Promise<StudentAssignment[]> => {
    const response = await apiClient.get('/assignments/student/');
    return response.data as StudentAssignment[];
  },
};

