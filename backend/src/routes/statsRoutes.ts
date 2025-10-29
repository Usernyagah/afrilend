import { Router, Request, Response } from 'express';
import { poolService } from '../services/poolService';
import { loanService } from '../services/loanService';
import { userService } from '../services/userService';

const router = Router();

router.get('/overview', (req: Request, res: Response) => {
  try {
    const poolStats = poolService.getPoolStats();
    const totalUsers = userService.getAllUsers().length;
    const totalLoans = loanService.getAllLoans().length;
    const activeLoans = loanService.getActiveLoanCount();
    const totalLoanAmount = loanService.getTotalLoanAmount();

    res.json({
      success: true,
      data: {
        pools: poolStats,
        users: { total: totalUsers },
        loans: {
          total: totalLoans,
          active: activeLoans,
          totalAmount: totalLoanAmount,
        },
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;