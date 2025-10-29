import { Router, Request, Response } from 'express';
import { loanService } from '../services/loanService';

const router = Router();

router.post('/create', (req: Request, res: Response) => {
  try {
    const { borrowerId, poolId, amount, interestRate, durationDays } = req.body;
    const loan = loanService.createLoan({
      borrowerId,
      poolId,
      amount,
      interestRate,
      durationDays,
    });
    res.status(201).json({ success: true, data: loan });
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ success: false, error: error.message });
  }
});

router.get('/:loanId', (req: Request, res: Response) => {
  try {
    const loan = loanService.getLoanById(req.params.loanId);
    if (!loan) return res.status(404).json({ success: false, error: 'Loan not found' });
    res.json({ success: true, data: loan });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/borrower/:borrowerId', (req: Request, res: Response) => {
  try {
    const loans = loanService.getLoansByBorrower(req.params.borrowerId);
    res.json({ success: true, data: loans, count: loans.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/pool/:poolId', (req: Request, res: Response) => {
  try {
    const loans = loanService.getLoansByPool(req.params.poolId);
    res.json({ success: true, data: loans, count: loans.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/', (req: Request, res: Response) => {
  try {
    const loans = loanService.getAllLoans();
    res.json({ success: true, data: loans, count: loans.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/:loanId/repay', (req: Request, res: Response) => {
  try {
    const { repayAmount } = req.body;
    if (!repayAmount) throw new Error('Repay amount is required');
    const result = loanService.repayLoan(req.params.loanId, repayAmount);
    res.json({ success: true, data: result });
  } catch (error: any) {
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({ success: false, error: error.message });
  }
});

export default router;
