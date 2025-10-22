#!/usr/bin/env python3
"""
Script per pulire completamente il database
Cancella tutti gli utenti, lezioni, compiti, ecc.
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.db import get_db
from app.models.user import User, StudentProfile, TutorProfile, ParentProfile
from app.models.lesson import Lesson
from app.models.assignment import Assignment, AssignmentSubmission
from app.models.feedback import Feedback
from app.models.payment import Payment
from app.models.report import Report
from app.models.file import File
from app.models.availability import Availability

def cleanup_database():
    """Pulisce completamente il database"""
    db = next(get_db())
    
    print("🧹 Inizio pulizia database...")
    
    try:
        # Cancella in ordine per rispettare le foreign key constraints
        
        # 1. Cancella submissions
        submissions_count = db.query(AssignmentSubmission).count()
        db.query(AssignmentSubmission).delete()
        print(f"✅ Cancellati {submissions_count} assignment submissions")
        
        # 2. Cancella assignments
        assignments_count = db.query(Assignment).count()
        db.query(Assignment).delete()
        print(f"✅ Cancellati {assignments_count} assignments")
        
        # 3. Cancella feedback
        feedback_count = db.query(Feedback).count()
        db.query(Feedback).delete()
        print(f"✅ Cancellati {feedback_count} feedback")
        
        # 4. Cancella payments
        payments_count = db.query(Payment).count()
        db.query(Payment).delete()
        print(f"✅ Cancellati {payments_count} payments")
        
        # 5. Cancella reports
        reports_count = db.query(Report).count()
        db.query(Report).delete()
        print(f"✅ Cancellati {reports_count} reports")
        
        # 6. Cancella files
        files_count = db.query(File).count()
        db.query(File).delete()
        print(f"✅ Cancellati {files_count} files")
        
        # 7. Cancella availability
        availability_count = db.query(Availability).count()
        db.query(Availability).delete()
        print(f"✅ Cancellati {availability_count} availability slots")
        
        # 8. Cancella lessons
        lessons_count = db.query(Lesson).count()
        db.query(Lesson).delete()
        print(f"✅ Cancellati {lessons_count} lessons")
        
        # 9. Cancella profiles (in ordine)
        student_profiles_count = db.query(StudentProfile).count()
        db.query(StudentProfile).delete()
        print(f"✅ Cancellati {student_profiles_count} student profiles")
        
        tutor_profiles_count = db.query(TutorProfile).count()
        db.query(TutorProfile).delete()
        print(f"✅ Cancellati {tutor_profiles_count} tutor profiles")
        
        parent_profiles_count = db.query(ParentProfile).count()
        db.query(ParentProfile).delete()
        print(f"✅ Cancellati {parent_profiles_count} parent profiles")
        
        # 10. Cancella users
        users_count = db.query(User).count()
        db.query(User).delete()
        print(f"✅ Cancellati {users_count} users")
        
        # Commit delle modifiche
        db.commit()
        
        print("🎉 Database completamente pulito!")
        print("📊 Riepilogo:")
        print(f"   - Users: 0")
        print(f"   - Lessons: 0")
        print(f"   - Assignments: 0")
        print(f"   - Payments: 0")
        print(f"   - Reports: 0")
        print(f"   - Files: 0")
        print(f"   - Availability: 0")
        
    except Exception as e:
        print(f"❌ Errore durante la pulizia: {e}")
        db.rollback()
        raise

if __name__ == "__main__":
    cleanup_database()
