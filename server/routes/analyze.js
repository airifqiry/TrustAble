import { Router }      from 'express';
import { handlePage }  from '../controllers/page.js';
import { handleText }  from '../controllers/text.js';
import { handlePhone } from '../controllers/phone.js';

const router = Router();

router.post('/page',  handlePage);
router.post('/text',  handleText);
router.post('/phone', handlePhone);

export default router;
