import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, query, where, doc, updateDoc } from 'firebase/firestore';

export function startAlarmEngine(onAlarm: (reminder: any) => void) {
  if (!auth.currentUser) return () => {};

  const remindersRef = collection(db, 'users', auth.currentUser.uid, 'reminders');
  const q = query(remindersRef, where('dismissed', '==', false));

  const interval = setInterval(() => {
    const now = new Date();
    const nowStr = now.toISOString().split('T')[0] + ' ' + now.toTimeString().split(' ')[0].slice(0, 5);
    
    // Check reminders from local state or fetch
    // For simplicity, we'll use onSnapshot to keep local state updated
  }, 30000);

  const unsubscribe = onSnapshot(q, (snap) => {
    const now = new Date();
    snap.docs.forEach(d => {
      const data = d.data();
      const triggerDate = new Date(data.triggerDate);
      if (triggerDate <= now && !data.dismissed) {
        onAlarm({ id: d.id, ...data });
      }
    });
  });

  return () => {
    clearInterval(interval);
    unsubscribe();
  };
}

export async function dismissReminder(userId: string, reminderId: string) {
  try {
    const ref = doc(db, 'users', userId, 'reminders', reminderId);
    await updateDoc(ref, { dismissed: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${userId}/reminders/${reminderId}`);
  }
}
