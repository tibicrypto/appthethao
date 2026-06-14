'use client';

import React, { useEffect, useState } from 'react';
import MainLayout from '@/components/MainLayout';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/context/AppContext';
import { 
  Calendar, 
  Dumbbell, 
  Apple, 
  Heart, 
  Check, 
  RefreshCw, 
  Save, 
  Award,
  Coffee
} from 'lucide-react';
import styles from './page.module.css';

interface Exercise {
  name: string;
  sets: number;
  reps: string;
  notes: string;
  duration_sec?: number;
  duration_min?: number;
  hr_zone?: string;
}

interface WorkoutSession {
  name: string;
  exercises: Exercise[];
}

export default function PlansPage() {
  const { currentDate, userId } = useApp();
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  
  // Plan states
  const [programName, setProgramName] = useState('Chưa có chương trình');
  const [workoutSession, setWorkoutSession] = useState<WorkoutSession | null>(null);
  const [nutritionPlan, setNutritionPlan] = useState<any>(null);
  const [recoveryPlan, setRecoveryPlan] = useState<any>(null);
  
  // Local checklist state
  const [checkedExercises, setCheckedExercises] = useState<boolean[]>([]);
  const [trackingNotes, setTrackingNotes] = useState('');
  const [nutritionAdherence, setNutritionAdherence] = useState(0);

  // Map JS Date.getDay() to Supabase plan schedule keys
  const getWeekdayName = (dateStr: string) => {
    const d = new Date(dateStr);
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return weekdays[d.getDay()];
  };

  const currentDayName = getWeekdayName(currentDate);

  const fetchPlanAndTracking = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch daily plan (try exact date first, if none, fetch most recent plan)
      let { data: planData } = await supabase
        .from('daily_plans')
        .select('*')
        .eq('user_id', userId)
        .eq('date', currentDate)
        .maybeSingle();

      if (!planData) {
        // Fetch most recent plan in database
        const { data: recentPlan } = await supabase
          .from('daily_plans')
          .select('*')
          .eq('user_id', userId)
          .order('date', { ascending: false })
          .limit(1)
          .maybeSingle();
        planData = recentPlan;
      }

      // 2. Fetch tracking details for the current date
      const { data: trackingData } = await supabase
        .from('daily_tracking')
        .select('*')
        .eq('user_id', userId)
        .eq('date', currentDate)
        .maybeSingle();

      // Parse plan contents
      if (planData) {
        setProgramName(planData.workout_plan?.program_name || 'Chương trình tập luyện');
        
        // Find session for current day
        const schedule = planData.workout_plan?.schedule || {};
        const session = schedule[currentDayName] || null;
        setWorkoutSession(session);
        
        setNutritionPlan(planData.nutrition_plan || null);
        setRecoveryPlan(planData.recovery_plan || null);

        // Load or initialize checklist
        if (session && session.exercises) {
          const exerciseCount = session.exercises.length;
          
          if (trackingData) {
            setTrackingNotes(trackingData.notes || '');
            setNutritionAdherence(trackingData.nutrition_adherence_pct || 0);

            // Estimate which exercises are checked based on stored workout_completed_pct
            const storedPct = parseFloat(trackingData.workout_completed_pct || 0);
            const checkedCount = Math.round((storedPct / 100) * exerciseCount);
            
            const initialChecked = Array(exerciseCount).fill(false);
            for (let i = 0; i < checkedCount; i++) {
              initialChecked[i] = true;
            }
            setCheckedExercises(initialChecked);
          } else {
            setTrackingNotes('');
            setNutritionAdherence(0);
            setCheckedExercises(Array(exerciseCount).fill(false));
          }
        } else {
          setCheckedExercises([]);
          setTrackingNotes(trackingData?.notes || '');
          setNutritionAdherence(trackingData?.nutrition_adherence_pct || 0);
        }
      } else {
        // No plan in database
        setProgramName('Chưa thiết lập chương trình');
        setWorkoutSession(null);
        setNutritionPlan(null);
        setRecoveryPlan(null);
        setCheckedExercises([]);
      }
    } catch (err) {
      console.error('Lỗi nạp kế hoạch:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlanAndTracking();
  }, [currentDate, userId]);

  // Handle checking/unchecking exercises
  const handleToggleExercise = async (index: number) => {
    if (!workoutSession || !workoutSession.exercises) return;

    const updated = [...checkedExercises];
    updated[index] = !updated[index];
    setCheckedExercises(updated);

    // Calculate new completion percentage
    const total = workoutSession.exercises.length;
    const checkedCount = updated.filter(Boolean).length;
    const completionPct = total > 0 ? Math.round((checkedCount / total) * 100) : 0;

    await saveTracking(completionPct, nutritionAdherence, trackingNotes);
  };

  // Handle updates to nutrition adherence slider
  const handleNutritionChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value) || 0;
    setNutritionAdherence(val);
  };

  const handleNutritionMouseUp = async () => {
    // Save to database when user releases the slider
    const total = workoutSession?.exercises?.length || 0;
    const checkedCount = checkedExercises.filter(Boolean).length;
    const workoutPct = total > 0 ? Math.round((checkedCount / total) * 100) : 0;

    await saveTracking(workoutPct, nutritionAdherence, trackingNotes);
  };

  const handleSaveNotes = async () => {
    const total = workoutSession?.exercises?.length || 0;
    const checkedCount = checkedExercises.filter(Boolean).length;
    const workoutPct = total > 0 ? Math.round((checkedCount / total) * 100) : 0;

    await saveTracking(workoutPct, nutritionAdherence, trackingNotes);
  };

  // Upsert tracking to Supabase
  const saveTracking = async (workoutPct: number, nutritionPct: number, notesStr: string) => {
    try {
      setSyncing(true);
      const { error } = await supabase
        .from('daily_tracking')
        .upsert({
          user_id: userId,
          date: currentDate,
          workout_completed_pct: workoutPct,
          nutrition_adherence_pct: nutritionPct,
          notes: notesStr
        }, { onConflict: 'user_id,date' });

      if (error) throw error;
    } catch (err) {
      console.error('Lỗi lưu tracking:', err);
    } finally {
      setSyncing(false);
    }
  };

  const getVNWeekday = (dayName: string) => {
    const mapping: Record<string, string> = {
      'Monday': 'Thứ Hai',
      'Tuesday': 'Thứ Ba',
      'Wednesday': 'Thứ Tư',
      'Thursday': 'Thứ Năm',
      'Friday': 'Thứ Sáu',
      'Saturday': 'Thứ Bảy',
      'Sunday': 'Chủ Nhật'
    };
    return mapping[dayName] || dayName;
  };

  // Total calculation for workout progress
  const totalExercises = workoutSession?.exercises?.length || 0;
  const completedExercisesCount = checkedExercises.filter(Boolean).length;
  const workoutProgressPct = totalExercises > 0 
    ? Math.round((completedExercisesCount / totalExercises) * 100) 
    : 0;

  return (
    <MainLayout title="Kế hoạch hàng ngày">
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px', flexDirection: 'column', gap: '1rem' }}>
          <RefreshCw size={36} className="spin" style={{ animation: 'spin 2s linear infinite', color: 'var(--color-cyan)' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Đang tải kế hoạch của bạn...</p>
        </div>
      ) : (
        <div className={styles.plansGrid}>
          {/* Left Side: Workout Checklist */}
          <div>
            <div className={styles.card}>
              <div className={styles.programMeta}>
                <div>
                  <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Chương trình tập</span>
                  <div className={styles.programName}>{programName}</div>
                </div>
                {syncing && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-green)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <RefreshCw size={12} className="spin" style={{ animation: 'spin 2s linear infinite' }} /> Đã đồng bộ
                  </span>
                )}
              </div>

              <div className={styles.sessionName}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Dumbbell size={22} color="var(--color-cyan)" />
                  <span>{getVNWeekday(currentDayName)}: {workoutSession?.name || 'Nghỉ ngơi'}</span>
                </div>
              </div>

              {workoutSession && totalExercises > 0 ? (
                <>
                  {/* Workout Progress Bar */}
                  <div className={styles.progressContainer}>
                    <div className={styles.progressHeader}>
                      <span>Tiến độ hoàn thành bài tập</span>
                      <span style={{ color: 'var(--color-green)' }}>
                        {completedExercisesCount}/{totalExercises} bài ({workoutProgressPct}%)
                      </span>
                    </div>
                    <div className={styles.progressBarBg}>
                      <div 
                        className={styles.progressBarFill} 
                        style={{ width: `${workoutProgressPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Exercise Checklist */}
                  <div className={styles.exerciseList}>
                    {workoutSession.exercises.map((exercise, idx) => {
                      const isChecked = checkedExercises[idx];
                      return (
                        <div 
                          key={idx} 
                          className={`${styles.exerciseItem} ${isChecked ? styles.exerciseItemChecked : ''}`}
                          onClick={() => handleToggleExercise(idx)}
                        >
                          <div className={styles.checkboxWrapper}>
                            <div className={`${styles.checkbox} ${isChecked ? styles.checkboxChecked : ''}`}>
                              {isChecked && <Check size={14} />}
                            </div>
                          </div>

                          <div className={styles.exerciseContent}>
                            <div className={`${styles.exerciseTitle} ${isChecked ? styles.exerciseTitleChecked : ''}`}>
                              {exercise.name}
                            </div>
                            
                            <div className={styles.exerciseTags}>
                              {exercise.sets && (
                                <span className={styles.exerciseTag}>
                                  {exercise.sets} sets
                                </span>
                              )}
                              {exercise.reps && (
                                <span className={styles.exerciseTag}>
                                  {exercise.reps} reps
                                </span>
                              )}
                              {exercise.hr_zone && (
                                <span className={`${styles.exerciseTag} ${styles.exerciseTagAccent}`}>
                                  ❤️ {exercise.hr_zone}
                                </span>
                              )}
                              {(exercise.duration_min || exercise.duration_sec) && (
                                <span className={`${styles.exerciseTag} ${styles.exerciseTagAccent}`}>
                                  ⏱️ {exercise.duration_min ? `${exercise.duration_min} phút` : `${exercise.duration_sec} giây`}
                                </span>
                              )}
                            </div>
                            
                            {exercise.notes && (
                              <p className={styles.exerciseNotes}>
                                💡 {exercise.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className={styles.emptyWorkout}>
                  <div className={styles.emptyWorkoutIcon}>☕</div>
                  <h4 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.5rem' }}>Ngày nghỉ ngơi hoàn toàn / chủ động</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', maxWidth: '300px' }}>
                    {workoutSession?.name === 'Nghỉ ngơi chủ động' || workoutSession?.name === 'Nghỉ ngơi chủ động (Active Recovery)'
                      ? 'Thực hiện các bài vận động nhẹ nhàng (như đi bộ nhẹ 30-45 phút) để tăng tuần hoàn hồi phục.' 
                      : 'Hôm nay không có lịch tập gym. Hãy dành thời gian hồi phục cơ bắp và chuẩn bị cho buổi tập tiếp theo.'}
                  </p>
                  
                  {workoutSession && workoutSession.exercises && workoutSession.exercises.length === 0 && (
                    <div style={{ marginTop: '1.5rem', background: 'rgba(255,255,255,0.02)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px dashed var(--border-color)', fontSize: '0.8rem', color: 'var(--color-cyan)' }}>
                      🚶‍♂️ <strong>Mục tiêu:</strong> Đạt tối thiểu 6,000 bước chân nhẹ nhàng.
                    </div>
                  )}
                </div>
              )}

              {/* Progress Notes */}
              <div className={styles.notesArea}>
                <label className={styles.notesLabel} style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Ghi chú tiến độ tập luyện hôm nay
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <textarea
                    value={trackingNotes}
                    onChange={(e) => setTrackingNotes(e.target.value)}
                    placeholder="Ví dụ: Hoàn thành tốt, các bài tập cảm nhận cơ rất sâu..."
                    className={styles.notesInput}
                  />
                  <button 
                    onClick={handleSaveNotes} 
                    className={styles.btnSubmit}
                    style={{ height: 'fit-content', padding: '0.75rem', alignSelf: 'flex-end', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    title="Lưu ghi chú"
                  >
                    <Save size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Nutrition & Recovery plans */}
          <div>
            {/* 1. Daily Nutrition targets */}
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>
                <Apple size={20} color="var(--color-green)" />
                Kế hoạch Dinh dưỡng
              </h3>

              {nutritionPlan ? (
                <>
                  <div className={styles.macroGrid}>
                    <div className={styles.macroCard}>
                      <span className={styles.macroLabel} style={{ color: 'var(--color-pink)' }}>Calories</span>
                      <div className={styles.macroValue} style={{ color: 'var(--color-pink)' }}>
                        {nutritionPlan.target_calories} <span style={{ fontSize: '0.75rem' }}>kcal</span>
                      </div>
                    </div>
                    <div className={styles.macroCard}>
                      <span className={styles.macroLabel} style={{ color: 'var(--color-cyan)' }}>Protein</span>
                      <div className={styles.macroValue} style={{ color: 'var(--color-cyan)' }}>
                        {nutritionPlan.macros?.protein_g} <span style={{ fontSize: '0.75rem' }}>g</span>
                      </div>
                    </div>
                    <div className={styles.macroCard}>
                      <span className={styles.macroLabel} style={{ color: 'var(--color-amber)' }}>Carbs</span>
                      <div className={styles.macroValue} style={{ color: 'var(--color-amber)' }}>
                        {nutritionPlan.macros?.carb_g} <span style={{ fontSize: '0.75rem' }}>g</span>
                      </div>
                    </div>
                  </div>

                  {/* Nutrition Adherence slider */}
                  <div style={{ marginBottom: '1.5rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                      <span>Mức độ tuân thủ ăn uống:</span>
                      <span style={{ color: 'var(--color-green)', fontWeight: 700 }}>{nutritionAdherence}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={nutritionAdherence}
                      onChange={handleNutritionChange}
                      onMouseUp={handleNutritionMouseUp}
                      onTouchEnd={handleNutritionMouseUp}
                      style={{ width: '100%', accentColor: 'var(--color-green)', cursor: 'pointer' }}
                    />
                  </div>

                  {/* Meal Samples */}
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>Thực đơn gợi ý mẫu</h4>
                  <div className={styles.mealList}>
                    {nutritionPlan.meal_plan_sample?.map((meal: any, idx: number) => (
                      <div key={idx} className={styles.mealItem}>
                        <div className={styles.mealMeta}>
                          <span className={styles.mealName}>{meal.meal}</span>
                          <span className={styles.mealFoods}>{meal.foods}</span>
                        </div>
                        <span className={styles.mealCalories}>
                          {meal.calories} kcal
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className={styles.emptyState}>Chưa lập kế hoạch dinh dưỡng</p>
              )}
            </div>

            {/* 2. Recovery targets */}
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>
                <Heart size={20} color="var(--color-purple)" />
                Kế hoạch Phục hồi
              </h3>

              {recoveryPlan ? (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div className={styles.recoveryItem}>
                    <span className={styles.recoveryLabel}>Số giờ ngủ mục tiêu</span>
                    <span className={styles.recoveryValue}>{recoveryPlan.sleep_target_hours} giờ</span>
                  </div>
                  
                  <div className={styles.recoveryItem}>
                    <span className={styles.recoveryLabel}>Giờ ngủ khuyến nghị</span>
                    <span className={styles.recoveryValue}>{recoveryPlan.sleep_bedtime}</span>
                  </div>

                  <div className={styles.recoveryItem}>
                    <span className={styles.recoveryLabel}>Uống nước (Hydration)</span>
                    <span className={styles.recoveryValue}>{recoveryPlan.hydration_liters} lít</span>
                  </div>

                  {recoveryPlan.stretching_focus && (
                    <div style={{ marginTop: '1rem' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                        Tập trung giãn cơ (Stretching):
                      </span>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', background: 'rgba(139, 92, 246, 0.04)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(139, 92, 246, 0.15)', lineHeight: 1.4 }}>
                        {recoveryPlan.stretching_focus}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className={styles.emptyState}>Chưa lập kế hoạch phục hồi</p>
              )}
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
