import { apiClient } from './client';

export interface AssignmentCreate {
  title: string;
  description: string;
  instructions: string;
  subject: string;
  due_date: string; // ISO string
  points: number;
  is_published: boolean;
  student_id: number;
}

export interface AssignmentResponse {
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

export const assignmentApi = {
  // Crea un nuovo compito
  create: async (assignmentData: AssignmentCreate): Promise<AssignmentResponse> => {
    console.log('📝 [AssignmentAPI] Creazione compito:', assignmentData);
    const response = await apiClient.post('/assignments/', assignmentData);
    console.log('✅ [AssignmentAPI] Compito creato:', response.data);
    return response.data;
  },

  // Ottieni i compiti per tutor
  getTutorAssignments: async (): Promise<AssignmentResponse[]> => {
    console.log('📝 [AssignmentAPI] Recupero compiti tutor');
    const response = await apiClient.get('/assignments/tutor');
    console.log('✅ [AssignmentAPI] Compiti tutor ricevuti:', response.data);
    return response.data || [];
  },

  // Ottieni i compiti per studente
  getStudentAssignments: async (): Promise<AssignmentResponse[]> => {
    console.log('📝 [AssignmentAPI] Recupero compiti studente');
    const response = await apiClient.get('/assignments/student');
    console.log('✅ [AssignmentAPI] Compiti studente ricevuti:', response.data);
    return response.data || [];
  },

  // Ottieni un compito specifico
  getById: async (assignmentId: number): Promise<AssignmentResponse> => {
    console.log('📝 [AssignmentAPI] Recupero compito:', assignmentId);
    const response = await apiClient.get(`/assignments/${assignmentId}`);
    console.log('✅ [AssignmentAPI] Compito ricevuto:', response.data);
    return response.data;
  },

  // Aggiorna un compito
  update: async (assignmentId: number, assignmentData: Partial<AssignmentCreate>): Promise<AssignmentResponse> => {
    console.log('📝 [AssignmentAPI] Aggiornamento compito:', assignmentId, assignmentData);
    const response = await apiClient.put(`/assignments/${assignmentId}`, assignmentData);
    console.log('✅ [AssignmentAPI] Compito aggiornato:', response.data);
    return response.data;
  },

  // Elimina un compito
  delete: async (assignmentId: number): Promise<void> => {
    console.log('📝 [AssignmentAPI] Eliminazione compito:', assignmentId);
    await apiClient.delete(`/assignments/${assignmentId}`);
    console.log('✅ [AssignmentAPI] Compito eliminato');
  }
};
