import React, { useEffect, useState } from 'react';
import api from '../../api';
import Layout from '../../components/Layout';

function TherapistSessionManage() {
  const [title, setTitle] = useState('');
  const [exercises, setExercises] = useState([]);

  const [exTitle, setExTitle] = useState('');
  const [videoFile, setVideoFile] = useState(null);
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('');
  const [repetitions, setRepetitions] = useState('');

  const [existingSessions, setExistingSessions] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const res = await api.get('/therapist/sessions');
      setExistingSessions(res.data);
    } catch (err) {
      console.error("Erreur chargement programmes", err);
    }
  };

  const addExercise = () => {
    if (!exTitle || !duration || !videoFile) {
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: "Titre, durée et vidéo sont obligatoires !", type: 'error' } }));
      return;
    }
    setExercises([...exercises, {
      title: exTitle, videoFile, description, duration: Number(duration), repetitions: Number(repetitions) || 1
    }]);
    setExTitle(''); setVideoFile(null); setDescription(''); setDuration(''); setRepetitions('');
    document.getElementById('fileUpload').value = ""; // reset file input visually
  };

  const removeExercise = (index) => {
    setExercises(exercises.filter((_, i) => i !== index));
  };
  const createSession = async () => {
    if (!title || exercises.length === 0) {
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: "Veuillez donner un titre et ajouter au moins un exercice.", type: 'error' } }));
      return;
    }

    const formData = new FormData();
    formData.append('title', title);

    const exercisesMeta = exercises.map(ex => ({
      title: ex.title,
      description: ex.description,
      duration: ex.duration,
      repetitions: ex.repetitions,
      videoPath: ex.videoPath || ''
    }));
    formData.append('exercisesData', JSON.stringify(exercisesMeta));

    exercises.forEach((ex, i) => {
      if (ex.videoFile) {
        formData.append(`video_${i}`, ex.videoFile);
      }
    });

    setUploading(true);
    setProgress(0);

    try {
      const config = {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setProgress(percentCompleted);
        },
      };

      if (editingId) {
        await api.put(`/therapist/sessions/${editingId}`, formData, config);
        window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: 'Programme mis à jour !', type: 'success' } }));
      } else {
        await api.post('/therapist/sessions', formData, config);
        window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: 'Programme créé avec succès !', type: 'success' } }));
      }
      resetForm();
      fetchSessions();
    } catch (err) {
      const backendMsg = err?.response?.data?.message;
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: backendMsg || "Erreur lors de l'enregistrement", type: 'error' } }));
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const resetForm = () => {
    setTitle('');
    setExercises([]);
    setEditingId(null);
    setExTitle(''); setVideoFile(null); setDescription(''); setDuration(''); setRepetitions('');
    if (document.getElementById('fileUpload')) document.getElementById('fileUpload').value = "";
  };

  const deleteSession = async (id) => {
    if (!window.confirm("Supprimer ce programme ?")) return;
    try {
      await api.delete(`/therapist/sessions/${id}`);
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: 'Programme supprimé', type: 'success' } }));
      fetchSessions();
    } catch (err) {
      const backendMsg = err?.response?.data?.message;
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: backendMsg || "Erreur suppression", type: 'error' } }));
    }
  };

  const loadForEdit = (s) => {
    setEditingId(s._id);
    setTitle(s.title);
    setExercises(s.exercises.map(ex => ({
      ...ex
    })));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Layout role="therapist">
      <h1 style={{ marginBottom: '24px' }}>Mes Programmes</h1>
      
      {/* Sticky Progress Bar for Mobile/Global view */}
      {uploading && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          backgroundColor: 'white',
          zIndex: 9999,
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          padding: '12px 16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12px', fontWeight: 'bold' }}>
            <span style={{ color: 'var(--primary)' }}>
              {progress < 100 ? `Upload : ${progress}%` : 'Traitement Cloudinary...'}
            </span>
            <span style={{ color: 'var(--text-muted)' }}>Ne fermez pas la page</span>
          </div>
          <div style={{ width: '100%', height: '6px', backgroundColor: '#e9ecef', borderRadius: '3px', overflow: 'hidden' }}>
            <div 
              style={{ 
                width: `${progress}%`, 
                height: '100%', 
                backgroundColor: 'var(--primary)', 
                transition: 'width 0.3s ease'
              }} 
            />
          </div>
        </div>
      )}
      <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 400px' }}>
          <div className="card">
            <h2 style={{ marginBottom: '16px', color: 'var(--text)' }}>{editingId ? 'Modifier le Programme' : 'Nouveau Programme'}</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>Ce programme sera accessible à tous les patients enregistrés.</p>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Nom du programme / Séance</label>
              <input type="text" className="input" placeholder="Ex: Réveil musculaire complet" value={title} onChange={e => setTitle(e.target.value)} />
            </div>
          </div>

          <div className="card" style={{ border: '1px solid #e8f5e9', backgroundColor: '#fcfdfc' }}>
            <h3 style={{ marginBottom: '16px' }}>Ajouter un exercice</h3>
            <div className="form-group">
              <label>Titre de l'exercice *</label>
              <input type="text" className="input" value={exTitle} onChange={e => setExTitle(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Vidéo (Fichier MP4/Mobile)</label>
              <input id="fileUpload" type="file" accept="video/*" className="input" style={{ padding: '8px' }} onChange={e => setVideoFile(e.target.files[0])} />
            </div>
            <div className="form-group">
              <label>Consignes d'exécution</label>
              <textarea className="input" style={{ height: '80px', resize: 'vertical' }} value={description} onChange={e => setDescription(e.target.value)}></textarea>
            </div>
            <div style={{ display: 'flex', gap: '16px' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Durée (s) *</label>
                <input type="number" className="input" value={duration} onChange={e => setDuration(e.target.value)} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Répétitions</label>
                <input type="number" className="input" value={repetitions} onChange={e => setRepetitions(e.target.value)} />
              </div>
            </div>
            <button type="button" onClick={addExercise} className="btn btn-secondary" style={{ width: '100%', marginTop: '8px' }}>+ Ajouter au programme</button>
          </div>
        </div>

        <div style={{ flex: '1 1 300px' }}>
          <div className="card" style={{ position: 'sticky', top: '24px' }}>
            <h3 style={{ marginBottom: '16px' }}>Exercices inclus ({exercises.length})</h3>
            {exercises.length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Aucun exercice n'a encore été ajouté.</p> : (
              <ul style={{ padding: 0, listStyle: 'none', margin: '0 0 24px 0' }}>
                {exercises.map((ex, i) => (
                  <li key={i} style={{ borderBottom: '1px solid var(--border)', padding: '12px 0', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ fontSize: '14px', color: 'var(--primary)' }}>{i + 1}. {ex.title}</strong><br />
                      <span style={{ color: 'var(--text-muted)' }}>⏱ {ex.duration}s &nbsp;|&nbsp; 🔄 {ex.repetitions}</span>
                      {ex.videoFile && <div style={{ fontSize: '11px', color: '#17a2b8', marginTop: '4px' }}>📁 Fichier associé</div>}
                    </div>
                    <button onClick={() => removeExercise(i)} style={{ color: '#e53935', background: '#ffebee', width: '28px', height: '28px', borderRadius: '14px', border: 'none', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                  </li>
                ))}
              </ul>
            )}
            {uploading && (
              <div style={{ marginTop: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                  <span style={{ fontWeight: '600', color: 'var(--primary)' }}>
                    {progress < 100 ? `Upload en cours : ${progress}%` : 'Traitement par Cloudinary...'}
                  </span>
                </div>
                <div style={{ width: '100%', height: '8px', backgroundColor: '#e9ecef', borderRadius: '4px', overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      width: `${progress}%`, 
                      height: '100%', 
                      backgroundColor: 'var(--primary)', 
                      transition: 'width 0.3s ease',
                      backgroundImage: progress === 100 ? 'linear-gradient(45deg, rgba(255,255,255,.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,.15) 50%, rgba(255,255,255,.15) 75%, transparent 75%, transparent)' : 'none',
                      backgroundSize: '1rem 1rem',
                      animation: progress === 100 ? 'progress-bar-stripes 1s linear infinite' : 'none'
                    }} 
                  />
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                  Veuillez ne pas fermer cette page pendant l'envoi.
                </p>
              </div>
            )}

            {!uploading && (
              <>
                <button onClick={createSession} className="btn" style={{ width: '100%', padding: '14px', fontSize: '15px' }}>
                  {editingId ? 'Mettre à jour le programme' : 'Enregistrer la séance'}
                </button>
                {editingId && (
                  <button onClick={resetForm} className="btn btn-secondary" style={{ width: '100%', marginTop: '12px' }}>
                    Annuler la modification
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <div style={{ marginTop: '48px' }}>
        <h2 style={{ marginBottom: '20px' }}>Bibliothèque des Programmes</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {existingSessions.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>Aucun programme enregistré pour le moment.</p>
          ) : existingSessions.map(s => (
            <div key={s._id} className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ margin: '0 0 8px 0', color: 'var(--primary)' }}>{s.title}</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{s.exercises.length} exercices inclus</p>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button onClick={() => loadForEdit(s)} className="btn btn-secondary" style={{ flex: 1, padding: '8px', fontSize: '12px' }}>Modifier</button>
                <button onClick={() => deleteSession(s._id)} className="btn btn-danger" style={{ flex: 1, padding: '8px', fontSize: '12px' }}>Supprimer</button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <style>{`
        @keyframes progress-bar-stripes {
          from { background-position: 1rem 0; }
          to { background-position: 0 0; }
        }
      `}</style>
    </Layout>
  );
}
export default TherapistSessionManage;
