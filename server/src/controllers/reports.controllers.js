const asyncHandler = require('../utils/asyncHandler');
const reportsService = require('../services/reports.service');
const analyticsService = require('../services/analytics.service');

const getReceptionistSummary = asyncHandler(async (req, res) => {
  const { date } = req.query;
  const summary = await reportsService.getReceptionistSummary({ date });
  res.status(200).json({ success: true, summary });
});

const getPharmacySummary = asyncHandler(async (req, res) => {
  const { date } = req.query;
  const summary = await reportsService.getPharmacySummary({ date });
  res.status(200).json({ success: true, summary });
});

const getExecutiveAnalytics = asyncHandler(async (req, res) => {
  const { startDate, endDate, doctorId } = req.query;
  const analytics = await reportsService.getExecutiveAnalytics({ startDate, endDate, doctorId });
  res.status(200).json({ success: true, analytics });
});

const getDashboardAnalytics = asyncHandler(async (req, res) => {
  const { period } = req.query;
  const data = await analyticsService.getDashboardAnalytics({ period });
  res.status(200).json({ success: true, data });
});

const getSalesReport = asyncHandler(async (req, res) => {
  const { startDate, endDate, groupBy } = req.query;
  const data = await analyticsService.getSalesReport({ startDate, endDate, groupBy });
  res.status(200).json({ success: true, data });
});

const getPurchaseReport = asyncHandler(async (req, res) => {
  const { startDate, endDate, groupBy } = req.query;
  const data = await analyticsService.getPurchaseReport({ startDate, endDate, groupBy });
  res.status(200).json({ success: true, data });
});

const getInventoryReport = asyncHandler(async (req, res) => {
  const data = await analyticsService.getInventoryReport();
  res.status(200).json({ success: true, data });
});

const getProfitReport = asyncHandler(async (req, res) => {
  const { startDate, endDate, groupBy } = req.query;
  const data = await analyticsService.getProfitReport({ startDate, endDate, groupBy });
  res.status(200).json({ success: true, data });
});

const getProductReport = asyncHandler(async (req, res) => {
  const { startDate, endDate, groupBy } = req.query;
  const data = await analyticsService.getProductReport({ startDate, endDate, groupBy });
  res.status(200).json({ success: true, data });
});

const getCustomerReport = asyncHandler(async (req, res) => {
  const { startDate, endDate, groupBy } = req.query;
  const data = await analyticsService.getCustomerReport({ startDate, endDate, groupBy });
  res.status(200).json({ success: true, data });
});

const getSupplierReport = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const data = await analyticsService.getSupplierReport({ startDate, endDate });
  res.status(200).json({ success: true, data });
});

const getClinicalReport = asyncHandler(async (req, res) => {
  const { startDate, endDate, groupBy } = req.query;
  const data = await analyticsService.getClinicalReport({ startDate, endDate, groupBy });
  res.status(200).json({ success: true, data });
});

const getAnalyticsSeries = asyncHandler(async (req, res) => {
  const { startDate, endDate, groupBy } = req.query;
  const data = await analyticsService.analyticsSeries({ startDate, endDate, groupBy });
  res.status(200).json({ success: true, data });
});

const getRecentActivity = asyncHandler(async (req, res) => {
  const { limit } = req.query;
  const items = await analyticsService.getRecentActivity({ limit });
  res.status(200).json({ success: true, items });
});

module.exports = {
  getReceptionistSummary,
  getPharmacySummary,
  getExecutiveAnalytics,
  getDashboardAnalytics,
  getSalesReport,
  getPurchaseReport,
  getInventoryReport,
  getProfitReport,
  getProductReport,
  getCustomerReport,
  getSupplierReport,
  getClinicalReport,
  getAnalyticsSeries,
  getRecentActivity,
};
