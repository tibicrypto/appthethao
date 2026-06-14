'use client';

import React, { useEffect, useState } from 'react';
import MainLayout from '@/components/MainLayout';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/context/AppContext';
import { 
  Apple, 
  Flame, 
  Droplet, 
  RefreshCw, 
  Plus, 
  Check, 
  Sparkles, 
  Scale 
} from 'lucide-react';
import styles from './page.module.css';

interface NutritionTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export default function NutritionPage() {
  const { currentDate, userId } = useApp();
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [syncingWater, setSyncingWater] = useState(false);

  // Targets state (defaults in case no plan is loaded)
  const [targets, setTargets] = useState<NutritionTargets>({
    calories: 1800,
    protein: 120,
    carbs: 200,
    fat: 60
  });

  // Logged state
  const [logId, setLogId] = useState<string | null>(null);
  const [caloriesIn, setCaloriesIn] = useState(0);
  const [proteinIn, setProteinIn] = useState(0);
  const [carbsIn, setCarbsIn] = useState(0);
  const [fatIn, setFatIn] = useState(0);
  const [waterIn, setWaterIn] = useState(0);

  // Form input states
  const [formCalories, setFormCalories] = useState('');
  const [formProtein, setFormProtein] = useState('');
  const [formCarbs, setFormCarbs] = useState('');
  const [formFat, setFormFat] = useState('');
  const [formWater, setFormWater] = useState('');

