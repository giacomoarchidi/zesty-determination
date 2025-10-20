from app.core.db import SessionLocal
from app.models.lesson import Lesson
from app.models.payment import Payment
from app.models.feedback import Feedback


def main() -> None:
    session = SessionLocal()
    try:
        deleted_feedback = session.query(Feedback).delete(synchronize_session=False)
        deleted_payments = session.query(Payment).delete(synchronize_session=False)
        deleted_lessons = session.query(Lesson).delete(synchronize_session=False)
        session.commit()
        remaining = session.query(Lesson).count()
        print(
            f"Deleted lessons={deleted_lessons}, payments={deleted_payments}, feedback={deleted_feedback}. Remaining lessons={remaining}"
        )
    finally:
        session.close()


if __name__ == "__main__":
    main()


