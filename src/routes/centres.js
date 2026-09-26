const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function pagination(req) {
  const page = Math.max(Number.parseInt(req.query.page || '1', 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit || '10', 10) || 10, 1), 100);
  return { page, limit, skip: (page - 1) * limit };
}

router.get('/', async (req, res, next) => {
  try {
    const { page, limit, skip } = pagination(req);
    const [centres, total] = await prisma.$transaction([
      prisma.diagnosticCentre.findMany({
        include: { tests: { include: { test: true } } },
        orderBy: { name: 'asc' },
        skip,
        take: limit
      }),
      prisma.diagnosticCentre.count()
    ]);
    res.json({ data: centres, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const centre = await prisma.diagnosticCentre.findUnique({
      where: { id: req.params.id },
      include: { tests: { include: { test: true } } }
    });
    if (!centre) return res.status(404).json({ error: 'Diagnostic centre not found' });
    res.json(centre);
  } catch (err) { next(err); }
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { name, location } = req.body;
    if (!name || !location) return res.status(400).json({ error: 'name and location are required' });
    const centre = await prisma.diagnosticCentre.create({ data: { name, location } });
    res.status(201).json(centre);
  } catch (err) { next(err); }
});

module.exports = router;
