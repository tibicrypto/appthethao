'use client';

import React, { useEffect, useState } from 'react';
import MainLayout from '@/components/MainLayout';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/context/AppContext';
import { 
  Heart, 
  Smile, 
  Sparkles, 
  Activity, 
  RefreshCw, 
  Check 
} from 'lucide-react';
import styles from './page.module.css';

interface SorenessData {
  [key: string]: 'fine' | 'tight' | 'sore';
}

const MUSCLE_GROUPS = [
  { key: 'vai', label: 'Cơ vai (Shoulders)' },
  { key: 'ngực', label: 'Cơ ngực (Chest)' },
  { key: 'lưng', label: 'Cơ lưng (Back)' },
  { key: 'tay', label: 'Cơ tay (Arms)' },
  { key: 'đùi', label: 'Cơ đùi / Mông (Legs)' },
  { key: 'bụng', label: 'Cơ bụng / Core (Abs)' }
];

const MOODS = [
  { key: 'hào hứng', emoji: '🤩', label: 'Hào hứng' },
  { key: 'vui vẻ', emoji: '😊', label: 'Vui vẻ' },
  { key: 'bình thường', emoji: '😐', label: 'Bình thường' },
  { key: 'mệt mỏi', emoji: '😴', label: 'Mệt mỏi' }
];

