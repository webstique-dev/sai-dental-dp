/* Integration test: Billing & Payments module.
   Run with: npm run test:billing */
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.NODE_ENV = 'test';

async function main() {
  const mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongod.getUri('billing_test');

  const { connectDB } = require('../config/db');
  await connectDB();
  const { createSeedUsers, createSeedServices } = require('../utils/seed');
  await createSeedUsers();
  await createSeedServices();

  const app = require('../app');
  const server = await new Promise((resolve) => {
    const srv = app.listen(0, () => resolve(srv));
  });
  const base = `http://127.0.0.1:${server.address().port}`;

  let failures = 0;
  const pass = (m) => console.log('  [PASS]', m);
  const fail = (m) => {
    failures += 1;
    console.error('  [FAIL]', m);
  };
  const check = (cond, msg) => (cond ? pass(msg) : fail(msg));
  const section = (t) => console.log(`\n--- ${t} ---`);

  async function call(method, path, { body, token } = {}) {
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const res = await fetch(base + path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    let json = null;
    try {
      json = await res.json();
    } catch {}
    return { status: res.status, json };
  }

  const login = async (email, password) => {
    const r = await call('POST', '/api/auth/login', { body: { email, password } });
    return r.json;
  };

  const doctor = await login('doctor@saidental.local', 'Doctor@123');
  const admin = await login('admin@saidental.local', 'Admin@123');
  const reception = await login('reception@saidental.local', 'Reception@123');
  const pharmacy = await login('pharmacy@saidental.local', 'Pharmacy@123');
  const d = doctor.accessToken;
  const a = admin.accessToken;
  const r = reception.accessToken;
  const p = pharmacy.accessToken;

  section('SETUP: PATIENT + OP VISIT');
  const patientRes = await call('POST', '/api/patients', {
    token: d,
    body: { firstName: 'Ramesh', lastName: 'Iyer', gender: 'male', phone: '+91-9998887776', dob: '1975-08-15' },
  });
  check(patientRes.status === 201, `patient registered (got ${patientRes.status})`);
  const patientId = patientRes.json.patient._id;

  const consult = await call('POST', '/api/consultations', { token: d, body: { patientId, visitDate: '2026-08-07' } });
  check(consult.status === 201, 'consultation/OP visit created');
  const consultationId = consult.json.consultation.id;
  const visitId = consult.json.consultation.visit._id || consult.json.consultation.visit.id;

  section('SERVICE CATALOG');
  const svcList = await call('GET', '/api/services', { token: r });
  check(svcList.status === 200, 'service catalog listable by receptionist');
  const rctSeed = svcList.json.services.find((s) => s.code === 'RCT');
  const crownSeed = svcList.json.services.find((s) => s.code === 'CROWN');
  check(!!rctSeed && rctSeed.unitPrice === 8000, `seed RCT at ₹8,000 (got ₹${rctSeed && rctSeed.unitPrice})`);
  check(!!crownSeed && crownSeed.unitPrice === 6000, `seed Crown at ₹6,000 (got ₹${crownSeed && crownSeed.unitPrice})`);

  const svcCreate = await call('POST', '/api/services', {
    token: a,
    body: { name: 'Tooth Whitening', code: 'WHITE', category: 'procedure', unitPrice: 3500 },
  });
  check(svcCreate.status === 201, 'admin can create a service');
  const whiteningId = svcCreate.json.service.id;

  const phCreateSvc = await call('POST', '/api/services', { token: p, body: { name: 'X', unitPrice: 1 } });
  check(phCreateSvc.status === 403, 'pharmacy cannot create services (403)');
  const rCreateSvc = await call('POST', '/api/services', { token: r, body: { name: 'X', unitPrice: 1 } });
  check(rCreateSvc.status === 403, 'receptionist cannot create services (403)');

  section('INVOICE — CREATE + TOTALS');
  const inv1 = await call('POST', '/api/invoices', {
    token: r,
    body: {
      patientId,
      consultationId,
      visitId,
      doctorId: doctor.user ? doctor.user._id : undefined,
      items: [{ serviceId: rctSeed.id, qty: 1 }],
      discountType: 'none',
      taxPercent: 0,
    },
  });
  check(inv1.status === 201, `invoice created (got ${inv1.status})`);
  const inv1Data = inv1.json.invoice;
  check(inv1Data.invoiceNumber.startsWith('INV-'), `invoice number assigned (${inv1Data.invoiceNumber})`);
  check(inv1Data.status === 'draft', 'invoice starts as draft');
  check(inv1Data.total === 8000, `total = ₹8,000 (got ₹${inv1Data.total})`);
  check(inv1Data.subtotal === 8000 && inv1Data.discount === 0 && inv1Data.tax === 0, 'subtotal 8000, discount 0, tax 0');
  check(inv1Data.amountPaid === 0 && inv1Data.balance === 8000, 'unpaid: paid 0, balance 8000');
  check(inv1Data.paymentStatus === 'unpaid', 'payment status = unpaid');
  check(inv1Data.items.length === 1 && inv1Data.items[0].name === 'Root Canal Treatment', 'line item snapshots service name');
  check(inv1Data.items[0].unitPrice === 8000, 'line item snapshots unit price');

  section('INVOICE — NO CATALOG PRICE TRUST');
  const noPrice = await call('POST', '/api/invoices', {
    token: r,
    body: { patientId, items: [{ name: 'Mystery Charge', unitPrice: 'not-a-number' }] },
  });
  check(noPrice.status === 400, 'custom line rejects invalid unit price (400)');
  const negLine = await call('POST', '/api/invoices', { token: r, body: { patientId, items: [{ name: 'Bad', unitPrice: -5 }] } });
  check(negLine.status === 400, 'negative unit price rejected (400)');
  const noItems = await call('POST', '/api/invoices', { token: r, body: { patientId, items: [] } });
  check(noItems.status === 400, 'invoice with no items rejected (400)');
  const phCreateInv = await call('POST', '/api/invoices', { token: p, body: { patientId, items: [{ name: 'X', unitPrice: 1 }] } });
  check(phCreateInv.status === 403, 'pharmacy cannot create invoices (403)');

  section('PRICE SNAPSHOT — DATA INTEGRITY');
  // Complete a RCT treatment so the treatment-billing flow can also be exercised.
  const tr = await call('POST', '/api/treatment-records', {
    token: d,
    body: { patientId, consultationId, toothNumber: 26, procedure: 'Root Canal Treatment', status: 'completed' },
  });
  check(tr.status === 201 && tr.json.record.status === 'completed', 'completed RCT treatment record created');
  const trId = tr.json.record.id;

  // Now change the catalog price to ₹9,000.
  const updateSvc = await call('PATCH', `/api/services/${rctSeed.id}`, { token: a, body: { unitPrice: 9000 } });
  check(updateSvc.status === 200 && updateSvc.json.service.unitPrice === 9000, 'catalog RCT price changed to ₹9,000');

  // The FIRST invoice must still be ₹8,000 (immutable snapshot).
  const inv1Reload = await call('GET', `/api/invoices/${inv1Data.id}`, { token: r });
  check(inv1Reload.status === 200 && inv1Reload.json.invoice.total === 8000, 'existing invoice KEEPS ₹8,000 after catalog change');
  check(inv1Reload.json.invoice.items[0].unitPrice === 8000, 'existing line snapshot remains ₹8,000');

  // A NEW invoice must see the new ₹9,000 catalog price.
  const inv2 = await call('POST', '/api/invoices', {
    token: r,
    body: { patientId, items: [{ serviceId: rctSeed.id }] },
  });
  check(inv2.status === 201 && inv2.json.invoice.total === 9000, `new invoice sees ₹9,000 (got ₹${inv2.json.invoice && inv2.json.invoice.total})`);

  section('TREATMENT BILLING — ONLY COMPLETED TREATMENTS');
  // Plan with RCT ₹8,000 + Crown ₹6,000. Complete only RCT → invoice contains only RCT.
  const plan = await call('POST', '/api/treatment-plans', {
    token: d,
    body: { patientId, name: 'Full mouth RCT', items: [{ procedure: 'Root Canal Treatment', estimatedCost: 8000, status: 'completed' }, { procedure: 'Dental Crown', estimatedCost: 6000, status: 'planned' }] },
  });
  check(plan.status === 201, 'treatment plan created');
  const planId = plan.json.plan.id;

  const tr2 = await call('POST', '/api/treatment-records', {
    token: d,
    body: { patientId, treatmentPlanId: planId, toothNumber: 26, procedure: 'Root Canal Treatment', status: 'completed' },
  });
  check(tr2.status === 201 && tr2.json.record.status === 'completed', 'second completed RCT record');

  // Bill from a completed treatment record → resolves catalog price.
  const invFromTr = await call('POST', '/api/invoices', {
    token: r,
    body: { patientId, items: [{ treatmentRecordId: tr2.json.record.id }] },
  });
  check(invFromTr.status === 201, 'invoice created from completed treatment');
  const invFromTrData = invFromTr.json.invoice;
  check(invFromTrData.items.length === 1, 'invoice contains ONLY the completed treatment');
  check(invFromTrData.items[0].name === 'Root Canal Treatment', 'line = completed RCT');
  check(invFromTrData.total === 9000, `RCT billed at current catalog ₹9,000 (got ₹${invFromTrData.total})`);
  check(invFromTrData.items[0].treatmentRecordId === tr2.json.record.id, 'line linked to treatment record');

  // Duplicate billing guard: same treatment record cannot be billed twice.
  const dup = await call('POST', `/api/invoices/${invFromTrData.id}/items`, { token: r, body: { treatmentRecordId: tr2.json.record.id } });
  check(dup.status === 409, 'already-billed treatment rejected on the same invoice (409)');

  // A non-completed treatment cannot be billed.
  const trPending = await call('POST', '/api/treatment-records', {
    token: d,
    body: { patientId, toothNumber: 24, procedure: 'Dental Crown', status: 'in-progress' },
  });
  const invPending = await call('POST', '/api/invoices', {
    token: r,
    body: { patientId, items: [{ treatmentRecordId: trPending.json.record.id }] },
  });
  check(invPending.status === 400, 'in-progress treatment cannot be billed (400)');

  // Billing a foreign patient's treatment is rejected.
  const patient2 = await call('POST', '/api/patients', {
    token: d,
    body: { firstName: 'Suresh', lastName: 'Pillai', gender: 'male', phone: '+91-9777666555', dob: '1990-01-01' },
  });
  const foreignTr = await call('POST', '/api/treatment-records', {
    token: d,
    body: { patientId: patient2.json.patient._id, toothNumber: 24, procedure: 'Extraction', status: 'completed' },
  });
  const invForeign = await call('POST', '/api/invoices', {
    token: r,
    body: { patientId, items: [{ treatmentRecordId: foreignTr.json.record.id }] },
  });
  check(invForeign.status === 400, 'foreign treatment record cannot be billed (400)');

  section('PAYMENTS — SERVER-SIDE BALANCE SAFETY');
  // Finalize the ₹9,000 invoice first (payments require a finalized invoice).
  const finInvFromTr = await call('POST', `/api/invoices/${invFromTrData.id}/finalize`, { token: r });
  check(finInvFromTr.status === 200 && finInvFromTr.json.invoice.status === 'finalized', 'invoice from treatment finalized');

  // Take the ₹9,000 invoice. Pay ₹3,000 → balance ₹6,000, partially-paid.
  const pay1 = await call('POST', `/api/invoices/${invFromTrData.id}/payments`, {
    token: r,
    body: { amount: 3000, method: 'cash' },
  });
  check(pay1.status === 201, 'payment recorded (₹3,000)');
  const pay1Data = pay1.json.payment;
  check(pay1Data.paymentNumber.startsWith('RCT-'), `receipt number assigned (${pay1Data.paymentNumber})`);
  const invAfterPay1 = await call('GET', `/api/invoices/${invFromTrData.id}`, { token: r });
  const i1 = invAfterPay1.json.invoice;
  check(i1.amountPaid === 3000 && i1.balance === 6000, `paid 3000 / balance 6000 (got ${i1.amountPaid}/${i1.balance})`);
  check(i1.paymentStatus === 'partially-paid', 'payment status = partially-paid');

  // Overpayment rejected: paying the remaining ₹6,000 is fine, ₹6,001 is not.
  const overpay = await call('POST', `/api/invoices/${invFromTrData.id}/payments`, { token: r, body: { amount: 6001, method: 'upi' } });
  check(overpay.status === 400, 'overpayment rejected (400)');
  const pay2 = await call('POST', `/api/invoices/${invFromTrData.id}/payments`, { token: r, body: { amount: 6000, method: 'upi', reference: 'UPI-9001' } });
  check(pay2.status === 201, 'settling ₹6,000 accepted');
  const invAfterPay2 = await call('GET', `/api/invoices/${invFromTrData.id}`, { token: r });
  const i2 = invAfterPay2.json.invoice;
  check(i2.amountPaid === 9000 && i2.balance === 0, `paid 9000 / balance 0 (got ${i2.amountPaid}/${i2.balance})`);
  check(i2.paymentStatus === 'paid', 'payment status = paid');

  const paymentsList = await call('GET', `/api/invoices/${invFromTrData.id}/payments`, { token: r });
  check(paymentsList.status === 200 && paymentsList.json.payments.length === 2, 'TWO payment records kept (append-only)');

  // A payment on a draft invoice is rejected (must be finalized first).
  const payOnDraft = await call('POST', `/api/invoices/${inv1Data.id}/payments`, { token: r, body: { amount: 100 } });
  check(payOnDraft.status === 409, 'payment on a draft invoice rejected (409)');

  section('FINALIZE — IMMUTABLE INVOICE');
  const fin = await call('POST', `/api/invoices/${inv1Data.id}/finalize`, { token: r });
  check(fin.status === 200 && fin.json.invoice.status === 'finalized', 'invoice finalized');
  check(!!fin.json.invoice.finalizedAt, 'finalizedAt recorded');

  const addAfterFinalize = await call('POST', `/api/invoices/${inv1Data.id}/items`, { token: r, body: { serviceId: crownSeed.id } });
  check(addAfterFinalize.status === 409, 'finalized invoice cannot add items (409)');
  const editAfterFinalize = await call('PATCH', `/api/invoices/${inv1Data.id}`, { token: r, body: { discountType: 'fixed', discountValue: 100 } });
  check(editAfterFinalize.status === 409, 'finalized invoice cannot be edited (409)');

  section('REFUND FLOW');
  // Refund ₹4,000 of the paid ₹9,000 → paid net ₹5,000, partially-paid.
  const ref = await call('POST', `/api/invoices/${invFromTrData.id}/refund`, { token: r, body: { amount: 4000, method: 'cash', reference: 'REF-1' } });
  check(ref.status === 201, 'refund recorded');
  const invAfterRef = await call('GET', `/api/invoices/${invFromTrData.id}`, { token: r });
  const iRef = invAfterRef.json.invoice;
  check(iRef.amountPaid === 5000 && iRef.balance === 4000, `after refund: paid 5000 / balance 4000 (got ${iRef.amountPaid}/${iRef.balance})`);
  check(iRef.paymentStatus === 'partially-paid', 'refund reduces payment status to partially-paid');

  // Refund more than received → rejected.
  const overRefund = await call('POST', `/api/invoices/${invFromTrData.id}/refund`, { token: r, body: { amount: 9000 } });
  check(overRefund.status === 400, 'refund exceeding received amount rejected (400)');

  // Cancel still blocked while a payment exists.
  const cancWithPay = await call('POST', `/api/invoices/${invFromTrData.id}/cancel`, { token: r, body: { reason: 'test' } });
  check(cancWithPay.status === 409, 'invoice with payments cannot be cancelled (409)');

  section('CANCEL FLOW — UNPAID INVOICE');
  const invNoPay = await call('POST', '/api/invoices', { token: r, body: { patientId, items: [{ name: 'Consultation', unitPrice: 500 }] } });
  const canc = await call('POST', `/api/invoices/${invNoPay.json.invoice.id}/cancel`, { token: r, body: { reason: 'cancelled by patient' } });
  check(canc.status === 200 && canc.json.invoice.status === 'cancelled', 'unpaid invoice cancelled');
  const payCancelled = await call('POST', `/api/invoices/${invNoPay.json.invoice.id}/payments`, { token: r, body: { amount: 100 } });
  check(payCancelled.status === 409, 'cancelled invoice cannot accept payments (409)');

  section('SCOPED LISTINGS + PRINT');
  const patientInvoices = await call('GET', `/api/patients/${patientId}/invoices`, { token: r });
  check(patientInvoices.status === 200 && patientInvoices.json.invoices.length >= 3, 'patient invoices listed');
  const visitInvoices = await call('GET', `/api/op-visits/${visitId}/invoices`, { token: r });
  check(visitInvoices.status === 200 && visitInvoices.json.invoices.length >= 1, 'op-visit invoices listed');
  const printInv = await call('GET', `/api/invoices/${invFromTrData.id}/print`, { token: r });
  check(printInv.status === 200 && printInv.json.invoice.invoiceNumber, 'invoice print view available');
  const receiptView = await call('GET', `/api/payments/${pay1Data.id}/receipt`, { token: r });
  check(receiptView.status === 200 && receiptView.json.receipt.paymentNumber, 'payment receipt view available');

  section('RBAC + AUTH');
  const noToken = await call('GET', '/api/invoices');
  check(noToken.status === 401, 'unauthenticated rejected (401)');
  const docCreateInv = await call('POST', '/api/invoices', { token: d, body: { patientId, items: [{ name: 'X', unitPrice: 1 }] } });
  check(docCreateInv.status === 403, 'doctor cannot create invoices (403)');
  const draftForDoctor = await call('POST', '/api/invoices', { token: r, body: { patientId, items: [{ serviceId: crownSeed.id }] } });
  const docAddLine = await call('POST', `/api/invoices/${draftForDoctor.json.invoice.id}/items`, { token: d, body: { serviceId: crownSeed.id } });
  check(docAddLine.status === 201, 'doctor can add a bill line from a service');
  const docFinalize = await call('POST', `/api/invoices/${inv1Data.id}/finalize`, { token: d });
  check(docFinalize.status === 403, 'doctor cannot finalize invoices (403)');
  const phRead = await call('GET', `/api/patients/${patientId}/invoices`, { token: p });
  check(phRead.status === 403, 'pharmacy denied billing access (403)');
  const phPay = await call('POST', `/api/invoices/${invFromTrData.id}/payments`, { token: p, body: { amount: 100 } });
  check(phPay.status === 403, 'pharmacy cannot record payments (403)');

  section('AUDIT TRAIL');
  const { AuditLog } = require('../models/AuditLog');
  const invLogs = await AuditLog.find({ entity: 'invoice' });
  const payLogs = await AuditLog.find({ entity: 'payment' });
  const svcLogs = await AuditLog.find({ entity: 'service' });
  check(invLogs.some((l) => l.action === 'create'), 'audit: invoice created');
  check(payLogs.some((l) => l.action === 'pay'), 'audit: payment recorded');
  check(payLogs.some((l) => l.action === 'refund'), 'audit: refund recorded');
  check(invLogs.some((l) => l.action === 'finalize'), 'audit: invoice finalized');
  check(svcLogs.some((l) => l.action === 'create'), 'audit: service created');

  await server.close();
  await mongooseDisconnect();
  await mongod.stop();

  console.log(`\n${failures === 0 ? '✓ ALL BILLING CHECKS PASSED' : `✗ ${failures} BILLING CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

async function mongooseDisconnect() {
  const mongoose = require('mongoose');
  if (mongoose.connection.readyState === 1) await mongoose.connection.close();
}

main().catch((err) => {
  console.error('FATAL', err);
  process.exit(1);
});