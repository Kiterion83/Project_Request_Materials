// ============================================================
// MATERIALS MANAGER V25 - STREICHER EDITION - COMPLETE FIXED
// ============================================================
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';
const supabase = createClient(supabaseUrl, supabaseKey);

const COLORS = {
  primary: '#E31E24',
  primaryDark: '#B91C1C',
  secondary: '#1F2937',
  accent: '#374151',
  light: '#F9FAFB',
  border: '#E5E7EB',
  success: '#16a34a',
  successLight: '#dcfce7',
  warning: '#D97706',
  warningLight: '#fef3c7',
  info: '#2563EB',
  infoLight: '#dbeafe',
  purple: '#7C3AED',
  purpleLight: '#f3e8ff',
  pink: '#EC4899',
  cyan: '#0891B2',
  yellow: '#EAB308',
  orange: '#EA580C',
  orangeLight: '#ffedd5',
  gray: '#6B7280',
  grayLight: '#f3f4f6'
};

export default function MaterialsManager() {
  // ==================== STATE ====================
  const [view, setView] = useState('dashboard');
  const [previousView, setPreviousView] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Data
  const [requests, setRequests] = useState([]);
  const [components, setComponents] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [materials, setMaterials] = useState({});
  const [movements, setMovements] = useState([]);
  const [readyOut, setReadyOut] = useState([]);
  const [mirs, setMirs] = useState([]);
  
  // UI State
  const [ordersTab, setOrdersTab] = useState('toOrder');
  const [searchSite, setSearchSite] = useState('');
  const [searchYard, setSearchYard] = useState('');
  const [searchStatus, setSearchStatus] = useState('');
  
  // Request Form
  const [requestForm, setRequestForm] = useState({ name: '', badge: '', iso: '', spool: '', hf: '', cat: 'Bulk' });
  const [compForm, setCompForm] = useState({ code: '', qty: '' });
  const [tempComps, setTempComps] = useState([]);
  
  // Material IN Form - Multi-item
  const [materialInForm, setMaterialInForm] = useState({ mir: '' });
  const [materialInItems, setMaterialInItems] = useState([]);
  const [materialInItemForm, setMaterialInItemForm] = useState({ code: '', qty: '' });
  const [materialInLog, setMaterialInLog] = useState([]);
  
  // MIR Form
  const [mirForm, setMirForm] = useState({ mir: '', rk: '', forecast: '', priority: 'Medium' });
  const [editingMir, setEditingMir] = useState(null);
  
  // Balance Form
  const [balanceForm, setBalanceForm] = useState({ type: 'Adjustment', loc: 'YARD', code: '', qty: '', name: '', badge: '', note: '' });
  
  // Modals
  const [splitModal, setSplitModal] = useState({ open: false, req: null, comp: null, loc: '', page: '' });
  const [splitForm, setSplitForm] = useState({ foundQty: '', remainDest: '' });
  const [noteModal, setNoteModal] = useState({ open: false, req: null, comp: null });
  const [noteForm, setNoteForm] = useState({ text: '', dest: 'Site' });
  const [movementModal, setMovementModal] = useState(false);
  const [movementForm, setMovementForm] = useState({ type: 'Lost', loc: 'YARD', code: '', qty: '', name: '', badge: '', note: '' });
  const [balanceModal, setBalanceModal] = useState(false);

  // ==================== EFFECTS ====================
  useEffect(() => { fetchAllData(); }, []);

  // ==================== DATA FETCHING ====================
  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [reqs, comps, inv, mats, movs, ro, mi] = await Promise.all([
        supabase.from('requests').select('*').order('created_at', { ascending: false }),
        supabase.from('request_components').select('*'),
        supabase.from('inventory').select('*'),
        supabase.from('materials').select('*'),
        supabase.from('movements').select('*').order('created_at', { ascending: false }).limit(100),
        supabase.from('ready_out').select('*').eq('status', 'pending'),
        supabase.from('mirs').select('*').order('created_at', { ascending: false })
      ]);
      setRequests(reqs.data || []);
      setComponents(comps.data || []);
      setInventory(inv.data || []);
      const map = {};
      (mats.data || []).forEach(m => { map[m.code] = m.description; });
      setMaterials(map);
      setMovements(movs.data || []);
      setReadyOut(ro.data || []);
      setMirs(mi.data || []);
    } catch (err) {
      setError('Error loading data: ' + err.message);
    }
    setLoading(false);
  };

  // ==================== HELPERS ====================
  const getInv = (loc) => {
    const inv = {};
    inventory.filter(i => i.location === loc).forEach(i => { inv[i.material_code] = i.quantity; });
    return inv;
  };
  
  const getCompsByStatus = (status) => components.filter(c => c.status === status).map(c => ({
    ...c,
    req: requests.find(r => r.id === c.request_id)
  }));
  
  const formatReqNum = (num, sub) => `${String(num).padStart(5, '0')}-${sub || 0}`;
  
  const getNextRequestNumber = async () => {
    const { data } = await supabase.from('requests').select('request_number').order('request_number', { ascending: false }).limit(1);
    return data && data.length > 0 ? data[0].request_number + 1 : 1001;
  };
  
  const getNextSubNumber = (reqNum) => {
    const existing = requests.filter(r => r.request_number === reqNum);
    return existing.length === 0 ? 0 : Math.max(...existing.map(r => r.sub_number || 0)) + 1;
  };
  
  const showSuccess = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(null), 3000); };
  const showError = (msg) => { setError(msg); setTimeout(() => setError(null), 5000); };
  
  const navigateTo = (newView) => {
    setPreviousView(view);
    setView(newView);
  };
  
  const goBack = () => {
    setView(previousView || 'dashboard');
  };

  // Inventory helpers
  const yardInv = getInv('YARD');
  const siteInv = getInv('SITE');
  const lostInv = getInv('LOST');
  const brokenInv = getInv('BROKEN');
  
  // Stats
  const stats = {
    site: components.filter(c => c.status === 'Site').length,
    yard: components.filter(c => c.status === 'Yard').length,
    eng: components.filter(c => c.status === 'Eng').length,
    trans: components.filter(c => c.status === 'Trans').length,
    out: readyOut.filter(r => r.status === 'pending').length,
    mng: components.filter(c => c.status === 'Mng').length,
    order: components.filter(c => c.status === 'Order').length,
    ordered: components.filter(c => c.status === 'Ordered').length,
    spare: components.filter(c => c.status === 'Spare').length,
    mirPending: mirs.filter(m => m.status === 'Pending').length,
    lost: Object.values(lostInv).reduce((a, b) => a + b, 0),
    broken: Object.values(brokenInv).reduce((a, b) => a + b, 0)
  };
  
  const yardItems = Object.keys(yardInv).length;
  const yardQty = Object.values(yardInv).reduce((a, b) => a + b, 0);
  const siteItems = Object.keys(siteInv).length;
  const siteQty = Object.values(siteInv).reduce((a, b) => a + b, 0);

  // ==================== CORE ACTIONS ====================
  const moveToOut = async (req, comp, fromLoc) => {
    if (!req || !comp) { showError('Invalid request or component'); return; }
    const inv = fromLoc === 'Site' ? siteInv : yardInv;
    if ((inv[comp.material_code] || 0) < comp.quantity) {
      showError('Insufficient quantity in inventory!');
      return;
    }
    try {
      await supabase.from('request_components').update({ status: 'Out' }).eq('id', comp.id);
      await supabase.from('inventory').update({
        quantity: (inv[comp.material_code] || 0) - comp.quantity
      }).eq('material_code', comp.material_code).eq('location', fromLoc.toUpperCase());
      
      await supabase.from('ready_out').insert({
        request_number: formatReqNum(req.request_number, req.sub_number),
        requester_name: req.requester_name,
        badge_number: req.badge_number,
        material_code: comp.material_code,
        description: materials[comp.material_code] || comp.material_code,
        quantity: comp.quantity,
        location: fromLoc.toUpperCase(),
        status: 'pending'
      });
      
      await supabase.from('movements').insert({
        type: 'OUT',
        location: fromLoc.toUpperCase(),
        material_code: comp.material_code,
        quantity: comp.quantity,
        note: 'Ready OUT - ' + formatReqNum(req.request_number, req.sub_number)
      });
      
      showSuccess('Moved to Ready OUT!');
      fetchAllData();
    } catch (err) {
      showError('Error: ' + err.message);
    }
  };

  const sendToDestination = async (req, comp, dest) => {
    if (!comp) { showError('Invalid component'); return; }
    try {
      await supabase.from('request_components').update({ status: dest }).eq('id', comp.id);
      showSuccess('Sent to ' + dest);
      fetchAllData();
    } catch (err) {
      showError('Error: ' + err.message);
    }
  };

  const deleteComponent = async (req, comp) => {
    if (!comp) return;
    if (!confirm('Delete ' + comp.material_code + '?')) return;
    try {
      await supabase.from('request_components').delete().eq('id', comp.id);
      showSuccess('Component deleted');
      fetchAllData();
    } catch (err) {
      showError('Error: ' + err.message);
    }
  };

  const returnComponent = async (req, comp, returnTo) => {
    if (!comp) return;
    try {
      await supabase.from('request_components').update({ status: returnTo }).eq('id', comp.id);
      showSuccess('Returned to ' + returnTo);
      fetchAllData();
    } catch (err) {
      showError('Error: ' + err.message);
    }
  };

  // ==================== SPLIT PARTIAL ====================
  const getPartialDestinations = (page) => {
    switch (page) {
      case 'Site': return ['Yard', 'Eng'];
      case 'Yard': return ['Eng'];
      case 'Eng': return ['Mng', 'Order'];
      default: return ['Yard', 'Eng', 'Mng', 'Order'];
    }
  };

  const openSplitModal = (req, comp, loc, page) => {
    const dests = getPartialDestinations(page);
    setSplitModal({ open: true, req, comp, loc, page });
    setSplitForm({ foundQty: '', remainDest: dests[0] });
  };

  const processSplit = async () => {
    const { req, comp, loc, page } = splitModal;
    const found = parseInt(splitForm.foundQty);
    
    if (!found || found <= 0 || found >= comp.quantity) {
      showError('Quantity must be between 1 and ' + (comp.quantity - 1));
      return;
    }
    
    const remaining = comp.quantity - found;
    
    try {
      // Update original component
      let newStatus = 'Out';
      if (page === 'Yard') newStatus = 'Trans';
      
      await supabase.from('request_components').update({
        quantity: found,
        status: newStatus
      }).eq('id', comp.id);
      
      // Handle inventory
      const inv = loc === 'Site' ? siteInv : yardInv;
      if ((inv[comp.material_code] || 0) >= found) {
        await supabase.from('inventory').update({
          quantity: (inv[comp.material_code] || 0) - found
        }).eq('material_code', comp.material_code).eq('location', loc.toUpperCase());
      }
      
      // Add to ready_out or handle transfer
      if (page === 'Site' || page === 'Eng') {
        await supabase.from('ready_out').insert({
          request_number: formatReqNum(req.request_number, req.sub_number),
          requester_name: req.requester_name,
          badge_number: req.badge_number,
          material_code: comp.material_code,
          description: materials[comp.material_code] || '',
          quantity: found,
          location: loc.toUpperCase(),
          status: 'pending'
        });
      }
      
      // Create new request with remaining quantity
      const newSub = getNextSubNumber(req.request_number);
      const { data: newReq, error: reqError } = await supabase.from('requests').insert({
        request_number: req.request_number,
        sub_number: newSub,
        requester_name: req.requester_name,
        badge_number: req.badge_number,
        iso_drawing: req.iso_drawing,
        spool_number: req.spool_number,
        hf_number: req.hf_number,
        category: req.category
      }).select().single();
      
      if (reqError || !newReq) {
        throw new Error('Failed to create split request');
      }
      
      await supabase.from('request_components').insert({
        request_id: newReq.id,
        material_code: comp.material_code,
        quantity: remaining,
        status: splitForm.remainDest
      });
      
      await supabase.from('movements').insert({
        type: 'SPLIT',
        location: loc.toUpperCase(),
        material_code: comp.material_code,
        quantity: found,
        note: `Split: ${found} → ${page === 'Yard' ? 'Trans' : 'OUT'}, ${remaining} → ${splitForm.remainDest}`
      });
      
      setSplitModal({ open: false, req: null, comp: null, loc: '', page: '' });
      showSuccess(`Split completed! New request: ${formatReqNum(req.request_number, newSub)}`);
      fetchAllData();
    } catch (err) {
      showError('Error: ' + err.message);
    }
  };

  // ==================== ENGINEERING ====================
  const openNoteModal = (req, comp) => {
    setNoteModal({ open: true, req, comp });
    setNoteForm({ text: '', dest: 'Site' });
  };
  
  const sendEngNote = async () => {
    if (!noteForm.text.trim()) {
      showError('Please enter a note');
      return;
    }
    try {
      await supabase.from('request_components').update({
        eng_note: noteForm.text,
        eng_note_dest: noteForm.dest,
        status: noteForm.dest
      }).eq('id', noteModal.comp.id);
      
      setNoteModal({ open: false, req: null, comp: null });
      showSuccess('Note sent to ' + noteForm.dest);
      fetchAllData();
    } catch (err) {
      showError('Error: ' + err.message);
    }
  };

  const clearEngNote = async (comp) => {
    try {
      await supabase.from('request_components').update({
        eng_note: null,
        eng_note_dest: null
      }).eq('id', comp.id);
      showSuccess('Note cleared');
      fetchAllData();
    } catch (err) {
      showError('Error: ' + err.message);
    }
  };

  // ==================== SITE IN ====================
  const confirmArrival = async (req, comp) => {
    if (!comp) return;
    try {
      await supabase.from('request_components').update({ status: 'Site' }).eq('id', comp.id);
      
      const cur = siteInv[comp.material_code] || 0;
      if (cur > 0) {
        await supabase.from('inventory').update({
          quantity: cur + comp.quantity
        }).eq('material_code', comp.material_code).eq('location', 'SITE');
      } else {
        await supabase.from('inventory').insert({
          material_code: comp.material_code,
          location: 'SITE',
          quantity: comp.quantity
        });
      }
      
      await supabase.from('movements').insert({
        type: 'TRF',
        location: 'SITE',
        material_code: comp.material_code,
        quantity: comp.quantity,
        note: 'Arrival confirmed from Yard'
      });
      
      showSuccess('Arrival confirmed');
      fetchAllData();
    } catch (err) {
      showError('Error: ' + err.message);
    }
  };

  const rejectArrival = async (req, comp) => {
    if (!comp) return;
    if (!confirm('Reject this arrival? Material will return to Yard.')) return;
    try {
      await supabase.from('request_components').update({ status: 'Yard' }).eq('id', comp.id);
      
      const cur = yardInv[comp.material_code] || 0;
      if (cur > 0) {
        await supabase.from('inventory').update({
          quantity: cur + comp.quantity
        }).eq('material_code', comp.material_code).eq('location', 'YARD');
      } else {
        await supabase.from('inventory').insert({
          material_code: comp.material_code,
          location: 'YARD',
          quantity: comp.quantity
        });
      }
      
      showSuccess('Arrival rejected - returned to Yard');
      fetchAllData();
    } catch (err) {
      showError('Error: ' + err.message);
    }
  };

  // ==================== READY OUT ====================
  const deliverMaterial = async (item) => {
    try {
      await supabase.from('ready_out').update({
        status: 'delivered',
        delivered_at: new Date().toISOString()
      }).eq('id', item.id);
      
      await supabase.from('movements').insert({
        type: 'DEL',
        location: item.location,
        material_code: item.material_code,
        quantity: item.quantity,
        note: 'Delivered to ' + item.requester_name
      });
      
      showSuccess('Material delivered!');
      fetchAllData();
    } catch (err) {
      showError('Error: ' + err.message);
    }
  };

  const cancelReadyOut = async (item) => {
    if (!confirm('Cancel this ready out? Material will return to inventory.')) return;
    try {
      await supabase.from('ready_out').delete().eq('id', item.id);
      
      const cur = item.location === 'SITE' ? (siteInv[item.material_code] || 0) : (yardInv[item.material_code] || 0);
      await supabase.from('inventory').update({
        quantity: cur + item.quantity
      }).eq('material_code', item.material_code).eq('location', item.location);
      
      showSuccess('Ready out cancelled');
      fetchAllData();
    } catch (err) {
      showError('Error: ' + err.message);
    }
  };

  // ==================== SPARE PARTS ====================
  const spareHasStock = async (req, comp) => {
    await sendToDestination(req, comp, 'Site');
  };
  
  const sparePurchase = async (req, comp) => {
    try {
      await supabase.from('request_components').update({
        status: 'Order',
        order_type: 'Spare'
      }).eq('id', comp.id);
      showSuccess('Sent to Orders (Spare)');
      fetchAllData();
    } catch (err) {
      showError('Error: ' + err.message);
    }
  };

  // ==================== MANAGEMENT ====================
  const mngOrderInternal = async (req, comp) => {
    try {
      await supabase.from('request_components').update({
        status: 'Order',
        order_type: 'Internal'
      }).eq('id', comp.id);
      showSuccess('Internal Order created');
      fetchAllData();
    } catch (err) {
      showError('Error: ' + err.message);
    }
  };
  
  const mngOrderClient = async (req, comp) => {
    try {
      await supabase.from('request_components').update({
        status: 'Order',
        order_type: 'Client'
      }).eq('id', comp.id);
      showSuccess('Client Order created');
      fetchAllData();
    } catch (err) {
      showError('Error: ' + err.message);
    }
  };

  // ==================== YARD ====================
  const transferToSite = async (req, comp) => {
    if (!comp) return;
    const avail = yardInv[comp.material_code] || 0;
    if (avail < comp.quantity) {
      showError('Insufficient quantity in Yard!');
      return;
    }
    try {
      await supabase.from('request_components').update({ status: 'Trans' }).eq('id', comp.id);
      await supabase.from('inventory').update({
        quantity: avail - comp.quantity
      }).eq('material_code', comp.material_code).eq('location', 'YARD');
      
      await supabase.from('movements').insert({
        type: 'TRF',
        location: 'YARD→SITE',
        material_code: comp.material_code,
        quantity: comp.quantity,
        note: 'Transfer to Site'
      });
      
      showSuccess('Transfer initiated');
      fetchAllData();
    } catch (err) {
      showError('Error: ' + err.message);
    }
  };

  // ==================== REQUEST ====================
  const addTempComp = () => {
    if (!compForm.code || !compForm.qty || parseInt(compForm.qty) <= 0) {
      showError('Select material and enter valid quantity');
      return;
    }
    setTempComps([...tempComps, {
      id: Date.now(),
      code: compForm.code,
      qty: parseInt(compForm.qty),
      desc: materials[compForm.code]
    }]);
    setCompForm({ code: '', qty: '' });
  };
  
  const removeTempComp = (id) => {
    setTempComps(tempComps.filter(c => c.id !== id));
  };
  
  const isRequestFormValid = () => {
    if (!requestForm.name || !requestForm.badge || !requestForm.iso || !requestForm.spool) return false;
    if (requestForm.cat === 'Erection' && !requestForm.hf) return false;
    if (tempComps.length === 0) return false;
    return true;
  };
  
  const submitRequest = async (dest) => {
    if (!requestForm.name || !requestForm.badge || !requestForm.iso || !requestForm.spool) {
      showError('Please fill all required fields');
      return;
    }
    if (requestForm.cat === 'Erection' && !requestForm.hf) {
      showError('HF is required for Erection Material');
      return;
    }
    if (tempComps.length === 0) {
      showError('Add at least one material to the request');
      return;
    }
    
    try {
      const nextNum = await getNextRequestNumber();
      
      const { data: newReq, error: reqError } = await supabase.from('requests').insert({
        request_number: nextNum,
        sub_number: 0,
        requester_name: requestForm.name,
        badge_number: requestForm.badge,
        iso_drawing: requestForm.iso,
        spool_number: requestForm.spool,
        hf_number: requestForm.hf || null,
        category: requestForm.cat
      }).select().single();
      
      if (reqError || !newReq) {
        throw new Error('Failed to create request: ' + (reqError?.message || 'Unknown error'));
      }
      
      for (const c of tempComps) {
        await supabase.from('request_components').insert({
          request_id: newReq.id,
          material_code: c.code,
          quantity: c.qty,
          status: dest
        });
      }
      
      setRequestForm({ name: '', badge: '', iso: '', spool: '', hf: '', cat: 'Bulk' });
      setTempComps([]);
      showSuccess(`Request ${formatReqNum(nextNum, 0)} created successfully!`);
      fetchAllData();
    } catch (err) {
      showError('Error: ' + err.message);
    }
  };

  // ==================== MIR ====================
  const registerMir = async () => {
    if (!mirForm.mir || !mirForm.rk) {
      showError('MIR Number and RK Number are required');
      return;
    }
    try {
      if (editingMir) {
        await supabase.from('mirs').update({
          mir_number: mirForm.mir,
          rk_number: mirForm.rk,
          forecast_date: mirForm.forecast || null,
          priority: mirForm.priority
        }).eq('id', editingMir.id);
        showSuccess('MIR updated');
        setEditingMir(null);
      } else {
        await supabase.from('mirs').insert({
          mir_number: mirForm.mir,
          rk_number: mirForm.rk,
          forecast_date: mirForm.forecast || null,
          priority: mirForm.priority,
          status: 'Pending'
        });
        showSuccess('MIR registered');
      }
      setMirForm({ mir: '', rk: '', forecast: '', priority: 'Medium' });
      fetchAllData();
    } catch (err) {
      showError('Error: ' + err.message);
    }
  };

  const editMir = (mir) => {
    setEditingMir(mir);
    setMirForm({
      mir: mir.mir_number,
      rk: mir.rk_number,
      forecast: mir.forecast_date || '',
      priority: mir.priority
    });
  };

  const closeMir = async (mir) => {
    try {
      await supabase.from('mirs').update({ status: 'Closed' }).eq('id', mir.id);
      showSuccess('MIR closed');
      fetchAllData();
    } catch (err) {
      showError('Error: ' + err.message);
    }
  };

  const cancelEditMir = () => {
    setEditingMir(null);
    setMirForm({ mir: '', rk: '', forecast: '', priority: 'Medium' });
  };

  // ==================== MATERIAL IN (Multi-item) ====================
  const addMaterialInItem = () => {
    if (!materialInItemForm.code || !materialInItemForm.qty || parseInt(materialInItemForm.qty) <= 0) {
      showError('Select material and enter valid quantity');
      return;
    }
    setMaterialInItems([...materialInItems, {
      id: Date.now(),
      code: materialInItemForm.code,
      qty: parseInt(materialInItemForm.qty),
      desc: materials[materialInItemForm.code]
    }]);
    setMaterialInItemForm({ code: '', qty: '' });
  };

  const removeMaterialInItem = (id) => {
    setMaterialInItems(materialInItems.filter(i => i.id !== id));
  };

  const loadMaterials = async () => {
    if (materialInItems.length === 0) {
      showError('Add at least one material');
      return;
    }
    
    try {
      const mirRef = materialInForm.mir ? mirs.find(m => m.mir_number === materialInForm.mir) : null;
      
      for (const item of materialInItems) {
        const cur = yardInv[item.code] || 0;
        if (cur > 0) {
          await supabase.from('inventory').update({
            quantity: cur + item.qty
          }).eq('material_code', item.code).eq('location', 'YARD');
        } else {
          await supabase.from('inventory').insert({
            material_code: item.code,
            location: 'YARD',
            quantity: item.qty
          });
        }
        
        await supabase.from('movements').insert({
          type: 'IN',
          location: 'YARD',
          material_code: item.code,
          quantity: item.qty,
          note: mirRef ? `MIR: ${mirRef.mir_number}` : 'Direct load'
        });
      }
      
      if (mirRef) {
        await supabase.from('mirs').update({ status: 'Received' }).eq('id', mirRef.id);
      }
      
      // Add to log
      setMaterialInLog([{
        id: Date.now(),
        date: new Date().toLocaleString(),
        mir: mirRef?.mir_number || 'Manual',
        items: [...materialInItems],
        total: materialInItems.reduce((sum, i) => sum + i.qty, 0)
      }, ...materialInLog]);
      
      setMaterialInItems([]);
      setMaterialInForm({ mir: '' });
      showSuccess('Materials loaded successfully!');
      fetchAllData();
    } catch (err) {
      showError('Error: ' + err.message);
    }
  };

  // ==================== MANUAL MOVEMENT ====================
  const openMovementModal = () => {
    setMovementModal(true);
    setMovementForm({ type: 'Lost', loc: 'YARD', code: '', qty: '', name: '', badge: '', note: '' });
  };
  
  const registerManualMovement = async () => {
    const { type, loc, code, qty, name, badge, note } = movementForm;
    const quantity = parseInt(qty);
    
    if (!code || !quantity || !name || !badge) {
      showError('Please fill all required fields');
      return;
    }
    
    try {
      if (type === 'Lost' || type === 'Broken') {
        const inv = loc === 'YARD' ? yardInv : siteInv;
        if ((inv[code] || 0) < quantity) {
          showError('Insufficient quantity!');
          return;
        }
        
        // Reduce from source
        await supabase.from('inventory').update({
          quantity: (inv[code] || 0) - quantity
        }).eq('material_code', code).eq('location', loc);
        
        // Add to Lost/Broken
        const { data: existing } = await supabase.from('inventory')
          .select('*')
          .eq('material_code', code)
          .eq('location', type.toUpperCase())
          .single();
        
        if (existing) {
          await supabase.from('inventory').update({
            quantity: existing.quantity + quantity
          }).eq('id', existing.id);
        } else {
          await supabase.from('inventory').insert({
            material_code: code,
            location: type.toUpperCase(),
            quantity
          });
        }
      } else {
        // IN type
        const inv = loc === 'YARD' ? yardInv : siteInv;
        if ((inv[code] || 0) > 0) {
          await supabase.from('inventory').update({
            quantity: (inv[code] || 0) + quantity
          }).eq('material_code', code).eq('location', loc);
        } else {
          await supabase.from('inventory').insert({
            material_code: code,
            location: loc,
            quantity
          });
        }
      }
      
      await supabase.from('movements').insert({
        type: type === 'IN' ? 'IN' : 'BAL',
        location: loc,
        material_code: code,
        quantity: type === 'IN' ? quantity : -quantity,
        balance_type: type !== 'IN' ? type : null,
        note: `${note} - ${name} (${badge})`
      });
      
      setMovementModal(false);
      showSuccess('Movement registered');
      fetchAllData();
    } catch (err) {
      showError('Error: ' + err.message);
    }
  };

  // ==================== BALANCE ====================
  const saveBalance = async () => {
    const { type, loc, code, qty, name, badge, note } = balanceForm;
    const quantity = parseInt(qty);
    
    if (!code || !quantity || !name || !badge) {
      showError('Please fill all required fields');
      return;
    }
    
    try {
      const inv = loc === 'YARD' ? yardInv : siteInv;
      const cur = inv[code] || 0;
      
      if (type === 'Lost' || type === 'Broken') {
        if (cur < quantity) {
          showError('Insufficient quantity!');
          return;
        }
        
        await supabase.from('inventory').update({
          quantity: cur - quantity
        }).eq('material_code', code).eq('location', loc);
        
        const { data: existing } = await supabase.from('inventory')
          .select('*')
          .eq('material_code', code)
          .eq('location', type.toUpperCase())
          .single();
        
        if (existing) {
          await supabase.from('inventory').update({
            quantity: existing.quantity + quantity
          }).eq('id', existing.id);
        } else {
          await supabase.from('inventory').insert({
            material_code: code,
            location: type.toUpperCase(),
            quantity
          });
        }
      } else {
        const newQty = cur + quantity;
        if (newQty < 0) {
          showError('Resulting quantity cannot be negative!');
          return;
        }
        
        if (cur > 0) {
          await supabase.from('inventory').update({
            quantity: newQty
          }).eq('material_code', code).eq('location', loc);
        } else {
          await supabase.from('inventory').insert({
            material_code: code,
            location: loc,
            quantity: newQty
          });
        }
      }
      
      await supabase.from('movements').insert({
        type: 'BAL',
        location: loc,
        material_code: code,
        quantity: type === 'Adjustment' ? quantity : -quantity,
        balance_type: type,
        note: `${note} - ${name}`
      });
      
      setBalanceModal(false);
      setBalanceForm({ type: 'Adjustment', loc: 'YARD', code: '', qty: '', name: '', badge: '', note: '' });
      showSuccess('Balance saved');
      fetchAllData();
    } catch (err) {
      showError('Error: ' + err.message);
    }
  };

  // ==================== ORDERS ====================
  const placeOrder = async (comp, urgent = false) => {
    try {
      await supabase.from('request_components').update({
        status: 'Ordered',
        order_urgent: urgent,
        ordered_at: new Date().toISOString()
      }).eq('id', comp.id);
      showSuccess(urgent ? 'Urgent order placed!' : 'Order placed');
      fetchAllData();
    } catch (err) {
      showError('Error: ' + err.message);
    }
  };
  
  const receiveOrder = async (comp) => {
    try {
      const cur = yardInv[comp.material_code] || 0;
      if (cur > 0) {
        await supabase.from('inventory').update({
          quantity: cur + comp.quantity
        }).eq('material_code', comp.material_code).eq('location', 'YARD');
      } else {
        await supabase.from('inventory').insert({
          material_code: comp.material_code,
          location: 'YARD',
          quantity: comp.quantity
        });
      }
      
      await supabase.from('request_components').update({ status: 'Yard' }).eq('id', comp.id);
      
      await supabase.from('movements').insert({
        type: 'IN',
        location: 'YARD',
        material_code: comp.material_code,
        quantity: comp.quantity,
        note: 'Order received'
      });
      
      showSuccess('Order received');
      fetchAllData();
    } catch (err) {
      showError('Error: ' + err.message);
    }
  };

  // ==================== STYLES ====================
  const s = {
    app: {
      display: 'flex',
      height: '100vh',
      fontSize: 14,
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      background: '#F3F4F6'
    },
    sidebar: {
      width: sidebarCollapsed ? 70 : 260,
      background: 'linear-gradient(180deg, #1F2937 0%, #111827 100%)',
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.3s ease',
      boxShadow: '2px 0 10px rgba(0,0,0,0.1)'
    },
    logoArea: {
      padding: sidebarCollapsed ? '16px 10px' : '20px 16px',
      borderBottom: '1px solid rgba(255,255,255,0.1)',
      display: 'flex',
      alignItems: 'center',
      gap: 12
    },
    logoIcon: {
      width: 42,
      height: 42,
      background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%)`,
      borderRadius: 10,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: '800',
      fontSize: 14,
      flexShrink: 0,
      boxShadow: '0 2px 8px rgba(227, 30, 36, 0.3)'
    },
    nav: {
      flex: 1,
      overflowY: 'auto',
      padding: '12px 0'
    },
    navItem: (active) => ({
      padding: sidebarCollapsed ? '12px' : '11px 16px',
      cursor: 'pointer',
      background: active ? `linear-gradient(90deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%)` : 'transparent',
      borderRadius: sidebarCollapsed ? 8 : '0 25px 25px 0',
      marginRight: sidebarCollapsed ? 8 : 12,
      marginLeft: sidebarCollapsed ? 8 : 0,
      marginBottom: 3,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      fontSize: 13,
      fontWeight: active ? '600' : '400',
      transition: 'all 0.2s ease',
      boxShadow: active ? '0 2px 8px rgba(227, 30, 36, 0.3)' : 'none'
    }),
    navBadge: {
      background: 'rgba(255,255,255,0.25)',
      borderRadius: 12,
      padding: '3px 10px',
      fontSize: 11,
      fontWeight: '700',
      minWidth: 22,
      textAlign: 'center'
    },
    main: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    },
    header: {
      background: '#fff',
      padding: '16px 24px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottom: '1px solid #E5E7EB',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
    },
    content: {
      flex: 1,
      padding: 24,
      overflowY: 'auto'
    },
    card: {
      background: '#fff',
      borderRadius: 12,
      padding: 24,
      marginBottom: 20,
      boxShadow: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)'
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: COLORS.secondary,
      marginBottom: 16,
      display: 'flex',
      alignItems: 'center',
      gap: 10
    },
    table: {
      width: '100%',
      borderCollapse: 'separate',
      borderSpacing: 0
    },
    th: {
      background: COLORS.secondary,
      color: '#fff',
      padding: '14px 16px',
      textAlign: 'left',
      fontWeight: '600',
      fontSize: 12,
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    },
    thFirst: {
      borderTopLeftRadius: 8
    },
    thLast: {
      borderTopRightRadius: 8
    },
    td: {
      padding: '14px 16px',
      borderBottom: '1px solid #E5E7EB',
      fontSize: 13
    },
    btn: (color, disabled = false) => ({
      padding: '10px 20px',
      background: disabled ? '#ccc' : color,
      color: '#fff',
      border: 'none',
      borderRadius: 8,
      cursor: disabled ? 'not-allowed' : 'pointer',
      fontSize: 13,
      fontWeight: '600',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      transition: 'all 0.2s ease',
      boxShadow: disabled ? 'none' : '0 2px 4px rgba(0,0,0,0.1)'
    }),
    btnSmall: (color, disabled = false) => ({
      width: 32,
      height: 32,
      background: disabled ? '#D1D5DB' : color,
      color: '#fff',
      border: 'none',
      borderRadius: 6,
      cursor: disabled ? 'not-allowed' : 'pointer',
      fontSize: 12,
      fontWeight: '700',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.2s ease',
      boxShadow: disabled ? 'none' : '0 2px 4px rgba(0,0,0,0.15)'
    }),
    input: {
      padding: '12px 16px',
      border: '2px solid #E5E7EB',
      borderRadius: 8,
      fontSize: 14,
      width: '100%',
      boxSizing: 'border-box',
      transition: 'border-color 0.2s ease',
      outline: 'none'
    },
    inputDisabled: {
      padding: '12px 16px',
      border: '2px solid #E5E7EB',
      borderRadius: 8,
      fontSize: 14,
      width: '100%',
      boxSizing: 'border-box',
      background: '#F3F4F6',
      color: '#9CA3AF',
      cursor: 'not-allowed'
    },
    inputRequired: {
      padding: '12px 16px',
      border: '2px solid #FCD34D',
      borderRadius: 8,
      fontSize: 14,
      width: '100%',
      boxSizing: 'border-box',
      background: '#FFFBEB',
      transition: 'border-color 0.2s ease',
      outline: 'none'
    },
    select: {
      padding: '12px 16px',
      border: '2px solid #E5E7EB',
      borderRadius: 8,
      fontSize: 14,
      background: '#fff',
      width: '100%',
      cursor: 'pointer'
    },
    formGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: 16,
      marginBottom: 16
    },
    label: {
      fontSize: 12,
      fontWeight: '600',
      color: COLORS.accent,
      marginBottom: 6,
      display: 'block'
    },
    labelRequired: {
      fontSize: 12,
      fontWeight: '600',
      color: COLORS.accent,
      marginBottom: 6,
      display: 'block'
    },
    modal: {
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(4px)'
    },
    modalBox: {
      background: '#fff',
      padding: 28,
      borderRadius: 16,
      minWidth: 420,
      maxWidth: '90%',
      maxHeight: '85vh',
      overflow: 'auto',
      boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
    },
    alert: (type) => ({
      padding: '14px 18px',
      borderRadius: 10,
      marginBottom: 16,
      fontWeight: '500',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      background: type === 'error' ? '#FEE2E2' : '#D1FAE5',
      color: type === 'error' ? '#DC2626' : '#059669',
      border: `1px solid ${type === 'error' ? '#FECACA' : '#A7F3D0'}`
    }),
    dashBox: (color) => ({
      background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
      color: '#fff',
      padding: '20px 16px',
      borderRadius: 12,
      textAlign: 'center',
      cursor: 'pointer',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
    }),
    statusBadge: (color) => ({
      display: 'inline-block',
      padding: '5px 12px',
      borderRadius: 20,
      fontSize: 11,
      fontWeight: '600',
      background: color + '20',
      color: color
    }),
    engNote: {
      background: 'linear-gradient(135deg, #F3E8FF 0%, #EDE9FE 100%)',
      border: '2px solid #C084FC',
      borderRadius: 12,
      padding: 16,
      marginBottom: 20
    },
    searchBox: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '10px 16px',
      background: '#fff',
      border: '2px solid #E5E7EB',
      borderRadius: 10,
      marginBottom: 16
    },
    searchInput: {
      border: 'none',
      outline: 'none',
      fontSize: 14,
      flex: 1,
      background: 'transparent'
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'mir', label: 'MIR', icon: '📋', count: stats.mirPending },
    { id: 'materialIn', label: 'Material IN', icon: '📥' },
    { id: 'siteIn', label: 'Site IN', icon: '🚚', count: stats.trans },
    { id: 'newRequest', label: 'New Request', icon: '📝' },
    { id: 'whSite', label: 'WH Site', icon: '🏭', count: stats.site },
    { id: 'whYard', label: 'WH Yard', icon: '🏗️', count: stats.yard },
    { id: 'recordOut', label: 'Ready OUT', icon: '📤', count: stats.out },
    { id: 'engineering', label: 'Engineering', icon: '🔧', count: stats.eng },
    { id: 'spare', label: 'Spare Parts', icon: '⭐', count: stats.spare },
    { id: 'management', label: 'Management', icon: '👔', count: stats.mng },
    { id: 'orders', label: 'Orders', icon: '🛒', count: stats.order + stats.ordered },
    { id: 'database', label: 'Database', icon: '🗄️' },
    { id: 'status', label: 'Status', icon: '🔍' },
    { id: 'movements', label: 'Movements', icon: '📜' }
  ];

  // ==================== RENDER FUNCTIONS ====================
  const renderDashboard = () => (
    <div>
      {/* Top 6 Inventory Boxes */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 14, marginBottom: 24 }}>
        <div style={s.dashBox(COLORS.secondary)} onClick={() => navigateTo('whYard')}>
          <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 4 }}>YARD Items</div>
          <div style={{ fontSize: 32, fontWeight: '700' }}>{yardItems}</div>
        </div>
        <div style={s.dashBox('#374151')} onClick={() => navigateTo('whYard')}>
          <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 4 }}>YARD Qty</div>
          <div style={{ fontSize: 32, fontWeight: '700' }}>{yardQty}</div>
        </div>
        <div style={s.dashBox(COLORS.info)} onClick={() => navigateTo('whSite')}>
          <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 4 }}>SITE Items</div>
          <div style={{ fontSize: 32, fontWeight: '700' }}>{siteItems}</div>
        </div>
        <div style={s.dashBox('#3B82F6')} onClick={() => navigateTo('whSite')}>
          <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 4 }}>SITE Qty</div>
          <div style={{ fontSize: 32, fontWeight: '700' }}>{siteQty}</div>
        </div>
        <div style={s.dashBox(COLORS.orange)}>
          <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 4 }}>LOST</div>
          <div style={{ fontSize: 32, fontWeight: '700' }}>{stats.lost}</div>
        </div>
        <div style={s.dashBox(COLORS.purple)}>
          <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 4 }}>BROKEN</div>
          <div style={{ fontSize: 32, fontWeight: '700' }}>{stats.broken}</div>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        <div style={{ ...s.card, cursor: 'pointer', padding: 20 }} onClick={() => navigateTo('siteIn')}>
          <div style={{ color: COLORS.gray, fontSize: 12, marginBottom: 4 }}>In Transit</div>
          <div style={{ fontSize: 28, fontWeight: '700', color: COLORS.warning }}>{stats.trans}</div>
        </div>
        <div style={{ ...s.card, cursor: 'pointer', padding: 20 }} onClick={() => navigateTo('engineering')}>
          <div style={{ color: COLORS.gray, fontSize: 12, marginBottom: 4 }}>Engineering</div>
          <div style={{ fontSize: 28, fontWeight: '700', color: COLORS.purple }}>{stats.eng}</div>
        </div>
        <div style={{ ...s.card, cursor: 'pointer', padding: 20 }} onClick={() => navigateTo('orders')}>
          <div style={{ color: COLORS.gray, fontSize: 12, marginBottom: 4 }}>To Order</div>
          <div style={{ fontSize: 28, fontWeight: '700', color: COLORS.cyan }}>{stats.order}</div>
        </div>
        <div style={{ ...s.card, cursor: 'pointer', padding: 20 }} onClick={() => navigateTo('recordOut')}>
          <div style={{ color: COLORS.gray, fontSize: 12, marginBottom: 4 }}>Ready OUT</div>
          <div style={{ fontSize: 28, fontWeight: '700', color: COLORS.success }}>{stats.out}</div>
        </div>
      </div>

      {/* Recent Movements */}
      <div style={s.card}>
        <div style={s.cardTitle}>📜 Recent Movements</div>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={{ ...s.th, ...s.thFirst }}>Date</th>
              <th style={s.th}>Type</th>
              <th style={s.th}>Code</th>
              <th style={s.th}>Qty</th>
              <th style={{ ...s.th, ...s.thLast }}>Location</th>
            </tr>
          </thead>
          <tbody>
            {movements.slice(0, 8).map((m, i) => (
              <tr key={i}>
                <td style={s.td}>{new Date(m.created_at).toLocaleDateString()}</td>
                <td style={s.td}>
                  <span style={s.statusBadge(
                    m.type === 'IN' ? COLORS.success :
                    m.type === 'OUT' || m.type === 'DEL' ? COLORS.primary :
                    m.type === 'BAL' ? COLORS.orange : COLORS.warning
                  )}>{m.type}</span>
                </td>
                <td style={{ ...s.td, fontFamily: 'monospace', fontWeight: '600' }}>{m.material_code}</td>
                <td style={{ ...s.td, fontWeight: '600', color: m.quantity > 0 ? COLORS.success : COLORS.primary }}>
                  {m.quantity > 0 ? '+' : ''}{m.quantity}
                </td>
                <td style={s.td}>{m.location}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderWHSite = () => {
    const comps = getCompsByStatus('Site');
    const withNotes = comps.filter(c => c.eng_note && c.eng_note_dest === 'Site');
    const filtered = comps.filter(c =>
      !searchSite ||
      c.material_code.toLowerCase().includes(searchSite.toLowerCase()) ||
      (c.req && formatReqNum(c.req.request_number, c.req.sub_number).includes(searchSite))
    );

    return (
      <div>
        {/* Engineering Notes Alert */}
        {withNotes.length > 0 && (
          <div style={s.engNote}>
            <div style={{ fontWeight: '700', color: COLORS.purple, marginBottom: 10, fontSize: 15 }}>
              🔔 Engineering Notes
            </div>
            {withNotes.map((c, i) => (
              <div key={i} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 0',
                borderBottom: i < withNotes.length - 1 ? '1px solid #DDD6FE' : 'none'
              }}>
                <div>
                  <strong style={{ fontFamily: 'monospace' }}>{c.material_code}</strong>: {c.eng_note}
                </div>
                <button style={s.btnSmall(COLORS.success)} onClick={() => clearEngNote(c)} title="Acknowledge">✓</button>
              </div>
            ))}
          </div>
        )}

        {/* Search Box */}
        <div style={s.searchBox}>
          <span>🔍</span>
          <input
            style={s.searchInput}
            placeholder="Search by code or request number..."
            value={searchSite}
            onChange={e => setSearchSite(e.target.value)}
          />
          {searchSite && (
            <button onClick={() => setSearchSite('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>✕</button>
          )}
        </div>

        {/* Summary */}
        <div style={{ marginBottom: 16, padding: '10px 16px', background: COLORS.infoLight, borderRadius: 8, fontSize: 13 }}>
          <strong>Site:</strong> {Object.keys(siteInv).map(code => `${code}:${siteInv[code]}`).join(' | ') || 'Empty'}
        </div>

        <div style={s.card}>
          <div style={s.cardTitle}>🏭 WH Site Components</div>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={{ ...s.th, ...s.thFirst }}>Request</th>
                <th style={s.th}>Code</th>
                <th style={s.th}>Description</th>
                <th style={s.th}>Qty</th>
                <th style={s.th}>Category</th>
                <th style={{ ...s.th, ...s.thLast }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                  <td style={{ ...s.td, fontFamily: 'monospace', fontWeight: '700' }}>
                    {c.req ? formatReqNum(c.req.request_number, c.req.sub_number) : '-'}
                  </td>
                  <td style={{ ...s.td, fontFamily: 'monospace' }}>{c.material_code}</td>
                  <td style={s.td}>{materials[c.material_code] || '-'}</td>
                  <td style={{ ...s.td, fontWeight: '600' }}>{c.quantity}</td>
                  <td style={s.td}>
                    <span style={s.statusBadge(
                      c.req?.category === 'Erection' ? COLORS.info :
                      c.req?.category === 'Support' ? COLORS.purple : COLORS.gray
                    )}>{c.req?.category || '-'}</span>
                  </td>
                  <td style={s.td}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      <button style={s.btnSmall(COLORS.success)} onClick={() => moveToOut(c.req, c, 'Site')} title="Ready OUT">✓</button>
                      <button style={s.btnSmall(COLORS.warning)} onClick={() => openSplitModal(c.req, c, 'Site', 'Site')} title="Split Partial">PT</button>
                      <button style={s.btnSmall(COLORS.secondary)} onClick={() => sendToDestination(c.req, c, 'Yard')} title="To Yard">Y</button>
                      <button style={s.btnSmall(COLORS.purple)} onClick={() => sendToDestination(c.req, c, 'Eng')} title="To Engineering">UT</button>
                      <button style={s.btnSmall(COLORS.gray)} onClick={() => returnComponent(c.req, c, 'Yard')} title="Return">↩</button>
                      <button style={s.btnSmall(COLORS.primary)} onClick={() => deleteComponent(c.req, c)} title="Delete">🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ ...s.td, textAlign: 'center', color: COLORS.gray, padding: 40 }}>
                    {searchSite ? 'No results found' : 'No components in WH Site'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderWHYard = () => {
    const comps = getCompsByStatus('Yard');
    const withNotes = comps.filter(c => c.eng_note && c.eng_note_dest === 'Yard');
    const filtered = comps.filter(c =>
      !searchYard ||
      c.material_code.toLowerCase().includes(searchYard.toLowerCase()) ||
      (c.req && formatReqNum(c.req.request_number, c.req.sub_number).includes(searchYard))
    );

    return (
      <div>
        {/* Engineering Notes Alert */}
        {withNotes.length > 0 && (
          <div style={s.engNote}>
            <div style={{ fontWeight: '700', color: COLORS.purple, marginBottom: 10, fontSize: 15 }}>
              🔔 Engineering Notes
            </div>
            {withNotes.map((c, i) => (
              <div key={i} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 0',
                borderBottom: i < withNotes.length - 1 ? '1px solid #DDD6FE' : 'none'
              }}>
                <div>
                  <strong style={{ fontFamily: 'monospace' }}>{c.material_code}</strong>: {c.eng_note}
                </div>
                <button style={s.btnSmall(COLORS.success)} onClick={() => clearEngNote(c)} title="Acknowledge">✓</button>
              </div>
            ))}
          </div>
        )}

        {/* Search Box */}
        <div style={s.searchBox}>
          <span>🔍</span>
          <input
            style={s.searchInput}
            placeholder="Search by code or request number..."
            value={searchYard}
            onChange={e => setSearchYard(e.target.value)}
          />
          {searchYard && (
            <button onClick={() => setSearchYard('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>✕</button>
          )}
        </div>

        {/* Summary */}
        <div style={{ marginBottom: 16, padding: '10px 16px', background: COLORS.warningLight, borderRadius: 8, fontSize: 13 }}>
          <strong>Yard:</strong> {Object.keys(yardInv).map(code => `${code}:${yardInv[code]}`).join(' | ') || 'Empty'}
        </div>

        <div style={s.card}>
          <div style={s.cardTitle}>🏗️ WH Yard Components</div>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={{ ...s.th, ...s.thFirst }}>Request</th>
                <th style={s.th}>Code</th>
                <th style={s.th}>Description</th>
                <th style={s.th}>Qty Req</th>
                <th style={s.th}>Available</th>
                <th style={{ ...s.th, ...s.thLast }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => {
                const avail = yardInv[c.material_code] || 0;
                const sufficient = avail >= c.quantity;
                return (
                  <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                    <td style={{ ...s.td, fontFamily: 'monospace', fontWeight: '700' }}>
                      {c.req ? formatReqNum(c.req.request_number, c.req.sub_number) : '-'}
                    </td>
                    <td style={{ ...s.td, fontFamily: 'monospace' }}>{c.material_code}</td>
                    <td style={s.td}>{materials[c.material_code] || '-'}</td>
                    <td style={{ ...s.td, fontWeight: '600' }}>{c.quantity}</td>
                    <td style={{
                      ...s.td,
                      color: sufficient ? COLORS.success : COLORS.primary,
                      fontWeight: '700',
                      fontSize: 15
                    }}>{avail}</td>
                    <td style={s.td}>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        <button
                          style={s.btnSmall(COLORS.success, !sufficient)}
                          onClick={() => sufficient && transferToSite(c.req, c)}
                          title={sufficient ? 'Transfer to Site' : 'Insufficient quantity'}
                        >✓</button>
                        <button style={s.btnSmall(COLORS.warning)} onClick={() => openSplitModal(c.req, c, 'Yard', 'Yard')} title="Split Partial">PT</button>
                        <button style={s.btnSmall(COLORS.purple)} onClick={() => sendToDestination(c.req, c, 'Eng')} title="To Engineering">UT</button>
                        <button style={s.btnSmall(COLORS.gray)} onClick={() => returnComponent(c.req, c, 'Site')} title="Return to Site">↩</button>
                        <button style={s.btnSmall(COLORS.primary)} onClick={() => deleteComponent(c.req, c)} title="Delete">🗑</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ ...s.td, textAlign: 'center', color: COLORS.gray, padding: 40 }}>
                    {searchYard ? 'No results found' : 'No components in WH Yard'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderEngineering = () => {
    const comps = getCompsByStatus('Eng');
    return (
      <div style={s.card}>
        <div style={s.cardTitle}>🔧 Engineering - Components Under Review</div>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={{ ...s.th, ...s.thFirst }}>Request</th>
              <th style={s.th}>Code</th>
              <th style={s.th}>Description</th>
              <th style={s.th}>Qty</th>
              <th style={s.th}>Category</th>
              <th style={{ ...s.th, ...s.thLast }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {comps.map((c, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                <td style={{ ...s.td, fontFamily: 'monospace', fontWeight: '700' }}>
                  {c.req ? formatReqNum(c.req.request_number, c.req.sub_number) : '-'}
                </td>
                <td style={{ ...s.td, fontFamily: 'monospace' }}>{c.material_code}</td>
                <td style={s.td}>{materials[c.material_code] || '-'}</td>
                <td style={{ ...s.td, fontWeight: '600' }}>{c.quantity}</td>
                <td style={s.td}>
                  <span style={s.statusBadge(
                    c.req?.category === 'Erection' ? COLORS.info :
                    c.req?.category === 'Support' ? COLORS.purple : COLORS.gray
                  )}>{c.req?.category || '-'}</span>
                </td>
                <td style={s.td}>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    <button style={s.btnSmall(COLORS.success)} onClick={() => sendToDestination(c.req, c, 'Site')} title="Resolved - Send to Site">✓</button>
                    <button style={s.btnSmall(COLORS.warning)} onClick={() => openSplitModal(c.req, c, 'Eng', 'Eng')} title="Split Partial">PT</button>
                    <button style={s.btnSmall(COLORS.info)} onClick={() => openNoteModal(c.req, c)} title="Send Check Note">🔍</button>
                    <button style={s.btnSmall(COLORS.pink)} onClick={() => sendToDestination(c.req, c, 'Spare')} title="Spare Parts">Sp</button>
                    <button style={s.btnSmall(COLORS.yellow)} onClick={() => sendToDestination(c.req, c, 'Mng')} title="To Management">M</button>
                    <button style={s.btnSmall(COLORS.gray)} onClick={() => returnComponent(c.req, c, 'Site')} title="Return">↩</button>
                    <button style={s.btnSmall(COLORS.primary)} onClick={() => deleteComponent(c.req, c)} title="Delete">🗑</button>
                  </div>
                </td>
              </tr>
            ))}
            {comps.length === 0 && (
              <tr>
                <td colSpan="6" style={{ ...s.td, textAlign: 'center', color: COLORS.gray, padding: 40 }}>
                  No components under review
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };

  const renderSiteIn = () => {
    const comps = getCompsByStatus('Trans');
    return (
      <div style={s.card}>
        <div style={s.cardTitle}>🚚 Site IN - Materials in Transit from Yard</div>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={{ ...s.th, ...s.thFirst }}>Request</th>
              <th style={s.th}>Code</th>
              <th style={s.th}>Description</th>
              <th style={s.th}>Qty</th>
              <th style={{ ...s.th, ...s.thLast }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {comps.map((c, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                <td style={{ ...s.td, fontFamily: 'monospace', fontWeight: '700' }}>
                  {c.req ? formatReqNum(c.req.request_number, c.req.sub_number) : '-'}
                </td>
                <td style={{ ...s.td, fontFamily: 'monospace' }}>{c.material_code}</td>
                <td style={s.td}>{materials[c.material_code] || '-'}</td>
                <td style={{ ...s.td, fontWeight: '600' }}>{c.quantity}</td>
                <td style={s.td}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button style={s.btnSmall(COLORS.success)} onClick={() => confirmArrival(c.req, c)} title="Confirm Arrival">✓</button>
                    <button style={s.btnSmall(COLORS.primary)} onClick={() => rejectArrival(c.req, c)} title="Reject - Return to Yard">↩</button>
                  </div>
                </td>
              </tr>
            ))}
            {comps.length === 0 && (
              <tr>
                <td colSpan="5" style={{ ...s.td, textAlign: 'center', color: COLORS.gray, padding: 40 }}>
                  No materials in transit
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };

  const renderRecordOut = () => {
    const items = readyOut.filter(r => r.status === 'pending');
    return (
      <div style={s.card}>
        <div style={s.cardTitle}>📤 Ready OUT - Ready for Delivery</div>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={{ ...s.th, ...s.thFirst }}>Request</th>
              <th style={s.th}>Requester</th>
              <th style={s.th}>Code</th>
              <th style={s.th}>Qty</th>
              <th style={s.th}>Location</th>
              <th style={{ ...s.th, ...s.thLast }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                <td style={{ ...s.td, fontFamily: 'monospace', fontWeight: '700' }}>{item.request_number}</td>
                <td style={s.td}>{item.requester_name} <span style={{ color: COLORS.gray }}>({item.badge_number})</span></td>
                <td style={{ ...s.td, fontFamily: 'monospace' }}>{item.material_code}</td>
                <td style={{ ...s.td, fontWeight: '600' }}>{item.quantity}</td>
                <td style={s.td}>{item.location}</td>
                <td style={s.td}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button style={s.btnSmall(COLORS.success)} onClick={() => deliverMaterial(item)} title="Deliver">✓</button>
                    <button style={s.btnSmall(COLORS.primary)} onClick={() => cancelReadyOut(item)} title="Cancel">🗑</button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan="6" style={{ ...s.td, textAlign: 'center', color: COLORS.gray, padding: 40 }}>
                  No items ready for delivery
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };

  const renderSpare = () => {
    const comps = getCompsByStatus('Spare');
    return (
      <div style={s.card}>
        <div style={s.cardTitle}>⭐ Spare Parts</div>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={{ ...s.th, ...s.thFirst }}>Request</th>
              <th style={s.th}>Code</th>
              <th style={s.th}>Description</th>
              <th style={s.th}>Qty</th>
              <th style={{ ...s.th, ...s.thLast }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {comps.map((c, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                <td style={{ ...s.td, fontFamily: 'monospace', fontWeight: '700' }}>
                  {c.req ? formatReqNum(c.req.request_number, c.req.sub_number) : '-'}
                </td>
                <td style={{ ...s.td, fontFamily: 'monospace' }}>{c.material_code}</td>
                <td style={s.td}>{materials[c.material_code] || '-'}</td>
                <td style={{ ...s.td, fontWeight: '600' }}>{c.quantity}</td>
                <td style={s.td}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button style={s.btnSmall(COLORS.success)} onClick={() => spareHasStock(c.req, c)} title="Has Stock - Send to Site">✓</button>
                    <button style={s.btnSmall(COLORS.cyan)} onClick={() => sparePurchase(c.req, c)} title="Purchase">🛒</button>
                  </div>
                </td>
              </tr>
            ))}
            {comps.length === 0 && (
              <tr>
                <td colSpan="5" style={{ ...s.td, textAlign: 'center', color: COLORS.gray, padding: 40 }}>
                  No spare parts requests
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };

  const renderManagement = () => {
    const comps = getCompsByStatus('Mng');
    return (
      <div style={s.card}>
        <div style={s.cardTitle}>👔 Management Decisions</div>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={{ ...s.th, ...s.thFirst }}>Request</th>
              <th style={s.th}>Code</th>
              <th style={s.th}>Description</th>
              <th style={s.th}>Qty</th>
              <th style={{ ...s.th, ...s.thLast }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {comps.map((c, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                <td style={{ ...s.td, fontFamily: 'monospace', fontWeight: '700' }}>
                  {c.req ? formatReqNum(c.req.request_number, c.req.sub_number) : '-'}
                </td>
                <td style={{ ...s.td, fontFamily: 'monospace' }}>{c.material_code}</td>
                <td style={s.td}>{materials[c.material_code] || '-'}</td>
                <td style={{ ...s.td, fontWeight: '600' }}>{c.quantity}</td>
                <td style={s.td}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button style={s.btnSmall(COLORS.info)} onClick={() => mngOrderInternal(c.req, c)} title="Internal Order">🏢</button>
                    <button style={s.btnSmall(COLORS.cyan)} onClick={() => mngOrderClient(c.req, c)} title="Client Order">👤</button>
                    <button style={s.btnSmall(COLORS.gray)} onClick={() => returnComponent(c.req, c, 'Eng')} title="Return to Engineering">↩</button>
                  </div>
                </td>
              </tr>
            ))}
            {comps.length === 0 && (
              <tr>
                <td colSpan="5" style={{ ...s.td, textAlign: 'center', color: COLORS.gray, padding: 40 }}>
                  No pending decisions
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };

  const renderMIR = () => (
    <div>
      <div style={s.card}>
        <div style={s.cardTitle}>
          {editingMir ? '✏️ Edit MIR' : '📋 Register New MIR'}
        </div>
        <div style={s.formGrid}>
          <div>
            <label style={s.label}>MIR Number *</label>
            <input
              style={s.input}
              value={mirForm.mir}
              onChange={e => setMirForm({ ...mirForm, mir: e.target.value })}
              placeholder="e.g., MRS2145"
            />
          </div>
          <div>
            <label style={s.label}>RK Number *</label>
            <input
              style={s.input}
              value={mirForm.rk}
              onChange={e => setMirForm({ ...mirForm, rk: e.target.value })}
              placeholder="e.g., RK0020_1123"
            />
          </div>
          <div>
            <label style={s.label}>Forecast Date</label>
            <input
              type="date"
              style={s.input}
              value={mirForm.forecast}
              onChange={e => setMirForm({ ...mirForm, forecast: e.target.value })}
            />
          </div>
          <div>
            <label style={s.label}>Priority</label>
            <select
              style={s.select}
              value={mirForm.priority}
              onChange={e => setMirForm({ ...mirForm, priority: e.target.value })}
            >
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button style={s.btn(editingMir ? COLORS.warning : COLORS.primary)} onClick={registerMir}>
            {editingMir ? '💾 Update MIR' : '📋 Register MIR'}
          </button>
          {editingMir && (
            <button style={s.btn(COLORS.gray)} onClick={cancelEditMir}>Cancel</button>
          )}
        </div>
      </div>

      <div style={s.card}>
        <div style={s.cardTitle}>📦 Pending MIRs</div>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={{ ...s.th, ...s.thFirst }}>MIR</th>
              <th style={s.th}>RK</th>
              <th style={s.th}>Forecast</th>
              <th style={s.th}>Priority</th>
              <th style={s.th}>Status</th>
              <th style={{ ...s.th, ...s.thLast }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {mirs.filter(m => m.status === 'Pending').map((m, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                <td style={{ ...s.td, fontWeight: '700' }}>{m.mir_number}</td>
                <td style={s.td}>{m.rk_number}</td>
                <td style={{ ...s.td, color: COLORS.orange }}>{m.forecast_date || '-'}</td>
                <td style={s.td}>
                  <span style={s.statusBadge(
                    m.priority === 'High' ? COLORS.primary :
                    m.priority === 'Medium' ? COLORS.warning : COLORS.gray
                  )}>{m.priority}</span>
                </td>
                <td style={s.td}>
                  <span style={s.statusBadge(COLORS.warning)}>{m.status}</span>
                </td>
                <td style={s.td}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button style={s.btnSmall(COLORS.info)} onClick={() => editMir(m)} title="Edit">✏️</button>
                    <button style={s.btnSmall(COLORS.success)} onClick={() => closeMir(m)} title="Close MIR">✓</button>
                  </div>
                </td>
              </tr>
            ))}
            {mirs.filter(m => m.status === 'Pending').length === 0 && (
              <tr>
                <td colSpan="6" style={{ ...s.td, textAlign: 'center', color: COLORS.gray, padding: 40 }}>
                  No pending MIRs
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderMaterialIn = () => (
    <div>
      <div style={s.card}>
        <div style={s.cardTitle}>📥 Material IN - Load to Yard</div>
        
        {/* MIR Selection */}
        <div style={{ marginBottom: 20 }}>
          <label style={s.label}>MIR Reference (optional)</label>
          <select
            style={s.select}
            value={materialInForm.mir}
            onChange={e => setMaterialInForm({ ...materialInForm, mir: e.target.value })}
          >
            <option value="">-- Manual Load --</option>
            {mirs.filter(m => m.status === 'Pending').map(m => (
              <option key={m.id} value={m.mir_number}>MIR: {m.mir_number} - RK: {m.rk_number}</option>
            ))}
          </select>
        </div>

        {/* Add Material Form */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 2 }}>
            <label style={s.label}>Material Code</label>
            <select
              style={s.select}
              value={materialInItemForm.code}
              onChange={e => setMaterialInItemForm({ ...materialInItemForm, code: e.target.value })}
            >
              <option value="">Select material...</option>
              {Object.keys(materials).map(k => (
                <option key={k} value={k}>{k} - {materials[k]}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={s.label}>Quantity</label>
            <input
              type="number"
              style={s.input}
              placeholder="Qty"
              value={materialInItemForm.qty}
              onChange={e => setMaterialInItemForm({ ...materialInItemForm, qty: e.target.value })}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button style={s.btn(COLORS.info)} onClick={addMaterialInItem}>+ Add</button>
          </div>
        </div>

        {/* Materials List */}
        {materialInItems.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={{ ...s.th, ...s.thFirst }}>Code</th>
                  <th style={s.th}>Description</th>
                  <th style={s.th}>Qty</th>
                  <th style={{ ...s.th, ...s.thLast }}></th>
                </tr>
              </thead>
              <tbody>
                {materialInItems.map((item, i) => (
                  <tr key={i}>
                    <td style={{ ...s.td, fontFamily: 'monospace', fontWeight: '600' }}>{item.code}</td>
                    <td style={s.td}>{item.desc}</td>
                    <td style={{ ...s.td, fontWeight: '600' }}>{item.qty}</td>
                    <td style={s.td}>
                      <button style={s.btnSmall(COLORS.primary)} onClick={() => removeMaterialInItem(item.id)}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <button
          style={s.btn(COLORS.success, materialInItems.length === 0)}
          onClick={loadMaterials}
          disabled={materialInItems.length === 0}
        >
          📥 Load Materials ({materialInItems.length})
        </button>
      </div>

      {/* Load Log */}
      {materialInLog.length > 0 && (
        <div style={s.card}>
          <div style={s.cardTitle}>📋 Recent Loads</div>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={{ ...s.th, ...s.thFirst }}>Date</th>
                <th style={s.th}>MIR</th>
                <th style={s.th}>Items</th>
                <th style={{ ...s.th, ...s.thLast }}>Total Qty</th>
              </tr>
            </thead>
            <tbody>
              {materialInLog.slice(0, 10).map((log, i) => (
                <tr key={i}>
                  <td style={s.td}>{log.date}</td>
                  <td style={{ ...s.td, fontWeight: '600' }}>{log.mir}</td>
                  <td style={s.td}>{log.items.map(it => `${it.code}(${it.qty})`).join(', ')}</td>
                  <td style={{ ...s.td, fontWeight: '700', color: COLORS.success }}>{log.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderNewRequest = () => {
    const isHfRequired = requestForm.cat === 'Erection';
    const formValid = isRequestFormValid();

    return (
      <div>
        {/* Request Data */}
        <div style={s.card}>
          <div style={s.cardTitle}>📝 Request Data</div>
          <div style={s.formGrid}>
            <div>
              <label style={s.labelRequired}>Name *</label>
              <input
                style={s.input}
                value={requestForm.name}
                onChange={e => setRequestForm({ ...requestForm, name: e.target.value })}
                placeholder="Requester name"
              />
            </div>
            <div>
              <label style={s.labelRequired}>Badge *</label>
              <input
                style={s.input}
                value={requestForm.badge}
                onChange={e => setRequestForm({ ...requestForm, badge: e.target.value })}
                placeholder="Badge number"
              />
            </div>
            <div>
              <label style={s.labelRequired}>ISO Drawing *</label>
              <input
                style={s.input}
                value={requestForm.iso}
                onChange={e => setRequestForm({ ...requestForm, iso: e.target.value })}
                placeholder="e.g., ISO-001"
              />
            </div>
            <div>
              <label style={s.labelRequired}>Spool *</label>
              <input
                style={s.input}
                value={requestForm.spool}
                onChange={e => setRequestForm({ ...requestForm, spool: e.target.value })}
                placeholder="e.g., SP-100"
              />
            </div>
            <div>
              <label style={s.label}>{isHfRequired ? 'HF (Required) *' : 'HF (Erection only)'}</label>
              <input
                style={isHfRequired ? s.inputRequired : s.inputDisabled}
                value={requestForm.hf}
                onChange={e => setRequestForm({ ...requestForm, hf: e.target.value })}
                placeholder={isHfRequired ? 'Required for Erection' : 'Disabled'}
                disabled={!isHfRequired}
              />
            </div>
            <div>
              <label style={s.label}>Category</label>
              <select
                style={s.select}
                value={requestForm.cat}
                onChange={e => setRequestForm({
                  ...requestForm,
                  cat: e.target.value,
                  hf: e.target.value !== 'Erection' ? '' : requestForm.hf
                })}
              >
                <option>Bulk</option>
                <option>Erection</option>
                <option>Support</option>
              </select>
            </div>
          </div>
        </div>

        {/* Add Materials */}
        <div style={s.card}>
          <div style={s.cardTitle}>📦 Add Materials</div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <div style={{ flex: 2 }}>
              <select
                style={s.select}
                value={compForm.code}
                onChange={e => setCompForm({ ...compForm, code: e.target.value })}
              >
                <option value="">Select material...</option>
                {Object.keys(materials).map(k => (
                  <option key={k} value={k}>{k} - {materials[k]}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <input
                type="number"
                style={s.input}
                placeholder="Qty"
                value={compForm.qty}
                onChange={e => setCompForm({ ...compForm, qty: e.target.value })}
              />
            </div>
            <button style={s.btn(COLORS.info)} onClick={addTempComp}>+ Add</button>
          </div>

          {/* Materials Table */}
          {tempComps.length > 0 ? (
            <table style={{ ...s.table, marginBottom: 20 }}>
              <thead>
                <tr>
                  <th style={{ ...s.th, ...s.thFirst }}>Code</th>
                  <th style={s.th}>Description</th>
                  <th style={s.th}>Qty</th>
                  <th style={{ ...s.th, ...s.thLast }}></th>
                </tr>
              </thead>
              <tbody>
                {tempComps.map((c, i) => (
                  <tr key={c.id}>
                    <td style={{ ...s.td, fontFamily: 'monospace', fontWeight: '600' }}>{c.code}</td>
                    <td style={s.td}>{c.desc}</td>
                    <td style={{ ...s.td, fontWeight: '600' }}>{c.qty}</td>
                    <td style={s.td}>
                      <button style={s.btnSmall(COLORS.primary)} onClick={() => removeTempComp(c.id)}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '30px 20px',
              background: COLORS.grayLight,
              borderRadius: 8,
              marginBottom: 20,
              color: COLORS.gray
            }}>
              Add at least one material to submit the request
            </div>
          )}

          {/* Submit Buttons */}
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              style={s.btn(COLORS.info, !formValid)}
              onClick={() => submitRequest('Site')}
              disabled={!formValid}
            >
              🏭 Send to Site
            </button>
            <button
              style={s.btn(COLORS.secondary, !formValid)}
              onClick={() => submitRequest('Yard')}
              disabled={!formValid}
            >
              🏗️ Send to Yard
            </button>
            <button
              style={s.btn(COLORS.purple, !formValid)}
              onClick={() => submitRequest('Eng')}
              disabled={!formValid}
            >
              🔧 Send to Engineering
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderOrders = () => {
    const toOrder = components.filter(c => c.status === 'Order');
    const ordered = components.filter(c => c.status === 'Ordered');

    return (
      <div>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <button
            style={{
              ...s.btn(ordersTab === 'toOrder' ? COLORS.primary : COLORS.gray),
              padding: '10px 20px'
            }}
            onClick={() => setOrdersTab('toOrder')}
          >
            To Order ({toOrder.length})
          </button>
          <button
            style={{
              ...s.btn(ordersTab === 'ordered' ? COLORS.primary : COLORS.gray),
              padding: '10px 20px'
            }}
            onClick={() => setOrdersTab('ordered')}
          >
            Ordered ({ordered.length})
          </button>
          <button
            style={{
              ...s.btn(ordersTab === 'log' ? COLORS.primary : COLORS.gray),
              padding: '10px 20px'
            }}
            onClick={() => setOrdersTab('log')}
          >
            Log
          </button>
        </div>

        <div style={s.card}>
          {ordersTab === 'toOrder' && (
            <>
              <div style={s.cardTitle}>🛒 To Order</div>
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={{ ...s.th, ...s.thFirst }}>Request</th>
                    <th style={s.th}>Code</th>
                    <th style={s.th}>Qty</th>
                    <th style={s.th}>Type</th>
                    <th style={{ ...s.th, ...s.thLast }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {toOrder.map((c, i) => {
                    const req = requests.find(r => r.id === c.request_id);
                    return (
                      <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                        <td style={{ ...s.td, fontFamily: 'monospace', fontWeight: '700' }}>
                          {req ? formatReqNum(req.request_number, req.sub_number) : '-'}
                        </td>
                        <td style={{ ...s.td, fontFamily: 'monospace' }}>{c.material_code}</td>
                        <td style={{ ...s.td, fontWeight: '600' }}>{c.quantity}</td>
                        <td style={s.td}>
                          <span style={s.statusBadge(
                            c.order_type === 'Client' ? COLORS.cyan :
                            c.order_type === 'Spare' ? COLORS.pink : COLORS.info
                          )}>{c.order_type || 'Internal'}</span>
                        </td>
                        <td style={s.td}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button style={s.btnSmall(COLORS.success)} onClick={() => placeOrder(c)} title="Place Order">🛒</button>
                            <button style={s.btnSmall(COLORS.primary)} onClick={() => placeOrder(c, true)} title="Urgent Order">⚡</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {toOrder.length === 0 && (
                    <tr>
                      <td colSpan="5" style={{ ...s.td, textAlign: 'center', color: COLORS.gray, padding: 40 }}>
                        No orders pending
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </>
          )}

          {ordersTab === 'ordered' && (
            <>
              <div style={s.cardTitle}>📦 Ordered - Waiting for Delivery</div>
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={{ ...s.th, ...s.thFirst }}>Request</th>
                    <th style={s.th}>Code</th>
                    <th style={s.th}>Qty</th>
                    <th style={s.th}>Urgent</th>
                    <th style={{ ...s.th, ...s.thLast }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {ordered.map((c, i) => {
                    const req = requests.find(r => r.id === c.request_id);
                    return (
                      <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                        <td style={{ ...s.td, fontFamily: 'monospace', fontWeight: '700' }}>
                          {req ? formatReqNum(req.request_number, req.sub_number) : '-'}
                        </td>
                        <td style={{ ...s.td, fontFamily: 'monospace' }}>{c.material_code}</td>
                        <td style={{ ...s.td, fontWeight: '600' }}>{c.quantity}</td>
                        <td style={s.td}>
                          {c.order_urgent ? (
                            <span style={s.statusBadge(COLORS.primary)}>⚡ URGENT</span>
                          ) : '-'}
                        </td>
                        <td style={s.td}>
                          <button style={s.btnSmall(COLORS.success)} onClick={() => receiveOrder(c)} title="Received">✓</button>
                        </td>
                      </tr>
                    );
                  })}
                  {ordered.length === 0 && (
                    <tr>
                      <td colSpan="5" style={{ ...s.td, textAlign: 'center', color: COLORS.gray, padding: 40 }}>
                        No orders waiting
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </>
          )}

          {ordersTab === 'log' && (
            <>
              <div style={s.cardTitle}>📜 Order Log</div>
              <p style={{ color: COLORS.gray, textAlign: 'center', padding: 40 }}>
                Order history will be available soon...
              </p>
            </>
          )}
        </div>
      </div>
    );
  };

  const renderDatabase = () => {
    const allCodes = [...new Set([
      ...Object.keys(yardInv),
      ...Object.keys(siteInv),
      ...Object.keys(lostInv),
      ...Object.keys(brokenInv)
    ])];

    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <button style={s.btn(COLORS.info)} onClick={() => setBalanceModal(true)}>
            ⚖️ Manual Balance
          </button>
        </div>

        <div style={s.card}>
          <div style={s.cardTitle}>🗄️ Inventory Database</div>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={{ ...s.th, ...s.thFirst }}>Code</th>
                <th style={s.th}>Description</th>
                <th style={{ ...s.th, background: COLORS.secondary, textAlign: 'center' }}>YARD</th>
                <th style={{ ...s.th, background: COLORS.info, textAlign: 'center' }}>SITE</th>
                <th style={{ ...s.th, background: COLORS.orange, textAlign: 'center' }}>LOST</th>
                <th style={{ ...s.th, background: COLORS.purple, textAlign: 'center' }}>BROKEN</th>
                <th style={{ ...s.th, ...s.thLast, textAlign: 'center' }}>TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {allCodes.map((code, i) => {
                const y = yardInv[code] || 0;
                const si = siteInv[code] || 0;
                const l = lostInv[code] || 0;
                const b = brokenInv[code] || 0;
                return (
                  <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                    <td style={{ ...s.td, fontFamily: 'monospace', fontWeight: '700' }}>{code}</td>
                    <td style={s.td}>{materials[code] || '-'}</td>
                    <td style={{ ...s.td, textAlign: 'center', fontWeight: '700', background: '#f8fafc' }}>{y}</td>
                    <td style={{ ...s.td, textAlign: 'center', fontWeight: '700', background: COLORS.infoLight }}>{si}</td>
                    <td style={{ ...s.td, textAlign: 'center', fontWeight: '700', background: COLORS.orangeLight }}>{l}</td>
                    <td style={{ ...s.td, textAlign: 'center', fontWeight: '700', background: COLORS.purpleLight }}>{b}</td>
                    <td style={{ ...s.td, textAlign: 'center', fontWeight: '700', color: COLORS.primary, fontSize: 15 }}>
                      {y + si + l + b}
                    </td>
                  </tr>
                );
              })}
              {allCodes.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ ...s.td, textAlign: 'center', color: COLORS.gray, padding: 40 }}>
                    No inventory data
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderStatus = () => {
    const filtered = requests.filter(r =>
      !searchStatus ||
      formatReqNum(r.request_number, r.sub_number).includes(searchStatus) ||
      r.requester_name?.toLowerCase().includes(searchStatus.toLowerCase())
    );

    return (
      <div style={s.card}>
        <div style={s.cardTitle}>🔍 Request Status Tracker</div>
        
        <div style={s.searchBox}>
          <span>🔍</span>
          <input
            style={s.searchInput}
            placeholder="Search by request number or name..."
            value={searchStatus}
            onChange={e => setSearchStatus(e.target.value)}
          />
          {searchStatus && (
            <button onClick={() => setSearchStatus('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>✕</button>
          )}
        </div>

        <table style={s.table}>
          <thead>
            <tr>
              <th style={{ ...s.th, ...s.thFirst }}>Request</th>
              <th style={s.th}>Name</th>
              <th style={s.th}>Badge</th>
              <th style={s.th}>ISO</th>
              <th style={s.th}>Spool</th>
              <th style={s.th}>Category</th>
              <th style={{ ...s.th, ...s.thLast }}>Components</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 50).map((r, i) => {
              const comps = components.filter(c => c.request_id === r.id);
              return (
                <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                  <td style={{ ...s.td, fontFamily: 'monospace', fontWeight: '700' }}>
                    {formatReqNum(r.request_number, r.sub_number)}
                  </td>
                  <td style={s.td}>{r.requester_name}</td>
                  <td style={s.td}>{r.badge_number}</td>
                  <td style={s.td}>{r.iso_drawing}</td>
                  <td style={s.td}>{r.spool_number}</td>
                  <td style={s.td}>{r.category}</td>
                  <td style={s.td}>
                    {comps.map((c, j) => (
                      <span key={j} style={{ ...s.statusBadge(COLORS.gray), marginRight: 4, marginBottom: 4, display: 'inline-block' }}>
                        {c.material_code} ({c.status})
                      </span>
                    ))}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan="7" style={{ ...s.td, textAlign: 'center', color: COLORS.gray, padding: 40 }}>
                  No requests found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };

  const renderMovements = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button style={s.btn(COLORS.primary)} onClick={openMovementModal}>
          + Add Movement
        </button>
      </div>

      <div style={s.card}>
        <div style={s.cardTitle}>📜 Movement History</div>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={{ ...s.th, ...s.thFirst }}>Date</th>
              <th style={s.th}>Type</th>
              <th style={s.th}>Code</th>
              <th style={s.th}>Qty</th>
              <th style={s.th}>Location</th>
              <th style={{ ...s.th, ...s.thLast }}>Note</th>
            </tr>
          </thead>
          <tbody>
            {movements.map((m, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                <td style={s.td}>{new Date(m.created_at).toLocaleString()}</td>
                <td style={s.td}>
                  <span style={s.statusBadge(
                    m.type === 'IN' ? COLORS.success :
                    m.type === 'OUT' || m.type === 'DEL' ? COLORS.primary :
                    m.type === 'BAL' ? COLORS.orange : COLORS.warning
                  )}>{m.type}</span>
                  {m.balance_type && (
                    <span style={{ ...s.statusBadge(COLORS.primary), marginLeft: 4 }}>{m.balance_type}</span>
                  )}
                </td>
                <td style={{ ...s.td, fontFamily: 'monospace' }}>{m.material_code}</td>
                <td style={{
                  ...s.td,
                  fontWeight: '700',
                  color: m.quantity > 0 ? COLORS.success : COLORS.primary
                }}>
                  {m.quantity > 0 ? '+' : ''}{m.quantity}
                </td>
                <td style={s.td}>{m.location}</td>
                <td style={{ ...s.td, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.note}</td>
              </tr>
            ))}
            {movements.length === 0 && (
              <tr>
                <td colSpan="6" style={{ ...s.td, textAlign: 'center', color: COLORS.gray, padding: 40 }}>
                  No movements recorded
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (view) {
      case 'dashboard': return renderDashboard();
      case 'whSite': return renderWHSite();
      case 'whYard': return renderWHYard();
      case 'engineering': return renderEngineering();
      case 'siteIn': return renderSiteIn();
      case 'recordOut': return renderRecordOut();
      case 'spare': return renderSpare();
      case 'management': return renderManagement();
      case 'mir': return renderMIR();
      case 'materialIn': return renderMaterialIn();
      case 'newRequest': return renderNewRequest();
      case 'orders': return renderOrders();
      case 'database': return renderDatabase();
      case 'status': return renderStatus();
      case 'movements': return renderMovements();
      default: return renderDashboard();
    }
  };

  // ==================== MAIN RENDER ====================
  return (
    <div style={s.app}>
      {/* SIDEBAR */}
      <div style={s.sidebar}>
        <div style={s.logoArea}>
          <div style={s.logoIcon}>STR</div>
          {!sidebarCollapsed && (
            <div>
              <div style={{ fontWeight: '700', fontSize: 15 }}>MAX STREICHER</div>
              <div style={{ fontSize: 11, opacity: 0.7 }}>Materials Manager V25</div>
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              fontSize: 18,
              padding: 8
            }}
          >
            {sidebarCollapsed ? '→' : '←'}
          </button>
        </div>

        <nav style={s.nav}>
          {navItems.map(item => (
            <div
              key={item.id}
              style={s.navItem(view === item.id)}
              onClick={() => navigateTo(item.id)}
            >
              <span style={{ fontSize: 18 }}>{item.icon}</span>
              {!sidebarCollapsed && <span style={{ flex: 1 }}>{item.label}</span>}
              {!sidebarCollapsed && item.count > 0 && (
                <span style={s.navBadge}>{item.count}</span>
              )}
            </div>
          ))}
        </nav>

        <div style={{ padding: 16, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ ...s.navItem(false), opacity: 0.7 }}>
            <span>🚪</span>
            {!sidebarCollapsed && <span>Logout</span>}
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div style={s.main}>
        <header style={s.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {view !== 'dashboard' && (
              <button
                onClick={goBack}
                style={{
                  background: 'none',
                  border: '2px solid #E5E7EB',
                  borderRadius: 8,
                  padding: '8px 12px',
                  cursor: 'pointer',
                  fontSize: 16,
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                ← Back
              </button>
            )}
            <div style={{
              width: 48,
              height: 48,
              background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%)`,
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24
            }}>
              {navItems.find(n => n.id === view)?.icon || '📊'}
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: '700', margin: 0 }}>
                {navItems.find(n => n.id === view)?.label || 'Dashboard'}
              </h1>
              <p style={{ fontSize: 12, color: COLORS.gray, margin: 0 }}>Materials Manager V25</p>
            </div>
          </div>
          <button style={s.btn(COLORS.secondary)} onClick={fetchAllData}>
            {loading ? '⏳' : '🔄'} Refresh
          </button>
        </header>

        <main style={s.content}>
          {error && <div style={s.alert('error')}>❌ {error}</div>}
          {success && <div style={s.alert('success')}>✅ {success}</div>}
          {renderContent()}
        </main>
      </div>

      {/* SPLIT MODAL */}
      {splitModal.open && (
        <div style={s.modal}>
          <div style={s.modalBox}>
            <h3 style={{ marginTop: 0, marginBottom: 20, color: COLORS.orange, display: 'flex', alignItems: 'center', gap: 10 }}>
              📦 Split Partial - {splitModal.comp?.material_code}
            </h3>
            
            <div style={{
              background: COLORS.warningLight,
              padding: 14,
              borderRadius: 8,
              marginBottom: 20,
              fontWeight: '600'
            }}>
              Total: {splitModal.comp?.quantity}
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={s.label}>Found Quantity</label>
              <input
                type="number"
                style={s.input}
                value={splitForm.foundQty}
                onChange={e => setSplitForm({ ...splitForm, foundQty: e.target.value })}
                placeholder="Enter quantity found"
                min="1"
                max={splitModal.comp?.quantity - 1}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={s.label}>Send Remaining To</label>
              <select
                style={s.select}
                value={splitForm.remainDest}
                onChange={e => setSplitForm({ ...splitForm, remainDest: e.target.value })}
              >
                {getPartialDestinations(splitModal.page).map(d => (
                  <option key={d} value={d}>→ {d}</option>
                ))}
              </select>
            </div>

            {/* Preview */}
            {splitForm.foundQty && parseInt(splitForm.foundQty) > 0 && parseInt(splitForm.foundQty) < splitModal.comp?.quantity && (
              <div style={{
                background: COLORS.successLight,
                padding: 14,
                borderRadius: 8,
                marginBottom: 20,
                fontSize: 13
              }}>
                <div>• {splitForm.foundQty} pz → {splitModal.page === 'Yard' ? 'Transit' : 'OUT'}</div>
                <div>• {splitModal.comp?.quantity - parseInt(splitForm.foundQty)} pz → {splitForm.remainDest}</div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 12 }}>
              <button style={s.btn(COLORS.orange)} onClick={processSplit}>
                SPLIT
              </button>
              <button
                style={s.btn(COLORS.gray)}
                onClick={() => setSplitModal({ open: false, req: null, comp: null, loc: '', page: '' })}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NOTE MODAL */}
      {noteModal.open && (
        <div style={s.modal}>
          <div style={s.modalBox}>
            <h3 style={{ marginTop: 0, marginBottom: 20, color: COLORS.purple, display: 'flex', alignItems: 'center', gap: 10 }}>
              🔍 Send Check Note
            </h3>
            <p style={{ marginBottom: 16, color: COLORS.gray }}>
              For: <strong>{noteModal.comp?.material_code}</strong>
            </p>
            
            <div style={{ marginBottom: 16 }}>
              <label style={s.label}>Note</label>
              <textarea
                style={{ ...s.input, minHeight: 100, resize: 'vertical' }}
                value={noteForm.text}
                onChange={e => setNoteForm({ ...noteForm, text: e.target.value })}
                placeholder="What should the warehouse check..."
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={s.label}>Send To</label>
              <select
                style={s.select}
                value={noteForm.dest}
                onChange={e => setNoteForm({ ...noteForm, dest: e.target.value })}
              >
                <option value="Site">WH Site</option>
                <option value="Yard">WH Yard</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button style={s.btn(COLORS.purple)} onClick={sendEngNote}>
                📤 Send Note
              </button>
              <button
                style={s.btn(COLORS.gray)}
                onClick={() => setNoteModal({ open: false, req: null, comp: null })}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MOVEMENT MODAL */}
      {movementModal && (
        <div style={s.modal}>
          <div style={s.modalBox}>
            <h3 style={{ marginTop: 0, marginBottom: 20, color: COLORS.primary }}>
              📦 Register Manual Movement
            </h3>
            
            <div style={s.formGrid}>
              <div>
                <label style={s.label}>Type</label>
                <select
                  style={s.select}
                  value={movementForm.type}
                  onChange={e => setMovementForm({ ...movementForm, type: e.target.value })}
                >
                  <option>Lost</option>
                  <option>Broken</option>
                  <option>IN</option>
                </select>
              </div>
              <div>
                <label style={s.label}>Location</label>
                <select
                  style={s.select}
                  value={movementForm.loc}
                  onChange={e => setMovementForm({ ...movementForm, loc: e.target.value })}
                >
                  <option>YARD</option>
                  <option>SITE</option>
                </select>
              </div>
              <div>
                <label style={s.label}>Material Code</label>
                <select
                  style={s.select}
                  value={movementForm.code}
                  onChange={e => setMovementForm({ ...movementForm, code: e.target.value })}
                >
                  <option value="">Select...</option>
                  {Object.keys(materials).map(k => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={s.label}>Quantity</label>
                <input
                  type="number"
                  style={s.input}
                  value={movementForm.qty}
                  onChange={e => setMovementForm({ ...movementForm, qty: e.target.value })}
                />
              </div>
              <div>
                <label style={s.label}>Name</label>
                <input
                  style={s.input}
                  value={movementForm.name}
                  onChange={e => setMovementForm({ ...movementForm, name: e.target.value })}
                />
              </div>
              <div>
                <label style={s.label}>Badge</label>
                <input
                  style={s.input}
                  value={movementForm.badge}
                  onChange={e => setMovementForm({ ...movementForm, badge: e.target.value })}
                />
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={s.label}>Note</label>
              <input
                style={s.input}
                value={movementForm.note}
                onChange={e => setMovementForm({ ...movementForm, note: e.target.value })}
                placeholder="Optional note..."
              />
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button style={s.btn(COLORS.success)} onClick={registerManualMovement}>
                ✓ Register
              </button>
              <button style={s.btn(COLORS.gray)} onClick={() => setMovementModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BALANCE MODAL */}
      {balanceModal && (
        <div style={s.modal}>
          <div style={s.modalBox}>
            <h3 style={{ marginTop: 0, marginBottom: 20, color: COLORS.info }}>
              ⚖️ Manual Balance Adjustment
            </h3>
            
            <div style={s.formGrid}>
              <div>
                <label style={s.label}>Type</label>
                <select
                  style={s.select}
                  value={balanceForm.type}
                  onChange={e => setBalanceForm({ ...balanceForm, type: e.target.value })}
                >
                  <option>Adjustment</option>
                  <option>Lost</option>
                  <option>Broken</option>
                </select>
              </div>
              <div>
                <label style={s.label}>Location</label>
                <select
                  style={s.select}
                  value={balanceForm.loc}
                  onChange={e => setBalanceForm({ ...balanceForm, loc: e.target.value })}
                >
                  <option>YARD</option>
                  <option>SITE</option>
                </select>
              </div>
              <div>
                <label style={s.label}>Material Code</label>
                <select
                  style={s.select}
                  value={balanceForm.code}
                  onChange={e => setBalanceForm({ ...balanceForm, code: e.target.value })}
                >
                  <option value="">Select...</option>
                  {Object.keys(materials).map(k => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={s.label}>Quantity (+/-)</label>
                <input
                  type="number"
                  style={s.input}
                  value={balanceForm.qty}
                  onChange={e => setBalanceForm({ ...balanceForm, qty: e.target.value })}
                />
              </div>
              <div>
                <label style={s.label}>Name</label>
                <input
                  style={s.input}
                  value={balanceForm.name}
                  onChange={e => setBalanceForm({ ...balanceForm, name: e.target.value })}
                />
              </div>
              <div>
                <label style={s.label}>Badge</label>
                <input
                  style={s.input}
                  value={balanceForm.badge}
                  onChange={e => setBalanceForm({ ...balanceForm, badge: e.target.value })}
                />
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={s.label}>Note</label>
              <input
                style={s.input}
                value={balanceForm.note}
                onChange={e => setBalanceForm({ ...balanceForm, note: e.target.value })}
                placeholder="Reason for adjustment..."
              />
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button style={s.btn(COLORS.success)} onClick={saveBalance}>
                ✓ Save
              </button>
              <button style={s.btn(COLORS.gray)} onClick={() => setBalanceModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
