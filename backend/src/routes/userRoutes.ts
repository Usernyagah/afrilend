import { Router, Request, Response } from 'express';
import { userService } from '../services/userService';
import { AppError } from '../middleware/errorHandler';

const router = Router();

router.post('/register', (req: Request, res: Response) => {
  try {
    const { accountId, name, email } = req.body;
    const user = userService.createUser({ accountId, name, email });
    res.status(201).json({ success: true, data: user });
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ success: false, error: error.message });
  }
});

router.get('/:userId', (req: Request, res: Response) => {
  try {
    const user = userService.getUserById(req.params.userId);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({ success: true, data: user });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/', (req: Request, res: Response) => {
  try {
    const users = userService.getAllUsers();
    res.json({ success: true, data: users, count: users.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/account/:accountId', (req: Request, res: Response) => {
  try {
    const user = userService.getUserByAccountId(req.params.accountId);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({ success: true, data: user });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/stats/:userId', (req: Request, res: Response) => {
  try {
    const stats = userService.getUserStats(req.params.userId);
    res.json({ success: true, data: stats });
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ success: false, error: error.message });
  }
});

export default router;
