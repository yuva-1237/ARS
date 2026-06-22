from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from backend.app.core.database import get_db
from backend.app.models import Notification, User
from backend.app.schemas import NotificationOut, AnnouncementRequest
from backend.app.api.deps import get_current_user, RoleChecker
from backend.app.services.firebase_service import send_notification_to_user

router = APIRouter()

admin_only = RoleChecker(["admin"])

@router.get("/", response_model=List[NotificationOut])
def get_user_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    limit: int = 50,
    offset: int = 0
):
    """
    Retrieves the notifications history for the logged-in user (from local SQL database).
    """
    notifications = db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).order_by(Notification.created_at.desc()).offset(offset).limit(limit).all()
    return notifications

# IMPORTANT: Static paths MUST be declared before parametric paths to avoid ambiguity
@router.post("/mark-all-read", status_code=status.HTTP_204_NO_CONTENT)
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Marks all notifications for the current user as read in the SQL database.
    """
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).update({Notification.is_read: True})
    db.commit()
    return None

@router.post("/create", status_code=status.HTTP_201_CREATED, response_model=NotificationOut)
def create_user_notification(
    payload: AnnouncementRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Allows any authenticated user to create a personal notification (logged to their own account).
    Used by the frontend createLocalNotification helper as a backend sync mechanism.
    """
    from backend.app.models import Notification as NotifModel
    notif = NotifModel(
        user_id=current_user.id,
        title=payload.title,
        message=payload.message,
        notification_type="info",
        is_read=False,
        action_url=payload.action_url or None
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    return notif

@router.post("/announcement", status_code=status.HTTP_201_CREATED)
def broadcast_system_announcement(
    payload: AnnouncementRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_only)
):
    """
    System Admin only. Broadcasts a system-wide announcement to all registered users.
    Writes to both local SQL database and Firebase Firestore (if available).
    """
    users = db.query(User).all()
    count = 0
    for u in users:
        success = send_notification_to_user(
            db_user_id=u.id,
            title=payload.title,
            message=payload.message,
            notification_type="system",
            action_url=payload.action_url,
            metadata=payload.metadata,
            db=db
        )
        if success:
            count += 1
    return {"message": f"Announcement broadcasted to {count} users."}

# Parametric routes AFTER static routes
@router.post("/{notif_id}/read", response_model=NotificationOut)
def mark_as_read(
    notif_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Marks a specific notification as read in the SQL database.
    """
    notif = db.query(Notification).filter(
        Notification.id == notif_id,
        Notification.user_id == current_user.id
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = True
    db.commit()
    db.refresh(notif)
    return notif

@router.delete("/{notif_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user_notification(
    notif_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Deletes a notification from the SQL database.
    """
    notif = db.query(Notification).filter(
        Notification.id == notif_id,
        Notification.user_id == current_user.id
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    db.delete(notif)
    db.commit()
    return None

