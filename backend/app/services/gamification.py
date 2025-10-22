"""
Servizio per gestire il sistema di gamification (XP, livelli, badge)
"""
from sqlalchemy.orm import Session
from app.models.gamification import UserProgress, Goal, Achievement, XPTransaction
from app.models.user import User
from app.models.lesson import Lesson
from datetime import datetime, timedelta
from typing import Optional, List, Dict
import math


class GamificationService:
    """Gestisce XP, livelli, badge e obiettivi"""
    
    # Configurazione livelli
    BASE_XP = 100
    XP_MULTIPLIER = 1.5
    
    # XP per azioni
    XP_REWARDS = {
        "lesson_completed": 50,
        "assignment_completed": 30,
        "perfect_attendance": 100,
        "streak_7_days": 150,
        "streak_30_days": 500,
        "first_lesson": 25,
        "goal_completed": 75,
    }
    
    # Badge definitions
    BADGES = [
        {
            "name": "first_lesson",
            "description": "Completa la tua prima lezione",
            "icon": "🎓",
            "category": "lessons",
            "requirement_type": "lessons_count",
            "requirement_value": 1,
            "xp_reward": 25,
            "rarity": "common"
        },
        {
            "name": "lesson_master_10",
            "description": "Completa 10 lezioni",
            "icon": "📚",
            "category": "lessons",
            "requirement_type": "lessons_count",
            "requirement_value": 10,
            "xp_reward": 100,
            "rarity": "rare"
        },
        {
            "name": "lesson_master_50",
            "description": "Completa 50 lezioni",
            "icon": "🏆",
            "category": "lessons",
            "requirement_type": "lessons_count",
            "requirement_value": 50,
            "xp_reward": 500,
            "rarity": "epic"
        },
        {
            "name": "streak_7",
            "description": "Studia per 7 giorni consecutivi",
            "icon": "🔥",
            "category": "streak",
            "requirement_type": "streak_days",
            "requirement_value": 7,
            "xp_reward": 150,
            "rarity": "rare"
        },
        {
            "name": "streak_30",
            "description": "Studia per 30 giorni consecutivi",
            "icon": "⚡",
            "category": "streak",
            "requirement_type": "streak_days",
            "requirement_value": 30,
            "xp_reward": 500,
            "rarity": "legendary"
        },
        {
            "name": "early_bird",
            "description": "Completa 5 lezioni prima delle 9:00",
            "icon": "🌅",
            "category": "special",
            "requirement_type": "early_lessons",
            "requirement_value": 5,
            "xp_reward": 100,
            "rarity": "rare"
        },
        {
            "name": "night_owl",
            "description": "Completa 5 lezioni dopo le 20:00",
            "icon": "🦉",
            "category": "special",
            "requirement_type": "late_lessons",
            "requirement_value": 5,
            "xp_reward": 100,
            "rarity": "rare"
        },
        {
            "name": "perfectionist",
            "description": "Completa 10 compiti con voto perfetto",
            "icon": "💯",
            "category": "assignments",
            "requirement_type": "perfect_assignments",
            "requirement_value": 10,
            "xp_reward": 200,
            "rarity": "epic"
        }
    ]
    
    @staticmethod
    def calculate_xp_for_level(level: int) -> int:
        """Calcola XP necessari per raggiungere un livello"""
        return int(GamificationService.BASE_XP * math.pow(GamificationService.XP_MULTIPLIER, level - 1))
    
    @staticmethod
    def calculate_level_from_xp(total_xp: int) -> tuple[int, int, int]:
        """
        Calcola livello corrente da XP totali
        Returns: (current_level, xp_in_current_level, xp_for_next_level)
        """
        level = 1
        xp_accumulated = 0
        
        while True:
            xp_for_level = GamificationService.calculate_xp_for_level(level)
            if xp_accumulated + xp_for_level > total_xp:
                xp_in_level = total_xp - xp_accumulated
                return level, xp_in_level, xp_for_level
            xp_accumulated += xp_for_level
            level += 1
    
    @staticmethod
    def get_level_name(level: int) -> str:
        """Restituisce il nome del livello"""
        if level < 5:
            return "Principiante"
        elif level < 10:
            return "Studente"
        elif level < 20:
            return "Avanzato"
        elif level < 30:
            return "Esperto"
        elif level < 50:
            return "Maestro"
        else:
            return "Leggenda"
    
    @staticmethod
    def get_or_create_progress(db: Session, user_id: int) -> UserProgress:
        """Ottieni o crea il progresso dell'utente"""
        progress = db.query(UserProgress).filter(UserProgress.user_id == user_id).first()
        
        if not progress:
            progress = UserProgress(
                user_id=user_id,
                total_xp=0,
                current_level=1,
                xp_to_next_level=GamificationService.calculate_xp_for_level(1)
            )
            db.add(progress)
            db.commit()
            db.refresh(progress)
        
        return progress
    
    @staticmethod
    def add_xp(
        db: Session, 
        user_id: int, 
        xp_amount: int, 
        reason: str,
        reference_type: Optional[str] = None,
        reference_id: Optional[int] = None
    ) -> Dict:
        """
        Aggiungi XP all'utente e gestisci level up
        Returns: dict con info su level up e nuovo stato
        """
        progress = GamificationService.get_or_create_progress(db, user_id)
        
        # Salva livello precedente
        level_before = progress.current_level
        
        # Aggiungi XP
        progress.total_xp += xp_amount
        
        # Calcola nuovo livello
        new_level, xp_in_level, xp_for_next = GamificationService.calculate_level_from_xp(progress.total_xp)
        
        # Aggiorna progresso
        progress.current_level = new_level
        progress.xp_to_next_level = xp_for_next
        progress.last_activity_date = datetime.utcnow()
        
        # Crea transazione XP
        transaction = XPTransaction(
            user_id=user_id,
            xp_amount=xp_amount,
            reason=reason,
            reference_type=reference_type,
            reference_id=reference_id,
            level_before=level_before,
            level_after=new_level
        )
        db.add(transaction)
        
        db.commit()
        db.refresh(progress)
        
        # Controlla se c'è stato un level up
        leveled_up = new_level > level_before
        
        return {
            "xp_gained": xp_amount,
            "total_xp": progress.total_xp,
            "current_level": new_level,
            "level_name": GamificationService.get_level_name(new_level),
            "xp_in_current_level": xp_in_level,
            "xp_to_next_level": xp_for_next,
            "leveled_up": leveled_up,
            "levels_gained": new_level - level_before if leveled_up else 0
        }
    
    @staticmethod
    def on_lesson_completed(db: Session, user_id: int, lesson_id: int) -> Dict:
        """Chiamato quando una lezione viene completata"""
        progress = GamificationService.get_or_create_progress(db, user_id)
        
        # Incrementa contatore lezioni
        progress.total_lessons_completed += 1
        
        # Calcola ore di studio (assumendo 1 ora per lezione)
        progress.total_study_hours += 1.0
        
        # Aggiorna streak
        today = datetime.utcnow().date()
        last_activity = progress.last_activity_date.date() if progress.last_activity_date else None
        
        if last_activity:
            days_diff = (today - last_activity).days
            if days_diff == 1:
                # Streak continua
                progress.current_streak += 1
                if progress.current_streak > progress.longest_streak:
                    progress.longest_streak = progress.current_streak
            elif days_diff == 0:
                # Stessa giornata, non cambia streak
                pass
            else:
                # Streak interrotto
                progress.current_streak = 1
        else:
            progress.current_streak = 1
        
        db.commit()
        
        # Aggiungi XP per lezione completata
        result = GamificationService.add_xp(
            db, user_id, 
            GamificationService.XP_REWARDS["lesson_completed"],
            "lesson_completed",
            "lesson",
            lesson_id
        )
        
        # Controlla achievement per streak
        badges_earned = []
        if progress.current_streak == 7 and "streak_7" not in progress.badges:
            progress.badges.append("streak_7")
            badges_earned.append("streak_7")
            GamificationService.add_xp(db, user_id, 150, "achievement_streak_7")
        
        if progress.current_streak == 30 and "streak_30" not in progress.badges:
            progress.badges.append("streak_30")
            badges_earned.append("streak_30")
            GamificationService.add_xp(db, user_id, 500, "achievement_streak_30")
        
        # Controlla achievement per numero lezioni
        if progress.total_lessons_completed == 1 and "first_lesson" not in progress.badges:
            progress.badges.append("first_lesson")
            badges_earned.append("first_lesson")
            GamificationService.add_xp(db, user_id, 25, "achievement_first_lesson")
        
        if progress.total_lessons_completed == 10 and "lesson_master_10" not in progress.badges:
            progress.badges.append("lesson_master_10")
            badges_earned.append("lesson_master_10")
            GamificationService.add_xp(db, user_id, 100, "achievement_10_lessons")
        
        if progress.total_lessons_completed == 50 and "lesson_master_50" not in progress.badges:
            progress.badges.append("lesson_master_50")
            badges_earned.append("lesson_master_50")
            GamificationService.add_xp(db, user_id, 500, "achievement_50_lessons")
        
        db.commit()
        
        result["badges_earned"] = badges_earned
        result["current_streak"] = progress.current_streak
        
        return result
    
    @staticmethod
    def on_assignment_completed(db: Session, user_id: int, assignment_id: int) -> Dict:
        """Chiamato quando un compito viene completato"""
        progress = GamificationService.get_or_create_progress(db, user_id)
        progress.total_assignments_completed += 1
        db.commit()
        
        return GamificationService.add_xp(
            db, user_id,
            GamificationService.XP_REWARDS["assignment_completed"],
            "assignment_completed",
            "assignment",
            assignment_id
        )
    
    @staticmethod
    def create_goal(
        db: Session,
        user_id: int,
        goal_type: str,
        target_value: float,
        period: str = "weekly"
    ) -> Goal:
        """Crea un nuovo obiettivo per l'utente"""
        # Calcola end_date in base al periodo
        start_date = datetime.utcnow()
        if period == "daily":
            end_date = start_date + timedelta(days=1)
        elif period == "weekly":
            end_date = start_date + timedelta(weeks=1)
        elif period == "monthly":
            end_date = start_date + timedelta(days=30)
        else:
            end_date = None
        
        goal = Goal(
            user_id=user_id,
            goal_type=goal_type,
            target_value=target_value,
            period=period,
            start_date=start_date,
            end_date=end_date
        )
        
        db.add(goal)
        db.commit()
        db.refresh(goal)
        
        return goal
    
    @staticmethod
    def update_goal_progress(db: Session, user_id: int, goal_type: str, increment: float = 1.0):
        """Aggiorna il progresso di un obiettivo"""
        goals = db.query(Goal).filter(
            Goal.user_id == user_id,
            Goal.goal_type == goal_type,
            Goal.is_active == True,
            Goal.is_completed == False
        ).all()
        
        for goal in goals:
            goal.current_value += increment
            
            # Controlla se obiettivo completato
            if goal.current_value >= goal.target_value:
                goal.is_completed = True
                goal.is_active = False
                
                # Reward XP
                GamificationService.add_xp(
                    db, user_id,
                    goal.xp_reward,
                    f"goal_completed_{goal.goal_type}",
                    "goal",
                    goal.id
                )
        
        db.commit()
    
    @staticmethod
    def get_user_stats(db: Session, user_id: int) -> Dict:
        """Ottieni tutte le statistiche dell'utente"""
        progress = GamificationService.get_or_create_progress(db, user_id)
        
        # Calcola XP nel livello corrente
        level, xp_in_level, xp_for_next = GamificationService.calculate_level_from_xp(progress.total_xp)
        
        # Ottieni obiettivi attivi
        active_goals = db.query(Goal).filter(
            Goal.user_id == user_id,
            Goal.is_active == True
        ).all()
        
        # Ottieni transazioni recenti
        recent_xp = db.query(XPTransaction).filter(
            XPTransaction.user_id == user_id
        ).order_by(XPTransaction.created_at.desc()).limit(10).all()
        
        return {
            "level": level,
            "level_name": GamificationService.get_level_name(level),
            "total_xp": progress.total_xp,
            "xp_in_current_level": xp_in_level,
            "xp_to_next_level": xp_for_next,
            "xp_percentage": int((xp_in_level / xp_for_next) * 100),
            "total_lessons_completed": progress.total_lessons_completed,
            "total_study_hours": progress.total_study_hours,
            "total_assignments_completed": progress.total_assignments_completed,
            "current_streak": progress.current_streak,
            "longest_streak": progress.longest_streak,
            "badges": progress.badges,
            "active_goals": [
                {
                    "id": g.id,
                    "type": g.goal_type,
                    "current": g.current_value,
                    "target": g.target_value,
                    "percentage": int((g.current_value / g.target_value) * 100),
                    "period": g.period,
                    "end_date": g.end_date.isoformat() if g.end_date else None
                }
                for g in active_goals
            ],
            "recent_xp_transactions": [
                {
                    "xp": t.xp_amount,
                    "reason": t.reason,
                    "date": t.created_at.isoformat()
                }
                for t in recent_xp
            ]
        }
    
    @staticmethod
    def initialize_achievements(db: Session):
        """Inizializza i badge nel database (chiamare una volta)"""
        for badge_data in GamificationService.BADGES:
            existing = db.query(Achievement).filter(Achievement.name == badge_data["name"]).first()
            if not existing:
                achievement = Achievement(**badge_data)
                db.add(achievement)
        
        db.commit()
    
    @staticmethod
    def get_all_achievements(db: Session) -> List[Achievement]:
        """Ottieni tutti i badge disponibili"""
        return db.query(Achievement).all()
    
    @staticmethod
    def check_and_award_badges(db: Session, user_id: int) -> List[str]:
        """Controlla e assegna badge automaticamente"""
        progress = GamificationService.get_or_create_progress(db, user_id)
        achievements = GamificationService.get_all_achievements(db)
        
        newly_earned = []
        
        for achievement in achievements:
            # Salta se già ottenuto
            if achievement.name in progress.badges:
                continue
            
            # Controlla requisiti
            earned = False
            if achievement.requirement_type == "lessons_count":
                earned = progress.total_lessons_completed >= achievement.requirement_value
            elif achievement.requirement_type == "streak_days":
                earned = progress.current_streak >= achievement.requirement_value
            elif achievement.requirement_type == "assignments_count":
                earned = progress.total_assignments_completed >= achievement.requirement_value
            
            if earned:
                progress.badges.append(achievement.name)
                newly_earned.append(achievement.name)
                
                # Reward XP
                GamificationService.add_xp(
                    db, user_id,
                    achievement.xp_reward,
                    f"achievement_{achievement.name}",
                    "achievement",
                    achievement.id
                )
        
        if newly_earned:
            db.commit()
        
        return newly_earned

