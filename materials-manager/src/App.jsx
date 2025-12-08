// ============================================================
// MATERIALS MANAGER V25 - STREICHER EDITION - COMPLETE
// ============================================================
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';
const supabase = createClient(supabaseUrl, supabaseKey);

const COLORS = {
  primary: '#E31E24', primaryDark: '#B91C1C', secondary: '#1F2937', accent: '#374151',
  light: '#F9FAFB', border: '#E5E7EB', success: '#16a34a', warning: '#D97706',
  info: '#2563EB', purple: '#7C3AED', pink: '#EC4899', cyan: '#0891B2',
  yellow: '#EAB308', orange: '#EA580C', gray: '#6B7280'
};

export default function MaterialsManager() {
  const [view, setView] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [requests, setRequests] = useState([]);
  const [components, setComponents] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [materials, setMaterials] = useState({});
  const [movements, setMovements] = useState([]);
  const [readyOut, setReadyOut] = useState([]);
  const [mirs, setMirs] = useState([]);
  const [ordersTab, setOrdersTab] = useState('toOrder');
  const [search, setSearch] = useState('');
  const [requestForm, setRequestForm] = useState({ name: '', badge: '', iso: '', spool: '', hf: '', cat: 'Bulk' });
  const [compForm, setCompForm] = useState({ code: '', qty: '' });
  const [tempComps, setTempComps] = useState([]);
  const [materialInForm, setMaterialInForm] = useState({ code: '', qty: '', mir: '', rk: '' });
  const [mirForm, setMirForm] = useState({ mir: '', rk: '', forecast: '', priority: 'Medium' });
  const [balanceForm, setBalanceForm] = useState({ type: 'Adjustment', loc: 'YARD', code: '', qty: '', name: '', badge: '', note: '' });
  const [splitModal, setSplitModal] = useState({ open: false, req: null, comp: null, loc: '' });
  const [splitForm, setSplitForm] = useState({ foundQty: '', remainDest: 'Yard' });
  const [noteModal, setNoteModal] = useState({ open: false, req: null, comp: null });
  const [noteForm, setNoteForm] = useState({ text: '', dest: 'Site' });
  const [movementModal, setMovementModal] = useState(false);
  const [movementForm, setMovementForm] = useState({ type: 'Lost', loc: 'YARD', code: '', qty: '', name: '', badge: '', note: '' });
  const [balanceModal, setBalanceModal] = useState(false);

  useEffect(() => { fetchAllData(); }, []);

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
      const map = {}; (mats.data || []).forEach(m => { map[m.code] = m.description; }); setMaterials(map);
      setMovements(movs.data || []);
      setReadyOut(ro.data || []);
      setMirs(mi.data || []);
    } catch (err) { setError('Error: ' + err.message); }
    setLoading(false);
  };

  const getInv = (loc) => { const inv = {}; inventory.filter(i => i.location === loc).forEach(i => { inv[i.material_code] = i.quantity; }); return inv; };
  const getCompsByStatus = (status) => components.filter(c => c.status === status).map(c => ({ ...c, req: requests.find(r => r.id === c.request_id) }));
  const formatReqNum = (num, sub) => `${num}-${sub || 0}`;
  const getNextSubNumber = (reqNum) => { const existing = requests.filter(r => r.request_number === reqNum); return existing.length === 0 ? 0 : Math.max(...existing.map(r => r.sub_number || 0)) + 1; };
  const showSuccess = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(null), 3000); };
  const showError = (msg) => { setError(msg); setTimeout(() => setError(null), 5000); };

  const yardInv = getInv('YARD');
  const siteInv = getInv('SITE');
  const lostInv = getInv('LOST');
  const brokenInv = getInv('BROKEN');
  
  const stats = {
    site: components.filter(c => c.status === 'Site').length,
    yard: components.filter(c => c.status === 'Yard').length,
    eng: components.filter(c => c.status === 'Eng').length,
    trans: components.filter(c => c.status === 'Trans').length,
    out: readyOut.filter(r => r.status === 'pending').length,
    mng: components.filter(c => c.status === 'Mng').length,
    order: components.filter(c => c.status === 'Order').length,
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
    const inv = fromLoc === 'Site' ? siteInv : yardInv;
    if ((inv[comp.material_code] || 0) < comp.quantity) { showError('Insufficient quantity!'); return; }
    try {
      await supabase.from('request_components').update({ status: 'Out' }).eq('id', comp.id);
      await supabase.from('inventory').update({ quantity: (inv[comp.material_code] || 0) - comp.quantity }).eq('material_code', comp.material_code).eq('location', fromLoc.toUpperCase());
      await supabase.from('ready_out').insert({ request_number: formatReqNum(req.request_number, req.sub_number), requester_name: req.requester_name, badge_number: req.badge_number, material_code: comp.material_code, description: materials[comp.material_code] || comp.material_code, quantity: comp.quantity, location: fromLoc.toUpperCase(), status: 'pending' });
      await supabase.from('movements').insert({ type: 'OUT', location: fromLoc.toUpperCase(), material_code: comp.material_code, quantity: comp.quantity, note: 'Ready OUT - ' + formatReqNum(req.request_number, req.sub_number) });
      showSuccess('Moved to Ready OUT!'); fetchAllData();
    } catch (err) { showError('Error: ' + err.message); }
  };

  const sendToDestination = async (req, comp, dest) => {
    try { await supabase.from('request_components').update({ status: dest }).eq('id', comp.id); showSuccess('Sent to ' + dest); fetchAllData(); } catch (err) { showError('Error: ' + err.message); }
  };

  const deleteComponent = async (req, comp) => {
    if (!confirm('Delete ' + comp.material_code + '?')) return;
    try { await supabase.from('request_components').delete().eq('id', comp.id); showSuccess('Deleted'); fetchAllData(); } catch (err) { showError('Error: ' + err.message); }
  };

  const returnComponent = async (req, comp, returnTo) => {
    try { await supabase.from('request_components').update({ status: returnTo }).eq('id', comp.id); showSuccess('Returned'); fetchAllData(); } catch (err) { showError('Error: ' + err.message); }
  };

  // ==================== SPLIT PARTIAL ====================
  const openSplitModal = (req, comp, loc) => { setSplitModal({ open: true, req, comp, loc }); setSplitForm({ foundQty: '', remainDest: 'Yard' }); };

  const processSplit = async () => {
    const { req, comp, loc } = splitModal;
    const found = parseInt(splitForm.foundQty);
    if (!found || found <= 0 || found >= comp.quantity) { showError('Qty must be 1 to ' + (comp.quantity - 1)); return; }
    const remaining = comp.quantity - found;
    try {
      await supabase.from('request_components').update({ quantity: found, status: 'Out' }).eq('id', comp.id);
      const inv = loc === 'Site' ? siteInv : yardInv;
      if ((inv[comp.material_code] || 0) >= found) await supabase.from('inventory').update({ quantity: (inv[comp.material_code] || 0) - found }).eq('material_code', comp.material_code).eq('location', loc.toUpperCase());
      await supabase.from('ready_out').insert({ request_number: formatReqNum(req.request_number, req.sub_number), requester_name: req.requester_name, badge_number: req.badge_number, material_code: comp.material_code, description: materials[comp.material_code] || '', quantity: found, location: loc.toUpperCase(), status: 'pending' });
      const newSub = getNextSubNumber(req.request_number);
      const { data: newReq } = await supabase.from('requests').insert({ request_number: req.request_number, sub_number: newSub, requester_name: req.requester_name, badge_number: req.badge_number, iso_drawing: req.iso_drawing, spool_number: req.spool_number, hf_number: req.hf_number, category: req.category }).select().single();
      await supabase.from('request_components').insert({ request_id: newReq.id, material_code: comp.material_code, quantity: remaining, status: splitForm.remainDest });
      await supabase.from('movements').insert({ type: 'SPLIT', location: loc.toUpperCase(), material_code: comp.material_code, quantity: found, note: 'Split: ' + found + ' OUT, ' + remaining + ' ' + splitForm.remainDest });
      setSplitModal({ open: false, req: null, comp: null, loc: '' }); showSuccess('Split OK! New: ' + req.request_number + '-' + newSub); fetchAllData();
    } catch (err) { showError('Error: ' + err.message); }
  };

  // ==================== ENGINEERING ====================
  const openNoteModal = (req, comp) => { setNoteModal({ open: true, req, comp }); setNoteForm({ text: '', dest: 'Site' }); };
  
  const sendEngNote = async () => {
    if (!noteForm.text.trim()) { showError('Enter note'); return; }
    try { await supabase.from('request_components').update({ eng_note: noteForm.text, eng_note_dest: noteForm.dest, status: noteForm.dest }).eq('id', noteModal.comp.id); setNoteModal({ open: false, req: null, comp: null }); showSuccess('Note sent'); fetchAllData(); } catch (err) { showError('Error: ' + err.message); }
  };

  const clearEngNote = async (comp) => {
    try { await supabase.from('request_components').update({ eng_note: null, eng_note_dest: null }).eq('id', comp.id); showSuccess('Note cleared'); fetchAllData(); } catch (err) { showError('Error: ' + err.message); }
  };

  // ==================== SITE IN ====================
  const confirmArrival = async (req, comp) => {
    try {
      await supabase.from('request_components').update({ status: 'Site' }).eq('id', comp.id);
      const cur = siteInv[comp.material_code] || 0;
      if (cur > 0) await supabase.from('inventory').update({ quantity: cur + comp.quantity }).eq('material_code', comp.material_code).eq('location', 'SITE');
      else await supabase.from('inventory').insert({ material_code: comp.material_code, location: 'SITE', quantity: comp.quantity });
      await supabase.from('movements').insert({ type: 'TRF', location: 'SITE', material_code: comp.material_code, quantity: comp.quantity, note: 'Arrival confirmed' });
      showSuccess('Confirmed'); fetchAllData();
    } catch (err) { showError('Error: ' + err.message); }
  };

  const rejectArrival = async (req, comp) => {
    if (!confirm('Reject?')) return;
    try {
      await supabase.from('request_components').update({ status: 'Yard' }).eq('id', comp.id);
      const cur = yardInv[comp.material_code] || 0;
      if (cur > 0) await supabase.from('inventory').update({ quantity: cur + comp.quantity }).eq('material_code', comp.material_code).eq('location', 'YARD');
      else await supabase.from('inventory').insert({ material_code: comp.material_code, location: 'YARD', quantity: comp.quantity });
      showSuccess('Rejected'); fetchAllData();
    } catch (err) { showError('Error: ' + err.message); }
  };

  // ==================== READY OUT ====================
  const deliverMaterial = async (item) => {
    try { await supabase.from('ready_out').update({ status: 'delivered', delivered_at: new Date().toISOString() }).eq('id', item.id); await supabase.from('movements').insert({ type: 'DEL', location: item.location, material_code: item.material_code, quantity: item.quantity, note: 'Delivered to ' + item.requester_name }); showSuccess('Delivered'); fetchAllData(); } catch (err) { showError('Error: ' + err.message); }
  };

  const cancelReadyOut = async (item) => {
    if (!confirm('Cancel?')) return;
    try { await supabase.from('ready_out').delete().eq('id', item.id); const cur = item.location === 'SITE' ? (siteInv[item.material_code] || 0) : (yardInv[item.material_code] || 0); await supabase.from('inventory').update({ quantity: cur + item.quantity }).eq('material_code', item.material_code).eq('location', item.location); showSuccess('Cancelled'); fetchAllData(); } catch (err) { showError('Error: ' + err.message); }
  };

  // ==================== SPARE PARTS ====================
  const spareHasStock = async (req, comp) => { await sendToDestination(req, comp, 'Site'); };
  const sparePurchase = async (req, comp) => { try { await supabase.from('request_components').update({ status: 'Order', order_type: 'Spare' }).eq('id', comp.id); showSuccess('To Orders (Spare)'); fetchAllData(); } catch (err) { showError('Error: ' + err.message); } };

  // ==================== MANAGEMENT ====================
  const mngOrderInternal = async (req, comp) => { try { await supabase.from('request_components').update({ status: 'Order', order_type: 'Internal' }).eq('id', comp.id); showSuccess('Internal Order'); fetchAllData(); } catch (err) { showError('Error: ' + err.message); } };
  const mngOrderClient = async (req, comp) => { try { await supabase.from('request_components').update({ status: 'Order', order_type: 'Client' }).eq('id', comp.id); showSuccess('Client Order'); fetchAllData(); } catch (err) { showError('Error: ' + err.message); } };

  // ==================== YARD ====================
  const transferToSite = async (req, comp) => {
    const avail = yardInv[comp.material_code] || 0;
    if (avail < comp.quantity) { showError('Insufficient'); return; }
    try { await supabase.from('request_components').update({ status: 'Trans' }).eq('id', comp.id); await supabase.from('inventory').update({ quantity: avail - comp.quantity }).eq('material_code', comp.material_code).eq('location', 'YARD'); await supabase.from('movements').insert({ type: 'TRF', location: 'YARD>SITE', material_code: comp.material_code, quantity: comp.quantity, note: 'Transfer' }); showSuccess('Transferred'); fetchAllData(); } catch (err) { showError('Error: ' + err.message); }
  };

  // ==================== MANUAL MOVEMENT ====================
  const openMovementModal = () => { setMovementModal(true); setMovementForm({ type: 'Lost', loc: 'YARD', code: '', qty: '', name: '', badge: '', note: '' }); };
  
  const registerManualMovement = async () => {
    const { type, loc, code, qty, name, badge, note } = movementForm;
    const quantity = parseInt(qty);
    if (!code || !quantity || !name || !badge) { showError('Fill fields'); return; }
    try {
      if (type === 'Lost' || type === 'Broken') {
        const inv = loc === 'YARD' ? yardInv : siteInv;
        if ((inv[code] || 0) < quantity) { showError('Insufficient'); return; }
        await supabase.from('inventory').update({ quantity: (inv[code] || 0) - quantity }).eq('material_code', code).eq('location', loc);
        const { data: ex } = await supabase.from('inventory').select('*').eq('material_code', code).eq('location', type.toUpperCase()).single();
        if (ex) await supabase.from('inventory').update({ quantity: ex.quantity + quantity }).eq('id', ex.id);
        else await supabase.from('inventory').insert({ material_code: code, location: type.toUpperCase(), quantity });
      } else {
        const inv = loc === 'YARD' ? yardInv : siteInv;
        if ((inv[code] || 0) > 0) await supabase.from('inventory').update({ quantity: (inv[code] || 0) + quantity }).eq('material_code', code).eq('location', loc);
        else await supabase.from('inventory').insert({ material_code: code, location: loc, quantity });
      }
      await supabase.from('movements').insert({ type: type === 'IN' ? 'IN' : 'BAL', location: loc, material_code: code, quantity: type === 'IN' ? quantity : -quantity, balance_type: type !== 'IN' ? type : null, note: note + ' - ' + name + ' (' + badge + ')' });
      setMovementModal(false); showSuccess('Movement OK'); fetchAllData();
    } catch (err) { showError('Error: ' + err.message); }
  };

  // ==================== REQUEST ====================
  const addTempComp = () => { if (!compForm.code || !compForm.qty) { showError('Select material'); return; } setTempComps([...tempComps, { code: compForm.code, qty: parseInt(compForm.qty), desc: materials[compForm.code] }]); setCompForm({ code: '', qty: '' }); };
  const removeTempComp = (idx) => { setTempComps(tempComps.filter((_, i) => i !== idx)); };
  
  const submitRequest = async (dest) => {
    if (!requestForm.name || !requestForm.badge || !requestForm.iso || !requestForm.spool) { showError('Fill fields'); return; }
    if (tempComps.length === 0) { showError('Add materials'); return; }
    try {
      const { data: last } = await supabase.from('requests').select('request_number').order('request_number', { ascending: false }).limit(1);
      const nextNum = last && last.length > 0 ? last[0].request_number + 1 : 1001;
      const { data: newReq } = await supabase.from('requests').insert({ request_number: nextNum, sub_number: 0, requester_name: requestForm.name, badge_number: requestForm.badge, iso_drawing: requestForm.iso, spool_number: requestForm.spool, hf_number: requestForm.hf, category: requestForm.cat }).select().single();
      for (const c of tempComps) await supabase.from('request_components').insert({ request_id: newReq.id, material_code: c.code, quantity: c.qty, status: dest });
      setRequestForm({ name: '', badge: '', iso: '', spool: '', hf: '', cat: 'Bulk' }); setTempComps([]); showSuccess('Request ' + nextNum + '-0 created'); fetchAllData();
    } catch (err) { showError('Error: ' + err.message); }
  };

  // ==================== MATERIAL IN ====================
  const loadMaterial = async () => {
    const { code, qty, mir } = materialInForm;
    const quantity = parseInt(qty);
    if (!code || !quantity) { showError('Select material'); return; }
    try {
      const cur = yardInv[code] || 0;
      if (cur > 0) await supabase.from('inventory').update({ quantity: cur + quantity }).eq('material_code', code).eq('location', 'YARD');
      else await supabase.from('inventory').insert({ material_code: code, location: 'YARD', quantity });
      if (mir) await supabase.from('mirs').update({ status: 'Received', received_qty: quantity }).eq('mir_number', mir);
      await supabase.from('movements').insert({ type: 'IN', location: 'YARD', material_code: code, quantity, note: mir ? 'MIR: ' + mir : 'Direct' });
      setMaterialInForm({ code: '', qty: '', mir: '', rk: '' }); showSuccess('Loaded'); fetchAllData();
    } catch (err) { showError('Error: ' + err.message); }
  };

  // ==================== MIR ====================
  const registerMir = async () => {
    const { mir, rk, forecast, priority } = mirForm;
    if (!mir || !rk) { showError('MIR and RK required'); return; }
    try { await supabase.from('mirs').insert({ mir_number: mir, rk_number: rk, forecast_date: forecast || null, priority, status: 'Pending' }); setMirForm({ mir: '', rk: '', forecast: '', priority: 'Medium' }); showSuccess('MIR registered'); fetchAllData(); } catch (err) { showError('Error: ' + err.message); }
  };

  // ==================== BALANCE ====================
  const saveBalance = async () => {
    const { type, loc, code, qty, name, badge, note } = balanceForm;
    const quantity = parseInt(qty);
    if (!code || !quantity || !name || !badge) { showError('Fill fields'); return; }
    try {
      const inv = loc === 'YARD' ? yardInv : siteInv;
      const cur = inv[code] || 0;
      if (type === 'Lost' || type === 'Broken') {
        if (cur < quantity) { showError('Insufficient'); return; }
        await supabase.from('inventory').update({ quantity: cur - quantity }).eq('material_code', code).eq('location', loc);
        const { data: ex } = await supabase.from('inventory').select('*').eq('material_code', code).eq('location', type.toUpperCase()).single();
        if (ex) await supabase.from('inventory').update({ quantity: ex.quantity + quantity }).eq('id', ex.id);
        else await supabase.from('inventory').insert({ material_code: code, location: type.toUpperCase(), quantity });
      } else {
        const newQty = cur + quantity;
        if (newQty < 0) { showError('Cannot be negative'); return; }
        if (cur > 0) await supabase.from('inventory').update({ quantity: newQty }).eq('material_code', code).eq('location', loc);
        else await supabase.from('inventory').insert({ material_code: code, location: loc, quantity: newQty });
      }
      await supabase.from('movements').insert({ type: 'BAL', location: loc, material_code: code, quantity: type === 'Adjustment' ? quantity : -quantity, balance_type: type, note: note + ' - ' + name });
      setBalanceModal(false); showSuccess('Balance saved'); fetchAllData();
    } catch (err) { showError('Error: ' + err.message); }
  };

  // ==================== ORDERS ====================
  const placeOrder = async (comp, urgent = false) => { try { await supabase.from('request_components').update({ status: 'Ordered', order_urgent: urgent, ordered_at: new Date().toISOString() }).eq('id', comp.id); showSuccess(urgent ? 'Urgent!' : 'Ordered'); fetchAllData(); } catch (err) { showError('Error: ' + err.message); } };
  
  const receiveOrder = async (comp) => {
    try {
      const cur = yardInv[comp.material_code] || 0;
      if (cur > 0) await supabase.from('inventory').update({ quantity: cur + comp.quantity }).eq('material_code', comp.material_code).eq('location', 'YARD');
      else await supabase.from('inventory').insert({ material_code: comp.material_code, location: 'YARD', quantity: comp.quantity });
      await supabase.from('request_components').update({ status: 'Yard' }).eq('id', comp.id);
      await supabase.from('movements').insert({ type: 'IN', location: 'YARD', material_code: comp.material_code, quantity: comp.quantity, note: 'Order received' });
      showSuccess('Received'); fetchAllData();
    } catch (err) { showError('Error: ' + err.message); }
  };

  // ==================== STYLES ====================
  const s = {
    app: { display: 'flex', height: '100vh', fontSize: 14, fontFamily: 'system-ui, -apple-system, sans-serif', background: '#F3F4F6' },
    sidebar: { width: sidebarCollapsed ? 70 : 260, background: 'linear-gradient(180deg, #1F2937 0%, #111827 100%)', color: '#fff', display: 'flex', flexDirection: 'column', transition: 'width 0.3s' },
    logoArea: { padding: sidebarCollapsed ? '16px 10px' : '20px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 12 },
    logoIcon: { width: 40, height: 40, background: COLORS.primary, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: 14, flexShrink: 0 },
    nav: { flex: 1, overflowY: 'auto', padding: '8px 0' },
    navItem: (active) => ({ padding: sidebarCollapsed ? '12px' : '10px 16px', cursor: 'pointer', background: active ? COLORS.primary : 'transparent', borderRadius: sidebarCollapsed ? 8 : '0 20px 20px 0', marginRight: sidebarCollapsed ? 8 : 12, marginLeft: sidebarCollapsed ? 8 : 0, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, fontWeight: active ? '600' : '400' }),
    navBadge: { background: 'rgba(255,255,255,0.2)', borderRadius: 10, padding: '2px 8px', fontSize: 11, fontWeight: '600', minWidth: 20, textAlign: 'center' },
    main: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
    header: { background: '#fff', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E5E7EB' },
    content: { flex: 1, padding: 24, overflowY: 'auto' },
    card: { background: '#fff', borderRadius: 12, padding: 20, marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
    cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.secondary, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { background: COLORS.secondary, color: '#fff', padding: '12px 14px', textAlign: 'left', fontWeight: '600', fontSize: 12, textTransform: 'uppercase' },
    td: { padding: '12px 14px', borderBottom: '1px solid #E5E7EB', fontSize: 13 },
    btn: (color) => ({ padding: '10px 20px', background: color, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: 8 }),
    btnSmall: (color, disabled) => ({ width: 30, height: 30, background: disabled ? '#ccc' : color, color: '#fff', border: 'none', borderRadius: 6, cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 11, fontWeight: '700', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }),
    input: { padding: '10px 14px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14, width: '100%', boxSizing: 'border-box' },
    select: { padding: '10px 14px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14, background: '#fff', width: '100%' },
    formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 16 },
    label: { fontSize: 12, fontWeight: '600', color: COLORS.accent, marginBottom: 6, display: 'block' },
    modal: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modalBox: { background: '#fff', padding: 24, borderRadius: 16, minWidth: 400, maxWidth: '90%', maxHeight: '85vh', overflow: 'auto' },
    alert: (type) => ({ padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontWeight: '500', background: type === 'error' ? '#FEE2E2' : '#D1FAE5', color: type === 'error' ? '#DC2626' : '#059669' }),
    dashBox: (color) => ({ background: color, color: '#fff', padding: 16, borderRadius: 12, textAlign: 'center', cursor: 'pointer' }),
    statusBadge: (color) => ({ display: 'inline-block', padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: '600', background: color + '20', color: color }),
    engNote: { background: '#F3E8FF', border: '1px solid #C084FC', borderRadius: 8, padding: 12, marginBottom: 16 }
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
    { id: 'orders', label: 'Orders', icon: '🛒', count: stats.order },
    { id: 'database', label: 'Database', icon: '🗄️' },
    { id: 'status', label: 'Status', icon: '🔍' },
    { id: 'movements', label: 'Movements', icon: '📜' }
  ];

  // ==================== RENDER FUNCTIONS ====================
  const renderDashboard = () => (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 20 }}>
        <div style={s.dashBox(COLORS.secondary)} onClick={() => setView('whYard')}><div style={{ fontSize: 11, opacity: 0.8 }}>YARD Items</div><div style={{ fontSize: 28, fontWeight: '700' }}>{yardItems}</div></div>
        <div style={s.dashBox('#374151')} onClick={() => setView('whYard')}><div style={{ fontSize: 11, opacity: 0.8 }}>YARD Qty</div><div style={{ fontSize: 28, fontWeight: '700' }}>{yardQty}</div></div>
        <div style={s.dashBox(COLORS.info)} onClick={() => setView('whSite')}><div style={{ fontSize: 11, opacity: 0.8 }}>SITE Items</div><div style={{ fontSize: 28, fontWeight: '700' }}>{siteItems}</div></div>
        <div style={s.dashBox('#3B82F6')} onClick={() => setView('whSite')}><div style={{ fontSize: 11, opacity: 0.8 }}>SITE Qty</div><div style={{ fontSize: 28, fontWeight: '700' }}>{siteQty}</div></div>
        <div style={s.dashBox(COLORS.orange)}><div style={{ fontSize: 11, opacity: 0.8 }}>LOST</div><div style={{ fontSize: 28, fontWeight: '700' }}>{stats.lost}</div></div>
        <div style={s.dashBox(COLORS.purple)}><div style={{ fontSize: 11, opacity: 0.8 }}>BROKEN</div><div style={{ fontSize: 28, fontWeight: '700' }}>{stats.broken}</div></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        <div style={{ ...s.card, cursor: 'pointer' }} onClick={() => setView('siteIn')}><div style={{ color: COLORS.gray, fontSize: 12 }}>In Transit</div><div style={{ fontSize: 24, fontWeight: '700', color: COLORS.warning }}>{stats.trans}</div></div>
        <div style={{ ...s.card, cursor: 'pointer' }} onClick={() => setView('engineering')}><div style={{ color: COLORS.gray, fontSize: 12 }}>Engineering</div><div style={{ fontSize: 24, fontWeight: '700', color: COLORS.purple }}>{stats.eng}</div></div>
        <div style={{ ...s.card, cursor: 'pointer' }} onClick={() => setView('orders')}><div style={{ color: COLORS.gray, fontSize: 12 }}>To Order</div><div style={{ fontSize: 24, fontWeight: '700', color: COLORS.cyan }}>{stats.order}</div></div>
        <div style={{ ...s.card, cursor: 'pointer' }} onClick={() => setView('recordOut')}><div style={{ color: COLORS.gray, fontSize: 12 }}>Ready OUT</div><div style={{ fontSize: 24, fontWeight: '700', color: COLORS.success }}>{stats.out}</div></div>
      </div>
      <div style={s.card}>
        <div style={s.cardTitle}>📜 Recent Movements</div>
        <table style={s.table}>
          <thead><tr><th style={s.th}>Date</th><th style={s.th}>Type</th><th style={s.th}>Code</th><th style={s.th}>Qty</th><th style={s.th}>Location</th></tr></thead>
          <tbody>
            {movements.slice(0, 8).map((m, i) => (
              <tr key={i}><td style={s.td}>{new Date(m.created_at).toLocaleDateString()}</td><td style={s.td}><span style={s.statusBadge(m.type === 'IN' ? COLORS.success : m.type === 'OUT' ? COLORS.primary : COLORS.warning)}>{m.type}</span></td><td style={{ ...s.td, fontFamily: 'monospace', fontWeight: '600' }}>{m.material_code}</td><td style={s.td}>{m.quantity}</td><td style={s.td}>{m.location}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderWHSite = () => {
    const comps = getCompsByStatus('Site');
    const withNotes = comps.filter(c => c.eng_note && c.eng_note_dest === 'Site');
    return (
      <div>
        {withNotes.length > 0 && (
          <div style={s.engNote}>
            <div style={{ fontWeight: '700', color: COLORS.purple, marginBottom: 8 }}>🔔 Engineering Notes</div>
            {withNotes.map((c, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < withNotes.length - 1 ? '1px solid #DDD6FE' : 'none' }}>
                <div><strong>{c.material_code}</strong>: {c.eng_note}</div>
                <button style={s.btnSmall(COLORS.success)} onClick={() => clearEngNote(c)}>✓</button>
              </div>
            ))}
          </div>
        )}
        <div style={s.card}>
          <div style={s.cardTitle}>🏭 WH Site Components</div>
          <table style={s.table}>
            <thead><tr><th style={s.th}>Request</th><th style={s.th}>Code</th><th style={s.th}>Description</th><th style={s.th}>Qty</th><th style={s.th}>Category</th><th style={s.th}>Actions</th></tr></thead>
            <tbody>
              {comps.map((c, i) => (
                <tr key={i}>
                  <td style={{ ...s.td, fontFamily: 'monospace', fontWeight: '700' }}>{c.req ? formatReqNum(c.req.request_number, c.req.sub_number) : '-'}</td>
                  <td style={{ ...s.td, fontFamily: 'monospace' }}>{c.material_code}</td>
                  <td style={s.td}>{materials[c.material_code] || '-'}</td>
                  <td style={s.td}>{c.quantity}</td>
                  <td style={s.td}>{c.req?.category || '-'}</td>
                  <td style={s.td}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button style={s.btnSmall(COLORS.success)} onClick={() => moveToOut(c.req, c, 'Site')} title="Ready OUT">✓</button>
                      <button style={s.btnSmall(COLORS.warning)} onClick={() => openSplitModal(c.req, c, 'Site')} title="Split">PT</button>
                      <button style={s.btnSmall(COLORS.secondary)} onClick={() => sendToDestination(c.req, c, 'Yard')} title="To Yard">Y</button>
                      <button style={s.btnSmall(COLORS.purple)} onClick={() => sendToDestination(c.req, c, 'Eng')} title="To Engineering">UT</button>
                      <button style={s.btnSmall(COLORS.gray)} onClick={() => returnComponent(c.req, c, 'Yard')} title="Return">↩</button>
                      <button style={s.btnSmall(COLORS.primary)} onClick={() => deleteComponent(c.req, c)} title="Delete">🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
              {comps.length === 0 && <tr><td colSpan="6" style={{ ...s.td, textAlign: 'center', color: COLORS.gray }}>No components</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderWHYard = () => {
    const comps = getCompsByStatus('Yard');
    const withNotes = comps.filter(c => c.eng_note && c.eng_note_dest === 'Yard');
    return (
      <div>
        {withNotes.length > 0 && (
          <div style={s.engNote}>
            <div style={{ fontWeight: '700', color: COLORS.purple, marginBottom: 8 }}>🔔 Engineering Notes</div>
            {withNotes.map((c, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < withNotes.length - 1 ? '1px solid #DDD6FE' : 'none' }}>
                <div><strong>{c.material_code}</strong>: {c.eng_note}</div>
                <button style={s.btnSmall(COLORS.success)} onClick={() => clearEngNote(c)}>✓</button>
              </div>
            ))}
          </div>
        )}
        <div style={s.card}>
          <div style={s.cardTitle}>🏗️ WH Yard Components</div>
          <table style={s.table}>
            <thead><tr><th style={s.th}>Request</th><th style={s.th}>Code</th><th style={s.th}>Description</th><th style={s.th}>Qty Req</th><th style={s.th}>Available</th><th style={s.th}>Actions</th></tr></thead>
            <tbody>
              {comps.map((c, i) => {
                const avail = yardInv[c.material_code] || 0;
                const sufficient = avail >= c.quantity;
                return (
                  <tr key={i}>
                    <td style={{ ...s.td, fontFamily: 'monospace', fontWeight: '700' }}>{c.req ? formatReqNum(c.req.request_number, c.req.sub_number) : '-'}</td>
                    <td style={{ ...s.td, fontFamily: 'monospace' }}>{c.material_code}</td>
                    <td style={s.td}>{materials[c.material_code] || '-'}</td>
                    <td style={s.td}>{c.quantity}</td>
                    <td style={{ ...s.td, color: sufficient ? COLORS.success : COLORS.primary, fontWeight: '700' }}>{avail}</td>
                    <td style={s.td}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button style={s.btnSmall(COLORS.success, !sufficient)} onClick={() => sufficient && transferToSite(c.req, c)} title="Transfer to Site">✓</button>
                        <button style={s.btnSmall(COLORS.warning)} onClick={() => openSplitModal(c.req, c, 'Yard')} title="Split">PT</button>
                        <button style={s.btnSmall(COLORS.purple)} onClick={() => sendToDestination(c.req, c, 'Eng')} title="To Engineering">UT</button>
                        <button style={s.btnSmall(COLORS.gray)} onClick={() => returnComponent(c.req, c, 'Site')} title="Return">↩</button>
                        <button style={s.btnSmall(COLORS.primary)} onClick={() => deleteComponent(c.req, c)} title="Delete">🗑</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {comps.length === 0 && <tr><td colSpan="6" style={{ ...s.td, textAlign: 'center', color: COLORS.gray }}>No components</td></tr>}
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
          <thead><tr><th style={s.th}>Request</th><th style={s.th}>Code</th><th style={s.th}>Description</th><th style={s.th}>Qty</th><th style={s.th}>Category</th><th style={s.th}>Actions</th></tr></thead>
          <tbody>
            {comps.map((c, i) => (
              <tr key={i}>
                <td style={{ ...s.td, fontFamily: 'monospace', fontWeight: '700' }}>{c.req ? formatReqNum(c.req.request_number, c.req.sub_number) : '-'}</td>
                <td style={{ ...s.td, fontFamily: 'monospace' }}>{c.material_code}</td>
                <td style={s.td}>{materials[c.material_code] || '-'}</td>
                <td style={s.td}>{c.quantity}</td>
                <td style={s.td}><span style={s.statusBadge(c.req?.category === 'Erection Material' ? COLORS.info : c.req?.category === 'Support' ? COLORS.purple : COLORS.gray)}>{c.req?.category || '-'}</span></td>
                <td style={s.td}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button style={s.btnSmall(COLORS.success)} onClick={() => sendToDestination(c.req, c, 'Site')} title="Resolved">✓</button>
                    <button style={s.btnSmall(COLORS.warning)} onClick={() => openSplitModal(c.req, c, 'Eng')} title="Split">PT</button>
                    <button style={s.btnSmall(COLORS.info)} onClick={() => openNoteModal(c.req, c)} title="Send Note">🔍</button>
                    <button style={s.btnSmall(COLORS.pink)} onClick={() => sendToDestination(c.req, c, 'Spare')} title="Spare Parts">Sp</button>
                    <button style={s.btnSmall(COLORS.yellow)} onClick={() => sendToDestination(c.req, c, 'Mng')} title="Management">Mng</button>
                    <button style={s.btnSmall(COLORS.gray)} onClick={() => returnComponent(c.req, c, 'Site')} title="Return">↩</button>
                    <button style={s.btnSmall(COLORS.primary)} onClick={() => deleteComponent(c.req, c)} title="Delete">🗑</button>
                  </div>
                </td>
              </tr>
            ))}
            {comps.length === 0 && <tr><td colSpan="6" style={{ ...s.td, textAlign: 'center', color: COLORS.gray }}>No components</td></tr>}
          </tbody>
        </table>
      </div>
    );
  };

  const renderSiteIn = () => {
    const comps = getCompsByStatus('Trans');
    return (
      <div style={s.card}>
        <div style={s.cardTitle}>🚚 Site IN - Materials in Transit</div>
        <table style={s.table}>
          <thead><tr><th style={s.th}>Request</th><th style={s.th}>Code</th><th style={s.th}>Description</th><th style={s.th}>Qty</th><th style={s.th}>Actions</th></tr></thead>
          <tbody>
            {comps.map((c, i) => (
              <tr key={i}>
                <td style={{ ...s.td, fontFamily: 'monospace', fontWeight: '700' }}>{c.req ? formatReqNum(c.req.request_number, c.req.sub_number) : '-'}</td>
                <td style={{ ...s.td, fontFamily: 'monospace' }}>{c.material_code}</td>
                <td style={s.td}>{materials[c.material_code] || '-'}</td>
                <td style={s.td}>{c.quantity}</td>
                <td style={s.td}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button style={s.btnSmall(COLORS.success)} onClick={() => confirmArrival(c.req, c)} title="Confirm">✓</button>
                    <button style={s.btnSmall(COLORS.primary)} onClick={() => rejectArrival(c.req, c)} title="Reject">↩</button>
                  </div>
                </td>
              </tr>
            ))}
            {comps.length === 0 && <tr><td colSpan="5" style={{ ...s.td, textAlign: 'center', color: COLORS.gray }}>No materials in transit</td></tr>}
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
          <thead><tr><th style={s.th}>Request</th><th style={s.th}>Requester</th><th style={s.th}>Code</th><th style={s.th}>Qty</th><th style={s.th}>Location</th><th style={s.th}>Actions</th></tr></thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i}>
                <td style={{ ...s.td, fontFamily: 'monospace', fontWeight: '700' }}>{item.request_number}</td>
                <td style={s.td}>{item.requester_name} ({item.badge_number})</td>
                <td style={{ ...s.td, fontFamily: 'monospace' }}>{item.material_code}</td>
                <td style={s.td}>{item.quantity}</td>
                <td style={s.td}>{item.location}</td>
                <td style={s.td}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button style={s.btnSmall(COLORS.success)} onClick={() => deliverMaterial(item)} title="Deliver">✓</button>
                    <button style={s.btnSmall(COLORS.primary)} onClick={() => cancelReadyOut(item)} title="Cancel">🗑</button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan="6" style={{ ...s.td, textAlign: 'center', color: COLORS.gray }}>No items ready</td></tr>}
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
          <thead><tr><th style={s.th}>Request</th><th style={s.th}>Code</th><th style={s.th}>Description</th><th style={s.th}>Qty</th><th style={s.th}>Actions</th></tr></thead>
          <tbody>
            {comps.map((c, i) => (
              <tr key={i}>
                <td style={{ ...s.td, fontFamily: 'monospace', fontWeight: '700' }}>{c.req ? formatReqNum(c.req.request_number, c.req.sub_number) : '-'}</td>
                <td style={{ ...s.td, fontFamily: 'monospace' }}>{c.material_code}</td>
                <td style={s.td}>{materials[c.material_code] || '-'}</td>
                <td style={s.td}>{c.quantity}</td>
                <td style={s.td}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button style={s.btnSmall(COLORS.success)} onClick={() => spareHasStock(c.req, c)} title="Has Stock">✓</button>
                    <button style={s.btnSmall(COLORS.cyan)} onClick={() => sparePurchase(c.req, c)} title="Purchase">🛒</button>
                  </div>
                </td>
              </tr>
            ))}
            {comps.length === 0 && <tr><td colSpan="5" style={{ ...s.td, textAlign: 'center', color: COLORS.gray }}>No spare parts requests</td></tr>}
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
          <thead><tr><th style={s.th}>Request</th><th style={s.th}>Code</th><th style={s.th}>Description</th><th style={s.th}>Qty</th><th style={s.th}>Actions</th></tr></thead>
          <tbody>
            {comps.map((c, i) => (
              <tr key={i}>
                <td style={{ ...s.td, fontFamily: 'monospace', fontWeight: '700' }}>{c.req ? formatReqNum(c.req.request_number, c.req.sub_number) : '-'}</td>
                <td style={{ ...s.td, fontFamily: 'monospace' }}>{c.material_code}</td>
                <td style={s.td}>{materials[c.material_code] || '-'}</td>
                <td style={s.td}>{c.quantity}</td>
                <td style={s.td}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button style={s.btnSmall(COLORS.info)} onClick={() => mngOrderInternal(c.req, c)} title="Internal Order">🏢</button>
                    <button style={s.btnSmall(COLORS.cyan)} onClick={() => mngOrderClient(c.req, c)} title="Client Order">👤</button>
                  </div>
                </td>
              </tr>
            ))}
            {comps.length === 0 && <tr><td colSpan="5" style={{ ...s.td, textAlign: 'center', color: COLORS.gray }}>No pending decisions</td></tr>}
          </tbody>
        </table>
      </div>
    );
  };

  const renderMIR = () => (
    <div>
      <div style={s.card}>
        <div style={s.cardTitle}>📋 Register New MIR</div>
        <div style={s.formGrid}>
          <div><label style={s.label}>MIR Number *</label><input style={s.input} value={mirForm.mir} onChange={e => setMirForm({ ...mirForm, mir: e.target.value })} /></div>
          <div><label style={s.label}>RK Number *</label><input style={s.input} value={mirForm.rk} onChange={e => setMirForm({ ...mirForm, rk: e.target.value })} /></div>
          <div><label style={s.label}>Forecast Date</label><input type="date" style={s.input} value={mirForm.forecast} onChange={e => setMirForm({ ...mirForm, forecast: e.target.value })} /></div>
          <div><label style={s.label}>Priority</label><select style={s.select} value={mirForm.priority} onChange={e => setMirForm({ ...mirForm, priority: e.target.value })}><option>Low</option><option>Medium</option><option>High</option></select></div>
        </div>
        <button style={s.btn(COLORS.primary)} onClick={registerMir}>📋 Register MIR</button>
      </div>
      <div style={s.card}>
        <div style={s.cardTitle}>📦 Pending MIRs</div>
        <table style={s.table}>
          <thead><tr><th style={s.th}>MIR</th><th style={s.th}>RK</th><th style={s.th}>Forecast</th><th style={s.th}>Priority</th><th style={s.th}>Status</th></tr></thead>
          <tbody>
            {mirs.filter(m => m.status === 'Pending').map((m, i) => (
              <tr key={i}><td style={s.td}>{m.mir_number}</td><td style={s.td}>{m.rk_number}</td><td style={s.td}>{m.forecast_date || '-'}</td><td style={s.td}><span style={s.statusBadge(m.priority === 'High' ? COLORS.primary : m.priority === 'Medium' ? COLORS.warning : COLORS.gray)}>{m.priority}</span></td><td style={s.td}><span style={s.statusBadge(COLORS.warning)}>{m.status}</span></td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderMaterialIn = () => (
    <div style={s.card}>
      <div style={s.cardTitle}>📥 Material IN - Load to Yard</div>
      <div style={s.formGrid}>
        <div><label style={s.label}>Material Code *</label><select style={s.select} value={materialInForm.code} onChange={e => setMaterialInForm({ ...materialInForm, code: e.target.value })}><option value="">Select...</option>{Object.keys(materials).map(k => <option key={k} value={k}>{k} - {materials[k]}</option>)}</select></div>
        <div><label style={s.label}>Quantity *</label><input type="number" style={s.input} value={materialInForm.qty} onChange={e => setMaterialInForm({ ...materialInForm, qty: e.target.value })} /></div>
        <div><label style={s.label}>MIR Reference</label><select style={s.select} value={materialInForm.mir} onChange={e => setMaterialInForm({ ...materialInForm, mir: e.target.value })}><option value="">None</option>{mirs.filter(m => m.status === 'Pending').map(m => <option key={m.mir_number} value={m.mir_number}>{m.mir_number}</option>)}</select></div>
      </div>
      <button style={s.btn(COLORS.success)} onClick={loadMaterial}>📥 Load Material</button>
    </div>
  );

  const renderNewRequest = () => (
    <div>
      <div style={s.card}>
        <div style={s.cardTitle}>📝 New Request</div>
        <div style={s.formGrid}>
          <div><label style={s.label}>Name *</label><input style={s.input} value={requestForm.name} onChange={e => setRequestForm({ ...requestForm, name: e.target.value })} /></div>
          <div><label style={s.label}>Badge *</label><input style={s.input} value={requestForm.badge} onChange={e => setRequestForm({ ...requestForm, badge: e.target.value })} /></div>
          <div><label style={s.label}>ISO Drawing *</label><input style={s.input} value={requestForm.iso} onChange={e => setRequestForm({ ...requestForm, iso: e.target.value })} /></div>
          <div><label style={s.label}>Spool *</label><input style={s.input} value={requestForm.spool} onChange={e => setRequestForm({ ...requestForm, spool: e.target.value })} /></div>
          <div><label style={s.label}>HF</label><input style={s.input} value={requestForm.hf} onChange={e => setRequestForm({ ...requestForm, hf: e.target.value })} /></div>
          <div><label style={s.label}>Category</label><select style={s.select} value={requestForm.cat} onChange={e => setRequestForm({ ...requestForm, cat: e.target.value })}><option>Bulk</option><option>Erection Material</option><option>Support</option></select></div>
        </div>
      </div>
      <div style={s.card}>
        <div style={s.cardTitle}>📦 Add Materials</div>
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <select style={{ ...s.select, flex: 2 }} value={compForm.code} onChange={e => setCompForm({ ...compForm, code: e.target.value })}><option value="">Select material...</option>{Object.keys(materials).map(k => <option key={k} value={k}>{k} - {materials[k]}</option>)}</select>
          <input type="number" style={{ ...s.input, flex: 1 }} placeholder="Qty" value={compForm.qty} onChange={e => setCompForm({ ...compForm, qty: e.target.value })} />
          <button style={s.btn(COLORS.info)} onClick={addTempComp}>+ Add</button>
        </div>
        {tempComps.length > 0 && (
          <table style={s.table}>
            <thead><tr><th style={s.th}>Code</th><th style={s.th}>Description</th><th style={s.th}>Qty</th><th style={s.th}></th></tr></thead>
            <tbody>
              {tempComps.map((c, i) => (
                <tr key={i}><td style={s.td}>{c.code}</td><td style={s.td}>{c.desc}</td><td style={s.td}>{c.qty}</td><td style={s.td}><button style={s.btnSmall(COLORS.primary)} onClick={() => removeTempComp(i)}>✕</button></td></tr>
              ))}
            </tbody>
          </table>
        )}
        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
          <button style={s.btn(COLORS.purple)} onClick={() => submitRequest('Eng')}>🔧 To Engineering</button>
          <button style={s.btn(COLORS.info)} onClick={() => submitRequest('Site')}>🏭 To Site</button>
          <button style={s.btn(COLORS.secondary)} onClick={() => submitRequest('Yard')}>🏗️ To Yard</button>
        </div>
      </div>
    </div>
  );

  const renderOrders = () => {
    const toOrder = components.filter(c => c.status === 'Order');
    const ordered = components.filter(c => c.status === 'Ordered');
    return (
      <div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button style={{ ...s.btn(ordersTab === 'toOrder' ? COLORS.primary : COLORS.gray), padding: '8px 16px' }} onClick={() => setOrdersTab('toOrder')}>To Order ({toOrder.length})</button>
          <button style={{ ...s.btn(ordersTab === 'ordered' ? COLORS.primary : COLORS.gray), padding: '8px 16px' }} onClick={() => setOrdersTab('ordered')}>Ordered ({ordered.length})</button>
          <button style={{ ...s.btn(ordersTab === 'log' ? COLORS.primary : COLORS.gray), padding: '8px 16px' }} onClick={() => setOrdersTab('log')}>Log</button>
        </div>
        <div style={s.card}>
          {ordersTab === 'toOrder' && (
            <>
              <div style={s.cardTitle}>🛒 To Order</div>
              <table style={s.table}>
                <thead><tr><th style={s.th}>Request</th><th style={s.th}>Code</th><th style={s.th}>Qty</th><th style={s.th}>Type</th><th style={s.th}>Actions</th></tr></thead>
                <tbody>
                  {toOrder.map((c, i) => {
                    const req = requests.find(r => r.id === c.request_id);
                    return (
                      <tr key={i}><td style={s.td}>{req ? formatReqNum(req.request_number, req.sub_number) : '-'}</td><td style={s.td}>{c.material_code}</td><td style={s.td}>{c.quantity}</td><td style={s.td}><span style={s.statusBadge(c.order_type === 'Client' ? COLORS.cyan : c.order_type === 'Spare' ? COLORS.pink : COLORS.info)}>{c.order_type || 'Internal'}</span></td><td style={s.td}><div style={{ display: 'flex', gap: 4 }}><button style={s.btnSmall(COLORS.success)} onClick={() => placeOrder(c)}>🛒</button><button style={s.btnSmall(COLORS.primary)} onClick={() => placeOrder(c, true)}>⚡</button></div></td></tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}
          {ordersTab === 'ordered' && (
            <>
              <div style={s.cardTitle}>📦 Ordered</div>
              <table style={s.table}>
                <thead><tr><th style={s.th}>Request</th><th style={s.th}>Code</th><th style={s.th}>Qty</th><th style={s.th}>Urgent</th><th style={s.th}>Actions</th></tr></thead>
                <tbody>
                  {ordered.map((c, i) => {
                    const req = requests.find(r => r.id === c.request_id);
                    return (
                      <tr key={i}><td style={s.td}>{req ? formatReqNum(req.request_number, req.sub_number) : '-'}</td><td style={s.td}>{c.material_code}</td><td style={s.td}>{c.quantity}</td><td style={s.td}>{c.order_urgent ? <span style={s.statusBadge(COLORS.primary)}>URGENT</span> : '-'}</td><td style={s.td}><button style={s.btnSmall(COLORS.success)} onClick={() => receiveOrder(c)}>✓</button></td></tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}
          {ordersTab === 'log' && (
            <>
              <div style={s.cardTitle}>📜 Order Log</div>
              <p style={{ color: COLORS.gray }}>Order history coming soon...</p>
            </>
          )}
        </div>
      </div>
    );
  };

  const renderDatabase = () => {
    const allCodes = [...new Set([...Object.keys(yardInv), ...Object.keys(siteInv), ...Object.keys(lostInv), ...Object.keys(brokenInv)])];
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <button style={s.btn(COLORS.info)} onClick={() => setBalanceModal(true)}>⚖️ Manual Balance</button>
        </div>
        <div style={s.card}>
          <div style={s.cardTitle}>🗄️ Inventory Database</div>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Code</th>
                <th style={s.th}>Description</th>
                <th style={{ ...s.th, background: COLORS.secondary, textAlign: 'center' }}>YARD</th>
                <th style={{ ...s.th, background: COLORS.info, textAlign: 'center' }}>SITE</th>
                <th style={{ ...s.th, background: COLORS.orange, textAlign: 'center' }}>LOST</th>
                <th style={{ ...s.th, background: COLORS.purple, textAlign: 'center' }}>BROKEN</th>
                <th style={{ ...s.th, textAlign: 'center' }}>TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {allCodes.map((code, i) => {
                const y = yardInv[code] || 0;
                const si = siteInv[code] || 0;
                const l = lostInv[code] || 0;
                const b = brokenInv[code] || 0;
                return (
                  <tr key={i}>
                    <td style={{ ...s.td, fontFamily: 'monospace', fontWeight: '700' }}>{code}</td>
                    <td style={s.td}>{materials[code] || '-'}</td>
                    <td style={{ ...s.td, textAlign: 'center', fontWeight: '700' }}>{y}</td>
                    <td style={{ ...s.td, textAlign: 'center', fontWeight: '700' }}>{si}</td>
                    <td style={{ ...s.td, textAlign: 'center', fontWeight: '700' }}>{l}</td>
                    <td style={{ ...s.td, textAlign: 'center', fontWeight: '700' }}>{b}</td>
                    <td style={{ ...s.td, textAlign: 'center', fontWeight: '700', color: COLORS.primary }}>{y + si + l + b}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderStatus = () => {
    const filtered = requests.filter(r => !search || formatReqNum(r.request_number, r.sub_number).includes(search) || r.requester_name?.toLowerCase().includes(search.toLowerCase()));
    return (
      <div style={s.card}>
        <div style={s.cardTitle}>🔍 Request Status Tracker</div>
        <div style={{ marginBottom: 16 }}>
          <input style={s.input} placeholder="Search by request number or name..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <table style={s.table}>
          <thead><tr><th style={s.th}>Request</th><th style={s.th}>Name</th><th style={s.th}>Badge</th><th style={s.th}>ISO</th><th style={s.th}>Spool</th><th style={s.th}>Category</th><th style={s.th}>Components</th></tr></thead>
          <tbody>
            {filtered.slice(0, 50).map((r, i) => {
              const comps = components.filter(c => c.request_id === r.id);
              return (
                <tr key={i}><td style={{ ...s.td, fontFamily: 'monospace', fontWeight: '700' }}>{formatReqNum(r.request_number, r.sub_number)}</td><td style={s.td}>{r.requester_name}</td><td style={s.td}>{r.badge_number}</td><td style={s.td}>{r.iso_drawing}</td><td style={s.td}>{r.spool_number}</td><td style={s.td}>{r.category}</td><td style={s.td}>{comps.map((c, j) => <span key={j} style={{ ...s.statusBadge(COLORS.gray), marginRight: 4 }}>{c.material_code} ({c.status})</span>)}</td></tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const renderMovements = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button style={s.btn(COLORS.primary)} onClick={openMovementModal}>+ Add Movement</button>
      </div>
      <div style={s.card}>
        <div style={s.cardTitle}>📜 Movement History</div>
        <table style={s.table}>
          <thead><tr><th style={s.th}>Date</th><th style={s.th}>Type</th><th style={s.th}>Code</th><th style={s.th}>Qty</th><th style={s.th}>Location</th><th style={s.th}>Note</th></tr></thead>
          <tbody>
            {movements.map((m, i) => (
              <tr key={i}><td style={s.td}>{new Date(m.created_at).toLocaleString()}</td><td style={s.td}><span style={s.statusBadge(m.type === 'IN' ? COLORS.success : m.type === 'OUT' || m.type === 'DEL' ? COLORS.primary : m.type === 'BAL' ? COLORS.orange : COLORS.warning)}>{m.type}</span></td><td style={{ ...s.td, fontFamily: 'monospace' }}>{m.material_code}</td><td style={s.td}>{m.quantity}</td><td style={s.td}>{m.location}</td><td style={s.td}>{m.note}</td></tr>
            ))}
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
          {!sidebarCollapsed && <div><div style={{ fontWeight: '700', fontSize: 14 }}>MAX STREICHER</div><div style={{ fontSize: 11, opacity: 0.7 }}>Materials Manager</div></div>}
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 18 }}>{sidebarCollapsed ? '→' : '←'}</button>
        </div>
        <nav style={s.nav}>
          {navItems.map(item => (
            <div key={item.id} style={s.navItem(view === item.id)} onClick={() => setView(item.id)}>
              <span style={{ fontSize: 18 }}>{item.icon}</span>
              {!sidebarCollapsed && <span style={{ flex: 1 }}>{item.label}</span>}
              {!sidebarCollapsed && item.count > 0 && <span style={s.navBadge}>{item.count}</span>}
            </div>
          ))}
        </nav>
        <div style={{ padding: 16, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ ...s.navItem(false), opacity: 0.7 }}><span>🚪</span>{!sidebarCollapsed && <span>Logout</span>}</div>
        </div>
      </div>

      {/* MAIN */}
      <div style={s.main}>
        <header style={s.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 44, height: 44, background: COLORS.primary, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{navItems.find(n => n.id === view)?.icon || '📊'}</div>
            <div><h1 style={{ fontSize: 20, fontWeight: '700', margin: 0 }}>{navItems.find(n => n.id === view)?.label || 'Dashboard'}</h1><p style={{ fontSize: 12, color: COLORS.gray, margin: 0 }}>Materials Manager V25</p></div>
          </div>
          <button style={s.btn(COLORS.secondary)} onClick={fetchAllData}>{loading ? '⏳' : '🔄'} Refresh</button>
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
            <h3 style={{ marginBottom: 20 }}>🔀 Split Partial - {splitModal.comp?.material_code}</h3>
            <p style={{ marginBottom: 16 }}>Total requested: <strong>{splitModal.comp?.quantity}</strong></p>
            <div style={{ marginBottom: 16 }}><label style={s.label}>Found Quantity (1-{splitModal.comp?.quantity - 1})</label><input type="number" style={s.input} value={splitForm.foundQty} onChange={e => setSplitForm({ ...splitForm, foundQty: e.target.value })} min="1" max={splitModal.comp?.quantity - 1} /></div>
            <div style={{ marginBottom: 20 }}><label style={s.label}>Send Remaining To</label><select style={s.select} value={splitForm.remainDest} onChange={e => setSplitForm({ ...splitForm, remainDest: e.target.value })}><option value="Yard">Yard</option><option value="Eng">Engineering</option><option value="Mng">Management</option><option value="Order">Orders</option></select></div>
            <div style={{ display: 'flex', gap: 12 }}><button style={s.btn(COLORS.success)} onClick={processSplit}>✓ Confirm Split</button><button style={s.btn(COLORS.gray)} onClick={() => setSplitModal({ open: false, req: null, comp: null, loc: '' })}>Cancel</button></div>
          </div>
        </div>
      )}

      {/* NOTE MODAL */}
      {noteModal.open && (
        <div style={s.modal}>
          <div style={s.modalBox}>
            <h3 style={{ marginBottom: 20 }}>📝 Send Engineering Note</h3>
            <p style={{ marginBottom: 16 }}>For: <strong>{noteModal.comp?.material_code}</strong></p>
            <div style={{ marginBottom: 16 }}><label style={s.label}>Note</label><textarea style={{ ...s.input, minHeight: 100 }} value={noteForm.text} onChange={e => setNoteForm({ ...noteForm, text: e.target.value })} placeholder="Enter note for warehouse..." /></div>
            <div style={{ marginBottom: 20 }}><label style={s.label}>Send To</label><select style={s.select} value={noteForm.dest} onChange={e => setNoteForm({ ...noteForm, dest: e.target.value })}><option value="Site">WH Site</option><option value="Yard">WH Yard</option></select></div>
            <div style={{ display: 'flex', gap: 12 }}><button style={s.btn(COLORS.purple)} onClick={sendEngNote}>📤 Send Note</button><button style={s.btn(COLORS.gray)} onClick={() => setNoteModal({ open: false, req: null, comp: null })}>Cancel</button></div>
          </div>
        </div>
      )}

      {/* MOVEMENT MODAL */}
      {movementModal && (
        <div style={s.modal}>
          <div style={s.modalBox}>
            <h3 style={{ marginBottom: 20 }}>📦 Register Manual Movement</h3>
            <div style={s.formGrid}>
              <div><label style={s.label}>Type</label><select style={s.select} value={movementForm.type} onChange={e => setMovementForm({ ...movementForm, type: e.target.value })}><option>Lost</option><option>Broken</option><option>IN</option></select></div>
              <div><label style={s.label}>Location</label><select style={s.select} value={movementForm.loc} onChange={e => setMovementForm({ ...movementForm, loc: e.target.value })}><option>YARD</option><option>SITE</option></select></div>
              <div><label style={s.label}>Material Code</label><select style={s.select} value={movementForm.code} onChange={e => setMovementForm({ ...movementForm, code: e.target.value })}><option value="">Select...</option>{Object.keys(materials).map(k => <option key={k} value={k}>{k}</option>)}</select></div>
              <div><label style={s.label}>Quantity</label><input type="number" style={s.input} value={movementForm.qty} onChange={e => setMovementForm({ ...movementForm, qty: e.target.value })} /></div>
              <div><label style={s.label}>Name</label><input style={s.input} value={movementForm.name} onChange={e => setMovementForm({ ...movementForm, name: e.target.value })} /></div>
              <div><label style={s.label}>Badge</label><input style={s.input} value={movementForm.badge} onChange={e => setMovementForm({ ...movementForm, badge: e.target.value })} /></div>
            </div>
            <div style={{ marginBottom: 20 }}><label style={s.label}>Note</label><input style={s.input} value={movementForm.note} onChange={e => setMovementForm({ ...movementForm, note: e.target.value })} /></div>
            <div style={{ display: 'flex', gap: 12 }}><button style={s.btn(COLORS.success)} onClick={registerManualMovement}>✓ Register</button><button style={s.btn(COLORS.gray)} onClick={() => setMovementModal(false)}>Cancel</button></div>
          </div>
        </div>
      )}

      {/* BALANCE MODAL */}
      {balanceModal && (
        <div style={s.modal}>
          <div style={s.modalBox}>
            <h3 style={{ marginBottom: 20 }}>⚖️ Manual Balance Adjustment</h3>
            <div style={s.formGrid}>
              <div><label style={s.label}>Type</label><select style={s.select} value={balanceForm.type} onChange={e => setBalanceForm({ ...balanceForm, type: e.target.value })}><option>Adjustment</option><option>Lost</option><option>Broken</option></select></div>
              <div><label style={s.label}>Location</label><select style={s.select} value={balanceForm.loc} onChange={e => setBalanceForm({ ...balanceForm, loc: e.target.value })}><option>YARD</option><option>SITE</option></select></div>
              <div><label style={s.label}>Material Code</label><select style={s.select} value={balanceForm.code} onChange={e => setBalanceForm({ ...balanceForm, code: e.target.value })}><option value="">Select...</option>{Object.keys(materials).map(k => <option key={k} value={k}>{k}</option>)}</select></div>
              <div><label style={s.label}>Quantity (+/-)</label><input type="number" style={s.input} value={balanceForm.qty} onChange={e => setBalanceForm({ ...balanceForm, qty: e.target.value })} /></div>
              <div><label style={s.label}>Name</label><input style={s.input} value={balanceForm.name} onChange={e => setBalanceForm({ ...balanceForm, name: e.target.value })} /></div>
              <div><label style={s.label}>Badge</label><input style={s.input} value={balanceForm.badge} onChange={e => setBalanceForm({ ...balanceForm, badge: e.target.value })} /></div>
            </div>
            <div style={{ marginBottom: 20 }}><label style={s.label}>Note</label><input style={s.input} value={balanceForm.note} onChange={e => setBalanceForm({ ...balanceForm, note: e.target.value })} /></div>
            <div style={{ display: 'flex', gap: 12 }}><button style={s.btn(COLORS.success)} onClick={saveBalance}>✓ Save</button><button style={s.btn(COLORS.gray)} onClick={() => setBalanceModal(false)}>Cancel</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
