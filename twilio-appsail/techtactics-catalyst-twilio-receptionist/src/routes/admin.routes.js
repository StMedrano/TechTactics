const express = require('express');
const { listReceptionistLeads } = require('../services/catalyst.service');

const router = express.Router();

router.get('/leads', async (req, res, next) => {
  try {
    const leads = await listReceptionistLeads(req);
    res.json({ leads });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
