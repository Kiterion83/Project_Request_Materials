// ============================================================
// MATERIALS MANAGER V25 - COMPLETE VERSION WITH ALL BUTTONS
// ============================================================
// Deploy to: materials-manager/src/App.jsx
// ============================================================

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// ============================================================
// SUPABASE CLIENT CONFIGURATION
// ============================================================
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://cqqlzexwcwmegqeyqyi.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxcWx6ZXh3Y3dtZWdxZXlxeWkiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTczMzQ4NzE0MCwiZXhwIjoyMDQ5MDYzMTQwfQ.h0Rd4u9cPVDDYCKoXVcKIYeHpWThgrgQ7hWQu8MULNA';
const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================================
// STREICHER BRAND COLORS
// ============================================================
const COLORS = {
  primary: '#E31E24',      // STREICHER Red
  secondary: '#1F2937',    // Dark Gray
  background: '#F9FAFB',   // Light Gray
  success: '#16A34A',      // Green
  warning: '#D97706',      // Orange
  info: '#2563EB',         // Blue
  purple: '#7C3AED',       // Purple
  pink: '#EC4899',         // Pink
  cyan: '#0891B2',         // Cyan
  gray: '#6B7280',         // Gray
  yellow: '#CA8A04',       // Yellow
  orange: '#EA580C',       // Orange (Lost)
  red: '#DC2626',          // Red (Delete)
  // Dashboard specific
  yard: '#1F2937',         // Yard - Dark Gray
  site: '#2563EB',         // Site - Blue
  lost: '#EA580C',         // Lost - Orange
  broken: '#7C3AED',       // Broken - Purple (NOT red!)
};

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function MaterialsManager() {
  // Navigation & UI State
  const [view, setView] = useState('dashboard');
  const [modal, setModal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Data State
  const [materials, setMaterials] = useState({});
  const [inventory, setInventory] = useState({ yard: {}, site: {}, inTransit: {} });
  const [requests, setRequests] = useState([]);
  const [movements, setMovements] = useState([]);
  const [mirs, setMirs] = useState([]);
  const [projectDb, setProjectDb] = useState([]);
  const [dbLog, setDbLog] = useState([]);
  const [readyOut, setReadyOut] = useState([]);
  const [delivered, setDelivered] = useState([]);
  const [orderLog, setOrderLog] = useState([]);
  const [counter, setCounter] = useState(1001);

  // Form States
  const [form, setForm] = useState({ name: '', badge: '', iso: '', spool: '', hf: '', cat: 'Bulk' });
  const [itemForm, setItemForm] = useState({ code: '', qty: '' });
  const [requestItems, setRequestItems] = useState([]);
  const [mirForm, setMirForm] = useState({ mir: '', rk: '', forecast: '', priority: 'Medium' });
  const [loadForm, setLoadForm] = useState({ code: '', qty: '', mir: '', rk: '' });
  const [balanceForm, setBalanceForm] = useState({ code: '', qty: '', loc: 'YARD', balType: 'Adjustment', note: '', name: '', badge: '' });

  // Search & Filter States
  const [search, setSearch] = useState('');
  const [movSearch, setMovSearch] = useState('');
  const [statusFilters, setStatusFilters] = useState({ name: '', num: '', code: '', hf: '' });
  const [ordersTab, setOrdersTab] = useState('toOrder');

  // Database State
  const [dbUnlocked, setDbUnlocked] = useState(false);
  const [pwdInput, setPwdInput] = useState('');

  // NEW: Split Partial (PT) Form State
  const [partialForm, setPartialForm] = useState({
    reqId: null,
    compId: null,
    qtyFound: '',
    destino: 'Yard',
    page: '',
    destini: [],
    maxQty: 0
  });

  // NEW: Delete Confirm State
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // NEW: Tech Note State
  const [techNote, setTechNote] = useState({ note: '', to: 'Site', rid: null, cid: null });

  // NEW: Purchase Form State
  const [purchaseForm, setPurchaseForm] = useState({ rid: null, cid: null, qty: '', orderDate: '', forecast: '' });

  // NEW: Movement Add Form State
  const [movementForm, setMovementForm] = useState({ code: '', qty: '', loc: 'YARD', type: 'LOST', note: '' });

  // ============================================================
  // LOAD DATA FROM SUPABASE ON MOUNT
  // ============================================================
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      // Load materials catalog
      const { data: matData } = await supabase.from('materials').select('*');
      if (matData) {
        const matObj = {};
        matData.forEach(m => { matObj[m.code] = m.description; });
        setMaterials(matObj);
      }

      // Load inventory
      const { data: invData } = await supabase.from('inventory').select('*');
      if (invData) {
        const inv = { yard: {}, site: {}, inTransit: {} };
        invData.forEach(i => {
          const loc = i.location?.toLowerCase() === 'yard' ? 'yard' : 
                      i.location?.toLowerCase() === 'site' ? 'site' : 'inTransit';
          inv[loc][i.material_code] = i.quantity;
        });
        setInventory(inv);
      }

      // Load requests with components
      const { data: reqData } = await supabase.from('requests').select('*');
      const { data: compData } = await supabase.from('request_components').select('*');
      if (reqData && compData) {
        const reqs = reqData.map(r => ({
          id: r.id,
          num: parseInt(r.request_number) || r.id,
          sub: r.sub_number || 0,
          name: r.requester,
          badge: r.badge,
          iso: r.iso,
          spool: r.spool,
          hf: r.hf,
          cat: r.category,
          date: r.created_at,
          comp: compData.filter(c => c.request_id === r.id).map(c => ({
            id: c.id,
            code: c.material_code,
            qty: c.quantity,
            st: c.status || 'Site',
            desc: c.description,
            utCat: c.ut_category,
            utNote: c.ut_note,
            sentTo: c.sent_to,
            mngNote: c.mng_note,
            orderType: c.order_type,
            purchaseQty: c.purchase_qty,
            purchaseDate: c.purchase_date,
            purchaseForecast: c.purchase_forecast
          }))
        }));
        setRequests(reqs);
      }

      // Load movements
      const { data: movData } = await supabase.from('movements').select('*').order('movement_date', { ascending: false });
      if (movData) {
        setMovements(movData.map(m => ({
          id: m.id,
          date: m.movement_date,
          type: m.movement_type,
          loc: m.location,
          code: m.material_code,
          qty: m.quantity,
          note: m.note,
          balType: m.movement_type === 'LOST' ? 'Lost' : m.movement_type === 'BROKEN' ? 'Broken' : '',
          ref: m.reference,
          mir: m.mir_number,
          rk: m.rack
        })));
      }

      // Load MIRs
      const { data: mirData } = await supabase.from('mirs').select('*');
      if (mirData) {
        setMirs(mirData.map(m => ({
          id: m.id,
          mir: m.mir_number,
          rk: m.rack || '',
          date: m.created_at,
          forecast: m.forecast_date,
          priority: m.priority,
          st: m.status
        })));
      }

      // Load ready out
      const { data: readyData } = await supabase.from('ready_out').select('*');
      if (readyData) setReadyOut(readyData);

      // Load delivered
      const { data: delData } = await supabase.from('delivered').select('*');
      if (delData) setDelivered(delData);

      // Load order log
      const { data: ordData } = await supabase.from('order_log').select('*');
      if (ordData) setOrderLog(ordData);

      // Load counter
      const { data: cntData } = await supabase.from('counters').select('*').eq('counter_name', 'request_number').single();
      if (cntData) setCounter(cntData.current_value || 1001);

    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data');
    }
    setLoading(false);
  };

  // ============================================================
  // HELPER FUNCTIONS
  // ============================================================
  const now = () => new Date().toISOString();
  const today = () => new Date().toISOString().split('T')[0];
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('it-IT') : '';
  const formatDateTime = (d) => d ? new Date(d).toLocaleString('it-IT') : '';
  const formatReqNum = (num, sub) => `${num}-${sub}`;

  // Stats calculation
  const stats = {
    site: requests.reduce((n, r) => n + r.comp.filter(c => c.st === 'Site' || c.st === 'ChkS').length, 0),
    yard: requests.reduce((n, r) => n + r.comp.filter(c => c.st === 'Yard' || c.st === 'ChkY').length, 0),
    trans: requests.reduce((n, r) => n + r.comp.filter(c => c.st === 'Trans').length, 0),
    out: readyOut.length,
    eng: requests.reduce((n, r) => n + r.comp.filter(c => c.st === 'Eng' || c.st === 'UT').length, 0),
    spare: requests.reduce((n, r) => n + r.comp.filter(c => c.st === 'Spare').length, 0),
    mng: requests.reduce((n, r) => n + r.comp.filter(c => c.st === 'Mng').length, 0),
    order: requests.reduce((n, r) => n + r.comp.filter(c => c.st === 'Order').length, 0),
    ordered: requests.reduce((n, r) => n + r.comp.filter(c => c.st === 'Ordered').length, 0),
    mirP: mirs.filter(m => m.st !== 'Done').length,
    lost: movements.filter(m => m.type === 'LOST').reduce((s, m) => s + Math.abs(m.qty), 0),
    broken: movements.filter(m => m.type === 'BROKEN').reduce((s, m) => s + Math.abs(m.qty), 0)
  };

  // ============================================================
  // DATABASE UPDATE FUNCTIONS
  // ============================================================
  const updateComponentStatus = async (reqId, compId, newStatus, extra = {}) => {
    try {
      const updateData = { status: newStatus, ...extra };
      await supabase.from('request_components').update(updateData).eq('id', compId);
      
      setRequests(prev => prev.map(r => 
        r.id === reqId ? {
          ...r,
          comp: r.comp.map(c => c.id === compId ? { ...c, st: newStatus, ...extra } : c)
        } : r
      ));
    } catch (err) {
      console.error('Error updating component:', err);
      alert('Error updating component');
    }
  };

  const updateInventory = async (code, location, delta) => {
    try {
      const locUpper = location.toUpperCase();
      const { data: existing } = await supabase.from('inventory')
        .select('*')
        .eq('material_code', code)
        .eq('location', locUpper)
        .single();
      
      if (existing) {
        await supabase.from('inventory')
          .update({ quantity: existing.quantity + delta })
          .eq('id', existing.id);
      } else {
        await supabase.from('inventory').insert({
          material_code: code,
          location: locUpper,
          quantity: delta
        });
      }
      
      setInventory(prev => ({
        ...prev,
        [location.toLowerCase()]: {
          ...prev[location.toLowerCase()],
          [code]: (prev[location.toLowerCase()][code] || 0) + delta
        }
      }));
    } catch (err) {
      console.error('Error updating inventory:', err);
    }
  };

  const addMovement = async (type, loc, code, qty, note = '', ref = '') => {
    try {
      const { data } = await supabase.from('movements').insert({
        movement_type: type,
        location: loc,
        material_code: code,
        quantity: qty,
        note: note,
        reference: ref
      }).select().single();
      
      if (data) {
        setMovements(prev => [{
          id: data.id,
          date: data.movement_date,
          type: data.movement_type,
          loc: data.location,
          code: data.material_code,
          qty: data.quantity,
          note: data.note,
          balType: type === 'LOST' ? 'Lost' : type === 'BROKEN' ? 'Broken' : '',
          ref: data.reference
        }, ...prev]);
      }
    } catch (err) {
      console.error('Error adding movement:', err);
    }
  };

  // ============================================================
  // ACTION HANDLERS - WH SITE
  // ============================================================
  const siteAction = async (req, comp, action) => {
    const stock = inventory.site[comp.code] || 0;
    
    switch (action) {
      case 'out':
        if (stock < comp.qty) return alert('Insufficient stock in Site');
        await updateInventory(comp.code, 'site', -comp.qty);
        await addMovement('OUT', 'SITE', comp.code, comp.qty, `Req #${formatReqNum(req.num, req.sub)}`);
        
        // Add to ready_out
        const readyItem = {
          request_id: req.id,
          component_id: comp.id,
          request_number: formatReqNum(req.num, req.sub),
          requester: req.name,
          badge: req.badge,
          iso: req.iso,
          spool: req.spool,
          material_code: comp.code,
          quantity: comp.qty,
          description: comp.desc
        };
        const { data: newReady } = await supabase.from('ready_out').insert(readyItem).select().single();
        if (newReady) setReadyOut(prev => [...prev, newReady]);
        
        await updateComponentStatus(req.id, comp.id, 'Out');
        break;
        
      case 'yard':
        await updateComponentStatus(req.id, comp.id, 'Yard');
        break;
        
      case 'ut':
        await updateComponentStatus(req.id, comp.id, 'Eng', { ut_category: 'Qty Check', sent_to: 'Site' });
        break;
        
      case 'back':
        // Cancel/return - back to pending
        await updateComponentStatus(req.id, comp.id, 'Site');
        break;
        
      case 'partial':
        // Open PT modal
        setPartialForm({
          reqId: req.id,
          compId: comp.id,
          qtyFound: '',
          destino: 'Yard',
          page: 'site',
          destini: ['Yard', 'UT'],
          maxQty: comp.qty
        });
        setModal('partial');
        break;
        
      case 'delete':
        setDeleteConfirm({ req, comp, page: 'site' });
        setModal('deleteConfirm');
        break;
    }
  };

  // ============================================================
  // ACTION HANDLERS - WH YARD
  // ============================================================
  const yardAction = async (req, comp, action) => {
    const stock = inventory.yard[comp.code] || 0;
    
    switch (action) {
      case 'found':
        if (stock < comp.qty) return alert('Insufficient stock in Yard');
        await updateInventory(comp.code, 'yard', -comp.qty);
        await updateInventory(comp.code, 'inTransit', comp.qty);
        await addMovement('TRF', 'Y→S', comp.code, comp.qty, `Req #${formatReqNum(req.num, req.sub)}`);
        await updateComponentStatus(req.id, comp.id, 'Trans');
        break;
        
      case 'ut':
        await updateComponentStatus(req.id, comp.id, 'Eng', { ut_category: 'Qty Check', sent_to: 'Yard' });
        break;
        
      case 'back':
        await updateComponentStatus(req.id, comp.id, 'Site');
        break;
        
      case 'partial':
        setPartialForm({
          reqId: req.id,
          compId: comp.id,
          qtyFound: '',
          destino: 'UT',
          page: 'yard',
          destini: ['UT'],
          maxQty: comp.qty
        });
        setModal('partial');
        break;
        
      case 'delete':
        setDeleteConfirm({ req, comp, page: 'yard' });
        setModal('deleteConfirm');
        break;
    }
  };

  // ============================================================
  // ACTION HANDLERS - ENGINEERING
  // ============================================================
  const engAction = async (req, comp, action) => {
    switch (action) {
      case 'resolved':
        // Move to Ready OUT
        const readyItem = {
          request_id: req.id,
          component_id: comp.id,
          request_number: formatReqNum(req.num, req.sub),
          requester: req.name,
          badge: req.badge,
          iso: req.iso,
          spool: req.spool,
          material_code: comp.code,
          quantity: comp.qty,
          description: comp.desc
        };
        const { data: newReady } = await supabase.from('ready_out').insert(readyItem).select().single();
        if (newReady) setReadyOut(prev => [...prev, newReady]);
        await updateComponentStatus(req.id, comp.id, 'Out');
        break;
        
      case 'checkSite':
        setTechNote({ note: '', to: 'Site', rid: req.id, cid: comp.id });
        setModal('techNote');
        break;
        
      case 'checkYard':
        setTechNote({ note: '', to: 'Yard', rid: req.id, cid: comp.id });
        setModal('techNote');
        break;
        
      case 'spare':
        await updateComponentStatus(req.id, comp.id, 'Spare');
        break;
        
      case 'mng':
        await updateComponentStatus(req.id, comp.id, 'Mng');
        break;
        
      case 'back':
        const backTo = comp.sentTo || 'Site';
        await updateComponentStatus(req.id, comp.id, backTo);
        break;
        
      case 'partial':
        setPartialForm({
          reqId: req.id,
          compId: comp.id,
          qtyFound: '',
          destino: 'Mng',
          page: 'eng',
          destini: ['Mng', 'Order'],
          maxQty: comp.qty
        });
        setModal('partial');
        break;
        
      case 'delete':
        setDeleteConfirm({ req, comp, page: 'eng' });
        setModal('deleteConfirm');
        break;
    }
  };

  // ============================================================
  // SPLIT PARTIAL (PT) EXECUTION
  // ============================================================
  const executePartialSplit = async () => {
    const { reqId, compId, qtyFound, destino, page, maxQty } = partialForm;
    const found = parseInt(qtyFound);
    
    if (!found || found <= 0) return alert('Enter valid quantity found');
    if (found >= maxQty) return alert('For full release use ✓ button');
    
    const req = requests.find(r => r.id === reqId);
    const comp = req.comp.find(c => c.id === compId);
    const remaining = maxQty - found;
    
    // Check stock if needed
    if (page === 'site') {
      const stock = inventory.site[comp.code] || 0;
      if (stock < found) return alert('Insufficient stock in Site');
      
      // Update inventory and create ready_out for found qty
      await updateInventory(comp.code, 'site', -found);
      await addMovement('OUT', 'SITE', comp.code, found, `Req #${formatReqNum(req.num, req.sub)} (partial)`);
      
      const readyItem = {
        request_id: req.id,
        component_id: comp.id,
        request_number: formatReqNum(req.num, req.sub),
        requester: req.name,
        badge: req.badge,
        iso: req.iso,
        spool: req.spool,
        material_code: comp.code,
        quantity: found,
        description: comp.desc
      };
      const { data: newReady } = await supabase.from('ready_out').insert(readyItem).select().single();
      if (newReady) setReadyOut(prev => [...prev, newReady]);
      
    } else if (page === 'yard') {
      const stock = inventory.yard[comp.code] || 0;
      if (stock < found) return alert('Insufficient stock in Yard');
      
      // Transfer found qty
      await updateInventory(comp.code, 'yard', -found);
      await updateInventory(comp.code, 'inTransit', found);
      await addMovement('TRF', 'Y→S', comp.code, found, `Req #${formatReqNum(req.num, req.sub)} (partial)`);
    }
    
    // Update original component with found qty
    await supabase.from('request_components').update({ 
      quantity: found, 
      status: page === 'site' ? 'Out' : page === 'yard' ? 'Trans' : 'Out' 
    }).eq('id', compId);
    
    // Calculate new sub number
    const maxSub = Math.max(...requests.filter(r => r.num === req.num).map(r => r.sub));
    const newSub = maxSub + 1;
    
    // Create new request for remaining qty
    const { data: newReq } = await supabase.from('requests').insert({
      request_number: req.num.toString(),
      sub_number: newSub,
      requester: req.name,
      badge: req.badge,
      iso: req.iso,
      spool: req.spool,
      hf: req.hf,
      category: req.cat
    }).select().single();
    
    if (newReq) {
      // Create component for remaining qty
      const destStatus = destino === 'UT' ? 'Eng' : destino;
      await supabase.from('request_components').insert({
        request_id: newReq.id,
        material_code: comp.code,
        quantity: remaining,
        description: comp.desc,
        status: destStatus,
        ut_category: destino === 'UT' ? 'Split Qty' : null,
        mng_note: destino === 'Mng' ? 'Split from partial' : null
      });
    }
    
    // Reload data
    await loadAllData();
    setModal(null);
    setPartialForm({ reqId: null, compId: null, qtyFound: '', destino: 'Yard', page: '', destini: [], maxQty: 0 });
  };

  // ============================================================
  // DELETE CONFIRMATION
  // ============================================================
  const executeDelete = async () => {
    const { req, comp, page } = deleteConfirm;
    
    // Remove component from database
    await supabase.from('request_components').delete().eq('id', comp.id);
    
    // Update local state
    setRequests(prev => prev.map(r => 
      r.id === req.id ? { ...r, comp: r.comp.filter(c => c.id !== comp.id) } : r
    ).filter(r => r.comp.length > 0));
    
    setModal(null);
    setDeleteConfirm(null);
  };

  // ============================================================
  // TECH NOTE (Engineering → Site/Yard)
  // ============================================================
  const sendTechNote = async () => {
    const { note, to, rid, cid } = techNote;
    if (!note.trim()) return alert('Enter a note');
    
    const newStatus = to === 'Site' ? 'ChkS' : 'ChkY';
    await updateComponentStatus(rid, cid, newStatus, { ut_note: note, sent_to: to });
    
    setModal(null);
    setTechNote({ note: '', to: 'Site', rid: null, cid: null });
  };

  // ============================================================
  // SITE IN ACTIONS
  // ============================================================
  const siteInConfirm = async (req, comp) => {
    await updateInventory(comp.code, 'inTransit', -comp.qty);
    await updateInventory(comp.code, 'site', comp.qty);
    await addMovement('IN', 'SITE', comp.code, comp.qty, 'From Yard', `REQ-${formatReqNum(req.num, req.sub)}`);
    await updateComponentStatus(req.id, comp.id, 'Site');
  };

  const siteInReject = async (req, comp) => {
    await updateInventory(comp.code, 'inTransit', -comp.qty);
    await updateInventory(comp.code, 'yard', comp.qty);
    await updateComponentStatus(req.id, comp.id, 'Yard');
  };

  // ============================================================
  // READY OUT ACTIONS
  // ============================================================
  const confirmDelivery = async (item) => {
    // Move to delivered
    const deliveredItem = {
      request_id: item.request_id,
      component_id: item.component_id,
      request_number: item.request_number,
      requester: item.requester,
      badge: item.badge,
      iso: item.iso,
      spool: item.spool,
      material_code: item.material_code,
      quantity: item.quantity,
      description: item.description
    };
    const { data: newDel } = await supabase.from('delivered').insert(deliveredItem).select().single();
    if (newDel) setDelivered(prev => [...prev, newDel]);
    
    // Remove from ready_out
    await supabase.from('ready_out').delete().eq('id', item.id);
    setReadyOut(prev => prev.filter(r => r.id !== item.id));
    
    // Update component status
    await updateComponentStatus(item.request_id, item.component_id, 'Done');
    
    // Log movement
    await addMovement('OUT', 'DELIVERED', item.material_code, item.quantity, `Delivered to ${item.requester}`);
  };

  const cancelReadyOut = async (item) => {
    // Return to inventory
    await updateInventory(item.material_code, 'site', item.quantity);
    
    // Remove from ready_out
    await supabase.from('ready_out').delete().eq('id', item.id);
    setReadyOut(prev => prev.filter(r => r.id !== item.id));
    
    // Update component status back to Site
    await updateComponentStatus(item.request_id, item.component_id, 'Site');
  };

  // ============================================================
  // SPARE PARTS ACTIONS
  // ============================================================
  const spareHasStock = async (req, comp) => {
    // Client has spare - move to Ready OUT
    const readyItem = {
      request_id: req.id,
      component_id: comp.id,
      request_number: formatReqNum(req.num, req.sub),
      requester: req.name,
      badge: req.badge,
      iso: req.iso,
      spool: req.spool,
      material_code: comp.code,
      quantity: comp.qty,
      description: comp.desc
    };
    const { data: newReady } = await supabase.from('ready_out').insert(readyItem).select().single();
    if (newReady) setReadyOut(prev => [...prev, newReady]);
    await updateComponentStatus(req.id, comp.id, 'Out');
  };

  const spareNeedPurchase = async (req, comp) => {
    await updateComponentStatus(req.id, comp.id, 'Order', { order_type: 'Spare' });
  };

  // ============================================================
  // MANAGEMENT ACTIONS
  // ============================================================
  const mngOrderInternal = async (req, comp) => {
    await updateComponentStatus(req.id, comp.id, 'Order', { order_type: 'Internal' });
  };

  const mngOrderClient = async (req, comp) => {
    await updateComponentStatus(req.id, comp.id, 'Order', { order_type: 'Client' });
  };

  // ============================================================
  // ORDERS ACTIONS
  // ============================================================
  const openPurchaseModal = (req, comp) => {
    setPurchaseForm({ rid: req.id, cid: comp.id, qty: comp.qty.toString(), orderDate: today(), forecast: '' });
    setModal('purchase');
  };

  const confirmPurchase = async () => {
    const { rid, cid, qty, orderDate, forecast } = purchaseForm;
    if (!qty || !orderDate) return alert('Fill all required fields');
    
    await supabase.from('request_components').update({
      status: 'Ordered',
      purchase_qty: parseInt(qty),
      purchase_date: orderDate,
      purchase_forecast: forecast || null
    }).eq('id', cid);
    
    // Add to order_log
    const req = requests.find(r => r.id === rid);
    const comp = req.comp.find(c => c.id === cid);
    await supabase.from('order_log').insert({
      request_id: rid,
      component_id: cid,
      material_code: comp.code,
      quantity_ordered: parseInt(qty),
      order_date: orderDate,
      forecast_date: forecast || null,
      order_type: comp.orderType || 'Internal',
      status: 'Ordered'
    });
    
    await loadAllData();
    setModal(null);
    setPurchaseForm({ rid: null, cid: null, qty: '', orderDate: '', forecast: '' });
  };

  const orderArrived = async (req, comp) => {
    // Material arrived - add to inventory
    await updateInventory(comp.code, 'yard', comp.purchaseQty || comp.qty);
    await addMovement('IN', 'YARD', comp.code, comp.purchaseQty || comp.qty, 'Order arrived');
    
    // Update status to Site (for processing)
    await updateComponentStatus(req.id, comp.id, 'Site');
    
    // Update order_log
    await supabase.from('order_log').update({
      status: 'Arrived',
      arrived_date: today()
    }).eq('component_id', comp.id);
    
    await loadAllData();
  };

  // ============================================================
  // MOVEMENTS - ADD MANUAL
  // ============================================================
  const addManualMovement = async () => {
    const { code, qty, loc, type, note } = movementForm;
    if (!code || !qty) return alert('Select code and quantity');
    
    const quantity = parseInt(qty);
    
    // Update inventory
    if (type === 'LOST' || type === 'BROKEN') {
      await updateInventory(code, loc.toLowerCase(), -Math.abs(quantity));
    } else if (type === 'IN') {
      await updateInventory(code, loc.toLowerCase(), quantity);
    } else if (type === 'OUT') {
      await updateInventory(code, loc.toLowerCase(), -quantity);
    }
    
    await addMovement(type, loc, code, type === 'LOST' || type === 'BROKEN' ? -Math.abs(quantity) : quantity, note);
    
    setModal(null);
    setMovementForm({ code: '', qty: '', loc: 'YARD', type: 'LOST', note: '' });
  };

  // ============================================================
  // NEW REQUEST
  // ============================================================
  const addItemToRequest = () => {
    if (!itemForm.code || !itemForm.qty) return alert('Select code and quantity');
    const newItem = {
      id: Date.now(),
      code: itemForm.code,
      qty: parseInt(itemForm.qty),
      desc: materials[itemForm.code] || itemForm.code
    };
    setRequestItems([...requestItems, newItem]);
    setItemForm({ code: '', qty: '' });
  };

  const submitRequest = async (destination) => {
    if (!form.name || !form.badge || !form.iso || !form.spool) return alert('Fill all required fields');
    if (form.cat === 'Erection' && !form.hf) return alert('HF required for Erection Material');
    if (requestItems.length === 0) return alert('Add at least one material');
    
    try {
      // Create request
      const { data: newReq } = await supabase.from('requests').insert({
        request_number: counter.toString(),
        sub_number: 0,
        requester: form.name,
        badge: form.badge,
        iso: form.iso,
        spool: form.spool,
        hf: form.hf,
        category: form.cat
      }).select().single();
      
      if (newReq) {
        // Create components
        const compInserts = requestItems.map(item => ({
          request_id: newReq.id,
          material_code: item.code,
          quantity: item.qty,
          description: item.desc,
          status: destination,
          ut_category: destination === 'Eng' ? 'Direct Request' : null
        }));
        await supabase.from('request_components').insert(compInserts);
        
        // Update counter
        await supabase.from('counters').update({ current_value: counter + 1 }).eq('counter_name', 'request_number');
        setCounter(counter + 1);
      }
      
      // Reset form
      setForm({ name: '', badge: '', iso: '', spool: '', hf: '', cat: 'Bulk' });
      setRequestItems([]);
      setItemForm({ code: '', qty: '' });
      
      await loadAllData();
    } catch (err) {
      console.error('Error creating request:', err);
      alert('Error creating request');
    }
  };

  // ============================================================
  // MIR FUNCTIONS
  // ============================================================
  const createMir = async () => {
    if (!mirForm.mir || !mirForm.rk || !mirForm.forecast) return alert('Fill all required fields');
    
    const { data } = await supabase.from('mirs').insert({
      mir_number: mirForm.mir,
      rack: mirForm.rk,
      forecast_date: mirForm.forecast,
      priority: mirForm.priority,
      status: 'Pending'
    }).select().single();
    
    if (data) {
      setMirs([...mirs, {
        id: data.id,
        mir: data.mir_number,
        rk: data.rack,
        date: data.created_at,
        forecast: data.forecast_date,
        priority: data.priority,
        st: data.status
      }]);
    }
    
    setMirForm({ mir: '', rk: '', forecast: '', priority: 'Medium' });
  };

  const completeMir = async (id) => {
    await supabase.from('mirs').update({ status: 'Done' }).eq('id', id);
    setMirs(mirs.map(m => m.id === id ? { ...m, st: 'Done' } : m));
  };

  // ============================================================
  // MATERIAL IN (Load to Yard)
  // ============================================================
  const loadMaterial = async () => {
    if (!loadForm.code || !loadForm.qty) return alert('Select code and quantity');
    
    await updateInventory(loadForm.code, 'yard', parseInt(loadForm.qty));
    await addMovement('IN', 'YARD', loadForm.code, parseInt(loadForm.qty), 
      loadForm.mir ? `MIR: ${loadForm.mir}` : 'Manual load',
      loadForm.rk || ''
    );
    
    setLoadForm({ code: '', qty: '', mir: '', rk: '' });
  };

  // ============================================================
  // CHECK RESPONSE (Site/Yard → Engineering)
  // ============================================================
  const respondToCheck = async (req, comp, response) => {
    if (response === 'ok') {
      // Resolved - move to ready out
      const readyItem = {
        request_id: req.id,
        component_id: comp.id,
        request_number: formatReqNum(req.num, req.sub),
        requester: req.name,
        badge: req.badge,
        iso: req.iso,
        spool: req.spool,
        material_code: comp.code,
        quantity: comp.qty,
        description: comp.desc
      };
      const { data: newReady } = await supabase.from('ready_out').insert(readyItem).select().single();
      if (newReady) setReadyOut(prev => [...prev, newReady]);
      await updateComponentStatus(req.id, comp.id, 'Out');
    } else if (response === 'no') {
      // Not resolved - back to Engineering
      await updateComponentStatus(req.id, comp.id, 'Eng');
    } else if (response === 'other') {
      // Resolved by other warehouse
      const other = comp.st === 'ChkS' ? 'Yard' : 'Site';
      await updateComponentStatus(req.id, comp.id, other);
    }
    setModal(null);
  };

  // ============================================================
  // STYLES
  // ============================================================
  const s = {
    box: { background: '#fff', padding: 12, borderRadius: 6, marginBottom: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
    inp: { padding: '6px 10px', border: '1px solid #ddd', borderRadius: 4, fontSize: 11, width: '100%', boxSizing: 'border-box' },
    btn: (c, dis) => ({ 
      padding: '4px 8px', 
      background: dis ? '#ccc' : c, 
      color: '#fff', 
      border: 'none', 
      borderRadius: 4, 
      cursor: dis ? 'default' : 'pointer', 
      fontSize: 10, 
      marginRight: 3,
      opacity: dis ? 0.6 : 1
    }),
    tbl: { width: '100%', borderCollapse: 'collapse', fontSize: 10 },
    th: { padding: 6, background: '#f3f4f6', textAlign: 'left', borderBottom: '2px solid #e5e7eb' },
    td: { padding: 6, borderBottom: '1px solid #e5e7eb' },
    label: { fontSize: 9, color: '#666', marginBottom: 2 },
    labelBox: { flex: 1 },
    labelRow: { display: 'flex', gap: 8, marginBottom: 8 },
    dashBox: (color) => ({
      background: `${color}15`,
      borderLeft: `4px solid ${color}`,
      padding: 10,
      borderRadius: 4,
      cursor: 'pointer',
      transition: 'transform 0.1s',
      ':hover': { transform: 'scale(1.02)' }
    }),
    modal: {
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50
    },
    modalContent: {
      background: '#fff',
      padding: 16,
      borderRadius: 8,
      width: 300,
      maxWidth: '90%'
    }
  };

  // ============================================================
  // RENDER FUNCTIONS
  // ============================================================
  
  // DASHBOARD
  const renderDashboard = () => (
    <div>
      {/* Header Stats */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 'bold', marginBottom: 6, color: COLORS.primary }}>📊 WORKFLOW STATUS</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
          <div style={s.dashBox(COLORS.site)} onClick={() => setView('whSite')}>
            <div style={{ fontSize: 20, fontWeight: 'bold' }}>{stats.site}</div>
            <div style={{ fontSize: 9 }}>🏭 WH Site</div>
          </div>
          <div style={s.dashBox(COLORS.yellow)} onClick={() => setView('whYard')}>
            <div style={{ fontSize: 20, fontWeight: 'bold' }}>{stats.yard}</div>
            <div style={{ fontSize: 9 }}>🏗️ WH Yard</div>
          </div>
          <div style={s.dashBox(COLORS.orange)} onClick={() => setView('siteIn')}>
            <div style={{ fontSize: 20, fontWeight: 'bold' }}>{stats.trans}</div>
            <div style={{ fontSize: 9 }}>🚚 In Transit</div>
          </div>
          <div style={s.dashBox(COLORS.success)} onClick={() => setView('readyOut')}>
            <div style={{ fontSize: 20, fontWeight: 'bold' }}>{stats.out}</div>
            <div style={{ fontSize: 9 }}>📤 Ready OUT</div>
          </div>
          <div style={s.dashBox(COLORS.purple)} onClick={() => setView('engineering')}>
            <div style={{ fontSize: 20, fontWeight: 'bold' }}>{stats.eng}</div>
            <div style={{ fontSize: 9 }}>🔧 Engineering</div>
          </div>
        </div>
      </div>

      {/* Orders & Management */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 'bold', marginBottom: 6 }}>📦 ORDERS & MANAGEMENT</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
          <div style={s.dashBox(COLORS.pink)} onClick={() => setView('spare')}>
            <div style={{ fontSize: 20, fontWeight: 'bold' }}>{stats.spare}</div>
            <div style={{ fontSize: 9 }}>⭐ Spare Parts</div>
          </div>
          <div style={s.dashBox(COLORS.cyan)} onClick={() => setView('management')}>
            <div style={{ fontSize: 20, fontWeight: 'bold' }}>{stats.mng}</div>
            <div style={{ fontSize: 9 }}>👔 Management</div>
          </div>
          <div style={s.dashBox(COLORS.warning)} onClick={() => { setView('orders'); setOrdersTab('toOrder'); }}>
            <div style={{ fontSize: 20, fontWeight: 'bold' }}>{stats.order}</div>
            <div style={{ fontSize: 9 }}>🛒 To Order</div>
          </div>
          <div style={s.dashBox(COLORS.success)} onClick={() => { setView('orders'); setOrdersTab('pending'); }}>
            <div style={{ fontSize: 20, fontWeight: 'bold' }}>{stats.ordered}</div>
            <div style={{ fontSize: 9 }}>📦 Ordered</div>
          </div>
          <div style={s.dashBox(COLORS.red)} onClick={() => setView('mir')}>
            <div style={{ fontSize: 20, fontWeight: 'bold' }}>{stats.mirP}</div>
            <div style={{ fontSize: 9 }}>📋 MIR Pending</div>
          </div>
        </div>
      </div>

      {/* INVENTORY SUMMARY - 4 SEPARATE BOXES */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 'bold', marginBottom: 6 }}>📊 INVENTORY SUMMARY</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {/* YARD - Gray */}
          <div style={{ ...s.dashBox(COLORS.yard), background: '#1F293715' }} onClick={() => setView('movements')}>
            <div style={{ fontSize: 20, fontWeight: 'bold', color: COLORS.yard }}>
              {Object.values(inventory.yard).reduce((a, b) => a + b, 0)}
            </div>
            <div style={{ fontSize: 9 }}>🏗️ YARD Stock</div>
          </div>
          {/* SITE - Blue */}
          <div style={{ ...s.dashBox(COLORS.site), background: '#2563EB15' }} onClick={() => setView('movements')}>
            <div style={{ fontSize: 20, fontWeight: 'bold', color: COLORS.site }}>
              {Object.values(inventory.site).reduce((a, b) => a + b, 0)}
            </div>
            <div style={{ fontSize: 9 }}>🏭 SITE Stock</div>
          </div>
          {/* LOST - Orange */}
          <div style={{ ...s.dashBox(COLORS.lost), background: '#EA580C15' }} onClick={() => setView('movements')}>
            <div style={{ fontSize: 20, fontWeight: 'bold', color: COLORS.lost }}>
              {stats.lost}
            </div>
            <div style={{ fontSize: 9 }}>❌ Lost Items</div>
          </div>
          {/* BROKEN - Purple (NOT RED!) */}
          <div style={{ ...s.dashBox(COLORS.broken), background: '#7C3AED15' }} onClick={() => setView('movements')}>
            <div style={{ fontSize: 20, fontWeight: 'bold', color: COLORS.broken }}>
              {stats.broken}
            </div>
            <div style={{ fontSize: 9 }}>💔 Broken Items</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div style={s.box}>
          <div style={{ fontWeight: 'bold', marginBottom: 6 }}>🎯 QUICK ACTIONS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <button style={s.btn(COLORS.info)} onClick={() => setView('newRequest')}>+ New Request</button>
            <button style={s.btn(COLORS.red)} onClick={() => setView('mir')}>+ New MIR</button>
            <button style={s.btn(COLORS.success)} onClick={() => setView('materialIn')}>📥 Load Material</button>
            <button style={s.btn(COLORS.purple)} onClick={() => setView('movements')}>📜 View Movements</button>
          </div>
        </div>
        <div style={s.box}>
          <div style={{ fontWeight: 'bold', marginBottom: 6 }}>📈 TODAY'S STATS</div>
          <div style={{ fontSize: 10, lineHeight: 1.8 }}>
            <div>• Pending Site: <strong style={{ color: COLORS.site }}>{stats.site}</strong></div>
            <div>• Pending Yard: <strong style={{ color: COLORS.yellow }}>{stats.yard}</strong></div>
            <div>• In Transit: <strong style={{ color: COLORS.orange }}>{stats.trans}</strong></div>
            <div>• Ready for Pickup: <strong style={{ color: COLORS.success }}>{stats.out}</strong></div>
            <div>• Total Delivered: <strong style={{ color: COLORS.success }}>{delivered.length}</strong></div>
          </div>
        </div>
      </div>
    </div>
  );

  // WH SITE & YARD - Combined render with ALL buttons
  const renderWarehouse = (location) => {
    const statusFilter = location === 'Site' ? ['Site', 'ChkS'] : ['Yard', 'ChkY'];
    const items = [];
    requests.forEach(r => {
      r.comp.filter(c => statusFilter.includes(c.st)).forEach(c => {
        items.push({ req: r, comp: c });
      });
    });

    const actionHandler = location === 'Site' ? siteAction : yardAction;

    return (
      <div style={s.box}>
        <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 'bold', color: location === 'Site' ? COLORS.site : COLORS.yellow }}>
            {location === 'Site' ? '🏭' : '🏗️'} {location.toUpperCase()} WAREHOUSE ({items.length})
          </span>
          <input style={{ ...s.inp, width: 200 }} placeholder="🔍 Search..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        
        {/* Inventory Summary */}
        <div style={{ background: location === 'Site' ? '#dbeafe' : '#fef9c3', padding: 6, borderRadius: 4, marginBottom: 8, fontSize: 9 }}>
          <strong>Stock:</strong> {Object.entries(location === 'Site' ? inventory.site : inventory.yard)
            .filter(([, v]) => v > 0)
            .map(([k, v]) => `${k}: ${v}`)
            .join(' | ') || 'Empty'}
        </div>
        
        <table style={s.tbl}>
          <thead>
            <tr>
              <th style={s.th}>Req #</th>
              <th style={s.th}>Name</th>
              <th style={s.th}>ISO/Spool</th>
              <th style={s.th}>Code</th>
              <th style={s.th}>Qty</th>
              <th style={s.th}>Stock</th>
              <th style={s.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.filter(i => 
              !search || 
              i.comp.code.toLowerCase().includes(search.toLowerCase()) ||
              i.req.name.toLowerCase().includes(search.toLowerCase()) ||
              formatReqNum(i.req.num, i.req.sub).includes(search)
            ).map(({ req, comp }) => {
              const stock = location === 'Site' ? (inventory.site[comp.code] || 0) : (inventory.yard[comp.code] || 0);
              const isCheck = comp.st === 'ChkS' || comp.st === 'ChkY';
              const hasStock = stock >= comp.qty;
              
              return (
                <tr key={`${req.id}-${comp.id}`} style={{ background: isCheck ? '#FEF3C7' : 'transparent' }}>
                  <td style={s.td}><strong>{formatReqNum(req.num, req.sub)}</strong></td>
                  <td style={s.td}>{req.name}</td>
                  <td style={s.td}>{req.iso}/{req.spool}</td>
                  <td style={s.td}>{comp.code}</td>
                  <td style={s.td}>{comp.qty}</td>
                  <td style={{ ...s.td, color: hasStock ? COLORS.success : COLORS.red, fontWeight: 'bold' }}>{stock}</td>
                  <td style={s.td}>
                    {isCheck ? (
                      // Check response buttons
                      <>
                        <button style={s.btn(COLORS.purple)} onClick={() => {
                          setModal({ type: 'checkResp', req, comp });
                        }}>📩 {comp.utNote?.substring(0, 10)}...</button>
                      </>
                    ) : (
                      // Normal action buttons - ALL 6 BUTTONS
                      <>
                        {/* ✓ Green - Ready OUT (Site) or Transfer (Yard) */}
                        <button 
                          style={s.btn(COLORS.success, !hasStock)} 
                          onClick={() => actionHandler(req, comp, location === 'Site' ? 'out' : 'found')}
                          disabled={!hasStock}
                          title={location === 'Site' ? 'Ready OUT' : 'Transfer to Site'}
                        >✓</button>
                        
                        {/* PT Orange - Partial Split */}
                        <button 
                          style={s.btn(COLORS.orange)} 
                          onClick={() => actionHandler(req, comp, 'partial')}
                          title="Partial Split"
                        >PT</button>
                        
                        {/* Y Yellow - To Yard (Site only) */}
                        {location === 'Site' && (
                          <button 
                            style={s.btn(COLORS.yellow)} 
                            onClick={() => actionHandler(req, comp, 'yard')}
                            title="Send to Yard"
                          >Y</button>
                        )}
                        
                        {/* UT Purple - To Engineering */}
                        <button 
                          style={s.btn(COLORS.purple)} 
                          onClick={() => actionHandler(req, comp, 'ut')}
                          title="Send to Engineering"
                        >UT</button>
                        
                        {/* ↩ Gray - Back */}
                        <button 
                          style={s.btn(COLORS.gray)} 
                          onClick={() => actionHandler(req, comp, 'back')}
                          title={location === 'Site' ? 'Cancel' : 'Back to Site'}
                        >↩</button>
                        
                        {/* 🗑️ Red - Delete */}
                        <button 
                          style={s.btn(COLORS.red)} 
                          onClick={() => actionHandler(req, comp, 'delete')}
                          title="Delete"
                        >🗑️</button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {items.length === 0 && <p style={{ textAlign: 'center', color: '#999', padding: 20 }}>No items</p>}
      </div>
    );
  };

  // SITE IN
  const renderSiteIn = () => {
    const items = [];
    requests.forEach(r => {
      r.comp.filter(c => c.st === 'Trans').forEach(c => {
        items.push({ req: r, comp: c });
      });
    });

    return (
      <div style={s.box}>
        <div style={{ fontWeight: 'bold', marginBottom: 8, color: COLORS.orange }}>🚚 SITE IN - Incoming Transfers ({items.length})</div>
        <table style={s.tbl}>
          <thead>
            <tr>
              <th style={s.th}>Req #</th>
              <th style={s.th}>Name</th>
              <th style={s.th}>Code</th>
              <th style={s.th}>Qty</th>
              <th style={s.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(({ req, comp }) => (
              <tr key={`${req.id}-${comp.id}`}>
                <td style={s.td}><strong>{formatReqNum(req.num, req.sub)}</strong></td>
                <td style={s.td}>{req.name}</td>
                <td style={s.td}>{comp.code}</td>
                <td style={s.td}>{comp.qty}</td>
                <td style={s.td}>
                  <button style={s.btn(COLORS.success)} onClick={() => siteInConfirm(req, comp)}>✓ Confirm</button>
                  <button style={s.btn(COLORS.gray)} onClick={() => siteInReject(req, comp)}>↩ Reject</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && <p style={{ textAlign: 'center', color: '#999', padding: 20 }}>No incoming transfers</p>}
      </div>
    );
  };

  // ENGINEERING - ALL 7 BUTTONS
  const renderEngineering = () => {
    const items = [];
    requests.forEach(r => {
      r.comp.filter(c => c.st === 'Eng' || c.st === 'UT').forEach(c => {
        items.push({ req: r, comp: c });
      });
    });

    return (
      <div style={s.box}>
        <div style={{ fontWeight: 'bold', marginBottom: 8, color: COLORS.purple }}>🔧 ENGINEERING ({items.length})</div>
        <table style={s.tbl}>
          <thead>
            <tr>
              <th style={s.th}>Req #</th>
              <th style={s.th}>Name</th>
              <th style={s.th}>ISO/Spool</th>
              <th style={s.th}>Code</th>
              <th style={s.th}>Qty</th>
              <th style={s.th}>Category</th>
              <th style={s.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(({ req, comp }) => (
              <tr key={`${req.id}-${comp.id}`}>
                <td style={s.td}><strong>{formatReqNum(req.num, req.sub)}</strong></td>
                <td style={s.td}>{req.name}</td>
                <td style={s.td}>{req.iso}/{req.spool}</td>
                <td style={s.td}>{comp.code}</td>
                <td style={s.td}>{comp.qty}</td>
                <td style={s.td}><span style={{ background: '#f3e8ff', padding: '2px 6px', borderRadius: 4, fontSize: 9 }}>{comp.utCat || '-'}</span></td>
                <td style={s.td}>
                  {/* ✓ Green - Resolved */}
                  <button style={s.btn(COLORS.success)} onClick={() => engAction(req, comp, 'resolved')} title="Resolved">✓</button>
                  
                  {/* PT Orange - Partial */}
                  <button style={s.btn(COLORS.orange)} onClick={() => engAction(req, comp, 'partial')} title="Partial Split">PT</button>
                  
                  {/* 🔍 Purple - Check Site */}
                  <button style={s.btn(COLORS.info)} onClick={() => engAction(req, comp, 'checkSite')} title="Check Site">🔍S</button>
                  
                  {/* 🔍 Yellow - Check Yard */}
                  <button style={s.btn(COLORS.yellow)} onClick={() => engAction(req, comp, 'checkYard')} title="Check Yard">🔍Y</button>
                  
                  {/* Sp Pink - Spare */}
                  <button style={s.btn(COLORS.pink)} onClick={() => engAction(req, comp, 'spare')} title="Spare Parts">Sp</button>
                  
                  {/* Mng Cyan - Management */}
                  <button style={s.btn(COLORS.cyan)} onClick={() => engAction(req, comp, 'mng')} title="Management">Mng</button>
                  
                  {/* ↩ Gray - Back */}
                  <button style={s.btn(COLORS.gray)} onClick={() => engAction(req, comp, 'back')} title="Back">↩</button>
                  
                  {/* 🗑️ Red - Delete */}
                  <button style={s.btn(COLORS.red)} onClick={() => engAction(req, comp, 'delete')} title="Delete">🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && <p style={{ textAlign: 'center', color: '#999', padding: 20 }}>No items in Engineering</p>}
      </div>
    );
  };

  // READY OUT
  const renderReadyOut = () => (
    <div style={s.box}>
      <div style={{ fontWeight: 'bold', marginBottom: 8, color: COLORS.success }}>📤 READY OUT ({readyOut.length})</div>
      <table style={s.tbl}>
        <thead>
          <tr>
            <th style={s.th}>Req #</th>
            <th style={s.th}>Name</th>
            <th style={s.th}>Badge</th>
            <th style={s.th}>Code</th>
            <th style={s.th}>Qty</th>
            <th style={s.th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {readyOut.map(item => (
            <tr key={item.id}>
              <td style={s.td}><strong>{item.request_number}</strong></td>
              <td style={s.td}>{item.requester}</td>
              <td style={s.td}>{item.badge}</td>
              <td style={s.td}>{item.material_code}</td>
              <td style={s.td}>{item.quantity}</td>
              <td style={s.td}>
                <button style={s.btn(COLORS.success)} onClick={() => confirmDelivery(item)}>✓ Delivered</button>
                <button style={s.btn(COLORS.red)} onClick={() => cancelReadyOut(item)}>🗑️ Cancel</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {readyOut.length === 0 && <p style={{ textAlign: 'center', color: '#999', padding: 20 }}>No items ready for pickup</p>}
    </div>
  );

  // SPARE PARTS
  const renderSpare = () => {
    const items = [];
    requests.forEach(r => {
      r.comp.filter(c => c.st === 'Spare').forEach(c => {
        items.push({ req: r, comp: c });
      });
    });

    return (
      <div style={s.box}>
        <div style={{ fontWeight: 'bold', marginBottom: 8, color: COLORS.pink }}>⭐ SPARE PARTS ({items.length})</div>
        <table style={s.tbl}>
          <thead>
            <tr>
              <th style={s.th}>Req #</th>
              <th style={s.th}>Name</th>
              <th style={s.th}>Code</th>
              <th style={s.th}>Qty</th>
              <th style={s.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(({ req, comp }) => (
              <tr key={`${req.id}-${comp.id}`}>
                <td style={s.td}><strong>{formatReqNum(req.num, req.sub)}</strong></td>
                <td style={s.td}>{req.name}</td>
                <td style={s.td}>{comp.code}</td>
                <td style={s.td}>{comp.qty}</td>
                <td style={s.td}>
                  <button style={s.btn(COLORS.success)} onClick={() => spareHasStock(req, comp)}>✓ Has Spare</button>
                  <button style={s.btn(COLORS.info)} onClick={() => spareNeedPurchase(req, comp)}>🛒 Purchase</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && <p style={{ textAlign: 'center', color: '#999', padding: 20 }}>No spare parts requests</p>}
      </div>
    );
  };

  // MANAGEMENT
  const renderManagement = () => {
    const items = [];
    requests.forEach(r => {
      r.comp.filter(c => c.st === 'Mng').forEach(c => {
        items.push({ req: r, comp: c });
      });
    });

    return (
      <div style={s.box}>
        <div style={{ fontWeight: 'bold', marginBottom: 8, color: COLORS.cyan }}>👔 MANAGEMENT ({items.length})</div>
        <table style={s.tbl}>
          <thead>
            <tr>
              <th style={s.th}>Req #</th>
              <th style={s.th}>Name</th>
              <th style={s.th}>Code</th>
              <th style={s.th}>Qty</th>
              <th style={s.th}>Note</th>
              <th style={s.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(({ req, comp }) => (
              <tr key={`${req.id}-${comp.id}`}>
                <td style={s.td}><strong>{formatReqNum(req.num, req.sub)}</strong></td>
                <td style={s.td}>{req.name}</td>
                <td style={s.td}>{comp.code}</td>
                <td style={s.td}>{comp.qty}</td>
                <td style={s.td}>{comp.mngNote || '-'}</td>
                <td style={s.td}>
                  <button style={s.btn(COLORS.info)} onClick={() => mngOrderInternal(req, comp)}>Int</button>
                  <button style={s.btn(COLORS.success)} onClick={() => mngOrderClient(req, comp)}>Cli</button>
                  <button style={s.btn(COLORS.gray)} onClick={() => updateComponentStatus(req.id, comp.id, 'Eng')}>↩</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && <p style={{ textAlign: 'center', color: '#999', padding: 20 }}>No management items</p>}
      </div>
    );
  };

  // ORDERS - 3 TABS
  const renderOrders = () => {
    const toOrder = [];
    const pending = [];
    requests.forEach(r => {
      r.comp.filter(c => c.st === 'Order').forEach(c => toOrder.push({ req: r, comp: c }));
      r.comp.filter(c => c.st === 'Ordered').forEach(c => pending.push({ req: r, comp: c }));
    });

    return (
      <div style={s.box}>
        {/* Tab Buttons */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
          <button 
            style={s.btn(ordersTab === 'toOrder' ? COLORS.warning : COLORS.gray)} 
            onClick={() => setOrdersTab('toOrder')}
          >🛒 Da Ordinare ({toOrder.length})</button>
          <button 
            style={s.btn(ordersTab === 'pending' ? COLORS.success : COLORS.gray)} 
            onClick={() => setOrdersTab('pending')}
          >📦 Ordinati ({pending.length})</button>
          <button 
            style={s.btn(ordersTab === 'log' ? COLORS.purple : COLORS.gray)} 
            onClick={() => setOrdersTab('log')}
          >📋 Log ({orderLog.length})</button>
        </div>

        {/* Tab 1: Da Ordinare */}
        {ordersTab === 'toOrder' && (
          <table style={s.tbl}>
            <thead>
              <tr>
                <th style={s.th}>Req #</th>
                <th style={s.th}>Name</th>
                <th style={s.th}>Code</th>
                <th style={s.th}>Qty</th>
                <th style={s.th}>Type</th>
                <th style={s.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {toOrder.map(({ req, comp }) => (
                <tr key={`${req.id}-${comp.id}`}>
                  <td style={s.td}><strong>{formatReqNum(req.num, req.sub)}</strong></td>
                  <td style={s.td}>{req.name}</td>
                  <td style={s.td}>{comp.code}</td>
                  <td style={s.td}>{comp.qty}</td>
                  <td style={s.td}><span style={{ background: comp.orderType === 'Client' ? '#dcfce7' : '#dbeafe', padding: '2px 6px', borderRadius: 4, fontSize: 9 }}>{comp.orderType || 'Internal'}</span></td>
                  <td style={s.td}>
                    <button style={s.btn(COLORS.info)} onClick={() => openPurchaseModal(req, comp)}>🛒 Purchase</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Tab 2: Ordinati */}
        {ordersTab === 'pending' && (
          <table style={s.tbl}>
            <thead>
              <tr>
                <th style={s.th}>Req #</th>
                <th style={s.th}>Code</th>
                <th style={s.th}>Qty</th>
                <th style={s.th}>Order Date</th>
                <th style={s.th}>Forecast</th>
                <th style={s.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pending.map(({ req, comp }) => (
                <tr key={`${req.id}-${comp.id}`}>
                  <td style={s.td}><strong>{formatReqNum(req.num, req.sub)}</strong></td>
                  <td style={s.td}>{comp.code}</td>
                  <td style={s.td}>{comp.purchaseQty || comp.qty}</td>
                  <td style={s.td}>{formatDate(comp.purchaseDate)}</td>
                  <td style={s.td}>{formatDate(comp.purchaseForecast)}</td>
                  <td style={s.td}>
                    <button style={s.btn(COLORS.success)} onClick={() => orderArrived(req, comp)}>✓ Arrived</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Tab 3: Log */}
        {ordersTab === 'log' && (
          <table style={s.tbl}>
            <thead>
              <tr>
                <th style={s.th}>Date</th>
                <th style={s.th}>Code</th>
                <th style={s.th}>Qty</th>
                <th style={s.th}>Type</th>
                <th style={s.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {orderLog.slice(0, 50).map(log => (
                <tr key={log.id}>
                  <td style={s.td}>{formatDate(log.order_date)}</td>
                  <td style={s.td}>{log.material_code}</td>
                  <td style={s.td}>{log.quantity_ordered}</td>
                  <td style={s.td}>{log.order_type}</td>
                  <td style={s.td}><span style={{ background: log.status === 'Arrived' ? '#dcfce7' : '#fef3c7', padding: '2px 6px', borderRadius: 4, fontSize: 9 }}>{log.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  };

  // MOVEMENTS - WITH + BUTTON
  const renderMovements = () => {
    const filtered = movements.filter(m => 
      !movSearch || 
      m.code?.toLowerCase().includes(movSearch.toLowerCase()) ||
      m.type?.toLowerCase().includes(movSearch.toLowerCase()) ||
      m.note?.toLowerCase().includes(movSearch.toLowerCase())
    );

    return (
      <div style={s.box}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontWeight: 'bold' }}>📜 MOVEMENTS ({filtered.length})</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <input style={{ ...s.inp, width: 150 }} placeholder="🔍 Search..." value={movSearch} onChange={e => setMovSearch(e.target.value)} />
            <button style={s.btn(COLORS.info)} onClick={() => setModal('addMovement')}>+ Add</button>
            <button style={s.btn(COLORS.purple)} onClick={() => setModal('balance')}>⚖️ Balance</button>
          </div>
        </div>

        {/* Lost/Broken Summary */}
        {(stats.lost > 0 || stats.broken > 0) && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <div style={{ background: '#FFF7ED', padding: '4px 12px', borderRadius: 4, fontSize: 10 }}>
              ❌ Lost: <strong style={{ color: COLORS.lost }}>{stats.lost}</strong>
            </div>
            <div style={{ background: '#F3E8FF', padding: '4px 12px', borderRadius: 4, fontSize: 10 }}>
              💔 Broken: <strong style={{ color: COLORS.broken }}>{stats.broken}</strong>
            </div>
          </div>
        )}

        <table style={s.tbl}>
          <thead>
            <tr>
              <th style={s.th}>Date</th>
              <th style={s.th}>Type</th>
              <th style={s.th}>Location</th>
              <th style={s.th}>Code</th>
              <th style={s.th}>Qty</th>
              <th style={s.th}>Note</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 100).map(m => (
              <tr key={m.id} style={{ background: m.type === 'LOST' ? '#FFF7ED' : m.type === 'BROKEN' ? '#F3E8FF' : 'transparent' }}>
                <td style={s.td}>{formatDateTime(m.date)}</td>
                <td style={s.td}>
                  <span style={{ 
                    padding: '2px 6px', 
                    borderRadius: 4, 
                    fontSize: 9, 
                    background: m.type === 'IN' ? '#dcfce7' : 
                               m.type === 'OUT' ? '#fee2e2' : 
                               m.type === 'TRF' ? '#dbeafe' :
                               m.type === 'LOST' ? '#FFF7ED' :
                               m.type === 'BROKEN' ? '#F3E8FF' : '#f3f4f6',
                    color: m.type === 'LOST' ? COLORS.lost : m.type === 'BROKEN' ? COLORS.broken : '#000'
                  }}>{m.type}</span>
                </td>
                <td style={s.td}>{m.loc}</td>
                <td style={s.td}>{m.code}</td>
                <td style={{ ...s.td, color: m.qty < 0 ? COLORS.red : COLORS.success }}>{m.qty}</td>
                <td style={s.td}>{m.note || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // NEW REQUEST
  const renderNewRequest = () => (
    <div style={s.box}>
      <div style={{ fontWeight: 'bold', marginBottom: 12, color: COLORS.primary }}>📝 NEW REQUEST #{counter}</div>
      
      {/* Header Form */}
      <div style={s.labelRow}>
        <div style={s.labelBox}>
          <div style={s.label}>Name *</div>
          <input style={s.inp} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Requester name" />
        </div>
        <div style={s.labelBox}>
          <div style={s.label}>Badge *</div>
          <input style={s.inp} value={form.badge} onChange={e => setForm({ ...form, badge: e.target.value })} placeholder="Badge #" />
        </div>
      </div>
      <div style={s.labelRow}>
        <div style={s.labelBox}>
          <div style={s.label}>ISO *</div>
          <input style={s.inp} value={form.iso} onChange={e => setForm({ ...form, iso: e.target.value })} placeholder="ISO-XXX" />
        </div>
        <div style={s.labelBox}>
          <div style={s.label}>Spool *</div>
          <input style={s.inp} value={form.spool} onChange={e => setForm({ ...form, spool: e.target.value })} placeholder="SP-XXX" />
        </div>
      </div>
      <div style={s.labelRow}>
        <div style={s.labelBox}>
          <div style={s.label}>HF (Erection only)</div>
          <input style={s.inp} value={form.hf} onChange={e => setForm({ ...form, hf: e.target.value })} placeholder="HF-XXX" />
        </div>
        <div style={s.labelBox}>
          <div style={s.label}>Category</div>
          <select style={s.inp} value={form.cat} onChange={e => setForm({ ...form, cat: e.target.value })}>
            <option>Bulk</option>
            <option>Erection</option>
            <option>Support</option>
          </select>
        </div>
      </div>

      {/* Add Items */}
      <div style={{ background: '#f9fafb', padding: 10, borderRadius: 4, marginBottom: 12 }}>
        <div style={{ fontWeight: 'bold', marginBottom: 8, fontSize: 10 }}>➕ Add Materials</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select style={{ ...s.inp, flex: 2 }} value={itemForm.code} onChange={e => setItemForm({ ...itemForm, code: e.target.value })}>
            <option value="">-- Select Code --</option>
            {Object.keys(materials).map(k => <option key={k} value={k}>{k} - {materials[k]}</option>)}
          </select>
          <input style={{ ...s.inp, flex: 1 }} type="number" value={itemForm.qty} onChange={e => setItemForm({ ...itemForm, qty: e.target.value })} placeholder="Qty" />
          <button style={s.btn(COLORS.success)} onClick={addItemToRequest}>+ Add</button>
        </div>
      </div>

      {/* Items List */}
      {requestItems.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 'bold', marginBottom: 6, fontSize: 10 }}>📦 Items ({requestItems.length})</div>
          <table style={s.tbl}>
            <thead>
              <tr>
                <th style={s.th}>Code</th>
                <th style={s.th}>Description</th>
                <th style={s.th}>Qty</th>
                <th style={s.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {requestItems.map(item => (
                <tr key={item.id}>
                  <td style={s.td}>{item.code}</td>
                  <td style={s.td}>{item.desc}</td>
                  <td style={s.td}>{item.qty}</td>
                  <td style={s.td}>
                    <button style={s.btn(COLORS.red)} onClick={() => setRequestItems(requestItems.filter(i => i.id !== item.id))}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Submit Buttons */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button style={s.btn(COLORS.site)} onClick={() => submitRequest('Site')}>📤 Send to SITE</button>
        <button style={s.btn(COLORS.yellow)} onClick={() => submitRequest('Yard')}>📤 Send to YARD</button>
        <button style={s.btn(COLORS.purple)} onClick={() => submitRequest('Eng')}>📤 Send to ENGINEERING</button>
      </div>
    </div>
  );

  // MIR
  const renderMir = () => (
    <div>
      <div style={s.box}>
        <div style={{ fontWeight: 'bold', marginBottom: 8 }}>➕ New MIR</div>
        <div style={s.labelRow}>
          <div style={s.labelBox}>
            <div style={s.label}>MIR Number *</div>
            <input style={s.inp} value={mirForm.mir} onChange={e => setMirForm({ ...mirForm, mir: e.target.value })} placeholder="MRS2145" />
          </div>
          <div style={s.labelBox}>
            <div style={s.label}>RK *</div>
            <input style={s.inp} value={mirForm.rk} onChange={e => setMirForm({ ...mirForm, rk: e.target.value })} placeholder="RK0020_1123" />
          </div>
        </div>
        <div style={s.labelRow}>
          <div style={s.labelBox}>
            <div style={s.label}>Forecast Date *</div>
            <input style={s.inp} type="date" value={mirForm.forecast} onChange={e => setMirForm({ ...mirForm, forecast: e.target.value })} />
          </div>
          <div style={s.labelBox}>
            <div style={s.label}>Priority</div>
            <select style={s.inp} value={mirForm.priority} onChange={e => setMirForm({ ...mirForm, priority: e.target.value })}>
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
          </div>
        </div>
        <button style={s.btn(COLORS.success)} onClick={createMir}>+ CREATE MIR</button>
      </div>

      <div style={s.box}>
        <div style={{ fontWeight: 'bold', marginBottom: 8 }}>📋 MIR List</div>
        <table style={s.tbl}>
          <thead>
            <tr>
              <th style={s.th}>MIR</th>
              <th style={s.th}>RK</th>
              <th style={s.th}>Date</th>
              <th style={s.th}>Forecast</th>
              <th style={s.th}>Priority</th>
              <th style={s.th}>Status</th>
              <th style={s.th}>Action</th>
            </tr>
          </thead>
          <tbody>
            {mirs.map(m => (
              <tr key={m.id}>
                <td style={s.td}><strong>{m.mir}</strong></td>
                <td style={s.td}>{m.rk}</td>
                <td style={s.td}>{formatDate(m.date)}</td>
                <td style={s.td}>{formatDate(m.forecast)}</td>
                <td style={s.td}>
                  <span style={{ 
                    padding: '2px 6px', 
                    borderRadius: 4, 
                    fontSize: 9, 
                    background: m.priority === 'High' ? '#fee2e2' : m.priority === 'Medium' ? '#fef3c7' : '#dcfce7'
                  }}>{m.priority}</span>
                </td>
                <td style={s.td}>
                  <span style={{ 
                    padding: '2px 6px', 
                    borderRadius: 4, 
                    fontSize: 9, 
                    background: m.st === 'Done' ? '#dcfce7' : '#fee2e2'
                  }}>{m.st}</span>
                </td>
                <td style={s.td}>
                  {m.st !== 'Done' && <button style={s.btn(COLORS.success)} onClick={() => completeMir(m.id)}>✓ Done</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // MATERIAL IN
  const renderMaterialIn = () => (
    <div style={s.box}>
      <div style={{ fontWeight: 'bold', marginBottom: 8, color: COLORS.success }}>📥 LOAD MATERIAL TO YARD</div>
      <div style={s.labelRow}>
        <div style={s.labelBox}>
          <div style={s.label}>Material Code *</div>
          <select style={s.inp} value={loadForm.code} onChange={e => setLoadForm({ ...loadForm, code: e.target.value })}>
            <option value="">-- Select --</option>
            {Object.keys(materials).map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <div style={s.labelBox}>
          <div style={s.label}>Quantity *</div>
          <input style={s.inp} type="number" value={loadForm.qty} onChange={e => setLoadForm({ ...loadForm, qty: e.target.value })} placeholder="Qty" />
        </div>
      </div>
      <div style={s.labelRow}>
        <div style={s.labelBox}>
          <div style={s.label}>MIR (optional)</div>
          <select style={s.inp} value={loadForm.mir} onChange={e => setLoadForm({ ...loadForm, mir: e.target.value })}>
            <option value="">-- Manual --</option>
            {mirs.filter(m => m.st !== 'Done').map(m => <option key={m.id} value={m.mir}>{m.mir}</option>)}
          </select>
        </div>
        <div style={s.labelBox}>
          <div style={s.label}>RK (optional)</div>
          <input style={s.inp} value={loadForm.rk} onChange={e => setLoadForm({ ...loadForm, rk: e.target.value })} placeholder="RK..." />
        </div>
      </div>
      <button style={s.btn(COLORS.success)} onClick={loadMaterial}>📥 LOAD</button>
    </div>
  );

  // STATUS
  const renderStatus = () => {
    const filtered = requests.filter(r => {
      if (statusFilters.name && !r.name?.toLowerCase().includes(statusFilters.name.toLowerCase())) return false;
      if (statusFilters.num && !formatReqNum(r.num, r.sub).includes(statusFilters.num)) return false;
      if (statusFilters.code && !r.comp.some(c => c.code?.toLowerCase().includes(statusFilters.code.toLowerCase()))) return false;
      if (statusFilters.hf && r.hf && !r.hf.toLowerCase().includes(statusFilters.hf.toLowerCase())) return false;
      return true;
    });

    return (
      <div style={s.box}>
        <div style={{ fontWeight: 'bold', marginBottom: 8 }}>🔍 STATUS SEARCH</div>
        <div style={s.labelRow}>
          <input style={s.inp} placeholder="Name" value={statusFilters.name} onChange={e => setStatusFilters({ ...statusFilters, name: e.target.value })} />
          <input style={s.inp} placeholder="Req #" value={statusFilters.num} onChange={e => setStatusFilters({ ...statusFilters, num: e.target.value })} />
          <input style={s.inp} placeholder="Code" value={statusFilters.code} onChange={e => setStatusFilters({ ...statusFilters, code: e.target.value })} />
          <input style={s.inp} placeholder="HF" value={statusFilters.hf} onChange={e => setStatusFilters({ ...statusFilters, hf: e.target.value })} />
          <button style={s.btn(COLORS.gray)} onClick={() => setStatusFilters({ name: '', num: '', code: '', hf: '' })}>Reset</button>
        </div>
        <table style={s.tbl}>
          <thead>
            <tr>
              <th style={s.th}>Req #</th>
              <th style={s.th}>Date</th>
              <th style={s.th}>Name</th>
              <th style={s.th}>ISO/Spool</th>
              <th style={s.th}>Code</th>
              <th style={s.th}>Qty</th>
              <th style={s.th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 50).flatMap(r => r.comp.map(c => (
              <tr key={`${r.id}-${c.id}`}>
                <td style={s.td}><strong>{formatReqNum(r.num, r.sub)}</strong></td>
                <td style={s.td}>{formatDate(r.date)}</td>
                <td style={s.td}>{r.name}</td>
                <td style={s.td}>{r.iso}/{r.spool}</td>
                <td style={s.td}>{c.code}</td>
                <td style={s.td}>{c.qty}</td>
                <td style={s.td}>
                  <span style={{ 
                    padding: '2px 6px', 
                    borderRadius: 4, 
                    fontSize: 9, 
                    fontWeight: 'bold',
                    background: c.st === 'Done' ? '#dcfce7' : c.st === 'Out' ? '#dbeafe' : '#f3f4f6',
                    color: c.st === 'Done' ? COLORS.success : c.st === 'Out' ? COLORS.info : '#000'
                  }}>{c.st}</span>
                </td>
              </tr>
            )))}
          </tbody>
        </table>
      </div>
    );
  };

  // DELIVERED
  const renderDelivered = () => (
    <div style={s.box}>
      <div style={{ fontWeight: 'bold', marginBottom: 8, color: COLORS.success }}>✅ DELIVERED ({delivered.length})</div>
      <table style={s.tbl}>
        <thead>
          <tr>
            <th style={s.th}>Date</th>
            <th style={s.th}>Req #</th>
            <th style={s.th}>Name</th>
            <th style={s.th}>Code</th>
            <th style={s.th}>Qty</th>
          </tr>
        </thead>
        <tbody>
          {delivered.slice(0, 50).map(d => (
            <tr key={d.id}>
              <td style={s.td}>{formatDateTime(d.delivered_date)}</td>
              <td style={s.td}><strong>{d.request_number}</strong></td>
              <td style={s.td}>{d.requester}</td>
              <td style={s.td}>{d.material_code}</td>
              <td style={s.td}>{d.quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // ============================================================
  // MODALS
  // ============================================================
  const renderModals = () => (
    <>
      {/* PARTIAL SPLIT (PT) MODAL */}
      {modal === 'partial' && (
        <div style={s.modal}>
          <div style={s.modalContent}>
            <h3 style={{ marginTop: 0, color: COLORS.orange, fontSize: 14 }}>📦 Partial Split (PT)</h3>
            <div style={{ background: '#fef3c7', padding: 8, borderRadius: 4, marginBottom: 10, fontSize: 11 }}>
              <strong>Total Requested:</strong> {partialForm.maxQty}
            </div>
            <div style={{ marginBottom: 10 }}>
              <div style={s.label}>Quantity Found *</div>
              <input 
                style={s.inp} 
                type="number" 
                value={partialForm.qtyFound} 
                onChange={e => setPartialForm({ ...partialForm, qtyFound: e.target.value })}
                placeholder="e.g., 3"
                max={partialForm.maxQty - 1}
              />
            </div>
            <div style={{ marginBottom: 10 }}>
              <div style={s.label}>Send Remaining To:</div>
              <select 
                style={s.inp} 
                value={partialForm.destino} 
                onChange={e => setPartialForm({ ...partialForm, destino: e.target.value })}
              >
                {partialForm.destini?.map(d => <option key={d} value={d}>→ {d === 'UT' ? 'Engineering' : d}</option>)}
              </select>
            </div>
            {partialForm.qtyFound && parseInt(partialForm.qtyFound) > 0 && parseInt(partialForm.qtyFound) < partialForm.maxQty && (
              <div style={{ background: '#dcfce7', padding: 8, borderRadius: 4, marginBottom: 10, fontSize: 10 }}>
                <strong>Split Preview:</strong><br/>
                • {partialForm.qtyFound} pcs → {partialForm.page === 'site' ? 'Ready OUT' : partialForm.page === 'yard' ? 'Transfer' : 'OUT'}<br/>
                • {partialForm.maxQty - parseInt(partialForm.qtyFound)} pcs → {partialForm.destino === 'UT' ? 'Engineering' : partialForm.destino}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ ...s.btn(COLORS.orange), flex: 1 }} onClick={executePartialSplit}>SPLIT</button>
              <button style={{ ...s.btn(COLORS.gray), flex: 1 }} onClick={() => setModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {modal === 'deleteConfirm' && deleteConfirm && (
        <div style={s.modal}>
          <div style={s.modalContent}>
            <h3 style={{ marginTop: 0, color: COLORS.red, fontSize: 14 }}>⚠️ Confirm Delete</h3>
            <div style={{ background: '#fee2e2', padding: 10, borderRadius: 4, marginBottom: 12, fontSize: 11 }}>
              <strong>Request:</strong> #{formatReqNum(deleteConfirm.req.num, deleteConfirm.req.sub)}<br/>
              <strong>Code:</strong> {deleteConfirm.comp.code}<br/>
              <strong>Qty:</strong> {deleteConfirm.comp.qty}
            </div>
            <p style={{ fontSize: 11, marginBottom: 12 }}>Are you sure you want to delete this component? This action cannot be undone.</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ ...s.btn(COLORS.red), flex: 1 }} onClick={executeDelete}>🗑️ DELETE</button>
              <button style={{ ...s.btn(COLORS.gray), flex: 1 }} onClick={() => { setModal(null); setDeleteConfirm(null); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* TECH NOTE MODAL */}
      {modal === 'techNote' && (
        <div style={s.modal}>
          <div style={s.modalContent}>
            <h3 style={{ marginTop: 0, color: COLORS.purple, fontSize: 14 }}>🔍 Send Check Request</h3>
            <div style={{ marginBottom: 10 }}>
              <div style={s.label}>Note / What to Check *</div>
              <textarea 
                style={{ ...s.inp, height: 80, resize: 'none' }} 
                value={techNote.note} 
                onChange={e => setTechNote({ ...techNote, note: e.target.value })}
                placeholder="Describe what to verify..."
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={s.label}>Send To:</div>
              <select style={s.inp} value={techNote.to} onChange={e => setTechNote({ ...techNote, to: e.target.value })}>
                <option value="Site">→ SITE Warehouse</option>
                <option value="Yard">→ YARD Warehouse</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ ...s.btn(COLORS.purple), flex: 1 }} onClick={sendTechNote}>📤 SEND</button>
              <button style={{ ...s.btn(COLORS.gray), flex: 1 }} onClick={() => setModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* CHECK RESPONSE MODAL */}
      {modal?.type === 'checkResp' && (
        <div style={s.modal}>
          <div style={s.modalContent}>
            <h3 style={{ marginTop: 0, color: COLORS.purple, fontSize: 14 }}>📩 Engineering Check</h3>
            <div style={{ background: '#f3e8ff', padding: 10, borderRadius: 4, marginBottom: 12, fontSize: 11 }}>
              <strong>Note:</strong> {modal.comp.utNote || 'No note'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button style={s.btn(COLORS.success)} onClick={() => respondToCheck(modal.req, modal.comp, 'ok')}>✓ Resolved - Ready OUT</button>
              <button style={s.btn(COLORS.orange)} onClick={() => respondToCheck(modal.req, modal.comp, 'no')}>✗ Not Found - Back to Eng</button>
              <button style={s.btn(COLORS.info)} onClick={() => respondToCheck(modal.req, modal.comp, 'other')}>↔ Resolved by Other WH</button>
              <button style={s.btn(COLORS.gray)} onClick={() => setModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* PURCHASE MODAL */}
      {modal === 'purchase' && (
        <div style={s.modal}>
          <div style={s.modalContent}>
            <h3 style={{ marginTop: 0, color: COLORS.info, fontSize: 14 }}>🛒 Confirm Purchase</h3>
            <div style={{ marginBottom: 10 }}>
              <div style={s.label}>Quantity *</div>
              <input 
                style={s.inp} 
                type="number" 
                value={purchaseForm.qty} 
                onChange={e => setPurchaseForm({ ...purchaseForm, qty: e.target.value })}
              />
            </div>
            <div style={{ marginBottom: 10 }}>
              <div style={s.label}>Order Date *</div>
              <input 
                style={s.inp} 
                type="date" 
                value={purchaseForm.orderDate} 
                onChange={e => setPurchaseForm({ ...purchaseForm, orderDate: e.target.value })}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={s.label}>Forecast Arrival</div>
              <input 
                style={s.inp} 
                type="date" 
                value={purchaseForm.forecast} 
                onChange={e => setPurchaseForm({ ...purchaseForm, forecast: e.target.value })}
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ ...s.btn(COLORS.success), flex: 1 }} onClick={confirmPurchase}>CONFIRM</button>
              <button style={{ ...s.btn(COLORS.gray), flex: 1 }} onClick={() => setModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ADD MOVEMENT MODAL */}
      {modal === 'addMovement' && (
        <div style={s.modal}>
          <div style={s.modalContent}>
            <h3 style={{ marginTop: 0, color: COLORS.info, fontSize: 14 }}>➕ Add Movement</h3>
            <div style={{ marginBottom: 10 }}>
              <div style={s.label}>Material Code *</div>
              <select style={s.inp} value={movementForm.code} onChange={e => setMovementForm({ ...movementForm, code: e.target.value })}>
                <option value="">-- Select --</option>
                {Object.keys(materials).map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 10 }}>
              <div style={s.label}>Quantity *</div>
              <input 
                style={s.inp} 
                type="number" 
                value={movementForm.qty} 
                onChange={e => setMovementForm({ ...movementForm, qty: e.target.value })}
                placeholder="Quantity"
              />
            </div>
            <div style={{ marginBottom: 10 }}>
              <div style={s.label}>Location</div>
              <select style={s.inp} value={movementForm.loc} onChange={e => setMovementForm({ ...movementForm, loc: e.target.value })}>
                <option value="YARD">YARD</option>
                <option value="SITE">SITE</option>
              </select>
            </div>
            <div style={{ marginBottom: 10 }}>
              <div style={s.label}>Type</div>
              <select style={s.inp} value={movementForm.type} onChange={e => setMovementForm({ ...movementForm, type: e.target.value })}>
                <option value="LOST">❌ LOST (Subtract)</option>
                <option value="BROKEN">💔 BROKEN (Subtract)</option>
                <option value="IN">📥 IN (Add)</option>
                <option value="OUT">📤 OUT (Subtract)</option>
                <option value="BAL">⚖️ BALANCE (Adjustment)</option>
              </select>
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={s.label}>Note</div>
              <input 
                style={s.inp} 
                value={movementForm.note} 
                onChange={e => setMovementForm({ ...movementForm, note: e.target.value })}
                placeholder="Optional note..."
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ ...s.btn(COLORS.info), flex: 1 }} onClick={addManualMovement}>ADD</button>
              <button style={{ ...s.btn(COLORS.gray), flex: 1 }} onClick={() => setModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* BALANCE MODAL */}
      {modal === 'balance' && (
        <div style={s.modal}>
          <div style={s.modalContent}>
            <h3 style={{ marginTop: 0, color: COLORS.purple, fontSize: 14 }}>⚖️ Inventory Balance</h3>
            <div style={{ marginBottom: 10 }}>
              <div style={s.label}>Material Code *</div>
              <select style={s.inp} value={balanceForm.code} onChange={e => setBalanceForm({ ...balanceForm, code: e.target.value })}>
                <option value="">-- Select --</option>
                {Object.keys(materials).map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 10 }}>
              <div style={s.label}>Adjustment (+/-) *</div>
              <input 
                style={s.inp} 
                type="number" 
                value={balanceForm.qty} 
                onChange={e => setBalanceForm({ ...balanceForm, qty: e.target.value })}
                placeholder="+10 or -5"
              />
            </div>
            <div style={{ marginBottom: 10 }}>
              <div style={s.label}>Location</div>
              <select style={s.inp} value={balanceForm.loc} onChange={e => setBalanceForm({ ...balanceForm, loc: e.target.value })}>
                <option value="YARD">YARD</option>
                <option value="SITE">SITE</option>
              </select>
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={s.label}>Note</div>
              <input 
                style={s.inp} 
                value={balanceForm.note} 
                onChange={e => setBalanceForm({ ...balanceForm, note: e.target.value })}
                placeholder="Reason for adjustment..."
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ ...s.btn(COLORS.purple), flex: 1 }} onClick={async () => {
                if (!balanceForm.code || !balanceForm.qty) return alert('Fill required fields');
                await updateInventory(balanceForm.code, balanceForm.loc.toLowerCase(), parseInt(balanceForm.qty));
                await addMovement('BAL', balanceForm.loc, balanceForm.code, parseInt(balanceForm.qty), balanceForm.note || 'Manual balance');
                setModal(null);
                setBalanceForm({ code: '', qty: '', loc: 'YARD', balType: 'Adjustment', note: '', name: '', badge: '' });
              }}>APPLY</button>
              <button style={{ ...s.btn(COLORS.gray), flex: 1 }} onClick={() => setModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  // ============================================================
  // NAVIGATION MENU
  // ============================================================
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', count: 0 },
    { id: 'newRequest', label: 'New Request', icon: '📝', count: 0 },
    { id: 'whSite', label: 'WH Site', icon: '🏭', count: stats.site },
    { id: 'whYard', label: 'WH Yard', icon: '🏗️', count: stats.yard },
    { id: 'siteIn', label: 'Site IN', icon: '🚚', count: stats.trans },
    { id: 'readyOut', label: 'Ready OUT', icon: '📤', count: stats.out },
    { id: 'engineering', label: 'Engineering', icon: '🔧', count: stats.eng },
    { id: 'spare', label: 'Spare Parts', icon: '⭐', count: stats.spare },
    { id: 'management', label: 'Management', icon: '👔', count: stats.mng },
    { id: 'orders', label: 'Orders', icon: '🛒', count: stats.order + stats.ordered },
    { id: 'mir', label: 'MIR', icon: '📋', count: stats.mirP },
    { id: 'materialIn', label: 'Material IN', icon: '📥', count: 0 },
    { id: 'movements', label: 'Movements', icon: '📜', count: 0 },
    { id: 'status', label: 'Status', icon: '🔍', count: 0 },
    { id: 'delivered', label: 'Delivered', icon: '✅', count: delivered.length }
  ];

  // ============================================================
  // MAIN RENDER
  // ============================================================
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: COLORS.background }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>⏳</div>
          <div>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: COLORS.background, fontFamily: 'Arial, sans-serif', fontSize: 11 }}>
      {/* HEADER */}
      <div style={{ 
        background: `linear-gradient(135deg, ${COLORS.primary} 0%, #B91C1C 100%)`, 
        color: '#fff', 
        padding: '10px 16px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* STREICHER LOGO - Full text, not just "S" */}
          <div style={{ 
            background: '#fff', 
            padding: '4px 12px', 
            borderRadius: 4, 
            color: COLORS.primary, 
            fontWeight: 'bold',
            fontSize: 14,
            letterSpacing: 1
          }}>
            STREICHER
          </div>
          <span style={{ fontSize: 14, fontWeight: 'bold' }}>Materials Manager</span>
          <span style={{ fontSize: 10, opacity: 0.8 }}>V25</span>
        </div>
        <div style={{ fontSize: 10 }}>
          {new Date().toLocaleDateString('it-IT')} | {new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      {/* MAIN LAYOUT */}
      <div style={{ display: 'flex' }}>
        {/* SIDEBAR */}
        <div style={{ 
          width: 140, 
          background: '#1F2937', 
          minHeight: 'calc(100vh - 45px)',
          boxShadow: '2px 0 4px rgba(0,0,0,0.1)'
        }}>
          {menuItems.map(item => (
            <div 
              key={item.id}
              onClick={() => { setView(item.id); setSearch(''); setMovSearch(''); }}
              style={{ 
                padding: '10px 12px', 
                cursor: 'pointer', 
                borderBottom: '1px solid #374151',
                background: view === item.id ? COLORS.primary : 'transparent',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                transition: 'background 0.2s'
              }}
            >
              <span style={{ color: '#fff', fontSize: 10 }}>{item.icon} {item.label}</span>
              {item.count > 0 && (
                <span style={{ 
                  background: view === item.id ? '#fff' : COLORS.primary, 
                  color: view === item.id ? COLORS.primary : '#fff',
                  padding: '2px 6px', 
                  borderRadius: 10, 
                  fontSize: 9,
                  fontWeight: 'bold'
                }}>{item.count}</span>
              )}
            </div>
          ))}
        </div>

        {/* CONTENT */}
        <div style={{ flex: 1, padding: 12, overflow: 'auto', maxHeight: 'calc(100vh - 45px)' }}>
          {view === 'dashboard' && renderDashboard()}
          {view === 'newRequest' && renderNewRequest()}
          {view === 'whSite' && renderWarehouse('Site')}
          {view === 'whYard' && renderWarehouse('Yard')}
          {view === 'siteIn' && renderSiteIn()}
          {view === 'readyOut' && renderReadyOut()}
          {view === 'engineering' && renderEngineering()}
          {view === 'spare' && renderSpare()}
          {view === 'management' && renderManagement()}
          {view === 'orders' && renderOrders()}
          {view === 'mir' && renderMir()}
          {view === 'materialIn' && renderMaterialIn()}
          {view === 'movements' && renderMovements()}
          {view === 'status' && renderStatus()}
          {view === 'delivered' && renderDelivered()}
        </div>
      </div>

      {/* MODALS */}
      {renderModals()}
    </div>
  );
}
