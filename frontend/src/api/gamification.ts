import { apiClient } from './client';

export interface UserProgress {
  level: number;
  level_name: string;
  total_xp: number;
  xp_in_current_level: number;
  xp_to_next_level: number;
  xp_percentage: number;
  total_lessons_completed: number;
  total_study_hours: number;
  total_assignments_completed: number;
  current_streak: number;
  longest_streak: number;
  badges: string[];
}

export interface Goal {
  id: number;
  goal_type: string;
  current_value: number;
  target_value: number;
  percentage: number;
  period: string;
  is_completed: boolean;
  end_date?: string;
}

export interface CreateGoalRequest {
  goal_type: string;
  target_value: number;
  period: string;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  level: number;
  level_name: string;
  total_xp: number;
  badges_count: number;
  streak: number;
}

export const gamificationApi = {
  // Ottieni statistiche complete
  getStats: async (): Promise<any> => {
    const response = await apiClient.get('/gamification/stats');
    return response.data;
  },

  // Ottieni progresso XP e livello
  getProgress: async (): Promise<UserProgress> => {
    const response = await apiClient.get('/gamification/progress');
    return response.data;
  },

  // Ottieni obiettivi
  getGoals: async (): Promise<Goal[]> => {
    const response = await apiClient.get('/gamification/goals');
    return response.data;
  },

  // Crea nuovo obiettivo
  createGoal: async (goalData: CreateGoalRequest): Promise<Goal> => {
    const response = await apiClient.post('/gamification/goals', goalData);
    return response.data;
  },

  // Ottieni tutti i badge disponibili
  getBadges: async (): Promise<any[]> => {
    const response = await apiClient.get('/gamification/badges');
    return response.data;
  },

  // Ottieni classifica
  getLeaderboard: async (limit: number = 10): Promise<LeaderboardEntry[]> => {
    const response = await apiClient.get(`/gamification/leaderboard?limit=${limit}`);
    return response.data;
  }
};

