const { User } = require('../models/User');
const Service = require('../models/Service');
const Medicine = require('../models/Medicine');
const Patient = require('../models/Patient');
const { Appointment } = require('../models/Appointment');
const { Visit } = require('../models/Visit');
const Invoice = require('../models/Invoice');

const DEFAULT_USERS = [
  {
    name: 'Admin User',
    email: 'admin@saidental.local',
    password: 'Admin@123',
    role: 'admin',
    phone: '+91-0000000001',
  },
  {
    name: 'Dr. Meera Nair',
    email: 'doctor@saidental.local',
    password: 'Doctor@123',
    role: 'doctor',
    specialization: 'General Dentistry',
    phone: '+91-0000000002',
  },
  {
    name: 'Rekha Receptionist',
    email: 'reception@saidental.local',
    password: 'Reception@123',
    role: 'receptionist',
    phone: '+91-0000000003',
  },
  {
    name: 'Pharmacy Staff',
    email: 'pharmacy@saidental.local',
    password: 'Pharmacy@123',
    role: 'pharmacy',
    phone: '+91-0000000004',
  },
];

async function createSeedUsers() {
  const created = [];
  for (const data of DEFAULT_USERS) {
    const exists = await User.findOne({ email: data.email.toLowerCase() });
    if (!exists) {
      await User.create(data);
      created.push(data.role);
    }
  }
  return created;
}

const DEFAULT_SERVICES = [
  { name: 'Consultation', code: 'CONSULT', category: 'consultation', unitPrice: 500 },
  { name: 'Dental Cleaning', code: 'CLEAN', category: 'procedure', unitPrice: 1500 },
  { name: 'Root Canal Treatment', code: 'RCT', category: 'procedure', unitPrice: 8000 },
  { name: 'Dental Crown', code: 'CROWN', category: 'procedure', unitPrice: 6000 },
  { name: 'Dental Filling', code: 'FILLING', category: 'procedure', unitPrice: 2000 },
  { name: 'Extraction', code: 'EXTRACT', category: 'procedure', unitPrice: 1500 },
];

async function createSeedServices() {
  const created = [];
  for (const data of DEFAULT_SERVICES) {
    const exists = await Service.findOne({ code: data.code });
    if (!exists) {
      await Service.create({ ...data });
      created.push(data.code);
    }
  }
  return created;
}

const DEFAULT_MEDICINES = [
  { name: 'Amoxicillin 500mg', genericName: 'Amoxicillin', category: 'antibiotic', quantity: 200, reorderLevel: 20, costPrice: 22, sellPrice: 30, supplier: 'MediPlus Distributors', expiryDays: 360 },
  { name: 'Amoxicillin + Clavulanic Acid', genericName: 'Amoxicillin + Clavulanate', category: 'antibiotic', quantity: 150, reorderLevel: 15, costPrice: 68, sellPrice: 78, supplier: 'NovaChem', expiry: 360 },
  { name: 'Metronidazole 400mg', genericName: 'Metronidazole', category: 'antibiotic', quantity: 400, reorderLevel: 20, costPrice: 12, sellPrice: 15, supplier: 'MediPlus', expiry: 360 },
  { name: 'Azithromycin 500mg', genericName: 'Azithromycin', category: 'antibiotic', quantity: 120, reorderLevel: 15, costPrice: 45, sellPrice: 55, supplier: 'NovaChemicals', expiry: 360 },
  { name: 'Ibuprofen 400mg', genericName: 'Ibuprofen', category: 'analgesic', quantity: 300, reorderLevel: 25, costPrice: 8, sellPrice: 10, supplier: 'Delta Supplies', expiry: 360 },
  { name: 'Paracetamol 650mg', genericName: 'Paracetamol', category: 'analgesic', quantity: 600, reorderLevel: 30, costPrice: 6, sellPrice: 8, supplier: 'Delta Supplies', expiry: 360 },
  { name: 'Diclofenac Gel', genericName: 'Diclofenac Diethylamine', category: 'analgesic', quantity: 80, reorderLevel: 10, costPrice: 30, sellPrice: 36, supplier: 'NovaChemicals', expiry: 240 },
  { name: 'Chlorhexidine Mouthwash', genericName: 'Chlorhexidine Gluconate', category: 'mouthwash', quantity: 100, reorderLevel: 12, costPrice: 55, sellPrice: 65, supplier: 'Delta Supplies', expiry: 180 },
  { name: 'Metrogel (Ointment)', genericName: 'Metronidazole', category: 'anti-inflammatory', quantity: 60, reorderLevel: 8, costPrice: 40, sellPrice: 48, supplier: 'NovaChemicals', expiry: 180 },
  { name: 'Lignocaine Gel', genericName: 'Lignocaine', category: 'anesthetic', quantity: 40, reorderLevel: 6, costPrice: 55, sellPrice: 65, supplier: 'Delta Supplies', expiry: 180 },
];

async function createSeedMedicines() {
  const created = [];
  for (const data of DEFAULT_MEDICINES) {
    const exists = await Medicine.findOne({ name: data.name });
    if (!exists) {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + (data.expiryDays || data.expiry || 180));
      await Medicine.create({
        name: data.name,
        genericName: data.genericName,
        category: data.category,
        quantity: data.quantity,
        reorderLevel: data.reorderLevel,
        costPrice: data.costPrice,
        sellPrice: data.sellPrice,
        supplier: data.supplier,
        expiryDate,
      });
      created.push(data.name);
    }
  }
  return created;
}

