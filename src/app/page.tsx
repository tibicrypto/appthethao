'use client';

import React, { useEffect, useState } from 'react';
import MainLayout from '@/components/MainLayout';
import SVGRingProgress from '@/components/SVGRingProgress';
import { SVGBarChart, SVGLineChart } from '@/components/SVGCharts';
import { supabase, DEFAULT_USER_ID } from '@/lib/supabase';
import { useApp } from '@/context/AppContext';
import { 
  Footprints, 
  Flame, 
  Moon, 
  Scale, 
  Sparkles, 
  CheckSquare, 
  Smile, 
  Activity, 
  Plus, 
  RefreshCw 
} from 'lucide-react';
import styles from './page.module.css';

// Type definitions
interface DailyReadiness {
  score: number;
  sleep_score: number;
  rhr_score: number;
  activity_load_score: number;
  level: string;
  recommendation: string;
  adjustment: string;
}

interface DailyMetrics {
  step_count: number;
  active_energy_kcal: number;
  basal_energy_kcal: number;
  resting_hr: number;
  sleep_total_hr: number;
  weight_kg: number;
}

interface DailyTracking {
  workout_completed_pct: number;
  nutrition_adherence_pct: number;
  notes: string;
}

interface Biofeedback {
  energy_level: number;
  mood: string;
  soreness_data: any;
}

