import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../api';
import Layout from '../../components/Layout';
import VideoPlayer from '../../components/VideoPlayer';

const isCloudinaryVideoUrl = (path) => String(path || '').toLowerCase().includes('res.cloudinary.com');

function PatientSessionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);

  useEffect(() => {
    api.get(`/patient/sessions/${id}`).then(res => setSession(res.data)).catch(() => navigate('/login'));
  }, [id, navigate]);

  const validateExercise = async (exId, status) => {
    try {
      const res = await api.put(`/patient/sessions/${id}/exercise/${exId}`, { status });
      setSession(res.data);
    } catch (err) { 
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: "Erreur de validation", type: 'error' } }));
    }
  };

  const completeSession = async () => {
    try {
      const res = await api.put(`/patient/sessions/${id}/complete`);
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: `Félicitations ! Séance terminée. Score : ${res.data.newScore}`, type: 'success' } }));
      
      const level = res.data.newLevel || 'faible';
      let msg = "";
      if (level === 'faible') msg = "Continue tes efforts, chaque séance compte ! 🚀";
      else if (level === 'moyen') msg = "Super progression ! Tu es sur la bonne voie 💪";
      else msg = "Excellent travail ! Ton niveau est au top ! 🌟";
      
      localStorage.setItem('session_notification', JSON.stringify({ message: msg }));
      window.dispatchEvent(new Event('new_notification'));

      navigate('/patient/dashboard');
    } catch (err) { 
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: err.response?.data?.message || "Erreur lors de la validation finale", type: 'error' } }));
    }
  };

  if (!session) return <Layout role="patient"><div style={{padding: '24px', color:'var(--text-muted)'}}>Chargement en cours...</div></Layout>;

  const allCompleted = session.exercises.every(ex => ex.validationStatus !== 'pending');
  const sessionStatusLabel = session.status === 'completed' ? 'Terminée' : (session.status === 'in_progress' ? 'En cours' : 'À faire');

  return (
    <Layout role="patient">
      <div className="session-header-container">
        <div className="session-header-top">
          <Link to="/patient/sessions" className="back-link">
            <span className="back-icon">←</span>
            <span className="back-text">Mes séances</span>
          </Link>
          <div className="session-status-badge" data-status={session.status}>
            {sessionStatusLabel}
          </div>
        </div>
        <h1 className="session-main-title">{session.title}</h1>
      </div>

      <div className="exercises-timeline">
        {session.exercises.map((ex, index) => (
          <div key={ex._id} className="exercise-card-wrapper">
            {index < session.exercises.length - 1 && <div className="timeline-connector"></div>}
            <div className="exercise-card">
              <div className="exercise-index">Exercice {index + 1}</div>
              
              <div className="exercise-layout">
                {ex.videoPath && (
                  <div
                    className={`exercise-video-section${isCloudinaryVideoUrl(ex.videoPath) ? ' exercise-video-section--cloudinary' : ''}`}
                  >
                    <VideoPlayer videoPath={ex.videoPath} title={ex.title} />
                  </div>
                )}
                
                <div className="exercise-info-section">
                  <h2 className="exercise-title">{ex.title}</h2>
                  <p className="exercise-description">{ex.description}</p>
                  
                  <div className="exercise-stats">
                    <div className="stat-pill">
                      <span className="stat-icon">⏱</span>
                      <span className="stat-value">{ex.duration}s</span>
                    </div>
                    <div className="stat-pill">
                      <span className="stat-icon">🔄</span>
                      <span className="stat-value">{ex.repetitions} reps</span>
                    </div>
                  </div>
                  
                  <div className="exercise-actions">
                    {session.status !== 'completed' ? (
                      <div className="validation-buttons">
                        <button 
                          type="button"
                          onClick={() => validateExercise(ex._id, 'fait')} 
                          className={`action-btn success-btn ${ex.validationStatus === 'fait' ? 'active' : ''}`}
                        >
                          <span className="btn-icon">✓</span>
                          J'ai réussi
                        </button>
                        <button 
                          type="button"
                          onClick={() => validateExercise(ex._id, 'non fait')} 
                          className={`action-btn fail-btn ${ex.validationStatus === 'non fait' ? 'active' : ''}`}
                        >
                          <span className="btn-icon">✗</span>
                          Trop difficile
                        </button>
                      </div>
                    ) : (
                      <div className={`completion-status ${ex.validationStatus}`}>
                        {ex.validationStatus === 'fait' ? (
                          <><span>✓</span> Exercice accompli !</>
                        ) : (
                          <><span>✗</span> Pas effectué</>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {session.status !== 'completed' && (
        <div className="sticky-footer">
          <div className="footer-content">
            <div className="completion-stats-box">
              <div className="stats-label">Progression</div>
              <div className="stats-numbers">
                <span className="count-done">{session.exercises.filter(ex => ex.validationStatus !== 'pending').length}</span>
                <span className="count-total">/ {session.exercises.length}</span>
                <span className="count-suffix">exercices</span>
              </div>
            </div>
            <button 
              onClick={completeSession} 
              disabled={!allCompleted} 
              className={`btn btn-primary finish-btn ${allCompleted ? 'pulse-ready' : ''}`}
            >
              Terminer la séance
            </button>
          </div>
        </div>
      )}

      <style>{`
        .session-header-container {
          margin-bottom: 40px;
          animation: fadeInDown 0.6s ease;
        }

        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .exercise-card-wrapper {
          position: relative;
        }

        .timeline-connector {
          position: absolute;
          left: 40px;
          top: 100px;
          bottom: -40px;
          width: 3px;
          background: linear-gradient(180deg, var(--primary) 0%, #e2e8f0 100%);
          opacity: 0.3;
          z-index: 0;
        }

        .session-header-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .back-link {
          display: flex;
          align-items: center;
          gap: 10px;
          color: var(--text-muted);
          font-weight: 600;
          font-size: 15px;
          padding: 8px 16px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 10px rgba(0,0,0,0.03);
          transition: all 0.2s;
        }

        .back-link:hover {
          color: var(--primary);
          transform: translateX(-4px);
        }

        .session-status-badge {
          padding: 8px 16px;
          border-radius: 30px;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }

        .session-status-badge[data-status="completed"] {
          background: #dcfce7;
          color: #15803d;
        }

        .session-status-badge[data-status="in_progress"] {
          background: #ffedd5;
          color: #9a3412;
        }

        .session-main-title {
          font-size: 2.5rem;
          font-weight: 900;
          color: var(--text);
          margin: 0;
          line-height: 1.1;
          letter-spacing: -1px;
        }

        .exercises-timeline {
          display: flex;
          flex-direction: column;
          gap: 60px;
          padding-bottom: 160px;
        }

        .exercise-card {
          background: white;
          border-radius: 28px;
          padding: 40px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.04);
          border: 1px solid rgba(0,0,0,0.01);
          position: relative;
          z-index: 1;
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .exercise-card:hover {
          transform: translateY(-8px) scale(1.01);
          box-shadow: 0 30px 60px rgba(0,0,0,0.08);
        }

        .exercise-index {
          position: absolute;
          top: -18px;
          left: 40px;
          background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
          color: white;
          padding: 6px 20px;
          border-radius: 30px;
          font-size: 12px;
          font-weight: 800;
          box-shadow: 0 8px 20px rgba(88, 201, 207, 0.4);
          z-index: 10;
        }

        .exercise-layout {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 40px;
          align-items: start;
        }

        /* Empêche la grille de laisser la vidéo dépasser (min-width:auto par défaut) */
        .exercise-layout > * {
          min-width: 0;
        }

        .exercise-video-section {
          width: 100%;
          max-width: 100%;
        }

        .validation-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }

        .action-btn {
          flex: 1;
          min-width: min(100%, 160px);
          padding: 12px 18px;
          border-radius: 14px;
          font-weight: 700;
          font-size: 15px;
          cursor: pointer;
          border: 2px solid transparent;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.2s ease, color 0.2s ease;
          font-family: inherit;
          box-sizing: border-box;
        }

        .action-btn:active:not(:disabled) {
          transform: scale(0.98);
        }

        .success-btn {
          background: linear-gradient(135deg, rgba(88, 201, 207, 0.14) 0%, rgba(168, 157, 245, 0.12) 100%);
          color: var(--primary);
          border-color: rgba(88, 201, 207, 0.35);
        }

        .success-btn:hover {
          border-color: var(--primary);
          box-shadow: 0 6px 16px rgba(88, 201, 207, 0.2);
        }

        .success-btn.active {
          background: var(--primary);
          color: white;
          border-color: var(--primary);
          box-shadow: 0 8px 20px rgba(88, 201, 207, 0.35);
        }

        .fail-btn {
          background: #fef2f2;
          color: #b91c1c;
          border-color: rgba(185, 28, 28, 0.28);
        }

        .fail-btn:hover {
          border-color: rgba(185, 28, 28, 0.45);
          box-shadow: 0 4px 14px rgba(185, 28, 28, 0.12);
        }

        .fail-btn.active {
          background: #dc2626;
          color: white;
          border-color: #dc2626;
        }

        .exercise-title {
          font-size: 1.8rem;
          font-weight: 800;
          margin: 0 0 16px 0;
          color: var(--text);
          letter-spacing: -0.5px;
        }

        .exercise-description {
          color: #475569;
          font-size: 16px;
          line-height: 1.7;
          margin-bottom: 24px;
        }

        .exercise-stats {
          display: flex;
          gap: 16px;
          margin-bottom: 32px;
        }

        .stat-pill {
          background: #f1f5f9;
          padding: 10px 20px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 700;
          color: #1e293b;
          font-size: 15px;
        }

        .completion-stats-box {
          display: flex;
          flex-direction: column;
        }

        .stats-label {
          font-size: 11px;
          font-weight: 800;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 2px;
        }

        .stats-numbers {
          display: flex;
          align-items: baseline;
          gap: 4px;
        }

        .count-done {
          font-size: 28px;
          font-weight: 900;
          color: var(--primary);
          line-height: 1;
        }

        .count-total {
          font-size: 18px;
          font-weight: 700;
          color: #94a3b8;
        }

        .count-suffix {
          font-size: 14px;
          font-weight: 600;
          color: #64748b;
          margin-left: 4px;
        }

        .pulse-ready {
          animation: pulse-primary 2s infinite;
        }

        @keyframes pulse-primary {
          0% { box-shadow: 0 0 0 0 rgba(88, 201, 207, 0.4); }
          70% { box-shadow: 0 0 0 15px rgba(88, 201, 207, 0); }
          100% { box-shadow: 0 0 0 0 rgba(88, 201, 207, 0); }
        }

        @media (max-width: 1100px) {
          .exercise-layout {
            grid-template-columns: 1fr;
          }
          .timeline-connector {
            display: none;
          }
        }

        @media (max-width: 768px) {
          .session-main-title { font-size: 1.8rem; }
          .exercise-card { padding: 24px; border-radius: 24px; }
          .exercise-title { font-size: 1.4rem; }
          .exercise-index { left: 24px; }
          .back-link { padding: 6px 12px; font-size: 13px; }
          /* Vidéo Cloudinary : utilise toute la largeur utile de la carte */
          .exercise-video-section--cloudinary {
            margin-left: -24px;
            margin-right: -24px;
            width: calc(100% + 48px);
            max-width: none;
          }
          .validation-buttons {
            flex-direction: column;
          }
          .action-btn {
            min-width: 0;
            width: 100%;
          }
        }
      `}</style>
    </Layout>
  );
}

export default PatientSessionDetail;
