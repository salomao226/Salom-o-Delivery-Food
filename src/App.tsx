/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import CustomerView from './components/CustomerView';
import AdminView from './components/AdminView';

export default function App() {
  const [role, setRole] = useState<'customer' | 'admin'>('customer');

  return (
    <div className="min-h-screen bg-slate-50 transition-colors duration-300">
      {role === 'customer' ? (
        <CustomerView onSwitchToAdmin={() => setRole('admin')} />
      ) : (
        <AdminView onSwitchToCustomer={() => setRole('customer')} />
      )}
    </div>
  );
}
