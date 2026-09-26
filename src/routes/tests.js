const express = require('express');
const prisma = require('../lib/prisma');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(Number.parseInt(req.query.page || '1', 10) || 1, 1);
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit || '10', 10) || 10, 1), 100);
    const skip = (page - 1) * limit;
    const [tests, total] = await prisma.$transaction([
      prisma.diagnosticTest.findMany({ orderBy: { name: 'asc' }, skip, take: limit }),
      prisma.diagnosticTest.count()
    ]);
    res.json({ data: tests, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
});

module.exports = router;
