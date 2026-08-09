const asyncHandler = require('../utils/asyncHandler');
const toothChartService = require('../services/toothChart.service');

const list = asyncHandler(async (req, res) => {
  const result = await toothChartService.listToothChart(req.params.patientId, req.user);
  res.status(200).json({ success: true, ...result });
});

const getTooth = asyncHandler(async (req, res) => {
  const tooth = await toothChartService.getTooth(req.params.patientId, req.params.toothNumber, req.user);
  res.status(200).json({ success: true, tooth });
});

const history = asyncHandler(async (req, res) => {
  const tooth = await toothChartService.getToothHistory(req.params.patientId, req.params.toothNumber, req.user);
  res.status(200).json({ success: true, tooth });
});

const addFinding = asyncHandler(async (req, res) => {
  const tooth = await toothChartService.addFinding(
    req.params.patientId,
    req.params.toothNumber,
    req.body,
    req.user,
  );
  res.status(201).json({ success: true, message: 'Tooth finding recorded', tooth });
});

const addTreatment = asyncHandler(async (req, res) => {
  const tooth = await toothChartService.addTreatment(
    req.params.patientId,
    req.params.toothNumber,
    req.body,
    req.user,
  );
  res.status(201).json({ success: true, message: 'Tooth treatment recorded', tooth });
});

const updateTooth = asyncHandler(async (req, res) => {
  const tooth = await toothChartService.updateTooth(
    req.params.patientId,
    req.params.toothNumber,
    req.body,
    req.user,
  );
  res.status(200).json({ success: true, message: 'Tooth updated', tooth });
});

module.exports = { list, getTooth, history, addFinding, addTreatment, updateTooth };