const DEFAULT_PATIENTS = [
  { patientId: 'PAT-1001', title: 'Mr', firstName: 'Rajesh', lastName: 'Sharma', gender: 'male', phone: '9876543210', email: 'rajesh.sharma@example.com', city: 'Mumbai', bloodGroup: 'O+' },
  { patientId: 'PAT-1002', title: 'Mrs', firstName: 'Anita', lastName: 'Verma', gender: 'female', phone: '9876543211', email: 'anita.verma@example.com', city: 'Pune', bloodGroup: 'B+' },
  { patientId: 'PAT-1003', title: 'Mr', firstName: 'Vikram', lastName: 'Patel', gender: 'male', phone: '9876543212', email: 'vikram.patel@example.com', city: 'Ahmedabad', bloodGroup: 'A+' },
  { patientId: 'PAT-1004', title: 'Mrs', firstName: 'Sunita', lastName: 'Rao', gender: 'female', phone: '9876543213', email: 'sunita.rao@example.com', city: 'Bengaluru', bloodGroup: 'AB+' },
];

async function createSeedPatients() {
  const created = [];
  for (const data of DEFAULT_PATIENTS) {
    const exists = await Patient.findOne({ patientId: data.patientId });
    if (!exists) {
      const p = await Patient.create(data);
      created.push(p);
    } else {
      created.push(exists);
    }
  }
  return created;
}

async function createSeedDummyRecords() {
  const patients = await createSeedPatients();
  const doctor = await User.findOne({ role: 'doctor' });

  if (!doctor || patients.length === 0) return;

  // Appointments
  const apptList = [
    { appointmentNumber: 'APT-1001', patient: patients[0]._id, doctor: doctor._id, date: new Date(), time: '10:00 AM', type: 'New Consultation', source: 'phone', status: 'scheduled' },
    { appointmentNumber: 'APT-1002', patient: patients[1]._id, doctor: doctor._id, date: new Date(), time: '11:30 AM', type: 'Dental Cleaning', source: 'walk-in', status: 'checked-in' },
    { appointmentNumber: 'APT-1003', patient: patients[2]._id, doctor: doctor._id, date: new Date(), time: '02:00 PM', type: 'Root Canal Treatment', source: 'website', status: 'completed' },
    { appointmentNumber: 'APT-1004', patient: patients[3]._id, doctor: doctor._id, date: new Date(), time: '04:15 PM', type: 'Follow-up', source: 'existing', status: 'confirmed' },
  ];

  for (const apt of apptList) {
    const exists = await Appointment.findOne({ appointmentNumber: apt.appointmentNumber });
    if (!exists) await Appointment.create(apt);
  }

  // Queue Visits
  const visitList = [
    { visitId: 'VST-1001', patient: patients[0]._id, doctor: doctor._id, opNumber: 'OP-101', token: 'T-01', status: 'registered', queueNumber: 1, date: new Date() },
    { visitId: 'VST-1002', patient: patients[1]._id, doctor: doctor._id, opNumber: 'OP-102', token: 'T-02', status: 'in-progress', queueNumber: 2, date: new Date() },
    { visitId: 'VST-1003', patient: patients[2]._id, doctor: doctor._id, opNumber: 'OP-103', token: 'T-03', status: 'completed', queueNumber: 3, date: new Date() },
    { visitId: 'VST-1004', patient: patients[3]._id, doctor: doctor._id, opNumber: 'OP-104', token: 'T-04', status: 'registered', queueNumber: 4, date: new Date() },
  ];

  for (const vst of visitList) {
    const exists = await Visit.findOne({ visitId: vst.visitId });
    if (!exists) await Visit.create(vst);
  }

  // Invoices
  const invList = [
    { invoiceNumber: 'INV-1001', patient: patients[0]._id, doctor: doctor._id, status: 'finalized', paymentStatus: 'paid', items: [{ name: 'Consultation', qty: 1, unitPricePaise: 50000 }], subtotalPaise: 50000, totalPaise: 50000, amountPaidPaise: 50000, balancePaise: 0 },
    { invoiceNumber: 'INV-1002', patient: patients[1]._id, doctor: doctor._id, status: 'finalized', paymentStatus: 'paid', items: [{ name: 'Dental Cleaning', qty: 1, unitPricePaise: 150000 }], subtotalPaise: 150000, totalPaise: 150000, amountPaidPaise: 150000, balancePaise: 0 },
    { invoiceNumber: 'INV-1003', patient: patients[2]._id, doctor: doctor._id, status: 'finalized', paymentStatus: 'partially-paid', items: [{ name: 'Root Canal Treatment', qty: 1, unitPricePaise: 800000 }], subtotalPaise: 800000, totalPaise: 800000, amountPaidPaise: 400000, balancePaise: 400000 },
    { invoiceNumber: 'INV-1004', patient: patients[3]._id, doctor: doctor._id, status: 'draft', paymentStatus: 'unpaid', items: [{ name: 'Dental Filling', qty: 1, unitPricePaise: 200000 }], subtotalPaise: 200000, totalPaise: 200000, amountPaidPaise: 0, balancePaise: 200000 },
  ];

  for (const inv of invList) {
    const exists = await Invoice.findOne({ invoiceNumber: inv.invoiceNumber });
    if (!exists) await Invoice.create(inv);
  }
}

module.exports = {
  createSeedUsers,
  createSeedServices,
  createSeedMedicines,
  createSeedPatients,
  createSeedDummyRecords,
  DEFAULT_USERS,
  DEFAULT_SERVICES,
  DEFAULT_MEDICINES,
  DEFAULT_PATIENTS,
};