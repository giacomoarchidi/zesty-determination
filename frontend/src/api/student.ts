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
    const response = await apiClient.get(`/lessons?page=${page}&size=${size}`);
    return response.data;
  },

  // Ottieni i compiti dello studente (recenti)
  getAssignments: async (): Promise<StudentAssignment[]> => {
    const response = await apiClient.get('/assignments/student');
    return response.data as StudentAssignment[];
  },
};

