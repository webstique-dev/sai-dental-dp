require('dotenv').config();
const mongoose = require('mongoose');
const patientService = require('../services/patient.service');
const appointmentService = require('../services/appointment.service');
const medicineService = require('../services/medicine.service');
const serviceService = require('../services/service.service');
const adminBackupService = require('../services/adminBackup.service');

async function testSoftDelete() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/sai_dental';
  await mongoose.connect(mongoUri);
  console.log('[test-soft-delete] Connected to MongoDB');

  const dummyActor = { _id: new mongoose.Types.ObjectId(), name: 'Test Admin', role: 'admin' };

  // 1. Create patient
  const p = await patientService.createPatient({
    firstName: 'SoftDelete',
    lastName: 'TestUser',
    phone: '9999988888',
    gender: 'male',
  });
  console.log('Created patient:', p.patientId);

  // 2. Soft delete patient
  const delRes = await patientService.deletePatient(p._id, dummyActor);
  console.log('Delete response:', delRes);

  // 3. Verify normal list excludes patient
  const listRes = await patientService.listPatients({ search: 'SoftDelete' });
  const foundInNormalList = (listRes.items || []).some((item) => String(item._id) === String(p._id));
  console.log('Found in normal list after delete?', foundInNormalList);
  if (foundInNormalList) throw new Error('Soft-deleted patient appeared in normal list!');

  // 4. Verify admin deleted records list includes patient
  const deletedRecords = await adminBackupService.listDeletedRecords({ entity: 'patient' });
  const foundInDeletedList = (deletedRecords.patient || []).some((item) => String(item._id) === String(p._id));
  console.log('Found in admin deleted records list?', foundInDeletedList);
  if (!foundInDeletedList) throw new Error('Soft-deleted patient missing from admin deleted list!');

  // 5. Restore patient
  const restored = await patientService.restorePatient(p._id);
  console.log('Restored patient name:', restored.firstName);

  // 6. Verify normal list includes restored patient
  const listResAfter = await patientService.listPatients({ search: 'SoftDelete' });
  const foundAfterRestore = (listResAfter.items || []).some((item) => String(item._id) === String(p._id));
  console.log('Found in normal list after restore?', foundAfterRestore);
  if (!foundAfterRestore) throw new Error('Restored patient did not appear in normal list!');

  // Cleanup: soft delete again
  await patientService.deletePatient(p._id, dummyActor);

  console.log('\n[PASS] Soft Delete verification test passed completely!');
  await mongoose.disconnect();
}

testSoftDelete().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
