#!/bin/bash
cd backend
npm ci
npm run build
exec node dist/index.js
