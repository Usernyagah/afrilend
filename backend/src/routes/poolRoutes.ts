import { Router, Request, Response } from 'express';
import { poolService } from '../services/poolService';

const router = Router();

router.post('/create', (req: Request, res: Response) => {
  try {
    const { poolManager, poolName, initialFunding } = req.body;
    const pool = poolService.createPool({ poolManager, poolName, initialFunding });
    res.status(201).json({ success: true, data: pool });
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ success: false, error: error.message });
  }
});

router.get('/:poolId', (req: Request, res: Response) => {
  try {
    const pool = poolService.getPoolById(req.params.poolId);
    if (!pool) return res.status(404).json({ success: false, error: 'Pool not found' });
    res.json({ success: true, data: pool });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/', (req: Request, res: Response) => {
  try {
    const pools = poolService.getAllPools();
    res.json({ success: true, data: pools, count: pools.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/:poolId/fund', (req: Request, res: Response) => {
  try {
    const { funderId, amount } = req.body;
    const pool = poolService.fundPool(req.params.poolId, funderId, amount);
    res.json({ success: true, data: pool });
  } catch (error: any) {
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({ success: false, error: error.message });
  }
});

router.get('/manager/:managerId', (req: Request, res: Response) => {
  try {
    const pools = poolService.getPoolsByManager(req.params.managerId);
    res.json({ success: true, data: pools, count: pools.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/fundings/:poolId', (req: Request, res: Response) => {
  try {
    const fundings = poolService.getPoolFundings(req.params.poolId);
    res.json({ success: true, data: fundings, count: fundings.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
