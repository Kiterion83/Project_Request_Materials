// ============================================================
// MATERIALS MANAGER V25 - STREICHER EDITION
// ============================================================
// Beautiful Modern UI with STREICHER branding - ALL INLINE STYLES
// ============================================================

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// SUPABASE CONFIG
const supabaseUrl = 'https://cqqlzexwcwmegqeyqyi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxcWx6ZXh3Y3dtZWdxZXlxeWkiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTczMzQxMzY4NSwiZXhwIjoyMDQ4OTg5Njg1fQ.cNGqHkWmIo5d3_hcUMaIpPxGWYmVnq8f-zthkYM5SXk';
const supabase = createClient(supabaseUrl, supabaseKey);

// COLORS
const COLORS = {
  primary: '#E31E24',
  primaryDark: '#B91C1C',
  secondary: '#1F2937',
  accent: '#6B7280',
  success: '#059669',
  warning: '#D97706',
  info: '#2563EB',
  purple: '#7C3AED',
  pink: '#EC4899',
  cyan: '#0891B2',
  yellow: '#CA8A04',
  orange: '#EA580C'
};

export default function MaterialsManager() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginPassword, setLoginPassword] = useState('');
  const [view, setView] = useState('dashboard');
  const [modal, setModal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [ordersTab, setOrdersTab] = useState('toOrder');

  const [materials, setMaterials] = useState({});
  const [inventory, setInventory] = useState({ yard: {}, site: {}, inTransit: {} });
  const [requests, setRequests] = useState([]);
  const [movements, setMovements] = useState([]);
  const [mirs, setMirs] = useState([]);
  const [readyOut, setReadyOut] = useState([]);
  const [orderLog, setOrderLog] = useState([]);
  const [counter, setCounter] = useState(1001);

  const [form, setForm] = useState({ name: '', badge: '', iso: '', spool: '', hf: '', cat: 'Bulk' });
  const [itemForm, setItemForm] = useState({ code: '', qty: '' });
  const [requestItems, setRequestItems] = useState([]);
  const [mirForm, setMirForm] = useState({ mir: '', rk: '', forecast: '', priority: 'Medium' });
  const [loadForm, setLoadForm] = useState({ code: '', qty: '', mir: '', rk: '' });
  const [balanceForm, setBalanceForm] = useState({ code: '', qty: '', loc: 'YARD', balType: 'Adjustment', note: '', name: '', badge: '' });
  const [search, setSearch] = useState('');

  // LOGIN
  const handleLogin = () => {
    if (loginPassword === 'streicher2024') {
      setIsLoggedIn(true);
      loadAllData();
    } else {
      alert('❌ Password errata!');
    }
  };

  // LOAD DATA
  const loadAllData = async () => {
    setLoading(true);
    try {
      const { data: matData } = await supabase.from('materials').select('*');
      if (matData) {
        const matObj = {};
        matData.forEach(m => { matObj[m.code] = m.description; });
        setMaterials(matObj);
      }

      const { data: invData } = await supabase.from('inventory').select('*');
      if (invData) {
        const inv = { yard: {}, site: {}, inTransit: {} };
        invData.forEach(i => {
          const loc = i.location?.toLowerCase();
          const code = i.material_code || i.code;
          if (loc === 'intransit') inv.inTransit[code] = i.quantity;
          else if (loc === 'yard') inv.yard[code] = i.quantity;
          else if (loc === 'site') inv.site[code] = i.quantity;
        });
        setInventory(inv);
      }

      const { data: reqData } = await supabase.from('requests').select('*').order('created_at', { ascending: false });
      const { data: compData } = await supabase.from('request_components').select('*');
      
      if (reqData && compData) {
        const formattedRequests = reqData.map(r => ({
          id: r.id, num: r.request_number, sub: r.sub_number || 0,
          name: r.requester || r.requester_name, badge: r.badge || r.requester_badge,
          iso: r.iso, spool: r.spool, hf: r.hf || r.hf_number, cat: r.category, date: r.created_at,
          comp: compData.filter(c => c.request_id === r.id).map(c => ({
            id: c.id, code: c.material_code || c.code, desc: c.description, qty: c.quantity, st: c.status,
            sentTo: c.sent_to, engCat: c.ut_category || c.eng_category, orderType: c.order_type
          }))
        }));
        setRequests(formattedRequests);
      }

      const { data: movData } = await supabase.from('movements').select('*').order('movement_date', { ascending: false });
      if (movData) {
        setMovements(movData.map(m => ({
          id: m.id, d: m.movement_date, type: m.movement_type || m.type, loc: m.location,
          code: m.material_code || m.code, qty: m.quantity, note: m.note, balType: m.balance_type
        })));
      }

      const { data: mirData } = await supabase.from('mirs').select('*');
      if (mirData) setMirs(mirData.map(m => ({ id: m.id, mir: m.mir_number, rk: m.rk_number, status: m.status, forecast: m.forecast_date, priority: m.priority })));

      const { data: readyData } = await supabase.from('ready_out').select('*');
      if (readyData) setReadyOut(readyData.map(r => ({ id: r.id, reqId: r.request_id, compId: r.component_id, reqNum: r.request_number, name: r.requester || r.requester_name, badge: r.badge || r.requester_badge, code: r.material_code || r.code, desc: r.description, qty: r.quantity, loc: r.location || 'SITE' })));

      const { data: ordData } = await supabase.from('order_log').select('*').order('created_at', { ascending: false });
      if (ordData) setOrderLog(ordData.map(o => ({ id: o.id, reqNum: o.request_number, code: o.material_code || o.code, qty: o.quantity_ordered || o.quantity, orderType: o.order_type, orderDate: o.order_date, status: o.status })));
    } catch (err) { console.error('Load error:', err); }
    setLoading(false);
  };

  useEffect(() => { if (isLoggedIn) loadAllData(); }, [isLoggedIn]);

  // HELPERS
  const now = () => new Date().toISOString();
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('it-IT') : '-';
  const formatDateTime = (d) => d ? new Date(d).toLocaleString('it-IT') : '-';
  const formatReqNum = (n, s) => `${n}-${s || 0}`;

  // DB OPERATIONS
  const updateInventory = async (code, location, quantity) => {
    const loc = location.toUpperCase();
    const { data: existing } = await supabase.from('inventory').select('*').eq('material_code', code).eq('location', loc).single();
    if (existing) await supabase.from('inventory').update({ quantity, updated_at: now() }).eq('id', existing.id);
    else await supabase.from('inventory').insert({ material_code: code, location: loc, quantity });
  };

  const addMovement = async (movement) => {
    await supabase.from('movements').insert({ movement_date: now(), movement_type: movement.type, location: movement.loc, material_code: movement.code, quantity: movement.qty, note: movement.note, balance_type: movement.balType });
  };

  const updateComponentStatus = async (compId, newStatus, additionalData = {}) => {
    await supabase.from('request_components').update({ status: newStatus, ...additionalData }).eq('id', compId);
    await loadAllData();
  };

  // ACTIONS
  const submitRequest = async (destination) => {
    if (!form.name || !form.badge || !form.iso || !form.spool) return alert('Compila tutti i campi obbligatori!');
    if (requestItems.length === 0) return alert('Aggiungi almeno un materiale!');
    setLoading(true);
    try {
      const reqNum = counter + 1; setCounter(reqNum);
      const { data: reqData } = await supabase.from('requests').insert({ request_number: reqNum.toString(), sub_number: 0, requester: form.name, badge: form.badge, iso: form.iso, spool: form.spool, hf: form.hf || null, category: form.cat }).select().single();
      for (const item of requestItems) {
        await supabase.from('request_components').insert({ request_id: reqData.id, material_code: item.code, description: item.desc, quantity: item.qty, status: destination });
      }
      setForm({ name: '', badge: '', iso: '', spool: '', hf: '', cat: 'Bulk' }); setRequestItems([]);
      await loadAllData(); alert(`✅ Richiesta ${reqNum}-0 creata!`);
    } catch (err) { alert('Errore: ' + err.message); }
    setLoading(false);
  };

  const moveToOut = async (req, comp) => {
    await supabase.from('ready_out').insert({ request_id: req.id, component_id: comp.id, request_number: formatReqNum(req.num, req.sub), requester: req.name, badge: req.badge, material_code: comp.code, description: comp.desc, quantity: comp.qty, location: 'SITE' });
    await updateComponentStatus(comp.id, 'Out');
  };

  const deliverMaterial = async (item) => {
    const loc = item.loc?.toLowerCase() || 'site';
    const currentQty = inventory[loc]?.[item.code] || 0;
    await updateInventory(item.code, item.loc, Math.max(0, currentQty - item.qty));
    await addMovement({ type: 'OUT', loc: item.loc, code: item.code, qty: item.qty, note: `Consegnato a ${item.name}` });
    await supabase.from('delivered').insert({ request_number: item.reqNum, requester: item.name, badge: item.badge, material_code: item.code, description: item.desc, quantity: item.qty });
    await supabase.from('request_components').update({ status: 'Done' }).eq('id', item.compId);
    await supabase.from('ready_out').delete().eq('id', item.id);
    await loadAllData();
  };

  const transferToSite = async (req, comp) => {
    const yardQty = inventory.yard[comp.code] || 0;
    await updateInventory(comp.code, 'YARD', Math.max(0, yardQty - comp.qty));
    const transitQty = inventory.inTransit[comp.code] || 0;
    await updateInventory(comp.code, 'INTRANSIT', transitQty + comp.qty);
    await addMovement({ type: 'TRF', loc: 'YARD→SITE', code: comp.code, qty: comp.qty });
    await updateComponentStatus(comp.id, 'Trans');
  };

  const confirmArrival = async (req, comp) => {
    const transitQty = inventory.inTransit[comp.code] || 0;
    await updateInventory(comp.code, 'INTRANSIT', Math.max(0, transitQty - comp.qty));
    const siteQty = inventory.site[comp.code] || 0;
    await updateInventory(comp.code, 'SITE', siteQty + comp.qty);
    await addMovement({ type: 'TRF', loc: 'TRANSIT→SITE', code: comp.code, qty: comp.qty });
    await updateComponentStatus(comp.id, 'Site');
  };

  const loadMaterial = async () => {
    if (!loadForm.code || !loadForm.qty) return alert('Seleziona codice e quantità!');
    const currentQty = inventory.yard[loadForm.code] || 0;
    await updateInventory(loadForm.code, 'YARD', currentQty + parseInt(loadForm.qty));
    await addMovement({ type: 'IN', loc: 'YARD', code: loadForm.code, qty: parseInt(loadForm.qty), note: loadForm.mir ? `MIR: ${loadForm.mir}` : '' });
    setLoadForm({ code: '', qty: '', mir: '', rk: '' }); await loadAllData(); alert('✅ Materiale caricato!');
  };

  const registerBalance = async () => {
    if (!balanceForm.code || !balanceForm.qty || !balanceForm.name) return alert('Compila tutti i campi!');
    const qty = parseInt(balanceForm.qty);
    const loc = balanceForm.loc.toLowerCase();
    const currentQty = inventory[loc]?.[balanceForm.code] || 0;
    let newQty = (balanceForm.balType === 'Lost' || balanceForm.balType === 'Broken') ? Math.max(0, currentQty - qty) : qty;
    await updateInventory(balanceForm.code, balanceForm.loc, newQty);
    await addMovement({ type: 'BAL', loc: balanceForm.loc, code: balanceForm.code, qty: balanceForm.balType === 'Adjustment' ? qty : -qty, balType: balanceForm.balType, note: `${balanceForm.balType}: ${balanceForm.note} (${balanceForm.name})` });
    setBalanceForm({ code: '', qty: '', loc: 'YARD', balType: 'Adjustment', note: '', name: '', badge: '' });
    setModal(null); await loadAllData(); alert('✅ Registrato!');
  };

  const engSendTo = async (req, comp, dest, cat) => { await updateComponentStatus(comp.id, dest, { ut_category: cat, sent_to: dest }); };
  const mngSendTo = async (req, comp, dest) => { await updateComponentStatus(comp.id, dest); };

  const markAsOrdered = async (req, comp, orderType) => {
    await updateComponentStatus(comp.id, 'Ordered', { order_type: orderType, purchase_date: now() });
    await supabase.from('order_log').insert({ request_number: formatReqNum(req.num, req.sub), material_code: comp.code, quantity_ordered: comp.qty, order_type: orderType, order_date: now(), status: 'Pending' });
    await loadAllData();
  };

  const markOrderArrived = async (order) => {
    await supabase.from('order_log').update({ status: 'Arrived', arrived_date: now() }).eq('id', order.id);
    const siteQty = inventory.site[order.code] || 0;
    await updateInventory(order.code, 'SITE', siteQty + order.qty);
    await addMovement({ type: 'IN', loc: 'SITE', code: order.code, qty: order.qty, note: 'Ordine arrivato' });
    await loadAllData();
  };

  const addItemToRequest = () => {
    if (!itemForm.code || !itemForm.qty) return alert('Seleziona codice e quantità!');
    setRequestItems([...requestItems, { id: Date.now(), code: itemForm.code, desc: materials[itemForm.code] || itemForm.code, qty: parseInt(itemForm.qty) }]);
    setItemForm({ code: '', qty: '' });
  };

  // STATS
  const getStats = () => {
    const stats = { eng: 0, mng: 0, site: 0, yard: 0, out: 0, trans: 0, order: 0, ordered: 0, spare: 0, done: 0, mirP: 0, lost: 0, broken: 0 };
    requests.forEach(r => { r.comp?.forEach(c => {
      if (c.st === 'UT' || c.st === 'Eng') stats.eng++;
      else if (c.st === 'Mng') stats.mng++;
      else if (c.st === 'Site') stats.site++;
      else if (c.st === 'Yard') stats.yard++;
      else if (c.st === 'Out') stats.out++;
      else if (c.st === 'Trans') stats.trans++;
      else if (c.st === 'Order') stats.order++;
      else if (c.st === 'Ordered') stats.ordered++;
      else if (c.st === 'Spare') stats.spare++;
      else if (c.st === 'Done') stats.done++;
    }); });
    stats.mirP = mirs.filter(m => m.status === 'Pending').length;
    stats.lost = movements.filter(m => m.balType === 'Lost').reduce((sum, m) => sum + Math.abs(m.qty || 0), 0);
    stats.broken = movements.filter(m => m.balType === 'Broken').reduce((sum, m) => sum + Math.abs(m.qty || 0), 0);
    return stats;
  };
  const stats = getStats();

  // ========== STYLES ==========
  const styles = {
    // LOGIN
    loginContainer: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #1F2937 0%, #0f172a 100%)', padding: 20 },
    loginBox: { background: '#fff', borderRadius: 24, padding: 48, width: '100%', maxWidth: 420, boxShadow: '0 25px 80px rgba(0,0,0,0.4)', textAlign: 'center' },
    loginLogo: { width: 100, height: 100, background: 'linear-gradient(135deg, #E31E24 0%, #B91C1C 100%)', borderRadius: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: '0 12px 40px rgba(227,30,36,0.4)', fontSize: 48, fontWeight: 800, color: '#fff' },
    loginTitle: { fontSize: 28, fontWeight: 800, color: '#1F2937', marginBottom: 8 },
    loginSubtitle: { fontSize: 14, color: '#6B7280', marginBottom: 32 },
    loginInput: { width: '100%', padding: '16px 20px', border: '2px solid #e5e7eb', borderRadius: 14, fontSize: 16, marginBottom: 20, outline: 'none', boxSizing: 'border-box' },
    loginBtn: { width: '100%', padding: 16, background: 'linear-gradient(135deg, #E31E24 0%, #B91C1C 100%)', color: '#fff', border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: '0 8px 24px rgba(227,30,36,0.35)' },
    
    // APP
    app: { display: 'flex', minHeight: '100vh', fontFamily: "'Segoe UI', -apple-system, sans-serif", fontSize: 14, background: '#f8fafc' },
    
    // SIDEBAR
    sidebar: { width: sidebarCollapsed ? 80 : 280, background: 'linear-gradient(180deg, #1F2937 0%, #0f172a 100%)', color: '#fff', display: 'flex', flexDirection: 'column', transition: 'all 0.3s', boxShadow: '4px 0 30px rgba(0,0,0,0.15)', position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: 100 },
    logoArea: { padding: sidebarCollapsed ? '24px 16px' : '28px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 16, background: 'rgba(0,0,0,0.2)' },
    logoIcon: { width: 48, height: 48, background: 'linear-gradient(135deg, #E31E24 0%, #B91C1C 100%)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 24, boxShadow: '0 6px 20px rgba(227,30,36,0.5)', flexShrink: 0, color: '#fff' },
    nav: { flex: 1, overflowY: 'auto', padding: '16px 0' },
    navItem: (active) => ({ padding: sidebarCollapsed ? '14px 16px' : '14px 24px', cursor: 'pointer', background: active ? 'linear-gradient(90deg, #E31E24 0%, #B91C1C 100%)' : 'transparent', borderRadius: sidebarCollapsed ? 12 : '0 30px 30px 0', marginRight: sidebarCollapsed ? 12 : 16, marginLeft: sidebarCollapsed ? 12 : 0, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 14, transition: 'all 0.2s', fontSize: 14, fontWeight: active ? 600 : 400, boxShadow: active ? '0 4px 16px rgba(227,30,36,0.35)' : 'none', justifyContent: sidebarCollapsed ? 'center' : 'flex-start' }),
    badge: { background: '#E31E24', borderRadius: 20, padding: '4px 12px', fontSize: 11, fontWeight: 700, boxShadow: '0 2px 8px rgba(227,30,36,0.4)', marginLeft: 'auto' },
    collapseBtn: { padding: 20, borderTop: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', textAlign: 'center', color: 'rgba(255,255,255,0.6)', fontSize: 14, background: 'rgba(0,0,0,0.1)' },
    
    // MAIN
    main: { flex: 1, marginLeft: sidebarCollapsed ? 80 : 280, transition: 'margin-left 0.3s' },
    header: { background: '#fff', padding: '20px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', position: 'sticky', top: 0, zIndex: 50 },
    headerIcon: { width: 52, height: 52, background: 'linear-gradient(135deg, #E31E24 0%, #B91C1C 100%)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, boxShadow: '0 6px 20px rgba(227,30,36,0.3)', marginRight: 18 },
    content: { padding: 32, minHeight: 'calc(100vh - 92px)' },
    
    // CARDS
    card: { background: '#fff', borderRadius: 24, padding: 28, marginBottom: 28, boxShadow: '0 4px 30px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' },
    cardTitle: { fontSize: 20, fontWeight: 700, color: '#1F2937', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 },
    
    // DASHBOARD BOXES
    dashGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 20 },
    dashBox: (color) => ({ background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`, color: '#fff', padding: 28, borderRadius: 24, cursor: 'pointer', transition: 'all 0.3s', boxShadow: `0 10px 40px ${color}40`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 150, textAlign: 'center' }),
    
    // FORMS
    formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, marginBottom: 24 },
    formGroup: { display: 'flex', flexDirection: 'column', gap: 8 },
    label: { fontSize: 12, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5 },
    input: { padding: '14px 18px', border: '2px solid #e2e8f0', borderRadius: 12, fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' },
    select: { padding: '14px 18px', border: '2px solid #e2e8f0', borderRadius: 12, fontSize: 14, background: '#fff', cursor: 'pointer', outline: 'none', width: '100%', boxSizing: 'border-box' },
    
    // BUTTONS
    btn: (color) => ({ padding: '14px 28px', background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`, color: '#fff', border: 'none', borderRadius: 14, cursor: 'pointer', fontSize: 14, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 10, boxShadow: `0 6px 20px ${color}35` }),
    btnSmall: (color) => ({ padding: '10px 18px', background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`, color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 12, fontWeight: 600, boxShadow: `0 4px 12px ${color}30` }),
    
    // TABLE
    table: { width: '100%', borderCollapse: 'separate', borderSpacing: 0 },
    th: { background: 'linear-gradient(135deg, #1F2937 0%, #374151 100%)', color: '#fff', padding: '16px 20px', textAlign: 'left', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
    thFirst: { borderTopLeftRadius: 16 },
    thLast: { borderTopRightRadius: 16 },
    td: { padding: '18px 20px', borderBottom: '1px solid #f1f5f9', fontSize: 14, background: '#fff' },
    statusBadge: (color) => ({ display: 'inline-block', padding: '6px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: `${color}18`, color: color }),
    
    // MODAL
    modal: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 },
    modalBox: { background: '#fff', padding: 36, borderRadius: 28, minWidth: 480, maxWidth: '90%', maxHeight: '85vh', overflow: 'auto', boxShadow: '0 30px 80px rgba(0,0,0,0.35)' },
    
    // TABS
    tabs: { display: 'flex', gap: 12, marginBottom: 28, borderBottom: '2px solid #e2e8f0', paddingBottom: 20 },
    tab: (active) => ({ padding: '14px 28px', cursor: 'pointer', borderRadius: 14, fontSize: 14, fontWeight: active ? 700 : 500, background: active ? 'linear-gradient(135deg, #E31E24 0%, #B91C1C 100%)' : '#f1f5f9', color: active ? '#fff' : '#6B7280', boxShadow: active ? '0 4px 16px rgba(227,30,36,0.3)' : 'none' }),
    
    // SEARCH
    searchBox: { display: 'flex', alignItems: 'center', background: '#f8fafc', border: '2px solid #e2e8f0', borderRadius: 14, padding: '4px 18px', marginBottom: 24 },
    searchInput: { border: 'none', outline: 'none', padding: 14, fontSize: 14, flex: 1, background: 'transparent' },
    
    // ITEM ROW
    itemRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', background: '#f8fafc', borderRadius: 14, marginBottom: 12, border: '1px solid #e2e8f0' },
    
    // ALERT
    alert: (type) => ({ padding: '18px 24px', borderRadius: 16, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 14, background: type === 'error' ? '#fef2f2' : '#ecfdf5', color: type === 'error' ? '#E31E24' : '#059669', fontWeight: 600 })
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'mir', label: 'MIR', icon: '📋', count: stats.mirP },
    { id: 'materialIn', label: 'Material IN', icon: '📥' },
    { id: 'siteIn', label: 'Site IN', icon: '🚚', count: stats.trans },
    { id: 'newRequest', label: 'Nuova Richiesta', icon: '📝' },
    { id: 'whSite', label: 'WH Site', icon: '🏭', count: stats.site },
    { id: 'whYard', label: 'WH Yard', icon: '🏗️', count: stats.yard },
    { id: 'recordOut', label: 'Ready OUT', icon: '📤', count: stats.out },
    { id: 'engineering', label: 'Engineering', icon: '🔧', count: stats.eng },
    { id: 'spare', label: 'Spare Parts', icon: '⭐', count: stats.spare },
    { id: 'management', label: 'Management', icon: '👔', count: stats.mng },
    { id: 'orders', label: 'Orders', icon: '🛒', count: stats.order + stats.ordered },
    { id: 'movements', label: 'Movements', icon: '📜' },
    { id: 'status', label: 'Status', icon: '🔍' }
  ];

  // ========== LOGIN SCREEN ==========
  if (!isLoggedIn) {
    return (
      <div style={styles.loginContainer}>
        <div style={styles.loginBox}>
          <div style={styles.loginLogo}>S</div>
          <div style={styles.loginTitle}>STREICHER</div>
          <div style={styles.loginSubtitle}>Materials Manager V25</div>
          <input 
            style={styles.loginInput} 
            type="password" 
            placeholder="Inserisci password..." 
            value={loginPassword} 
            onChange={e => setLoginPassword(e.target.value)} 
            onKeyPress={e => e.key === 'Enter' && handleLogin()} 
          />
          <button style={styles.loginBtn} onClick={handleLogin}>🔐 Accedi</button>
          <div style={{ marginTop: 32, fontSize: 12, color: '#6B7280' }}>© 2024 STREICHER - Warehouse Management</div>
        </div>
      </div>
    );
  }

  // ========== RENDER FUNCTIONS ==========
  
  const renderDashboard = () => (
    <div>
      <div style={styles.card}>
        <div style={styles.cardTitle}>⚡ OPERAZIONI URGENTI</div>
        <div style={styles.dashGrid}>
          <div style={styles.dashBox(COLORS.primary)} onClick={() => setView('mir')}>
            <div style={{ fontSize: 48, fontWeight: 800 }}>{stats.mirP}</div>
            <div style={{ fontSize: 14, marginTop: 12, opacity: 0.9 }}>📋 MIR Aperti</div>
          </div>
          <div style={styles.dashBox(COLORS.orange)} onClick={() => setView('siteIn')}>
            <div style={{ fontSize: 48, fontWeight: 800 }}>{stats.trans}</div>
            <div style={{ fontSize: 14, marginTop: 12, opacity: 0.9 }}>🚚 In Transito</div>
          </div>
          <div style={styles.dashBox(COLORS.success)} onClick={() => setView('recordOut')}>
            <div style={{ fontSize: 48, fontWeight: 800 }}>{stats.out}</div>
            <div style={{ fontSize: 14, marginTop: 12, opacity: 0.9 }}>📤 Ready OUT</div>
          </div>
          <div style={styles.dashBox(COLORS.purple)} onClick={() => setView('engineering')}>
            <div style={{ fontSize: 48, fontWeight: 800 }}>{stats.eng}</div>
            <div style={{ fontSize: 14, marginTop: 12, opacity: 0.9 }}>🔧 Engineering</div>
          </div>
          <div style={styles.dashBox(COLORS.pink)} onClick={() => setView('spare')}>
            <div style={{ fontSize: 48, fontWeight: 800 }}>{stats.spare}</div>
            <div style={{ fontSize: 14, marginTop: 12, opacity: 0.9 }}>⭐ Spare Parts</div>
          </div>
        </div>
      </div>

      <div style={styles.card}>
        <div style={styles.cardTitle}>📦 MAGAZZINI & GESTIONE</div>
        <div style={styles.dashGrid}>
          <div style={styles.dashBox(COLORS.info)} onClick={() => setView('whSite')}>
            <div style={{ fontSize: 48, fontWeight: 800 }}>{stats.site}</div>
            <div style={{ fontSize: 14, marginTop: 12, opacity: 0.9 }}>🏭 WH Site</div>
          </div>
          <div style={styles.dashBox(COLORS.yellow)} onClick={() => setView('whYard')}>
            <div style={{ fontSize: 48, fontWeight: 800 }}>{stats.yard}</div>
            <div style={{ fontSize: 14, marginTop: 12, opacity: 0.9 }}>🏗️ WH Yard</div>
          </div>
          <div style={styles.dashBox(COLORS.cyan)} onClick={() => setView('management')}>
            <div style={{ fontSize: 48, fontWeight: 800 }}>{stats.mng}</div>
            <div style={{ fontSize: 14, marginTop: 12, opacity: 0.9 }}>👔 Management</div>
          </div>
          <div style={styles.dashBox(COLORS.warning)} onClick={() => { setView('orders'); setOrdersTab('toOrder'); }}>
            <div style={{ fontSize: 48, fontWeight: 800 }}>{stats.order}</div>
            <div style={{ fontSize: 14, marginTop: 12, opacity: 0.9 }}>🛒 Da Ordinare</div>
          </div>
          <div style={styles.dashBox(COLORS.success)} onClick={() => { setView('orders'); setOrdersTab('pending'); }}>
            <div style={{ fontSize: 48, fontWeight: 800 }}>{stats.ordered}</div>
            <div style={{ fontSize: 14, marginTop: 12, opacity: 0.9 }}>📦 Ordinati</div>
          </div>
        </div>
      </div>

      <div style={styles.card}>
        <div style={styles.cardTitle}>📈 RIEPILOGO INVENTARIO</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
          <div style={{ ...styles.dashBox(COLORS.secondary), minHeight: 120 }}>
            <div style={{ fontSize: 36, fontWeight: 800 }}>{Object.values(inventory.yard).reduce((a, b) => a + b, 0)}</div>
            <div style={{ fontSize: 13, marginTop: 8, opacity: 0.8 }}>🏗️ YARD</div>
          </div>
          <div style={{ ...styles.dashBox(COLORS.info), minHeight: 120 }}>
            <div style={{ fontSize: 36, fontWeight: 800 }}>{Object.values(inventory.site).reduce((a, b) => a + b, 0)}</div>
            <div style={{ fontSize: 13, marginTop: 8, opacity: 0.8 }}>🏭 SITE</div>
          </div>
          <div style={{ ...styles.dashBox(COLORS.orange), minHeight: 120 }}>
            <div style={{ fontSize: 36, fontWeight: 800 }}>{stats.lost}</div>
            <div style={{ fontSize: 13, marginTop: 8, opacity: 0.8 }}>🚫 LOST</div>
          </div>
          <div style={{ ...styles.dashBox(COLORS.purple), minHeight: 120 }}>
            <div style={{ fontSize: 36, fontWeight: 800 }}>{stats.broken}</div>
            <div style={{ fontSize: 13, marginTop: 8, opacity: 0.8 }}>💔 BROKEN</div>
          </div>
        </div>
      </div>

      <div style={styles.card}>
        <div style={styles.cardTitle}>🚀 AZIONI RAPIDE</div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <button style={styles.btn(COLORS.primary)} onClick={() => setView('newRequest')}>📝 Nuova Richiesta</button>
          <button style={styles.btn(COLORS.success)} onClick={() => setView('materialIn')}>📥 Carica Materiale</button>
          <button style={styles.btn(COLORS.info)} onClick={() => setModal('balance')}>⚖️ Rettifica</button>
          <button style={styles.btn(COLORS.purple)} onClick={() => setView('status')}>🔍 Cerca</button>
        </div>
      </div>
    </div>
  );

  const renderNewRequest = () => (
    <div style={styles.card}>
      <div style={styles.cardTitle}>📝 CREA NUOVA RICHIESTA</div>
      <div style={styles.formGrid}>
        <div style={styles.formGroup}>
          <label style={styles.label}>Nome *</label>
          <input style={styles.input} value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Nome richiedente" />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Badge *</label>
          <input style={styles.input} value={form.badge} onChange={e => setForm({...form, badge: e.target.value})} placeholder="Numero badge" />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>ISO *</label>
          <input style={styles.input} value={form.iso} onChange={e => setForm({...form, iso: e.target.value})} placeholder="es. ISO-001" />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Spool *</label>
          <input style={styles.input} value={form.spool} onChange={e => setForm({...form, spool: e.target.value})} placeholder="es. SP-001" />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Categoria</label>
          <select style={styles.select} value={form.cat} onChange={e => setForm({...form, cat: e.target.value})}>
            <option>Bulk</option>
            <option>Erection</option>
          </select>
        </div>
        {form.cat === 'Erection' && (
          <div style={styles.formGroup}>
            <label style={styles.label}>HF Number *</label>
            <input style={styles.input} value={form.hf} onChange={e => setForm({...form, hf: e.target.value})} placeholder="Numero HF" />
          </div>
        )}
      </div>

      <div style={{ marginTop: 32 }}>
        <div style={styles.cardTitle}>➕ AGGIUNGI MATERIALI</div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ ...styles.formGroup, flex: 2, minWidth: 200 }}>
            <label style={styles.label}>Codice Materiale</label>
            <select style={styles.select} value={itemForm.code} onChange={e => setItemForm({...itemForm, code: e.target.value})}>
              <option value="">-- Seleziona --</option>
              {Object.entries(materials).map(([code, desc]) => (
                <option key={code} value={code}>{code} - {desc}</option>
              ))}
            </select>
          </div>
          <div style={{ ...styles.formGroup, width: 120 }}>
            <label style={styles.label}>Quantità</label>
            <input style={styles.input} type="number" value={itemForm.qty} onChange={e => setItemForm({...itemForm, qty: e.target.value})} />
          </div>
          <button style={styles.btn(COLORS.info)} onClick={addItemToRequest}>➕ Aggiungi</button>
        </div>

        {requestItems.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            {requestItems.map(item => (
              <div key={item.id} style={styles.itemRow}>
                <div><strong>{item.code}</strong> - {item.desc}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <span style={{ fontWeight: 700, fontSize: 16 }}>x{item.qty}</span>
                  <button style={{ ...styles.btnSmall(COLORS.primary), padding: '6px 12px' }} onClick={() => setRequestItems(requestItems.filter(i => i.id !== item.id))}>✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 16, marginTop: 32 }}>
        <button style={styles.btn(COLORS.info)} onClick={() => submitRequest('Site')}>🏭 Invia a Site</button>
        <button style={styles.btn(COLORS.yellow)} onClick={() => submitRequest('Yard')}>🏗️ Invia a Yard</button>
        <button style={styles.btn(COLORS.purple)} onClick={() => submitRequest('UT')}>🔧 Invia a UT</button>
      </div>
    </div>
  );

  const renderWarehouse = (type) => {
    const inv = type === 'Site' ? inventory.site : inventory.yard;
    const items = requests.flatMap(r => r.comp?.filter(c => c.st === type).map(c => ({ ...c, req: r })) || []);

    return (
      <div>
        <div style={styles.card}>
          <div style={styles.cardTitle}>{type === 'Site' ? '🏭' : '🏗️'} RICHIESTE IN ATTESA - {type.toUpperCase()}</div>
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: COLORS.accent }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
              <div style={{ fontSize: 16 }}>Nessuna richiesta in attesa</div>
            </div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={{ ...styles.th, ...styles.thFirst }}>Richiesta</th>
                  <th style={styles.th}>Richiedente</th>
                  <th style={styles.th}>Codice</th>
                  <th style={styles.th}>Qty</th>
                  <th style={styles.th}>Disp.</th>
                  <th style={{ ...styles.th, ...styles.thLast }}>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const avail = inv[item.code] || 0;
                  const canFulfill = avail >= item.qty;
                  return (
                    <tr key={idx}>
                      <td style={styles.td}><strong>{formatReqNum(item.req.num, item.req.sub)}</strong></td>
                      <td style={styles.td}>{item.req.name}</td>
                      <td style={styles.td}><strong>{item.code}</strong></td>
                      <td style={styles.td}><strong>{item.qty}</strong></td>
                      <td style={styles.td}><span style={styles.statusBadge(canFulfill ? COLORS.success : COLORS.primary)}>{avail}</span></td>
                      <td style={styles.td}>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {canFulfill ? (
                            <button style={styles.btnSmall(COLORS.success)} onClick={() => moveToOut(item.req, item)}>✓ Ready</button>
                          ) : type === 'Yard' ? (
                            <button style={styles.btnSmall(COLORS.info)} onClick={() => transferToSite(item.req, item)}>🚚 Transfer</button>
                          ) : (
                            <span style={{ color: COLORS.primary, fontSize: 12 }}>⚠️ Insufficiente</span>
                          )}
                          <button style={styles.btnSmall(COLORS.purple)} onClick={() => engSendTo(item.req, item, 'UT', 'Check')}>UT</button>
                          {type === 'Site' && <button style={styles.btnSmall(COLORS.yellow)} onClick={() => updateComponentStatus(item.id, 'Yard')}>Y</button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div style={styles.card}>
          <div style={styles.cardTitle}>📦 Inventario - {type.toUpperCase()}</div>
          <div style={styles.searchBox}>
            <span>🔍</span>
            <input style={styles.searchInput} placeholder="Cerca materiale..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.th, ...styles.thFirst }}>Codice</th>
                <th style={styles.th}>Descrizione</th>
                <th style={{ ...styles.th, ...styles.thLast }}>Quantità</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(inv).filter(([code]) => !search || code.toLowerCase().includes(search.toLowerCase())).map(([code, qty]) => (
                <tr key={code}>
                  <td style={styles.td}><strong>{code}</strong></td>
                  <td style={styles.td}>{materials[code] || '-'}</td>
                  <td style={styles.td}><span style={styles.statusBadge(qty > 0 ? COLORS.success : COLORS.accent)}>{qty}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderSiteIn = () => {
    const transitItems = requests.flatMap(r => r.comp?.filter(c => c.st === 'Trans').map(c => ({ ...c, req: r })) || []);
    return (
      <div style={styles.card}>
        <div style={styles.cardTitle}>🚚 MATERIALI IN TRANSITO</div>
        {transitItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: COLORS.accent }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <div>Nessun materiale in transito</div>
          </div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.th, ...styles.thFirst }}>Richiesta</th>
                <th style={styles.th}>Codice</th>
                <th style={styles.th}>Qty</th>
                <th style={{ ...styles.th, ...styles.thLast }}>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {transitItems.map((item, idx) => (
                <tr key={idx}>
                  <td style={styles.td}><strong>{formatReqNum(item.req.num, item.req.sub)}</strong></td>
                  <td style={styles.td}><strong>{item.code}</strong></td>
                  <td style={styles.td}><strong>{item.qty}</strong></td>
                  <td style={styles.td}>
                    <button style={styles.btnSmall(COLORS.success)} onClick={() => confirmArrival(item.req, item)}>✅ Arrivato</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  };

  const renderRecordOut = () => (
    <div style={styles.card}>
      <div style={styles.cardTitle}>📤 PRONTI PER RITIRO</div>
      {readyOut.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: COLORS.accent }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <div>Nessun materiale pronto</div>
        </div>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{ ...styles.th, ...styles.thFirst }}>Richiesta</th>
              <th style={styles.th}>Richiedente</th>
              <th style={styles.th}>Codice</th>
              <th style={styles.th}>Qty</th>
              <th style={{ ...styles.th, ...styles.thLast }}>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {readyOut.map(item => (
              <tr key={item.id}>
                <td style={styles.td}><strong>{item.reqNum}</strong></td>
                <td style={styles.td}>{item.name}</td>
                <td style={styles.td}><strong>{item.code}</strong></td>
                <td style={styles.td}><strong>{item.qty}</strong></td>
                <td style={styles.td}>
                  <button style={styles.btnSmall(COLORS.success)} onClick={() => deliverMaterial(item)}>✅ Consegna</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  const renderEngineering = () => {
    const engItems = requests.flatMap(r => r.comp?.filter(c => c.st === 'UT' || c.st === 'Eng').map(c => ({ ...c, req: r })) || []);
    return (
      <div style={styles.card}>
        <div style={styles.cardTitle}>🔧 ENGINEERING REVIEW</div>
        {engItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: COLORS.accent }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <div>Nessun item in attesa</div>
          </div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.th, ...styles.thFirst }}>Richiesta</th>
                <th style={styles.th}>ISO/Spool</th>
                <th style={styles.th}>Codice</th>
                <th style={styles.th}>Qty</th>
                <th style={{ ...styles.th, ...styles.thLast }}>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {engItems.map((item, idx) => (
                <tr key={idx}>
                  <td style={styles.td}><strong>{formatReqNum(item.req.num, item.req.sub)}</strong></td>
                  <td style={styles.td}>{item.req.iso} / {item.req.spool}</td>
                  <td style={styles.td}><strong>{item.code}</strong></td>
                  <td style={styles.td}><strong>{item.qty}</strong></td>
                  <td style={styles.td}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button style={styles.btnSmall(COLORS.success)} onClick={() => moveToOut(item.req, item)}>✓</button>
                      <button style={styles.btnSmall(COLORS.info)} onClick={() => engSendTo(item.req, item, 'Site', 'OK')}>🏭</button>
                      <button style={styles.btnSmall(COLORS.yellow)} onClick={() => engSendTo(item.req, item, 'Yard', 'OK')}>🏗️</button>
                      <button style={styles.btnSmall(COLORS.cyan)} onClick={() => engSendTo(item.req, item, 'Mng', 'Special')}>👔</button>
                      <button style={styles.btnSmall(COLORS.pink)} onClick={() => engSendTo(item.req, item, 'Spare', 'Spare')}>⭐</button>
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

  const renderSpare = () => {
    const spareItems = requests.flatMap(r => r.comp?.filter(c => c.st === 'Spare').map(c => ({ ...c, req: r })) || []);
    return (
      <div style={styles.card}>
        <div style={styles.cardTitle}>⭐ SPARE PARTS</div>
        {spareItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: COLORS.accent }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <div>Nessun spare part</div>
          </div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.th, ...styles.thFirst }}>Richiesta</th>
                <th style={styles.th}>Codice</th>
                <th style={styles.th}>Qty</th>
                <th style={{ ...styles.th, ...styles.thLast }}>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {spareItems.map((item, idx) => (
                <tr key={idx}>
                  <td style={styles.td}><strong>{formatReqNum(item.req.num, item.req.sub)}</strong></td>
                  <td style={styles.td}><strong>{item.code}</strong></td>
                  <td style={styles.td}><strong>{item.qty}</strong></td>
                  <td style={styles.td}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button style={styles.btnSmall(COLORS.success)} onClick={() => moveToOut(item.req, item)}>✅ Ha Spare</button>
                      <button style={styles.btnSmall(COLORS.warning)} onClick={() => mngSendTo(item.req, item, 'Order')}>🛒 Acquisto</button>
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

  const renderManagement = () => {
    const mngItems = requests.flatMap(r => r.comp?.filter(c => c.st === 'Mng').map(c => ({ ...c, req: r })) || []);
    return (
      <div style={styles.card}>
        <div style={styles.cardTitle}>👔 MANAGEMENT DECISIONS</div>
        {mngItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: COLORS.accent }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <div>Nessun item</div>
          </div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.th, ...styles.thFirst }}>Richiesta</th>
                <th style={styles.th}>Codice</th>
                <th style={styles.th}>Qty</th>
                <th style={{ ...styles.th, ...styles.thLast }}>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {mngItems.map((item, idx) => (
                <tr key={idx}>
                  <td style={styles.td}><strong>{formatReqNum(item.req.num, item.req.sub)}</strong></td>
                  <td style={styles.td}><strong>{item.code}</strong></td>
                  <td style={styles.td}><strong>{item.qty}</strong></td>
                  <td style={styles.td}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button style={styles.btnSmall(COLORS.info)} onClick={() => mngSendTo(item.req, item, 'Order')}>Int</button>
                      <button style={styles.btnSmall(COLORS.success)} onClick={() => mngSendTo(item.req, item, 'Order')}>Cli</button>
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

  const renderOrders = () => {
    const toOrder = requests.flatMap(r => r.comp?.filter(c => c.st === 'Order').map(c => ({ ...c, req: r })) || []);
    const pending = orderLog.filter(o => o.status === 'Pending');
    return (
      <div>
        <div style={styles.tabs}>
          <div style={styles.tab(ordersTab === 'toOrder')} onClick={() => setOrdersTab('toOrder')}>🛒 Da Ordinare ({toOrder.length})</div>
          <div style={styles.tab(ordersTab === 'pending')} onClick={() => setOrdersTab('pending')}>📦 Ordinati ({pending.length})</div>
          <div style={styles.tab(ordersTab === 'log')} onClick={() => setOrdersTab('log')}>📜 Log</div>
        </div>

        {ordersTab === 'toOrder' && (
          <div style={styles.card}>
            <div style={styles.cardTitle}>🛒 MATERIALI DA ORDINARE</div>
            {toOrder.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 60, color: COLORS.accent }}>✅ Nessun ordine</div>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={{ ...styles.th, ...styles.thFirst }}>Richiesta</th>
                    <th style={styles.th}>Codice</th>
                    <th style={styles.th}>Qty</th>
                    <th style={{ ...styles.th, ...styles.thLast }}>Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {toOrder.map((item, idx) => (
                    <tr key={idx}>
                      <td style={styles.td}><strong>{formatReqNum(item.req.num, item.req.sub)}</strong></td>
                      <td style={styles.td}><strong>{item.code}</strong></td>
                      <td style={styles.td}><strong>{item.qty}</strong></td>
                      <td style={styles.td}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button style={styles.btnSmall(COLORS.info)} onClick={() => markAsOrdered(item.req, item, 'Standard')}>📦 Standard</button>
                          <button style={styles.btnSmall(COLORS.warning)} onClick={() => markAsOrdered(item.req, item, 'Urgent')}>⚡ Urgente</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {ordersTab === 'pending' && (
          <div style={styles.card}>
            <div style={styles.cardTitle}>📦 ORDINATI - IN ATTESA</div>
            {pending.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 60, color: COLORS.accent }}>✅ Nessun ordine</div>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={{ ...styles.th, ...styles.thFirst }}>Richiesta</th>
                    <th style={styles.th}>Codice</th>
                    <th style={styles.th}>Qty</th>
                    <th style={styles.th}>Tipo</th>
                    <th style={{ ...styles.th, ...styles.thLast }}>Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {pending.map(order => (
                    <tr key={order.id}>
                      <td style={styles.td}><strong>{order.reqNum}</strong></td>
                      <td style={styles.td}><strong>{order.code}</strong></td>
                      <td style={styles.td}><strong>{order.qty}</strong></td>
                      <td style={styles.td}><span style={styles.statusBadge(order.orderType === 'Urgent' ? COLORS.warning : COLORS.info)}>{order.orderType}</span></td>
                      <td style={styles.td}>
                        <button style={styles.btnSmall(COLORS.success)} onClick={() => markOrderArrived(order)}>✅ Arrivato</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {ordersTab === 'log' && (
          <div style={styles.card}>
            <div style={styles.cardTitle}>📜 ORDER LOG</div>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={{ ...styles.th, ...styles.thFirst }}>Richiesta</th>
                  <th style={styles.th}>Codice</th>
                  <th style={styles.th}>Qty</th>
                  <th style={styles.th}>Tipo</th>
                  <th style={{ ...styles.th, ...styles.thLast }}>Stato</th>
                </tr>
              </thead>
              <tbody>
                {orderLog.map(o => (
                  <tr key={o.id}>
                    <td style={styles.td}>{o.reqNum}</td>
                    <td style={styles.td}>{o.code}</td>
                    <td style={styles.td}>{o.qty}</td>
                    <td style={styles.td}>{o.orderType}</td>
                    <td style={styles.td}><span style={styles.statusBadge(o.status === 'Arrived' ? COLORS.success : COLORS.warning)}>{o.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const renderMIR = () => (
    <div>
      <div style={styles.card}>
        <div style={styles.cardTitle}>📋 REGISTRA NUOVO MIR</div>
        <div style={styles.formGrid}>
          <div style={styles.formGroup}>
            <label style={styles.label}>MIR Number *</label>
            <input style={styles.input} value={mirForm.mir} onChange={e => setMirForm({...mirForm, mir: e.target.value})} placeholder="es. MIR-001" />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>RK Number *</label>
            <input style={styles.input} value={mirForm.rk} onChange={e => setMirForm({...mirForm, rk: e.target.value})} placeholder="es. RK-001" />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Data Prevista</label>
            <input style={styles.input} type="date" value={mirForm.forecast} onChange={e => setMirForm({...mirForm, forecast: e.target.value})} />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Priorità</label>
            <select style={styles.select} value={mirForm.priority} onChange={e => setMirForm({...mirForm, priority: e.target.value})}>
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
              <option>Urgent</option>
            </select>
          </div>
        </div>
        <button style={styles.btn(COLORS.primary)} onClick={async () => {
          if (!mirForm.mir || !mirForm.rk) return alert('Compila MIR e RK!');
          await supabase.from('mirs').insert({ mir_number: mirForm.mir, rk_number: mirForm.rk, status: 'Pending', forecast_date: mirForm.forecast, priority: mirForm.priority });
          setMirForm({ mir: '', rk: '', forecast: '', priority: 'Medium' });
          await loadAllData(); alert('✅ MIR registrato!');
        }}>➕ Registra MIR</button>
      </div>

      <div style={styles.card}>
        <div style={styles.cardTitle}>📋 MIR PENDENTI</div>
        {mirs.filter(m => m.status === 'Pending').length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: COLORS.accent }}>✅ Nessun MIR pendente</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.th, ...styles.thFirst }}>MIR</th>
                <th style={styles.th}>RK</th>
                <th style={styles.th}>Priorità</th>
                <th style={{ ...styles.th, ...styles.thLast }}>Previsione</th>
              </tr>
            </thead>
            <tbody>
              {mirs.filter(m => m.status === 'Pending').map(mir => (
                <tr key={mir.id}>
                  <td style={styles.td}><strong>{mir.mir}</strong></td>
                  <td style={styles.td}>{mir.rk}</td>
                  <td style={styles.td}><span style={styles.statusBadge(mir.priority === 'Urgent' ? COLORS.primary : mir.priority === 'High' ? COLORS.warning : COLORS.success)}>{mir.priority}</span></td>
                  <td style={styles.td}>{formatDate(mir.forecast)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );

  const renderMaterialIn = () => (
    <div style={styles.card}>
      <div style={styles.cardTitle}>📥 CARICA MATERIALE IN YARD</div>
      <div style={styles.formGrid}>
        <div style={styles.formGroup}>
          <label style={styles.label}>Codice Materiale *</label>
          <select style={styles.select} value={loadForm.code} onChange={e => setLoadForm({...loadForm, code: e.target.value})}>
            <option value="">-- Seleziona --</option>
            {Object.entries(materials).map(([code, desc]) => (
              <option key={code} value={code}>{code} - {desc}</option>
            ))}
          </select>
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Quantità *</label>
          <input style={styles.input} type="number" value={loadForm.qty} onChange={e => setLoadForm({...loadForm, qty: e.target.value})} />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>MIR Reference</label>
          <select style={styles.select} value={loadForm.mir} onChange={e => setLoadForm({...loadForm, mir: e.target.value})}>
            <option value="">-- Seleziona MIR --</option>
            {mirs.filter(m => m.status === 'Pending').map(mir => (
              <option key={mir.id} value={mir.mir}>{mir.mir} - {mir.rk}</option>
            ))}
          </select>
        </div>
      </div>
      <button style={styles.btn(COLORS.success)} onClick={loadMaterial}>📥 Carica in YARD</button>
    </div>
  );

  const renderMovements = () => (
    <div style={styles.card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={styles.cardTitle}>📜 STORICO MOVIMENTI</div>
        <button style={styles.btn(COLORS.info)} onClick={() => setModal('balance')}>+ Aggiungi</button>
      </div>
      <div style={styles.searchBox}>
        <span>🔍</span>
        <input style={styles.searchInput} placeholder="Cerca movimenti..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={{ ...styles.th, ...styles.thFirst }}>Data</th>
            <th style={styles.th}>Tipo</th>
            <th style={styles.th}>Loc</th>
            <th style={styles.th}>Codice</th>
            <th style={styles.th}>Qty</th>
            <th style={{ ...styles.th, ...styles.thLast }}>Note</th>
          </tr>
        </thead>
        <tbody>
          {movements.filter(m => !search || m.code?.toLowerCase().includes(search.toLowerCase())).slice(0, 50).map(m => (
            <tr key={m.id}>
              <td style={styles.td}>{formatDateTime(m.d)}</td>
              <td style={styles.td}><span style={styles.statusBadge(m.type === 'IN' ? COLORS.success : m.type === 'OUT' ? COLORS.primary : COLORS.warning)}>{m.type}</span></td>
              <td style={styles.td}>{m.loc}</td>
              <td style={styles.td}><strong>{m.code}</strong></td>
              <td style={styles.td}>{m.qty}</td>
              <td style={styles.td}>{m.note || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderStatus = () => (
    <div style={styles.card}>
      <div style={styles.cardTitle}>🔍 CERCA RICHIESTE</div>
      <div style={styles.searchBox}>
        <span>🔍</span>
        <input style={styles.searchInput} placeholder="Cerca per numero, nome, codice..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={{ ...styles.th, ...styles.thFirst }}>Richiesta</th>
            <th style={styles.th}>Data</th>
            <th style={styles.th}>Richiedente</th>
            <th style={styles.th}>ISO/Spool</th>
            <th style={styles.th}>Codice</th>
            <th style={styles.th}>Qty</th>
            <th style={{ ...styles.th, ...styles.thLast }}>Stato</th>
          </tr>
        </thead>
        <tbody>
          {requests.filter(r => !search || r.num?.toString().includes(search) || r.name?.toLowerCase().includes(search.toLowerCase())).slice(0, 50).flatMap(r => r.comp?.map(c => ({ ...c, req: r })) || []).map((item, idx) => (
            <tr key={idx}>
              <td style={styles.td}><strong>{formatReqNum(item.req.num, item.req.sub)}</strong></td>
              <td style={styles.td}>{formatDate(item.req.date)}</td>
              <td style={styles.td}>{item.req.name}</td>
              <td style={styles.td}>{item.req.iso} / {item.req.spool}</td>
              <td style={styles.td}><strong>{item.code}</strong></td>
              <td style={styles.td}>{item.qty}</td>
              <td style={styles.td}><span style={styles.statusBadge(item.st === 'Done' ? COLORS.success : item.st === 'UT' || item.st === 'Eng' ? COLORS.purple : item.st === 'Trans' ? COLORS.orange : item.st === 'Out' ? COLORS.success : COLORS.accent)}>{item.st}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderModal = () => {
    if (!modal) return null;
    if (modal === 'balance') {
      return (
        <div style={styles.modal} onClick={() => setModal(null)}>
          <div style={styles.modalBox} onClick={e => e.stopPropagation()}>
            <div style={{ ...styles.cardTitle, marginBottom: 28 }}>⚖️ Rettifica Inventario</div>
            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Tipo *</label>
                <select style={styles.select} value={balanceForm.balType} onChange={e => setBalanceForm({...balanceForm, balType: e.target.value})}>
                  <option>Adjustment</option>
                  <option>Lost</option>
                  <option>Broken</option>
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Location</label>
                <select style={styles.select} value={balanceForm.loc} onChange={e => setBalanceForm({...balanceForm, loc: e.target.value})}>
                  <option>YARD</option>
                  <option>SITE</option>
                </select>
              </div>
            </div>
            {(balanceForm.balType === 'Lost' || balanceForm.balType === 'Broken') && (
              <div style={styles.alert('error')}>⚠️ La quantità verrà sottratta dall'inventario</div>
            )}
            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Codice *</label>
                <select style={styles.select} value={balanceForm.code} onChange={e => setBalanceForm({...balanceForm, code: e.target.value})}>
                  <option value="">-- Seleziona --</option>
                  {Object.entries(materials).map(([code, desc]) => (
                    <option key={code} value={code}>{code} - {desc}</option>
                  ))}
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Quantità *</label>
                <input style={styles.input} type="number" value={balanceForm.qty} onChange={e => setBalanceForm({...balanceForm, qty: e.target.value})} />
              </div>
            </div>
            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Nome *</label>
                <input style={styles.input} value={balanceForm.name} onChange={e => setBalanceForm({...balanceForm, name: e.target.value})} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Badge *</label>
                <input style={styles.input} value={balanceForm.badge} onChange={e => setBalanceForm({...balanceForm, badge: e.target.value})} />
              </div>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Note</label>
              <input style={styles.input} value={balanceForm.note} onChange={e => setBalanceForm({...balanceForm, note: e.target.value})} placeholder="Motivo della rettifica" />
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 32 }}>
              <button style={styles.btn(COLORS.success)} onClick={registerBalance}>✅ Salva</button>
              <button style={{ ...styles.btn(COLORS.accent), background: 'transparent', color: COLORS.accent, border: '2px solid ' + COLORS.accent, boxShadow: 'none' }} onClick={() => setModal(null)}>Annulla</button>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // ========== MAIN RENDER ==========
  return (
    <div style={styles.app}>
      {/* SIDEBAR */}
      <div style={styles.sidebar}>
        <div style={styles.logoArea}>
          <div style={styles.logoIcon}>S</div>
          {!sidebarCollapsed && (
            <div>
              <div style={{ fontWeight: 800, fontSize: 18 }}>STREICHER</div>
              <div style={{ fontSize: 11, opacity: 0.7 }}>Materials Manager V25</div>
            </div>
          )}
        </div>

        <div style={styles.nav}>
          {navItems.map(item => (
            <div
              key={item.id}
              style={styles.navItem(view === item.id)}
              onClick={() => setView(item.id)}
            >
              <span style={{ fontSize: 20, width: 24, textAlign: 'center' }}>{item.icon}</span>
              {!sidebarCollapsed && <span style={{ flex: 1 }}>{item.label}</span>}
              {!sidebarCollapsed && item.count > 0 && <span style={styles.badge}>{item.count}</span>}
            </div>
          ))}
        </div>

        <div style={styles.collapseBtn} onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
          {sidebarCollapsed ? '→' : '← Comprimi'}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div style={styles.main}>
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={styles.headerIcon}>{navItems.find(n => n.id === view)?.icon}</div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: COLORS.secondary }}>{navItems.find(n => n.id === view)?.label.toUpperCase()}</div>
              <div style={{ color: COLORS.accent, fontSize: 13 }}>{new Date().toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
            </div>
          </div>
          <div style={{ fontSize: 13, color: COLORS.accent, fontWeight: 600 }}>V25 STREICHER Edition</div>
        </div>

        <div style={styles.content}>
          {loading && (
            <div style={{ textAlign: 'center', padding: 80 }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
              <div style={{ fontSize: 16, color: COLORS.accent }}>Caricamento...</div>
            </div>
          )}
          {!loading && view === 'dashboard' && renderDashboard()}
          {!loading && view === 'newRequest' && renderNewRequest()}
          {!loading && view === 'whSite' && renderWarehouse('Site')}
          {!loading && view === 'whYard' && renderWarehouse('Yard')}
          {!loading && view === 'siteIn' && renderSiteIn()}
          {!loading && view === 'recordOut' && renderRecordOut()}
          {!loading && view === 'mir' && renderMIR()}
          {!loading && view === 'materialIn' && renderMaterialIn()}
          {!loading && view === 'engineering' && renderEngineering()}
          {!loading && view === 'spare' && renderSpare()}
          {!loading && view === 'management' && renderManagement()}
          {!loading && view === 'orders' && renderOrders()}
          {!loading && view === 'movements' && renderMovements()}
          {!loading && view === 'status' && renderStatus()}
        </div>
      </div>

      {renderModal()}
    </div>
  );
}
