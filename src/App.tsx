/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import CustomerView from './components/CustomerView';
import AdminView from './components/AdminView';

export default function App() {
  const [role, setRole] = useState<'customer' | 'admin'>('customer');
  const [isAdmin, setIsAdmin] = useState(false);

  // In a real app, this would be an API call to authenticate the user.
  // For this prototype, we check if the user is our known administrator.
  useEffect(() => {
    // This is a simple, simulated admin check.
    const userEmail = "salomaosamuel900@gmail.com"; 
    if (userEmail === "salomaosamuel900@gmail.com") {
      setIsAdmin(true);
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 transition-colors duration-300">
      {role === 'customer' || !isAdmin ? (
        <CustomerView onSwitchToAdmin={() => isAdmin && setRole('admin')} />
      ) : (
        <AdminView onSwitchToCustomer={() => setRole('customer')} />
      )}
    </div>
  );
}
