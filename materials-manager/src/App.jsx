// ============================================================
// MATERIALS MANAGER V25 - STREICHER EDITION - COMPLETE
// ============================================================
// Full implementation with all action buttons and split functionality
// ============================================================

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// ============================================================
// SUPABASE CLIENT CONFIGURATION
// ============================================================
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';
const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================================
// COLORS - Extended palette
// ============================================================
const COLORS = {
  primary: '#E31E24',
  primaryDark: '#B91C1C',
  primaryLight: '#FEE2E2',
  secondary: '#1F2937',
  accent: '#374151',
  white: '#FFFFFF',
  light: '#F9FAFB',
  border: '#E5E7EB',
  success: '#16a34a',
  warning: '#D97706',
  info: '#2563EB',
  purple: '#7C3AED',
  pink: '#EC4899',
  cyan: '#0891B2',
  yellow: '#EAB308',
  orange: '#EA580C',
  gray: '#6B7280'
};

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function MaterialsManager() {
  const [view, setView] = useState('dashboard');
  const [modal, setModal] = useState(null);
  const [modalData, setModalData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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

  const [form, setForm] = useState({ name: '', badge: '', iso: '', spool: '', hf: '', cat: 'Bulk' });
  const [itemForm, setItemForm] = useState({ code: '', qty: '' });
  const [requestItems, setRequestItems] = useState([]);
  const [mirForm, setMirForm] = useState({ mir: '', rk: '', forecast: '', priority: 'Medium' });
  const [loadForm, setLoadForm] = useState({ code: '', qty: '', mir: '', rk: '' });
  const [balanceForm, setBalanceForm] = useState({ code: '', qty: '', loc: 'YARD', balType: 'Adjustment', note: '', name: '', badge: '' });

  // Split form state
  const [splitForm, setSplitForm] = useState({ qtyFound: '', remainderDest: 'Yard' });
  // Note form state
  const [noteForm, setNoteForm] = useState({ text: '', dest: 'Site' });
  // Movement form state
  const [movementForm, setMovementForm] = useState({ type: 'Lost', code: '', qty: '', loc: 'YARD', note: '', name: '', badge: '' });

  const [search, setSearch] = useState('');
  const [movSearch, setMovSearch] = useState('');
  const [statusFilters, setStatusFilters] = useState({ name: '', num: '', code: '', hf: '' });
  const [ordersTab, setOrdersTab] = useState('toOrder');

  const [dbUnlocked, setDbUnlocked] = useState(false);
  const [pwdInput, setPwdInput] = useState('');
  const [editCell, setEditCell] = useState(null);
  const [editVal, setEditVal] = useState('');
  const [editReason, setEditReason] = useState('');

  useEffect(() => { loadAllData(); }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const { data: matData } = await supabase.from('materials').select('*').eq('is_active', true);
      if (matData) {
        const matObj = {};
        matData.forEach(m => { matObj[m.code] = m.description; });
        setMaterials(matObj);
      }

      const { data: invData } = await supabase.from('inventory').select('*');
      if (invData) {
        const inv = { yard: {}, site: {}, inTransit: {} };
        invData.forEach(i => {
          const loc = i.location.toLowerCase();
          if (loc === 'intransit') inv.inTransit[i.code] = i.quantity;
          else if (inv[loc]) inv[loc][i.code] = i.quantity;
        });
        setInventory(inv);
      }

      const { data: reqData } = await supabase.from('requests').select(`*, request_components (*)`).order('created_at', { ascending: false });
      if (reqData) {
        const formattedRequests = reqData.map(r => ({
          id: r.id, num: r.request_number, sub: r.sub_number, name: r.requester_name,
          badge: r.requester_badge, iso: r.iso, spool: r.spool, hf: r.hf_number,
          cat: r.category, date: r.created_at,
          comp: r.request_components.map(c => ({
            id: c.id, code: c.code, desc: c.description, qty: c.quantity, st: c.status,
            sentTo: c.sent_to, engCat: c.eng_category, engNote: c.eng_note, mngNote: c.mng_note,
            mngDate: c.mng_date, orderType: c.order_type, orderDate: c.order_date,
            purchaseQty: c.purchase_qty, purchaseForecast: c.purchase_forecast,
            spareDate: c.spare_date, techNote: c.tech_note, checkResponse: c.check_response
          }))
        }));
        setRequests(formattedRequests);
      }

      const { data: movData } = await supabase.from('movements').select('*').order('movement_date', { ascending: false });
      if (movData) {
        setMovements(movData.map(m => ({
          id: m.id, d: m.movement_date, type: m.type, loc: m.location, code: m.code,
          qty: m.quantity, note: m.note, balType: m.balance_type, ref: m.reference,
          mir: m.mir_number, rk: m.rk_number
        })));
      }

      const { data: mirData } = await supabase.from('mirs').select('*').order('created_at', { ascending: false });
      if (mirData) {
        setMirs(mirData.map(m => ({
          id: m.id, mir: m.mir_number, rk: m.rk_number, status: m.status,
          forecast: m.forecast_date, priority: m.priority, created: m.created_at
        })));
      }

      const { data: dbData } = await supabase.from('project_db').select('*').order('code');
      if (dbData) {
        setProjectDb(dbData.map(p => ({
          id: p.id, code: p.code, desc: p.description,
          project: p.qty_project || 0, ten: p.qty_ten || 0, out: p.qty_out || 0
        })));
      }

      const { data: logData } = await supabase.from('db_log').select('*').order('changed_at', { ascending: false });
      if (logData) {
        setDbLog(logData.map(l => ({
          id: l.id, code: l.code, field: l.field, old: l.old_value, new: l.new_value,
          reason: l.reason, user: l.changed_by, date: l.changed_at
        })));
      }

      const { data: readyData } = await supabase.from('ready_out').select('*');
      if (readyData) {
        setReadyOut(readyData.map(r => ({
          id: r.id, reqId: r.request_id, compId: r.component_id, reqNum: r.request_number,
          name: r.requester_name, badge: r.requester_badge, iso: r.iso, spool: r.spool,
          hf: r.hf_number, code: r.code, desc: r.description, qty: r.quantity, loc: r.location
        })));
      }

      const { data: delData } = await supabase.from('delivered').select('*').order('delivered_at', { ascending: false });
      if (delData) {
        setDelivered(delData.map(d => ({
          id: d.id, reqNum: d.request_number, name: d.requester_name, badge: d.requester_badge,
          iso: d.iso, spool: d.spool, code: d.code, desc: d.description, qty: d.quantity, date: d.delivered_at
        })));
      }

      const { data: ordData } = await supabase.from('order_log').select('*').order('created_at', { ascending: false });
      if (ordData) {
        setOrderLog(ordData.map(o => ({
          id: o.id, reqNum: o.request_number, code: o.code, desc: o.description, qty: o.quantity,
          orderType: o.order_type, orderDate: o.order_date, forecast: o.forecast_date,
          status: o.status, arrivedDate: o.arrived_date
        })));
      }

      const { data: cntData } = await supabase.from('counters').select('*').eq('id', 'request_number').single();
      if (cntData) setCounter(cntData.value);
    } catch (err) {
      setError('Error loading data: ' + err.message);
      console.error(err);
    }
    setLoading(false);
  };

  const now = () => new Date().toISOString();
  const formatDate = (d) => d ? new Date(d).toLocaleDateString() : '';
  const formatDateTime = (d) => d ? new Date(d).toLocaleString() : '';
  const formatReqNum = (n, s) => `${n}-${s}`;

  const updateInventory = async (code, location, quantity) => {
    const loc = location.toUpperCase();
    await supabase.from('inventory').upsert({ code, location: loc, quantity, last_updated: now() }, { onConflict: 'code,location' });
  };

  const addMovement = async (movement) => {
    await supabase.from('movements').insert({
      movement_date: movement.d || now(), type: movement.type, location: movement.loc,
      code: movement.code, quantity: movement.qty, note: movement.note,
      balance_type: movement.balType, reference: movement.ref, mir_number: movement.mir, rk_number: movement.rk
    });
  };

  const getNextRequestNumber = async () => {
    const { data, error } = await supabase.rpc('get_next_request_number');
    if (error) { console.error('Counter error:', error); return counter + 1; }
    setCounter(data);
    return data;
  };

  // Get next sub number for a given request number
  const getNextSubNumber = (reqNum) => {
    const existingSubs = requests.filter(r => r.num === reqNum).map(r => r.sub);
    return existingSubs.length > 0 ? Math.max(...existingSubs) + 1 : 1;
  };

  const addItemToRequest = () => {
    if (!itemForm.code || !itemForm.qty || +itemForm.qty <= 0) return alert('Select code and enter valid quantity');
    const desc = materials[itemForm.code] || itemForm.code;
    setRequestItems([...requestItems, { id: Date.now(), code: itemForm.code, desc, qty: +itemForm.qty }]);
    setItemForm({ code: '', qty: '' });
  };

  const removeItemFromRequest = (itemId) => {
    setRequestItems(requestItems.filter(i => i.id !== itemId));
  };

  const submitRequest = async (destination) => {
    if (!form.name || !form.badge || !form.iso || !form.spool) return alert('Fill all required fields');
    if (form.cat === 'Erection' && !form.hf) return alert('HF Number is required for Erection');
    if (requestItems.length === 0) return alert('Add at least one material');

    if (form.hf) {
      const existingHF = requests.find(r => r.hf === form.hf);
      if (existingHF) {
        const conf = window.confirm(`⚠️ HF ${form.hf} already used by ${existingHF.name}. Continue anyway?`);
        if (!conf) return;
      }
    }

    setLoading(true);
    try {
      const reqNum = await getNextRequestNumber();
      const status = destination === 'Eng' ? 'Eng' : destination;

      const { data: reqData, error: reqError } = await supabase.from('requests').insert({
        request_number: reqNum, sub_number: 1, requester_name: form.name, requester_badge: form.badge,
        iso: form.iso, spool: form.spool, hf_number: form.hf || null, category: form.cat, created_at: now()
      }).select().single();

      if (reqError) throw reqError;

      for (const item of requestItems) {
        await supabase.from('request_components').insert({
          request_id: reqData.id, code: item.code, description: item.desc, quantity: item.qty, status: status
        });
      }

      setForm({ name: '', badge: '', iso: '', spool: '', hf: '', cat: 'Bulk' });
      setRequestItems([]);
      await loadAllData();
      alert(`✅ Request ${reqNum}-1 submitted to ${destination}`);
    } catch (err) {
      setError('Error submitting request: ' + err.message);
    }
    setLoading(false);
  };

  const updateComponentStatus = async (reqId, compId, newStatus, additionalData = {}) => {
    const updates = { status: newStatus, ...additionalData };
    const { error } = await supabase.from('request_components').update(updates).eq('id', compId);
    if (error) { console.error('Component update error:', error); return false; }
    await loadAllData();
    return true;
  };

  // ============================================================
  // SPLIT PARTIAL (PT) FUNCTIONALITY
  // ============================================================
  const openSplitModal = (req, comp, currentLoc) => {
    setModalData({ req, comp, currentLoc });
    setSplitForm({ qtyFound: '', remainderDest: 'Yard' });
    setModal('split');
  };

  const executeSplit = async () => {
    if (!modalData) return;
    const { req, comp, currentLoc } = modalData;
    const qtyFound = +splitForm.qtyFound;
    const qtyRemainder = comp.qty - qtyFound;

    if (qtyFound <= 0 || qtyFound >= comp.qty) {
      return alert('Quantity must be between 1 and ' + (comp.qty - 1));
    }

    setLoading(true);
    try {
      // Update original component with found quantity
      await supabase.from('request_components').update({ quantity: qtyFound }).eq('id', comp.id);

      // Create new request with remainder (same request number, new sub number)
      const newSubNum = getNextSubNumber(req.num);
      
      const { data: newReq, error: reqError } = await supabase.from('requests').insert({
        request_number: req.num, sub_number: newSubNum, requester_name: req.name, requester_badge: req.badge,
        iso: req.iso, spool: req.spool, hf_number: req.hf || null, category: req.cat, created_at: now()
      }).select().single();

      if (reqError) throw reqError;

      // Create component for remainder with destination status
      await supabase.from('request_components').insert({
        request_id: newReq.id, code: comp.code, description: comp.desc, quantity: qtyRemainder,
        status: splitForm.remainderDest === 'Order' ? 'Order' : splitForm.remainderDest
      });

      setModal(null);
      setModalData(null);
      await loadAllData();
      alert(`✅ Split completato!\nOriginale: ${qtyFound} pz → ${currentLoc}\nNuova richiesta ${req.num}-${newSubNum}: ${qtyRemainder} pz → ${splitForm.remainderDest}`);
    } catch (err) {
      setError('Split error: ' + err.message);
    }
    setLoading(false);
  };

  // ============================================================
  // SEND NOTE FUNCTIONALITY
  // ============================================================
  const openNoteModal = (req, comp) => {
    setModalData({ req, comp });
    setNoteForm({ text: '', dest: 'Site' });
    setModal('note');
  };

  const sendNote = async () => {
    if (!modalData || !noteForm.text) return alert('Enter note text');
    const { req, comp } = modalData;

    await updateComponentStatus(req.id, comp.id, noteForm.dest, { 
      tech_note: noteForm.text,
      sent_to: noteForm.dest
    });

    setModal(null);
    setModalData(null);
    alert(`✅ Nota inviata a ${noteForm.dest}`);
  };

  // ============================================================
  // ACTION FUNCTIONS
  // ============================================================
  
  // Send to different destinations
  const sendToDestination = async (req, comp, dest, additionalData = {}) => {
    await updateComponentStatus(req.id, comp.id, dest, additionalData);
  };

  // Delete component (with confirmation)
  const deleteComponent = async (req, comp) => {
    if (!window.confirm(`⚠️ Eliminare ${comp.code} dalla richiesta ${formatReqNum(req.num, req.sub)}?`)) return;
    await supabase.from('request_components').delete().eq('id', comp.id);
    await loadAllData();
    alert('✅ Componente eliminato');
  };

  // Move to Ready OUT
  const moveToOut = async (req, comp, fromLoc = 'Site') => {
    const loc = fromLoc.toUpperCase();
    await supabase.from('ready_out').insert({
      request_id: req.id, component_id: comp.id, request_number: formatReqNum(req.num, req.sub),
      requester_name: req.name, requester_badge: req.badge, iso: req.iso, spool: req.spool,
      hf_number: req.hf, code: comp.code, description: comp.desc, quantity: comp.qty, location: loc
    });
    await updateComponentStatus(req.id, comp.id, 'Out');
  };

  // Deliver material (from Ready OUT)
  const deliverMaterial = async (item) => {
    const currentQty = item.loc === 'SITE' ? (inventory.site[item.code] || 0) : (inventory.yard[item.code] || 0);
    const newQty = currentQty - item.qty;
    await updateInventory(item.code, item.loc, Math.max(0, newQty));
    await addMovement({ type: 'OUT', loc: item.loc, code: item.code, qty: item.qty, note: `Delivered to ${item.name}`, ref: item.reqNum });
    await supabase.from('delivered').insert({
      request_number: item.reqNum, requester_name: item.name, requester_badge: item.badge,
      iso: item.iso, spool: item.spool, code: item.code, description: item.desc, quantity: item.qty, delivered_at: now()
    });
    await supabase.from('request_components').update({ status: 'Done' }).eq('id', item.compId);
    await supabase.from('ready_out').delete().eq('id', item.id);
    const dbItem = projectDb.find(p => p.code === item.code);
    if (dbItem) await supabase.from('project_db').update({ qty_out: dbItem.out + item.qty }).eq('code', item.code);
    await loadAllData();
  };

  // Cancel Ready OUT
  const cancelReadyOut = async (item) => {
    if (!window.confirm('Annullare questa consegna?')) return;
    await supabase.from('request_components').update({ status: 'Site' }).eq('id', item.compId);
    await supabase.from('ready_out').delete().eq('id', item.id);
    await loadAllData();
    alert('✅ Consegna annullata');
  };

  // Transfer from Yard to Site (via Transit)
  const transferToSite = async (req, comp) => {
    const yardQty = inventory.yard[comp.code] || 0;
    if (yardQty < comp.qty) {
      return alert(`⚠️ Quantità insufficiente in Yard (${yardQty} disponibili)`);
    }
    await updateInventory(comp.code, 'YARD', yardQty - comp.qty);
    const transitQty = inventory.inTransit[comp.code] || 0;
    await updateInventory(comp.code, 'INTRANSIT', transitQty + comp.qty);
    await addMovement({ type: 'TRF', loc: 'YARD→TRANSIT', code: comp.code, qty: comp.qty, ref: formatReqNum(req.num, req.sub) });
    await updateComponentStatus(req.id, comp.id, 'Trans');
  };

  // Confirm arrival at Site
  const confirmArrival = async (req, comp) => {
    const transitQty = inventory.inTransit[comp.code] || 0;
    await updateInventory(comp.code, 'INTRANSIT', Math.max(0, transitQty - comp.qty));
    const siteQty = inventory.site[comp.code] || 0;
    await updateInventory(comp.code, 'SITE', siteQty + comp.qty);
    await addMovement({ type: 'TRF', loc: 'TRANSIT→SITE', code: comp.code, qty: comp.qty, ref: formatReqNum(req.num, req.sub) });
    await updateComponentStatus(req.id, comp.id, 'Site');
  };

  // Reject arrival (return to Yard)
  const rejectArrival = async (req, comp) => {
    if (!window.confirm('Rifiutare e ritornare a Yard?')) return;
    const transitQty = inventory.inTransit[comp.code] || 0;
    await updateInventory(comp.code, 'INTRANSIT', Math.max(0, transitQty - comp.qty));
    const yardQty = inventory.yard[comp.code] || 0;
    await updateInventory(comp.code, 'YARD', yardQty + comp.qty);
    await addMovement({ type: 'TRF', loc: 'TRANSIT→YARD', code: comp.code, qty: comp.qty, ref: formatReqNum(req.num, req.sub), note: 'Rejected' });
    await updateComponentStatus(req.id, comp.id, 'Yard');
  };

  // Load material to Yard
  const loadMaterial = async () => {
    if (!loadForm.code || !loadForm.qty || +loadForm.qty <= 0) return alert('Select code and enter quantity');
    const currentQty = inventory.yard[loadForm.code] || 0;
    await updateInventory(loadForm.code, 'YARD', currentQty + +loadForm.qty);
    await addMovement({ type: 'IN', loc: 'YARD', code: loadForm.code, qty: +loadForm.qty, mir: loadForm.mir, rk: loadForm.rk });
    if (loadForm.mir) {
      const mir = mirs.find(m => m.mir === loadForm.mir);
      if (mir) await supabase.from('mirs').update({ status: 'Received' }).eq('mir_number', loadForm.mir);
    }
    setLoadForm({ code: '', qty: '', mir: '', rk: '' });
    await loadAllData();
    alert('✅ Material loaded to YARD');
  };

  // Register balance/movement manually
  const registerBalance = async () => {
    if (!balanceForm.code || !balanceForm.qty || !balanceForm.name || !balanceForm.badge) return alert('Fill all required fields');
    const qty = +balanceForm.qty;
    const loc = balanceForm.loc.toLowerCase();
    const currentQty = loc === 'yard' ? (inventory.yard[balanceForm.code] || 0) : (inventory.site[balanceForm.code] || 0);
    let newQty;
    if (balanceForm.balType === 'Lost' || balanceForm.balType === 'Broken') newQty = Math.max(0, currentQty - qty);
    else newQty = qty;
    await updateInventory(balanceForm.code, balanceForm.loc, newQty);
    await addMovement({ type: 'BAL', loc: balanceForm.loc, code: balanceForm.code, qty: balanceForm.balType === 'Adjustment' ? qty : -qty, balType: balanceForm.balType, note: `${balanceForm.balType}: ${balanceForm.note} (by ${balanceForm.name})` });
    setBalanceForm({ code: '', qty: '', loc: 'YARD', balType: 'Adjustment', note: '', name: '', badge: '' });
    setModal(null);
    await loadAllData();
    alert('✅ Balance registered');
  };

  // Open movement modal
  const openMovementModal = () => {
    setMovementForm({ type: 'Lost', code: '', qty: '', loc: 'YARD', note: '', name: '', badge: '' });
    setModal('movement');
  };

  // Register manual movement
  const registerMovement = async () => {
    if (!movementForm.code || !movementForm.qty || !movementForm.name || !movementForm.badge) {
      return alert('Fill all required fields');
    }
    const qty = +movementForm.qty;
    const loc = movementForm.loc.toLowerCase();
    const currentQty = loc === 'yard' ? (inventory.yard[movementForm.code] || 0) : (inventory.site[movementForm.code] || 0);

    if (movementForm.type === 'Lost' || movementForm.type === 'Broken') {
      if (qty > currentQty) return alert(`Quantity exceeds available (${currentQty})`);
      await updateInventory(movementForm.code, movementForm.loc, currentQty - qty);
    } else if (movementForm.type === 'IN') {
      await updateInventory(movementForm.code, movementForm.loc, currentQty + qty);
    }

    await addMovement({ 
      type: movementForm.type, 
      loc: movementForm.loc, 
      code: movementForm.code, 
      qty: movementForm.type === 'IN' ? qty : -qty, 
      balType: movementForm.type,
      note: `${movementForm.type}: ${movementForm.note} (by ${movementForm.name})`
    });

    setModal(null);
    await loadAllData();
    alert(`✅ Movement registered: ${movementForm.type}`);
  };

  // MIR functions
  const addMIR = async () => {
    if (!mirForm.mir || !mirForm.rk) return alert('Fill MIR and RK numbers');
    await supabase.from('mirs').insert({ mir_number: mirForm.mir, rk_number: mirForm.rk, status: 'Pending', forecast_date: mirForm.forecast || null, priority: mirForm.priority, created_at: now() });
    setMirForm({ mir: '', rk: '', forecast: '', priority: 'Medium' });
    await loadAllData();
    alert('✅ MIR registered');
  };

  // Database functions
  const checkPwd = () => {
    if (pwdInput === 'streicher2024') { setDbUnlocked(true); setPwdInput(''); }
    else alert('❌ Wrong password');
  };

  const startEdit = (code, field, currentValue) => {
    setEditCell({ code, field });
    setEditVal(currentValue?.toString() || '');
    setEditReason('');
  };

  const saveEdit = async () => {
    if (!editReason) return alert('Please enter a reason for the change');
    const item = projectDb.find(p => p.code === editCell.code);
    const oldVal = item[editCell.field];
    const updateField = editCell.field === 'project' ? 'qty_project' : editCell.field === 'ten' ? 'qty_ten' : 'qty_out';
    await supabase.from('project_db').update({ [updateField]: +editVal }).eq('code', editCell.code);
    await supabase.from('db_log').insert({ code: editCell.code, field: editCell.field, old_value: oldVal?.toString(), new_value: editVal, reason: editReason, changed_by: 'User', changed_at: now() });
    setEditCell(null); setEditVal(''); setEditReason('');
    await loadAllData();
  };

  // Order functions
  const markAsOrdered = async (req, comp, orderType) => {
    await updateComponentStatus(req.id, comp.id, 'Ordered', { order_type: orderType, order_date: now() });
    await supabase.from('order_log').insert({ request_number: formatReqNum(req.num, req.sub), code: comp.code, description: comp.desc, quantity: comp.qty, order_type: orderType, order_date: now(), status: 'Pending' });
    await loadAllData();
  };

  const markOrderArrived = async (order) => {
    await supabase.from('order_log').update({ status: 'Arrived', arrived_date: now() }).eq('id', order.id);
    for (const req of requests) {
      for (const comp of req.comp) {
        if (comp.code === order.code && comp.st === 'Ordered') {
          await updateComponentStatus(req.id, comp.id, 'Site');
          break;
        }
      }
    }
    await loadAllData();
  };

  // ============================================================
  // STATS
  // ============================================================
  const getStats = () => {
    const stats = { eng: 0, mng: 0, site: 0, yard: 0, out: 0, trans: 0, order: 0, ordered: 0, spare: 0, done: 0, mirP: 0, lost: 0, broken: 0 };
    requests.forEach(r => {
      r.comp.forEach(c => {
        if (c.st === 'Eng') stats.eng++;
        else if (c.st === 'Mng') stats.mng++;
        else if (c.st === 'Site') stats.site++;
        else if (c.st === 'Yard') stats.yard++;
        else if (c.st === 'Out') stats.out++;
        else if (c.st === 'Trans') stats.trans++;
        else if (c.st === 'Order') stats.order++;
        else if (c.st === 'Ordered') stats.ordered++;
        else if (c.st === 'Spare') stats.spare++;
        else if (c.st === 'Done') stats.done++;
      });
    });
    stats.mirP = mirs.filter(m => m.status === 'Pending').length;
    stats.lost = movements.filter(m => m.balType === 'Lost').reduce((sum, m) => sum + Math.abs(m.qty), 0);
    stats.broken = movements.filter(m => m.balType === 'Broken').reduce((sum, m) => sum + Math.abs(m.qty), 0);
    return stats;
  };

  const stats = getStats();

  // ============================================================
  // STYLES
  // ============================================================
  const s = {
    app: { display: 'flex', height: '100vh', fontFamily: "'Segoe UI', sans-serif", fontSize: 14, background: '#F3F4F6' },
    sidebar: { width: sidebarCollapsed ? 70 : 260, background: `linear-gradient(180deg, ${COLORS.secondary} 0%, #111827 100%)`, color: '#fff', display: 'flex', flexDirection: 'column', transition: 'width 0.3s', boxShadow: '4px 0 24px rgba(0,0,0,0.2)' },
    logoArea: { padding: sidebarCollapsed ? '20px 10px' : '24px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 14 },
    logoIcon: { width: 44, height: 44, background: COLORS.primary, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: 20, boxShadow: '0 4px 12px rgba(227,30,36,0.4)' },
    nav: { flex: 1, overflowY: 'auto', padding: '12px 0' },
    navItem: (active) => ({ padding: sidebarCollapsed ? '14px' : '14px 20px', cursor: 'pointer', background: active ? COLORS.primary : 'transparent', borderRadius: sidebarCollapsed ? 10 : '0 30px 30px 0', marginRight: sidebarCollapsed ? 8 : 16, marginLeft: sidebarCollapsed ? 8 : 0, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 14, transition: 'all 0.2s', fontSize: 14, fontWeight: active ? '600' : '400', boxShadow: active ? '0 4px 12px rgba(227,30,36,0.3)' : 'none' }),
    badge: { background: COLORS.primary, borderRadius: 12, padding: '3px 10px', fontSize: 11, fontWeight: '700', minWidth: 24, textAlign: 'center', boxShadow: '0 2px 8px rgba(227,30,36,0.4)' },
    main: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
    header: { background: '#fff', padding: '18px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E5E7EB', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' },
    headerIcon: { width: 48, height: 48, background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%)`, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, boxShadow: '0 4px 16px rgba(227,30,36,0.3)' },
    content: { flex: 1, padding: 28, overflowY: 'auto' },
    card: { background: '#fff', borderRadius: 20, padding: 24, marginBottom: 24, boxShadow: '0 4px 24px rgba(0,0,0,0.06)', border: '1px solid #E5E7EB' },
    cardTitle: { fontSize: 18, fontWeight: '700', color: COLORS.secondary, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 },
    dashGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 },
    dashBox: (color) => ({ background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`, color: '#fff', padding: 20, borderRadius: 16, cursor: 'pointer', transition: 'all 0.3s', boxShadow: `0 6px 24px ${color}40`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 120 }),
    formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 20 },
    formGroup: { display: 'flex', flexDirection: 'column', gap: 8 },
    label: { fontSize: 12, fontWeight: '700', color: COLORS.accent, textTransform: 'uppercase', letterSpacing: 0.5 },
    input: { padding: '14px 18px', border: '2px solid #E5E7EB', borderRadius: 12, fontSize: 14, transition: 'all 0.2s', outline: 'none', width: '100%', boxSizing: 'border-box' },
    select: { padding: '14px 18px', border: '2px solid #E5E7EB', borderRadius: 12, fontSize: 14, background: '#fff', cursor: 'pointer', outline: 'none', width: '100%', boxSizing: 'border-box' },
    btn: (color) => ({ padding: '14px 28px', background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`, color: '#fff', border: 'none', borderRadius: 12, cursor: 'pointer', fontSize: 14, fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: 10, transition: 'all 0.2s', boxShadow: `0 4px 16px ${color}40` }),
    btnSmall: (color) => ({ padding: '8px 12px', background: color, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 11, fontWeight: '700', transition: 'all 0.2s', minWidth: 36, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }),
    table: { width: '100%', borderCollapse: 'separate', borderSpacing: 0 },
    th: { background: COLORS.secondary, color: '#fff', padding: '14px 12px', textAlign: 'left', fontWeight: '700', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
    thFirst: { borderTopLeftRadius: 12 },
    thLast: { borderTopRightRadius: 12 },
    td: { padding: '12px', borderBottom: '1px solid #E5E7EB', fontSize: 13 },
    statusBadge: (color) => ({ display: 'inline-block', padding: '4px 10px', borderRadius: 16, fontSize: 11, fontWeight: '700', background: `${color}20`, color: color }),
    modal: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modalBox: { background: '#fff', padding: 32, borderRadius: 24, minWidth: 450, maxWidth: '90%', maxHeight: '85vh', overflow: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.25)' },
    tabs: { display: 'flex', gap: 8, marginBottom: 24, borderBottom: '2px solid #E5E7EB', paddingBottom: 16 },
    tab: (active) => ({ padding: '12px 24px', cursor: 'pointer', borderRadius: 10, fontSize: 14, fontWeight: active ? '700' : '500', background: active ? COLORS.primary : 'transparent', color: active ? '#fff' : COLORS.accent, transition: 'all 0.2s', boxShadow: active ? '0 4px 12px rgba(227,30,36,0.3)' : 'none' }),
    searchBox: { display: 'flex', alignItems: 'center', background: '#F9FAFB', border: '2px solid #E5E7EB', borderRadius: 14, padding: '4px 18px', marginBottom: 20 },
    searchInput: { border: 'none', outline: 'none', padding: '12px', fontSize: 14, flex: 1, background: 'transparent' },
    itemsList: { background: '#F9FAFB', borderRadius: 16, padding: 20, marginBottom: 20 },
    itemRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: '#fff', borderRadius: 14, marginBottom: 10, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' },
    alert: (type) => ({ padding: '16px 24px', borderRadius: 14, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, background: type === 'error' ? '#FEE2E2' : '#D1FAE5', color: type === 'error' ? COLORS.primary : COLORS.success, fontWeight: '600' }),
    actionBtns: { display: 'flex', gap: 4, flexWrap: 'wrap' }
  };

  // Navigation items
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'mir', label: 'MIR', icon: '📋', count: stats.mirP },
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

  // ============================================================
  // RENDER FUNCTIONS
  // ============================================================

  // Dashboard with 6 separate boxes
  const renderDashboard = () => {
    const yardItems = Object.keys(inventory.yard).length;
    const yardQty = Object.values(inventory.yard).reduce((a, b) => a + b, 0);
    const siteItems = Object.keys(inventory.site).length;
    const siteQty = Object.values(inventory.site).reduce((a, b) => a + b, 0);

    return (
      <div>
        <div style={s.card}>
          <div style={s.cardTitle}>⚡ URGENT OPERATIONS</div>
          <div style={s.dashGrid}>
            <div style={s.dashBox(COLORS.primary)} onClick={() => setView('mir')}><div style={{ fontSize: 36, fontWeight: '800' }}>{stats.mirP}</div><div style={{ fontSize: 13, marginTop: 6, opacity: 0.9 }}>📋 MIR Open</div></div>
            <div style={s.dashBox('#EA580C')} onClick={() => setView('siteIn')}><div style={{ fontSize: 36, fontWeight: '800' }}>{stats.trans}</div><div style={{ fontSize: 13, marginTop: 6, opacity: 0.9 }}>🚚 In Transit</div></div>
            <div style={s.dashBox(COLORS.success)} onClick={() => setView('recordOut')}><div style={{ fontSize: 36, fontWeight: '800' }}>{stats.out}</div><div style={{ fontSize: 13, marginTop: 6, opacity: 0.9 }}>📤 Ready OUT</div></div>
            <div style={s.dashBox(COLORS.purple)} onClick={() => setView('engineering')}><div style={{ fontSize: 36, fontWeight: '800' }}>{stats.eng}</div><div style={{ fontSize: 13, marginTop: 6, opacity: 0.9 }}>🔧 Engineering</div></div>
            <div style={s.dashBox('#EC4899')} onClick={() => setView('spare')}><div style={{ fontSize: 36, fontWeight: '800' }}>{stats.spare}</div><div style={{ fontSize: 13, marginTop: 6, opacity: 0.9 }}>⭐ Spare Parts</div></div>
          </div>
        </div>

        <div style={s.card}>
          <div style={s.cardTitle}>📦 WAREHOUSES & MANAGEMENT</div>
          <div style={s.dashGrid}>
            <div style={s.dashBox(COLORS.info)} onClick={() => setView('whSite')}><div style={{ fontSize: 36, fontWeight: '800' }}>{stats.site}</div><div style={{ fontSize: 13, marginTop: 6, opacity: 0.9 }}>🏭 WH Site</div></div>
            <div style={s.dashBox('#CA8A04')} onClick={() => setView('whYard')}><div style={{ fontSize: 36, fontWeight: '800' }}>{stats.yard}</div><div style={{ fontSize: 13, marginTop: 6, opacity: 0.9 }}>🏗️ WH Yard</div></div>
            <div style={s.dashBox('#0891B2')} onClick={() => setView('management')}><div style={{ fontSize: 36, fontWeight: '800' }}>{stats.mng}</div><div style={{ fontSize: 13, marginTop: 6, opacity: 0.9 }}>👔 Management</div></div>
            <div style={s.dashBox('#F97316')} onClick={() => { setView('orders'); setOrdersTab('toOrder'); }}><div style={{ fontSize: 36, fontWeight: '800' }}>{stats.order}</div><div style={{ fontSize: 13, marginTop: 6, opacity: 0.9 }}>🛒 To Order</div></div>
            <div style={s.dashBox(COLORS.success)} onClick={() => { setView('orders'); setOrdersTab('pending'); }}><div style={{ fontSize: 36, fontWeight: '800' }}>{stats.ordered}</div><div style={{ fontSize: 13, marginTop: 6, opacity: 0.9 }}>📦 Ordered</div></div>
          </div>
        </div>

        {/* 6 SEPARATE BOXES - Inventory Summary */}
        <div style={s.card}>
          <div style={s.cardTitle}>📈 INVENTORY SUMMARY</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 16 }}>
            <div style={s.dashBox(COLORS.secondary)}><div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>YARD</div><div style={{ fontSize: 10, opacity: 0.6 }}>Items</div><div style={{ fontSize: 28, fontWeight: '800' }}>{yardItems}</div></div>
            <div style={s.dashBox(COLORS.secondary)}><div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>YARD</div><div style={{ fontSize: 10, opacity: 0.6 }}>Total Qty</div><div style={{ fontSize: 28, fontWeight: '800' }}>{yardQty}</div></div>
            <div style={s.dashBox(COLORS.info)}><div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>SITE</div><div style={{ fontSize: 10, opacity: 0.6 }}>Items</div><div style={{ fontSize: 28, fontWeight: '800' }}>{siteItems}</div></div>
            <div style={s.dashBox(COLORS.info)}><div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>SITE</div><div style={{ fontSize: 10, opacity: 0.6 }}>Total Qty</div><div style={{ fontSize: 28, fontWeight: '800' }}>{siteQty}</div></div>
            <div style={s.dashBox(COLORS.orange)}><div style={{ fontSize: 28, fontWeight: '800' }}>{stats.lost}</div><div style={{ fontSize: 12, marginTop: 4, opacity: 0.9 }}>🚫 Lost</div></div>
            <div style={s.dashBox(COLORS.purple)}><div style={{ fontSize: 28, fontWeight: '800' }}>{stats.broken}</div><div style={{ fontSize: 12, marginTop: 4, opacity: 0.9 }}>💔 Broken</div></div>
          </div>
        </div>

        <div style={s.card}>
          <div style={s.cardTitle}>🚀 QUICK ACTIONS</div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <button style={s.btn(COLORS.primary)} onClick={() => setView('newRequest')}>📝 New Request</button>
            <button style={s.btn(COLORS.success)} onClick={() => setView('materialIn')}>📥 Load Material</button>
            <button style={s.btn(COLORS.info)} onClick={() => setModal('balance')}>⚖️ Inventory Adjustment</button>
            <button style={s.btn(COLORS.purple)} onClick={() => setView('status')}>🔍 Track Request</button>
          </div>
        </div>
      </div>
    );
  };

  // New Request
  const renderNewRequest = () => (
    <div style={s.card}>
      <div style={s.cardTitle}>📝 CREATE NEW REQUEST</div>
      <div style={s.formGrid}>
        <div style={s.formGroup}><label style={s.label}>Requester Name *</label><input style={s.input} value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Enter name" /></div>
        <div style={s.formGroup}><label style={s.label}>Badge Number *</label><input style={s.input} value={form.badge} onChange={e => setForm({...form, badge: e.target.value})} placeholder="Enter badge" /></div>
        <div style={s.formGroup}><label style={s.label}>ISO Drawing *</label><input style={s.input} value={form.iso} onChange={e => setForm({...form, iso: e.target.value})} placeholder="e.g., ISO-001" /></div>
        <div style={s.formGroup}><label style={s.label}>Spool Number *</label><input style={s.input} value={form.spool} onChange={e => setForm({...form, spool: e.target.value})} placeholder="e.g., SP-001" /></div>
        <div style={s.formGroup}><label style={s.label}>Category</label><select style={s.select} value={form.cat} onChange={e => setForm({...form, cat: e.target.value})}><option>Bulk</option><option>Erection</option></select></div>
        {form.cat === 'Erection' && <div style={s.formGroup}><label style={s.label}>HF Number *</label><input style={s.input} value={form.hf} onChange={e => setForm({...form, hf: e.target.value})} placeholder="Enter HF number" /></div>}
      </div>
      <div style={{ marginTop: 28, marginBottom: 20 }}>
        <div style={s.cardTitle}>➕ ADD MATERIALS</div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ ...s.formGroup, flex: 2, minWidth: 200 }}><label style={s.label}>Material Code</label><select style={s.select} value={itemForm.code} onChange={e => setItemForm({...itemForm, code: e.target.value})}><option value="">-- Select Material --</option>{Object.entries(materials).map(([code, desc]) => (<option key={code} value={code}>{code} - {desc}</option>))}</select></div>
          <div style={{ ...s.formGroup, flex: 1, minWidth: 100 }}><label style={s.label}>Quantity</label><input style={s.input} type="number" value={itemForm.qty} onChange={e => setItemForm({...itemForm, qty: e.target.value})} placeholder="Qty" /></div>
          <button style={s.btn(COLORS.success)} onClick={addItemToRequest}>➕ Add</button>
        </div>
      </div>
      {requestItems.length > 0 && <div style={s.itemsList}><div style={{ fontWeight: '700', marginBottom: 16, fontSize: 16 }}>📦 Items in Request ({requestItems.length})</div>{requestItems.map(item => (<div key={item.id} style={s.itemRow}><div><strong style={{ fontSize: 16 }}>{item.code}</strong><div style={{ fontSize: 13, color: COLORS.accent }}>{item.desc}</div></div><div style={{ display: 'flex', alignItems: 'center', gap: 20 }}><span style={{ fontWeight: '700', fontSize: 20 }}>×{item.qty}</span><button style={{ ...s.btnSmall(COLORS.primary), padding: '8px 14px' }} onClick={() => removeItemFromRequest(item.id)}>✕</button></div></div>))}</div>}
      <div style={{ display: 'flex', gap: 16, marginTop: 28 }}>
        <button style={s.btn(COLORS.purple)} onClick={() => submitRequest('Eng')} disabled={requestItems.length === 0}>🔧 Send to Engineering</button>
        <button style={s.btn(COLORS.info)} onClick={() => submitRequest('Site')} disabled={requestItems.length === 0}>🏭 Direct to Site</button>
        <button style={s.btn('#CA8A04')} onClick={() => submitRequest('Yard')} disabled={requestItems.length === 0}>🏗️ Direct to Yard</button>
      </div>
    </div>
  );

  // WH Site - Complete with all buttons
  const renderWHSite = () => {
    const items = requests.flatMap(r => r.comp.filter(c => c.st === 'Site').map(c => ({ ...c, req: r })));
    const inv = inventory.site;

    return (
      <div>
        <div style={s.card}>
          <div style={s.cardTitle}>🏭 WH SITE - Pending Requests</div>
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 50, color: COLORS.accent }}>✅ No pending requests</div>
          ) : (
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={{ ...s.th, ...s.thFirst }}>Request</th>
                  <th style={s.th}>Requester</th>
                  <th style={s.th}>Code</th>
                  <th style={s.th}>Qty</th>
                  <th style={s.th}>Available</th>
                  <th style={{ ...s.th, ...s.thLast }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const avail = inv[item.code] || 0;
                  const canFulfill = avail >= item.qty;
                  return (
                    <tr key={idx}>
                      <td style={s.td}><strong>{formatReqNum(item.req.num, item.req.sub)}</strong></td>
                      <td style={s.td}>{item.req.name}</td>
                      <td style={s.td}><strong>{item.code}</strong><div style={{fontSize:11,color:COLORS.accent}}>{item.desc}</div></td>
                      <td style={s.td}><strong>{item.qty}</strong></td>
                      <td style={s.td}><span style={s.statusBadge(canFulfill ? COLORS.success : COLORS.primary)}>{avail}</span></td>
                      <td style={s.td}>
                        <div style={s.actionBtns}>
                          <button style={s.btnSmall(canFulfill ? COLORS.success : COLORS.gray)} onClick={() => canFulfill && moveToOut(item.req, item, 'Site')} disabled={!canFulfill} title="Conferma">✓</button>
                          <button style={s.btnSmall(COLORS.warning)} onClick={() => openSplitModal(item.req, item, 'Site')} title="Split Partial">PT</button>
                          <button style={s.btnSmall(COLORS.yellow)} onClick={() => sendToDestination(item.req, item, 'Yard')} title="Send to Yard">Y</button>
                          <button style={s.btnSmall(COLORS.purple)} onClick={() => sendToDestination(item.req, item, 'Eng')} title="Engineering">UT</button>
                          <button style={s.btnSmall(COLORS.gray)} onClick={() => sendToDestination(item.req, item, 'Eng')} title="Return">↩</button>
                          <button style={s.btnSmall(COLORS.primary)} onClick={() => deleteComponent(item.req, item)} title="Delete">🗑️</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div style={s.card}>
          <div style={s.cardTitle}>📦 Current Inventory - Site</div>
          <div style={s.searchBox}><span>🔍</span><input style={s.searchInput} placeholder="Search materials..." value={search} onChange={e => setSearch(e.target.value)} /></div>
          <table style={s.table}>
            <thead><tr><th style={{ ...s.th, ...s.thFirst }}>Code</th><th style={s.th}>Description</th><th style={{ ...s.th, ...s.thLast }}>Quantity</th></tr></thead>
            <tbody>
              {Object.entries(inv).filter(([code]) => !search || code.toLowerCase().includes(search.toLowerCase()) || (materials[code] || '').toLowerCase().includes(search.toLowerCase())).map(([code, qty]) => (
                <tr key={code}><td style={s.td}><strong>{code}</strong></td><td style={s.td}>{materials[code] || '-'}</td><td style={s.td}><span style={s.statusBadge(qty > 0 ? COLORS.success : COLORS.accent)}>{qty}</span></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // WH Yard - Complete with all buttons
  const renderWHYard = () => {
    const items = requests.flatMap(r => r.comp.filter(c => c.st === 'Yard').map(c => ({ ...c, req: r })));
    const inv = inventory.yard;

    return (
      <div>
        <div style={s.card}>
          <div style={s.cardTitle}>🏗️ WH YARD - Pending Requests</div>
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 50, color: COLORS.accent }}>✅ No pending requests</div>
          ) : (
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={{ ...s.th, ...s.thFirst }}>Request</th>
                  <th style={s.th}>Requester</th>
                  <th style={s.th}>Code</th>
                  <th style={s.th}>Qty Req</th>
                  <th style={s.th}>Available</th>
                  <th style={{ ...s.th, ...s.thLast }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const avail = inv[item.code] || 0;
                  const canFulfill = avail >= item.qty;
                  return (
                    <tr key={idx}>
                      <td style={s.td}><strong>{formatReqNum(item.req.num, item.req.sub)}</strong></td>
                      <td style={s.td}>{item.req.name}</td>
                      <td style={s.td}><strong>{item.code}</strong><div style={{fontSize:11,color:COLORS.accent}}>{item.desc}</div></td>
                      <td style={s.td}><strong>{item.qty}</strong></td>
                      <td style={s.td}><span style={s.statusBadge(canFulfill ? COLORS.success : COLORS.primary)}>{avail}</span></td>
                      <td style={s.td}>
                        <div style={s.actionBtns}>
                          <button style={s.btnSmall(canFulfill ? COLORS.success : COLORS.gray)} onClick={() => canFulfill && transferToSite(item.req, item)} disabled={!canFulfill} title="Trovato - Transfer">✓</button>
                          <button style={s.btnSmall(COLORS.warning)} onClick={() => openSplitModal(item.req, item, 'Yard')} title="Split Partial">PT</button>
                          <button style={s.btnSmall(COLORS.purple)} onClick={() => sendToDestination(item.req, item, 'Eng')} title="Engineering">UT</button>
                          <button style={s.btnSmall(COLORS.gray)} onClick={() => sendToDestination(item.req, item, 'Site')} title="Return to Site">↩</button>
                          <button style={s.btnSmall(COLORS.primary)} onClick={() => deleteComponent(item.req, item)} title="Delete">🗑️</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div style={s.card}>
          <div style={s.cardTitle}>📦 Current Inventory - Yard</div>
          <div style={s.searchBox}><span>🔍</span><input style={s.searchInput} placeholder="Search materials..." value={search} onChange={e => setSearch(e.target.value)} /></div>
          <table style={s.table}>
            <thead><tr><th style={{ ...s.th, ...s.thFirst }}>Code</th><th style={s.th}>Description</th><th style={{ ...s.th, ...s.thLast }}>Quantity</th></tr></thead>
            <tbody>
              {Object.entries(inv).filter(([code]) => !search || code.toLowerCase().includes(search.toLowerCase()) || (materials[code] || '').toLowerCase().includes(search.toLowerCase())).map(([code, qty]) => (
                <tr key={code}><td style={s.td}><strong>{code}</strong></td><td style={s.td}>{materials[code] || '-'}</td><td style={s.td}><span style={s.statusBadge(qty > 0 ? COLORS.success : COLORS.accent)}>{qty}</span></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Site IN with reject button
  const renderSiteIn = () => {
    const transitItems = requests.flatMap(r => r.comp.filter(c => c.st === 'Trans').map(c => ({ ...c, req: r })));
    return (
      <div style={s.card}>
        <div style={s.cardTitle}>🚚 MATERIALS IN TRANSIT</div>
        {transitItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 50, color: COLORS.accent }}>✅ No materials in transit</div>
        ) : (
          <table style={s.table}>
            <thead>
              <tr>
                <th style={{ ...s.th, ...s.thFirst }}>Request</th>
                <th style={s.th}>Code</th>
                <th style={s.th}>Description</th>
                <th style={s.th}>Quantity</th>
                <th style={{ ...s.th, ...s.thLast }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {transitItems.map((item, idx) => (
                <tr key={idx}>
                  <td style={s.td}><strong>{formatReqNum(item.req.num, item.req.sub)}</strong></td>
                  <td style={s.td}>{item.code}</td>
                  <td style={s.td}>{item.desc}</td>
                  <td style={s.td}><strong>{item.qty}</strong></td>
                  <td style={s.td}>
                    <div style={s.actionBtns}>
                      <button style={s.btnSmall(COLORS.success)} onClick={() => confirmArrival(item.req, item)} title="Confirm">✓</button>
                      <button style={s.btnSmall(COLORS.gray)} onClick={() => rejectArrival(item.req, item)} title="Reject">↩</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  };

  // Ready OUT with cancel button
  const renderRecordOut = () => (
    <div style={s.card}>
      <div style={s.cardTitle}>📤 READY FOR PICKUP</div>
      {readyOut.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 50, color: COLORS.accent }}>✅ No materials ready</div>
      ) : (
        <table style={s.table}>
          <thead>
            <tr>
              <th style={{ ...s.th, ...s.thFirst }}>Request</th>
              <th style={s.th}>Requester</th>
              <th style={s.th}>Badge</th>
              <th style={s.th}>Code</th>
              <th style={s.th}>Qty</th>
              <th style={s.th}>Location</th>
              <th style={{ ...s.th, ...s.thLast }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {readyOut.map(item => (
              <tr key={item.id}>
                <td style={s.td}><strong>{item.reqNum}</strong></td>
                <td style={s.td}>{item.name}</td>
                <td style={s.td}>{item.badge}</td>
                <td style={s.td}>{item.code}</td>
                <td style={s.td}><strong>{item.qty}</strong></td>
                <td style={s.td}><span style={s.statusBadge(COLORS.info)}>{item.loc}</span></td>
                <td style={s.td}>
                  <div style={s.actionBtns}>
                    <button style={s.btnSmall(COLORS.success)} onClick={() => deliverMaterial(item)} title="Deliver">✓</button>
                    <button style={s.btnSmall(COLORS.primary)} onClick={() => cancelReadyOut(item)} title="Cancel">🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  // Engineering - Complete with all buttons
  const renderEngineering = () => {
    const engItems = requests.flatMap(r => r.comp.filter(c => c.st === 'Eng').map(c => ({ ...c, req: r })));
    return (
      <div style={s.card}>
        <div style={s.cardTitle}>🔧 ENGINEERING REVIEW</div>
        {engItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 50, color: COLORS.accent }}>✅ No items pending</div>
        ) : (
          <table style={s.table}>
            <thead>
              <tr>
                <th style={{ ...s.th, ...s.thFirst }}>Request</th>
                <th style={s.th}>ISO/Spool</th>
                <th style={s.th}>Code</th>
                <th style={s.th}>Qty</th>
                <th style={{ ...s.th, ...s.thLast }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {engItems.map((item, idx) => (
                <tr key={idx}>
                  <td style={s.td}><strong>{formatReqNum(item.req.num, item.req.sub)}</strong></td>
                  <td style={s.td}>{item.req.iso} / {item.req.spool}</td>
                  <td style={s.td}><strong>{item.code}</strong><div style={{fontSize:11,color:COLORS.accent}}>{item.desc}</div></td>
                  <td style={s.td}><strong>{item.qty}</strong></td>
                  <td style={s.td}>
                    <div style={s.actionBtns}>
                      <button style={s.btnSmall(COLORS.success)} onClick={() => moveToOut(item.req, item, 'Site')} title="Risolto → Ready OUT">✓</button>
                      <button style={s.btnSmall(COLORS.warning)} onClick={() => openSplitModal(item.req, item, 'Eng')} title="Split Partial">PT</button>
                      <button style={s.btnSmall(COLORS.info)} onClick={() => openNoteModal(item.req, item)} title="Send Note">🔍</button>
                      <button style={s.btnSmall(COLORS.pink)} onClick={() => sendToDestination(item.req, item, 'Spare', { eng_category: 'Spare' })} title="Spare Parts">Sp</button>
                      <button style={s.btnSmall(COLORS.cyan)} onClick={() => sendToDestination(item.req, item, 'Mng', { eng_category: 'Management' })} title="Management">Mng</button>
                      <button style={s.btnSmall(COLORS.gray)} onClick={() => sendToDestination(item.req, item, 'Site')} title="Return">↩</button>
                      <button style={s.btnSmall(COLORS.primary)} onClick={() => deleteComponent(item.req, item)} title="Delete">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  };

  // Spare Parts - With stock check
  const renderSpare = () => {
    const spareItems = requests.flatMap(r => r.comp.filter(c => c.st === 'Spare').map(c => ({ ...c, req: r })));
    return (
      <div style={s.card}>
        <div style={s.cardTitle}>⭐ SPARE PARTS</div>
        {spareItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 50, color: COLORS.accent }}>✅ No spare parts pending</div>
        ) : (
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
              {spareItems.map((item, idx) => {
                const hasStock = (inventory.yard[item.code] || 0) + (inventory.site[item.code] || 0) >= item.qty;
                return (
                  <tr key={idx}>
                    <td style={s.td}><strong>{formatReqNum(item.req.num, item.req.sub)}</strong></td>
                    <td style={s.td}>{item.code}</td>
                    <td style={s.td}>{item.desc}</td>
                    <td style={s.td}><strong>{item.qty}</strong></td>
                    <td style={s.td}>
                      <div style={s.actionBtns}>
                        <button style={s.btnSmall(COLORS.success)} onClick={() => sendToDestination(item.req, item, 'Site')} title="Has Stock">✓ Has Stock</button>
                        <button style={s.btnSmall(COLORS.warning)} onClick={() => sendToDestination(item.req, item, 'Order')} title="Purchase">🛒 Purchase</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    );
  };

  // Management - With Int/Cli options
  const renderManagement = () => {
    const mngItems = requests.flatMap(r => r.comp.filter(c => c.st === 'Mng').map(c => ({ ...c, req: r })));
    return (
      <div style={s.card}>
        <div style={s.cardTitle}>👔 MANAGEMENT DECISIONS</div>
        {mngItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 50, color: COLORS.accent }}>✅ No items pending</div>
        ) : (
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
              {mngItems.map((item, idx) => (
                <tr key={idx}>
                  <td style={s.td}><strong>{formatReqNum(item.req.num, item.req.sub)}</strong></td>
                  <td style={s.td}>{item.code}</td>
                  <td style={s.td}>{item.desc}</td>
                  <td style={s.td}><strong>{item.qty}</strong></td>
                  <td style={s.td}><span style={s.statusBadge(COLORS.purple)}>{item.engCat || '-'}</span></td>
                  <td style={s.td}>
                    <div style={s.actionBtns}>
                      <button style={s.btnSmall(COLORS.info)} onClick={() => sendToDestination(item.req, item, 'Order', { mng_note: 'Internal Order', order_type: 'Internal' })} title="Internal Order">🏢 Int</button>
                      <button style={s.btnSmall(COLORS.cyan)} onClick={() => sendToDestination(item.req, item, 'Order', { mng_note: 'Client Order', order_type: 'Client' })} title="Client Order">👤 Cli</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  };

  // Movements - With + button
  const renderMovements = () => (
    <div style={s.card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={s.cardTitle}>📜 MOVEMENT HISTORY</div>
        <button style={s.btn(COLORS.primary)} onClick={openMovementModal}>+ Add Movement</button>
      </div>
      <div style={s.searchBox}><span>🔍</span><input style={s.searchInput} placeholder="Search movements..." value={movSearch} onChange={e => setMovSearch(e.target.value)} /></div>
      <table style={s.table}>
        <thead>
          <tr>
            <th style={{ ...s.th, ...s.thFirst }}>Date</th>
            <th style={s.th}>Type</th>
            <th style={s.th}>Location</th>
            <th style={s.th}>Code</th>
            <th style={s.th}>Qty</th>
            <th style={{ ...s.th, ...s.thLast }}>Note</th>
          </tr>
        </thead>
        <tbody>
          {movements.filter(m => !movSearch || m.code?.toLowerCase().includes(movSearch.toLowerCase()) || m.type?.toLowerCase().includes(movSearch.toLowerCase())).slice(0, 50).map(m => (
            <tr key={m.id}>
              <td style={s.td}>{formatDateTime(m.d)}</td>
              <td style={s.td}><span style={s.statusBadge(m.type === 'IN' ? COLORS.success : m.type === 'OUT' ? COLORS.primary : m.type === 'BAL' ? COLORS.warning : m.balType === 'Lost' ? COLORS.orange : m.balType === 'Broken' ? COLORS.purple : COLORS.info)}>{m.balType || m.type}</span></td>
              <td style={s.td}>{m.loc}</td>
              <td style={s.td}><strong>{m.code}</strong></td>
              <td style={s.td}>{m.qty}</td>
              <td style={s.td}>{m.note || m.ref || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // MIR
  const renderMIR = () => (
    <div>
      <div style={s.card}>
        <div style={s.cardTitle}>📋 REGISTER NEW MIR</div>
        <div style={s.formGrid}>
          <div style={s.formGroup}><label style={s.label}>MIR Number *</label><input style={s.input} value={mirForm.mir} onChange={e => setMirForm({...mirForm, mir: e.target.value})} placeholder="e.g., MIR-001" /></div>
          <div style={s.formGroup}><label style={s.label}>RK Number *</label><input style={s.input} value={mirForm.rk} onChange={e => setMirForm({...mirForm, rk: e.target.value})} placeholder="e.g., RK-001" /></div>
          <div style={s.formGroup}><label style={s.label}>Forecast Date</label><input style={s.input} type="date" value={mirForm.forecast} onChange={e => setMirForm({...mirForm, forecast: e.target.value})} /></div>
          <div style={s.formGroup}><label style={s.label}>Priority</label><select style={s.select} value={mirForm.priority} onChange={e => setMirForm({...mirForm, priority: e.target.value})}><option>Low</option><option>Medium</option><option>High</option><option>Urgent</option></select></div>
        </div>
        <button style={s.btn(COLORS.primary)} onClick={addMIR}>➕ Register MIR</button>
      </div>
      <div style={s.card}>
        <div style={s.cardTitle}>📋 PENDING MIRs</div>
        {mirs.filter(m => m.status === 'Pending').length === 0 ? (
          <div style={{ textAlign: 'center', padding: 50, color: COLORS.accent }}>✅ No pending MIRs</div>
        ) : (
          <table style={s.table}>
            <thead><tr><th style={{ ...s.th, ...s.thFirst }}>MIR</th><th style={s.th}>RK</th><th style={s.th}>Priority</th><th style={s.th}>Forecast</th><th style={{ ...s.th, ...s.thLast }}>Status</th></tr></thead>
            <tbody>
              {mirs.filter(m => m.status === 'Pending').map(mir => (
                <tr key={mir.id}><td style={s.td}><strong>{mir.mir}</strong></td><td style={s.td}>{mir.rk}</td><td style={s.td}><span style={s.statusBadge(mir.priority === 'Urgent' ? COLORS.primary : mir.priority === 'High' ? COLORS.warning : COLORS.success)}>{mir.priority}</span></td><td style={s.td}>{formatDate(mir.forecast)}</td><td style={s.td}><span style={s.statusBadge(COLORS.warning)}>Pending</span></td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );

  // Material IN
  const renderMaterialIn = () => (
    <div style={s.card}>
      <div style={s.cardTitle}>📥 LOAD MATERIALS TO YARD</div>
      <div style={s.formGrid}>
        <div style={s.formGroup}><label style={s.label}>Material Code *</label><select style={s.select} value={loadForm.code} onChange={e => setLoadForm({...loadForm, code: e.target.value})}><option value="">-- Select Material --</option>{Object.entries(materials).map(([code, desc]) => (<option key={code} value={code}>{code} - {desc}</option>))}</select></div>
        <div style={s.formGroup}><label style={s.label}>Quantity *</label><input style={s.input} type="number" value={loadForm.qty} onChange={e => setLoadForm({...loadForm, qty: e.target.value})} placeholder="Enter quantity" /></div>
        <div style={s.formGroup}><label style={s.label}>MIR Reference</label><select style={s.select} value={loadForm.mir} onChange={e => setLoadForm({...loadForm, mir: e.target.value})}><option value="">-- Select MIR --</option>{mirs.filter(m => m.status === 'Pending').map(mir => (<option key={mir.id} value={mir.mir}>{mir.mir} - {mir.rk}</option>))}</select></div>
        <div style={s.formGroup}><label style={s.label}>RK Number</label><input style={s.input} value={loadForm.rk} onChange={e => setLoadForm({...loadForm, rk: e.target.value})} placeholder="RK number" /></div>
      </div>
      <button style={s.btn(COLORS.success)} onClick={loadMaterial}>📥 Load to YARD</button>
    </div>
  );

  // Orders
  const renderOrders = () => {
    const toOrder = requests.flatMap(r => r.comp.filter(c => c.st === 'Order').map(c => ({ ...c, req: r })));
    const pending = orderLog.filter(o => o.status === 'Pending');
    return (
      <div>
        <div style={s.tabs}>
          <div style={s.tab(ordersTab === 'toOrder')} onClick={() => setOrdersTab('toOrder')}>🛒 To Order ({toOrder.length})</div>
          <div style={s.tab(ordersTab === 'pending')} onClick={() => setOrdersTab('pending')}>📦 Ordered ({pending.length})</div>
          <div style={s.tab(ordersTab === 'log')} onClick={() => setOrdersTab('log')}>📜 Order Log</div>
        </div>
        {ordersTab === 'toOrder' && (
          <div style={s.card}>
            <div style={s.cardTitle}>🛒 MATERIALS TO ORDER</div>
            {toOrder.length === 0 ? <div style={{ textAlign: 'center', padding: 50, color: COLORS.accent }}>✅ No materials to order</div> : (
              <table style={s.table}>
                <thead><tr><th style={{ ...s.th, ...s.thFirst }}>Request</th><th style={s.th}>Code</th><th style={s.th}>Description</th><th style={s.th}>Qty</th><th style={{ ...s.th, ...s.thLast }}>Actions</th></tr></thead>
                <tbody>
                  {toOrder.map((item, idx) => (
                    <tr key={idx}><td style={s.td}><strong>{formatReqNum(item.req.num, item.req.sub)}</strong></td><td style={s.td}>{item.code}</td><td style={s.td}>{item.desc}</td><td style={s.td}><strong>{item.qty}</strong></td><td style={s.td}><div style={s.actionBtns}><button style={s.btnSmall(COLORS.info)} onClick={() => markAsOrdered(item.req, item, 'Standard')}>📦 Standard</button><button style={s.btnSmall(COLORS.warning)} onClick={() => markAsOrdered(item.req, item, 'Urgent')}>⚡ Urgent</button></div></td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
        {ordersTab === 'pending' && (
          <div style={s.card}>
            <div style={s.cardTitle}>📦 ORDERED - AWAITING ARRIVAL</div>
            {pending.length === 0 ? <div style={{ textAlign: 'center', padding: 50, color: COLORS.accent }}>✅ No pending orders</div> : (
              <table style={s.table}>
                <thead><tr><th style={{ ...s.th, ...s.thFirst }}>Request</th><th style={s.th}>Code</th><th style={s.th}>Qty</th><th style={s.th}>Type</th><th style={s.th}>Order Date</th><th style={{ ...s.th, ...s.thLast }}>Actions</th></tr></thead>
                <tbody>
                  {pending.map(order => (
                    <tr key={order.id}><td style={s.td}><strong>{order.reqNum}</strong></td><td style={s.td}>{order.code}</td><td style={s.td}>{order.qty}</td><td style={s.td}><span style={s.statusBadge(order.orderType === 'Urgent' ? COLORS.warning : COLORS.info)}>{order.orderType}</span></td><td style={s.td}>{formatDate(order.orderDate)}</td><td style={s.td}><button style={s.btnSmall(COLORS.success)} onClick={() => markOrderArrived(order)}>✅ Arrived</button></td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
        {ordersTab === 'log' && (
          <div style={s.card}>
            <div style={s.cardTitle}>📜 ORDER LOG</div>
            <table style={s.table}>
              <thead><tr><th style={{ ...s.th, ...s.thFirst }}>Req #</th><th style={s.th}>Code</th><th style={s.th}>Qty</th><th style={s.th}>Type</th><th style={s.th}>Order Date</th><th style={{ ...s.th, ...s.thLast }}>Status</th></tr></thead>
              <tbody>
                {orderLog.map(o => (
                  <tr key={o.id}><td style={s.td}>{o.reqNum}</td><td style={s.td}>{o.code}</td><td style={s.td}>{o.qty}</td><td style={s.td}>{o.orderType}</td><td style={s.td}>{formatDate(o.orderDate)}</td><td style={s.td}><span style={s.statusBadge(o.status === 'Arrived' ? COLORS.success : COLORS.warning)}>{o.status}</span></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  // Database
  const renderDatabase = () => (
    <div>
      {!dbUnlocked ? (
        <div style={s.card}>
          <div style={s.cardTitle}>🔐 DATABASE ACCESS</div>
          <p style={{ marginBottom: 20, color: COLORS.accent }}>Enter password to access the database.</p>
          <div style={{ display: 'flex', gap: 16 }}>
            <input style={{ ...s.input, maxWidth: 300 }} type="password" value={pwdInput} onChange={e => setPwdInput(e.target.value)} placeholder="Enter password" onKeyDown={e => e.key === 'Enter' && checkPwd()} />
            <button style={s.btn(COLORS.primary)} onClick={checkPwd}>🔓 Unlock</button>
          </div>
        </div>
      ) : (
        <div style={s.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={s.cardTitle}>🗄️ PROJECT DATABASE</div>
            <button style={s.btnSmall(COLORS.accent)} onClick={() => setDbUnlocked(false)}>🔒 Lock</button>
          </div>
          <div style={s.searchBox}><span>🔍</span><input style={s.searchInput} placeholder="Search database..." value={search} onChange={e => setSearch(e.target.value)} /></div>
          <table style={s.table}>
            <thead><tr><th style={{ ...s.th, ...s.thFirst }}>Code</th><th style={s.th}>Description</th><th style={s.th}>Project Qty</th><th style={s.th}>TEN Qty</th><th style={{ ...s.th, ...s.thLast }}>OUT Qty</th></tr></thead>
            <tbody>
              {projectDb.filter(p => !search || p.code.toLowerCase().includes(search.toLowerCase()) || (p.desc || '').toLowerCase().includes(search.toLowerCase())).map(p => (
                <tr key={p.id}>
                  <td style={s.td}><strong>{p.code}</strong></td>
                  <td style={s.td}>{p.desc}</td>
                  <td style={s.td}>{editCell?.code === p.code && editCell?.field === 'project' ? (<input style={{ ...s.input, width: 80 }} value={editVal} onChange={e => setEditVal(e.target.value)} />) : (<span onClick={() => startEdit(p.code, 'project', p.project)} style={{ cursor: 'pointer' }}>{p.project}</span>)}</td>
                  <td style={s.td}>{editCell?.code === p.code && editCell?.field === 'ten' ? (<input style={{ ...s.input, width: 80 }} value={editVal} onChange={e => setEditVal(e.target.value)} />) : (<span onClick={() => startEdit(p.code, 'ten', p.ten)} style={{ cursor: 'pointer' }}>{p.ten}</span>)}</td>
                  <td style={s.td}>{p.out}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {editCell && (
            <div style={{ marginTop: 20, padding: 20, background: '#F9FAFB', borderRadius: 14 }}>
              <div style={{ marginBottom: 12 }}><strong>Editing:</strong> {editCell.code} - {editCell.field}</div>
              <div style={s.formGroup}><label style={s.label}>Reason for change *</label><input style={s.input} value={editReason} onChange={e => setEditReason(e.target.value)} placeholder="Enter reason" /></div>
              <div style={{ display: 'flex', gap: 12, marginTop: 16 }}><button style={s.btnSmall(COLORS.success)} onClick={saveEdit}>✅ Save</button><button style={s.btnSmall(COLORS.accent)} onClick={() => setEditCell(null)}>Cancel</button></div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // Status
  const renderStatus = () => (
    <div style={s.card}>
      <div style={s.cardTitle}>🔍 REQUEST STATUS TRACKER</div>
      <div style={s.formGrid}>
        <div style={s.formGroup}><label style={s.label}>Request Number</label><input style={s.input} value={statusFilters.num} onChange={e => setStatusFilters({...statusFilters, num: e.target.value})} placeholder="e.g., 1001" /></div>
        <div style={s.formGroup}><label style={s.label}>Requester Name</label><input style={s.input} value={statusFilters.name} onChange={e => setStatusFilters({...statusFilters, name: e.target.value})} placeholder="Search by name" /></div>
        <div style={s.formGroup}><label style={s.label}>Material Code</label><input style={s.input} value={statusFilters.code} onChange={e => setStatusFilters({...statusFilters, code: e.target.value})} placeholder="Search by code" /></div>
        <div style={s.formGroup}><label style={s.label}>HF Number</label><input style={s.input} value={statusFilters.hf} onChange={e => setStatusFilters({...statusFilters, hf: e.target.value})} placeholder="Search by HF" /></div>
      </div>
      <table style={s.table}>
        <thead><tr><th style={{ ...s.th, ...s.thFirst }}>Request</th><th style={s.th}>Date</th><th style={s.th}>Requester</th><th style={s.th}>ISO/Spool</th><th style={s.th}>HF</th><th style={s.th}>Code</th><th style={s.th}>Qty</th><th style={{ ...s.th, ...s.thLast }}>Status</th></tr></thead>
        <tbody>
          {requests.filter(r => {
            if (statusFilters.num && !r.num.toString().includes(statusFilters.num)) return false;
            if (statusFilters.name && !r.name.toLowerCase().includes(statusFilters.name.toLowerCase())) return false;
            if (statusFilters.hf && !(r.hf || '').toLowerCase().includes(statusFilters.hf.toLowerCase())) return false;
            if (statusFilters.code && !r.comp.some(c => c.code.toLowerCase().includes(statusFilters.code.toLowerCase()))) return false;
            return true;
          }).slice(0, 50).flatMap(r => r.comp.map(c => ({ ...c, req: r }))).map((item, idx) => (
            <tr key={idx}>
              <td style={s.td}><strong>{formatReqNum(item.req.num, item.req.sub)}</strong></td>
              <td style={s.td}>{formatDate(item.req.date)}</td>
              <td style={s.td}>{item.req.name}</td>
              <td style={s.td}>{item.req.iso} / {item.req.spool}</td>
              <td style={s.td}>{item.req.hf || '-'}</td>
              <td style={s.td}>{item.code}</td>
              <td style={s.td}>{item.qty}</td>
              <td style={s.td}><span style={s.statusBadge(item.st === 'Done' ? COLORS.success : item.st === 'Eng' ? COLORS.purple : item.st === 'Mng' ? COLORS.info : item.st === 'Trans' ? COLORS.warning : item.st === 'Out' ? COLORS.success : COLORS.accent)}>{item.st}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // ============================================================
  // MODALS
  // ============================================================
  const renderModal = () => {
    if (!modal) return null;

    // Balance Modal
    if (modal === 'balance') {
      return (
        <div style={s.modal} onClick={() => setModal(null)}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <div style={{ ...s.cardTitle, marginBottom: 24 }}>⚖️ Inventory Adjustment</div>
            <div style={s.formGrid}>
              <div style={s.formGroup}><label style={s.label}>Type *</label><select style={s.select} value={balanceForm.balType} onChange={e => setBalanceForm({...balanceForm, balType: e.target.value})}><option>Adjustment</option><option>Lost</option><option>Broken</option></select></div>
              <div style={s.formGroup}><label style={s.label}>Location</label><select style={s.select} value={balanceForm.loc} onChange={e => setBalanceForm({...balanceForm, loc: e.target.value})}><option>YARD</option><option>SITE</option></select></div>
            </div>
            {(balanceForm.balType === 'Lost' || balanceForm.balType === 'Broken') && <div style={s.alert('error')}>⚠️ Quantity will be subtracted from inventory</div>}
            <div style={s.formGrid}>
              <div style={s.formGroup}><label style={s.label}>Material Code *</label><select style={s.select} value={balanceForm.code} onChange={e => setBalanceForm({...balanceForm, code: e.target.value})}><option value="">-- Select --</option>{Object.entries(materials).map(([code, desc]) => (<option key={code} value={code}>{code} - {desc}</option>))}</select></div>
              <div style={s.formGroup}><label style={s.label}>Quantity *</label><input style={s.input} type="number" value={balanceForm.qty} onChange={e => setBalanceForm({...balanceForm, qty: e.target.value})} /></div>
            </div>
            <div style={s.formGrid}>
              <div style={s.formGroup}><label style={s.label}>Your Name *</label><input style={s.input} value={balanceForm.name} onChange={e => setBalanceForm({...balanceForm, name: e.target.value})} /></div>
              <div style={s.formGroup}><label style={s.label}>Your Badge *</label><input style={s.input} value={balanceForm.badge} onChange={e => setBalanceForm({...balanceForm, badge: e.target.value})} /></div>
            </div>
            <div style={s.formGroup}><label style={s.label}>Note</label><input style={s.input} value={balanceForm.note} onChange={e => setBalanceForm({...balanceForm, note: e.target.value})} placeholder="Reason for adjustment" /></div>
            <div style={{ marginTop: 28, display: 'flex', gap: 16 }}>
              <button style={s.btn(COLORS.success)} onClick={registerBalance}>✅ Save</button>
              <button style={{ ...s.btn(COLORS.gray), background: 'transparent', color: COLORS.gray, border: `2px solid ${COLORS.gray}` }} onClick={() => setModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      );
    }

    // Split Modal
    if (modal === 'split' && modalData) {
      const { req, comp, currentLoc } = modalData;
      return (
        <div style={s.modal} onClick={() => setModal(null)}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <div style={{ ...s.cardTitle, marginBottom: 24 }}>✂️ SPLIT PARTIAL (PT)</div>
            <div style={{ background: '#F3F4F6', padding: 16, borderRadius: 12, marginBottom: 20 }}>
              <div><strong>Request:</strong> {formatReqNum(req.num, req.sub)}</div>
              <div><strong>Code:</strong> {comp.code}</div>
              <div><strong>Total Quantity:</strong> {comp.qty}</div>
              <div><strong>Current Location:</strong> {currentLoc}</div>
            </div>
            <div style={s.formGroup}>
              <label style={s.label}>Quantity Found *</label>
              <input style={s.input} type="number" value={splitForm.qtyFound} onChange={e => setSplitForm({...splitForm, qtyFound: e.target.value})} placeholder={`Enter qty (1-${comp.qty - 1})`} min="1" max={comp.qty - 1} />
            </div>
            <div style={{ background: '#FEF3C7', padding: 12, borderRadius: 8, marginTop: 12, marginBottom: 16 }}>
              <strong>Remainder:</strong> {comp.qty - (+splitForm.qtyFound || 0)} pcs → will go to:
            </div>
            <div style={s.formGroup}>
              <label style={s.label}>Send Remainder To *</label>
              <select style={s.select} value={splitForm.remainderDest} onChange={e => setSplitForm({...splitForm, remainderDest: e.target.value})}>
                <option value="Yard">🏗️ Yard</option>
                <option value="Eng">🔧 Engineering (UT)</option>
                <option value="Mng">👔 Management</option>
                <option value="Order">🛒 Order</option>
              </select>
            </div>
            <div style={{ marginTop: 28, display: 'flex', gap: 16 }}>
              <button style={s.btn(COLORS.success)} onClick={executeSplit}>✅ Execute Split</button>
              <button style={{ ...s.btn(COLORS.gray), background: 'transparent', color: COLORS.gray, border: `2px solid ${COLORS.gray}` }} onClick={() => { setModal(null); setModalData(null); }}>Cancel</button>
            </div>
          </div>
        </div>
      );
    }

    // Note Modal
    if (modal === 'note' && modalData) {
      const { req, comp } = modalData;
      return (
        <div style={s.modal} onClick={() => setModal(null)}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <div style={{ ...s.cardTitle, marginBottom: 24 }}>📝 SEND NOTE</div>
            <div style={{ background: '#F3F4F6', padding: 16, borderRadius: 12, marginBottom: 20 }}>
              <div><strong>Request:</strong> {formatReqNum(req.num, req.sub)}</div>
              <div><strong>Code:</strong> {comp.code} - {comp.desc}</div>
            </div>
            <div style={s.formGroup}>
              <label style={s.label}>Note Text *</label>
              <textarea style={{ ...s.input, minHeight: 100, resize: 'vertical' }} value={noteForm.text} onChange={e => setNoteForm({...noteForm, text: e.target.value})} placeholder="Enter your note..." />
            </div>
            <div style={s.formGroup}>
              <label style={s.label}>Send To *</label>
              <select style={s.select} value={noteForm.dest} onChange={e => setNoteForm({...noteForm, dest: e.target.value})}>
                <option value="Site">🏭 WH Site</option>
                <option value="Yard">🏗️ WH Yard</option>
              </select>
            </div>
            <div style={{ marginTop: 28, display: 'flex', gap: 16 }}>
              <button style={s.btn(COLORS.info)} onClick={sendNote}>📤 Send Note</button>
              <button style={{ ...s.btn(COLORS.gray), background: 'transparent', color: COLORS.gray, border: `2px solid ${COLORS.gray}` }} onClick={() => { setModal(null); setModalData(null); }}>Cancel</button>
            </div>
          </div>
        </div>
      );
    }

    // Movement Modal
    if (modal === 'movement') {
      return (
        <div style={s.modal} onClick={() => setModal(null)}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <div style={{ ...s.cardTitle, marginBottom: 24 }}>+ ADD MOVEMENT</div>
            <div style={s.formGrid}>
              <div style={s.formGroup}><label style={s.label}>Type *</label><select style={s.select} value={movementForm.type} onChange={e => setMovementForm({...movementForm, type: e.target.value})}><option>Lost</option><option>Broken</option><option>IN</option><option>BAL</option></select></div>
              <div style={s.formGroup}><label style={s.label}>Location</label><select style={s.select} value={movementForm.loc} onChange={e => setMovementForm({...movementForm, loc: e.target.value})}><option>YARD</option><option>SITE</option></select></div>
            </div>
            {(movementForm.type === 'Lost' || movementForm.type === 'Broken') && <div style={s.alert('error')}>⚠️ Quantity will be subtracted from inventory</div>}
            <div style={s.formGrid}>
              <div style={s.formGroup}><label style={s.label}>Material Code *</label><select style={s.select} value={movementForm.code} onChange={e => setMovementForm({...movementForm, code: e.target.value})}><option value="">-- Select --</option>{Object.entries(materials).map(([code, desc]) => (<option key={code} value={code}>{code} - {desc}</option>))}</select></div>
              <div style={s.formGroup}><label style={s.label}>Quantity *</label><input style={s.input} type="number" value={movementForm.qty} onChange={e => setMovementForm({...movementForm, qty: e.target.value})} /></div>
            </div>
            <div style={s.formGrid}>
              <div style={s.formGroup}><label style={s.label}>Your Name *</label><input style={s.input} value={movementForm.name} onChange={e => setMovementForm({...movementForm, name: e.target.value})} /></div>
              <div style={s.formGroup}><label style={s.label}>Your Badge *</label><input style={s.input} value={movementForm.badge} onChange={e => setMovementForm({...movementForm, badge: e.target.value})} /></div>
            </div>
            <div style={s.formGroup}><label style={s.label}>Note</label><input style={s.input} value={movementForm.note} onChange={e => setMovementForm({...movementForm, note: e.target.value})} placeholder="Reason/description" /></div>
            <div style={{ marginTop: 28, display: 'flex', gap: 16 }}>
              <button style={s.btn(COLORS.success)} onClick={registerMovement}>✅ Save</button>
              <button style={{ ...s.btn(COLORS.gray), background: 'transparent', color: COLORS.gray, border: `2px solid ${COLORS.gray}` }} onClick={() => setModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  // ============================================================
  // MAIN RENDER
  // ============================================================
  return (
    <div style={s.app}>
      <div style={s.sidebar}>
        <div style={s.logoArea}>
          <div style={s.logoIcon}>S</div>
          {!sidebarCollapsed && <div><div style={{ fontWeight: '800', fontSize: 18 }}>STREICHER</div><div style={{ fontSize: 11, opacity: 0.7 }}>Materials Manager</div></div>}
        </div>
        <div style={s.nav}>
          {navItems.map(item => (
            <div key={item.id} style={s.navItem(view === item.id)} onClick={() => setView(item.id)} onMouseEnter={e => { if (view !== item.id) e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }} onMouseLeave={e => { if (view !== item.id) e.currentTarget.style.background = 'transparent'; }}>
              <span style={{ fontSize: 18 }}>{item.icon}</span>
              {!sidebarCollapsed && <span style={{ flex: 1 }}>{item.label}</span>}
              {item.count > 0 && <span style={s.badge}>{item.count}</span>}
            </div>
          ))}
        </div>
        <div style={{ padding: 16, borderTop: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', textAlign: 'center' }} onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
          {sidebarCollapsed ? '→' : '← Collapse'}
        </div>
      </div>
      <div style={s.main}>
        <div style={s.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={s.headerIcon}>{navItems.find(n => n.id === view)?.icon}</div>
            <div><div style={{ fontSize: 22, fontWeight: '800', color: COLORS.secondary }}>{navItems.find(n => n.id === view)?.label.toUpperCase()}</div><div style={{ color: COLORS.accent, fontSize: 13 }}>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div></div>
          </div>
          <div style={{ fontSize: 13, color: COLORS.accent, fontWeight: '600' }}>V25 STREICHER Edition</div>
        </div>
        <div style={s.content}>
          {loading && <div style={{ textAlign: 'center', padding: 50 }}><div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div><div>Loading data...</div></div>}
          {error && <div style={s.alert('error')}>{error}</div>}
          {view === 'dashboard' && renderDashboard()}
          {view === 'newRequest' && renderNewRequest()}
          {view === 'whSite' && renderWHSite()}
          {view === 'whYard' && renderWHYard()}
          {view === 'siteIn' && renderSiteIn()}
          {view === 'recordOut' && renderRecordOut()}
          {view === 'mir' && renderMIR()}
          {view === 'materialIn' && renderMaterialIn()}
          {view === 'engineering' && renderEngineering()}
          {view === 'management' && renderManagement()}
          {view === 'movements' && renderMovements()}
          {view === 'database' && renderDatabase()}
          {view === 'status' && renderStatus()}
          {view === 'spare' && renderSpare()}
          {view === 'orders' && renderOrders()}
        </div>
      </div>
      {renderModal()}
    </div>
  );
}
