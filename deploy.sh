#!/bin/bash
npm install
npm run build
pm2 start dist/app.js --name smarketing-backend 

.env

.env_dev

.env_test

.env_prod 