export default function BiofeedbackPage() {
  const { currentDate, userId } = useApp();
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [bioId, setBioId] = useState<string | null>(null);
  const [energyLevel, setEnergyLevel] = useState(5);
  const [selectedMood, setSelectedMood] = useState('bình thường');
  const [soreness, setSoreness] = useState<SorenessData>({
    vai: 'fine',
    ngực: 'fine',
    lưng: 'fine',
    tay: 'fine',
    đùi: 'fine',
    bụng: 'fine'
  });

  const fetchBiofeedback = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('biofeedback')
        .select('*')
        .eq('user_id', userId)
        .eq('date', currentDate)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setBioId(data.id);
        setEnergyLevel(data.energy_level || 5);
        setSelectedMood(data.mood || 'bình thường');
        
        // Parse soreness data safely
        const parsedSoreness = data.soreness_data as SorenessData;
        if (parsedSoreness) {
          const mergedSoreness = {
            vai: parsedSoreness.vai || 'fine',
            ngực: parsedSoreness.ngực || 'fine',
            lưng: parsedSoreness.lưng || 'fine',
            tay: parsedSoreness.tay || 'fine',
            đùi: parsedSoreness.đùi || 'fine',
            bụng: parsedSoreness.bụng || 'fine'
          };
          setSoreness(mergedSoreness);
        } else {
          resetSoreness();
        }
      } else {
        setBioId(null);
        setEnergyLevel(5);
        setSelectedMood('bình thường');
        resetSoreness();
      }
    } catch (err) {
      console.error('Lỗi tải biofeedback:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetSoreness = () => {
    setSoreness({
      vai: 'fine',
      ngực: 'fine',
      lưng: 'fine',
      tay: 'fine',
      đùi: 'fine',
      bụng: 'fine'
    });
  };

  useEffect(() => {
    fetchBiofeedback();
  }, [currentDate, userId]);

  const handleMuscleLevelChange = (muscleKey: string, level: 'fine' | 'tight' | 'sore') => {
    setSoreness(prev => ({
      ...prev,
      [muscleKey]: level
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const { error } = await supabase
        .from('biofeedback')
        .upsert({
          id: bioId || undefined,
          user_id: userId,
          date: currentDate,
          energy_level: energyLevel,
          mood: selectedMood,
          soreness_data: soreness
        }, { onConflict: 'user_id,date' });

      if (error) throw error;
      alert('Đã cập nhật phản hồi sinh học của bạn!');
      fetchBiofeedback();
    } catch (err) {
      console.error('Lỗi lưu biofeedback:', err);
      alert('Đã xảy ra lỗi khi lưu nhật ký.');
    } finally {
      setSubmitting(false);
    }
  };

  // Get description for energy level
  const getEnergyDescription = (level: number) => {
    if (level <= 3) return '🥱 Rất mệt mỏi, kiệt quệ năng lượng. Nên nghỉ ngơi tĩnh dưỡng hoàn toàn.';
    if (level <= 6) return '😐 Năng lượng trung bình. Có thể tập luyện nhẹ nhàng hoặc vừa sức.';
    if (level <= 8) return '⚡ Sung mãn, tỉnh táo. Thích hợp cho các buổi tập cường độ cao.';
    return '🔥 Trạng thái đỉnh cao! Sẵn sàng chinh phục mọi thử thách tập luyện.';
  };

  return (
    <MainLayout title="Phản hồi Sinh học">
      <div className={styles.container}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px', flexDirection: 'column', gap: '1rem' }}>
            <RefreshCw size={36} className="spin" style={{ animation: 'spin 2s linear infinite', color: 'var(--color-purple)' }} />
            <p style={{ color: 'var(--text-secondary)' }}>Đang tải trạng thái cơ thể...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.card}>
            <h3 className={styles.cardTitle}>
              <Heart size={22} color="var(--color-purple)" />
              Lắng nghe cơ thể bạn
            </h3>

            {/* 1. Energy level slider */}
            <div className={styles.formGroup}>
              <h4 className={styles.sectionTitle}>
                <Activity size={18} color="var(--color-purple)" />
                1. Mức năng lượng hiện tại
              </h4>
              
              <div className={styles.energySliderWrapper}>
                <span className={styles.energyValue}>{energyLevel}</span>
                <p className={styles.energyDescription}>{getEnergyDescription(energyLevel)}</p>
                <input 
                  type="range"
                  min="1"
                  max="10"
                  value={energyLevel}
                  onChange={(e) => setEnergyLevel(parseInt(e.target.value))}
                  className={styles.slider}
                />
              </div>
            </div>

            {/* 2. Mood selector */}
            <div className={styles.formGroup}>
              <h4 className={styles.sectionTitle}>
                <Smile size={18} color="var(--color-purple)" />
                2. Tâm trạng hôm nay
              </h4>
              
              <div className={styles.moodGrid}>
                {MOODS.map((mood) => {
                  const isActive = selectedMood === mood.key;
                  return (
                    <div 
                      key={mood.key}
                      className={`${styles.moodCard} ${isActive ? styles.moodCardActive : ''}`}
                      onClick={() => setSelectedMood(mood.key)}
                    >
                      <span className={styles.moodEmoji}>{mood.emoji}</span>
                      <span className={styles.moodLabel}>{mood.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. Soreness muscle grid */}
            <div className={styles.formGroup}>
              <h4 className={styles.sectionTitle}>
                <Sparkles size={18} color="var(--color-purple)" />
                3. Đánh giá độ nhức mỏi cơ bắp
              </h4>
              
              <div className={styles.sorenessGrid}>
                {MUSCLE_GROUPS.map((muscle) => {
                  const currentLevel = soreness[muscle.key] || 'fine';
                  return (
                    <div key={muscle.key} className={styles.muscleRow}>
                      <span className={styles.muscleName}>{muscle.label}</span>
                      
                      <div className={styles.levelSelector}>
                        <button
                          type="button"
                          onClick={() => handleMuscleLevelChange(muscle.key, 'fine')}
                          className={`${styles.levelBtn} ${currentLevel === 'fine' ? styles.levelBtnFineActive : ''}`}
                        >
                          Bình thường
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => handleMuscleLevelChange(muscle.key, 'tight')}
                          className={`${styles.levelBtn} ${currentLevel === 'tight' ? styles.levelBtnTightActive : ''}`}
                        >
                          Căng cơ
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => handleMuscleLevelChange(muscle.key, 'sore')}
                          className={`${styles.levelBtn} ${currentLevel === 'sore' ? styles.levelBtnSoreActive : ''}`}
                        >
                          Nhức mỏi
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Submit btn */}
            <button type="submit" className={styles.btnSubmit} disabled={submitting}>
              {submitting ? (
                <>
                  <RefreshCw size={20} className="spin" style={{ animation: 'spin 2s linear infinite' }} />
                  <span>Đang ghi nhận...</span>
                </>
              ) : (
                <>
                  <Check size={20} />
                  <span>Lưu đánh giá trạng thái</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </MainLayout>
  );
}
