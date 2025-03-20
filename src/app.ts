//adam ben david 208298257
//aviv menahem 212292197

import initApp from "./server";
import { app,httpServer } from "./server";
import express, { Express } from "express";
const port = process.env.PORT;
import path from 'path';
import https from 'https';
import fs from 'fs';

initApp().then(() => {
  const isProduction = process.env.NODE_ENV?.trim().toLowerCase() === 'production';
  console.log(`🔑  isProduction: ${isProduction}`);
  const server = isProduction ? https.createServer({
    key: fs.readFileSync('/home/st111/client-key.pem'),
    cert: fs.readFileSync('/home/st111/client-cert.pem')
  }, app) : httpServer;

  app.use(express.static(path.join(__dirname, "../../Smarketing-Client/dist")));
  

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../../Smarketing-Client/dist/index.html"));
  });


  
  server.listen(port, () => {
    console.log(`✅  Server listening on port ${port}`);

  });
});