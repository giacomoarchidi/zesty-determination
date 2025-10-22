"""
Router per il sistema di gamification
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.dependencies import get_db, get_current_user
from app.models.user import User
from app.services.gamification import GamificationService
from pydantic import BaseModel
from typing import List, Optional


router = APIRouter()


class CreateGoalRequest(BaseModel):
    goal_type: str  # 'weekly_hours', 'lessons_count', 'assignments'
    target_value: float
    period: str = "weekly"  # 'daily', 'weekly', 'monthly'


class GoalResponse(BaseModel):
    id: int
    goal_type: str
    current_value: float
    target_value: float
    percentage: int
    period: str
    is_completed: bool
    end_date: Optional[str]


class ProgressResponse(BaseModel):
    level: int
    level_name: str
    total_xp: int
    xp_in_current_level: int
    xp_to_next_level: int
    xp_percentage: int
    total_lessons_completed: int
    total_study_hours: float
    total_assignments_completed: int
    current_streak: int
    longest_streak: int
    badges: List[str]


@router.get("/stats", response_model=dict)
async def get_user_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Ottieni tutte le statistiche di gamification dell'utente"""
    stats = GamificationService.get_user_stats(db, current_user.id)
    return stats


@router.get("/progress", response_model=ProgressResponse)
async def get_user_progress(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Ottieni il progresso XP e livello dell'utente"""
    stats = GamificationService.get_user_stats(db, current_user.id)
    return {
        "level": stats["level"],
        "level_name": stats["level_name"],
        "total_xp": stats["total_xp"],
        "xp_in_current_level": stats["xp_in_current_level"],
        "xp_to_next_level": stats["xp_to_next_level"],
        "xp_percentage": stats["xp_percentage"],
        "total_lessons_completed": stats["total_lessons_completed"],
        "total_study_hours": stats["total_study_hours"],
        "total_assignments_completed": stats["total_assignments_completed"],
        "current_streak": stats["current_streak"],
        "longest_streak": stats["longest_streak"],
        "badges": stats["badges"]
    }


@router.get("/goals", response_model=List[GoalResponse])
async def get_user_goals(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Ottieni gli obiettivi dell'utente"""
    from app.models.gamification import Goal
    
    goals = db.query(Goal).filter(
        Goal.user_id == current_user.id,
        Goal.is_active == True
    ).all()
    
    return [
        {
            "id": g.id,
            "goal_type": g.goal_type,
            "current_value": g.current_value,
            "target_value": g.target_value,
            "percentage": int((g.current_value / g.target_value) * 100),
            "period": g.period,
            "is_completed": g.is_completed,
            "end_date": g.end_date.isoformat() if g.end_date else None
        }
        for g in goals
    ]


@router.post("/goals", response_model=GoalResponse)
async def create_goal(
    goal_data: CreateGoalRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Crea un nuovo obiettivo"""
    goal = GamificationService.create_goal(
        db,
        current_user.id,
        goal_data.goal_type,
        goal_data.target_value,
        goal_data.period
    )
    
    return {
        "id": goal.id,
        "goal_type": goal.goal_type,
        "current_value": goal.current_value,
        "target_value": goal.target_value,
        "percentage": 0,
        "period": goal.period,
        "is_completed": goal.is_completed,
        "end_date": goal.end_date.isoformat() if goal.end_date else None
    }


@router.get("/badges")
async def get_available_badges(
    db: Session = Depends(get_db)
):
    """Ottieni tutti i badge disponibili"""
    return GamificationService.BADGES


@router.get("/leaderboard")
async def get_leaderboard(
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """Ottieni la classifica globale"""
    from app.models.gamification import UserProgress
    from app.models.user import User
    
    top_users = db.query(UserProgress, User).join(
        User, UserProgress.user_id == User.id
    ).order_by(
        UserProgress.total_xp.desc()
    ).limit(limit).all()
    
    leaderboard = []
    for idx, (progress, user) in enumerate(top_users, 1):
        # Ottieni nome dall'utente
        name = "Utente"
        if user.role.value == "student" and user.student_profile:
            name = f"{user.student_profile.first_name} {user.student_profile.last_name[0]}."
        elif user.role.value == "tutor" and user.tutor_profile:
            name = f"{user.tutor_profile.first_name} {user.tutor_profile.last_name[0]}."
        
        leaderboard.append({
            "rank": idx,
            "name": name,
            "level": progress.current_level,
            "level_name": GamificationService.get_level_name(progress.current_level),
            "total_xp": progress.total_xp,
            "badges_count": len(progress.badges),
            "streak": progress.current_streak
        })
    
    return leaderboard

