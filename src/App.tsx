/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import Delivery from './pages/Delivery';
import DeliveryManager from './pages/DeliveryManager';
import CourierView from './pages/CourierView';
import BarTokens from './pages/BarTokens';
import Events from './pages/Events';
import CoverCharge from './pages/CoverCharge';
import UsersPage from './pages/Users';
import TableManager from './pages/TableManager';
import POS from './pages/POS';
import Validation from './pages/Validation';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="delivery" element={<Delivery />} />
          <Route path="delivery/manage" element={<DeliveryManager />} />
          <Route path="delivery/courier" element={<CourierView />} />
          <Route path="tables" element={<TableManager />} />
          <Route path="pos" element={<POS />} />
          <Route path="bar" element={<BarTokens />} />
          <Route path="events" element={<Events />} />
          <Route path="validation" element={<Validation />} />
          <Route path="cover" element={<CoverCharge />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
