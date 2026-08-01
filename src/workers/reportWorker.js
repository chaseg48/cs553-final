import { nextTick } from 'node:process';
import { db } from '../database.js';
import { generateReport } from '../reportGenerator.js';
import { reportQueue } from '../reportQueue.js';

reportQueue.process(async (message) => {
  const { jobId, studentId } = message;
  const inProgressJob = await db.updateReportJob(jobId, { status: "processing" });
  try {
  const downloadUrl = await generateReport(studentId);
  const completeJob = await db.updateReportJob(jobId, { status: "completed", downloadUrl: downloadUrl });
  } catch(error) {
    await db.updateReportJob(jobId, { status: "failed" });
    console.log(error);
  }
});
