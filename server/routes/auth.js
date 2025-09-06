import express from 'express'
import { login } from '../controlers/AuthController.js'

const router = express.Router();

router.post('/login', login);

export default router;