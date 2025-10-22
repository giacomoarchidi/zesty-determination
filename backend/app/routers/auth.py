from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.core.security import get_current_user, require_roles
from app.models.user import User, Role
from app.schemas.auth import UserRegister, UserLogin, Token, UserResponse, UserProfile, PasswordChange
from app.services.auth_service import AuthService

router = APIRouter()


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserRegister, db: Session = Depends(get_db)):
    """Register a new user"""
    auth_service = AuthService(db)
    # La validazione della password è già gestita da Pydantic in UserRegister
    user = auth_service.register_user(user_data)
    return UserResponse.model_validate(user)


@router.post("/login", response_model=Token)
async def login(login_data: UserLogin, db: Session = Depends(get_db)):
    """Login user and get access token"""
    auth_service = AuthService(db)
    token = auth_service.login_user(login_data)
    return token


@router.get("/me", response_model=UserProfile)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user profile"""
    auth_service = AuthService(db)
    profile = auth_service.get_user_profile(current_user.id)
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found"
        )
    
    return UserProfile(**profile)


@router.put("/password", status_code=status.HTTP_200_OK)
async def change_password(
    password_data: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Change user password"""
    auth_service = AuthService(db)
    success = auth_service.change_password(
        current_user.id,
        password_data.current_password,
        password_data.new_password
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to change password"
        )
    
    return {"message": "Password changed successfully"}


@router.delete("/deactivate", status_code=status.HTTP_200_OK)
async def deactivate_account(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Deactivate current user account"""
    auth_service = AuthService(db)
    success = auth_service.deactivate_user(current_user.id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to deactivate account"
        )
    
    return {"message": "Account deactivated successfully"}


@router.post("/admin/cleanup-database", status_code=status.HTTP_200_OK)
async def admin_cleanup_database(db: Session = Depends(get_db)):
    """Admin endpoint to clean up the entire database (temporary)"""
    from app.models.lesson import Lesson
    from app.models.assignment import Assignment, AssignmentSubmission
    from app.models.feedback import Feedback
    from app.models.payment import Payment
    from app.models.report import Report
    from app.models.file import File
    from app.models.availability import Availability
    from app.models.user import StudentProfile, TutorProfile, ParentProfile
    
    try:
        # Cancella in ordine per rispettare le foreign key constraints
        
        # 1. Cancella submissions
        submissions_count = db.query(AssignmentSubmission).count()
        db.query(AssignmentSubmission).delete()
        
        # 2. Cancella assignments
        assignments_count = db.query(Assignment).count()
        db.query(Assignment).delete()
        
        # 3. Cancella feedback
        feedback_count = db.query(Feedback).count()
        db.query(Feedback).delete()
        
        # 4. Cancella payments
        payments_count = db.query(Payment).count()
        db.query(Payment).delete()
        
        # 5. Cancella reports
        reports_count = db.query(Report).count()
        db.query(Report).delete()
        
        # 6. Cancella files
        files_count = db.query(File).count()
        db.query(File).delete()
        
        # 7. Cancella availability
        availability_count = db.query(Availability).count()
        db.query(Availability).delete()
        
        # 8. Cancella lessons
        lessons_count = db.query(Lesson).count()
        db.query(Lesson).delete()
        
        # 9. Cancella profiles
        student_profiles_count = db.query(StudentProfile).count()
        db.query(StudentProfile).delete()
        
        tutor_profiles_count = db.query(TutorProfile).count()
        db.query(TutorProfile).delete()
        
        parent_profiles_count = db.query(ParentProfile).count()
        db.query(ParentProfile).delete()
        
        # 10. Cancella users
        users_count = db.query(User).count()
        db.query(User).delete()
        
        # Commit delle modifiche
        db.commit()
        
        return {
            "message": "Database completamente pulito!",
            "deleted": {
                "users": users_count,
                "lessons": lessons_count,
                "assignments": assignments_count,
                "payments": payments_count,
                "reports": reports_count,
                "files": files_count,
                "availability": availability_count,
                "student_profiles": student_profiles_count,
                "tutor_profiles": tutor_profiles_count,
                "parent_profiles": parent_profiles_count,
                "submissions": submissions_count,
                "feedback": feedback_count
            }
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Errore durante la pulizia: {str(e)}"
        )


