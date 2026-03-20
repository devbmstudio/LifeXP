import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Coins, 
  ShoppingBag, 
  Zap, 
  ShieldCheck, 
  Package, 
  ChevronRight,
  Sparkles,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { UserProfile } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';

interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  icon: React.ReactNode;
  color: string;
  type: 'consumable' | 'permanent';
}

const SHOP_ITEMS: ShopItem[] = [
  {
    id: 'streak_freeze',
    name: 'Streak Freeze',
    description: 'Protects your streak for 24 hours if you miss a day.',
    price: 250,
    icon: <ShieldCheck size={24} />,
    color: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    type: 'consumable'
  },
  {
    id: 'xp_boost',
    name: 'XP Overdrive',
    description: 'Earn 2x XP from all activities for the next 2 hours.',
    price: 500,
    icon: <Zap size={24} />,
    color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
    type: 'consumable'
  },
  {
    id: 'mystery_box',
    name: 'Mystery Relic',
    description: 'A random reward. Could be massive XP or rare items.',
    price: 150,
    icon: <Package size={24} />,
    color: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
    type: 'consumable'
  },
  {
    id: 'golden_frame',
    name: 'Golden Aura',
    description: 'A permanent golden glow for your profile picture.',
    price: 2500,
    icon: <Sparkles size={24} />,
    color: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
    type: 'permanent'
  }
];

export default function GoldScreen({ user, userId }: { user: UserProfile, userId: string }) {
  const [activeTab, setActiveTab] = useState<'Shop' | 'Inventory'>('Shop');
  const [buying, setBuying] = useState<string | null>(null);

  const handleBuy = async (item: ShopItem) => {
    if (user.gold < item.price) return;
    
    setBuying(item.id);
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        gold: user.gold - item.price,
        inventory: arrayUnion({
          id: item.id,
          name: item.name,
          purchasedAt: new Date().toISOString(),
          used: false
        })
      });
      // Small delay for animation feel
      setTimeout(() => setBuying(null), 1000);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
      setBuying(null);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-5 pt-10 space-y-8"
    >
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-orbitron font-bold">Treasury</h1>
        <div className="glass px-4 py-2 rounded-2xl flex items-center gap-2 border border-yellow-500/30 glow-yellow">
          <Coins size={18} className="text-yellow-500" />
          <span className="font-orbitron font-black text-yellow-500">{user.gold || 0}</span>
        </div>
      </header>

      <div className="flex gap-2 p-1 bg-surface rounded-2xl">
        {(['Shop', 'Inventory'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 h-12 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2",
              activeTab === tab ? "bg-white/10 text-white" : "text-text-secondary"
            )}
          >
            {tab === 'Shop' ? <ShoppingBag size={14} /> : <Package size={14} />}
            {tab}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'Shop' ? (
          <motion.div 
            key="shop"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {SHOP_ITEMS.map((item) => (
              <div 
                key={item.id}
                className="glass rounded-[32px] p-5 border border-white/5 flex items-center gap-5 group"
              >
                <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center shrink-0", item.color)}>
                  {item.icon}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-sm">{item.name}</h3>
                    <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">{item.type}</span>
                  </div>
                  <p className="text-[10px] text-text-secondary leading-relaxed">{item.description}</p>
                  <div className="pt-2 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Coins size={12} className="text-yellow-500" />
                      <span className="text-xs font-orbitron font-bold text-yellow-500">{item.price}</span>
                    </div>
                    <button 
                      onClick={() => handleBuy(item)}
                      disabled={user.gold < item.price || buying === item.id}
                      className={cn(
                        "px-4 h-8 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all",
                        user.gold >= item.price 
                          ? "bg-primary text-white glow-primary active:scale-95" 
                          : "bg-white/5 text-text-secondary cursor-not-allowed"
                      )}
                    >
                      {buying === item.id ? 'Buying...' : 'Purchase'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        ) : (
          <motion.div 
            key="inventory"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {user.inventory && user.inventory.length > 0 ? (
              user.inventory.map((item: any, idx: number) => (
                <div 
                  key={`${item.id}-${idx}`}
                  className="glass rounded-2xl p-4 border border-white/5 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 glass-dark rounded-xl flex items-center justify-center text-primary">
                      {SHOP_ITEMS.find(s => s.id === item.id)?.icon || <Package size={20} />}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs">{item.name}</h4>
                      <p className="text-[8px] text-text-secondary uppercase tracking-widest">
                        Acquired {new Date(item.purchasedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <button className="px-3 h-8 glass rounded-lg text-[8px] font-black uppercase tracking-widest text-primary border border-primary/20">
                    Use Now
                  </button>
                </div>
              ))
            ) : (
              <div className="py-20 text-center space-y-6">
                <div className="w-20 h-20 bg-surface rounded-[32px] flex items-center justify-center mx-auto shadow-xl border border-white/5 text-4xl opacity-20">
                  📦
                </div>
                <p className="text-text-secondary text-sm font-medium">Your inventory is empty.</p>
                <button 
                  onClick={() => setActiveTab('Shop')}
                  className="px-6 h-12 glass rounded-2xl text-xs font-bold uppercase tracking-widest text-primary border border-primary/20"
                >
                  Visit Shop
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
