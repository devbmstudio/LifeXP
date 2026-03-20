import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Camera, 
  ChevronRight, 
  Shield, 
  Bell, 
  Database, 
  LogOut, 
  Trash2, 
  X, 
  Check, 
  ArrowLeft,
  Settings,
  Lock,
  Download,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { UserProfile, ClassType } from '../types';
import { db, auth, storage, handleFirestoreError, OperationType } from '../firebase';
import { doc, updateDoc, deleteDoc, collection, getDocs, writeBatch } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { sendPasswordResetEmail, signOut, deleteUser, reauthenticateWithPopup, GoogleAuthProvider } from 'firebase/auth';

interface SettingsScreenProps {
  user: UserProfile;
  onClose: () => void;
  onLogout: () => void;
}

export default function SettingsScreen({ user, onClose, onLogout }: SettingsScreenProps) {
  const [activeTab, setActiveTab] = useState<'main' | 'profile' | 'data' | 'notifications' | 'display' | 'account'>('main');
  const [isUploading, setIsUploading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');

  const handleUpdateSetting = async (key: string, value: any) => {
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        [`settings.${key}`]: value
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;

    setIsUploading(true);
    try {
      const storageRef = ref(storage, `users/${user.uid}/profile.jpg`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { photoURL: url });
    } catch (err) {
      console.error("Upload Error:", err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleExportData = async () => {
    try {
      const data: any = { profile: user };
      const subcollections = ['habits', 'goals', 'reminders', 'skills'];
      
      for (const sub of subcollections) {
        const snap = await getDocs(collection(db, 'users', user.uid, sub));
        data[sub] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lifexp-data-${user.uid}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export Error:", err);
    }
  };

  const handleDeleteAllData = async () => {
    if (deleteInput !== 'DELETE') return;
    
    try {
      const subcollections = ['habits', 'goals', 'reminders', 'skills'];
      const batch = writeBatch(db);
      
      for (const sub of subcollections) {
        const snap = await getDocs(collection(db, 'users', user.uid, sub));
        snap.docs.forEach(d => batch.delete(d.ref));
      }
      
      await batch.commit();
      setShowDeleteConfirm(false);
      setDeleteInput('');
      alert("All data deleted successfully.");
    } catch (err) {
      console.error("Delete Error:", err);
    }
  };

  const handlePasswordReset = async () => {
    if (auth.currentUser?.email) {
      await sendPasswordResetEmail(auth, auth.currentUser.email);
      alert("Password reset email sent!");
    }
  };

  return (
    <motion.div 
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-[400] bg-background overflow-y-auto"
    >
      <div className="max-w-[390px] mx-auto min-h-screen p-6 pb-12 space-y-8">
        <header className="flex items-center gap-4">
          <button onClick={onClose} className="w-10 h-10 glass rounded-full flex items-center justify-center">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-orbitron font-black uppercase tracking-widest">Settings</h1>
        </header>

        <AnimatePresence mode="wait">
          {activeTab === 'main' && (
            <motion.div 
              key="main"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <section className="space-y-2">
                <h2 className="text-[10px] font-bold text-text-secondary uppercase tracking-[0.2em] px-2">Profile</h2>
                <div className="glass rounded-3xl overflow-hidden divide-y divide-white/5">
                  <SettingItem 
                    icon={<User size={18} />} 
                    label="Personal Info" 
                    onClick={() => setActiveTab('profile')} 
                  />
                  <SettingItem 
                    icon={<Bell size={18} />} 
                    label="Notifications" 
                    onClick={() => setActiveTab('notifications')} 
                  />
                </div>
              </section>

              <section className="space-y-2">
                <h2 className="text-[10px] font-bold text-text-secondary uppercase tracking-[0.2em] px-2">System</h2>
                <div className="glass rounded-3xl overflow-hidden divide-y divide-white/5">
                  <SettingItem 
                    icon={<Settings size={18} />} 
                    label="Display" 
                    onClick={() => setActiveTab('display')} 
                  />
                  <SettingItem 
                    icon={<Database size={18} />} 
                    label="Data & Privacy" 
                    onClick={() => setActiveTab('data')} 
                  />
                </div>
              </section>

              <section className="space-y-2">
                <h2 className="text-[10px] font-bold text-text-secondary uppercase tracking-[0.2em] px-2">Account</h2>
                <div className="glass rounded-3xl overflow-hidden divide-y divide-white/5">
                  <SettingItem 
                    icon={<Lock size={18} />} 
                    label="Account Security" 
                    onClick={() => setActiveTab('account')} 
                  />
                  <button 
                    onClick={onLogout}
                    className="w-full h-16 flex items-center justify-between px-6 text-danger hover:bg-danger/5 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <LogOut size={18} />
                      <span className="font-bold text-sm">Sign Out</span>
                    </div>
                  </button>
                </div>
              </section>
            </motion.div>
          )}

          {activeTab === 'profile' && (
            <motion.div 
              key="profile"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <button onClick={() => setActiveTab('main')} className="text-primary text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                <ArrowLeft size={14} /> Back
              </button>

              <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-surface border-2 border-primary overflow-hidden flex items-center justify-center text-4xl">
                    {user.photoURL ? (
                      <img src={user.photoURL} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <span>👤</span>
                    )}
                  </div>
                  <label className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center cursor-pointer shadow-lg">
                    <Camera size={16} className="text-white" />
                    <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                  </label>
                  {isUploading && (
                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                      <Loader2 className="animate-spin text-white" size={24} />
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <h3 className="font-orbitron font-black text-xl">{user.name}</h3>
                  <p className="text-text-secondary text-xs">{auth.currentUser?.email}</p>
                </div>
              </div>

              <div className="glass rounded-3xl p-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Display Name</label>
                  <input 
                    type="text" 
                    defaultValue={user.name}
                    onBlur={async (e) => {
                      if (e.target.value !== user.name) {
                        await updateDoc(doc(db, 'users', user.uid), { name: e.target.value });
                      }
                    }}
                    className="w-full h-12 bg-white/5 rounded-xl px-4 text-sm font-bold outline-none border border-white/5 focus:border-primary/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Class</label>
                  <div className="w-full h-12 bg-white/5 rounded-xl px-4 flex items-center justify-between text-sm font-bold opacity-50">
                    <span>{user.class}</span>
                    <Lock size={14} />
                  </div>
                </div>
                <button 
                  onClick={handlePasswordReset}
                  className="w-full h-12 border border-primary/20 text-primary rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-primary/5 transition-all"
                >
                  Reset Password
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === 'notifications' && (
            <motion.div 
              key="notifications"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <button onClick={() => setActiveTab('main')} className="text-primary text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                <ArrowLeft size={14} /> Back
              </button>

              <div className="glass rounded-3xl overflow-hidden divide-y divide-white/5">
                <ToggleItem 
                  label="Morning Reminder (8AM)" 
                  description="Start your day with a mission briefing"
                  enabled={user.settings?.morningReminder ?? true}
                  onChange={(val) => handleUpdateSetting('morningReminder', val)}
                />
                <ToggleItem 
                  label="Streak Danger Alert (8PM)" 
                  description="Get warned when your streak is at risk"
                  enabled={user.settings?.streakDangerAlert ?? true}
                  onChange={(val) => handleUpdateSetting('streakDangerAlert', val)}
                />
                <ToggleItem 
                  label="Night Check-in (8:30PM)" 
                  description="Time for your daily ritual review"
                  enabled={user.settings?.nightCheckReminder ?? true}
                  onChange={(val) => handleUpdateSetting('nightCheckReminder', val)}
                />
              </div>
            </motion.div>
          )}

          {activeTab === 'display' && (
            <motion.div 
              key="display"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <button onClick={() => setActiveTab('main')} className="text-primary text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                <ArrowLeft size={14} /> Back
              </button>

              <div className="glass rounded-3xl overflow-hidden divide-y divide-white/5">
                <ToggleItem 
                  label="Water Tracker" 
                  description="Show hydration goals on dashboard"
                  enabled={user.settings?.showWaterTracker ?? false}
                  onChange={(val) => handleUpdateSetting('showWaterTracker', val)}
                />
                <ToggleItem 
                  label="Sleep Tracker" 
                  description="Show sleep quality on dashboard"
                  enabled={user.settings?.showSleepTracker ?? false}
                  onChange={(val) => handleUpdateSetting('showSleepTracker', val)}
                />
              </div>
            </motion.div>
          )}

          {activeTab === 'data' && (
            <motion.div 
              key="data"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <button onClick={() => setActiveTab('main')} className="text-primary text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                <ArrowLeft size={14} /> Back
              </button>

              <div className="space-y-4">
                <div className="glass rounded-3xl p-6 space-y-4">
                  <div className="flex items-center gap-4 text-primary">
                    <Download size={24} />
                    <h3 className="font-bold">Export My Data</h3>
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Download all your habits, goals, and profile data as a JSON file for your own records.
                  </p>
                  <button 
                    onClick={handleExportData}
                    className="w-full h-12 bg-primary/10 text-primary rounded-xl text-xs font-bold uppercase tracking-widest"
                  >
                    Download JSON
                  </button>
                </div>

                <div className="glass rounded-3xl p-6 space-y-4 border border-danger/20">
                  <div className="flex items-center gap-4 text-danger">
                    <Trash2 size={24} />
                    <h3 className="font-bold">Delete All Data</h3>
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    This will permanently delete all your habits, goals, and reminders. Your account will remain active.
                  </p>
                  <button 
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full h-12 bg-danger/10 text-danger rounded-xl text-xs font-bold uppercase tracking-widest"
                  >
                    Wipe Data
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'account' && (
            <motion.div 
              key="account"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <button onClick={() => setActiveTab('main')} className="text-primary text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                <ArrowLeft size={14} /> Back
              </button>

              <div className="glass rounded-3xl p-6 space-y-6 border border-danger/30">
                <div className="flex items-center gap-4 text-danger">
                  <AlertTriangle size={32} />
                  <div>
                    <h3 className="font-bold">Danger Zone</h3>
                    <p className="text-[10px] text-text-secondary uppercase tracking-widest">Account Deletion</p>
                  </div>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Deleting your account will permanently remove all your data, progress, and authentication. This action cannot be undone.
                </p>
                <button 
                  onClick={() => alert("Please contact support for account deletion.")}
                  className="w-full h-14 bg-danger text-white rounded-2xl font-bold uppercase tracking-widest shadow-lg shadow-danger/20"
                >
                  Delete Account
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[500] bg-black/90 flex items-center justify-center p-6">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass rounded-[40px] p-8 w-full max-w-sm space-y-6 border border-danger/30"
            >
              <div className="text-center space-y-2">
                <h3 className="text-xl font-orbitron font-black text-danger">ARE YOU SURE?</h3>
                <p className="text-xs text-text-secondary">This will wipe all your progress. Type <span className="text-white font-bold">DELETE</span> to confirm.</p>
              </div>
              <input 
                type="text" 
                value={deleteInput}
                onChange={(e) => setDeleteInput(e.target.value)}
                className="w-full h-14 bg-white/5 rounded-2xl px-6 text-center text-white font-bold outline-none border border-danger/20 focus:border-danger"
              />
              <div className="flex gap-3">
                <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 h-14 glass rounded-2xl font-bold text-xs uppercase tracking-widest">Cancel</button>
                <button 
                  onClick={handleDeleteAllData}
                  disabled={deleteInput !== 'DELETE'}
                  className="flex-1 h-14 bg-danger text-white rounded-2xl font-bold text-xs uppercase tracking-widest disabled:opacity-30"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function SettingItem({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="w-full h-16 flex items-center justify-between px-6 hover:bg-white/5 transition-all"
    >
      <div className="flex items-center gap-4">
        <div className="text-text-secondary">{icon}</div>
        <span className="font-bold text-sm">{label}</span>
      </div>
      <ChevronRight size={16} className="text-text-secondary opacity-30" />
    </button>
  );
}

function ToggleItem({ label, description, enabled, onChange }: { label: string, description: string, enabled: boolean, onChange: (val: boolean) => void }) {
  return (
    <div className="w-full p-6 flex items-center justify-between">
      <div className="space-y-1">
        <h4 className="font-bold text-sm">{label}</h4>
        <p className="text-[10px] text-text-secondary">{description}</p>
      </div>
      <button 
        onClick={() => onChange(!enabled)}
        className={cn(
          "w-12 h-6 rounded-full transition-all relative",
          enabled ? "bg-primary" : "bg-white/10"
        )}
      >
        <motion.div 
          animate={{ x: enabled ? 26 : 2 }}
          className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-lg"
        />
      </button>
    </div>
  );
}
