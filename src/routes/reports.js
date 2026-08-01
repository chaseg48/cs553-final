import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { db } from '../database.js';
import { authenticateToken } from '../middleware/auth.js';
import { reportQueue } from '../reportQueue.js';

export const reportsRouter = Router();

reportsRouter.post('/', authenticateToken, async (req, res, next) => {
  try {
    const jobId = randomUUID();
    const studentId = req.user.sub;
    const pendingJob = await db.createReportJob({id: jobId, studentId: studentId, status: "pending"});
    reportQueue.send({ jobId, studentId });
    return res.status(202).json({ jobId: jobId, status: "pending", statusUrl: String("/reports/" + jobId) });
  } catch (error) {
    return next(error);
  }
});

reportsRouter.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const job = await db.getReportJob(req.params.id);
    if (!job) return res.status(404).json({ error: 'Not Found' });
    return res.json(job);
  } catch (error) {
    return next(error);
  }
});

void reportQueue;
