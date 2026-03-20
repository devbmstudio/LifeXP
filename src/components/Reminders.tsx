import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, 
  Plus, 
  X, 
  Calendar, 
  Clock, 
  Trash2, 
  Image as ImageIcon,
  AlertCircle,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { db, storage, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, query, orderBy, setDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface Reminder {
  id: string;
  title: string;
  note?: string;
  priority: 'Urgent' | 'Normal' | 'Soft';
  triggerDate: string;
  repeat: 'None' | 'Daily' | 'Weekly' | 'Monthly';
  imageUrl?: string;
  dismissed: boolean;
}

function EmptyState({ icon, title, actionLabel, onAction }: { icon: React.ReactNode, title: string, actionLabel: string, onAction: () => void }) {
  return (
    <div className="py-20 text-center space-y-6">
      <div className="w-20 h-20 bg-surface rounded-[32px] flex items-center justify-center mx-auto shadow-xl border border-white/5 text-4xl">
        {icon}
      </div>
      <div className="space-y-2">
        <p className="text-text-secondary text-sm font-medium max-w-[200px] mx-auto leading-relaxed">{title}</p>
      </div>
      <button 
        onClick={onAction}
        className="px-6 h-12 glass rounded-2xl text-xs font-bold uppercase tracking-widest text-primary border border-primary/20 active:scale-95 transition-all"
      >
        {actionLabel}
      </button>
    </div>
  );
}

export default function Reminders({ userId }: { userId: string }) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [activeTab, setActiveTab] = useState<'Upcoming' | 'Past'>('Upcoming');

  useEffect(() => {
    const remindersRef = collection(db, 'users', userId, 'reminders');
    const q = query(remindersRef, orderBy('triggerDate', 'asc'));
    
    const unsubscribe = onSnapshot(q, (snap) => {
      setReminders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Reminder)));
    });

    return unsubscribe;
  }, [userId]);

  const upcoming = reminders.filter(r => !r.dismissed);
  const past = reminders.filter(r => r.dismissed);

  const handleDismiss = async (id: string) => {
    try {
      await updateDoc(doc(db, 'users', userId, 'reminders', id), { dismissed: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${userId}/reminders/${id}`);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'users', userId, 'reminders', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${userId}/reminders/${id}`);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-5 pt-10 space-y-6"
    >
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-orbitron font-bold">Reminders</h1>
        <button 
          onClick={() => setShowAdd(true)}
          className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white glow-primary"
        >
          <Plus size={24} />
        </button>
      </header>

      <div className="flex gap-2 p-1 bg-surface rounded-2xl">
        {(['Upcoming', 'Past'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 h-10 rounded-xl font-bold text-xs uppercase tracking-widest transition-all",
              activeTab === tab ? "bg-white/10 text-white" : "text-text-secondary"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {(activeTab === 'Upcoming' ? upcoming : past).map(r => (
          <ReminderCard 
            key={r.id} 
            reminder={r} 
            onDelete={() => handleDelete(r.id)} 
            onDismiss={() => handleDismiss(r.id)}
          />
        ))}
        {(activeTab === 'Upcoming' ? upcoming : past).length === 0 && (
          <EmptyState 
            icon="🔔" 
            title={activeTab === 'Upcoming' ? "No upcoming alerts. Peace of mind." : "No past reminders yet."} 
            actionLabel="Create reminder →" 
            onAction={() => setShowAdd(true)} 
          />
        )}
      </div>

      <AnimatePresence>
        {showAdd && (
          <AddReminderSheet onClose={() => setShowAdd(false)} userId={userId} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ReminderCard({ reminder, onDelete, onDismiss }: { reminder: Reminder, onDelete: () => void, onDismiss: () => void }) {
  const priorityColors = {
    Urgent: 'text-danger',
    Normal: 'text-accent',
    Soft: 'text-success'
  };

  const triggerDate = new Date(reminder.triggerDate);
  const isToday = triggerDate.toDateString() === new Date().toDateString();

  return (
    <div className="glass rounded-2xl p-4 flex items-center gap-4 border border-white/5">
      {reminder.imageUrl ? (
        <img src={reminder.imageUrl} className="w-16 h-16 rounded-xl object-cover" alt="" />
      ) : (
        <div className={cn("w-16 h-16 rounded-xl flex items-center justify-center bg-surface", priorityColors[reminder.priority])}>
          <Bell size={24} />
        </div>
      )}
      <div className="flex-1 space-y-1">
        <div className="flex justify-between items-start">
          <span className={cn("text-[8px] font-black uppercase tracking-widest", priorityColors[reminder.priority])}>
            {reminder.priority}
          </span>
          <div className="flex gap-1">
            {!reminder.dismissed && (
              <button onClick={onDismiss} className="text-text-secondary hover:text-success p-1">
                <CheckCircle2 size={14} />
              </button>
            )}
            <button onClick={onDelete} className="text-text-secondary hover:text-danger p-1">
              <Trash2 size={14} />
            </button>
          </div>
        </div>
        <h3 className="font-bold text-sm">{reminder.title}</h3>
        <div className="flex items-center gap-3 text-[10px] text-text-secondary">
          <div className="flex items-center gap-1">
            <Clock size={10} />
            <span className={cn(isToday && !reminder.dismissed && "text-primary font-bold")}>
              {triggerDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          {reminder.repeat !== 'None' && (
            <div className="flex items-center gap-1">
              <span className="bg-white/5 px-2 py-0.5 rounded-full">🔁 {reminder.repeat}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AddReminderSheet({ onClose, userId }: { onClose: () => void, userId: string }) {
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [priority, setPriority] = useState<Reminder['priority']>('Normal');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [repeat, setRepeat] = useState<Reminder['repeat']>('None');
  const [image, setImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!title || !date || !time) return;
    setLoading(true);
    const id = Math.random().toString(36).substr(2, 9);
    let imageUrl = '';

    try {
      if (image) {
        const storageRef = ref(storage, `users/${userId}/reminders/${id}/image.jpg`);
        await uploadBytes(storageRef, image);
        imageUrl = await getDownloadURL(storageRef);
      }

      const triggerDate = new Date(`${date}T${time}`).toISOString();
      const newReminder: Reminder = {
        id,
        title,
        note,
        priority,
        triggerDate,
        repeat,
        imageUrl,
        dismissed: false
      };

      await setDoc(doc(db, 'users', userId, 'reminders', id), newReminder);
      onClose();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `users/${userId}/reminders/${id}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/80 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        className="w-full max-w-[390px] bg-surface rounded-t-[40px] p-8 space-y-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-orbitron font-bold">New Reminder</h2>
          <button onClick={onClose} className="w-10 h-10 bg-background rounded-full flex items-center justify-center text-text-secondary">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {(['Urgent', 'Normal', 'Soft'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPriority(p)}
                className={cn(
                  "h-12 rounded-xl font-bold text-[10px] uppercase tracking-widest border transition-all",
                  priority === p 
                    ? p === 'Urgent' ? "bg-danger border-danger text-white" : p === 'Normal' ? "bg-accent border-accent text-white" : "bg-success border-success text-white"
                    : "bg-background border-white/5 text-text-secondary"
                )}
              >
                {p}
              </button>
            ))}
          </div>

          <input 
            type="text" 
            placeholder="Reminder Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full h-14 bg-background rounded-2xl px-5 text-white outline-none border border-white/5 focus:border-primary/50"
          />

          <textarea 
            placeholder="Add a note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full bg-background rounded-2xl p-5 text-white outline-none border border-white/5 focus:border-primary/50 resize-none h-24"
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Date</label>
              <input 
                type="date" 
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full h-14 bg-background rounded-2xl px-4 text-white outline-none border border-white/5"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Time</label>
              <input 
                type="time" 
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full h-14 bg-background rounded-2xl px-4 text-white outline-none border border-white/5"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Repeat</label>
            <div className="flex flex-wrap gap-2">
              {(['None', 'Daily', 'Weekly', 'Monthly'] as const).map(r => (
                <button
                  key={r}
                  onClick={() => setRepeat(r)}
                  className={cn(
                    "px-4 h-10 rounded-full font-bold text-[10px] uppercase tracking-wider transition-all",
                    repeat === r ? "bg-primary text-white" : "bg-background text-text-secondary"
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Image</label>
            <label className="w-full h-14 bg-background rounded-2xl border border-dashed border-white/20 flex items-center justify-center gap-3 cursor-pointer hover:border-primary/50 transition-all">
              <ImageIcon size={20} className="text-text-secondary" />
              <span className="text-xs font-bold text-text-secondary">{image ? image.name : 'Add image'}</span>
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={(e) => setImage(e.target.files?.[0] || null)}
              />
            </label>
          </div>

          <button 
            onClick={handleSave}
            disabled={loading}
            className="w-full h-16 bg-primary rounded-2xl font-bold uppercase tracking-widest text-white active:scale-95 transition-all flex items-center justify-center gap-3"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Save Reminder'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
