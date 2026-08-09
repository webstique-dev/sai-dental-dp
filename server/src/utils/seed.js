const { User } = require('../models/User');
const Service = require('../models/Service');
const Medicine = require('../models/Medicine');

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
      expiryDate.setDate(expiryDate.getDate() + (data.expiry || 180));
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

module.exports = {
  createSeedUsers,
  createSeedServices,
  createSeedMedicines,
  DEFAULT_USERS,
  DEFAULT_SERVICES,
  DEFAULT_MEDICINES,
};