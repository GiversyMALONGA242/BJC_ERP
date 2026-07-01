import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify'; // ou votre système de notification

const BonsCommande = () => {
  const [bcs, setBcs] = useState([]);
  const [mode, setMode] = useState('list');
  const [articles, setArticles] = useState([]);
  const [clientId, setClientId] = useState('');
  const [notes, setNotes] = useState('');
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fonction pour récupérer la liste
  const charger = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get('/api/bons-commande');
      setBcs(data);
      console.log("Liste mise à jour :", data);
    } catch (err) {
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  // Fonction de validation corrigée
  const validerBC = async () => {
    if (!clientId) return toast.error('Selectionnez un client');
    if (!articles.length) return toast.error('Ajoutez au moins un article');
    
    setSaving(true);
    try {
      if (mode === 'modifier' && detail) {
        await api.put(`/api/bons-commande/${detail.id}`, { id_client: parseInt(clientId), articles, notes });
        toast.success('BC mis à jour');
      } else {
        const res = await api.post('/api/bons-commande', { id_client: parseInt(clientId), articles, notes });
        toast.success(`BC ${res.numero_bc} créé !`);
      }
      
      // Réinitialisation du formulaire
      setArticles([]); setClientId(''); setNotes('');
      
      // Attendre que la liste soit rechargée avant de changer de mode
      await charger(); 
      setMode('list'); 
      
    } catch (err) { 
      console.error(err);
      toast.error("Erreur lors de la validation");
    } finally { 
      setSaving(false); 
    }
  };

  return (
    <div>
      <h1>Gestion des Bons de Commande</h1>
      <p>Nombre de BC : {bcs.length}</p>

      {mode === 'list' ? (
        // Votre rendu de la liste ici...
        <button onClick={() => setMode('form')}>Nouveau BC</button>
      ) : (
        // Votre rendu du formulaire ici...
        <button onClick={validerBC} disabled={saving}>
          {saving ? 'Enregistrement...' : 'Valider le BC'}
        </button>
      )}
    </div>
  );
};

export default BonsCommande;
