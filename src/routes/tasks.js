import { Router } from 'express';
import { db } from '../database.js';
import {
  authenticateToken,
  requireRole
} from "../middleware/auth.js";
import { request } from 'node:http';

export const tasksRouter = Router();

tasksRouter.get(
    "/",
    authenticateToken,
    requireRole("student", "instructor"),
    (req, res) => {
      return res.json({
        userId: req.user.sub,
        tasks: []
      });
    }
);

tasksRouter.get('/:id',
    authenticateToken,
    requireRole("student", "instructor"),
    async (req, res, next) => {
        try {
        const text = `SELECT *, student_id as studentId FROM tasks WHERE id = $1`;
        const values = [req.params.id]
        const query = await db.query(text, values);
        if (query.rows[0]) {
          if (query.rows[0].studentId == req.user.sub || req.user.role == "instructor") {
            let task = {id: query.rows[0].id, title: query.rows[0].title, course: query.rows[0].course, studentId: query.rows[0].studentId, completed: Boolean(query.rows[0].completed)};
            return res.status(200).json({ task: task });
          } else {
            return res.status(403).json({ error: "Forbidden" });
          }
        } else {
          return res.status(404).json({ error: "Not found" });
        }
      }
      catch(error) {
        return next(error);
      }
});

tasksRouter.delete(
    "/:id",
    authenticateToken,
    requireRole("instructor"),
    async (req, res, next) => {
      try {
        const result = await db.run(
            "DELETE FROM tasks WHERE id = ?",
            [req.params.id]
        );

        if (result.changes === 0) {
          return res.status(404).json({ error: "Not Found" });
        }

        return res.status(204).end();
      } catch (error) {
        return next(error);
      }
    }
);
