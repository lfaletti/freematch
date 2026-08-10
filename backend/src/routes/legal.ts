import { Router, Request, Response } from 'express';
import { privacyPolicy, termsOfService, LegalLang } from '../services/legalService';

const router = Router();

function resolveLang(req: Request): LegalLang {
  return req.query.lang === 'en' ? 'en' : 'es';
}

// Public legal copy. The text lives in legalService so it can be updated
// without a frontend deploy.
router.get('/privacy', (req: Request, res: Response) => {
  res
    .set('Content-Type', 'text/plain; charset=utf-8')
    .send(privacyPolicy(resolveLang(req)));
});

router.get('/terms', (req: Request, res: Response) => {
  res
    .set('Content-Type', 'text/plain; charset=utf-8')
    .send(termsOfService(resolveLang(req)));
});

export default router;
