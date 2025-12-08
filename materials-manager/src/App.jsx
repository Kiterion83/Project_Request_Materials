import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// ============================================
// SUPABASE CONFIG
// ============================================
const supabaseUrl = 'https://cqqlzexwcwmegqeyqyi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxcWx6ZXh3Y3dtZWdxZXlxeWkiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTczMzQxMzY4NSwiZXhwIjoyMDQ4OTg5Njg1fQ.cNGqHkWmIo5d3_hcUMaIpPxGWYmVnq8f-zthkYM5SXk';
const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================
// COLORS (STREICHER DESIGN)
// ============================================
const COLORS = {
  primary: '#E31E24',
  secondary: '#1F2937',
  background: '#F9FAFB',
  success: '#16a34a',
  warning: '#ea580c',
  info: '#2563eb',
  purple: '#7c3aed',
  pink: '#ec4899',
  cyan: '#0891b2',
  yellow: '#ca8a04',
  gray: '#6b7280',
  danger: '#dc2626',
};

// ============================================
// MAIN APP COMPONENT
// ============================================
export default function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Data states
  const [requests, setRequests] = useState([]);
  const [components, setComponents] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [movements, setMovements] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [readyOut, setReadyOut] = useState([]);
  const [delivered, setDelivered] = useState([]);
  const [orderLog, setOrderLog] = useState([]);
  
  // Modal states
  const [splitModal, setSplitModal] = useState({ open: false, component: null, destinations: [] });
  const [orderModal, setOrderModal] = useState({ open: false, component: null });
  const [movementModal, setMovementModal] = useState({ open: false });
  const [noteModal, setNoteModal] = useState({ open: false, component: null });
  const [confirmModal, setConfirmModal] = useState({ open: false, message: '', onConfirm: null });
  const [newRequestModal, setNewRequestModal] = useState(false);
  
  // Orders tab
  const [ordersTab, setOrdersTab] = useState('toOrder');

  // ============================================
  // AUTHENTICATION
  // ============================================
  const handleLogin = () => {
    if (password === 'streicher2024') {
      setIsAuthenticated(true);
    } else {
      alert('Password errata!');
    }
  };

  // ============================================
  // DATA FETCHING
  // ============================================
  const fetchAllData = async () => {
    try {
      const [reqRes, compRes, invRes, movRes, matRes, readyRes, delRes, ordRes] = await Promise.all([
        supabase.from('requests').select('*').order('created_at', { ascending: false }),
        supabase.from('request_components').select('*'),
        supabase.from('inventory').select('*'),
        supabase.from('movements').select('*').order('movement_date', { ascending: false }),
        supabase.from('materials').select('*'),
        supabase.from('ready_out').select('*'),
        supabase.from('delivered').select('*'),
        supabase.from('order_log').select('*').order('created_at', { ascending: false }),
      ]);
      
      if (reqRes.data) setRequests(reqRes.data);
      if (compRes.data) setComponents(compRes.data);
      if (invRes.data) setInventory(invRes.data);
      if (movRes.data) setMovements(movRes.data);
      if (matRes.data) setMaterials(matRes.data);
      if (readyRes.data) setReadyOut(readyRes.data);
      if (delRes.data) setDelivered(delRes.data);
      if (ordRes.data) setOrderLog(ordRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchAllData();
    }
  }, [isAuthenticated]);

  // ============================================
  // INVENTORY HELPERS
  // ============================================
  const getInventoryQty = (materialCode, location) => {
    const inv = inventory.find(i => i.material_code === materialCode && i.location === location);
    return inv ? inv.quantity : 0;
  };

  const updateInventory = async (materialCode, location, change) => {
    const existing = inventory.find(i => i.material_code === materialCode && i.location === location);
    if (existing) {
      await supabase.from('inventory').update({ 
        quantity: existing.quantity + change,
        updated_at: new Date().toISOString()
      }).eq('id', existing.id);
    } else if (change > 0) {
      await supabase.from('inventory').insert({
        material_code: materialCode,
        location,
        quantity: change
      });
    }
  };

  // ============================================
  // MOVEMENT HELPER
  // ============================================
  const recordMovement = async (type, location, materialCode, quantity, note = '', reference = '') => {
    await supabase.from('movements').insert({
      movement_type: type,
      location,
      material_code: materialCode,
      quantity,
      note,
      reference,
      movement_date: new Date().toISOString()
    });
  };

  // ============================================
  // COMPONENT STATUS UPDATE
  // ============================================
  const updateComponentStatus = async (componentId, newStatus, additionalData = {}) => {
    await supabase.from('request_components').update({ 
      status: newStatus,
      ...additionalData 
    }).eq('id', componentId);
    fetchAllData();
  };

  // ============================================
  // SPLIT LOGIC (PT)
  // ============================================
  const handleSplit = async (splitData) => {
    const { componentId, foundQty, remaining, destination } = splitData;
    const component = components.find(c => c.id === componentId);
    const request = requests.find(r => r.id === component.request_id);
    
    // Update original component with found quantity
    await supabase.from('request_components').update({ 
      quantity: foundQty 
    }).eq('id', componentId);
    
    // Get next sub_number for split
    const existingSplits = requests.filter(r => 
      r.request_number === request.request_number
    );
    const maxSub = Math.max(...existingSplits.map(r => r.sub_number || 0), 0);
    
    // Create new request for remaining
    const { data: newRequest } = await supabase.from('requests').insert({
      request_number: request.request_number,
      sub_number: maxSub + 1,
      requester: request.requester,
      badge: request.badge,
      iso: request.iso,
      spool: request.spool,
      hf: request.hf,
      category: request.category,
      status: 'Open'
    }).select().single();
    
    // Create component for split request
    await supabase.from('request_components').insert({
      request_id: newRequest.id,
      material_code: component.material_code,
      quantity: remaining,
      description: component.description,
      status: destination
    });
    
    setSplitModal({ open: false, component: null, destinations: [] });
    fetchAllData();
  };

  // ============================================
  // WH SITE ACTIONS
  // ============================================
  const handleSiteConfirm = async (component) => {
    const siteQty = getInventoryQty(component.material_code, 'SITE');
    if (siteQty < component.quantity) {
      alert('Inventario Site insufficiente!');
      return;
    }
    
    await updateInventory(component.material_code, 'SITE', -component.quantity);
    await recordMovement('OUT', 'SITE', component.material_code, component.quantity, 'Ready for delivery');
    
    const request = requests.find(r => r.id === component.request_id);
    await supabase.from('ready_out').insert({
      request_id: component.request_id,
      component_id: component.id,
      request_number: request ? `${request.request_number}-${request.sub_number || 0}` : '',
      requester: request?.requester,
      badge: request?.badge,
      iso: request?.iso,
      spool: request?.spool,
      material_code: component.material_code,
      quantity: component.quantity,
      description: component.description
    });
    
    await updateComponentStatus(component.id, 'Out');
  };

  const handleSiteToYard = async (component) => {
    await updateComponentStatus(component.id, 'Yard');
  };

  const handleSiteToUT = async (component) => {
    await updateComponentStatus(component.id, 'UT');
  };

  // ============================================
  // WH YARD ACTIONS
  // ============================================
  const handleYardConfirm = async (component) => {
    const yardQty = getInventoryQty(component.material_code, 'YARD');
    if (yardQty < component.quantity) {
      alert('Inventario Yard insufficiente!');
      return;
    }
    
    await updateInventory(component.material_code, 'YARD', -component.quantity);
    await updateInventory(component.material_code, 'INTRANSIT', component.quantity);
    await recordMovement('TRF', 'YARD→SITE', component.material_code, component.quantity, 'Transfer to Site');
    await updateComponentStatus(component.id, 'Trans');
  };

  const handleYardReturn = async (component) => {
    await updateComponentStatus(component.id, 'Site');
  };

  const handleYardToUT = async (component) => {
    await updateComponentStatus(component.id, 'UT');
  };

  // ============================================
  // SITE IN ACTIONS
  // ============================================
  const handleSiteInConfirm = async (component) => {
    await updateInventory(component.material_code, 'INTRANSIT', -component.quantity);
    await updateInventory(component.material_code, 'SITE', component.quantity);
    await recordMovement('IN', 'SITE', component.material_code, component.quantity, 'Received from Yard');
    await updateComponentStatus(component.id, 'Site');
  };

  const handleSiteInReject = async (component) => {
    await updateInventory(component.material_code, 'INTRANSIT', -component.quantity);
    await updateInventory(component.material_code, 'YARD', component.quantity);
    await updateComponentStatus(component.id, 'Yard');
  };

  // ============================================
  // ENGINEERING ACTIONS
  // ============================================
  const handleUTConfirm = async (component) => {
    const request = requests.find(r => r.id === component.request_id);
    await supabase.from('ready_out').insert({
      request_id: component.request_id,
      component_id: component.id,
      request_number: request ? `${request.request_number}-${request.sub_number || 0}` : '',
      requester: request?.requester,
      badge: request?.badge,
      iso: request?.iso,
      spool: request?.spool,
      material_code: component.material_code,
      quantity: component.quantity,
      description: component.description
    });
    await updateComponentStatus(component.id, 'Out');
  };

  const handleUTToSpare = async (component) => {
    await updateComponentStatus(component.id, 'Spare');
  };

  const handleUTToMng = async (component) => {
    await updateComponentStatus(component.id, 'Mng');
  };

  const handleUTSendNote = async (component, noteText, destination) => {
    await updateComponentStatus(component.id, 'UTCheck', {
      ut_note: noteText,
      sent_to: destination
    });
    setNoteModal({ open: false, component: null });
  };

  const handleUTReturn = async (component) => {
    const returnTo = component.sent_to === 'Yard' ? 'Yard' : 'Site';
    await updateComponentStatus(component.id, returnTo);
  };

  // ============================================
  // SPARE PARTS ACTIONS
  // ============================================
  const handleSpareConfirm = async (component) => {
    const request = requests.find(r => r.id === component.request_id);
    await supabase.from('ready_out').insert({
      request_id: component.request_id,
      component_id: component.id,
      request_number: request ? `${request.request_number}-${request.sub_number || 0}` : '',
      requester: request?.requester,
      badge: request?.badge,
      material_code: component.material_code,
      quantity: component.quantity,
      description: component.description
    });
    await updateComponentStatus(component.id, 'Out');
  };

  const handleSpareToOrder = async (component) => {
    await updateComponentStatus(component.id, 'Order');
  };

  // ============================================
  // MANAGEMENT ACTIONS
  // ============================================
  const handleMngInternal = async (component) => {
    await updateComponentStatus(component.id, 'Order', { order_type: 'Internal' });
  };

  const handleMngClient = async (component) => {
    await updateComponentStatus(component.id, 'Order', { order_type: 'Client' });
  };

  // ============================================
  // ORDERS ACTIONS
  // ============================================
  const handleOrderPurchase = async (orderData) => {
    const { componentId, qty, orderDate, forecastDate } = orderData;
    const component = components.find(c => c.id === componentId);
    
    await supabase.from('order_log').insert({
      request_id: component.request_id,
      component_id: componentId,
      material_code: component.material_code,
      quantity_ordered: qty,
      order_date: orderDate,
      forecast_date: forecastDate,
      order_type: component.order_type || 'Internal',
      status: 'Ordered'
    });
    
    await updateComponentStatus(componentId, 'Ordered', {
      purchase_qty: qty,
      purchase_date: orderDate,
      purchase_forecast: forecastDate
    });
    
    setOrderModal({ open: false, component: null });
  };

  const handleOrderArrived = async (component) => {
    await updateInventory(component.material_code, 'SITE', component.purchase_qty || component.quantity);
    await recordMovement('IN', 'SITE', component.material_code, component.purchase_qty || component.quantity, 'Order arrived');
    
    await supabase.from('order_log').update({ 
      status: 'Arrived',
      arrived_date: new Date().toISOString().split('T')[0]
    }).eq('component_id', component.id);
    
    await updateComponentStatus(component.id, 'Site');
  };

  // ============================================
  // READY OUT ACTIONS
  // ============================================
  const handleReadyOutDeliver = async (item) => {
    await supabase.from('delivered').insert({
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
    });
    
    await recordMovement('OUT', 'SITE', item.material_code, item.quantity, 'Delivered', item.request_number);
    await updateComponentStatus(item.component_id, 'Done');
    await supabase.from('ready_out').delete().eq('id', item.id);
    fetchAllData();
  };

  const handleReadyOutCancel = async (item) => {
    await updateInventory(item.material_code, 'SITE', item.quantity);
    await updateComponentStatus(item.component_id, 'Site');
    await supabase.from('ready_out').delete().eq('id', item.id);
    fetchAllData();
  };

  // ============================================
  // MOVEMENT ACTIONS
  // ============================================
  const handleNewMovement = async (movementData) => {
    const { movementType, location, materialCode, quantity, note } = movementData;
    
    await recordMovement(movementType, location, materialCode, quantity, note);
    
    if (movementType === 'IN' || movementType === 'BAL') {
      await updateInventory(materialCode, location, quantity);
    } else if (movementType === 'OUT' || movementType === 'LOST' || movementType === 'BROKEN') {
      await updateInventory(materialCode, location, -quantity);
    }
    
    setMovementModal({ open: false });
    fetchAllData();
  };

  // ============================================
  // DELETE COMPONENT
  // ============================================
  const handleDeleteComponent = async (componentId) => {
    await supabase.from('request_components').delete().eq('id', componentId);
    setConfirmModal({ open: false, message: '', onConfirm: null });
    fetchAllData();
  };

  // ============================================
  // NEW REQUEST
  // ============================================
  const handleNewRequest = async (requestData) => {
    const { data: counterData } = await supabase
      .from('counters')
      .select('current_value')
      .eq('counter_name', 'request')
      .single();
    
    let nextNumber = 1001;
    if (counterData) {
      nextNumber = counterData.current_value + 1;
      await supabase.from('counters').update({ current_value: nextNumber }).eq('counter_name', 'request');
    } else {
      await supabase.from('counters').insert({ counter_name: 'request', current_value: nextNumber });
    }
    
    const { data: newRequest } = await supabase.from('requests').insert({
      request_number: nextNumber.toString(),
      sub_number: 0,
      requester: requestData.requester,
      badge: requestData.badge,
      iso: requestData.iso,
      spool: requestData.spool,
      hf: requestData.hf,
      category: requestData.category
    }).select().single();
    
    for (const comp of requestData.components) {
      await supabase.from('request_components').insert({
        request_id: newRequest.id,
        material_code: comp.material_code,
        quantity: parseInt(comp.quantity),
        description: comp.description,
        status: 'Site'
      });
    }
    
    setNewRequestModal(false);
    fetchAllData();
  };

  // ============================================
  // RENDER HELPERS
  // ============================================
  const getRequestDisplay = (component) => {
    const request = requests.find(r => r.id === component.request_id);
    if (!request) return 'N/A';
    return `${request.request_number}-${request.sub_number || 0}`;
  };

  const getRequestInfo = (component) => {
    return requests.find(r => r.id === component.request_id);
  };

  // Filter components by status
  const siteComponents = components.filter(c => c.status === 'Site');
  const yardComponents = components.filter(c => c.status === 'Yard');
  const transComponents = components.filter(c => c.status === 'Trans');
  const utComponents = components.filter(c => c.status === 'UT');
  const utCheckComponents = components.filter(c => c.status === 'UTCheck');
  const spareComponents = components.filter(c => c.status === 'Spare');
  const mngComponents = components.filter(c => c.status === 'Mng');
  const orderComponents = components.filter(c => c.status === 'Order');
  const orderedComponents = components.filter(c => c.status === 'Ordered');

  // Calculate inventory totals
  const totalYard = inventory.filter(i => i.location === 'YARD').reduce((sum, i) => sum + (i.quantity || 0), 0);
  const totalSite = inventory.filter(i => i.location === 'SITE').reduce((sum, i) => sum + (i.quantity || 0), 0);
  const totalLost = movements.filter(m => m.movement_type === 'LOST').reduce((sum, m) => sum + (m.quantity || 0), 0);
  const totalBroken = movements.filter(m => m.movement_type === 'BROKEN').reduce((sum, m) => sum + (m.quantity || 0), 0);

  // ============================================
  // LOGIN SCREEN
  // ============================================
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f3f4f6' }}>
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md mx-4">
          {/* Logo e Titolo centrati */}
          <div className="text-center mb-8">
            <div 
              className="inline-flex items-center justify-center mb-4"
              style={{ 
                backgroundColor: COLORS.primary, 
                width: 80, 
                height: 80, 
                borderRadius: 16,
                boxShadow: '0 4px 14px rgba(227, 30, 36, 0.4)'
              }}
            >
              <span className="text-white font-bold text-4xl">S</span>
            </div>
            <h1 className="text-2xl font-bold" style={{ color: COLORS.secondary }}>STREICHER</h1>
            <p className="text-gray-500 text-sm mt-1">Materials Manager V25</p>
          </div>
          
          {/* Form Login */}
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:outline-none transition-all"
                placeholder="Inserisci password..."
              />
            </div>
            <button
              onClick={handleLogin}
              className="w-full py-3 px-4 text-white font-semibold rounded-lg transition-all hover:shadow-lg"
              style={{ 
                backgroundColor: COLORS.primary,
                boxShadow: '0 2px 8px rgba(227, 30, 36, 0.3)'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#c91a1f'}
              onMouseOut={(e) => e.target.style.backgroundColor = COLORS.primary}
            >
              Accedi
            </button>
          </div>
          
          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400">© 2024 STREICHER - Warehouse Management System</p>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // SIDEBAR NAVIGATION
  // ============================================
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'newRequest', label: 'Nuova Richiesta', icon: '➕' },
    { id: 'whSite', label: 'WH Site', icon: '🏭', count: siteComponents.length },
    { id: 'whYard', label: 'WH Yard', icon: '🏗️', count: yardComponents.length },
    { id: 'siteIn', label: 'Site IN', icon: '📥', count: transComponents.length },
    { id: 'engineering', label: 'Engineering', icon: '⚙️', count: utComponents.length + utCheckComponents.length },
    { id: 'spareParts', label: 'Spare Parts', icon: '🔧', count: spareComponents.length },
    { id: 'management', label: 'Management', icon: '📋', count: mngComponents.length },
    { id: 'orders', label: 'Orders', icon: '🛒', count: orderComponents.length + orderedComponents.length },
    { id: 'readyOut', label: 'Ready OUT', icon: '📤', count: readyOut.length },
    { id: 'delivered', label: 'Delivered', icon: '✅', count: delivered.length },
    { id: 'movements', label: 'Movements', icon: '↔️' },
    { id: 'inventory', label: 'Inventory', icon: '📦' },
    { id: 'status', label: 'Status', icon: '🔍' },
  ];

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <div className="min-h-screen flex" style={{ backgroundColor: COLORS.background }}>
      {/* Sidebar */}
      <div 
        className={`${sidebarOpen ? 'w-64' : 'w-20'} transition-all duration-300 flex flex-col`}
        style={{ backgroundColor: COLORS.secondary }}
      >
        {/* Logo */}
        <div className="p-4 flex items-center gap-3 border-b border-gray-700">
          <div 
            className="flex items-center justify-center flex-shrink-0" 
            style={{ backgroundColor: COLORS.primary, width: 40, height: 40, borderRadius: 8 }}
          >
            <span className="text-white font-bold text-xl">S</span>
          </div>
          {sidebarOpen && (
            <div>
              <div className="text-white font-bold">STREICHER</div>
              <div className="text-gray-400 text-xs">Materials Manager V25</div>
            </div>
          )}
        </div>
        
        {/* Menu */}
        <nav className="flex-1 overflow-y-auto py-4">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => item.id === 'newRequest' ? setNewRequestModal(true) : setCurrentPage(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                currentPage === item.id ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              {sidebarOpen && (
                <>
                  <span className="flex-1">{item.label}</span>
                  {item.count !== undefined && item.count > 0 && (
                    <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                      {item.count}
                    </span>
                  )}
                </>
              )}
            </button>
          ))}
        </nav>
        
        {/* Toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-4 text-gray-400 hover:text-white border-t border-gray-700"
        >
          {sidebarOpen ? '◀' : '▶'}
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          {/* Dashboard */}
          {currentPage === 'dashboard' && (
            <div>
              <h1 className="text-2xl font-bold mb-6" style={{ color: COLORS.secondary }}>Dashboard</h1>
              
              {/* Inventory Summary - 4 BOXES SEPARATI */}
              <div className="grid grid-cols-4 gap-4 mb-8">
                <div className="p-6 rounded-xl text-white" style={{ backgroundColor: COLORS.secondary }}>
                  <div className="text-3xl font-bold">{totalYard}</div>
                  <div className="text-gray-300">YARD</div>
                </div>
                <div className="p-6 rounded-xl text-white" style={{ backgroundColor: COLORS.info }}>
                  <div className="text-3xl font-bold">{totalSite}</div>
                  <div className="text-blue-200">SITE</div>
                </div>
                <div className="p-6 rounded-xl text-white" style={{ backgroundColor: COLORS.warning }}>
                  <div className="text-3xl font-bold">{totalLost}</div>
                  <div className="text-orange-200">LOST</div>
                </div>
                <div className="p-6 rounded-xl text-white" style={{ backgroundColor: COLORS.purple }}>
                  <div className="text-3xl font-bold">{totalBroken}</div>
                  <div className="text-purple-200">BROKEN</div>
                </div>
              </div>

              {/* Status Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-lg shadow">
                  <h3 className="font-semibold mb-2">In Lavorazione</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between"><span>WH Site</span><span className="font-bold">{siteComponents.length}</span></div>
                    <div className="flex justify-between"><span>WH Yard</span><span className="font-bold">{yardComponents.length}</span></div>
                    <div className="flex justify-between"><span>In Transit</span><span className="font-bold">{transComponents.length}</span></div>
                    <div className="flex justify-between"><span>Engineering</span><span className="font-bold">{utComponents.length}</span></div>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                  <h3 className="font-semibold mb-2">In Attesa</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between"><span>Spare Parts</span><span className="font-bold">{spareComponents.length}</span></div>
                    <div className="flex justify-between"><span>Management</span><span className="font-bold">{mngComponents.length}</span></div>
                    <div className="flex justify-between"><span>Da Ordinare</span><span className="font-bold">{orderComponents.length}</span></div>
                    <div className="flex justify-between"><span>Ordinati</span><span className="font-bold">{orderedComponents.length}</span></div>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                  <h3 className="font-semibold mb-2">Completati</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between"><span>Ready OUT</span><span className="font-bold">{readyOut.length}</span></div>
                    <div className="flex justify-between"><span>Delivered</span><span className="font-bold">{delivered.length}</span></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* WH SITE */}
          {currentPage === 'whSite' && (
            <div>
              <h1 className="text-2xl font-bold mb-6" style={{ color: COLORS.secondary }}>WH Site (Magazzino Site)</h1>
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Richiesta</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Richiedente</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Materiale</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Qty</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Inv. Site</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Azioni</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {siteComponents.map(comp => {
                      const request = getRequestInfo(comp);
                      const siteQty = getInventoryQty(comp.material_code, 'SITE');
                      const canConfirm = siteQty >= comp.quantity;
                      
                      return (
                        <tr key={comp.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium">{getRequestDisplay(comp)}</td>
                          <td className="px-4 py-3">{request?.requester}</td>
                          <td className="px-4 py-3">
                            <div>{comp.material_code}</div>
                            <div className="text-xs text-gray-500">{comp.description}</div>
                          </td>
                          <td className="px-4 py-3 font-bold">{comp.quantity}</td>
                          <td className="px-4 py-3">
                            <span className={siteQty >= comp.quantity ? 'text-green-600' : 'text-red-600'}>
                              {siteQty}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1 flex-wrap">
                              <button
                                onClick={() => handleSiteConfirm(comp)}
                                disabled={!canConfirm}
                                className="px-2 py-1 text-white text-sm rounded disabled:opacity-50"
                                style={{ backgroundColor: COLORS.success }}
                                title="Conferma → Ready OUT"
                              >✓</button>
                              <button
                                onClick={() => setSplitModal({ 
                                  open: true, 
                                  component: comp, 
                                  destinations: [
                                    { value: 'Yard', label: 'WH Yard' },
                                    { value: 'UT', label: 'Engineering' },
                                    { value: 'Mng', label: 'Management' },
                                    { value: 'Order', label: 'Orders' }
                                  ]
                                })}
                                className="px-2 py-1 text-white text-sm rounded"
                                style={{ backgroundColor: COLORS.warning }}
                                title="Split Parziale"
                              >PT</button>
                              <button
                                onClick={() => handleSiteToYard(comp)}
                                className="px-2 py-1 text-white text-sm rounded"
                                style={{ backgroundColor: COLORS.yellow }}
                                title="Manda a Yard"
                              >Y</button>
                              <button
                                onClick={() => handleSiteToUT(comp)}
                                className="px-2 py-1 text-white text-sm rounded"
                                style={{ backgroundColor: COLORS.purple }}
                                title="Manda a Engineering"
                              >UT</button>
                              <button
                                onClick={() => setConfirmModal({
                                  open: true,
                                  message: 'Eliminare questo componente?',
                                  onConfirm: () => handleDeleteComponent(comp.id)
                                })}
                                className="px-2 py-1 text-white text-sm rounded"
                                style={{ backgroundColor: COLORS.danger }}
                                title="Elimina"
                              >🗑️</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {siteComponents.length === 0 && (
                      <tr><td colSpan="6" className="px-4 py-8 text-center text-gray-500">Nessun componente in attesa</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* WH YARD */}
          {currentPage === 'whYard' && (
            <div>
              <h1 className="text-2xl font-bold mb-6" style={{ color: COLORS.secondary }}>WH Yard (Magazzino Yard)</h1>
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Richiesta</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Richiedente</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Materiale</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Qty</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Inv. Yard</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Azioni</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {yardComponents.map(comp => {
                      const request = getRequestInfo(comp);
                      const yardQty = getInventoryQty(comp.material_code, 'YARD');
                      const canConfirm = yardQty >= comp.quantity;
                      
                      return (
                        <tr key={comp.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium">{getRequestDisplay(comp)}</td>
                          <td className="px-4 py-3">{request?.requester}</td>
                          <td className="px-4 py-3">
                            <div>{comp.material_code}</div>
                            <div className="text-xs text-gray-500">{comp.description}</div>
                          </td>
                          <td className="px-4 py-3 font-bold">{comp.quantity}</td>
                          <td className="px-4 py-3">
                            <span className={yardQty >= comp.quantity ? 'text-green-600' : 'text-red-600'}>
                              {yardQty}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1 flex-wrap">
                              <button
                                onClick={() => handleYardConfirm(comp)}
                                disabled={!canConfirm}
                                className="px-2 py-1 text-white text-sm rounded disabled:opacity-50"
                                style={{ backgroundColor: COLORS.success }}
                                title="Trovato → Transfer"
                              >✓</button>
                              <button
                                onClick={() => setSplitModal({ 
                                  open: true, 
                                  component: comp, 
                                  destinations: [
                                    { value: 'UT', label: 'Engineering' },
                                    { value: 'Mng', label: 'Management' },
                                    { value: 'Order', label: 'Orders' }
                                  ]
                                })}
                                className="px-2 py-1 text-white text-sm rounded"
                                style={{ backgroundColor: COLORS.warning }}
                                title="Split Parziale"
                              >PT</button>
                              <button
                                onClick={() => handleYardToUT(comp)}
                                className="px-2 py-1 text-white text-sm rounded"
                                style={{ backgroundColor: COLORS.purple }}
                                title="Manda a Engineering"
                              >UT</button>
                              <button
                                onClick={() => handleYardReturn(comp)}
                                className="px-2 py-1 text-white text-sm rounded"
                                style={{ backgroundColor: COLORS.gray }}
                                title="Ritorna a Site"
                              >↩</button>
                              <button
                                onClick={() => setConfirmModal({
                                  open: true,
                                  message: 'Eliminare questo componente?',
                                  onConfirm: () => handleDeleteComponent(comp.id)
                                })}
                                className="px-2 py-1 text-white text-sm rounded"
                                style={{ backgroundColor: COLORS.danger }}
                                title="Elimina"
                              >🗑️</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {yardComponents.length === 0 && (
                      <tr><td colSpan="6" className="px-4 py-8 text-center text-gray-500">Nessun componente in attesa</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SITE IN */}
          {currentPage === 'siteIn' && (
            <div>
              <h1 className="text-2xl font-bold mb-6" style={{ color: COLORS.secondary }}>Site IN (In Arrivo da Yard)</h1>
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Richiesta</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Materiale</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Qty</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Azioni</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {transComponents.map(comp => (
                      <tr key={comp.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{getRequestDisplay(comp)}</td>
                        <td className="px-4 py-3">
                          <div>{comp.material_code}</div>
                          <div className="text-xs text-gray-500">{comp.description}</div>
                        </td>
                        <td className="px-4 py-3 font-bold">{comp.quantity}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleSiteInConfirm(comp)}
                              className="px-2 py-1 text-white text-sm rounded"
                              style={{ backgroundColor: COLORS.success }}
                              title="Conferma Ricezione"
                            >✓</button>
                            <button
                              onClick={() => handleSiteInReject(comp)}
                              className="px-2 py-1 text-white text-sm rounded"
                              style={{ backgroundColor: COLORS.gray }}
                              title="Rifiuta → Ritorna a Yard"
                            >↩</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {transComponents.length === 0 && (
                      <tr><td colSpan="4" className="px-4 py-8 text-center text-gray-500">Nessun materiale in transito</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ENGINEERING */}
          {currentPage === 'engineering' && (
            <div>
              <h1 className="text-2xl font-bold mb-6" style={{ color: COLORS.secondary }}>Engineering (Ufficio Tecnico)</h1>
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Richiesta</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Materiale</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Qty</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Note</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Azioni</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {[...utComponents, ...utCheckComponents].map(comp => (
                      <tr key={comp.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{getRequestDisplay(comp)}</td>
                        <td className="px-4 py-3">
                          <div>{comp.material_code}</div>
                          <div className="text-xs text-gray-500">{comp.description}</div>
                        </td>
                        <td className="px-4 py-3 font-bold">{comp.quantity}</td>
                        <td className="px-4 py-3 text-sm">
                          {comp.ut_note && (
                            <div className="bg-yellow-50 p-2 rounded text-yellow-800">
                              {comp.ut_note}
                              <div className="text-xs text-gray-500">→ {comp.sent_to}</div>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1 flex-wrap">
                            <button
                              onClick={() => handleUTConfirm(comp)}
                              className="px-2 py-1 text-white text-sm rounded"
                              style={{ backgroundColor: COLORS.success }}
                              title="Risolto → Ready OUT"
                            >✓</button>
                            <button
                              onClick={() => setSplitModal({ 
                                open: true, 
                                component: comp, 
                                destinations: [
                                  { value: 'Site', label: 'WH Site' },
                                  { value: 'Yard', label: 'WH Yard' },
                                  { value: 'Spare', label: 'Spare Parts' },
                                  { value: 'Mng', label: 'Management' },
                                  { value: 'Order', label: 'Orders' }
                                ]
                              })}
                              className="px-2 py-1 text-white text-sm rounded"
                              style={{ backgroundColor: COLORS.warning }}
                              title="Split Parziale"
                            >PT</button>
                            <button
                              onClick={() => setNoteModal({ open: true, component: comp })}
                              className="px-2 py-1 text-white text-sm rounded"
                              style={{ backgroundColor: COLORS.purple }}
                              title="Invia Nota a Site/Yard"
                            >🔍</button>
                            <button
                              onClick={() => handleUTToSpare(comp)}
                              className="px-2 py-1 text-white text-sm rounded"
                              style={{ backgroundColor: COLORS.pink }}
                              title="Spare Parts"
                            >Sp</button>
                            <button
                              onClick={() => handleUTToMng(comp)}
                              className="px-2 py-1 text-white text-sm rounded"
                              style={{ backgroundColor: COLORS.cyan }}
                              title="Management"
                            >Mng</button>
                            <button
                              onClick={() => handleUTReturn(comp)}
                              className="px-2 py-1 text-white text-sm rounded"
                              style={{ backgroundColor: COLORS.gray }}
                              title="Ritorna"
                            >↩</button>
                            <button
                              onClick={() => setConfirmModal({
                                open: true,
                                message: 'Eliminare questo componente?',
                                onConfirm: () => handleDeleteComponent(comp.id)
                              })}
                              className="px-2 py-1 text-white text-sm rounded"
                              style={{ backgroundColor: COLORS.danger }}
                              title="Elimina"
                            >🗑️</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {utComponents.length === 0 && utCheckComponents.length === 0 && (
                      <tr><td colSpan="5" className="px-4 py-8 text-center text-gray-500">Nessun componente in Engineering</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SPARE PARTS */}
          {currentPage === 'spareParts' && (
            <div>
              <h1 className="text-2xl font-bold mb-6" style={{ color: COLORS.secondary }}>Spare Parts</h1>
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Richiesta</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Materiale</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Qty</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Azioni</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {spareComponents.map(comp => (
                      <tr key={comp.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{getRequestDisplay(comp)}</td>
                        <td className="px-4 py-3">
                          <div>{comp.material_code}</div>
                          <div className="text-xs text-gray-500">{comp.description}</div>
                        </td>
                        <td className="px-4 py-3 font-bold">{comp.quantity}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleSpareConfirm(comp)}
                              className="px-3 py-1 text-white text-sm rounded"
                              style={{ backgroundColor: COLORS.success }}
                              title="Ha Spare Cliente → Ready OUT"
                            >✓ Ha Spare</button>
                            <button
                              onClick={() => handleSpareToOrder(comp)}
                              className="px-3 py-1 text-white text-sm rounded"
                              style={{ backgroundColor: COLORS.info }}
                              title="Non ha spare → Orders"
                            >Acquisto</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {spareComponents.length === 0 && (
                      <tr><td colSpan="4" className="px-4 py-8 text-center text-gray-500">Nessun componente in Spare Parts</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* MANAGEMENT */}
          {currentPage === 'management' && (
            <div>
              <h1 className="text-2xl font-bold mb-6" style={{ color: COLORS.secondary }}>Management</h1>
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Richiesta</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Materiale</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Qty</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Note</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Azioni</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {mngComponents.map(comp => (
                      <tr key={comp.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{getRequestDisplay(comp)}</td>
                        <td className="px-4 py-3">
                          <div>{comp.material_code}</div>
                          <div className="text-xs text-gray-500">{comp.description}</div>
                        </td>
                        <td className="px-4 py-3 font-bold">{comp.quantity}</td>
                        <td className="px-4 py-3 text-sm">{comp.mng_note}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleMngInternal(comp)}
                              className="px-3 py-1 text-white text-sm rounded"
                              style={{ backgroundColor: COLORS.info }}
                              title="Ordine Interno"
                            >Int</button>
                            <button
                              onClick={() => handleMngClient(comp)}
                              className="px-3 py-1 text-white text-sm rounded"
                              style={{ backgroundColor: COLORS.success }}
                              title="Ordine Cliente"
                            >Cli</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {mngComponents.length === 0 && (
                      <tr><td colSpan="5" className="px-4 py-8 text-center text-gray-500">Nessun componente in Management</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ORDERS - 3 TABS */}
          {currentPage === 'orders' && (
            <div>
              <h1 className="text-2xl font-bold mb-6" style={{ color: COLORS.secondary }}>Orders</h1>
              
              {/* Tabs */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setOrdersTab('toOrder')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    ordersTab === 'toOrder' ? 'text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  style={ordersTab === 'toOrder' ? { backgroundColor: COLORS.info } : {}}
                >
                  Da Ordinare ({orderComponents.length})
                </button>
                <button
                  onClick={() => setOrdersTab('ordered')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    ordersTab === 'ordered' ? 'text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  style={ordersTab === 'ordered' ? { backgroundColor: COLORS.warning } : {}}
                >
                  Ordinati ({orderedComponents.length})
                </button>
                <button
                  onClick={() => setOrdersTab('log')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    ordersTab === 'log' ? 'text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  style={ordersTab === 'log' ? { backgroundColor: COLORS.gray } : {}}
                >
                  Log ({orderLog.length})
                </button>
              </div>

              {/* Tab Content */}
              <div className="bg-white rounded-lg shadow overflow-hidden">
                {ordersTab === 'toOrder' && (
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Richiesta</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Materiale</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Qty</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Tipo</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Azioni</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {orderComponents.map(comp => (
                        <tr key={comp.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium">{getRequestDisplay(comp)}</td>
                          <td className="px-4 py-3">
                            <div>{comp.material_code}</div>
                            <div className="text-xs text-gray-500">{comp.description}</div>
                          </td>
                          <td className="px-4 py-3 font-bold">{comp.quantity}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs ${
                              comp.order_type === 'Client' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {comp.order_type || 'Internal'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => setOrderModal({ open: true, component: comp })}
                              className="px-3 py-1 text-white text-sm rounded"
                              style={{ backgroundColor: COLORS.info }}
                            >🛒 Acquista</button>
                          </td>
                        </tr>
                      ))}
                      {orderComponents.length === 0 && (
                        <tr><td colSpan="5" className="px-4 py-8 text-center text-gray-500">Nessun ordine in attesa</td></tr>
                      )}
                    </tbody>
                  </table>
                )}

                {ordersTab === 'ordered' && (
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Richiesta</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Materiale</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Qty</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Data Ordine</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Previsione</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Azioni</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {orderedComponents.map(comp => (
                        <tr key={comp.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium">{getRequestDisplay(comp)}</td>
                          <td className="px-4 py-3">
                            <div>{comp.material_code}</div>
                            <div className="text-xs text-gray-500">{comp.description}</div>
                          </td>
                          <td className="px-4 py-3 font-bold">{comp.purchase_qty || comp.quantity}</td>
                          <td className="px-4 py-3">{comp.purchase_date}</td>
                          <td className="px-4 py-3">{comp.purchase_forecast}</td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleOrderArrived(comp)}
                              className="px-3 py-1 text-white text-sm rounded"
                              style={{ backgroundColor: COLORS.success }}
                            >✓ Arrivato</button>
                          </td>
                        </tr>
                      ))}
                      {orderedComponents.length === 0 && (
                        <tr><td colSpan="6" className="px-4 py-8 text-center text-gray-500">Nessun ordine in corso</td></tr>
                      )}
                    </tbody>
                  </table>
                )}

                {ordersTab === 'log' && (
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Data</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Materiale</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Qty</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Tipo</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Stato</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {orderLog.map(log => (
                        <tr key={log.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">{log.order_date}</td>
                          <td className="px-4 py-3">{log.material_code}</td>
                          <td className="px-4 py-3 font-bold">{log.quantity_ordered}</td>
                          <td className="px-4 py-3">{log.order_type}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs ${
                              log.status === 'Arrived' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {log.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {orderLog.length === 0 && (
                        <tr><td colSpan="5" className="px-4 py-8 text-center text-gray-500">Nessun log ordini</td></tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* READY OUT */}
          {currentPage === 'readyOut' && (
            <div>
              <h1 className="text-2xl font-bold mb-6" style={{ color: COLORS.secondary }}>Ready OUT (Pronti per Consegna)</h1>
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Richiesta</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Richiedente</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Badge</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Materiale</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Qty</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Azioni</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {readyOut.map(item => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{item.request_number}</td>
                        <td className="px-4 py-3">{item.requester}</td>
                        <td className="px-4 py-3">{item.badge}</td>
                        <td className="px-4 py-3">
                          <div>{item.material_code}</div>
                          <div className="text-xs text-gray-500">{item.description}</div>
                        </td>
                        <td className="px-4 py-3 font-bold">{item.quantity}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleReadyOutDeliver(item)}
                              className="px-3 py-1 text-white text-sm rounded"
                              style={{ backgroundColor: COLORS.success }}
                            >✓ Consegnato</button>
                            <button
                              onClick={() => handleReadyOutCancel(item)}
                              className="px-2 py-1 text-white text-sm rounded"
                              style={{ backgroundColor: COLORS.danger }}
                            >🗑️</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {readyOut.length === 0 && (
                      <tr><td colSpan="6" className="px-4 py-8 text-center text-gray-500">Nessun materiale pronto</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* DELIVERED */}
          {currentPage === 'delivered' && (
            <div>
              <h1 className="text-2xl font-bold mb-6" style={{ color: COLORS.secondary }}>Delivered (Consegnati)</h1>
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Data</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Richiesta</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Richiedente</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Materiale</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {delivered.map(item => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">{item.delivered_date ? new Date(item.delivered_date).toLocaleDateString() : '-'}</td>
                        <td className="px-4 py-3 font-medium">{item.request_number}</td>
                        <td className="px-4 py-3">{item.requester}</td>
                        <td className="px-4 py-3">
                          <div>{item.material_code}</div>
                          <div className="text-xs text-gray-500">{item.description}</div>
                        </td>
                        <td className="px-4 py-3 font-bold">{item.quantity}</td>
                      </tr>
                    ))}
                    {delivered.length === 0 && (
                      <tr><td colSpan="5" className="px-4 py-8 text-center text-gray-500">Nessuna consegna</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* MOVEMENTS */}
          {currentPage === 'movements' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold" style={{ color: COLORS.secondary }}>Movements</h1>
                <button
                  onClick={() => setMovementModal({ open: true })}
                  className="px-4 py-2 text-white rounded-lg flex items-center gap-2"
                  style={{ backgroundColor: COLORS.info }}
                >
                  <span>+</span> Aggiungi Movimento
                </button>
              </div>
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Data</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Tipo</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Location</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Materiale</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Qty</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {movements.slice(0, 100).map(mov => (
                      <tr key={mov.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">{mov.movement_date ? new Date(mov.movement_date).toLocaleString() : '-'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            mov.movement_type === 'IN' ? 'bg-green-100 text-green-800' :
                            mov.movement_type === 'OUT' ? 'bg-red-100 text-red-800' :
                            mov.movement_type === 'TRF' ? 'bg-blue-100 text-blue-800' :
                            mov.movement_type === 'LOST' ? 'bg-orange-100 text-orange-800' :
                            mov.movement_type === 'BROKEN' ? 'bg-purple-100 text-purple-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {mov.movement_type}
                          </span>
                        </td>
                        <td className="px-4 py-3">{mov.location}</td>
                        <td className="px-4 py-3">{mov.material_code}</td>
                        <td className="px-4 py-3 font-bold">{mov.quantity}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{mov.note}</td>
                      </tr>
                    ))}
                    {movements.length === 0 && (
                      <tr><td colSpan="6" className="px-4 py-8 text-center text-gray-500">Nessun movimento</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* INVENTORY */}
          {currentPage === 'inventory' && (
            <div>
              <h1 className="text-2xl font-bold mb-6" style={{ color: COLORS.secondary }}>Inventory</h1>
              <div className="grid grid-cols-3 gap-4">
                {['SITE', 'YARD', 'INTRANSIT'].map(location => (
                  <div key={location} className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="px-4 py-3 font-semibold text-white" style={{ 
                      backgroundColor: location === 'SITE' ? COLORS.info : 
                                      location === 'YARD' ? COLORS.secondary : COLORS.warning
                    }}>
                      {location}
                    </div>
                    <div className="divide-y max-h-96 overflow-y-auto">
                      {inventory.filter(i => i.location === location && i.quantity > 0).map(inv => (
                        <div key={inv.id} className="px-4 py-2 flex justify-between">
                          <span className="text-sm">{inv.material_code}</span>
                          <span className="font-bold">{inv.quantity}</span>
                        </div>
                      ))}
                      {inventory.filter(i => i.location === location && i.quantity > 0).length === 0 && (
                        <div className="px-4 py-4 text-center text-gray-400 text-sm">Vuoto</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STATUS */}
          {currentPage === 'status' && (
            <div>
              <h1 className="text-2xl font-bold mb-6" style={{ color: COLORS.secondary }}>Status Overview</h1>
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Richiesta</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Richiedente</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Materiale</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Qty</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {components.map(comp => {
                      const request = getRequestInfo(comp);
                      return (
                        <tr key={comp.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium">{getRequestDisplay(comp)}</td>
                          <td className="px-4 py-3">{request?.requester}</td>
                          <td className="px-4 py-3">
                            <div>{comp.material_code}</div>
                            <div className="text-xs text-gray-500">{comp.description}</div>
                          </td>
                          <td className="px-4 py-3 font-bold">{comp.quantity}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              comp.status === 'Done' ? 'bg-green-100 text-green-800' :
                              comp.status === 'Out' ? 'bg-blue-100 text-blue-800' :
                              comp.status === 'UT' ? 'bg-purple-100 text-purple-800' :
                              comp.status === 'Ordered' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {comp.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {components.length === 0 && (
                      <tr><td colSpan="5" className="px-4 py-8 text-center text-gray-500">Nessun componente</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ============================================ */}
      {/* MODALS */}
      {/* ============================================ */}
      
      {/* Split Modal */}
      {splitModal.open && splitModal.component && (
        <SplitModal 
          component={splitModal.component}
          destinations={splitModal.destinations}
          onConfirm={handleSplit}
          onClose={() => setSplitModal({ open: false, component: null, destinations: [] })}
        />
      )}

      {/* Order Modal */}
      {orderModal.open && orderModal.component && (
        <OrderModal 
          component={orderModal.component}
          onConfirm={handleOrderPurchase}
          onClose={() => setOrderModal({ open: false, component: null })}
        />
      )}

      {/* Movement Modal */}
      {movementModal.open && (
        <MovementModal 
          onConfirm={handleNewMovement}
          onClose={() => setMovementModal({ open: false })}
        />
      )}

      {/* Note Modal */}
      {noteModal.open && noteModal.component && (
        <NoteModal 
          component={noteModal.component}
          onConfirm={(noteText, destination) => handleUTSendNote(noteModal.component, noteText, destination)}
          onClose={() => setNoteModal({ open: false, component: null })}
        />
      )}

      {/* Confirm Modal */}
      {confirmModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm mx-4">
            <p className="mb-4">{confirmModal.message}</p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmModal({ open: false, message: '', onConfirm: null })}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
              >Annulla</button>
              <button
                onClick={() => confirmModal.onConfirm && confirmModal.onConfirm()}
                className="px-4 py-2 text-white rounded"
                style={{ backgroundColor: COLORS.danger }}
              >Conferma</button>
            </div>
          </div>
        </div>
      )}

      {/* New Request Modal */}
      {newRequestModal && (
        <NewRequestModal 
          onConfirm={handleNewRequest}
          onClose={() => setNewRequestModal(false)}
        />
      )}
    </div>
  );
}

// ============================================
// SPLIT MODAL COMPONENT
// ============================================
function SplitModal({ component, destinations, onConfirm, onClose }) {
  const [foundQty, setFoundQty] = useState('');
  const [destination, setDestination] = useState('');
  const [step, setStep] = useState(1);
  
  const remaining = component.quantity - parseInt(foundQty || 0);
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold mb-4">Split Parziale (PT)</h3>
        
        {step === 1 ? (
          <div>
            <p className="text-gray-600 mb-4">Quantità richiesta: <strong>{component.quantity}</strong></p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantità trovata:</label>
              <input
                type="number"
                min="1"
                max={component.quantity - 1}
                value={foundQty}
                onChange={(e) => setFoundQty(e.target.value)}
                className="w-full border rounded px-3 py-2"
                placeholder="Inserisci quantità..."
              />
            </div>
            {foundQty && remaining > 0 && (
              <p className="text-sm text-gray-500 mb-4">Rimanenti: <strong>{remaining}</strong></p>
            )}
            <div className="flex gap-2 justify-end">
              <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Annulla</button>
              <button
                onClick={() => setStep(2)}
                disabled={!foundQty || parseInt(foundQty) <= 0 || parseInt(foundQty) >= component.quantity}
                className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
              >Avanti</button>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-gray-600 mb-4">Trovati: <strong>{foundQty}</strong> | Rimanenti: <strong>{remaining}</strong></p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Dove mandare i rimanenti?</label>
              <select
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">Seleziona destinazione...</option>
                {destinations.map(d => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setStep(1)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Indietro</button>
              <button
                onClick={() => onConfirm({ componentId: component.id, foundQty: parseInt(foundQty), remaining, destination })}
                disabled={!destination}
                className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
              >Conferma Split</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// ORDER MODAL COMPONENT
// ============================================
function OrderModal({ component, onConfirm, onClose }) {
  const [qty, setQty] = useState(component?.quantity?.toString() || '');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [forecastDate, setForecastDate] = useState('');
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold mb-4">🛒 Acquista</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantità da ordinare:</label>
            <input type="number" value={qty} onChange={(e) => setQty(e.target.value)} className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data Ordine:</label>
            <input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data Prevista Arrivo:</label>
            <input type="date" value={forecastDate} onChange={(e) => setForecastDate(e.target.value)} className="w-full border rounded px-3 py-2" />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Annulla</button>
            <button
              onClick={() => onConfirm({ componentId: component.id, qty: parseInt(qty), orderDate, forecastDate })}
              className="px-4 py-2 bg-blue-600 text-white rounded"
            >Conferma Ordine</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// MOVEMENT MODAL COMPONENT
// ============================================
function MovementModal({ onConfirm, onClose }) {
  const [movementType, setMovementType] = useState('IN');
  const [location, setLocation] = useState('SITE');
  const [materialCode, setMaterialCode] = useState('');
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold mb-4">+ Nuovo Movimento</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo Movimento:</label>
            <select value={movementType} onChange={(e) => setMovementType(e.target.value)} className="w-full border rounded px-3 py-2">
              <option value="IN">IN - Carico</option>
              <option value="OUT">OUT - Scarico</option>
              <option value="TRF">TRF - Trasferimento</option>
              <option value="BAL">BAL - Rettifica</option>
              <option value="LOST">LOST - Perso</option>
              <option value="BROKEN">BROKEN - Rotto</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location:</label>
            <select value={location} onChange={(e) => setLocation(e.target.value)} className="w-full border rounded px-3 py-2">
              <option value="SITE">SITE</option>
              <option value="YARD">YARD</option>
              <option value="INTRANSIT">IN TRANSIT</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Codice Materiale:</label>
            <input type="text" value={materialCode} onChange={(e) => setMaterialCode(e.target.value)} placeholder="Es: MAT-001" className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantità:</label>
            <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note:</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} className="w-full border rounded px-3 py-2" rows={2} />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Annulla</button>
            <button
              onClick={() => onConfirm({ movementType, location, materialCode, quantity: parseInt(quantity), note })}
              disabled={!materialCode || !quantity}
              className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
            >Registra Movimento</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// NOTE MODAL COMPONENT
// ============================================
function NoteModal({ component, onConfirm, onClose }) {
  const [noteText, setNoteText] = useState('');
  const [destination, setDestination] = useState('Site');
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold mb-4">🔍 Invia Nota a Site/Yard</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Destinazione:</label>
            <select value={destination} onChange={(e) => setDestination(e.target.value)} className="w-full border rounded px-3 py-2">
              <option value="Site">WH Site</option>
              <option value="Yard">WH Yard</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nota:</label>
            <textarea 
              value={noteText} 
              onChange={(e) => setNoteText(e.target.value)} 
              className="w-full border rounded px-3 py-2" 
              rows={3}
              placeholder="Scrivi la nota da inviare..."
            />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Annulla</button>
            <button
              onClick={() => onConfirm(noteText, destination)}
              disabled={!noteText.trim()}
              className="px-4 py-2 text-white rounded disabled:opacity-50"
              style={{ backgroundColor: '#7c3aed' }}
            >Invia Nota</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// NEW REQUEST MODAL COMPONENT
// ============================================
function NewRequestModal({ onConfirm, onClose }) {
  const [requester, setRequester] = useState('');
  const [badge, setBadge] = useState('');
  const [iso, setIso] = useState('');
  const [spool, setSpool] = useState('');
  const [hf, setHf] = useState('');
  const [category, setCategory] = useState('');
  const [components, setComponents] = useState([{ material_code: '', quantity: '', description: '' }]);
  
  const addComponent = () => {
    setComponents([...components, { material_code: '', quantity: '', description: '' }]);
  };
  
  const updateComponent = (index, field, value) => {
    const updated = [...components];
    updated[index][field] = value;
    setComponents(updated);
  };
  
  const removeComponent = (index) => {
    if (components.length > 1) {
      setComponents(components.filter((_, i) => i !== index));
    }
  };
  
  const canSubmit = requester && badge && components.some(c => c.material_code && c.quantity);
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">➕ Nuova Richiesta</h3>
        
        <div className="space-y-4">
          {/* Request Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Richiedente *</label>
              <input 
                type="text" 
                value={requester} 
                onChange={(e) => setRequester(e.target.value)} 
                className="w-full border rounded px-3 py-2"
                placeholder="Nome richiedente"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Badge *</label>
              <input 
                type="text" 
                value={badge} 
                onChange={(e) => setBadge(e.target.value)} 
                className="w-full border rounded px-3 py-2"
                placeholder="Numero badge"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ISO</label>
              <input 
                type="text" 
                value={iso} 
                onChange={(e) => setIso(e.target.value)} 
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Spool</label>
              <input 
                type="text" 
                value={spool} 
                onChange={(e) => setSpool(e.target.value)} 
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">HF</label>
              <input 
                type="text" 
                value={hf} 
                onChange={(e) => setHf(e.target.value)} 
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
              <input 
                type="text" 
                value={category} 
                onChange={(e) => setCategory(e.target.value)} 
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>
          
          {/* Components */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">Componenti *</label>
              <button 
                onClick={addComponent} 
                className="text-blue-600 text-sm hover:text-blue-800"
              >+ Aggiungi riga</button>
            </div>
            
            <div className="space-y-2">
              {components.map((comp, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Codice Materiale"
                    value={comp.material_code}
                    onChange={(e) => updateComponent(index, 'material_code', e.target.value)}
                    className="flex-1 border rounded px-2 py-1.5 text-sm"
                  />
                  <input
                    type="number"
                    placeholder="Qty"
                    value={comp.quantity}
                    onChange={(e) => updateComponent(index, 'quantity', e.target.value)}
                    className="w-20 border rounded px-2 py-1.5 text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Descrizione"
                    value={comp.description}
                    onChange={(e) => updateComponent(index, 'description', e.target.value)}
                    className="flex-1 border rounded px-2 py-1.5 text-sm"
                  />
                  {components.length > 1 && (
                    <button 
                      onClick={() => removeComponent(index)} 
                      className="text-red-500 hover:text-red-700 px-2 text-lg"
                    >×</button>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex gap-2 justify-end pt-4 border-t">
            <button 
              onClick={onClose} 
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
            >Annulla</button>
            <button
              onClick={() => onConfirm({ 
                requester, 
                badge, 
                iso, 
                spool, 
                hf, 
                category, 
                components: components.filter(c => c.material_code && c.quantity) 
              })}
              disabled={!canSubmit}
              className="px-4 py-2 text-white rounded disabled:opacity-50"
              style={{ backgroundColor: '#E31E24' }}
            >Crea Richiesta</button>
          </div>
        </div>
      </div>
    </div>
  );
}