export default function DashboardPage() {
  const { currentDate, userId } = useApp();
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  
  // Data states
  const [readiness, setReadiness] = useState<DailyReadiness | null>(null);
  const [metrics, setMetrics] = useState<DailyMetrics | null>(null);
  const [tracking, setTracking] = useState<DailyTracking | null>(null);
  const [biofeedback, setBiofeedback] = useState<Biofeedback | null>(null);
  const [weeklyMetrics, setWeeklyMetrics] = useState<any[]>([]);

  // Modal states
  const [isMetricsModalOpen, setIsMetricsModalOpen] = useState(false);
  
  // Form input states
  const [formSteps, setFormSteps] = useState('');
  const [formActiveKcal, setFormActiveKcal] = useState('');
  const [formRestingHr, setFormRestingHr] = useState('');
  const [formSleep, setFormSleep] = useState('');
  const [formWeight, setFormWeight] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch daily readiness
      const { data: readinessData } = await supabase
        .from('daily_readiness')
        .select('*')
        .eq('user_id', userId)
        .eq('date', currentDate)
        .maybeSingle();

      // 2. Fetch daily metrics
      const { data: metricsData } = await supabase
        .from('daily_metrics')
        .select('*')
        .eq('user_id', userId)
        .eq('date', currentDate)
        .maybeSingle();

      // 3. Fetch daily tracking
      const { data: trackingData } = await supabase
        .from('daily_tracking')
        .select('*')
        .eq('user_id', userId)
        .eq('date', currentDate)
        .maybeSingle();

      // 4. Fetch biofeedback
      const { data: bioData } = await supabase
        .from('biofeedback')
        .select('*')
        .eq('user_id', userId)
        .eq('date', currentDate)
        .maybeSingle();

      // 5. Fetch past 7 days for charts
      const startDate = new Date(currentDate);
      startDate.setDate(startDate.getDate() - 6);
      const startDateStr = startDate.toISOString().split('T')[0];

      const { data: chartData } = await supabase
        .from('daily_metrics')
        .select('date, step_count, active_energy_kcal, sleep_total_hr, weight_kg')
        .eq('user_id', userId)
        .gte('date', startDateStr)
        .lte('date', currentDate)
        .order('date', { ascending: true });

      // Process states
      setReadiness(readinessData);
      setMetrics(metricsData);
      setTracking(trackingData);
      setBiofeedback(bioData);

      // Setup form defaults
      if (metricsData) {
        setFormSteps(metricsData.step_count?.toString() || '');
        setFormActiveKcal(metricsData.active_energy_kcal?.toString() || '');
        setFormRestingHr(metricsData.resting_hr?.toString() || '');
        setFormSleep(metricsData.sleep_total_hr?.toString() || '');
        setFormWeight(metricsData.weight_kg?.toString() || '');
      } else {
        setFormSteps('');
        setFormActiveKcal('');
        setFormRestingHr('');
        setFormSleep('');
        setFormWeight('');
      }

      // Process weekly chart data (fill missing dates with 0 so chart always looks nice)
      const weekList = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(currentDate);
        d.setDate(d.getDate() - i);
        const dStr = d.toISOString().split('T')[0];
        const match = chartData?.find(item => item.date === dStr);
        
        // Formatted label (e.g., "14/06")
        const label = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
        
        weekList.push({
          date: dStr,
          label,
          steps: match?.step_count || 0,
          activeKcal: match ? parseFloat(match.active_energy_kcal) : 0,
          sleep: match ? parseFloat(match.sleep_total_hr) : 0,
        });
      }
      setWeeklyMetrics(weekList);

    } catch (err) {
      console.error('Lỗi khi fetch dữ liệu:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentDate, userId]);

  const handleUpdateMetrics = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setUpdating(true);

      const parsedSteps = parseInt(formSteps) || null;
      const parsedActiveKcal = parseFloat(formActiveKcal) || null;
      const parsedRestingHr = parseInt(formRestingHr) || null;
      const parsedSleep = parseFloat(formSleep) || null;
      const parsedWeight = parseFloat(formWeight) || null;

      // 1. Upsert daily metrics
      const { data: upsertedMetrics, error: metricsErr } = await supabase
        .from('daily_metrics')
        .upsert({
          user_id: userId,
          date: currentDate,
          step_count: parsedSteps,
          active_energy_kcal: parsedActiveKcal,
          basal_energy_kcal: 1450, // Static basal calorie estimation
          resting_hr: parsedRestingHr,
          sleep_total_hr: parsedSleep,
          weight_kg: parsedWeight
        }, { onConflict: 'user_id,date' })
        .select()
        .single();

      if (metricsErr) throw metricsErr;

      // 2. Automatically calculate and updates daily readiness
      // Readiness is a composite score based on sleep hours and resting HR.
      // - Sleep hours: ideal is 7-9 hours.
      // - Resting heart rate: ideal is 50-65.
      if (parsedSleep !== null || parsedRestingHr !== null) {
        let sleepScore = 50;
        if (parsedSleep) {
          // Score peak at 8 hours sleep
          const diff = Math.abs(8 - parsedSleep);
          sleepScore = Math.max(100 - (diff * 20), 20);
        }

        let rhrScore = 50;
        if (parsedRestingHr) {
          // Score peak between 50-60 RHR
          if (parsedRestingHr >= 50 && parsedRestingHr <= 60) {
            rhrScore = 100;
          } else {
            const diff = parsedRestingHr < 50 ? 50 - parsedRestingHr : parsedRestingHr - 60;
            rhrScore = Math.max(100 - (diff * 5), 20);
          }
        }

        const activityScore = 80; // Default active score
        const overallScore = Math.round((sleepScore * 0.45) + (rhrScore * 0.35) + (activityScore * 0.20));
        
        let level = 'Khá';
        let recommendation = 'Cơ thể bạn đang ở trạng thái cân bằng tốt. Hôm nay rất thích hợp cho các bài tập cường độ trung bình đến cao.';
        let adjustment = 'Không cần thay đổi kế hoạch tập.';

        if (overallScore >= 85) {
          level = 'Tối ưu';
          recommendation = 'Tuyệt vời! Cơ thể phục hồi hoàn toàn. Hãy thử phá kỷ lục cá nhân (PR) trong buổi tập hôm nay nhé!';
          adjustment = 'Sẵn sàng tăng thêm 5-10% cường độ tập.';
        } else if (overallScore < 65) {
          level = 'Cần nghỉ ngơi';
          recommendation = 'Nhịp tim nghỉ hoặc giấc ngủ chưa tốt. Cơ thể đang có dấu hiệu mệt mỏi.';
          adjustment = 'Hãy đổi sang bài cardio nhẹ nhàng hoặc giãn cơ chủ động.';
        }

        await supabase
          .from('daily_readiness')
          .upsert({
            user_id: userId,
            date: currentDate,
            score: overallScore,
            sleep_score: sleepScore,
            rhr_score: rhrScore,
            activity_load_score: activityScore,
            level,
            recommendation,
            adjustment
          }, { onConflict: 'user_id,date' });
      }

      setIsMetricsModalOpen(false);
      fetchData();
    } catch (err) {
      console.error('Lỗi lưu chỉ số:', err);
      alert('Đã xảy ra lỗi khi cập nhật chỉ số.');
    } finally {
      setUpdating(false);
    }
  };

  // Safe fallback display values
  const currentReadinessScore = readiness?.score || 0;
  const currentReadinessLevel = readiness?.level || 'Chưa cập nhật';
  const currentReadinessRec = readiness?.recommendation || 'Nhập chỉ số thể chất (như Giấc ngủ, Nhịp tim) để AuraFit tính toán trạng thái hồi phục của bạn.';
  const currentReadinessAdj = readiness?.adjustment || '';

  const stepsVal = metrics?.step_count || 0;
  const sleepVal = metrics?.sleep_total_hr || 0;
  const activeCalVal = metrics?.active_energy_kcal ? parseFloat(metrics.active_energy_kcal.toString()) : 0;
  const basalCalVal = metrics?.basal_energy_kcal ? parseFloat(metrics.basal_energy_kcal.toString()) : 1450;
  const totalCalVal = Math.round(activeCalVal + basalCalVal);
  const weightVal = metrics?.weight_kg || 0;
  const hrVal = metrics?.resting_hr || 0;

  // Format date display (VN style)
  const displayDateFormatted = () => {
    const d = new Date(currentDate);
    const days = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
    return `${days[d.getDay()]}, Ngày ${d.getDate()} Tháng ${d.getMonth() + 1}`;
  };

  return (
    <MainLayout title="Dashboard">
      {/* Top Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Xin chào, Minh Nhật 👋</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            {displayDateFormatted()}
          </p>
        </div>
        <button 
          className={styles.btnSubmit} 
          onClick={() => setIsMetricsModalOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Plus size={18} />
          <span>Cập nhật chỉ số</span>
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px', flexDirection: 'column', gap: '1rem' }}>
          <RefreshCw size={36} className="spin" style={{ animation: 'spin 2s linear infinite', color: 'var(--color-cyan)' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Đang đồng bộ dữ liệu với Supabase...</p>
        </div>
      ) : (
        <>
          {/* Main Grid: Readiness & Metrics */}
          <div className={styles.dashboardGrid}>
            {/* 1. Readiness Circular Ring */}
            <div className={`${styles.card} ${styles.readinessCard}`}>
              <h3 className={styles.cardTitle}>
                <Sparkles size={18} color="var(--color-cyan)" />
                Điểm sẵn sàng tập
              </h3>
              
              <SVGRingProgress 
                value={currentReadinessScore} 
                color={currentReadinessScore >= 85 ? 'var(--color-green)' : currentReadinessScore >= 65 ? 'var(--color-cyan)' : currentReadinessScore > 0 ? 'var(--color-pink)' : 'var(--text-muted)'}
                unit="Score"
              />

              <div className={styles.readinessInfo}>
                <div 
                  className={styles.readinessLevel} 
                  style={{ 
                    color: currentReadinessScore >= 85 ? 'var(--color-green)' : currentReadinessScore >= 65 ? 'var(--color-cyan)' : currentReadinessScore > 0 ? 'var(--color-pink)' : 'var(--text-muted)' 
                  }}
                >
                  {currentReadinessLevel}
                </div>
                <p className={styles.readinessDesc}>{currentReadinessRec}</p>
                {currentReadinessAdj && (
                  <div style={{ fontSize: '0.8rem', background: 'rgba(255,255,255,0.03)', padding: '0.5rem', borderRadius: '8px', border: '1px dashed var(--border-color)', color: 'var(--color-purple)' }}>
                    💡 <strong>Điều chỉnh khuyên dùng:</strong> {currentReadinessAdj}
                  </div>
                )}
              </div>
            </div>

            {/* 2. Physical Metrics Grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className={styles.metricsGrid}>
                {/* Steps */}
                <div className={`${styles.card} ${styles.metricCard}`}>
                  <div className={styles.iconContainer} style={{ background: 'rgba(6, 182, 212, 0.1)' }}>
                    <Footprints size={24} color="var(--color-cyan)" />
                  </div>
                  <div className={styles.metricDetails}>
                    <span className={styles.metricLabel}>Số bước chân</span>
                    <span className={styles.metricValue}>
                      {stepsVal.toLocaleString()}
                      <span className={styles.metricUnit}>bước</span>
                    </span>
                  </div>
                </div>

                {/* Energy Burned */}
                <div className={`${styles.card} ${styles.metricCard}`}>
                  <div className={styles.iconContainer} style={{ background: 'rgba(244, 63, 94, 0.1)' }}>
                    <Flame size={24} color="var(--color-pink)" />
                  </div>
                  <div className={styles.metricDetails}>
                    <span className={styles.metricLabel}>Năng lượng tiêu hao</span>
                    <span className={styles.metricValue}>
                      {totalCalVal}
                      <span className={styles.metricUnit}>kcal</span>
                    </span>
                  </div>
                </div>

                {/* Sleep duration */}
                <div className={`${styles.card} ${styles.metricCard}`}>
                  <div className={styles.iconContainer} style={{ background: 'rgba(139, 92, 246, 0.1)' }}>
                    <Moon size={24} color="var(--color-purple)" />
                  </div>
                  <div className={styles.metricDetails}>
                    <span className={styles.metricLabel}>Giấc ngủ đêm qua</span>
                    <span className={styles.metricValue}>
                      {sleepVal.toFixed(1)}
                      <span className={styles.metricUnit}>giờ</span>
                    </span>
                  </div>
                </div>

                {/* Weight */}
                <div className={`${styles.card} ${styles.metricCard}`}>
                  <div className={styles.iconContainer} style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
                    <Scale size={24} color="var(--color-green)" />
                  </div>
                  <div className={styles.metricDetails}>
                    <span className={styles.metricLabel}>Cân nặng cơ thể</span>
                    <span className={styles.metricValue}>
                      {weightVal > 0 ? `${weightVal} kg` : 'Chưa nhập'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Heart rate & recovery indices */}
              <div className={styles.card} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Activity size={20} color="var(--color-pink)" />
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Nhịp tim nghỉ (RHR)</span>
                </div>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-pink)' }}>
                  {hrVal > 0 ? `${hrVal} bpm` : 'Chưa có dữ liệu'}
                </span>
              </div>
            </div>
          </div>

          {/* Weekly Performance Charts */}
          <div className={styles.chartsSection}>
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>
                <Footprints size={18} color="var(--color-cyan)" />
                Thống kê bước chân hàng tuần
              </h3>
              <SVGBarChart 
                data={weeklyMetrics.map(w => ({ label: w.label, value: w.steps }))}
                color="var(--color-cyan)"
                valueSuffix=" bước"
              />
            </div>

            <div className={styles.card}>
              <h3 className={styles.cardTitle}>
                <Flame size={18} color="var(--color-pink)" />
                Năng lượng tập luyện (Active Kcal)
              </h3>
              <SVGBarChart 
                data={weeklyMetrics.map(w => ({ label: w.label, value: Math.round(w.activeKcal) }))}
                color="var(--color-pink)"
                valueSuffix=" kcal"
              />
            </div>
          </div>

          {/* Extra Row: Checklist status & Biofeedback status */}
          <div className={styles.secondaryRow}>
            {/* Checklist Adherence */}
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>
                <CheckSquare size={18} color="var(--color-green)" />
                Tiến độ thực hiện kế hoạch
              </h3>
              
              <div className={styles.progressItem}>
                <div className={styles.progressLabel}>
                  <span>Buổi tập trong ngày</span>
                  <span>{tracking?.workout_completed_pct || 0}%</span>
                </div>
                <div className={styles.progressBarBg}>
                  <div 
                    className={styles.progressBarFill} 
                    style={{ 
                      width: `${tracking?.workout_completed_pct || 0}%`, 
                      background: 'var(--color-cyan)' 
                    }}
                  />
                </div>
              </div>

              <div className={styles.progressItem}>
                <div className={styles.progressLabel}>
                  <span>Dinh dưỡng và Macros</span>
                  <span>{tracking?.nutrition_adherence_pct || 0}%</span>
                </div>
                <div className={styles.progressBarBg}>
                  <div 
                    className={styles.progressBarFill} 
                    style={{ 
                      width: `${tracking?.nutrition_adherence_pct || 0}%`, 
                      background: 'var(--color-green)' 
                    }}
                  />
                </div>
              </div>
              
              {tracking?.notes && (
                <div style={{ marginTop: '1.25rem', fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  📝 <strong>Nhật ký tiến độ:</strong> {tracking.notes}
                </div>
              )}
            </div>

            {/* Subjective biofeedback */}
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>
                <Smile size={18} color="var(--color-purple)" />
                Phản hồi sinh học cơ thể
              </h3>
              
              {biofeedback ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Mức năng lượng:</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-purple)' }}>{biofeedback.energy_level}/10</span>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Tâm trạng hôm nay:</span>
                    <span style={{ fontSize: '0.95rem', fontWeight: 600, textTransform: 'capitalize' }}>{biofeedback.mood || 'Chưa cập nhật'}</span>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>Tình trạng nhức mỏi cơ:</span>
                    {biofeedback.soreness_data && Object.keys(biofeedback.soreness_data).length > 0 ? (
                      <div className={styles.biofeedbackTags}>
                        {Object.entries(biofeedback.soreness_data).map(([muscle, level]: any) => (
                          <span 
                            key={muscle} 
                            className={`${styles.bioTag} ${level !== 'fine' && level !== 'normal' ? styles.bioTagSore : styles.bioTagFine}`}
                          >
                            {muscle}: {level === 'sore' ? 'mỏi' : level === 'tight' ? 'căng' : 'tốt'}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className={styles.emptyState}>Không mỏi cơ</span>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', alignItems: 'center', gap: '0.5rem' }}>
                  <span className={styles.emptyState}>Hôm nay chưa thực hiện đánh giá biofeedback.</span>
                  <a 
                    href={`/biofeedback?date=${currentDate}`}
                    style={{ fontSize: '0.8rem', color: 'var(--color-purple)', fontWeight: 600, textDecoration: 'underline' }}
                  >
                    Đánh giá ngay &rarr;
                  </a>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Edit Metrics Modal */}
      {isMetricsModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Cập nhật chỉ số trong ngày</h3>
              <button className={styles.closeBtn} onClick={() => setIsMetricsModalOpen(false)}>&times;</button>
            </div>
            
            <form onSubmit={handleUpdateMetrics}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Số bước chân</label>
                <input 
                  type="number" 
                  value={formSteps} 
                  onChange={(e) => setFormSteps(e.target.value)} 
                  placeholder="Ví dụ: 8000" 
                  className={styles.formInput}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Active Energy burned (kcal)</label>
                <input 
                  type="number" 
                  value={formActiveKcal} 
                  onChange={(e) => setFormActiveKcal(e.target.value)} 
                  placeholder="Ví dụ: 350" 
                  className={styles.formInput}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Nhịp tim nghỉ (Resting HR - bpm)</label>
                <input 
                  type="number" 
                  value={formRestingHr} 
                  onChange={(e) => setFormRestingHr(e.target.value)} 
                  placeholder="Ví dụ: 55" 
                  className={styles.formInput}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Giấc ngủ (Số giờ ngủ)</label>
                <input 
                  type="number" 
                  step="0.1" 
                  value={formSleep} 
                  onChange={(e) => setFormSleep(e.target.value)} 
                  placeholder="Ví dụ: 7.5" 
                  className={styles.formInput}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Cân nặng (kg)</label>
                <input 
                  type="number" 
                  step="0.1" 
                  value={formWeight} 
                  onChange={(e) => setFormWeight(e.target.value)} 
                  placeholder="Ví dụ: 72.5" 
                  className={styles.formInput}
                />
              </div>

              <div className={styles.formActions}>
                <button type="button" className={styles.btnCancel} onClick={() => setIsMetricsModalOpen(false)}>Hủy</button>
                <button type="submit" className={styles.btnSubmit} disabled={updating}>
                  {updating ? 'Đang lưu...' : 'Lưu chỉ số'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