  const fetchNutritionData = async () => {
    try {
      setLoading(true);

      // 1. Fetch daily plan for target nutrition
      let { data: planData } = await supabase
        .from('daily_plans')
        .select('*')
        .eq('user_id', userId)
        .eq('date', currentDate)
        .maybeSingle();

      if (!planData) {
        // Fallback to latest program
        const { data: recentPlan } = await supabase
          .from('daily_plans')
          .select('*')
          .eq('user_id', userId)
          .order('date', { ascending: false })
          .limit(1)
          .maybeSingle();
        planData = recentPlan;
      }

      if (planData && planData.nutrition_plan) {
        const nutPlan = planData.nutrition_plan;
        setTargets({
          calories: parseInt(nutPlan.target_calories) || 1800,
          protein: parseInt(nutPlan.macros?.protein_g) || 120,
          carbs: parseInt(nutPlan.macros?.carb_g) || 200,
          fat: parseInt(nutPlan.macros?.fat_g) || 60
        });
      }

      // 2. Fetch logged nutrition for current date
      const { data: logData } = await supabase
        .from('nutrition_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('date', currentDate)
        .maybeSingle();

      if (logData) {
        setLogId(logData.id);
        setCaloriesIn(parseFloat(logData.consumed_kcal) || 0);
        setProteinIn(parseFloat(logData.protein_g) || 0);
        setCarbsIn(parseFloat(logData.carbs_g) || 0);
        setFatIn(parseFloat(logData.fat_g) || 0);
        setWaterIn(parseFloat(logData.water_ml) || 0);

        setFormCalories(logData.consumed_kcal?.toString() || '');
        setFormProtein(logData.protein_g?.toString() || '');
        setFormCarbs(logData.carbs_g?.toString() || '');
        setFormFat(logData.fat_g?.toString() || '');
        setFormWater(logData.water_ml?.toString() || '');
      } else {
        setLogId(null);
        setCaloriesIn(0);
        setProteinIn(0);
        setCarbsIn(0);
        setFatIn(0);
        setWaterIn(0);

        setFormCalories('');
        setFormProtein('');
        setFormCarbs('');
        setFormFat('');
        setFormWater('');
      }
    } catch (err) {
      console.error('Lỗi nạp dinh dưỡng:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNutritionData();
  }, [currentDate, userId]);

  // Recalculates and updates daily tracking adherence
  const updateAdherence = async (cal: number, prot: number, carb: number, fat: number) => {
    try {
      const calPct = Math.min((cal / targets.calories) * 100, 100);
      const protPct = Math.min((prot / targets.protein) * 100, 100);
      const carbPct = Math.min((carb / targets.carbs) * 100, 100);
      const fatPct = Math.min((fat / targets.fat) * 100, 100);
      
      const overallAdherence = Math.round((calPct + protPct + carbPct + fatPct) / 4);

      // Fetch existing daily tracking
      const { data: trackingData } = await supabase
        .from('daily_tracking')
        .select('*')
        .eq('user_id', userId)
        .eq('date', currentDate)
        .maybeSingle();

      await supabase
        .from('daily_tracking')
        .upsert({
          user_id: userId,
          date: currentDate,
          workout_completed_pct: trackingData?.workout_completed_pct || 0,
          nutrition_adherence_pct: overallAdherence,
          notes: trackingData?.notes || null
        }, { onConflict: 'user_id,date' });

    } catch (err) {
      console.error('Lỗi tính độ tuân thủ dinh dưỡng:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);

      const parsedCal = parseFloat(formCalories) || 0;
      const parsedProt = parseFloat(formProtein) || 0;
      const parsedCarb = parseFloat(formCarbs) || 0;
      const parsedFat = parseFloat(formFat) || 0;
      const parsedWater = parseFloat(formWater) || 0;

      const { data, error } = await supabase
        .from('nutrition_logs')
        .upsert({
          id: logId || undefined,
          user_id: userId,
          date: currentDate,
          consumed_kcal: parsedCal,
          protein_g: parsedProt,
          carbs_g: parsedCarb,
          fat_g: parsedFat,
          water_ml: parsedWater,
          target_kcal: targets.calories,
          goal_type: 'maintenance'
        }, { onConflict: 'user_id,date' })
        .select()
        .single();

      if (error) throw error;

      setLogId(data.id);
      setCaloriesIn(parsedCal);
      setProteinIn(parsedProt);
      setCarbsIn(parsedCarb);
      setFatIn(parsedFat);
      setWaterIn(parsedWater);

      await updateAdherence(parsedCal, parsedProt, parsedCarb, parsedFat);
      alert('Đã lưu nhật ký dinh dưỡng!');
    } catch (err) {
      console.error('Lỗi lưu dinh dưỡng:', err);
      alert('Đã xảy ra lỗi khi lưu nhật ký.');
    } finally {
      setSubmitting(false);
    }
  };

  // Quick water logging
  const handleQuickAddWater = async (amount: number) => {
    try {
      setSyncingWater(true);
      const newWater = waterIn + amount;
      setWaterIn(newWater);
      setFormWater(newWater.toString());

      const { data, error } = await supabase
        .from('nutrition_logs')
        .upsert({
          id: logId || undefined,
          user_id: userId,
          date: currentDate,
          consumed_kcal: caloriesIn,
          protein_g: proteinIn,
          carbs_g: carbsIn,
          fat_g: fatIn,
          water_ml: newWater,
          target_kcal: targets.calories,
          goal_type: 'maintenance'
        }, { onConflict: 'user_id,date' })
        .select()
        .single();

      if (error) throw error;
      setLogId(data.id);
    } catch (err) {
      console.error('Lỗi lưu nhanh nước uống:', err);
    } finally {
      setSyncingWater(false);
    }
  };

  // Percent calculation
  const calPercent = Math.min(Math.round((caloriesIn / targets.calories) * 100), 200);
  const proteinPercent = Math.min(Math.round((proteinIn / targets.protein) * 100), 200);
  const carbsPercent = Math.min(Math.round((carbsIn / targets.carbs) * 100), 200);
  const fatPercent = Math.min(Math.round((fatIn / targets.fat) * 100), 200);
  const waterPercent = Math.min(Math.round((waterIn / 2000) * 100), 200); // 2000ml standard water goal

  return (
    <MainLayout title="Theo dõi Dinh dưỡng">
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px', flexDirection: 'column', gap: '1rem' }}>
          <RefreshCw size={36} className="spin" style={{ animation: 'spin 2s linear infinite', color: 'var(--color-cyan)' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Đang tải nhật ký dinh dưỡng...</p>
        </div>
      ) : (
        <div className={styles.layoutGrid}>
          {/* Left Column: Visual Targets & Progress */}
          <div>
            {/* Calories Summary */}
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>
                <Flame size={20} color="var(--color-pink)" />
                Năng lượng tiêu thụ
              </h3>
              
              <div className={styles.kcalTargetCard}>
                <div className={styles.kcalDetails}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Đã nạp</span>
                  <span className={styles.kcalBigValue} style={{ color: 'var(--color-pink)' }}>
                    {caloriesIn} <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-muted)' }}>/ {targets.calories} kcal</span>
                  </span>
                </div>
                
                <div style={{ position: 'relative', width: '70px', height: '70px' }}>
                  {/* Small progress circle for calories */}
                  <svg width="70" height="70" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="35" cy="35" r="30" stroke="rgba(255,255,255,0.05)" strokeWidth="6" fill="transparent" />
                    <circle 
                      cx="35" 
                      cy="35" 
                      r="30" 
                      stroke="var(--color-pink)" 
                      strokeWidth="6" 
                      fill="transparent" 
                      strokeDasharray={2 * Math.PI * 30}
                      strokeDashoffset={2 * Math.PI * 30 - (calPercent / 100) * (2 * Math.PI * 30)}
                      strokeLinecap="round"
                      style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                    />
                  </svg>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 700 }}>
                    {calPercent}%
                  </div>
                </div>
              </div>

              {/* Macros Bars */}
              <div className={styles.progressList}>
                {/* Protein */}
                <div className={styles.progressItem}>
                  <div className={styles.progressLabel}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-cyan)' }} />
                      Protein (Đạm)
                    </span>
                    <span>{proteinIn}g / {targets.protein}g ({proteinPercent}%)</span>
                  </div>
                  <div className={styles.progressBarBg}>
                    <div 
                      className={styles.progressBarFill} 
                      style={{ 
                        width: `${Math.min(proteinPercent, 100)}%`, 
                        background: 'var(--color-cyan)',
                        boxShadow: '0 0 10px rgba(6, 182, 212, 0.3)'
                      }}
                    />
                  </div>
                </div>

                {/* Carbs */}
                <div className={styles.progressItem}>
                  <div className={styles.progressLabel}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-amber)' }} />
                      Carbohydrates (Đường/Tinh bột)
                    </span>
                    <span>{carbsIn}g / {targets.carbs}g ({carbsPercent}%)</span>
                  </div>
                  <div className={styles.progressBarBg}>
                    <div 
                      className={styles.progressBarFill} 
                      style={{ 
                        width: `${Math.min(carbsPercent, 100)}%`, 
                        background: 'var(--color-amber)',
                        boxShadow: '0 0 10px rgba(245, 158, 11, 0.3)'
                      }}
                    />
                  </div>
                </div>

                {/* Fat */}
                <div className={styles.progressItem}>
                  <div className={styles.progressLabel}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-purple)' }} />
                      Fats (Chất béo)
                    </span>
                    <span>{fatIn}g / {targets.fat}g ({fatPercent}%)</span>
                  </div>
                  <div className={styles.progressBarBg}>
                    <div 
                      className={styles.progressBarFill} 
                      style={{ 
                        width: `${Math.min(fatPercent, 100)}%`, 
                        background: 'var(--color-purple)',
                        boxShadow: '0 0 10px rgba(139, 92, 246, 0.3)'
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Water hydration Tracker */}
            <div className={`${styles.card} ${styles.waterCard}`}>
              <div>
                <h3 className={styles.cardTitle} style={{ border: 'none', marginBottom: '0.5rem', padding: '0' }}>
                  <Droplet size={20} color="var(--color-cyan)" />
                  Uống nước (Hydration)
                </h3>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-cyan)' }}>
                  {waterIn} ml <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-muted)' }}>/ 2,000 ml</span>
                </span>
              </div>

              <div className={styles.waterControls}>
                <button 
                  onClick={() => handleQuickAddWater(250)} 
                  disabled={syncingWater} 
                  className={styles.waterBtn}
                  title="Thêm 250ml nước"
                >
                  +250
                </button>
                <button 
                  onClick={() => handleQuickAddWater(500)} 
                  disabled={syncingWater} 
                  className={styles.waterBtn}
                  title="Thêm 500ml nước"
                >
                  +500
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Update Form */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>
              <Apple size={20} color="var(--color-green)" />
              Cập nhật thực tế nạp
            </h3>

            <form onSubmit={handleSubmit}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Tổng Calories nạp (kcal)</label>
                <input 
                  type="number" 
                  value={formCalories} 
                  onChange={(e) => setFormCalories(e.target.value)} 
                  placeholder="Ví dụ: 1550" 
                  className={styles.formInput}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Protein nạp (g)</label>
                <input 
                  type="number" 
                  value={formProtein} 
                  onChange={(e) => setFormProtein(e.target.value)} 
                  placeholder="Ví dụ: 110" 
                  className={styles.formInput}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Carbs nạp (g)</label>
                <input 
                  type="number" 
                  value={formCarbs} 
                  onChange={(e) => setFormCarbs(e.target.value)} 
                  placeholder="Ví dụ: 180" 
                  className={styles.formInput}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Chất béo nạp (g)</label>
                <input 
                  type="number" 
                  value={formFat} 
                  onChange={(e) => setFormFat(e.target.value)} 
                  placeholder="Ví dụ: 45" 
                  className={styles.formInput}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Nước uống thêm (ml)</label>
                <input 
                  type="number" 
                  value={formWater} 
                  onChange={(e) => setFormWater(e.target.value)} 
                  placeholder="Ví dụ: 1500" 
                  className={styles.formInput}
                />
              </div>

              <button type="submit" className={styles.btnSubmit} disabled={submitting}>
                {submitting ? (
                  <>
                    <RefreshCw size={18} className="spin" style={{ animation: 'spin 2s linear infinite' }} />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <>
                    <Check size={18} />
                    <span>Lưu nhật ký dinh dưỡng</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
