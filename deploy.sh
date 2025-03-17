#!/bin/bash
npm install
npm run build
pm2 start dist/app.js --name smarketing-backend 