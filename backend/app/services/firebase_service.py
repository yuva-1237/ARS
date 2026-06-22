import os
import json
import logging
import datetime
from typing import Optional, Any, Dict
import firebase_admin
from firebase_admin import credentials, firestore, messaging
from sqlalchemy.orm import Session
from backend.app.core.database import SessionLocal
from backend.app.models import Notification, User

logger = logging.getLogger(__name__)

# Initialize Firebase Admin SDK
firebase_app = None
firestore_client = None

try:
    service_account_path = "firebase-service-account.json"
    service_account_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")

    if service_account_json:
        logger.info("Initializing Firebase Admin SDK with JSON from environment variable...")
        cred = credentials.Certificate(json.loads(service_account_json))
        firebase_app = firebase_admin.initialize_app(cred)
        firestore_client = firestore.client()
    elif os.path.exists(service_account_path):
        logger.info(f"Initializing Firebase Admin SDK with credentials file: {service_account_path}")
        cred = credentials.Certificate(service_account_path)
        firebase_app = firebase_admin.initialize_app(cred)
        firestore_client = firestore.client()
    else:
        try:
            firebase_app = firebase_admin.initialize_app(options={"projectId": "arss-123"})
            firestore_client = firestore.client()
            logger.info("Initializing Firebase Admin SDK with default credentials.")
        except Exception as default_err:
            logger.warning(
                f"Firebase credentials not found. Python backend will use SQL database fallback. Error: {default_err}"
            )
except Exception as e:
    logger.error(f"Error initializing Firebase Admin SDK: {e}")


def get_firebase_uid(db_user: User) -> str:
    """
    Finds the Firebase Auth UID for a local database user.
    If Firebase Admin SDK is available, queries Firebase Auth by email.
    Otherwise, falls back to local email/id format.
    """
    if firebase_app:
        try:
            from firebase_admin import auth
            fb_user = auth.get_user_by_email(db_user.email)
            return fb_user.uid
        except Exception as e:
            logger.debug(f"User {db_user.email} not found in Firebase Auth: {e}")
    # Fallback formatting
    return f"local-{db_user.id}"


def send_notification_to_user(
    db_user_id: int,
    title: str,
    message: str,
    notification_type: str,
    action_url: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
    db: Session = None,
) -> bool:
    """
    Creates a notification and writes it to Firestore under `users/{uid}/notifications/{id}`.
    Also creates a global record in `notifications/` if it's a system announcement.
    If Firestore is unconfigured, writes it to the local SQLite/PostgreSQL database.
    """
    should_close_db = False
    if db is None:
        db = SessionLocal()
        should_close_db = True

    try:
        user = db.query(User).filter(User.id == db_user_id).first()
        if not user:
            logger.error(f"User with ID {db_user_id} not found. Cannot send notification.")
            return False

        uid = get_firebase_uid(user)
        notif_id = f"notif_{int(datetime.datetime.utcnow().timestamp())}_{os.urandom(4).hex()}"
        created_at_dt = datetime.datetime.utcnow()

        # 1. Store locally in SQL Database as fallback / audit log
        sql_notif = Notification(
            user_id=db_user_id,
            title=title,
            message=message,
            notification_type=notification_type,
            is_read=False,
            created_at=created_at_dt
        )
        db.add(sql_notif)
        db.commit()

        # 2. Store in Firebase Firestore if initialized
        if firestore_client is not None:
            try:
                doc_ref = firestore_client.collection("users").document(uid).collection("notifications").document(notif_id)
                doc_data = {
                    "id": notif_id,
                    "userId": uid,
                    "title": title,
                    "message": message,
                    "type": notification_type,
                    "read": False,
                    "createdAt": created_at_dt,
                    "actionUrl": action_url,
                    "metadata": metadata or {}
                }
                doc_ref.set(doc_data)
                logger.info(f"Notification written to Firestore for user {uid}")

                # If system notification, also write to global notifications collection
                if notification_type == "system":
                    firestore_client.collection("notifications").document(notif_id).set(doc_data)

                # 3. Trigger Push Notification via FCM
                send_fcm_push(uid, title, message, action_url, metadata)

            except Exception as firestore_err:
                logger.error(f"Failed to write notification to Firestore: {firestore_err}")
        else:
            logger.info("Firestore unconfigured. Notification only saved to local SQL database.")

        return True
    except Exception as e:
        logger.error(f"Error in send_notification_to_user: {e}")
        return False
    finally:
        if should_close_db:
            db.close()


def send_fcm_push(
    uid: str,
    title: str,
    message: str,
    action_url: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None
) -> bool:
    """
    Sends a push notification to FCM tokens registered under `users/{uid}/fcm_tokens`.
    """
    if not firebase_app or not firestore_client:
        return False

    try:
        user_ref = firestore_client.collection("users").document(uid)
        user_doc = user_ref.get()
        if not user_doc.exists:
            return False

        user_data = user_doc.to_dict()
        fcm_tokens = user_data.get("fcm_tokens", [])
        if not fcm_tokens:
            return False

        notification = messaging.Notification(
            title=title,
            body=message
        )
        
        data_payload = {"click_action": action_url or ""}
        if metadata:
            for k, v in metadata.items():
                data_payload[k] = str(v)

        multicast_message = messaging.MulticastMessage(
            tokens=fcm_tokens,
            notification=notification,
            data=data_payload
        )
        response = messaging.send_multicast(multicast_message)
        logger.info(f"FCM multicast success count: {response.success_count}, failure count: {response.failure_count}")
        return True
    except Exception as e:
        logger.error(f"Failed to send FCM push: {e}")
        return False
