'use client';

import React, { useEffect, useState } from 'react';
import MainLayout from '@/components/MainLayout';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/context/AppContext';
import { 
  Dumbbell, 
  Flame, 
  Clock, 
  Activity, 
  TrendingUp, 
  Plus, 
  Trash2, 
  RefreshCw,
  Award
} from 'lucide-react';
import styles from './page.module.css';

interface WorkoutLog {
  id: string;
  name: string;
  duration_min: number;
  active_energy_burned: number;
  avg_hr: number | null;
  distance_km: number | null;
  created_at: string;
}

export default function WorkoutsPage() {
  const { currentDate, userId } = useApp();
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Workouts data state
  const [logs, setLogs] = useState<WorkoutLog[]>([]);

  // Form input states
  const [workoutName, setWorkoutName] = useState('Traditional Strength Training');
  const [customWorkoutName, setCustomWorkoutName] = useState('');
  const [duration, setDuration] = useState('');
  const [calories, setCalories] = useState('');
  const [avgHr, setAvgHr] = useState('');
  const [distance, setDistance] = useState('');

  const fetchWorkouts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('workout_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('date', currentDate)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error('Lỗi nạp nhật ký tập luyện:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkouts();
  }, [currentDate, userId]);

  // Update daily metrics with sum of workouts active energy burned
  const syncDailyMetricsActiveEnergy = async (newLogs: WorkoutLog[]) => {
    try {
      const totalCalories = newLogs.reduce((sum, log) => sum + (parseFloat(log.active_energy_burned.toString()) || 0), 0);
      
      // Fetch existing daily metrics
      const { data: metricsData } = await supabase
        .from('daily_metrics')
        .select('id, step_count, basal_energy_kcal, resting_hr, sleep_total_hr, weight_kg')
        .eq('user_id', userId)
        .eq('date', currentDate)
        .maybeSingle();

      // Upsert metrics
      await supabase
        .from('daily_metrics')
        .upsert({
          user_id: userId,
          date: currentDate,
          active_energy_kcal: totalCalories,
          step_count: metricsData?.step_count || null,
          basal_energy_kcal: metricsData?.basal_energy_kcal || 1450,
          resting_hr: metricsData?.resting_hr || null,
          sleep_total_hr: metricsData?.sleep_total_hr || null,
          weight_kg: metricsData?.weight_kg || null
        }, { onConflict: 'user_id,date' });

      // Automatically update workout completion percentage in daily_tracking
      // (If they logged at least 1 workout, let's make it 100% completed)
      const { data: trackingData } = await supabase
        .from('daily_tracking')
        .select('*')
        .eq('user_id', userId)
        .eq('date', currentDate)
        .maybeSingle();
      
      if (!trackingData || trackingData.workout_completed_pct === null || trackingData.workout_completed_pct === 0) {
        await supabase
          .from('daily_tracking')
          .upsert({
            user_id: userId,
            date: currentDate,
            workout_completed_pct: 100,
            nutrition_adherence_pct: trackingData?.nutrition_adherence_pct || 0,
            notes: trackingData?.notes || `Đã tập: ${newLogs.map(l => l.name).join(', ')}`
          }, { onConflict: 'user_id,date' });
      }

    } catch (err) {
      console.error('Lỗi đồng bộ năng lượng tiêu hao:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      
      const name = workoutName === 'Custom' ? customWorkoutName : workoutName;
      if (!name) {
        alert('Vui lòng nhập tên bài tập!');
        return;
      }

      const parsedDuration = parseFloat(duration);
      const parsedCalories = parseFloat(calories);
      
      if (!parsedDuration || !parsedCalories) {
        alert('Vui lòng nhập Thời gian và Calories tiêu hao!');
        return;
      }

      const parsedHr = parseInt(avgHr) || null;
      const parsedDist = parseFloat(distance) || null;

      const { data: newLog, error } = await supabase
        .from('workout_logs')
        .insert({
          user_id: userId,
          date: currentDate,
          name,
          duration_min: parsedDuration,
          active_energy_burned: parsedCalories,
          avg_hr: parsedHr,
          distance_km: parsedDist
        })
        .select()
        .single();

      if (error) throw error;

      // Reset form
      setCustomWorkoutName('');
      setDuration('');
      setCalories('');
      setAvgHr('');
      setDistance('');

      // Refresh data
      const updatedLogs = [newLog, ...logs];
      setLogs(updatedLogs);
      await syncDailyMetricsActiveEnergy(updatedLogs);

    } catch (err) {
      console.error('Lỗi khi lưu workout:', err);
      alert('Đã xảy ra lỗi khi lưu nhật ký.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa nhật ký tập luyện này?')) return;
    
    try {
      const { error } = await supabase
        .from('workout_logs')
        .delete()
        .eq('id', id);

      if (error) throw error;

      const updatedLogs = logs.filter(log => log.id !== id);
      setLogs(updatedLogs);
      await syncDailyMetricsActiveEnergy(updatedLogs);
    } catch (err) {
      console.error('Lỗi khi xóa workout:', err);
      alert('Đã xảy ra lỗi khi xóa nhật ký.');
    }
  };

  // Compute daily summary
  const totalWorkouts = logs.length;
  const totalDuration = logs.reduce((sum, log) => sum + (parseFloat(log.duration_min?.toString()) || 0), 0);
  const totalCalories = logs.reduce((sum, log) => sum + (parseFloat(log.active_energy_burned?.toString()) || 0), 0);

  return (
    <MainLayout title="Nhật ký Tập luyện">
      <div className={styles.layoutGrid}>
        {/* Left Column: Form to log workout */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>
            <Plus size={20} color="var(--color-cyan)" />
            Ghi nhận buổi tập
          </h3>
          
          <form onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Loại hình tập luyện</label>
              <select 
                value={workoutName} 
                onChange={(e) => setWorkoutName(e.target.value)} 
                className={styles.formInput}
                style={{ background: 'var(--bg-secondary)', cursor: 'pointer' }}
              >
                <option value="Traditional Strength Training">Tập gym (Kháng lực)</option>
                <option value="Running">Chạy bộ (Running)</option>
                <option value="Swimming">Bơi lội (Swimming)</option>
                <option value="Yoga">Yoga</option>
                <option value="Cycling">Đạp xe (Cycling)</option>
                <option value="Custom">Khác (Tự nhập...)</option>
              </select>
            </div>

            {workoutName === 'Custom' && (
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Tên bài tập tự định nghĩa</label>
                <input 
                  type="text" 
                  value={customWorkoutName} 
                  onChange={(e) => setCustomWorkoutName(e.target.value)} 
                  placeholder="Ví dụ: Đấm bốc, HIIT..." 
                  className={styles.formInput}
                  required
                />
              </div>
            )}

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Thời lượng tập (phút)</label>
              <input 
                type="number" 
                step="0.1"
                value={duration} 
                onChange={(e) => setDuration(e.target.value)} 
                placeholder="Ví dụ: 45" 
                className={styles.formInput}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Active Energy burned (kcal)</label>
              <input 
                type="number" 
                value={calories} 
                onChange={(e) => setCalories(e.target.value)} 
                placeholder="Ví dụ: 300" 
                className={styles.formInput}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Nhịp tim trung bình (bpm) - Không bắt buộc</label>
              <input 
                type="number" 
                value={avgHr} 
                onChange={(e) => setAvgHr(e.target.value)} 
                placeholder="Ví dụ: 135" 
                className={styles.formInput}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Cự ly (km) - Chỉ cho Chạy/Đạp xe/Bơi</label>
              <input 
                type="number" 
                step="0.01"
                value={distance} 
                onChange={(e) => setDistance(e.target.value)} 
                placeholder="Ví dụ: 3.5" 
                className={styles.formInput}
              />
            </div>

            <button type="submit" className={styles.btnSubmit} disabled={submitting}>
              {submitting ? (
                <>
                  <RefreshCw size={18} className="spin" style={{ animation: 'spin 2s linear infinite' }} />
                  <span>Đang ghi nhận...</span>
                </>
              ) : (
                <>
                  <Dumbbell size={18} />
                  <span>Lưu buổi tập</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: List and Summary */}
        <div>
          {/* Summary Row */}
          <div className={styles.summaryGrid}>
            <div className={styles.summaryCard}>
              <span className={styles.summaryLabel}>Buổi tập</span>
              <span className={styles.summaryValue} style={{ color: 'var(--color-cyan)' }}>{totalWorkouts}</span>
            </div>
            
            <div className={styles.summaryCard}>
              <span className={styles.summaryLabel}>Tổng thời gian</span>
              <span className={styles.summaryValue} style={{ color: 'var(--color-purple)' }}>{totalDuration.toFixed(1)} <span style={{ fontSize: '0.75rem' }}>phút</span></span>
            </div>

            <div className={styles.summaryCard}>
              <span className={styles.summaryLabel}>Tổng tiêu hao</span>
              <span className={styles.summaryValue} style={{ color: 'var(--color-pink)' }}>{totalCalories} <span style={{ fontSize: '0.75rem' }}>kcal</span></span>
            </div>
          </div>

          {/* Logs List */}
          <div className={styles.card} style={{ minHeight: '300px' }}>
            <h3 className={styles.cardTitle}>
              <TrendingUp size={20} color="var(--color-pink)" />
              Danh sách tập luyện trong ngày
            </h3>

            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
                <RefreshCw size={24} className="spin" style={{ animation: 'spin 2s linear infinite', color: 'var(--color-pink)' }} />
              </div>
            ) : logs.length > 0 ? (
              <div className={styles.historyList}>
                {logs.map((log) => (
                  <div key={log.id} className={styles.historyItem}>
                    <div className={styles.workoutInfo}>
                      <span className={styles.workoutName}>{log.name}</span>
                      <div className={styles.workoutMeta}>
                        <span className={styles.metaItem}>
                          <Clock size={12} />
                          {log.duration_min} phút
                        </span>
                        {log.avg_hr && (
                          <span className={styles.metaItem}>
                            <Activity size={12} />
                            {log.avg_hr} bpm
                          </span>
                        )}
                        {log.distance_km && log.distance_km > 0 && (
                          <span className={styles.metaItem}>
                            📍 {log.distance_km} km
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div className={styles.kcalBurned}>
                        <Flame size={16} />
                        {log.active_energy_burned} kcal
                      </div>
                      <button 
                        onClick={() => handleDelete(log.id)}
                        className={styles.deleteBtn}
                        title="Xóa nhật ký này"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyHistory}>
                Chưa có buổi tập nào được ghi nhận cho ngày này. Hãy điền form bên trái để ghi nhận buổi tập đầu tiên của bạn!
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
