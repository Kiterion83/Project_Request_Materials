// ============================================================
// MATERIALS MANAGER V25 - SUPABASE VERSION (ENGLISH)
// ============================================================
// Before using, create a .env file with:
// VITE_SUPABASE_URL=your_supabase_url
// VITE_SUPABASE_ANON_KEY=your_anon_key
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
  const [editCell, setEditCell] = useState(null);
  const [editVal, setEditVal] = useState('');
  const [editReason, setEditReason] = useState('');

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
      const { data: matData } = await supabase.from('materials').select('*').eq('is_active', true);
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
          const loc = i.location.toLowerCase();
          if (loc === 'intransit') inv.inTransit[i.code] = i.quantity;
          else if (inv[loc]) inv[loc][i.code] = i.quantity;
        });
        setInventory(inv);
      }

      // Load requests with components
      const { data: reqData } = await supabase.from('requests').select(`
        *,
        request_components (*)
      `).order('created_at', { ascending: false });
      if (reqData) {
        const formattedRequests = reqData.map(r => ({
          id: r.id,
          num: r.request_number,
          sub: r.sub_number,
          name: r.requester_name,
          badge: r.requester_badge,
          iso: r.iso,
          spool: r.spool,
          hf: r.hf_number,
          cat: r.category,
          date: r.created_at,
          comp: r.request_components.map(c => ({
            id: c.id,
            code: c.code,
            desc: c.description,
            qty: c.quantity,
            st: c.status,
            sentTo: c.sent_to,
            engCat: c.eng_category,
            engNote: c.eng_note,
            mngNote: c.mng_note,
            mngDate: c.mng_date,
            orderType: c.order_type,
            orderDate: c.order_date,
            purchaseQty: c.purchase_qty,
            purchaseForecast: c.purchase_forecast,
            spareDate: c.spare_date,
            techNote: c.tech_note,
            checkResponse: c.check_response
          }))
        }));
        setRequests(formattedRequests);
      }

      // Load movements
      const { data: movData } = await supabase.from('movements').select('*').order('movement_date', { ascending: false });
      if (movData) {
        setMovements(movData.map(m => ({
          id: m.id,
          d: m.movement_date,
          type: m.type,
          loc: m.location,
          code: m.code,
          qty: m.quantity,
          note: m.note,
          balType: m.balance_type,
          ref: m.reference,
          mir: m.mir_number,
          rk: m.rk_number
        })));
      }

      // Load MIRs
      const { data: mirData } = await supabase.from('mirs').select('*').order('created_at', { ascending: false });
      if (mirData) {
        setMirs(mirData.map(m => ({
          id: m.id,
          mir: m.mir_number,
          rk: m.rk_number,
          dateIn: m.insert_date,
          forecast: m.forecast_date,
          priority: m.priority,
          st: m.status
        })));
      }

      // Load project DB
      const { data: pdbData } = await supabase.from('project_db').select('*');
      if (pdbData) {
        setProjectDb(pdbData.map(p => ({
          id: p.id,
          iso: p.iso,
          spool: p.spool,
          code: p.code,
          desc: p.description,
          qtyPrj: p.qty_project,
          qtyTEN: p.qty_ten,
          qtyOut: p.qty_out
        })));
      }

      // Load DB log
      const { data: logData } = await supabase.from('db_log').select('*').order('log_date', { ascending: false });
      if (logData) {
        setDbLog(logData.map(l => ({
          id: l.id,
          date: l.log_date,
          iso: l.iso,
          code: l.code,
          field: l.field_name,
          oldVal: l.old_value,
          newVal: l.new_value,
          name: l.modified_by_name,
          badge: l.modified_by_badge,
          reason: l.reason
        })));
      }

      // Load ready for pickup
      const { data: readyData } = await supabase.from('ready_out').select('*').order('ready_at', { ascending: false });
      if (readyData) {
        setReadyOut(readyData.map(r => ({
          id: r.id,
          reqId: r.request_id,
          compId: r.component_id,
          reqNum: r.request_number,
          name: r.requester_name,
          badge: r.requester_badge,
          iso: r.iso,
          spool: r.spool,
          hf: r.hf_number,
          code: r.code,
          desc: r.description,
          qty: r.quantity,
          loc: r.location
        })));
      }

      // Load delivered
      const { data: delData } = await supabase.from('delivered').select('*').order('delivered_at', { ascending: false });
      if (delData) {
        setDelivered(delData.map(d => ({
          id: d.id,
          reqNum: d.request_number,
          name: d.requester_name,
          badge: d.requester_badge,
          iso: d.iso,
          spool: d.spool,
          code: d.code,
          desc: d.description,
          qty: d.quantity,
          date: d.delivered_at
        })));
      }

      // Load order log
      const { data: ordData } = await supabase.from('order_log').select('*').order('created_at', { ascending: false });
      if (ordData) {
        setOrderLog(ordData.map(o => ({
          id: o.id,
          reqNum: o.request_number,
          code: o.code,
          desc: o.description,
          qty: o.quantity,
          orderType: o.order_type,
          orderDate: o.order_date,
          forecast: o.forecast_date,
          status: o.status,
          arrivedDate: o.arrived_date
        })));
      }

      // Load counter
      const { data: cntData } = await supabase.from('counters').select('*').eq('id', 'request_number').single();
      if (cntData) setCounter(cntData.value);

    } catch (err) {
      setError('Error loading data: ' + err.message);
      console.error(err);
    }
    setLoading(false);
  };

  // ============================================================
  // UTILITY FUNCTIONS
  // ============================================================
  const now = () => new Date().toISOString();
  const today = () => new Date().toISOString().split('T')[0];
  const formatDate = (d) => d ? new Date(d).toLocaleDateString() : '';
  const formatDateTime = (d) => d ? new Date(d).toLocaleString() : '';
  const formatReqNum = (n, s) => `${n}-${s}`;

  // ============================================================
  // DATABASE OPERATIONS
  // ============================================================

  // Update inventory in Supabase
  const updateInventory = async (code, location, quantity) => {
    const loc = location.toUpperCase();
    const { data, error } = await supabase
      .from('inventory')
      .upsert({ code, location: loc, quantity, last_updated: now() }, { onConflict: 'code,location' });
    if (error) console.error('Inventory update error:', error);
  };

  // Add movement to Supabase
  const addMovement = async (movement) => {
    const { error } = await supabase.from('movements').insert({
      movement_date: movement.d || now(),
      type: movement.type,
      location: movement.loc,
      code: movement.code,
      quantity: movement.qty,
      note: movement.note,
      balance_type: movement.balType,
      reference: movement.ref,
      mir_number: movement.mir,
      rk_number: movement.rk
    });
    if (error) console.error('Movement insert error:', error);
  };

  // Get next request number
  const getNextRequestNumber = async () => {
    const { data, error } = await supabase.rpc('get_next_request_number');
    if (error) {
      console.error('Counter error:', error);
      return counter + 1;
    }
    setCounter(data);
    return data;
  };

  // ============================================================
  // REQUEST MANAGEMENT
  // ============================================================

  const addItemToRequest = () => {
    if (!itemForm.code || !itemForm.qty || +itemForm.qty <= 0) return alert('Select code and enter valid quantity');
    const desc = materials[itemForm.code] || itemForm.code;
    setRequestItems([...requestItems, { 
      id: Date.now(), 
      code: itemForm.code, 
      desc, 
      qty: +itemForm.qty 
    }]);
    setItemForm({ code: '', qty: '' });
  };

  const removeItemFromRequest = (itemId) => {
    setRequestItems(requestItems.filter(i => i.id !== itemId));
  };

  const submitRequest = async (destination) => {
    if (!form.name || !form.badge || !form.iso || !form.spool) return alert('Fill all required fields');
    if (form.cat === 'Erection' && !form.hf) return alert('HF Number is required for Erection');
    if (requestItems.length === 0) return alert('Add at least one material');

    // Check HF duplicate
    if (form.hf) {
      const existingHF = requests.find(r => r.hf === form.hf);
      if (existingHF) {
        const conf = window.confirm(`⚠️ HF ${form.hf} already used by ${existingHF.name} (Badge: ${existingHF.badge}). Continue anyway?`);
        if (!conf) return;
      }
    }

    setLoading(true);
    try {
      const reqNum = await getNextRequestNumber();
      const status = destination === 'Eng' ? 'Eng' : destination;

      // Insert request header
      const { data: reqData, error: reqError } = await supabase.from('requests').insert({
        request_number: reqNum,
        sub_number: 0,
        requester_name: form.name,
        requester_badge: form.badge,
        iso: form.iso,
        spool: form.spool,
        hf_number: form.hf || null,
        category: form.cat
      }).select().single();

      if (reqError) throw reqError;

      // Insert components
      const components = requestItems.map(item => ({
        request_id: reqData.id,
        code: item.code,
        description: item.desc,
        quantity: item.qty,
        status: status,
        sent_to: destination
      }));

      const { error: compError } = await supabase.from('request_components').insert(components);
      if (compError) throw compError;

      // Update local state
      const newRequest = {
        id: reqData.id,
        num: reqNum,
        sub: 0,
        name: form.name,
        badge: form.badge,
        iso: form.iso,
        spool: form.spool,
        hf: form.hf,
        cat: form.cat,
        date: now(),
        comp: requestItems.map((item, idx) => ({
          id: `${reqData.id}-${idx}`,
          code: item.code,
          desc: item.desc,
          qty: item.qty,
          st: status,
          sentTo: destination
        }))
      };

      setRequests([newRequest, ...requests]);
      setForm({ name: '', badge: '', iso: '', spool: '', hf: '', cat: 'Bulk' });
      setRequestItems([]);
      alert(`✅ Request ${reqNum}-0 sent to ${destination}`);

    } catch (err) {
      setError('Error creating request: ' + err.message);
      console.error(err);
    }
    setLoading(false);
  };

  // ============================================================
  // COMPONENT STATUS UPDATES
  // ============================================================

  const updateComponentStatus = async (reqId, compId, newStatus, additionalData = {}) => {
    try {
      const updateData = { 
        status: newStatus, 
        modified_at: now(),
        ...additionalData 
      };

      const { error } = await supabase
        .from('request_components')
        .update(updateData)
        .eq('id', compId);

      if (error) throw error;

      // Update local state
      setRequests(requests.map(r => {
        if (r.id === reqId) {
          return {
            ...r,
            comp: r.comp.map(c => c.id === compId ? { ...c, st: newStatus, ...additionalData } : c)
          };
        }
        return r;
      }));

      return true;
    } catch (err) {
      console.error('Status update error:', err);
      return false;
    }
  };

  // Move to Ready for Pickup (OUT)
  const moveToOut = async (req, comp) => {
    const success = await updateComponentStatus(req.id, comp.id, 'Out');
    if (success) {
      // Add to ready_out table
      await supabase.from('ready_out').insert({
        request_id: req.id,
        component_id: comp.id,
        request_number: formatReqNum(req.num, req.sub),
        requester_name: req.name,
        requester_badge: req.badge,
        iso: req.iso,
        spool: req.spool,
        hf_number: req.hf,
        code: comp.code,
        description: comp.desc,
        quantity: comp.qty,
        location: 'SITE'
      });

      setReadyOut([...readyOut, {
        id: Date.now(),
        reqId: req.id,
        compId: comp.id,
        reqNum: formatReqNum(req.num, req.sub),
        name: req.name,
        badge: req.badge,
        iso: req.iso,
        spool: req.spool,
        hf: req.hf,
        code: comp.code,
        desc: comp.desc,
        qty: comp.qty,
        loc: 'SITE'
      }]);
    }
  };

  // Deliver material
  const deliverMaterial = async (item) => {
    // Remove from ready_out
    await supabase.from('ready_out').delete().eq('id', item.id);

    // Add to delivered
    await supabase.from('delivered').insert({
      request_id: item.reqId,
      component_id: item.compId,
      request_number: item.reqNum,
      requester_name: item.name,
      requester_badge: item.badge,
      iso: item.iso,
      spool: item.spool,
      code: item.code,
      description: item.desc,
      quantity: item.qty
    });

    // Update component status
    if (item.reqId && item.compId) {
      await updateComponentStatus(item.reqId, item.compId, 'Done');
    }

    // Update inventory
    const newSiteQty = (inventory.site[item.code] || 0) - item.qty;
    await updateInventory(item.code, 'SITE', Math.max(0, newSiteQty));
    setInventory({
      ...inventory,
      site: { ...inventory.site, [item.code]: Math.max(0, newSiteQty) }
    });

    // Add movement
    const mov = {
      d: now(),
      type: 'OUT',
      loc: 'SITE',
      code: item.code,
      qty: -item.qty,
      note: `Delivered to ${item.name} #${item.badge}`,
      ref: item.reqNum
    };
    await addMovement(mov);
    setMovements([{ id: Date.now(), ...mov }, ...movements]);

    // Update local state
    setReadyOut(readyOut.filter(r => r.id !== item.id));
    setDelivered([{
      id: Date.now(),
      reqNum: item.reqNum,
      name: item.name,
      badge: item.badge,
      iso: item.iso,
      spool: item.spool,
      code: item.code,
      desc: item.desc,
      qty: item.qty,
      date: now()
    }, ...delivered]);

    // Update project DB qty_out
    const pdbItem = projectDb.find(p => p.iso === item.iso && p.code === item.code);
    if (pdbItem) {
      await supabase.from('project_db').update({ qty_out: pdbItem.qtyOut + item.qty }).eq('id', pdbItem.id);
      setProjectDb(projectDb.map(p => 
        p.id === pdbItem.id ? { ...p, qtyOut: p.qtyOut + item.qty } : p
      ));
    }
  };

  // ============================================================
  // MIR MANAGEMENT
  // ============================================================

  const createMIR = async () => {
    if (!mirForm.mir || !mirForm.rk || !mirForm.forecast) return alert('Fill all required fields');

    try {
      const { data, error } = await supabase.from('mirs').insert({
        mir_number: mirForm.mir,
        rk_number: mirForm.rk,
        insert_date: today(),
        forecast_date: mirForm.forecast,
        priority: mirForm.priority,
        status: 'Pending'
      }).select().single();

      if (error) throw error;

      setMirs([{
        id: data.id,
        mir: mirForm.mir,
        rk: mirForm.rk,
        dateIn: today(),
        forecast: mirForm.forecast,
        priority: mirForm.priority,
        st: 'Pending'
      }, ...mirs]);

      setMirForm({ mir: '', rk: '', forecast: '', priority: 'Medium' });
      alert(`✅ MIR ${mirForm.mir} created`);

    } catch (err) {
      setError('Error creating MIR: ' + err.message);
    }
  };

  // ============================================================
  // MATERIAL LOADING (IN)
  // ============================================================

  const loadMaterial = async () => {
    if (!loadForm.code || !loadForm.qty || +loadForm.qty <= 0) return alert('Select code and enter valid quantity');

    const qty = +loadForm.qty;
    const newYardQty = (inventory.yard[loadForm.code] || 0) + qty;

    // Update inventory
    await updateInventory(loadForm.code, 'YARD', newYardQty);
    setInventory({
      ...inventory,
      yard: { ...inventory.yard, [loadForm.code]: newYardQty }
    });

    // Add movement
    const mov = {
      d: now(),
      type: 'IN',
      loc: 'YARD',
      code: loadForm.code,
      qty: qty,
      note: loadForm.mir ? `MIR: ${loadForm.mir}` : 'Manual load',
      mir: loadForm.mir,
      rk: loadForm.rk
    };
    await addMovement(mov);
    setMovements([{ id: Date.now(), ...mov }, ...movements]);

    // Update MIR status if applicable
    if (loadForm.mir) {
      const mir = mirs.find(m => m.mir === loadForm.mir);
      if (mir && mir.st === 'Pending') {
        await supabase.from('mirs').update({ status: 'Partial' }).eq('id', mir.id);
        setMirs(mirs.map(m => m.id === mir.id ? { ...m, st: 'Partial' } : m));
      }
    }

    setLoadForm({ code: '', qty: '', mir: '', rk: '' });
    alert(`✅ ${qty} x ${loadForm.code} loaded to YARD`);
  };

  // ============================================================
  // BALANCE ADJUSTMENT
  // ============================================================

  const registerBalance = async () => {
    if (!balanceForm.code || !balanceForm.qty || !balanceForm.name || !balanceForm.badge) {
      return alert('Fill all required fields');
    }

    const loc = balanceForm.loc.toLowerCase();
    let qtyChange = +balanceForm.qty;

    // For Lost and Broken, quantity must be negative
    if ((balanceForm.balType === 'Lost' || balanceForm.balType === 'Broken') && qtyChange > 0) {
      qtyChange = -qtyChange;
    }

    const currentQty = inventory[loc]?.[balanceForm.code] || 0;
    const newQty = currentQty + qtyChange;

    if (newQty < 0) return alert('Resulting quantity would be negative!');

    // Update inventory
    await updateInventory(balanceForm.code, balanceForm.loc, newQty);
    setInventory({
      ...inventory,
      [loc]: { ...inventory[loc], [balanceForm.code]: newQty }
    });

    // Add movement
    const noteText = `[${balanceForm.balType}] ${balanceForm.note} [by ${balanceForm.name} #${balanceForm.badge}]`;
    const mov = {
      d: now(),
      type: 'BAL',
      loc: balanceForm.loc,
      code: balanceForm.code,
      qty: qtyChange,
      note: noteText,
      balType: balanceForm.balType
    };
    await addMovement(mov);
    setMovements([{ id: Date.now(), ...mov }, ...movements]);

    setBalanceForm({ code: '', qty: '', loc: 'YARD', balType: 'Adjustment', note: '', name: '', badge: '' });
    setModal(null);
    alert(`✅ Balance adjustment recorded`);
  };

  // ============================================================
  // TRANSFER YARD → SITE
  // ============================================================

  const transferToSite = async (req, comp) => {
    const success = await updateComponentStatus(req.id, comp.id, 'Trans');
    if (success) {
      // Update inventory
      const yardQty = (inventory.yard[comp.code] || 0) - comp.qty;
      const transitQty = (inventory.inTransit[comp.code] || 0) + comp.qty;

      await updateInventory(comp.code, 'YARD', Math.max(0, yardQty));
      await updateInventory(comp.code, 'INTRANSIT', transitQty);

      setInventory({
        ...inventory,
        yard: { ...inventory.yard, [comp.code]: Math.max(0, yardQty) },
        inTransit: { ...inventory.inTransit, [comp.code]: transitQty }
      });

      // Add movement
      const mov = {
        d: now(),
        type: 'TRF',
        loc: 'Y→S',
        code: comp.code,
        qty: comp.qty,
        note: `Transfer for ${req.name}`,
        ref: formatReqNum(req.num, req.sub)
      };
      await addMovement(mov);
      setMovements([{ id: Date.now(), ...mov }, ...movements]);
    }
  };

  // Confirm arrival at Site
  const confirmArrival = async (req, comp) => {
    const success = await updateComponentStatus(req.id, comp.id, 'Site');
    if (success) {
      // Update inventory
      const transitQty = (inventory.inTransit[comp.code] || 0) - comp.qty;
      const siteQty = (inventory.site[comp.code] || 0) + comp.qty;

      await updateInventory(comp.code, 'INTRANSIT', Math.max(0, transitQty));
      await updateInventory(comp.code, 'SITE', siteQty);

      setInventory({
        ...inventory,
        inTransit: { ...inventory.inTransit, [comp.code]: Math.max(0, transitQty) },
        site: { ...inventory.site, [comp.code]: siteQty }
      });
    }
  };

  // ============================================================
  // STATISTICS
  // ============================================================

  const lostCount = movements.filter(m => m.balType === 'Lost').reduce((sum, m) => sum + Math.abs(m.qty), 0);
  const brokenCount = movements.filter(m => m.balType === 'Broken').reduce((sum, m) => sum + Math.abs(m.qty), 0);

  const stats = {
    site: requests.reduce((n, r) => n + r.comp.filter(c => c.st === 'Site' || c.st === 'ChkS').length, 0),
    yard: requests.reduce((n, r) => n + r.comp.filter(c => c.st === 'Yard' || c.st === 'ChkY').length, 0),
    trans: requests.reduce((n, r) => n + r.comp.filter(c => c.st === 'Trans').length, 0),
    out: readyOut.length,
    eng: requests.reduce((n, r) => n + r.comp.filter(c => c.st === 'Eng').length, 0),
    spare: requests.reduce((n, r) => n + r.comp.filter(c => c.st === 'Spare').length, 0),
    mng: requests.reduce((n, r) => n + r.comp.filter(c => c.st === 'Mng').length, 0),
    order: requests.reduce((n, r) => n + r.comp.filter(c => c.st === 'Order').length, 0),
    ordered: requests.reduce((n, r) => n + r.comp.filter(c => c.st === 'Ordered').length, 0),
    mirP: mirs.filter(m => m.st !== 'Done').length,
    lost: lostCount,
    broken: brokenCount
  };

  // ============================================================
  // STYLES
  // ============================================================

  const s = {
    app: { display: 'flex', height: '100vh', fontFamily: 'Arial, sans-serif', fontSize: 11, background: '#f0f0f0' },
    sidebar: { width: 100, background: '#1E3A8A', color: '#fff', display: 'flex', flexDirection: 'column', flexShrink: 0 },
    logo: { padding: 8, textAlign: 'center', fontWeight: 'bold', borderBottom: '1px solid #3B5BA9', fontSize: 10 },
    nav: { flex: 1, overflowY: 'auto' },
    navItem: (active) => ({ padding: '8px 6px', cursor: 'pointer', background: active ? '#2563EB' : 'transparent', borderLeft: active ? '3px solid #fff' : '3px solid transparent', fontSize: 9, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }),
    badge: { background: '#DC2626', borderRadius: 8, padding: '1px 5px', fontSize: 8 },
    main: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
    header: { background: '#DC2626', color: '#fff', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    content: { flex: 1, padding: 10, overflowY: 'auto' },
    box: { background: '#fff', padding: 8, borderRadius: 4, marginBottom: 8, boxShadow: '0 1px 2px rgba(0,0,0,.1)' },
    grid: { display: 'grid', gap: 8 },
    inp: { padding: 5, border: '1px solid #ccc', borderRadius: 3, fontSize: 10, width: '100%', boxSizing: 'border-box' },
    btn: (c) => ({ padding: '4px 8px', background: c, color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer', fontSize: 9, marginRight: 4 }),
    tbl: { width: '100%', borderCollapse: 'collapse', fontSize: 9 },
    th: { background: '#1E3A8A', color: '#fff', padding: 4, textAlign: 'left', fontWeight: 'bold' },
    td: { padding: 4, borderBottom: '1px solid #eee' },
    modal: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modalBox: { background: '#fff', padding: 16, borderRadius: 6, minWidth: 350, maxWidth: '90%', maxHeight: '80vh', overflow: 'auto' },
    dashBox: (color) => ({ background: color, color: '#fff', padding: 10, borderRadius: 6, textAlign: 'center', cursor: 'pointer', minHeight: 60 }),
    labelRow: { display: 'flex', gap: 8, marginBottom: 6, flexWrap: 'wrap' },
    labelBox: { flex: 1, minWidth: 80 },
    label: { fontSize: 8, color: '#666', marginBottom: 2 }
  };

  // ============================================================
  // NAVIGATION ITEMS
  // ============================================================

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
    { id: 'spare', label: 'Spare', icon: '⭐', count: stats.spare },
    { id: 'management', label: 'Management', icon: '👔', count: stats.mng },
    { id: 'orders', label: 'Orders', icon: '🛒', count: stats.order + stats.ordered },
    { id: 'database', label: 'Database', icon: '🗄️' },
    { id: 'status', label: 'Status', icon: '🔍' },
    { id: 'movements', label: 'Movements', icon: '📜' }
  ];

  // ============================================================
  // RENDER FUNCTIONS
  // ============================================================

  const renderDashboard = () => (
    <div>
      {/* Urgent Operations */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 'bold', marginBottom: 6 }}>⚡ URGENT OPERATIONS</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
          <div style={s.dashBox('#DC2626')} onClick={() => setView('mir')}>
            <div style={{ fontSize: 20, fontWeight: 'bold' }}>{stats.mirP}</div>
            <div style={{ fontSize: 9 }}>📋 MIR Open</div>
          </div>
          <div style={s.dashBox('#EA580C')} onClick={() => setView('siteIn')}>
            <div style={{ fontSize: 20, fontWeight: 'bold' }}>{stats.trans}</div>
            <div style={{ fontSize: 9 }}>🚚 In Transit</div>
          </div>
          <div style={s.dashBox('#16A34A')} onClick={() => setView('recordOut')}>
            <div style={{ fontSize: 20, fontWeight: 'bold' }}>{stats.out}</div>
            <div style={{ fontSize: 9 }}>📤 Ready OUT</div>
          </div>
          <div style={s.dashBox('#7C3AED')} onClick={() => setView('engineering')}>
            <div style={{ fontSize: 20, fontWeight: 'bold' }}>{stats.eng}</div>
            <div style={{ fontSize: 9 }}>🔧 Engineering</div>
          </div>
          <div style={s.dashBox('#EC4899')} onClick={() => setView('spare')}>
            <div style={{ fontSize: 20, fontWeight: 'bold' }}>{stats.spare}</div>
            <div style={{ fontSize: 9 }}>⭐ Spare</div>
          </div>
        </div>
      </div>

      {/* Warehouses & Management */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 'bold', marginBottom: 6 }}>📦 WAREHOUSES & MANAGEMENT</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
          <div style={s.dashBox('#2563EB')} onClick={() => setView('whSite')}>
            <div style={{ fontSize: 20, fontWeight: 'bold' }}>{stats.site}</div>
            <div style={{ fontSize: 9 }}>🏭 WH Site</div>
          </div>
          <div style={s.dashBox('#CA8A04')} onClick={() => setView('whYard')}>
            <div style={{ fontSize: 20, fontWeight: 'bold' }}>{stats.yard}</div>
            <div style={{ fontSize: 9 }}>🏗️ WH Yard</div>
          </div>
          <div style={s.dashBox('#0891B2')} onClick={() => setView('management')}>
            <div style={{ fontSize: 20, fontWeight: 'bold' }}>{stats.mng}</div>
            <div style={{ fontSize: 9 }}>👔 Management</div>
          </div>
          <div style={s.dashBox('#F97316')} onClick={() => { setView('orders'); setOrdersTab('toOrder'); }}>
            <div style={{ fontSize: 20, fontWeight: 'bold' }}>{stats.order}</div>
            <div style={{ fontSize: 9 }}>🛒 To Order</div>
          </div>
          <div style={s.dashBox('#059669')} onClick={() => { setView('orders'); setOrdersTab('pending'); }}>
            <div style={{ fontSize: 20, fontWeight: 'bold' }}>{stats.ordered}</div>
            <div style={{ fontSize: 9 }}>📦 Ordered</div>
          </div>
        </div>
      </div>

      {/* Material Losses */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 'bold', marginBottom: 6 }}>⚠️ MATERIAL LOSSES</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          <div style={s.dashBox('#991B1B')} onClick={() => setView('movements')}>
            <div style={{ fontSize: 20, fontWeight: 'bold' }}>{stats.lost}</div>
            <div style={{ fontSize: 9 }}>❌ Lost Items</div>
          </div>
          <div style={s.dashBox('#B91C1C')} onClick={() => setView('movements')}>
            <div style={{ fontSize: 20, fontWeight: 'bold' }}>{stats.broken}</div>
            <div style={{ fontSize: 9 }}>💔 Broken Items</div>
          </div>
        </div>
      </div>

      {/* Summary & Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div style={s.box}>
          <div style={{ fontWeight: 'bold', marginBottom: 6 }}>📊 SUMMARY</div>
          <div style={{ fontSize: 9, lineHeight: 1.6 }}>
            <div>• Yard Stock: {Object.values(inventory.yard).reduce((a, b) => a + b, 0)} pcs</div>
            <div>• Site Stock: {Object.values(inventory.site).reduce((a, b) => a + b, 0)} pcs</div>
            <div>• In Transit: {Object.values(inventory.inTransit).reduce((a, b) => a + b, 0)} pcs</div>
            <div>• Delivered Today: {delivered.filter(d => d.date?.split('T')[0] === today()).length}</div>
            <div>• Total Lost: {stats.lost} pcs</div>
            <div>• Total Broken: {stats.broken} pcs</div>
          </div>
        </div>
        <div style={s.box}>
          <div style={{ fontWeight: 'bold', marginBottom: 6 }}>🎯 QUICK ACTIONS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <button style={s.btn('#2563EB')} onClick={() => setView('newRequest')}>+ New Request</button>
            <button style={s.btn('#DC2626')} onClick={() => setView('mir')}>+ New MIR</button>
            <button style={s.btn('#16A34A')} onClick={() => setView('materialIn')}>📥 Load Material</button>
            <button style={s.btn('#7C3AED')} onClick={() => setView('movements')}>📜 View Movements</button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderNewRequest = () => (
    <div style={s.box}>
      {/* Header Form */}
      <div style={{ fontWeight: 'bold', marginBottom: 8 }}>📝 REQUEST DETAILS</div>
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
          <input style={s.inp} value={form.iso} onChange={e => setForm({ ...form, iso: e.target.value })} placeholder="ISO code" />
        </div>
        <div style={s.labelBox}>
          <div style={s.label}>Spool *</div>
          <input style={s.inp} value={form.spool} onChange={e => setForm({ ...form, spool: e.target.value })} placeholder="Spool code" />
        </div>
        <div style={s.labelBox}>
          <div style={s.label}>HF # {form.cat === 'Erection' ? '*' : ''}</div>
          <input style={s.inp} value={form.hf} onChange={e => setForm({ ...form, hf: e.target.value })} placeholder="HF number" disabled={form.cat !== 'Erection'} />
        </div>
      </div>
      <div style={s.labelRow}>
        <div style={s.labelBox}>
          <div style={s.label}>Category</div>
          <select style={s.inp} value={form.cat} onChange={e => setForm({ ...form, cat: e.target.value, hf: e.target.value !== 'Erection' ? '' : form.hf })}>
            <option>Bulk</option>
            <option>Erection</option>
            <option>Support</option>
          </select>
        </div>
      </div>

      {/* Add Material */}
      <div style={{ borderTop: '1px solid #eee', marginTop: 12, paddingTop: 12 }}>
        <div style={{ fontWeight: 'bold', marginBottom: 8 }}>➕ ADD MATERIAL</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <div style={{ flex: 2 }}>
            <div style={s.label}>Code</div>
            <select style={s.inp} value={itemForm.code} onChange={e => setItemForm({ ...itemForm, code: e.target.value })}>
              <option value="">-- Select --</option>
              {Object.entries(materials).map(([code, desc]) => (
                <option key={code} value={code}>{code} - {desc}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <div style={s.label}>Qty</div>
            <input style={s.inp} type="number" min="1" value={itemForm.qty} onChange={e => setItemForm({ ...itemForm, qty: e.target.value })} />
          </div>
          <button style={s.btn('#16A34A')} onClick={addItemToRequest}>+ ADD</button>
        </div>
      </div>

      {/* Items List */}
      {requestItems.length > 0 && (
        <div style={{ borderTop: '1px solid #eee', marginTop: 12, paddingTop: 12 }}>
          <div style={{ fontWeight: 'bold', marginBottom: 8 }}>📦 MATERIALS IN REQUEST ({requestItems.length})</div>
          <table style={s.tbl}>
            <thead>
              <tr>
                <th style={s.th}>Code</th>
                <th style={s.th}>Description</th>
                <th style={s.th}>Qty</th>
                <th style={s.th}></th>
              </tr>
            </thead>
            <tbody>
              {requestItems.map(item => (
                <tr key={item.id}>
                  <td style={s.td}>{item.code}</td>
                  <td style={s.td}>{item.desc}</td>
                  <td style={s.td}>{item.qty}</td>
                  <td style={s.td}>
                    <button style={s.btn('#DC2626')} onClick={() => removeItemFromRequest(item.id)}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Send Buttons */}
      <div style={{ borderTop: '1px solid #eee', marginTop: 12, paddingTop: 12 }}>
        <div style={{ fontWeight: 'bold', marginBottom: 8 }}>📤 SEND REQUEST</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button 
            style={{ ...s.btn('#2563EB'), opacity: requestItems.length === 0 ? 0.5 : 1, flex: 1, padding: 10 }} 
            onClick={() => submitRequest('Site')} 
            disabled={requestItems.length === 0}
          >
            🏭 SEND TO SITE
          </button>
          <button 
            style={{ ...s.btn('#CA8A04'), opacity: requestItems.length === 0 ? 0.5 : 1, flex: 1, padding: 10 }} 
            onClick={() => submitRequest('Yard')} 
            disabled={requestItems.length === 0}
          >
            🏗️ SEND TO YARD
          </button>
          <button 
            style={{ ...s.btn('#7C3AED'), opacity: requestItems.length === 0 ? 0.5 : 1, flex: 1, padding: 10 }} 
            onClick={() => submitRequest('Eng')} 
            disabled={requestItems.length === 0}
          >
            🔧 SEND TO ENG.
          </button>
        </div>
      </div>
    </div>
  );

  const renderWarehouse = (location) => {
    const statusFilter = location === 'Site' ? ['Site', 'ChkS'] : ['Yard', 'ChkY'];
    const items = [];
    requests.forEach(r => {
      r.comp.filter(c => statusFilter.includes(c.st)).forEach(c => {
        items.push({ req: r, comp: c });
      });
    });

    return (
      <div style={s.box}>
        <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 'bold' }}>{location === 'Site' ? '🏭' : '🏗️'} {location.toUpperCase()} WAREHOUSE ({items.length})</span>
          <input style={{ ...s.inp, width: 200 }} placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
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
              return (
                <tr key={`${req.id}-${comp.id}`} style={{ background: isCheck ? '#FEF3C7' : 'transparent' }}>
                  <td style={s.td}>{formatReqNum(req.num, req.sub)}</td>
                  <td style={s.td}>{req.name}</td>
                  <td style={s.td}>{req.iso}/{req.spool}</td>
                  <td style={s.td}>{comp.code}</td>
                  <td style={s.td}>{comp.qty}</td>
                  <td style={{ ...s.td, color: stock >= comp.qty ? '#16A34A' : '#DC2626' }}>{stock}</td>
                  <td style={s.td}>
                    {isCheck ? (
                      <>
                        <button style={s.btn('#16A34A')} onClick={() => updateComponentStatus(req.id, comp.id, location)}>OK</button>
                        <button style={s.btn('#DC2626')} onClick={() => updateComponentStatus(req.id, comp.id, 'Eng')}>NO</button>
                      </>
                    ) : (
                      <>
                        {location === 'Site' && stock >= comp.qty && (
                          <button style={s.btn('#16A34A')} onClick={() => moveToOut(req, comp)}>✓ OUT</button>
                        )}
                        {location === 'Site' && (
                          <button style={s.btn('#CA8A04')} onClick={() => updateComponentStatus(req.id, comp.id, 'Yard')}>→Y</button>
                        )}
                        {location === 'Yard' && stock >= comp.qty && (
                          <button style={s.btn('#16A34A')} onClick={() => transferToSite(req, comp)}>✓ Trans</button>
                        )}
                        <button style={s.btn('#7C3AED')} onClick={() => updateComponentStatus(req.id, comp.id, 'Eng')}>→Eng</button>
                        <button style={s.btn('#DC2626')} onClick={() => updateComponentStatus(req.id, comp.id, 'Done')}>🗑️</button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const renderSiteIn = () => {
    const items = [];
    requests.forEach(r => {
      r.comp.filter(c => c.st === 'Trans').forEach(c => {
        items.push({ req: r, comp: c });
      });
    });

    return (
      <div style={s.box}>
        <div style={{ fontWeight: 'bold', marginBottom: 8 }}>🚚 MATERIALS IN TRANSIT ({items.length})</div>
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
                <td style={s.td}>{formatReqNum(req.num, req.sub)}</td>
                <td style={s.td}>{req.name}</td>
                <td style={s.td}>{comp.code}</td>
                <td style={s.td}>{comp.qty}</td>
                <td style={s.td}>
                  <button style={s.btn('#16A34A')} onClick={() => confirmArrival(req, comp)}>✓ Arrived</button>
                  <button style={s.btn('#6B7280')} onClick={() => updateComponentStatus(req.id, comp.id, 'Yard')}>↩ Back</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderRecordOut = () => (
    <div style={s.box}>
      <div style={{ fontWeight: 'bold', marginBottom: 8 }}>📤 READY FOR PICKUP ({readyOut.length})</div>
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
              <td style={s.td}>{item.reqNum}</td>
              <td style={s.td}>{item.name}</td>
              <td style={s.td}>{item.badge}</td>
              <td style={s.td}>{item.code}</td>
              <td style={s.td}>{item.qty}</td>
              <td style={s.td}>
                <button style={s.btn('#16A34A')} onClick={() => deliverMaterial(item)}>✓ Deliver</button>
                <button style={s.btn('#6B7280')} onClick={() => {
                  supabase.from('ready_out').delete().eq('id', item.id);
                  setReadyOut(readyOut.filter(r => r.id !== item.id));
                }}>↩ Back</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderMIR = () => (
    <div>
      <div style={s.box}>
        <div style={{ fontWeight: 'bold', marginBottom: 8 }}>📋 NEW MIR</div>
        <div style={s.labelRow}>
          <div style={s.labelBox}>
            <div style={s.label}>MIR # *</div>
            <input style={s.inp} value={mirForm.mir} onChange={e => setMirForm({ ...mirForm, mir: e.target.value })} placeholder="MRS2145" />
          </div>
          <div style={s.labelBox}>
            <div style={s.label}>RK # *</div>
            <input style={s.inp} value={mirForm.rk} onChange={e => setMirForm({ ...mirForm, rk: e.target.value })} placeholder="RK0020_1123" />
          </div>
          <div style={s.labelBox}>
            <div style={s.label}>Forecast *</div>
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
        <button style={s.btn('#DC2626')} onClick={createMIR}>+ CREATE MIR</button>
      </div>

      <div style={s.box}>
        <div style={{ fontWeight: 'bold', marginBottom: 8 }}>📋 OPEN MIRs ({mirs.filter(m => m.st !== 'Done').length})</div>
        <table style={s.tbl}>
          <thead>
            <tr>
              <th style={s.th}>MIR</th>
              <th style={s.th}>RK</th>
              <th style={s.th}>Date</th>
              <th style={s.th}>Forecast</th>
              <th style={s.th}>Priority</th>
              <th style={s.th}>Status</th>
              <th style={s.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {mirs.filter(m => m.st !== 'Done').map(m => (
              <tr key={m.id}>
                <td style={s.td}>{m.mir}</td>
                <td style={s.td}>{m.rk}</td>
                <td style={s.td}>{formatDate(m.dateIn)}</td>
                <td style={s.td}>{formatDate(m.forecast)}</td>
                <td style={{ ...s.td, color: m.priority === 'High' ? '#DC2626' : m.priority === 'Medium' ? '#CA8A04' : '#16A34A' }}>{m.priority}</td>
                <td style={s.td}>{m.st}</td>
                <td style={s.td}>
                  <button style={s.btn('#16A34A')} onClick={async () => {
                    await supabase.from('mirs').update({ status: 'Done', completed_at: now() }).eq('id', m.id);
                    setMirs(mirs.map(mir => mir.id === m.id ? { ...mir, st: 'Done' } : mir));
                  }}>✓ Done</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderMaterialIn = () => (
    <div style={s.box}>
      <div style={{ fontWeight: 'bold', marginBottom: 8 }}>📥 LOAD MATERIAL TO YARD</div>
      <div style={s.labelRow}>
        <div style={{ flex: 2 }}>
          <div style={s.label}>Code *</div>
          <select style={s.inp} value={loadForm.code} onChange={e => setLoadForm({ ...loadForm, code: e.target.value })}>
            <option value="">-- Select --</option>
            {Object.entries(materials).map(([code, desc]) => (
              <option key={code} value={code}>{code} - {desc}</option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <div style={s.label}>Qty *</div>
          <input style={s.inp} type="number" min="1" value={loadForm.qty} onChange={e => setLoadForm({ ...loadForm, qty: e.target.value })} />
        </div>
      </div>
      <div style={s.labelRow}>
        <div style={s.labelBox}>
          <div style={s.label}>MIR # (optional)</div>
          <select style={s.inp} value={loadForm.mir} onChange={e => {
            const mir = mirs.find(m => m.mir === e.target.value);
            setLoadForm({ ...loadForm, mir: e.target.value, rk: mir?.rk || '' });
          }}>
            <option value="">-- None --</option>
            {mirs.filter(m => m.st !== 'Done').map(m => (
              <option key={m.id} value={m.mir}>{m.mir}</option>
            ))}
          </select>
        </div>
        <div style={s.labelBox}>
          <div style={s.label}>RK #</div>
          <input style={s.inp} value={loadForm.rk} readOnly />
        </div>
      </div>
      <button style={s.btn('#16A34A')} onClick={loadMaterial}>📥 LOAD</button>
    </div>
  );

  const renderEngineering = () => {
    const items = [];
    requests.forEach(r => {
      r.comp.filter(c => c.st === 'Eng').forEach(c => {
        items.push({ req: r, comp: c });
      });
    });

    return (
      <div style={s.box}>
        <div style={{ fontWeight: 'bold', marginBottom: 8 }}>🔧 ENGINEERING ({items.length})</div>
        <table style={s.tbl}>
          <thead>
            <tr>
              <th style={s.th}>Req #</th>
              <th style={s.th}>Name</th>
              <th style={s.th}>ISO/Spool</th>
              <th style={s.th}>Code</th>
              <th style={s.th}>Qty</th>
              <th style={s.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(({ req, comp }) => (
              <tr key={`${req.id}-${comp.id}`}>
                <td style={s.td}>{formatReqNum(req.num, req.sub)}</td>
                <td style={s.td}>{req.name}</td>
                <td style={s.td}>{req.iso}/{req.spool}</td>
                <td style={s.td}>{comp.code}</td>
                <td style={s.td}>{comp.qty}</td>
                <td style={s.td}>
                  <button style={s.btn('#16A34A')} onClick={() => moveToOut(req, comp)}>✓ OUT</button>
                  <button style={s.btn('#2563EB')} onClick={() => updateComponentStatus(req.id, comp.id, 'ChkS')}>🔍S</button>
                  <button style={s.btn('#CA8A04')} onClick={() => updateComponentStatus(req.id, comp.id, 'ChkY')}>🔍Y</button>
                  <button style={s.btn('#EC4899')} onClick={() => updateComponentStatus(req.id, comp.id, 'Spare')}>Sp</button>
                  <button style={s.btn('#0891B2')} onClick={() => updateComponentStatus(req.id, comp.id, 'Mng')}>M</button>
                  <button style={s.btn('#6B7280')} onClick={() => updateComponentStatus(req.id, comp.id, comp.sentTo || 'Site')}>↩</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderManagement = () => {
    const items = [];
    requests.forEach(r => {
      r.comp.filter(c => c.st === 'Mng').forEach(c => {
        items.push({ req: r, comp: c });
      });
    });

    return (
      <div style={s.box}>
        <div style={{ fontWeight: 'bold', marginBottom: 8 }}>👔 MANAGEMENT ({items.length})</div>
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
                <td style={s.td}>{formatReqNum(req.num, req.sub)}</td>
                <td style={s.td}>{req.name}</td>
                <td style={s.td}>{comp.code}</td>
                <td style={s.td}>{comp.qty}</td>
                <td style={s.td}>
                  <button style={s.btn('#16A34A')} onClick={() => updateComponentStatus(req.id, comp.id, 'Order', { orderType: 'Internal' })}>Int</button>
                  <button style={s.btn('#EA580C')} onClick={() => updateComponentStatus(req.id, comp.id, 'Order', { orderType: 'Client' })}>Cli</button>
                  <button style={s.btn('#6B7280')} onClick={() => updateComponentStatus(req.id, comp.id, 'Eng')}>↩</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderMovements = () => {
    const filteredMovements = movements.filter(m =>
      !movSearch ||
      m.code?.toLowerCase().includes(movSearch.toLowerCase()) ||
      m.note?.toLowerCase().includes(movSearch.toLowerCase()) ||
      m.type?.toLowerCase().includes(movSearch.toLowerCase()) ||
      m.loc?.toLowerCase().includes(movSearch.toLowerCase())
    );

    return (
      <div style={s.box}>
        <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 'bold' }}>📜 MOVEMENTS ({filteredMovements.length})</span>
          <div>
            <input style={{ ...s.inp, width: 200, marginRight: 8 }} placeholder="Search..." value={movSearch} onChange={e => setMovSearch(e.target.value)} />
            <button style={s.btn('#7C3AED')} onClick={() => setModal('balance')}>⚖️ Adjustment</button>
          </div>
        </div>
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
            {filteredMovements.slice(0, 100).map(m => (
              <tr key={m.id} style={{ background: m.balType === 'Lost' || m.balType === 'Broken' ? '#FEF2F2' : 'transparent' }}>
                <td style={s.td}>{formatDateTime(m.d)}</td>
                <td style={{ ...s.td, color: m.type === 'IN' ? '#16A34A' : m.type === 'OUT' ? '#2563EB' : m.type === 'TRF' ? '#EA580C' : '#7C3AED' }}>
                  {m.type}
                  {m.balType === 'Lost' && ' ❌'}
                  {m.balType === 'Broken' && ' 💔'}
                </td>
                <td style={s.td}>{m.loc}</td>
                <td style={s.td}>{m.code}</td>
                <td style={{ ...s.td, color: m.qty > 0 ? '#16A34A' : '#DC2626' }}>{m.qty > 0 ? '+' : ''}{m.qty}</td>
                <td style={{ ...s.td, maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderDatabase = () => (
    <div style={s.box}>
      <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 'bold' }}>🗄️ PROJECT DATABASE</span>
        {!dbUnlocked && (
          <div style={{ display: 'flex', gap: 4 }}>
            <input style={s.inp} type="password" placeholder="Password" value={pwdInput} onChange={e => setPwdInput(e.target.value)} />
            <button style={s.btn('#7C3AED')} onClick={() => {
              if (pwdInput === 'admin123') {
                setDbUnlocked(true);
                setPwdInput('');
              } else {
                alert('Wrong password');
              }
            }}>🔓 Unlock</button>
          </div>
        )}
        {dbUnlocked && <button style={s.btn('#6B7280')} onClick={() => setDbUnlocked(false)}>🔒 Lock</button>}
      </div>

      <table style={s.tbl}>
        <thead>
          <tr>
            <th style={s.th}>ISO</th>
            <th style={s.th}>Spool</th>
            <th style={s.th}>Code</th>
            <th style={{ ...s.th, background: '#7C3AED' }}>Prj</th>
            <th style={{ ...s.th, background: '#7C3AED' }}>TEN</th>
            <th style={{ ...s.th, background: '#16A34A' }}>Tot</th>
            <th style={{ ...s.th, background: '#CA8A04' }}>Y</th>
            <th style={{ ...s.th, background: '#2563EB' }}>S</th>
            <th style={{ ...s.th, background: '#DC2626' }}>Out</th>
          </tr>
        </thead>
        <tbody>
          {projectDb.map(row => {
            const y = inventory.yard[row.code] || 0;
            const site = inventory.site[row.code] || 0;
            const tot = y + site - row.qtyOut;
            return (
              <tr key={row.id}>
                <td style={s.td}>{row.iso}</td>
                <td style={s.td}>{row.spool}</td>
                <td style={s.td}>{row.code}</td>
                <td style={{ ...s.td, cursor: dbUnlocked ? 'pointer' : 'default', background: '#F3E8FF' }} onClick={() => dbUnlocked && setEditCell({ row, field: 'qtyPrj' })}>{row.qtyPrj}</td>
                <td style={{ ...s.td, cursor: dbUnlocked ? 'pointer' : 'default', background: '#F3E8FF' }} onClick={() => dbUnlocked && setEditCell({ row, field: 'qtyTEN' })}>{row.qtyTEN}</td>
                <td style={{ ...s.td, background: '#DCFCE7', fontWeight: 'bold' }}>{tot}</td>
                <td style={{ ...s.td, background: '#FEF9C3' }}>{y}</td>
                <td style={{ ...s.td, background: '#DBEAFE' }}>{site}</td>
                <td style={{ ...s.td, background: '#FEE2E2' }}>{row.qtyOut}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {dbLog.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 'bold', marginBottom: 4 }}>📋 Modification Log</div>
          <table style={s.tbl}>
            <thead>
              <tr>
                <th style={s.th}>Date</th>
                <th style={s.th}>ISO</th>
                <th style={s.th}>Code</th>
                <th style={s.th}>Field</th>
                <th style={s.th}>Old</th>
                <th style={s.th}>New</th>
                <th style={s.th}>By</th>
                <th style={s.th}>Reason</th>
              </tr>
            </thead>
            <tbody>
              {dbLog.slice(0, 20).map(l => (
                <tr key={l.id}>
                  <td style={s.td}>{formatDateTime(l.date)}</td>
                  <td style={s.td}>{l.iso}</td>
                  <td style={s.td}>{l.code}</td>
                  <td style={s.td}>{l.field}</td>
                  <td style={s.td}>{l.oldVal}</td>
                  <td style={s.td}>{l.newVal}</td>
                  <td style={s.td}>{l.name} #{l.badge}</td>
                  <td style={s.td}>{l.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderStatus = () => {
    const filtered = requests.filter(r => {
      if (statusFilters.name && !r.name.toLowerCase().includes(statusFilters.name.toLowerCase())) return false;
      if (statusFilters.num && !formatReqNum(r.num, r.sub).includes(statusFilters.num)) return false;
      if (statusFilters.code && !r.comp.some(c => c.code.toLowerCase().includes(statusFilters.code.toLowerCase()))) return false;
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
          <input style={s.inp} placeholder="HF #" value={statusFilters.hf} onChange={e => setStatusFilters({ ...statusFilters, hf: e.target.value })} />
        </div>
        <table style={s.tbl}>
          <thead>
            <tr>
              <th style={s.th}>Req #</th>
              <th style={s.th}>Date</th>
              <th style={s.th}>Name</th>
              <th style={s.th}>Badge</th>
              <th style={s.th}>ISO/Spool</th>
              <th style={s.th}>HF</th>
              <th style={s.th}>Code</th>
              <th style={s.th}>Qty</th>
              <th style={s.th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 50).flatMap(r => r.comp.map(c => (
              <tr key={`${r.id}-${c.id}`}>
                <td style={s.td}>{formatReqNum(r.num, r.sub)}</td>
                <td style={s.td}>{formatDate(r.date)}</td>
                <td style={s.td}>{r.name}</td>
                <td style={s.td}>{r.badge}</td>
                <td style={s.td}>{r.iso}/{r.spool}</td>
                <td style={s.td}>{r.hf || '-'}</td>
                <td style={s.td}>{c.code}</td>
                <td style={s.td}>{c.qty}</td>
                <td style={{ ...s.td, fontWeight: 'bold', color: c.st === 'Done' ? '#16A34A' : c.st === 'Out' ? '#2563EB' : '#000' }}>{c.st}</td>
              </tr>
            )))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderSpare = () => {
    const items = [];
    requests.forEach(r => {
      r.comp.filter(c => c.st === 'Spare').forEach(c => {
        items.push({ req: r, comp: c });
      });
    });

    return (
      <div style={s.box}>
        <div style={{ fontWeight: 'bold', marginBottom: 8 }}>⭐ CLIENT SPARE ({items.length})</div>
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
                <td style={s.td}>{formatReqNum(req.num, req.sub)}</td>
                <td style={s.td}>{req.name}</td>
                <td style={s.td}>{comp.code}</td>
                <td style={s.td}>{comp.qty}</td>
                <td style={s.td}>
                  <button style={s.btn('#16A34A')} onClick={() => moveToOut(req, comp)}>✓ OUT</button>
                  <button style={s.btn('#0891B2')} onClick={() => updateComponentStatus(req.id, comp.id, 'Mng')}>M</button>
                  <button style={s.btn('#6B7280')} onClick={() => updateComponentStatus(req.id, comp.id, 'Eng')}>↩</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderOrders = () => {
    const toOrder = [];
    const pending = [];
    requests.forEach(r => {
      r.comp.filter(c => c.st === 'Order').forEach(c => toOrder.push({ req: r, comp: c }));
      r.comp.filter(c => c.st === 'Ordered').forEach(c => pending.push({ req: r, comp: c }));
    });

    return (
      <div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <button style={s.btn(ordersTab === 'toOrder' ? '#F97316' : '#6B7280')} onClick={() => setOrdersTab('toOrder')}>🛒 To Order ({toOrder.length})</button>
          <button style={s.btn(ordersTab === 'pending' ? '#059669' : '#6B7280')} onClick={() => setOrdersTab('pending')}>📦 Pending ({pending.length})</button>
          <button style={s.btn(ordersTab === 'log' ? '#7C3AED' : '#6B7280')} onClick={() => setOrdersTab('log')}>📋 Log ({orderLog.length})</button>
        </div>

        {ordersTab === 'toOrder' && (
          <div style={s.box}>
            <table style={s.tbl}>
              <thead>
                <tr>
                  <th style={s.th}>Req #</th>
                  <th style={s.th}>Code</th>
                  <th style={s.th}>Qty</th>
                  <th style={s.th}>Type</th>
                  <th style={s.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {toOrder.map(({ req, comp }) => (
                  <tr key={`${req.id}-${comp.id}`}>
                    <td style={s.td}>{formatReqNum(req.num, req.sub)}</td>
                    <td style={s.td}>{comp.code}</td>
                    <td style={s.td}>{comp.qty}</td>
                    <td style={{ ...s.td, color: comp.orderType === 'Internal' ? '#16A34A' : '#EA580C' }}>{comp.orderType || '-'}</td>
                    <td style={s.td}>
                      <button style={s.btn('#16A34A')} onClick={async () => {
                        await updateComponentStatus(req.id, comp.id, 'Ordered', { orderDate: today() });
                        await supabase.from('order_log').insert({
                          request_number: formatReqNum(req.num, req.sub),
                          code: comp.code,
                          description: comp.desc,
                          quantity: comp.qty,
                          order_type: comp.orderType,
                          order_date: today(),
                          status: 'Ordered'
                        });
                        setOrderLog([{
                          id: Date.now(),
                          reqNum: formatReqNum(req.num, req.sub),
                          code: comp.code,
                          desc: comp.desc,
                          qty: comp.qty,
                          orderType: comp.orderType,
                          orderDate: today(),
                          status: 'Ordered'
                        }, ...orderLog]);
                      }}>🛒 Confirm</button>
                      <button style={s.btn('#6B7280')} onClick={() => updateComponentStatus(req.id, comp.id, 'Mng')}>↩</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {ordersTab === 'pending' && (
          <div style={s.box}>
            <table style={s.tbl}>
              <thead>
                <tr>
                  <th style={s.th}>Req #</th>
                  <th style={s.th}>Code</th>
                  <th style={s.th}>Qty</th>
                  <th style={s.th}>Order Date</th>
                  <th style={s.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pending.map(({ req, comp }) => (
                  <tr key={`${req.id}-${comp.id}`}>
                    <td style={s.td}>{formatReqNum(req.num, req.sub)}</td>
                    <td style={s.td}>{comp.code}</td>
                    <td style={s.td}>{comp.qty}</td>
                    <td style={s.td}>{formatDate(comp.orderDate)}</td>
                    <td style={s.td}>
                      <button style={s.btn('#16A34A')} onClick={() => moveToOut(req, comp)}>📥 Arrived</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {ordersTab === 'log' && (
          <div style={s.box}>
            <table style={s.tbl}>
              <thead>
                <tr>
                  <th style={s.th}>Req #</th>
                  <th style={s.th}>Code</th>
                  <th style={s.th}>Qty</th>
                  <th style={s.th}>Type</th>
                  <th style={s.th}>Order Date</th>
                  <th style={s.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {orderLog.map(o => (
                  <tr key={o.id}>
                    <td style={s.td}>{o.reqNum}</td>
                    <td style={s.td}>{o.code}</td>
                    <td style={s.td}>{o.qty}</td>
                    <td style={s.td}>{o.orderType}</td>
                    <td style={s.td}>{formatDate(o.orderDate)}</td>
                    <td style={{ ...s.td, color: o.status === 'Arrived' ? '#16A34A' : '#CA8A04' }}>{o.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  // ============================================================
  // MODALS
  // ============================================================

  const renderModal = () => {
    if (!modal) return null;

    if (modal === 'balance') {
      return (
        <div style={s.modal} onClick={() => setModal(null)}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 'bold', marginBottom: 12 }}>⚖️ Inventory Adjustment</div>
            <div style={s.labelRow}>
              <div style={s.labelBox}>
                <div style={s.label}>Type *</div>
                <select style={s.inp} value={balanceForm.balType} onChange={e => setBalanceForm({ ...balanceForm, balType: e.target.value })}>
                  <option>Adjustment</option>
                  <option>Lost</option>
                  <option>Broken</option>
                </select>
              </div>
              <div style={s.labelBox}>
                <div style={s.label}>Location</div>
                <select style={s.inp} value={balanceForm.loc} onChange={e => setBalanceForm({ ...balanceForm, loc: e.target.value })}>
                  <option>YARD</option>
                  <option>SITE</option>
                </select>
              </div>
            </div>
            {(balanceForm.balType === 'Lost' || balanceForm.balType === 'Broken') && (
              <div style={{ background: '#FEF2F2', padding: 8, borderRadius: 4, marginBottom: 8, fontSize: 10, color: '#DC2626' }}>
                ⚠️ Quantity will be subtracted from inventory
              </div>
            )}
            <div style={s.labelRow}>
              <div style={{ flex: 2 }}>
                <div style={s.label}>Code *</div>
                <select style={s.inp} value={balanceForm.code} onChange={e => setBalanceForm({ ...balanceForm, code: e.target.value })}>
                  <option value="">-- Select --</option>
                  {Object.entries(materials).map(([code, desc]) => (
                    <option key={code} value={code}>{code}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <div style={s.label}>Qty *</div>
                <input style={s.inp} type="number" value={balanceForm.qty} onChange={e => setBalanceForm({ ...balanceForm, qty: e.target.value })} />
              </div>
            </div>
            <div style={s.labelRow}>
              <div style={s.labelBox}>
                <div style={s.label}>Name *</div>
                <input style={s.inp} value={balanceForm.name} onChange={e => setBalanceForm({ ...balanceForm, name: e.target.value })} />
              </div>
              <div style={s.labelBox}>
                <div style={s.label}>Badge *</div>
                <input style={s.inp} value={balanceForm.badge} onChange={e => setBalanceForm({ ...balanceForm, badge: e.target.value })} />
              </div>
            </div>
            <div style={s.labelBox}>
              <div style={s.label}>Note</div>
              <input style={s.inp} value={balanceForm.note} onChange={e => setBalanceForm({ ...balanceForm, note: e.target.value })} />
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <button style={s.btn('#16A34A')} onClick={registerBalance}>✓ Save</button>
              <button style={s.btn('#6B7280')} onClick={() => setModal(null)}>Cancel</button>
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
      {/* Sidebar */}
      <div style={s.sidebar}>
        <div style={s.logo}>MATERIALS<br/>MANAGER</div>
        <div style={s.nav}>
          {navItems.map(item => (
            <div key={item.id} style={s.navItem(view === item.id)} onClick={() => setView(item.id)}>
              <span>{item.icon} {item.label}</span>
              {item.count > 0 && <span style={s.badge}>{item.count}</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div style={s.main}>
        <div style={s.header}>
          <span style={{ fontWeight: 'bold' }}>{navItems.find(n => n.id === view)?.icon} {navItems.find(n => n.id === view)?.label.toUpperCase()}</span>
          <span style={{ fontSize: 10 }}>{new Date().toLocaleDateString()}</span>
        </div>
        <div style={s.content}>
          {loading && <div style={{ textAlign: 'center', padding: 20 }}>Loading...</div>}
          {error && <div style={{ color: '#DC2626', padding: 8, background: '#FEE2E2', borderRadius: 4, marginBottom: 8 }}>{error}</div>}
          
          {view === 'dashboard' && renderDashboard()}
          {view === 'newRequest' && renderNewRequest()}
          {view === 'whSite' && renderWarehouse('Site')}
          {view === 'whYard' && renderWarehouse('Yard')}
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

      {/* Modals */}
      {renderModal()}
    </div>
  );
}
